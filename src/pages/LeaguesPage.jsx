import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const API = '/api'

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState([])
  const [missingBanners, setMissingBanners] = useState({})

  useEffect(() => {
    fetch(`${API}/leagues`).then(r => r.json()).then(setLeagues).catch(() => {})
  }, [])

  const markMissing = (key) => setMissingBanners((prev) => ({ ...prev, [key]: true }))

  return (
    <section className="section">
      <div className="container">
        <div className="section-title">
          <h2>All Leagues</h2>
          <div className="accent-line" />
        </div>
        <div className="active-league-grid">
          {leagues.map((league) => (
            <div key={league.id} className="glass-card active-league-card">
              {!missingBanners[`league_${league.id}`] && (
                <img
                  src={`/media/banners/leagues/league_banner_${league.id}.png`}
                  alt={`${league.name} league banner`}
                  style={{ width: '100%', height: 120, objectFit: 'cover', borderBottom: '1px solid var(--glass-bd)' }}
                  onError={() => markMissing(`league_${league.id}`)}
                />
              )}
              <div className="active-card-top">
                {league.logo
                  ? <img src={league.logo} alt={league.name} className="active-league-logo" />
                  : <div className="active-league-logo fallback">{league.name?.charAt(0)}</div>}
              </div>
              <div className="active-card-center">
                <h3>{league.name}</h3>
                <p>{league.city || 'City TBD'}</p>
                <span>{league.team_count || 0} Teams</span>
              </div>
              <div className="active-card-bottom" style={{ display: 'flex', gap: 8 }}>
                <Link to={`/league/${league.id}`} className="btn btn-primary btn-sm">Open</Link>
                <span className={`badge ${league.status === 'active' ? 'badge-live' : league.status === 'completed' ? 'badge-completed' : 'badge-upcoming'}`}>{league.status}</span>
              </div>
            </div>
          ))}
          {leagues.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <div className="empty-state-icon">🏆</div>
              <h3>No leagues found</h3>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
