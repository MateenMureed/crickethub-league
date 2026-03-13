import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

const API = '/api'

export default function LiveMatch() {
  const { matchId, id: routeId } = useParams()
  const id = matchId || routeId
  const [match, setMatch] = useState(null)
  const [scorecard, setScorecard] = useState([])
  const [balls, setBalls] = useState([])
  const [missingBanners, setMissingBanners] = useState({})

  useEffect(() => { loadData() }, [id])
  useEffect(() => {
    const interval = setInterval(loadData, 1000)
    return () => clearInterval(interval)
  }, [id])

  const loadData = async () => {
    const m = await fetch(`${API}/matches/${id}`).then(r => r.json()).catch(() => null)
    if (!m) return
    setMatch(m)
    const sc = await fetch(`${API}/matches/${id}/scorecard`).then(r => r.json()).catch(() => [])
    setScorecard(sc)
    const activeInn = m.innings?.find(i => !i.is_completed) || m.innings?.[m.innings.length - 1]
    if (activeInn) {
      const b = await fetch(`${API}/innings/${activeInn.id}/balls`).then(r => r.json()).catch(() => [])
      setBalls(b)
    }
  }

  const fmtOvers = b => !b ? '0.0' : `${Math.floor(b / 6)}.${b % 6}`
  const ballCls = ball => {
    if (ball.is_wicket) return 'b-W'
    if (ball.extras_type === 'wide') return 'b-Wd'
    if (ball.extras_type === 'noball') return 'b-Nb'
    if (ball.runs_scored === 6) return 'b-6'
    if (ball.runs_scored === 4) return 'b-4'
    if (ball.runs_scored >= 2) return 'b-2'
    if (ball.runs_scored === 1) return 'b-1'
    return 'b-dot'
  }
  const ballLbl = ball => {
    if (ball.is_wicket) return 'W'
    if (ball.extras_type === 'wide') return 'Wd'
    if (ball.extras_type === 'noball') return 'Nb'
    return ball.runs_scored.toString()
  }

  if (!match) return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="spinner" />
    </div>
  )

  if (match.status === 'completed') return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: '3rem' }}>🏆</div>
        <h2 style={{ background: 'var(--g-gold)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Match Complete</h2>
        <p style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '1rem', maxWidth: 300 }}>{match.result_summary}</p>
        <Link to={`/match/${id}`} className="btn-accent" style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 'var(--r2)', textDecoration: 'none' }}>View Full Scorecard →</Link>
      </div>
    </div>
  )

  const activeInnings = scorecard.find(s => !s.is_completed) || scorecard[scorecard.length - 1]
  const currentRR = activeInnings?.total_balls > 0 ? ((activeInnings.total_runs / activeInnings.total_balls) * 6).toFixed(2) : '0.00'
  const inningsType = activeInnings?.innings_number === 2 ? 'second' : 'first'
  const inningsBannerKey = `innings_${id}_${inningsType}`
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
    <div style={{ paddingBottom: 40 }}>
      {/* Topbar */}
      <div style={{
        background: 'var(--nav-bg)',
        backdropFilter: 'blur(24px)',
        borderBottom: '2px solid var(--accent)',
        height: 48, display: 'flex', alignItems: 'center',
        padding: '0 16px', gap: 10,
        position: 'sticky', top: 62, zIndex: 50,
      }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '0.88rem', letterSpacing: 2, textTransform: 'uppercase', background: 'var(--g-accent)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
          CricketHub
        </span>
        <span style={{ color: 'var(--t3)', fontSize: '0.7rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: 1 }}>
          {match.league_name}
        </span>
        <span style={{ background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid rgba(255,77,109,0.3)', fontFamily: 'var(--font-display)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: 2, padding: '3px 9px', borderRadius: 4, animation: 'livePulse 1.6s ease-in-out infinite', flexShrink: 0 }}>
          ● LIVE
        </span>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '14px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!missingBanners[inningsBannerKey] && (
          <div className="card" style={{ overflow: 'hidden' }}>
            <img
              src={`/media/banners/matches/innings_banner_${inningsType}_${id}.png`}
              alt={`${match.team_a_name} vs ${match.team_b_name} innings banner`}
              style={{ width: '100%', maxHeight: 170, objectFit: 'cover', display: 'block', cursor: 'pointer' }}
              onError={() => setMissingBanners((prev) => ({ ...prev, [inningsBannerKey]: true }))}
              onClick={() => onBannerTap(`/media/banners/matches/innings_banner_${inningsType}_${id}.png`, `innings_banner_${inningsType}_${id}.png`)}
            />
          </div>
        )}

        {/* ── HERO SCOREBOARD ── */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between',padding: '10px 16px',borderBottom: '1px solid var(--glass-bd)',background: 'var(--accent-dim)',}}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.68rem', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--accent)' }}>
              {match.team_a_name} vs {match.team_b_name}
            </span>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)', animation: 'livePulse 1.2s ease-in-out infinite' }} />
          </div>

          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {match.innings?.map(inn => {
              const sc = scorecard.find(s => s.id === inn.id)
              const runs = sc?.total_runs ?? inn.total_runs ?? 0
              const wkts = sc?.total_wickets ?? inn.total_wickets ?? 0
              const bls = sc?.total_balls ?? inn.total_balls ?? 0
              const teamName = inn.batting_team_id === match.team_a_id ? match.team_a_name : match.team_b_name
              return (
                <div key={inn.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 14px', borderRadius: 'var(--r-md)',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--glass-bd)',
                }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--t1)', marginBottom: 2 }}>{teamName}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--t3)' }}>{inn.innings_number === 1 ? '1st Innings' : '2nd Innings'}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: 'var(--gold)' }}>
                      {runs}<span style={{ fontSize: '1.1rem', opacity: 0.6 }}>/{wkts}</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.67rem', color: 'var(--t3)', letterSpacing: 1, marginTop: 2 }}>({fmtOvers(bls)} overs)</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Current Over */}
        {balls.length > 0 && (
          <div className="card">
            <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--glass-bd)', background: 'var(--gold-dim)' }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)' }}>Current Over</span>
            </div>
            <div style={{ padding: '12px 14px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {balls.slice(-6).map((b, i) => (
                <div key={i} style={{
                  width: 34, height: 34, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.78rem',
                  background: b.is_wicket ? 'var(--red-dim)' : 'var(--glass-bg)',
                  border: `2px solid ${b.is_wicket ? 'var(--red)' : 'var(--glass-bd)'}`,
                  color: b.is_wicket ? 'var(--red)' : 'var(--t3)',
                }}>
                  {b.is_wicket ? 'W' : b.runs_scored}
                </div>
              ))}
            </div>
          </div>
        )}

        <Link to={`/match/${id}`} className="btn-accent" style={{ display: 'block', width: '100%', textAlign: 'center', padding: '12px', borderRadius: 'var(--r2)', textDecoration: 'none' }}>View Full Scorecard →</Link>
      </div>
    </div>
  )
}
