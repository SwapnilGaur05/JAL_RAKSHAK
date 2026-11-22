from ml.predict_api import router as ml_router
"""CIV-02 simple backend.

Read this file top to bottom:
1. Database setup
2. Database tables (models)
3. Input validation (schemas)
4. API endpoints (routes)

This is a learning/demo backend, NOT an official emergency service.
"""

import os
from datetime import datetime, timezone
from typing import Optional
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Boolean, select
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session
# Database: SQLite locally; change DATABASE_URL for PostgreSQL later.
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///./civ02.db')
engine = create_engine(DATABASE_URL, connect_args={'check_same_thread': False} if DATABASE_URL.startswith('sqlite') else {}, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine)
OFFICER_KEY = os.getenv('OFFICER_API_KEY', 'local-demo-officer-key')

def now():
    return datetime.now(timezone.utc)

class Base(DeclarativeBase):
    pass

# Database tables: one class = one table.
class Ward(Base):
    __tablename__ = 'wards'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    rainfall_mm = Column(Float, default=0)
    vulnerability = Column(Float, default=30)
    source = Column(String, default='DEMO')
    observed_at = Column(DateTime(timezone=True), default=now)

class Incident(Base):
    __tablename__ = 'incidents'
    id = Column(Integer, primary_key=True)
    ward_id = Column(Integer, ForeignKey('wards.id'), nullable=False)
    kind = Column(String, nullable=False)
    description = Column(String, nullable=False)
    lat = Column(Float)
    lon = Column(Float)
    verified = Column(Boolean, default=False)
    status = Column(String, default='open')
    created_at = Column(DateTime(timezone=True), default=now)

class Alert(Base):
    __tablename__ = 'alerts'
    id = Column(Integer, primary_key=True)
    ward_id = Column(Integer, ForeignKey('wards.id'), nullable=False)
    message = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    channel = Column(String, default='in-app')
    delivery_status = Column(String, default='published-demo')
    created_at = Column(DateTime(timezone=True), default=now)

class Volunteer(Base):
    __tablename__ = 'volunteers'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    skills = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    available = Column(Boolean, default=True)

class Rescue(Base):
    __tablename__ = 'rescue_requests'
    id = Column(Integer, primary_key=True)
    incident_id = Column(Integer, ForeignKey('incidents.id'))
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    required_skill = Column(String, nullable=False)
    status = Column(String, default='open')
    volunteer_id = Column(Integer, ForeignKey('volunteers.id'))

class SOS(Base):
    __tablename__ = 'sos_requests'
    id = Column(Integer, primary_key=True)
    ward_id = Column(Integer, ForeignKey('wards.id'), nullable=False)
    rescue_id = Column(Integer, ForeignKey('rescue_requests.id'), nullable=False)
    name = Column(String, nullable=False)
    phone = Column(String, default='')
    message = Column(String, nullable=False)
    status = Column(String, default='pending')
    created_at = Column(DateTime(timezone=True), default=now)

class SMSLog(Base):
    __tablename__ = 'sms_logs'
    id = Column(Integer, primary_key=True)
    alert_id = Column(Integer, ForeignKey('alerts.id'), nullable=False)
    phone = Column(String, nullable=False)
    status = Column(String, nullable=False)
    provider_id = Column(String, default='')
    created_at = Column(DateTime(timezone=True), default=now)

class Shelter(Base):
    __tablename__ = 'shelters'
    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    capacity = Column(Integer, nullable=False)
    occupied = Column(Integer, default=0)
    active = Column(Boolean, default=True)

class Allocation(Base):
    __tablename__ = 'allocations'
    id = Column(Integer, primary_key=True)
    shelter_id = Column(Integer, ForeignKey('shelters.id'))
    people = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now)

class Rumour(Base):
    __tablename__ = 'rumours'
    id = Column(Integer, primary_key=True)
    claim = Column(String, nullable=False)
    evidence = Column(String, default='')
    status = Column(String, default='unverified')
    reviewer_note = Column(String, default='')

@asynccontextmanager
async def lifespan(app):
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if not db.scalar(select(Ward.id).limit(1)):
            db.add_all([Ward(name='A Ward', rainfall_mm=32, vulnerability=45), Ward(name='G/N Ward', rainfall_mm=125, vulnerability=70), Ward(name='K/E Ward', rainfall_mm=85, vulnerability=65), Ward(name='L Ward', rainfall_mm=155, vulnerability=80), Ward(name='H/E Ward', rainfall_mm=64, vulnerability=60)])
            db.add_all([Volunteer(name='Demo Volunteer 1', skills='rescue,first-aid', lat=19.072, lon=72.879), Volunteer(name='Demo Volunteer 2', skills='medical,first-aid', lat=19.091, lon=72.85), Volunteer(name='Demo Volunteer 3', skills='rescue,boat', lat=19.055, lon=72.87)])
            db.add_all([Shelter(name='Demo Shelter A', lat=19.08, lon=72.88, capacity=100, occupied=40), Shelter(name='Demo Shelter B', lat=19.06, lon=72.85, capacity=60, occupied=58)])
            db.commit()
    yield
