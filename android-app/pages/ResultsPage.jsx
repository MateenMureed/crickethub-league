import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const API = '/api'

export default function ResultsPage() {
  const [leagues, setLeagues] = useState([])
  const [selectedLeague, setSelectedLeague] = useState('all')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [missingBanners, setMissingBanners] = useState({})

  useEffect(() => {
    fetch(`${API}/leagues`).then(r => r.json()).then(ls => { setLeagues(Array.isArray(ls) ? ls : []) }).catch(() => {})
    fetch(`${API}/matches/completed/all`).then(r => r.json()).then(d => { setResults(Array.isArray(d) ? d : []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const shownResults = selectedLeague === 'all'
    ? results
    : results.filter(m => String(m.league_id) === String(selectedLeague))

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
      <div className="sect-head"><h3>🏅 Results</h3></div>
      <div className="form-group" style={{ marginBottom: 12 }}>
        <select className="form-select" value={selectedLeague} onChange={(e) => setSelectedLeague(e.target.value)}>
          <option value="all">All Leagues</option>
          {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </div>
      {loading ? (
        <div className="spinner" />
      ) : shownResults.length === 0 ? (
        <div className="empty"><span>🏅</span><p>No results published yet</p></div>
      ) : shownResults.slice(0, 50).map((m) => (
        <Link to={`/match/${m.id}`} key={m.id} className="card card-hover" style={{ marginBottom: 8, textDecoration: 'none', color: 'inherit', display: 'block' }}>
          {(() => {
            const summaryMissing = !!missingBanners[`summary_${m.id}`]
            const resultMissing = !!missingBanners[`result_${m.id}`]
            const src = !summaryMissing
              ? `/media/banners/results/summary_banner_${m.id}.png`
              : (!resultMissing ? `/media/banners/results/result_banner_${m.id}.png` : null)
            if (!src) return null
            return (
              <img
                src={src}
                alt={`${m.team_a_name} vs ${m.team_b_name} summary`}
                style={{ width: '100%', height: 118, objectFit: 'cover', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                onError={() => {
                  if (!summaryMissing) markMissing(`summary_${m.id}`)
                  else markMissing(`result_${m.id}`)
                }}
                onClick={(e) => {
                  e.preventDefault()
                  onBannerTap(src, src.split('/').pop())
                }}
              />
            )
          })()}
          <div className="match-card-header">
            <span style={{ fontSize: '0.72rem', color: 'var(--t2)' }}>{m.league_name}</span>
            <span className="badge-completed">FT</span>
          </div>
          <div className="fixture-card">
            <div className="fixture-teams">
              <div className="fixture-team">{m.team_a_name}</div>
              <div className="fixture-vs">vs</div>
              <div className="fixture-team">{m.team_b_name}</div>
            </div>
            {m.result_summary && <div className="result-summary" style={{ textAlign: 'center' }}>{m.result_summary}</div>}
            {m.mom_name && <div style={{ textAlign: 'center', fontSize: '0.72rem', color: 'var(--gold)', paddingTop: 4 }}>⭐ MOM: {m.mom_name}</div>}
          </div>
        </Link>
      ))}
    </div>
  )
}
