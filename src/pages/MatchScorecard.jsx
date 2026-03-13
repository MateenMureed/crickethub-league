import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import BannerLightbox from '../components/BannerLightbox'

const API = '/api'

export default function MatchScorecard() {
  const { id } = useParams()
  const [match, setMatch] = useState(null)
  const [scorecard, setScorecard] = useState([])
  const [missingSummary, setMissingSummary] = useState(false)
  const [missingResult, setMissingResult] = useState(false)
  const [lightboxSrc, setLightboxSrc] = useState('')

  useEffect(() => {
    fetch(`${API}/matches/${id}`).then(r => r.json()).then(setMatch).catch(() => {})
    fetch(`${API}/matches/${id}/scorecard`).then(r => r.json()).then(setScorecard).catch(() => {})
  }, [id])

  const formatOvers = (balls) => !balls ? '0.0' : `${Math.floor(balls / 6)}.${balls % 6}`
  const openBanner = (src) => {
    if (!src) return
    setLightboxSrc(src)
  }

  if (!match) return (
    <div className="container section" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loading-spinner" />
    </div>
  )

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 60, maxWidth: 1060 }}>
      <BannerLightbox src={lightboxSrc} alt="Match summary banner preview" onClose={() => setLightboxSrc('')} />

      {(!missingSummary || !missingResult) && (
        <div className="glass-card" style={{ marginBottom: 14, overflow: 'hidden' }}>
          <img
            src={!missingSummary ? `/media/banners/results/summary_banner_${id}.png` : `/media/banners/results/result_banner_${id}.png`}
            alt={`${match.team_a_name} vs ${match.team_b_name} generated summary`}
            style={{ width: '100%', maxHeight: 380, objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
            onError={() => {
              if (!missingSummary) setMissingSummary(true)
              else setMissingResult(true)
            }}
            onClick={() => {
              const src = !missingSummary ? `/media/banners/results/summary_banner_${id}.png` : `/media/banners/results/result_banner_${id}.png`
              openBanner(src)
            }}
          />
        </div>
      )}

      {/* ── Match Result Banner ── */}
      <div className="vs-banner" style={{ marginBottom: 24 }}>
        {/* League + match badge */}
        <div style={{ textAlign: 'center', marginBottom: 20, position: 'relative', zIndex: 2 }}>
          <span style={{
            background: 'var(--accent-dim)', border: '1px solid rgba(0,232,150,0.22)',
            color: 'var(--t2)', padding: '4px 14px', borderRadius: 99,
            fontSize: '0.72rem', fontFamily: 'var(--font-display)', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            {match.league_name} · Match #{match.match_number}
          </span>
        </div>

        <div className="vs-banner-content">
          {/* Team A */}
          <div className="vs-banner-team">
            {match.team_a_logo
              ? <img src={match.team_a_logo} alt="" className="vs-banner-team-logo" />
              : <div className="vs-banner-team-logo" style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--accent)' }}>{match.team_a_name?.charAt(0)}</div>}
            <div className="vs-banner-team-name">{match.team_a_name}</div>
            {scorecard.map(s => s.batting_team_id === match.team_a_id && (
              <div key={s.id} style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 700, color: match.winner_id === match.team_a_id ? 'var(--accent)' : 'var(--t1)', textAlign: 'center' }}>
                {s.total_runs}/{s.total_wickets}
                <div style={{ fontSize: '0.74rem', color: 'var(--t2)', fontFamily: 'var(--font-body)' }}>({formatOvers(s.total_balls)} ov)</div>
              </div>
            ))}
          </div>

          {/* VS */}
          <div className="vs-banner-center">
            <div className="vs-banner-vs">VS</div>
          </div>

          {/* Team B */}
          <div className="vs-banner-team">
            {match.team_b_logo
              ? <img src={match.team_b_logo} alt="" className="vs-banner-team-logo" />
              : <div className="vs-banner-team-logo" style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--gold)' }}>{match.team_b_name?.charAt(0)}</div>}
            <div className="vs-banner-team-name">{match.team_b_name}</div>
            {scorecard.map(s => s.batting_team_id === match.team_b_id && (
              <div key={s.id} style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 700, color: match.winner_id === match.team_b_id ? 'var(--accent)' : 'var(--t1)', textAlign: 'center' }}>
                {s.total_runs}/{s.total_wickets}
                <div style={{ fontSize: '0.74rem', color: 'var(--t2)', fontFamily: 'var(--font-body)' }}>({formatOvers(s.total_balls)} ov)</div>
              </div>
            ))}
          </div>
        </div>

        {match.result_summary && (
          <div style={{ textAlign: 'center', marginTop: 18, position: 'relative', zIndex: 2 }}>
            <div style={{ color: 'var(--accent)', fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{match.result_summary}</div>
          </div>
        )}
        {match.mom_name && (
          <div style={{ textAlign: 'center', marginTop: 10, position: 'relative', zIndex: 2 }}>
            <span style={{ color: 'var(--gold)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700, fontFamily: 'var(--font-display)' }}>⭐ Man of the Match</span>
            <div style={{ fontWeight: 700, marginTop: 4, fontFamily: 'var(--font-display)', fontSize: '1rem' }}>{match.mom_name}</div>
          </div>
        )}
      </div>

      {/* ── Innings Scorecards ── */}
      {scorecard.map(inn => (
        <div key={inn.id} className="glass-card" style={{ marginBottom: 18, overflow: 'hidden' }}>
          {/* Innings header */}
          <div style={{
            padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'linear-gradient(135deg, var(--accent-dim), var(--gold-dim))',
            borderBottom: '1px solid var(--glass-bd)',
            flexWrap: 'wrap', gap: 8,
          }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800 }}>
              {inn.team_name} — {inn.innings_number === 1 ? '1st' : '2nd'} Innings
            </h3>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', color: 'var(--accent)', fontWeight: 700 }}>
              {inn.total_runs}/{inn.total_wickets}
              <span style={{ fontSize: '0.82rem', color: 'var(--t2)', marginLeft: 6 }}>({formatOvers(inn.total_balls)} ov)</span>
            </div>
          </div>

          {/* Batting */}
          <div style={{ padding: '0 20px', overflowX: 'auto' }}>
            <h4 style={{ padding: '13px 0 8px', color: 'var(--t2)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'var(--font-display)', fontWeight: 700 }}>Batting</h4>
            <table className="scorecard-table">
              <thead>
                <tr><th>Batsman</th><th>Dismissal</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr>
              </thead>
              <tbody>
                {inn.batting?.map(b => (
                  <tr key={b.player_id}>
                    <td className="player-name">{b.name}</td>
                    <td style={{ color: 'var(--t2)', fontSize: '0.8rem' }}>
                      {b.is_out
                        ? `${b.dismissal_type}${b.bowler_name ? ` b ${b.bowler_name}` : ''}${b.fielder_name ? ` c ${b.fielder_name}` : ''}`
                        : <span style={{ color: 'var(--accent)', fontWeight: 700 }}>not out</span>}
                    </td>
                    <td className="highlight">{b.runs}</td>
                    <td>{b.balls_faced}</td>
                    <td>{b.fours}</td>
                    <td>{b.sixes}</td>
                    <td>{b.balls_faced > 0 ? ((b.runs / b.balls_faced) * 100).toFixed(1) : '0.0'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '9px 0', color: 'var(--t2)', fontSize: '0.8rem', borderTop: '1px solid var(--glass-bd)' }}>
              Extras: {(inn.extras_wides || 0) + (inn.extras_noballs || 0) + (inn.extras_byes || 0) + (inn.extras_legbyes || 0)}
              <span style={{ color: 'var(--t3)', marginLeft: 4 }}>(wd {inn.extras_wides || 0}, nb {inn.extras_noballs || 0}, b {inn.extras_byes || 0}, lb {inn.extras_legbyes || 0})</span>
            </div>
          </div>

          {/* Bowling */}
          <div style={{ padding: '0 20px 20px', overflowX: 'auto' }}>
            <h4 style={{ padding: '13px 0 8px', color: 'var(--t2)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'var(--font-display)', fontWeight: 700, borderTop: '1px solid var(--glass-bd)' }}>Bowling</h4>
            <table className="scorecard-table">
              <thead>
                <tr><th>Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th></tr>
              </thead>
              <tbody>
                {inn.bowling?.map(b => (
                  <tr key={b.player_id}>
                    <td className="player-name">{b.name}</td>
                    <td>{formatOvers(b.balls_bowled)}</td>
                    <td>{b.maidens}</td>
                    <td>{b.runs_conceded}</td>
                    <td className="highlight" style={{ color: 'var(--red)' }}>{b.wickets}</td>
                    <td>{b.balls_bowled > 0 ? (b.runs_conceded / (b.balls_bowled / 6)).toFixed(2) : '0.00'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <Link to={`/league/${match.league_id}`} className="btn btn-secondary">← Back to League</Link>
      </div>
    </div>
  )
}