import { useEffect, useState } from 'react'

const API = '/api'

export default function FixturesPage() {
  const [leagues, setLeagues] = useState([])
  const [selectedLeague, setSelectedLeague] = useState('all')
  const [fixtures, setFixtures] = useState([])
  const [loading, setLoading] = useState(true)
  const [missingBanners, setMissingBanners] = useState({})

  useEffect(() => {
    fetch(`${API}/leagues`).then(r => r.json()).then(ls => { setLeagues(Array.isArray(ls) ? ls : []) }).catch(() => {})
    fetch(`${API}/matches/upcoming/all`).then(r => r.json()).then(d => { setFixtures(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const shownFixtures = selectedLeague === 'all'
    ? fixtures
    : fixtures.filter(m => String(m.league_id) === String(selectedLeague))

  const markMissing = (key) => setMissingBanners((prev) => ({ ...prev, [key]: true }))
  const onBannerTap = (src, fileName) => {
    if (!src) return
    const shouldDownload = window.confirm('Download this banner?')
    if (shouldDownload) {
      const link = document.createElement('a')
      link.href = src
      link.download = fileName || 'banner.png'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      return
    }
    window.open(src, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="page" style={{ paddingBottom: 80 }}>
      <div className="sect-head"><h3>📅 Upcoming Fixtures</h3></div>
      <div className="form-group" style={{ marginBottom: 12 }}>
        <select className="form-select" value={selectedLeague} onChange={(e) => setSelectedLeague(e.target.value)}>
          <option value="all">All Leagues</option>
          {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      {loading ? (
        <div className="spinner" />
      ) : shownFixtures.length === 0 ? (
        <div className="empty"><span>📅</span><p>No upcoming fixtures</p></div>
      ) : shownFixtures.slice(0, 50).map((m) => (
        <div key={m.id} className="card" style={{ marginBottom: 8 }}>
          {!missingBanners[`vs_${m.id}`] && (
            <img
              src={`/media/banners/matches/vs_banner_${m.id}.png`}
              alt={`${m.team_a_name} vs ${m.team_b_name} banner`}
              style={{ width: '100%', height: 108, objectFit: 'cover', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
              onError={() => markMissing(`vs_${m.id}`)}
              onClick={() => onBannerTap(`/media/banners/matches/vs_banner_${m.id}.png`, `vs_banner_${m.id}.png`)}
            />
          )}
          <div className="fixture-card">
            <div className="fixture-teams">
              <div className="fixture-team">{m.team_a_name}</div>
              <div className="fixture-vs">VS</div>
              <div className="fixture-team">{m.team_b_name}</div>
            </div>
            <div className="fixture-meta">
              {m.league_name} · {m.venue || 'Venue TBD'} · {m.date || m.match_date || 'Date TBC'} · {m.time || m.match_time || 'Time TBC'}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
