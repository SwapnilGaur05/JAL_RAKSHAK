const civicIcons = {
  'Overview': '◫',
  'Flood Risk': '◉',
  'Citizen Reports': '▤',
  'SOS': '✚',
  'Alerts': '◈',
  'Rescue': '✥',
  'Shelters': '⌂',
  'Rumours': '◇',
  '2005 Replay': '◷',
  'Flood News': '▧'
};
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { api, post, patch } from './api';
import './style.css';
import FloodNews from './FloodNews';
import { translate } from './translations';

const wardNames = { 'A Ward': 'Colaba', 'G/N Ward': 'Dadar', 'K/E Ward': 'Andheri East', 'L Ward': 'Kurla', 'H/E Ward': 'Bandra East' };
const placeName = name => wardNames[name] || name;

const pages = ['Overview', 'Flood Risk', 'Citizen Reports', 'SOS', 'Alerts', 'Rescue', 'Shelters', 'Rumours', '2005 Replay', 'Flood News'];
const wardCode = name => name.split(' ')[0];
const displayError = error => alert(error.message);

function App() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('jalraksha-theme') || 'light'
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('jalraksha-theme', theme);
  }, [theme]);

  const [language, setLanguage] = useState(
    () => localStorage.getItem('jalraksha-language') || 'en'
  );

  const t = key => translate(language, key);

  useEffect(() => {
    localStorage.setItem('jalraksha-language', language);
    document.documentElement.lang = language;
  }, [language]);

  const [page, setPage] = useState('Overview');
  const [data, setData] = useState({ wards: [], incidents: [], alerts: [], volunteers: [], rescues: [], shelters: [], rumours: [] });
  const [simulation, setSimulation] = useState(null);
  const [busy, setBusy] = useState(true);
  const [notice, setNotice] = useState('');
  const [selectedWard, setSelectedWard] = useState('1');
  const [rainfall, setRainfall] = useState('80');
  const [incident, setIncident] = useState({ ward_id: '1', kind: 'Waterlogging', description: '' });
  const [alertForm, setAlertForm] = useState({ ward_id: '1', severity: 'high', message: '' });
  const [rescueForm, setRescueForm] = useState({ lat: '19.072', lon: '72.879', required_skill: 'rescue' });
  const [matches, setMatches] = useState([]);
  const [activeRescue, setActiveRescue] = useState(null);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchesLoaded, setMatchesLoaded] = useState(false);
  const [assigningVolunteer, setAssigningVolunteer] = useState(null);
  const [rescueNotice, setRescueNotice] = useState('');
  const [rescueError, setRescueError] = useState('');
  const [allocation, setAllocation] = useState({ shelter_id: '1', people: '2' });
  const [claim, setClaim] = useState('');
  const [replayStep, setReplayStep] = useState(0);
  const [sosForm, setSosForm] = useState({ ward_id: '1', name: '', phone: '', message: '', lat: '19.072', lon: '72.879', required_skill: 'rescue' });
  const [sosResult, setSosResult] = useState(null);
  const [sosItems, setSosItems] = useState([]);
  const [smsForm, setSmsForm] = useState({ ward_id: '1', severity: 'high', message: '' });
  const [smsLogs, setSmsLogs] = useState([]);
  const [smsResult, setSmsResult] = useState(null);
  const [sending, setSending] = useState(false);
  const [locating, setLocating] = useState(false);

  async function load() {
    try {
      const keys = ['wards', 'incidents', 'alerts', 'volunteers', 'rescue-requests', 'shelters', 'rumours'];
      const results = await Promise.all(keys.map(key => api('/' + key)));
      setData(Object.fromEntries(keys.map((key, i) => [key === 'rescue-requests' ? 'rescues' : key, results[i]])));
      setSimulation(await api('/simulation/2005'));
      setSosItems(await api('/sos'));
      setNotice('Connected to FastAPI');
    } catch (error) {
      setNotice('Backend unavailable: ' + error.message);
    } finally { setBusy(false); }
  }
  useEffect(() => { load(); }, []);

  async function run(action, success) {
    try { await action(); await load(); setNotice(success); }
    catch (error) { displayError(error); }
  }
  async function viewMatches(requestId) {
    setActiveRescue(requestId);
    setMatches([]);
    setMatchesLoaded(false);
    setRescueNotice('');
    setRescueError('');
    setMatchesLoading(true);
    try {
      setMatches(await api(`/rescue-requests/${requestId}/matches`));
      setMatchesLoaded(true);
    } catch (error) {
      setRescueError(`Could not load matches: ${error.message}`);
    } finally {
      setMatchesLoading(false);
    }
  }
  async function assignVolunteer(volunteerId) {
    const requestId = activeRescue;
    if (requestId === null || assigningVolunteer !== null || matchesLoading) return;
    setAssigningVolunteer(volunteerId);
    setRescueNotice('');
    setRescueError('');
    try {
      await post(`/rescue-requests/${requestId}/assign`, { volunteer_id: volunteerId }, true);
      setRescueNotice(`Volunteer assigned to rescue request #${requestId}.`);
      setActiveRescue(null);
      setMatches([]);
      setMatchesLoaded(false);
      await load();
    } catch (error) {
      setRescueError(`Could not assign volunteer: ${error.message}`);
    } finally {
      setAssigningVolunteer(null);
    }
  }
  const selected = data.wards.find(w => String(w.id) === selectedWard) || data.wards[0];
  const riskColor = score => score >= 75 ? 'critical' : score >= 50 ? 'high' : score >= 25 ? 'moderate' : 'low';

  return <div className="layout">
    <aside className="sidebar civic-sidebar">
  <div className="civic-brand">
    <div className="civic-symbol">≋</div>
    <div>
      <h1>JalRaksha</h1>
      <p>CIVIC FLOOD OPERATIONS</p>
    </div>
  </div>

  <div className="civic-section-label">COMMAND CENTRE</div>

  <nav>
    {pages.map(name => (
      <button
        key={name}
        type="button"
        className={page === name ? 'active' : ''}
        onClick={() => setPage(name)}
      >
        <span className="civic-nav-icon" aria-hidden="true">
          {civicIcons[name]}
        </span>
        <span>{t(name)}</span>
      </button>
    ))}
  </nav>

  <div className="civic-settings">
    <div className="civic-section-label">PREFERENCES</div>

    <div className="language-switcher">
      <select
        aria-label="Select language"
        value={language}
        onChange={e => setLanguage(e.target.value)}
      >
        <option value="en">English</option>
        <option value="hi">हिंदी</option>
        <option value="mr">मराठी</option>
      </select>
    </div>

    <button
      type="button"
      className="theme-switcher"
      onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? '☀ Light Mode' : '☾ Dark Mode'}
    </button>
  </div>

  <small>
    <span className="demo-dot" />
    DEMONSTRATION MODE
    <br />
    Not for emergency use
  </small>