app = FastAPI(title='CIV-02 City Flood Command Centre API', version='0.1.0', lifespan=lifespan, description='Hackathon prototype API. Seeded data and risk scores are NOT official emergency guidance.')
app.include_router(ml_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:5177",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

def db_session():
    with SessionLocal() as db:
        yield db

def officer(x_officer_key: Optional[str]=Header(None)):
    if not x_officer_key or x_officer_key != OFFICER_KEY:
        raise HTTPException(403, 'Officer authorization required')

def get_or_404(db, model, id):
    obj = db.get(model, id)
    if obj is None:
        raise HTTPException(404, 'Record not found')
    return obj

def as_dict(obj):
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns}

# Haversine formula: approximate straight-line distance in kilometers.
def distance_km(a, b, c, d):
    from math import radians, sin, cos, asin, sqrt
    x = radians(c - a)
    y = radians(d - b)
    q = sin(x / 2) ** 2 + cos(radians(a)) * cos(radians(c)) * sin(y / 2) ** 2
    return 6371 * 2 * asin(sqrt(q))

# Simple risk formula for the demo; this is NOT a trained ML model.
def risk(w):
    score = round(min(100, 0.65 * min(100, w.rainfall_mm / 2) + 0.35 * w.vulnerability), 1)
    level = 'critical' if score >= 75 else 'high' if score >= 50 else 'moderate' if score >= 25 else 'low'
    return {'score': score, 'level': level, 'method': 'uncalibrated-demo-heuristic'}

# Request schemas: these check incoming JSON before saving it.
class RainfallIn(BaseModel):
    rainfall_mm: float = Field(ge=0, le=2000)

class IncidentIn(BaseModel):
    ward_id: int
    kind: str = Field(min_length=2, max_length=80)
    description: str = Field(min_length=3, max_length=2000)
    lat: Optional[float] = Field(default=None, ge=-90, le=90)
    lon: Optional[float] = Field(default=None, ge=-180, le=180)

class AlertIn(BaseModel):
    ward_id: int
    message: str = Field(min_length=5, max_length=1000)
    severity: str = Field(pattern='^(low|moderate|high|critical)$')
    channel: str = Field(default='in-app', pattern='^(in-app|sms-test)$')

