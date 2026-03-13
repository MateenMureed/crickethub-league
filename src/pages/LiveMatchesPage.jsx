import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const API = '/api'

export default function LiveMatchesPage() {
  const [liveMatches, setLiveMatches] = useState([])

  useEffect(() => {
    const load = () => fetch(`${API}/matches/live/all`).then(r => r.json()).then(setLiveMatches).catch(() => {})
    load()
    const id = setInterval(load, 1000)
    return () => clearInterval(id)
  }, [])

  const fmtOvers = (b) => !b ? '0.0' : `${Math.floor(b / 6)}.${b % 6}`

  return (
    <section className="section">
      <div className="container">
        <div className="section-title">
          <h2>Live Matches</h2>
          <div className="accent-line" />
        </div>
        <div className="grid-3">
          {liveMatches.map((m) => (
            <Link to={`/match/${m.id}/live`} key={m.id} className="glass-card match-card" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="match-card-header">
                <span className="badge badge-live">● Live</span>
                <span style={{ fontSize: '.72rem', color: 'var(--t3)' }}>Match #{m.match_number}</span>
              </div>
              <div className="match-card-body">
                <div className="match-teams">
                  <div className="match-team"><div className="match-team-name">{m.team_a_name}</div></div>
                  <div className="match-vs live">VS</div>
                  <div className="match-team"><div className="match-team-name">{m.team_b_name}</div></div>
                </div>
                {m.innings?.length > 0 && (
                  <div className="live-mini-score">
                    {m.innings.map((inn) => (
                      <div key={inn.id}>
                        {inn.batting_team_id === m.team_a_id ? m.team_a_name : m.team_b_name}: {inn.total_runs}/{inn.total_wickets} ({fmtOvers(inn.total_balls)})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Link>
          ))}
          {liveMatches.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <div className="empty-state-icon">📡</div>
              <h3>No live matches right now</h3>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
