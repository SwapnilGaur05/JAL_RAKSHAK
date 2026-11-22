import React from 'react';

const reports = [
  {
    date: '30 September 2026',
    place: 'Andheri, Mumbai',
    title: 'Heavy rain floods Andheri Subway',
    impact: 'Waterlogging affected traffic. Eleven incoming flights were diverted because of adverse weather.',
    source: 'Moneycontrol',
    url: 'https://www.moneycontrol.com/city/mumbai-rain-havoc-andheri-subway-flooded-11-flights-diverted-as-heavy-showers-lash-city-article-14041470.html'
  },
  {
    date: '13 September 2026',
    place: 'Vasai–Virar, Maharashtra',
    title: 'Flooding disrupts roads and markets',
    impact: 'Waterlogged roads and markets affected daily activities in Vasai, Virar and Nalasopara.',
    source: 'Free Press Journal',
    url: 'https://www.freepressjournal.in/mumbai/mumbai-weather-heavy-rain-disrupts-life-in-neighbouring-vasai-virar-orange-alert-issued-for-city-thane-palghar-video'
  },
  {
    date: '7 July 2026',
    place: 'Pune and Pimpri-Chinchwad',
    title: 'Heavy rain floods residential areas',
    impact: 'Chinchwad recorded 268 mm in 24 hours. Flooding, traffic disruption and rescue operations were reported.',
    source: 'Times of India',
    url: 'https://timesofindia.indiatimes.com/city/pune/pune-pummeled-by-two-days-of-heavy-rain-many-areas-flooded/articleshow/132248540.cms'
  },
  {
    date: '24 June 2026',
    place: 'Mumbai, Maharashtra',
    title: 'Heavy rain disrupts local trains',
    impact: 'Low-lying areas flooded, and road and railway disruption affected commuters.',
    source: 'The New Indian Express',
    url: 'https://www.newindianexpress.com/cities/mumbai/2026/Jun/24/heavy-rains-flood-low-lying-areas-disrupt-trains-in-mumbai-sena-congress-urge-mayor-to-act'
  }
];

export default function FloodNews() {
  return (
    <section className="flood-news">
      <div className="news-hero">
        <span>JALRAKSHA · FLOOD REPORTS</span>
        <h2>Flood News & Affected Areas</h2>
        <p>Documented flood events, affected locations,
          public impacts and original news coverage.</p>
      </div>

      <p className="muted">
        Archived news reports from 2026.
        Not live flood conditions or emergency warnings.
      </p>

      <div className="news-grid">
        {reports.map(report => (
          <article className="news-card" key={report.url}>
            <div className="news-visual">
              {report.image && (
                <img
                  className="news-photo"
                  src={report.image}
                  alt={`Flood reporting from ${report.place}`}
                  loading="lazy"
                />
              )}
              <span className="news-date">{report.date}</span>
              <div>
                <span className="news-location">📍 {report.place}</span>
                <h3>{report.title}</h3>
              </div>
            </div>

            <div className="news-content">
              <h4>What happened?</h4>
              <p>{report.impact}</p>

              <p className="news-source">
                Source: {report.source}
              </p>

              <a href={report.url}
                target="_blank"
                rel="noopener noreferrer">
                View original report & photos ↗
              </a>
            </div>
          </article>
        ))}
      </div>

      <p className="muted">
        For current official warnings, consult IMD
        and your local disaster-management authority.
      </p>
    </section>
  );
}
