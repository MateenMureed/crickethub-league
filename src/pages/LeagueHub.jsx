import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import BannerLightbox from '../components/BannerLightbox'

const API = '/api'

export default function LeagueHub() {
  const { id } = useParams()
  const [league, setLeague] = useState(null)
  const [teams, setTeams] = useState([])
  const [matches, setMatches] = useState([])
  const [points, setPoints] = useState([])
  const [battingStats, setBattingStats] = useState([])
  const [bowlingStats, setBowlingStats] = useState([])
  const [activeTab, setActiveTab] = useState('overview')
  const [expandedTeam, setExpandedTeam] = useState(null)
  const [teamPlayers, setTeamPlayers] = useState({})
  const [missingBanners, setMissingBanners] = useState({})
  const [lightboxSrc, setLightboxSrc] = useState('')

  useEffect(() => { loadData() }, [id])

  useEffect(() => {
    if (activeTab !== 'points') return
    fetchPoints()
    const intervalId = setInterval(fetchPoints, 5000)
    return () => clearInterval(intervalId)
  }, [activeTab, id])

  const fetchPoints = () =>
    fetch(`${API}/leagues/${id}/points`).then(r => r.json()).then(setPoints).catch(() => {})

  const loadData = () => {
    fetch(`${API}/leagues/${id}`).then(r => r.json()).then(setLeague).catch(() => {})
    fetch(`${API}/leagues/${id}/teams`).then(r => r.json()).then(setTeams).catch(() => {})
    fetch(`${API}/leagues/${id}/matches`).then(r => r.json()).then(setMatches).catch(() => {})
    fetchPoints()
    fetch(`${API}/leagues/${id}/stats/batting`).then(r => r.json()).then(setBattingStats).catch(() => {})
    fetch(`${API}/leagues/${id}/stats/bowling`).then(r => r.json()).then(setBowlingStats).catch(() => {})
  }

  const loadTeamPlayers = async (teamId) => {
    if (expandedTeam === teamId) { setExpandedTeam(null); return }
    if (!teamPlayers[teamId]) {
      const players = await fetch(`${API}/teams/${teamId}/players`).then(r => r.json()).catch(() => [])
      setTeamPlayers(prev => ({ ...prev, [teamId]: players }))
    }
    setExpandedTeam(teamId)
  }

  const formatOvers = (balls) => !balls ? '0.0' : `${Math.floor(balls / 6)}.${balls % 6}`
  const markMissing = (key) => setMissingBanners((prev) => ({ ...prev, [key]: true }))
  const openBanner = (src) => {
    if (!src) return
    setLightboxSrc(src)
  }

  if (!league) return (
    <div className="container section" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="loading-spinner" />
    </div>
  )

  const tabs = ['overview', 'teams', 'fixtures', 'results', 'points', 'statistics']
  const upcomingMatches = matches.filter(m => m.status === 'upcoming')
  const liveMatches = matches.filter(m => m.status === 'live')
  const completedMatches = matches.filter(m => m.status === 'completed')

  return (
    <div>
      <BannerLightbox src={lightboxSrc} alt="Banner preview" onClose={() => setLightboxSrc('')} />
      {/* ── League Hero ── */}
      <div className="league-hero" style={{ minHeight: 'auto' }}>
        <div className="container">
          {!missingBanners[`league_${league.id}`] && (
            <img
              src={`/media/banners/leagues/league_banner_${league.id}.png`}
              alt={`${league.name} league banner`}
              style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 14, marginBottom: 14, border: '1px solid var(--glass-bd)' }}
              onError={() => markMissing(`league_${league.id}`)}
            />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            {league.logo
              ? <img src={league.logo} alt={league.name} style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.15)', boxShadow: '0 0 28px rgba(0,232,150,0.2)', flexShrink: 0 }} />
              : <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'var(--g-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 900, flexShrink: 0 }}>{league.name?.charAt(0)}</div>}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                <h1 style={{ color: '#fff', margin: 0, fontSize: 'clamp(1.4rem,3.5vw,2.4rem)', fontWeight: 900, letterSpacing: '-0.03em' }}>{league.name}</h1>
                <span className={`badge ${league.status === 'active' ? 'badge-live' : league.status === 'completed' ? 'badge-completed' : 'badge-upcoming'}`}>{league.status}</span>
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem' }}>
                {league.city && <span>📍 {league.city}</span>}
                {league.venue && <span>🏟 {league.venue}</span>}
                {league.organizer && <span>👤 {league.organizer}</span>}
                {league.format && <span>📋 {league.format}</span>}
                {league.overs_per_innings && <span>🏏 {league.overs_per_innings} overs</span>}
              </div>
              {league.sponsors?.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Sponsors:</span>
                  {league.sponsors.map(s => (
                    <span key={s.id} style={{ padding: '3px 10px', borderRadius: 99, background: 'rgba(255,255,255,0.08)', fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)' }}>{s.name}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick stat pills */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {[
              { label: 'Teams', val: teams.length, color: 'var(--accent)' },
              { label: 'Matches', val: matches.length, color: 'var(--gold)' },
              { label: 'Completed', val: completedMatches.length, color: 'var(--sky)' },
              { label: 'Live', val: liveMatches.length, color: 'var(--red)' },
            ].map(s => (
              <div key={s.label} style={{
                padding: '8px 14px', borderRadius: 'var(--r-lg)',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '1.1rem', color: s.color }}>{s.val}</span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="container" style={{ paddingTop: 20, paddingBottom: 40 }}>
        <div className="tabs">
          {tabs.map(tab => (
            <button
              key={tab}
              className={`tab-btn${activeTab === tab ? ' active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div>
            {/* Live matches */}
            {liveMatches.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--red)' }}>🔴 Live Now</span>
                  <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(255,77,109,0.35), transparent)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {liveMatches.map(m => (
                    <Link to={`/match/${m.id}/live`} key={m.id} style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div className="glass-card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, borderLeft: '3px solid var(--red)' }}>
                        <span className="badge badge-live" style={{ flexShrink: 0, fontSize: '0.55rem' }}>LIVE</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--t3)', fontFamily: 'var(--font-display)', flexShrink: 0 }}>#{m.match_number}</span>
                        <span style={{ fontWeight: 700, fontSize: '0.82rem', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.team_a_name} <span style={{ color: 'var(--t3)', fontWeight: 400 }}>vs</span> {m.team_b_name}
                        </span>
                        <span style={{ color: 'var(--accent)', fontSize: '0.7rem', fontFamily: 'var(--font-display)', fontWeight: 700, flexShrink: 0 }}>View →</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Stats strip — single horizontal row, no big numbers */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 12 }}>
              {[
                { label: 'Teams',     val: teams.length,            color: 'var(--accent)' },
                { label: 'Matches',   val: matches.length,          color: 'var(--gold)' },
                { label: 'Done',      val: completedMatches.length, color: 'var(--sky)' },
                { label: 'Upcoming',  val: upcomingMatches.length,  color: 'var(--orange)' },
              ].map(s => (
                <div key={s.label} className="glass-card" style={{ padding: '10px 6px', textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.15rem', color: s.color, fontWeight: 700, lineHeight: 1 }}>{s.val}</div>
                  <div style={{ color: 'var(--t3)', fontSize: '0.6rem', marginTop: 3, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Mini standings */}
            {points.length > 0 && (
              <div className="glass-card" style={{ overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ padding: '9px 14px', borderBottom: '1px solid var(--glass-bd)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.62rem', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--gold)' }}>🏆 Standings</span>
                </div>
                {points.slice(0, 5).map((p, i) => (
                  <div key={p.team_id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 14px',
                    borderBottom: i < Math.min(points.length, 5) - 1 ? '1px solid var(--glass-bd)' : 'none',
                    background: i === 0 ? 'var(--gold-dim)' : 'transparent',
                  }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.78rem', color: i === 0 ? 'var(--gold)' : 'var(--t3)', minWidth: 16, textAlign: 'center' }}>{i + 1}</span>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0 }}>{p.points} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TEAMS ── */}
        {activeTab === 'teams' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {teams.map(team => (
              <div key={team.id} className="glass-card" style={{ overflow: 'hidden' }}>
                {/* Team row — tap to expand */}
                <div
                  onClick={() => loadTeamPlayers(team.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', cursor: 'pointer' }}
                >
                  {team.logo
                    ? <img src={team.logo} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '1px solid var(--glass-bd)' }} />
                    : <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--g-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 900, color: '#fff', flexShrink: 0 }}>{team.name?.charAt(0)}</div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{team.name}</div>
                    <div style={{ color: 'var(--t3)', fontSize: '0.7rem', marginTop: 1 }}>
                      {team.captain_name && <span>🎖 {team.captain_name} · </span>}
                      <span>{team.player_count} players</span>
                    </div>
                  </div>
                  <span style={{ color: 'var(--accent)', fontSize: '0.68rem', fontFamily: 'var(--font-display)', fontWeight: 700, flexShrink: 0, display: 'inline-block', transform: expandedTeam === team.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                </div>

                {/* Expanded squad */}
                {expandedTeam === team.id && teamPlayers[team.id] && (
                  <div style={{ borderTop: '1px solid var(--glass-bd)' }}>
                    {!missingBanners[`team_banner_${team.id}`] && (
                      <div style={{ overflow: 'hidden', borderBottom: '1px solid var(--glass-bd)' }}>
                        <img
                          src={`/media/banners/teams/team_banner_${team.id}.png`}
                          alt={`${team.name} squad banner`}
                          style={{ width: '100%', maxHeight: 130, objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                          onError={() => markMissing(`team_banner_${team.id}`)}
                          onClick={() => openBanner(`/media/banners/teams/team_banner_${team.id}.png`)}
                        />
                      </div>
                    )}
                    {!missingBanners[`captain_banner_${team.id}`] && (
                      <div style={{ overflow: 'hidden', borderBottom: '1px solid var(--glass-bd)' }}>
                        <img
                          src={`/media/banners/teams/captain_banner_${team.id}.png`}
                          alt={`${team.name} captain poster`}
                          style={{ width: '100%', maxHeight: 130, objectFit: 'cover', display: 'block', cursor: 'zoom-in' }}
                          onError={() => markMissing(`captain_banner_${team.id}`)}
                          onClick={() => openBanner(`/media/banners/teams/captain_banner_${team.id}.png`)}
                        />
                      </div>
                    )}
                    {team.squad_banner && (
                      <div style={{ overflow: 'hidden', borderBottom: '1px solid var(--glass-bd)' }}>
                        <img src={team.squad_banner} alt="" style={{ width: '100%', maxHeight: 130, objectFit: 'cover', display: 'block' }} />
                      </div>
                    )}
                    {teamPlayers[team.id].map((player, idx) => (
                      <div key={player.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px',
                        borderBottom: idx < teamPlayers[team.id].length - 1 ? '1px solid var(--glass-bd)' : 'none',
                        background: idx % 2 === 0 ? 'transparent' : 'var(--glass-bg)',
                      }}>
                        {player.photo
                          ? <img src={player.photo} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', objectPosition: 'top', flexShrink: 0 }} />
                          : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>{player.name?.charAt(0)}</div>}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{player.name}</div>
                          <div style={{ fontSize: '0.64rem', color: 'var(--t3)' }}>{player.role}</div>
                        </div>
                        {player.jersey_number && (
                          <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>{player.jersey_number}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {teams.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">👥</div>
                <h3>No Teams Yet</h3>
              </div>
            )}
          </div>
        )}

        {/* ── FIXTURES ── */}
        {activeTab === 'fixtures' && (
          <div>
            {upcomingMatches.length === 0
              ? <div className="empty-state"><div className="empty-state-icon">📅</div><h3>No Upcoming Fixtures</h3></div>
              : <div className="fixtures-vertical-list">
                  {upcomingMatches.map(m => (
                    <div key={m.id} className="fixture-card-wide">
                      {!missingBanners[`vs_${m.id}`] && (
                        <img
                          src={`/media/banners/matches/vs_banner_${m.id}.png`}
                          alt={`${m.team_a_name} vs ${m.team_b_name} banner`}
                          style={{ width: '100%', flexBasis: '100%', height: 110, objectFit: 'cover', borderBottom: '1px solid var(--glass-bd)', cursor: 'zoom-in' }}
                          onError={() => markMissing(`vs_${m.id}`)}
                          onClick={() => openBanner(`/media/banners/matches/vs_banner_${m.id}.png`)}
                        />
                      )}
                      <div className="fixture-side"><h3>{m.team_a_name}</h3></div>
                      <div className="fixture-center">
                        <span className="fixture-vs">VS</span>
                        <p>{m.date || m.match_date || 'Date TBA'} · {m.time || m.match_time || 'Time TBA'}</p>
                        <p style={{ color: 'var(--t3)', fontSize: '0.67rem', marginTop: 2 }}>{m.venue || 'Venue TBA'}</p>
                      </div>
                      <div className="fixture-side"><h3>{m.team_b_name}</h3></div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* ── RESULTS ── */}
        {activeTab === 'results' && (
          <div className="grid-3">
            {completedMatches.length === 0
              ? <div className="empty-state" style={{ gridColumn: '1/-1' }}><div className="empty-state-icon">📊</div><h3>No Completed Matches</h3></div>
              : completedMatches.map(m => (
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
                    <div className="result-card-head">Match #{m.match_number}</div>
                    <div className="result-scoreline">
                      <span>{m.team_a_name}</span>
                      <span className="vs">vs</span>
                      <span>{m.team_b_name}</span>
                    </div>
                    <div className="result-summary">{m.result_summary || 'Result pending'}</div>
                    {m.mom_name && <div className="result-mom">⭐ MOM: {m.mom_name}</div>}
                  </Link>
                ))
            }
          </div>
        )}

        {/* ── POINTS TABLE ── */}
        {activeTab === 'points' && (
          <div className="glass-card" style={{ overflow: 'auto' }}>
            {points.length === 0
              ? <div className="empty-state"><div className="empty-state-icon">📋</div><h3>No standings data yet</h3></div>
              : <table className="points-table">
                  <thead>
                    <tr><th>Team</th><th>M</th><th>W</th><th>L</th><th>T</th><th>Pts</th><th>NRR</th></tr>
                  </thead>
                  <tbody>
                    {points.map((p, i) => (
                      <tr key={p.team_id}>
                        <td>
                          <div className="team-cell">
                            <span className="team-pos">{i + 1}</span>
                            {p.logo
                              ? <img src={p.logo} alt="" className="team-logo-sm" />
                              : <div className="team-logo-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-dim)' }}>{p.name?.charAt(0)}</div>}
                            <span className="team-name-cell">{p.name}</span>
                          </div>
                        </td>
                        <td>{p.matches_played}</td>
                        <td>{p.wins}</td>
                        <td>{p.losses}</td>
                        <td>{p.ties}</td>
                        <td style={{ fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{p.points}</td>
                        <td style={{ color: p.nrr >= 0 ? 'var(--accent)' : 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                          {p.nrr > 0 ? '+' : ''}{p.nrr?.toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            }
          </div>
        )}

        {/* ── STATISTICS ── */}
        {activeTab === 'statistics' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: 16 }}>
            <div className="glass-card leaderboard">
              <div className="leaderboard-header"><h3>🏏 Top Run Scorers</h3></div>
              {battingStats.length === 0
                ? <div className="empty-state"><p>No batting data yet</p></div>
                : battingStats.slice(0, 10).map((p, i) => (
                    <div key={p.id} className="leaderboard-item">
                      <div className={`leaderboard-rank${i === 0 ? ' gold' : i === 1 ? ' silver' : i === 2 ? ' bronze' : ''}`}>{i + 1}</div>
                      {p.photo
                        ? <img src={p.photo} alt="" className="leaderboard-player-photo" />
                        : <div className="leaderboard-player-photo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.82rem', color: 'var(--accent)', background: 'var(--accent-dim)' }}>{p.name?.charAt(0)}</div>}
                      <div className="leaderboard-player-info">
                        <div className="leaderboard-player-name">{p.name}</div>
                        <div className="leaderboard-player-team">{p.team_name} · SR: {p.total_balls > 0 ? ((p.total_runs / p.total_balls) * 100).toFixed(1) : '0.0'}</div>
                      </div>
                      <div className="leaderboard-value">{p.total_runs}</div>
                    </div>
                  ))
              }
            </div>

            <div className="glass-card leaderboard">
              <div className="leaderboard-header"><h3>🎯 Top Wicket Takers</h3></div>
              {bowlingStats.length === 0
                ? <div className="empty-state"><p>No bowling data yet</p></div>
                : bowlingStats.slice(0, 10).map((p, i) => (
                    <div key={p.id} className="leaderboard-item">
                      <div className={`leaderboard-rank${i === 0 ? ' gold' : i === 1 ? ' silver' : i === 2 ? ' bronze' : ''}`}>{i + 1}</div>
                      {p.photo
                        ? <img src={p.photo} alt="" className="leaderboard-player-photo" />
                        : <div className="leaderboard-player-photo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.82rem', color: 'var(--gold)', background: 'var(--gold-dim)' }}>{p.name?.charAt(0)}</div>}
                      <div className="leaderboard-player-info">
                        <div className="leaderboard-player-name">{p.name}</div>
                        <div className="leaderboard-player-team">{p.team_name} · Econ: {p.total_balls > 0 ? (p.total_runs_conceded / (p.total_balls / 6)).toFixed(2) : '0.00'}</div>
                      </div>
                      <div className="leaderboard-value" style={{ color: 'var(--red)' }}>{p.total_wickets}</div>
                    </div>
                  ))
              }
            </div>
          </div>
        )}
      </div>
    </div>
  )
}