import { useEffect, useState } from 'react'
import BannerLightbox from '../components/BannerLightbox'

const API = '/api'

export default function FixturesPage() {
  const [leagues, setLeagues] = useState([])
  const [selectedLeague, setSelectedLeague] = useState('all')
  const [fixtures, setFixtures] = useState([])
  const [missingBanners, setMissingBanners] = useState({})
  const [lightboxSrc, setLightboxSrc] = useState('')

  useEffect(() => {
    fetch(`${API}/leagues`).then(r => r.json()).then((ls) => {
      setLeagues(ls)
      if (ls?.length) setSelectedLeague(String(ls[0].id))
    }).catch(() => {})
    fetch(`${API}/matches/upcoming/all`).then(r => r.json()).then(setFixtures).catch(() => {})
  }, [])

  const shownFixtures = selectedLeague === 'all'
    ? fixtures
    : fixtures.filter((m) => String(m.league_id) === String(selectedLeague))

  const markMissing = (key) => setMissingBanners((prev) => ({ ...prev, [key]: true }))
  const openBanner = (src) => {
    if (!src) return
    setLightboxSrc(src)
  }

  return (
    <section className="section">
      <BannerLightbox src={lightboxSrc} alt="Fixture banner preview" onClose={() => setLightboxSrc('')} />
      <div className="container">
        <div className="section-title">
          <h2>Upcoming Fixtures</h2>
          <div className="accent-line" />
        </div>
        <div style={{ marginBottom: 12, maxWidth: 360 }}>
          <label className="form-label">League</label>
          <select className="form-select" value={selectedLeague} onChange={(e) => setSelectedLeague(e.target.value)}>
            <option value="all">All Leagues</option>
            {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="fixtures-vertical-list">
          {shownFixtures.slice(0, 50).map((m) => (
            <div className="fixture-card-wide" key={m.id}>
              {!missingBanners[`vs_${m.id}`] && (
                <img
                  src={`/media/banners/matches/vs_banner_${m.id}.png`}
                  alt={`${m.team_a_name} vs ${m.team_b_name} banner`}
                  style={{ width: '100%', flexBasis: '100%', height: 110, objectFit: 'cover', borderBottom: '1px solid var(--glass-bd)', cursor: 'zoom-in' }}
                  onError={() => markMissing(`vs_${m.id}`)}
                  onClick={() => openBanner(`/media/banners/matches/vs_banner_${m.id}.png`)}
                />
              )}
              <div className="fixture-side"><h3>{m.team_a_name}</h3></div>
              <div className="fixture-center">
                <span className="fixture-vs">VS</span>
                <p>{m.date || m.match_date || 'Date TBA'} · {m.time || m.match_time || 'Time TBA'} · {m.league_name}</p>
              </div>
              <div className="fixture-side"><h3>{m.team_b_name}</h3></div>
            </div>
          ))}
          {shownFixtures.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">📅</div>
              <h3>No upcoming fixtures</h3>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
