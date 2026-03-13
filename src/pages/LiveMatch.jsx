import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import BannerLightbox from '../components/BannerLightbox'

const API = '/api'

/* ── Icons ── */
const IcoBat  = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="21" x2="15" y2="9"/><path d="M15 9l4-4 2 2-4 4"/></svg>
const IcoBall = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 016.36 15.36M5.64 5.64A9 9 0 0112 3"/></svg>
const IcoHist = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>

export default function LiveMatch() {
  const { id } = useParams()
  const [match, setMatch] = useState(null)
  const [scorecard, setScorecard] = useState([])
  const [balls, setBalls] = useState([])
  const [activeInningsId, setActiveInningsId] = useState(null)
  const [missingBanners, setMissingBanners] = useState({})
  const [lightboxSrc, setLightboxSrc] = useState('')

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
      setActiveInningsId(activeInn.id)
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

  /* ── Loading ── */
  if (!match) return (
    <div className="container section" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loading-spinner" />
    </div>
  )

  /* ── Completed ── */
  if (match.status === 'completed') return (
    <div className="container section" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: '3rem' }}>🏆</div>
        <h2 style={{ background: 'var(--g-gold)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Match Complete</h2>
        <p style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '1rem', maxWidth: 300 }}>{match.result_summary}</p>
        <Link to={`/match/${id}/scorecard`} className="btn btn-primary">View Full Scorecard →</Link>
      </div>
    </div>
  )

  /* ── Live data ── */
  const activeInnings = scorecard.find(s => !s.is_completed) || scorecard[scorecard.length - 1]
  const currentRR = activeInnings?.total_balls > 0
    ? ((activeInnings.total_runs / activeInnings.total_balls) * 6).toFixed(2) : '0.00'
  const currentOverBalls = balls.length
    ? balls.filter(b => b.over_number === balls[balls.length - 1].over_number).slice(-6) : []
  const overNum = Math.floor((activeInnings?.total_balls || 0) / 6)
  const firstInnings = match.innings?.find(i => i.innings_number === 1)
  const isSecondInnings = activeInnings?.innings_number === 2
  const target = isSecondInnings && firstInnings ? firstInnings.total_runs + 1 : null
  const runsNeeded = target ? target - (activeInnings?.total_runs || 0) : null
  const ballsLeft = isSecondInnings ? (match.overs_per_innings || 20) * 6 - (activeInnings?.total_balls || 0) : null
  const rrr = runsNeeded && ballsLeft > 0 ? ((runsNeeded / ballsLeft) * 6).toFixed(2) : null
  const chasePercent = target ? Math.min(100, Math.round(((activeInnings?.total_runs || 0) / (target - 1)) * 100)) : 0
  const strikerId = activeInnings?.striker_id ? Number(activeInnings.striker_id) : null
  const overSlots = Array.from({ length: 6 }, (_, i) => currentOverBalls[i] || null)
  const inningsType = activeInnings?.innings_number === 2 ? 'second' : 'first'
  const inningsBannerKey = `innings_${id}_${inningsType}`
  const openBanner = (src) => {
    if (!src) return
    setLightboxSrc(src)
  }

  /* ball style map */
  const ballStyles = {
    'b-dot': { bg: 'var(--glass-bg)', border: 'var(--glass-bd)', color: 'var(--t3)' },
    'b-1':   { bg: 'var(--sky-dim)', border: 'var(--sky)', color: 'var(--sky)' },
    'b-2':   { bg: 'rgba(64,196,255,0.08)', border: 'rgba(64,196,255,0.5)', color: 'var(--sky)' },
    'b-4':   { bg: 'var(--accent-dim)', border: 'var(--accent)', color: 'var(--accent)' },
    'b-6':   { bg: 'var(--gold-dim)', border: 'var(--gold)', color: 'var(--gold)' },
    'b-W':   { bg: 'var(--red-dim)', border: 'var(--red)', color: 'var(--red)' },
    'b-Wd':  { bg: 'rgba(255,140,66,0.1)', border: 'var(--orange)', color: 'var(--orange)' },
    'b-Nb':  { bg: 'rgba(255,140,66,0.08)', border: 'rgba(255,140,66,0.5)', color: 'var(--orange)' },
  }

  const BallDot = ({ ball, size = 34 }) => {
    const cls = ball ? ballCls(ball) : 'empty'
    const s = ballStyles[cls] || {}
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.78rem',
        background: ball ? s.bg : 'var(--glass-bg)',
        border: `2px solid ${ball ? s.border : 'var(--glass-bd)'}`,
        color: ball ? s.color : 'var(--t4)',
        flexShrink: 0,
        transition: 'transform 0.12s',
      }}>
        {ball ? ballLbl(ball) : ''}
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      <BannerLightbox src={lightboxSrc} alt="Live innings banner preview" onClose={() => setLightboxSrc('')} />
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
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <img
              src={`/media/banners/matches/innings_banner_${inningsType}_${id}.png`}
              alt={`${match.team_a_name} vs ${match.team_b_name} innings banner`}
              style={{ width: '100%', maxHeight: 210, objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
              onError={() => setMissingBanners((prev) => ({ ...prev, [inningsBannerKey]: true }))}
              onClick={() => openBanner(`/media/banners/matches/innings_banner_${inningsType}_${id}.png`)}
            />
          </div>
        )}

        {/* ── HERO SCOREBOARD ── */}
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          {/* header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 16px',
            borderBottom: '1px solid var(--glass-bd)',
            background: 'var(--accent-dim)',
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.68rem', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--accent)' }}>
              {match.team_a_name} vs {match.team_b_name}
            </span>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)', animation: 'livePulse 1.2s ease-in-out infinite' }} />
          </div>

          {/* innings rows */}
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {match.innings?.map(inn => {
              const isActive = inn.id === activeInningsId
              const teamName = inn.batting_team_id === match.team_a_id ? match.team_a_name : match.team_b_name
              const sc = scorecard.find(s => s.id === inn.id)
              const runs = sc?.total_runs ?? inn.total_runs ?? 0
              const wkts = sc?.total_wickets ?? inn.total_wickets ?? 0
              const bls  = sc?.total_balls ?? inn.total_balls ?? 0
              return (
                <div key={inn.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '11px 14px', borderRadius: 'var(--r-md)',
                  background: isActive ? 'var(--accent-dim)' : 'var(--glass-bg)',
                  border: `1px solid ${isActive ? 'rgba(0,232,150,0.25)' : 'var(--glass-bd)'}`,
                  transition: 'all 0.2s',
                }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--t1)', marginBottom: 2 }}>{teamName}</div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--t3)' }}>{inn.innings_number === 1 ? '1st Innings' : '2nd Innings'}</div>
                    {isActive && target && (
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', fontWeight: 700, color: 'var(--sky)', letterSpacing: 1, textTransform: 'uppercase', marginTop: 3 }}>
                        Target {target} · Need {runsNeeded}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 700, lineHeight: 1, color: isActive ? 'var(--gold)' : 'var(--t3)', textShadow: isActive ? '0 0 18px rgba(247,201,72,0.3)' : 'none' }}>
                      {runs}<span style={{ fontSize: '1.1rem', opacity: 0.6 }}>/{wkts}</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.67rem', color: 'var(--t3)', letterSpacing: 1, marginTop: 2 }}>({fmtOvers(bls)} overs)</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Chase bar */}
          {isSecondInnings && target && (
            <div style={{ padding: '0 14px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--t3)' }}>Chase Progress</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--sky)' }}>{chasePercent}%</span>
              </div>
              <div style={{ height: 5, background: 'var(--glass-bg)', borderRadius: 3, overflow: 'hidden', border: '1px solid var(--glass-bd)' }}>
                <div style={{ height: '100%', borderRadius: 3, width: `${chasePercent}%`, background: 'linear-gradient(90deg, var(--sky), var(--gold))', transition: 'width 0.5s' }} />
              </div>
            </div>
          )}
        </div>

        {/* ── CURRENT OVER ── */}
        <div className="glass-card" style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--accent)' }}>Current Over</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 700, color: 'var(--t1)' }}>Over {overNum}</span>
            <div style={{ marginLeft: 'auto', fontFamily: 'var(--font-display)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: 1, color: 'var(--sky)', background: 'var(--sky-dim)', border: '1px solid rgba(64,196,255,0.25)', padding: '2px 9px', borderRadius: 4 }}>CRR {currentRR}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {overSlots.map((b, i) => <BallDot key={b?.id || `empty-${i}`} ball={b} size={36} />)}
          </div>
        </div>

        {/* ── BATTING & BOWLING STATS ── */}
        {activeInnings && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* Batting */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--glass-bd)', background: 'var(--gold-dim)', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-display)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)' }}>
                <IcoBat /> Batting
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--glass-bg)' }}>
                    {['Batsman', 'R', 'B', 'SR'].map(h => (
                      <th key={h} style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--t3)', padding: '5px 7px', textAlign: h === 'Batsman' ? 'left' : 'center' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeInnings.batting?.filter(b => !b.is_out).slice(-2).map(b => (
                    <tr key={b.player_id} style={{ borderTop: '1px solid var(--glass-bd)' }}>
                      <td style={{ padding: '7px 7px 7px 10px', fontSize: '0.75rem', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          {Number(b.player_id) === strikerId && (
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)', animation: 'livePulse 1.1s ease-in-out infinite', flexShrink: 0 }} />
                          )}
                          {b.name}
                        </span>
                      </td>
                      <td style={{ padding: '7px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--gold)', fontSize: '0.88rem' }}>{b.runs}</td>
                      <td style={{ padding: '7px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--t1)' }}>{b.balls_faced}</td>
                      <td style={{ padding: '7px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--t2)' }}>{b.balls_faced > 0 ? ((b.runs / b.balls_faced) * 100).toFixed(0) : '0'}</td>
                    </tr>
                  ))}
                  {!activeInnings.batting?.filter(b => !b.is_out).length && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--t3)', padding: 12, fontSize: '0.72rem' }}>Awaiting</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Bowling */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--glass-bd)', background: 'var(--red-dim)', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'var(--font-display)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--red)' }}>
                <IcoBall /> Bowling
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--glass-bg)' }}>
                    {['Bowler', 'O', 'W', 'Ec'].map(h => (
                      <th key={h} style={{ fontFamily: 'var(--font-display)', fontSize: '0.55rem', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--t3)', padding: '5px 7px', textAlign: h === 'Bowler' ? 'left' : 'center' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeInnings.bowling?.slice(-2).map(b => (
                    <tr key={b.player_id} style={{ borderTop: '1px solid var(--glass-bd)' }}>
                      <td style={{ padding: '7px 7px 7px 10px', fontSize: '0.75rem', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</td>
                      <td style={{ padding: '7px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', color: 'var(--t1)' }}>{fmtOvers(b.balls_bowled)}</td>
                      <td style={{ padding: '7px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--red)', fontSize: '0.88rem' }}>{b.wickets}</td>
                      <td style={{ padding: '7px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', color: 'var(--t2)' }}>{b.balls_bowled > 0 ? (b.runs_conceded / (b.balls_bowled / 6)).toFixed(1) : '0.0'}</td>
                    </tr>
                  ))}
                  {!activeInnings.bowling?.length && (
                    <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--t3)', padding: 12, fontSize: '0.72rem' }}>Awaiting</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── RUN RATES ── */}
        {activeInnings && (
          <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', overflow: 'hidden' }}>
            {[
              { label: 'Current RR', val: currentRR, color: 'var(--sky)' },
              { label: rrr ? 'Required RR' : 'Balls Left', val: rrr || (ballsLeft ?? '—'), color: rrr ? 'var(--orange)' : 'var(--t2)' },
            ].map((r, i) => (
              <div key={r.label} style={{ padding: '12px 14px', textAlign: 'center', borderRight: i === 0 ? '1px solid var(--glass-bd)' : 'none' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 3 }}>{r.label}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 700, color: r.color, lineHeight: 1 }}>{r.val}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── BALL HISTORY ── */}
        {balls.length > 0 && (
          <div className="glass-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--glass-bd)', background: 'var(--glass-bg)', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)', fontSize: '0.6rem', fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: 'var(--accent)' }}>
              <IcoHist /> Last 12 Balls
            </div>
            <div style={{ padding: '10px 14px 12px', display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center' }}>
              {balls.slice(-12).map((b, i) => {
                const arr = balls.slice(-12)
                const showSep = i > 0 && b.over_number !== arr[i - 1].over_number
                return (
                  <span key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    {showSep && <div style={{ width: 1, height: 22, background: 'var(--glass-bd)', margin: '0 2px', flexShrink: 0 }} />}
                    <BallDot ball={b} size={30} />
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Scorecard link */}
        <div style={{ textAlign: 'center', paddingTop: 4 }}>
          <Link to={`/match/${id}/scorecard`} style={{ fontFamily: 'var(--font-display)', fontSize: '0.72rem', letterSpacing: 2, textTransform: 'uppercase', color: 'var(--t2)', textDecoration: 'none', borderBottom: '1px solid var(--glass-bd)', paddingBottom: 2, transition: 'color 0.18s' }}>
            View Full Scorecard →
          </Link>
        </div>
      </div>
    </div>
  )
}