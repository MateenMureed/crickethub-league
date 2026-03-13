import { useEffect, useState } from 'react'

const API = '/api'

export default function StatsPage() {
  const [leagues, setLeagues] = useState([])
  const [selectedLeague, setSelectedLeague] = useState('')
  const [batting, setBatting] = useState([])
  const [bowling, setBowling] = useState([])

  useEffect(() => {
    fetch(`${API}/leagues`).then(r => r.json()).then((ls) => {
      setLeagues(ls)
      if (ls?.length) setSelectedLeague(String(ls[0].id))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedLeague) return
    fetch(`${API}/leagues/${selectedLeague}/stats/batting`).then(r => r.json()).then(setBatting).catch(() => setBatting([]))
    fetch(`${API}/leagues/${selectedLeague}/stats/bowling`).then(r => r.json()).then(setBowling).catch(() => setBowling([]))
  }, [selectedLeague])

  return (
    <section className="section">
      <div className="container">
        <div className="section-title">
          <h2>League Stats</h2>
          <div className="accent-line" />
        </div>
        <div style={{ marginBottom: 12, maxWidth: 360 }}>
          <label className="form-label">League</label>
          <select className="form-select" value={selectedLeague} onChange={(e) => setSelectedLeague(e.target.value)}>
            {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>

        <div className="glass-card" style={{ marginBottom: 14, overflowX: 'auto' }}>
          <div className="ls-card-head">Top Batting</div>
          <table className="ls-tbl">
            <thead><tr><th>Player</th><th>Team</th><th>Runs</th><th>Balls</th><th>4s</th><th>6s</th></tr></thead>
            <tbody>
              {batting.slice(0, 15).map((p) => (
                <tr key={`bat-${p.id}`}>
                  <td>{p.name}</td><td>{p.team_name || '-'}</td><td>{p.total_runs || 0}</td><td>{p.total_balls || 0}</td><td>{p.total_fours || 0}</td><td>{p.total_sixes || 0}</td>
                </tr>
              ))}
              {batting.length === 0 && <tr><td colSpan={6} className="ls-td-empty">No batting stats yet</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="glass-card" style={{ overflowX: 'auto' }}>
          <div className="ls-card-head">Top Bowling</div>
          <table className="ls-tbl">
            <thead><tr><th>Player</th><th>Team</th><th>Wickets</th><th>Balls</th><th>Runs</th></tr></thead>
            <tbody>
              {bowling.slice(0, 15).map((p) => (
                <tr key={`bowl-${p.id}`}>
                  <td>{p.name}</td><td>{p.team_name || '-'}</td><td>{p.total_wickets || 0}</td><td>{p.total_balls || 0}</td><td>{p.total_runs_conceded || 0}</td>
                </tr>
              ))}
              {bowling.length === 0 && <tr><td colSpan={5} className="ls-td-empty">No bowling stats yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
