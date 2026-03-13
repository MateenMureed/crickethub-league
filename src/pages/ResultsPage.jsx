import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import BannerLightbox from '../components/BannerLightbox'

const API = '/api'

export default function ResultsPage() {
  const [leagues, setLeagues] = useState([])
  const [selectedLeague, setSelectedLeague] = useState('all')
  const [results, setResults] = useState([])
  const [missingBanners, setMissingBanners] = useState({})
  const [lightboxSrc, setLightboxSrc] = useState('')

  useEffect(() => {
    fetch(`${API}/leagues`).then(r => r.json()).then((ls) => {
      setLeagues(ls)
      if (ls?.length) setSelectedLeague(String(ls[0].id))
    }).catch(() => {})
    fetch(`${API}/matches/completed/all`).then(r => r.json()).then(setResults).catch(() => {})
  }, [])

  const shownResults = selectedLeague === 'all'
    ? results
    : results.filter((m) => String(m.league_id) === String(selectedLeague))

  const markMissing = (key) => setMissingBanners((prev) => ({ ...prev, [key]: true }))
  const openBanner = (src) => {
    if (!src) return
    setLightboxSrc(src)
  }

  return (
    <section className="section">
      <BannerLightbox src={lightboxSrc} alt="Result banner preview" onClose={() => setLightboxSrc('')} />
      <div className="container">
        <div className="section-title">
          <h2>Results</h2>
          <div className="accent-line" />
        </div>
        <div style={{ marginBottom: 12, maxWidth: 360 }}>
          <label className="form-label">League</label>
          <select className="form-select" value={selectedLeague} onChange={(e) => setSelectedLeague(e.target.value)}>
            <option value="all">All Leagues</option>
            {leagues.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        </div>
        <div className="grid-3">
          {shownResults.slice(0, 50).map((m) => (
            <Link to={`/match/${m.id}/scorecard`} key={m.id} className="glass-card result-card-broadcast" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
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
                    style={{ width: '100%', height: 150, objectFit: 'cover', borderBottom: '1px solid var(--glass-bd)', cursor: 'zoom-in' }}
                    onError={() => {
                      if (!summaryMissing) markMissing(`summary_${m.id}`)
                      else markMissing(`result_${m.id}`)
                    }}
                    onClick={(e) => {
                      e.preventDefault()
                      openBanner(src)
                    }}
                  />
                )
              })()}
              <div className="result-card-head">{m.league_name}</div>
              <div className="result-scoreline">
                <div>{m.team_a_name}</div>
                <div className="vs">vs</div>
                <div>{m.team_b_name}</div>
              </div>
              <div className="result-summary">{m.result_summary || 'Result pending'}</div>
              {m.mom_name && <div className="result-mom">MOM: {m.mom_name}</div>}
            </Link>
          ))}
          {shownResults.length === 0 && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <div className="empty-state-icon">🏅</div>
              <h3>No results published yet</h3>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
