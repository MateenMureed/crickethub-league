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
    <div className="page" style={{ paddingBottom: 80 }}>
      <div className="sect-head"><h3>📊 League Stats</h3></div>
      <div className="form-group" style={{ marginBottom: 12 }}>
        <select className="form-select" value={selectedLeague} onChange={(e) => setSelectedLeague(e.target.value)}>
          {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>

      <div className="card" style={{ marginBottom: 12, overflowX: 'auto' }}>
        <div className="match-card-header"><span>🏏 Top Batting</span></div>
        {batting.length === 0 ? (
          <div className="empty" style={{ padding: '20px 0' }}><p>No batting stats yet</p></div>
        ) : (
          <table className="mobile-table">
            <thead><tr><th>Player</th><th>Team</th><th>Runs</th><th>Balls</th><th>4s</th><th>6s</th></tr></thead>
            <tbody>
              {batting.slice(0, 15).map((p) => (
                <tr key={`bat-${p.id}`}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td style={{ color: 'var(--t2)' }}>{p.team_name || '-'}</td>
                  <td className="cell-hl">{p.total_runs || 0}</td>
                  <td>{p.total_balls || 0}</td>
                  <td>{p.total_fours || 0}</td>
                  <td>{p.total_sixes || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <div className="match-card-header"><span>🎳 Top Bowling</span></div>
        {bowling.length === 0 ? (
          <div className="empty" style={{ padding: '20px 0' }}><p>No bowling stats yet</p></div>
        ) : (
          <table className="mobile-table">
            <thead><tr><th>Player</th><th>Team</th><th>Wkts</th><th>Overs</th><th>Runs</th></tr></thead>
            <tbody>
              {bowling.slice(0, 15).map((p) => (
                <tr key={`bowl-${p.id}`}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td style={{ color: 'var(--t2)' }}>{p.team_name || '-'}</td>
                  <td className="cell-hl" style={{ color: 'var(--red)' }}>{p.total_wickets || 0}</td>
                  <td>{p.total_balls ? `${Math.floor(p.total_balls / 6)}.${p.total_balls % 6}` : '0.0'}</td>
                  <td>{p.total_runs_conceded || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