</aside>
    <main><header><div><h2>{t(page)}</h2><p>City operations / Mumbai / {page}</p></div><button className="outline" onClick={load}>Refresh data ↻</button></header>
      <div className="notice"><span className="demo-dot"/>{busy ? 'Loading...' : notice} · Sample data and simulated alerts only</div>
      {page === 'Overview' && <><div className="stats"><Stat label="Wards" value={data.wards.length}/><Stat label="High / critical" value={data.wards.filter(w => w.score >= 50).length}/><Stat label="Citizen reports" value={data.incidents.length}/><Stat label="Rescue requests" value={data.rescues.length}/></div><Panel title="Ward Risk Summary"><div className="cards">{data.wards.map(w => <div className="ward" key={w.id}><div className="between"><b>{placeName(w.name)}</b><span className={'pill ' + riskColor(w.score)}>{w.level}</span></div><h2>{w.score}/100</h2><p>Rainfall: {w.rainfall_mm} mm · {w.source}</p></div>)}</div></Panel><Panel title="Latest Reports">{data.incidents.slice(0, 5).map(i => <Record key={i.id} title={`${i.kind} · ${placeName(data.wards.find(w => w.id === i.ward_id)?.name || `Ward ${i.ward_id}`)}`} detail={i.description} tag={i.status}/>)}</Panel></>}
      {page === 'Flood Risk' && <div className="columns"><Panel title="Ward Flood Risk"><p className="muted">Risk is calculated by a demo formula, not a trained ML model or official forecast.</p>{data.wards.map(w => <div className="risk-row" key={w.id}><span>{placeName(w.name)}</span><div className="bar"><div className={riskColor(w.score)} style={{ width: w.score + '%' }}/></div><b>{w.score}</b></div>)}</Panel><Panel title="Change Demo Rainfall"><label>Ward<select value={selectedWard} onChange={e => setSelectedWard(e.target.value)}>{data.wards.map(w => <option key={w.id} value={w.id}>{placeName(w.name)}</option>)}</select></label><p>Current rainfall: {selected?.rainfall_mm ?? '—'} mm</p><label>New rainfall (mm)<input type="number" min="0" max="2000" value={rainfall} onChange={e => setRainfall(e.target.value)}/></label><button onClick={() => run(() => patch(`/wards/${selectedWard}/rainfall`, { rainfall_mm: Number(rainfall) }, true), 'Risk recalculated')}>Update rainfall</button><p className="muted">Illustrative ward risk scores. Real ward polygons and verified observations are a separate integration step.</p></Panel></div>}
      {page === 'Citizen Reports' && <div className="columns"><Panel title="Submit Citizen Report"><form onSubmit={e => { e.preventDefault(); run(() => post('/incidents', { ...incident, ward_id: Number(incident.ward_id) }), 'Report saved'); setIncident({ ...incident, description: '' }); }}><label>Ward<select value={incident.ward_id} onChange={e => setIncident({ ...incident, ward_id: e.target.value })}>{data.wards.map(w => <option key={w.id} value={w.id}>{placeName(w.name)}</option>)}</select></label><label>Incident type<select value={incident.kind} onChange={e => setIncident({ ...incident, kind: e.target.value })}>{['Waterlogging', 'Rescue', 'Blocked road', 'Medical', 'Infrastructure damage'].map(t => <option key={t}>{t}</option>)}</select></label><label>Description<textarea required minLength="3" value={incident.description} onChange={e => setIncident({ ...incident, description: e.target.value })}/></label><button>Submit Report</button></form></Panel><Panel title="Incident Queue">{data.incidents.map(i => <Record key={i.id} title={`${i.kind} · ${placeName(data.wards.find(w => w.id === i.ward_id)?.name || `Ward ${i.ward_id}`)}`} detail={i.description} tag={i.verified ? 'Verified' : 'Unverified'}/>)}</Panel></div>}
      {page === 'SOS' && <div className="columns"><Panel title="Citizen SOS · Demo Request">
        <p className="muted">This records a test rescue request. It does not contact emergency services. In a real emergency, call the local emergency number.</p>
        <form onSubmit={async e => { e.preventDefault(); setSending(true); try { const result = await post('/sos', { ...sosForm, ward_id: Number(sosForm.ward_id), lat: Number(sosForm.lat), lon: Number(sosForm.lon) }); setSosResult(result); await load(); } catch(error) { displayError(error); } finally { setSending(false); } }}>
          <label>Name<input required minLength="2" value={sosForm.name} onChange={e => setSosForm({...sosForm,name:e.target.value})}/></label>
          <label>Phone (optional, stored only for demo)<input type="tel" value={sosForm.phone} onChange={e => setSosForm({...sosForm,phone:e.target.value})}/></label>
          <label>Area<select value={sosForm.ward_id} onChange={e => setSosForm({...sosForm,ward_id:e.target.value})}>{data.wards.map(w => <option key={w.id} value={w.id}>{placeName(w.name)}</option>)}</select></label>
          <label>Assistance<select value={sosForm.required_skill} onChange={e => setSosForm({...sosForm,required_skill:e.target.value})}>{['rescue','first-aid','medical','boat'].map(s => <option key={s}>{s}</option>)}</select></label>
          <label>Describe the situation<textarea required minLength="5" value={sosForm.message} onChange={e => setSosForm({...sosForm,message:e.target.value})}/></label>
          <div className="columns"><label>Latitude<input required type="number" step="any" value={sosForm.lat} onChange={e => setSosForm({...sosForm,lat:e.target.value})}/></label><label>Longitude<input required type="number" step="any" value={sosForm.lon} onChange={e => setSosForm({...sosForm,lon:e.target.value})}/></label></div>
          <button type="button" className="outline" disabled={locating} onClick={() => { if(!navigator.geolocation) return alert('Geolocation is unavailable. Enter coordinates manually.'); setLocating(true); navigator.geolocation.getCurrentPosition(p => { setSosForm(f => ({...f,lat:String(p.coords.latitude),lon:String(p.coords.longitude)})); setLocating(false); }, () => { alert('Location permission denied or unavailable. Enter coordinates manually.'); setLocating(false); }, {timeout:10000}); }}>{locating ? 'Locating...' : 'Use my location (optional)'}</button>
          <button className="sos-button" disabled={sending}>{sending ? 'Recording...' : 'SOS · Submit test request'}</button>
        </form>{sosResult && <p className="success-message">Request #{sosResult.id} recorded · Rescue #{sosResult.rescue_id} · {sosResult.status}. No emergency service contacted.</p>}
      </Panel><Panel title="SOS Dispatch Queue"><p className="muted">Volunteer assignment is managed from the Rescue page.</p>{sosItems.map(x => <Record key={x.id} title={`SOS #${x.id} · ${x.name}`} detail={`${x.message} · Rescue #${x.rescue_id}`} tag={x.status}/>)}{!sosItems.length && <p className="muted">No SOS requests yet.</p>}</Panel></div>}
      {page === 'Alerts' && <div className="columns"><Panel title="Publish Demo Alert"><form onSubmit={e => { e.preventDefault(); run(() => post('/alerts', { ...alertForm, ward_id: Number(alertForm.ward_id), channel: 'in-app' }, true), 'In-app demo alert saved'); setAlertForm({ ...alertForm, message: '' }); }}><label>Target ward<select value={alertForm.ward_id} onChange={e => setAlertForm({ ...alertForm, ward_id: e.target.value })}>{data.wards.map(w => <option key={w.id} value={w.id}>{placeName(w.name)}</option>)}</select></label><label>Severity<select value={alertForm.severity} onChange={e => setAlertForm({ ...alertForm, severity: e.target.value })}>{['low', 'moderate', 'high', 'critical'].map(t => <option key={t}>{t}</option>)}</select></label><label>Message<textarea required minLength="5" value={alertForm.message} onChange={e => setAlertForm({ ...alertForm, message: e.target.value })}/></label><button>Publish Demo Alert</button><p className="muted">No SMS or public warning is sent.</p></form></Panel><Panel title="Alert History">{data.alerts.map(a => <Record key={a.id} title={`${placeName(data.wards.find(w => w.id === a.ward_id)?.name || `Ward ${a.ward_id}`)} · ${a.severity}`} detail={a.message} tag={a.delivery_status}/>)}</Panel></div>}
      {page === 'Alerts' && <div className="columns"><Panel title="SMS Alert · Test Recipients Only">
        <p className="muted">Requires SMS_TEST_RECIPIENTS on the backend. Default mode logs simulated messages without sending. Optional Twilio mode sends only to configured test numbers.</p>
        <form onSubmit={async e => { e.preventDefault(); setSending(true); try { const result = await post('/sms-alerts', {...smsForm,ward_id:Number(smsForm.ward_id)}, true); setSmsResult(result); await load(); } catch(error) { displayError(error); } finally { setSending(false); } }}>
          <label>Area<select value={smsForm.ward_id} onChange={e => setSmsForm({...smsForm,ward_id:e.target.value})}>{data.wards.map(w => <option key={w.id} value={w.id}>{placeName(w.name)}</option>)}</select></label>
          <label>Severity<select value={smsForm.severity} onChange={e => setSmsForm({...smsForm,severity:e.target.value})}>{['low','moderate','high','critical'].map(x => <option key={x}>{x}</option>)}</select></label>
          <label>Message<textarea required minLength="5" value={smsForm.message} onChange={e => setSmsForm({...smsForm,message:e.target.value})}/></label>
          <button disabled={sending}>{sending ? 'Processing...' : 'Run SMS test'}</button>
        </form>
        {smsResult && <p className="success-message">Alert #{smsResult.alert_id}: {smsResult.delivery_status} · {smsResult.recipient_count} test recipient(s)</p>}
        <button className="outline" onClick={async () => { try { setSmsLogs(await api('/sms-alerts/logs', {}, true)); } catch(error) { displayError(error); } }}>View SMS test logs</button>
        {smsLogs.map(x => <Record key={x.id} title={`Alert #${x.alert_id} · ${x.phone}`} detail={x.status} tag={x.provider_id ? 'Provider accepted' : 'Demo'}/>)}
      </Panel><Panel title="SMS Safety"><p className="muted">The ward selection labels the alert, but this demo does not have a ward subscriber database. Only explicitly configured test numbers are used. No public broadcast is performed.</p></Panel></div>}
      {page === 'Rescue' && <div className="columns">
        <Panel title="Create Rescue Request">
          <form onSubmit={async e => {
            e.preventDefault();
            setActiveRescue(null);
            setMatches([]);
            setMatchesLoaded(false);
            setRescueNotice('');
            setRescueError('');
            setMatchesLoading(true);
            try {
              const request = await post('/rescue-requests', {
                lat: Number(rescueForm.lat),
                lon: Number(rescueForm.lon),
                required_skill: rescueForm.required_skill,
              });
              setActiveRescue(request.id);
              setMatches(await api(`/rescue-requests/${request.id}/matches`));
              setMatchesLoaded(true);
              await load();
              setNotice('Rescue request saved. Choose a volunteer.');
            } catch (error) {
              setRescueError(`Could not create or match rescue request: ${error.message}`);
            } finally {
              setMatchesLoading(false);
            }
          }}>
            <label>Latitude<input required type="number" step="any" value={rescueForm.lat} onChange={e => setRescueForm({ ...rescueForm, lat: e.target.value })}/></label>
            <label>Longitude<input required type="number" step="any" value={rescueForm.lon} onChange={e => setRescueForm({ ...rescueForm, lon: e.target.value })}/></label>
            <label>Required skill<select value={rescueForm.required_skill} onChange={e => setRescueForm({ ...rescueForm, required_skill: e.target.value })}>{['rescue', 'first-aid', 'medical', 'boat'].map(s => <option key={s}>{s}</option>)}</select></label>
            <button disabled={matchesLoading || assigningVolunteer !== null}>{matchesLoading ? 'Loading matches...' : 'Create & Find Volunteers'}</button>
          </form>
          <h3>Matching Volunteers</h3>
          {activeRescue !== null && <p className="muted">Matches for rescue request #{activeRescue}</p>}
          {matchesLoading && <p className="muted">Loading volunteer matches...</p>}
          {rescueNotice && <p className="success-message" role="status">{rescueNotice}</p>}
          {rescueError && <p className="muted" role="alert">Error: {rescueError}</p>}
          {matches.map(v => <Record key={v.volunteer_id} title={v.name} detail={`${v.skills} · ${v.distance_km} km (straight-line)`} action={<button disabled={matchesLoading || assigningVolunteer !== null} onClick={() => assignVolunteer(v.volunteer_id)}>{assigningVolunteer === v.volunteer_id ? 'Assigning...' : 'Assign Volunteer'}</button>}/>)}
          {activeRescue !== null && matchesLoaded && matches.length === 0 && <p className="muted">No suitable volunteers are currently available for rescue request #{activeRescue}.</p>}
        </Panel>
        <Panel title="Rescue Dispatch Board">
          {data.rescues.map(r => <Record key={r.id} title={`Request #${r.id} · ${r.required_skill}`} detail={`Location ${r.lat}, ${r.lon} · Volunteer ${r.volunteer_id || 'not assigned'}`} tag={r.status} action={r.status === 'open' ? <button disabled={matchesLoading || assigningVolunteer !== null} onClick={() => viewMatches(r.id)}>{matchesLoading && activeRescue === r.id ? 'Loading matches...' : 'View Matches'}</button> : null}/>)}
        </Panel>
      </div>}
      {page === 'Shelters' && <div className="columns"><Panel title="Shelter Capacity">{data.shelters.map(s => <Record key={s.id} title={s.name} detail={`${s.occupied} occupied / ${s.capacity} total`} tag={`${s.available} spaces`}/>)}</Panel><Panel title="Reserve Shelter Spaces"><form onSubmit={e => { e.preventDefault(); run(() => post('/shelter-allocations', { shelter_id: Number(allocation.shelter_id), people: Number(allocation.people) }, true), 'Shelter allocation saved'); }}><label>Shelter<select value={allocation.shelter_id} onChange={e => setAllocation({ ...allocation, shelter_id: e.target.value })}>{data.shelters.map(s => <option key={s.id} value={s.id}>{s.name} ({s.available} free)</option>)}</select></label><label>Number of people<input required min="1" type="number" value={allocation.people} onChange={e => setAllocation({ ...allocation, people: e.target.value })}/></label><button>Reserve Spaces</button></form></Panel></div>}
      {page === 'Rumours' && <div className="columns"><Panel title="Submit Claim"><form onSubmit={e => { e.preventDefault(); run(() => post('/rumours', { claim }), 'Claim submitted for review'); setClaim(''); }}><label>Claim<textarea required minLength="5" value={claim} onChange={e => setClaim(e.target.value)}/></label><button>Submit Claim</button></form></Panel><Panel title="Review Queue">{data.rumours.map(r => <Record key={r.id} title={`Claim #${r.id}`} detail={r.claim} tag={r.status} action={r.status === 'unverified' ? <div className="actions"><button onClick={() => run(() => patch(`/rumours/${r.id}`, { status: 'verified', reviewer_note: 'Reviewed manually in demo' }, true), 'Review saved')}>Verify</button><button className="outline" onClick={() => run(() => patch(`/rumours/${r.id}`, { status: 'false', reviewer_note: 'Reviewed manually in demo' }, true), 'Review saved')}>Mark False</button></div> : null}/>)}</Panel></div>}
      {page === 'Flood News' && <FloodNews />}
       {page === '2005 Replay' && <Panel title="26 July 2005 · Illustrative Replay"><p className="muted">Synthetic timeline, NOT verified historical rainfall measurements.</p>{simulation && <><h2>{simulation.steps[replayStep]?.hour}</h2><div className="big-number">{simulation.steps[replayStep]?.rainfall_mm} mm</div><input type="range" min="0" max={simulation.steps.length - 1} value={replayStep} onChange={e => setReplayStep(Number(e.target.value))}/><div className="actions"><button onClick={() => setReplayStep(s => Math.min(s + 1, simulation.steps.length - 1))}>Next step →</button><button className="outline" onClick={() => setReplayStep(0)}>Reset</button></div><p className="muted">{simulation.note}</p></>}</Panel>}
      <footer>CIV-02 · Hackathon demonstration · Not an operational emergency response service</footer>
    </main>
  </div>;
}
function Panel({ title, children }) { return <section className="panel"><h3>{title}</h3>{children}</section>; }
function Stat({ label, value }) { return <div className="stat"><small>{label}</small><h2>{value}</h2></div>; }
function Record({ title, detail, tag, action }) { return <div className="record"><div className="between"><strong>{title}</strong>{tag && <span className="pill">{tag}</span>}</div><p>{detail}</p>{action}</div>; }
createRoot(document.getElementById('root')).render(<App />);
