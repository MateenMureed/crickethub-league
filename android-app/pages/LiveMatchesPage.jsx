import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const API = '/api'
const fmtOvers = b => !b ? '0.0' : `${Math.floor(b / 6)}.${b % 6}`

export default function LiveMatchesPage() {
  const [liveMatches, setLiveMatches] = useState([])

  useEffect(() => {
    const load = () => fetch(`${API}/matches/live/all`).then(r => r.json()).then(setLiveMatches).catch(() => {})
    load()
    const id = setInterval(load, 1000)
    return () => clearInterval(id)
  }, [])

  const fmtOvers = (b) => !b ? '0.0' : `${Math.floor(b / 6)}.${b % 6}`

  useEffect(() => {
    const load = () => fetch(`${API}/matches/live/all`).then(r => r.json()).then(d => setLiveMatches(Array.isArray(d) ? d : [])).catch(() => {})
    load()
    const id = setInterval(load, 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="page" style={{ paddingBottom: 80 }}>
      <div className="sect-head">
        <h3>🔴 Live Matches</h3>
        {liveMatches.length > 0 && <span style={{ fontSize: '.72rem', color: 'var(--red)', fontWeight: 700 }}>● {liveMatches.length} live</span>}
      </div>

      {liveMatches.length === 0
        ? <div className="empty"><span className="ico">📡</span><h4>No live matches right now</h4><p>Check back soon</p></div>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {liveMatches.map(m => (
              <Link to={`/match/${m.id}`} key={m.id} className="card match-card card-hover" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="match-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className="badge badge-live">● Live</span>
                    <span style={{ fontSize: '.68rem', color: 'var(--t3)' }}>{m.league_name}</span>
                  </div>
                  <span style={{ fontSize: '.68rem', color: 'var(--t3)' }}>Match #{m.match_number}</span>
                </div>
                <div className="match-body">
                  <div className="match-teams">
                    <div className="match-team">
                      <div className="team-logo">{m.team_a_name?.[0]}</div>
                      <div className="team-name">{m.team_a_name}</div>
                    </div>
                    <div className="match-vs live">VS</div>
                    <div className="match-team">
                      <div className="team-logo">{m.team_b_name?.[0]}</div>
                      <div className="team-name">{m.team_b_name}</div>
                    </div>
                  </div>
                  {m.innings?.length > 0 && (
                    <div className="live-mini-score" style={{ textAlign: 'center', marginTop: 10 }}>
                      {m.innings.map(inn => (
                        <div key={inn.id}>
                          {inn.batting_team_id === m.team_a_id ? m.team_a_name : m.team_b_name}: {inn.total_runs}/{inn.total_wickets} ({fmtOvers(inn.total_balls)} ov)
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="match-card-footer">Tap to view live scorecard</div>
              </Link>
            ))}
          </div>
        )}
    </div>
  )
}