class RescueIn(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    required_skill: str = Field(min_length=2, max_length=80)
    incident_id: Optional[int] = None

class SOSIn(BaseModel):
    ward_id: int
    name: str = Field(min_length=2, max_length=100)
    phone: str = Field(default='', max_length=25)
    message: str = Field(min_length=5, max_length=1000)
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    required_skill: str = Field(default='rescue', pattern='^(rescue|first-aid|medical|boat)$')

class SMSAlertIn(BaseModel):
    ward_id: int
    severity: str = Field(pattern='^(low|moderate|high|critical)$')
    message: str = Field(min_length=5, max_length=500)

class AssignmentIn(BaseModel):
    volunteer_id: int

class AllocationIn(BaseModel):
    shelter_id: int
    people: int = Field(gt=0, le=10000)

class RumourIn(BaseModel):
    claim: str = Field(min_length=5, max_length=2000)
    evidence: str = ''

class VerdictIn(BaseModel):
    status: str = Field(pattern='^(verified|false|misleading|inconclusive)$')
    reviewer_note: str = Field(min_length=5)

# API routes: each decorator connects a URL to a Python function.
@app.get('/api/health')
def health():
    return {'status': 'ok', 'mode': 'demo'}

@app.get('/api/wards')
def wards(db: Session=Depends(db_session)):
    return [{**as_dict(w), **risk(w)} for w in db.scalars(select(Ward).order_by(Ward.id))]

@app.get('/api/wards/{ward_id}/risk')
def ward_risk(ward_id: int, db: Session=Depends(db_session)):
    w = get_or_404(db, Ward, ward_id)
    return {'ward_id': w.id, 'name': w.name, 'rainfall_mm': w.rainfall_mm, 'source': w.source, 'observed_at': w.observed_at, **risk(w)}

@app.patch('/api/wards/{ward_id}/rainfall', dependencies=[Depends(officer)])
def update_rainfall(ward_id: int, data: RainfallIn, db: Session=Depends(db_session)):
    w = get_or_404(db, Ward, ward_id)
    w.rainfall_mm = data.rainfall_mm
    w.source = 'DEMO-MANUAL'
    w.observed_at = now()
    db.commit()
    db.refresh(w)
    return {'ward_id': w.id, **risk(w)}

@app.post('/api/incidents', status_code=201)
def create_incident(data: IncidentIn, db: Session=Depends(db_session)):
    get_or_404(db, Ward, data.ward_id)
    obj = Incident(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return as_dict(obj)

@app.get('/api/incidents')
def incidents(db: Session=Depends(db_session)):
    return [as_dict(x) for x in db.scalars(select(Incident).order_by(Incident.id.desc()))]

@app.post('/api/alerts', status_code=201, dependencies=[Depends(officer)])
def create_alert(data: AlertIn, db: Session=Depends(db_session)):
    get_or_404(db, Ward, data.ward_id)
    obj = Alert(**data.model_dump(), delivery_status='simulated-sms-not-sent' if data.channel == 'sms-test' else 'published-demo')
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return as_dict(obj)

@app.get('/api/alerts')
def alerts(ward_id: Optional[int]=None, db: Session=Depends(db_session)):
    stmt = select(Alert).order_by(Alert.id.desc())
    stmt = stmt.where(Alert.ward_id == ward_id) if ward_id is not None else stmt
    return [as_dict(x) for x in db.scalars(stmt)]

@app.post('/api/rescue-requests', status_code=201)
def create_rescue(data: RescueIn, db: Session=Depends(db_session)):
    if data.incident_id is not None:
        get_or_404(db, Incident, data.incident_id)
    obj = Rescue(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return as_dict(obj)

@app.get('/api/rescue-requests')
def rescues(db: Session=Depends(db_session)):
    return [as_dict(x) for x in db.scalars(select(Rescue))]

@app.get('/api/rescue-requests/{request_id}/matches')
def matches(request_id: int, db: Session=Depends(db_session)):
    r = get_or_404(db, Rescue, request_id)
    result = [{'volunteer_id': v.id, 'name': v.name, 'skills': v.skills, 'distance_km': round(distance_km(r.lat, r.lon, v.lat, v.lon), 2)} for v in db.scalars(select(Volunteer).where(Volunteer.available.is_(True))) if r.required_skill.lower() in [s.strip().lower() for s in v.skills.split(',')]]
    return sorted(result, key=lambda x: x['distance_km'])

@app.post('/api/rescue-requests/{request_id}/assign', dependencies=[Depends(officer)])
def assign(request_id: int, data: AssignmentIn, db: Session=Depends(db_session)):
    r = get_or_404(db, Rescue, request_id)
    v = get_or_404(db, Volunteer, data.volunteer_id)
    if r.status != 'open':
        raise HTTPException(409, 'Request already assigned or closed')
    if not v.available or r.required_skill.lower() not in [s.strip().lower() for s in v.skills.split(',')]:
        raise HTTPException(409, 'Volunteer unavailable or unqualified')
    r.volunteer_id = v.id
    r.status = 'assigned'
    v.available = False
    db.commit()
    return as_dict(r)

@app.get('/api/volunteers')
def volunteers(db: Session=Depends(db_session)):
    return [as_dict(x) for x in db.scalars(select(Volunteer))]

@app.get('/api/shelters')
def shelters(db: Session=Depends(db_session)):
    return [{**as_dict(s), 'available': s.capacity - s.occupied} for s in db.scalars(select(Shelter))]

# Allocate only when enough beds remain. PostgreSQL locks the shelter row.
@app.post('/api/shelter-allocations', status_code=201, dependencies=[Depends(officer)])
def allocate(data: AllocationIn, db: Session=Depends(db_session)):
    s = db.scalar(select(Shelter).where(Shelter.id == data.shelter_id).with_for_update())
    if s is None:
        raise HTTPException(404, 'Shelter not found')
    if not s.active or s.capacity - s.occupied < data.people:
        raise HTTPException(409, 'Insufficient capacity or shelter closed')
    s.occupied += data.people
    obj = Allocation(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return {'allocation': as_dict(obj), 'remaining': s.capacity - s.occupied}

@app.post('/api/rumours', status_code=201)
def create_rumour(data: RumourIn, db: Session=Depends(db_session)):
    obj = Rumour(**data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return as_dict(obj)

@app.get('/api/rumours')
def rumours(db: Session=Depends(db_session)):
    return [as_dict(x) for x in db.scalars(select(Rumour))]

@app.patch('/api/rumours/{rumour_id}', dependencies=[Depends(officer)])
def review_rumour(rumour_id: int, data: VerdictIn, db: Session=Depends(db_session)):
    r = get_or_404(db, Rumour, rumour_id)
    r.status = data.status
    r.reviewer_note = data.reviewer_note
    db.commit()
    db.refresh(r)
    return as_dict(r)

@app.get('/api/simulation/2005')
def simulation():
    return {'title': '26 July 2005 Mumbai Flood', 'mode': 'ILLUSTRATIVE REPLAY — NOT VERIFIED HISTORICAL TIME SERIES', 'steps': [{'hour': '09:00', 'rainfall_mm': 35}, {'hour': '12:00', 'rainfall_mm': 110}, {'hour': '15:00', 'rainfall_mm': 230}, {'hour': '18:00', 'rainfall_mm': 410}, {'hour': '21:00', 'rainfall_mm': 620}], 'note': 'Replace these synthetic steps with sourced station observations before claiming historical accuracy.'}

# SOS is stored as a rescue request plus a citizen-facing tracking record.
@app.post('/api/sos', status_code=201)
def create_sos(data: SOSIn, db: Session=Depends(db_session)):
    get_or_404(db, Ward, data.ward_id)
    rescue = Rescue(lat=data.lat, lon=data.lon, required_skill=data.required_skill)
    db.add(rescue)
    db.flush()
    sos = SOS(ward_id=data.ward_id, rescue_id=rescue.id, name=data.name,
              phone=data.phone, message=data.message)
    db.add(sos)
    db.commit()
    db.refresh(sos)
    return {'id': sos.id, 'rescue_id': rescue.id, 'status': sos.status,
            'message': 'SOS recorded in demo dispatch queue. No emergency service contacted.'}

@app.get('/api/sos')
def list_sos(db: Session=Depends(db_session)):
    items = []
    for item in db.scalars(select(SOS).order_by(SOS.id.desc())):
        rescue = db.get(Rescue, item.rescue_id)
        status = rescue.status if rescue and rescue.status != 'open' else item.status
        items.append({**as_dict(item), 'status': status,
                      'volunteer_id': rescue.volunteer_id if rescue else None})
    return items

# Test-only SMS recipients are configured by the operator in an environment variable.
# No public phone list is stored or used by this demo.
def test_recipients():
    return list(dict.fromkeys(x.strip() for x in os.getenv('SMS_TEST_RECIPIENTS', '').split(',') if x.strip()))

def deliver_test_sms(phone, message):
    # Default mode is always a safe simulation with a database log.
    if os.getenv('SMS_MODE', 'demo').lower() != 'twilio':
        return 'simulated-not-sent', ''
    # Real delivery is intentionally limited to the explicit test allowlist.
    from twilio.rest import Client
    sid = os.getenv('TWILIO_ACCOUNT_SID', '')
    token = os.getenv('TWILIO_AUTH_TOKEN', '')
    sender = os.getenv('TWILIO_FROM_NUMBER', '')
    if not (sid and token and sender):
        raise HTTPException(503, 'Twilio test configuration is incomplete')
    try:
        result = Client(sid, token).messages.create(body='[CIV-02 TEST] ' + message,
                                                      from_=sender, to=phone)
        return 'submitted-to-provider', result.sid
    except Exception as exc:
        # Avoid exposing provider credentials or private information in errors.
        raise HTTPException(502, 'SMS provider rejected the test message') from exc

@app.post('/api/sms-alerts', status_code=201, dependencies=[Depends(officer)])
def send_sms_alert(data: SMSAlertIn, db: Session=Depends(db_session)):
    get_or_404(db, Ward, data.ward_id)
    phones = test_recipients()
    if not phones:
        raise HTTPException(400, 'Set SMS_TEST_RECIPIENTS in backend environment first')
    if len(phones) > 3:
        raise HTTPException(400, 'Demo mode allows at most 3 test recipients')
    alert = Alert(ward_id=data.ward_id, severity=data.severity, message=data.message,
                  channel='sms-test', delivery_status='processing-test')
    db.add(alert)
    db.flush()
    statuses = []
    for phone in phones:
        try:
            status, provider_id = deliver_test_sms(phone, data.message)
        except HTTPException:
            status, provider_id = 'failed', ''
        db.add(SMSLog(alert_id=alert.id, phone=phone, status=status, provider_id=provider_id))
        statuses.append(status)
    alert.delivery_status = ('submitted-to-provider' if all(x == 'submitted-to-provider' for x in statuses)
                             else 'simulated-not-sent' if all(x == 'simulated-not-sent' for x in statuses)
                             else 'partial-or-failed')
    db.commit()
    return {'alert_id': alert.id, 'delivery_status': alert.delivery_status,
            'recipient_count': len(phones), 'statuses': statuses}

@app.get('/api/sms-alerts/logs', dependencies=[Depends(officer)])
def sms_logs(db: Session=Depends(db_session)):
    # Only expose masked numbers to the UI.
    return [{**{k: v for k, v in as_dict(x).items() if k != 'phone'},
             'phone': ('***' + x.phone[-4:])} for x in db.scalars(select(SMSLog).order_by(SMSLog.id.desc()))]
