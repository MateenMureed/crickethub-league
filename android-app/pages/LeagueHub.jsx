import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'

const API = '/api'
const fmtOvers = b => !b ? '0.0' : `${Math.floor(b / 6)}.${b % 6}`

export default function LeagueHub() {
  const { leagueId } = useParams()
  const [league,       setLeague]       = useState(null)
  const [teams,        setTeams]        = useState([])
  const [matches,      setMatches]      = useState([])
  const [points,       setPoints]       = useState([])
  const [battingStats, setBattingStats] = useState([])
  const [bowlingStats, setBowlingStats] = useState([])
  const [activeTab,    setActiveTab]    = useState('overview')
  const [expandedTeam, setExpandedTeam] = useState(null)
  const [teamPlayers,  setTeamPlayers]  = useState({})
  const [selectedPlayerKey, setSelectedPlayerKey] = useState(null)
  const [playerStatsById, setPlayerStatsById] = useState({})
  const [playerStatsLoading, setPlayerStatsLoading] = useState({})
  const [missingBanners, setMissingBanners] = useState({})

  useEffect(() => { loadData() }, [leagueId])

  useEffect(() => {
    if (activeTab !== 'points') return
    fetchPoints()
    const iv = setInterval(fetchPoints, 5000)
    return () => clearInterval(iv)
  }, [activeTab, leagueId])

  const fetchPoints = () =>
    fetch(`${API}/leagues/${leagueId}/points`).then(r => r.json()).then(setPoints).catch(() => {})

  const loadData = () => {
    fetch(`${API}/leagues/${leagueId}`).then(r => r.json()).then(setLeague).catch(() => {})
    fetch(`${API}/leagues/${leagueId}/teams`).then(r => r.json()).then(d => setTeams(Array.isArray(d) ? d : [])).catch(() => {})
    fetch(`${API}/leagues/${leagueId}/matches`).then(r => r.json()).then(d => setMatches(Array.isArray(d) ? d : [])).catch(() => {})
    fetchPoints()
    fetch(`${API}/leagues/${leagueId}/stats/batting`).then(r => r.json()).then(d => setBattingStats(Array.isArray(d) ? d : [])).catch(() => {})
    fetch(`${API}/leagues/${leagueId}/stats/bowling`).then(r => r.json()).then(d => setBowlingStats(Array.isArray(d) ? d : [])).catch(() => {})
  }

  const toggleTeamPlayers = async (teamId) => {
    if (expandedTeam === teamId) {
      setExpandedTeam(null)
      setSelectedPlayerKey(null)
      return
    }
    if (!teamPlayers[teamId]) {
      const p = await fetch(`${API}/teams/${teamId}/players`).then(r => r.json()).catch(() => [])
      setTeamPlayers(prev => ({ ...prev, [teamId]: Array.isArray(p) ? p : [] }))
    }
    setExpandedTeam(teamId)
    setSelectedPlayerKey(null)
  }

  const openPlayerStats = async (teamId, player) => {
    const key = `${teamId}_${player.id}`
    if (selectedPlayerKey === key) {
      setSelectedPlayerKey(null)
      return
    }

    setSelectedPlayerKey(key)

    if (playerStatsById[player.id] || playerStatsLoading[player.id]) return

    setPlayerStatsLoading((prev) => ({ ...prev, [player.id]: true }))
    try {
      const data = await fetch(`${API}/players/${player.id}/stats?league_id=${leagueId}`).then((r) => r.json())
      if (data && !data.error) {
        setPlayerStatsById((prev) => ({ ...prev, [player.id]: data }))
      }
    } catch (_) {
      // Ignore stats errors and keep roster usable.
    } finally {
      setPlayerStatsLoading((prev) => ({ ...prev, [player.id]: false }))
    }
  }

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

  if (!league) return <div className="page"><div className="spinner" /></div>

  const TABS = [
    { id: 'overview',   label: 'Overview'  },
    { id: 'teams',      label: 'Teams'     },
    { id: 'fixtures',   label: 'Fixtures'  },
    { id: 'results',    label: 'Results'   },
    { id: 'points',     label: 'Standings' },
    { id: 'statistics', label: 'Stats'     },
  ]

  const live      = matches.filter(m => m.status === 'live')
  const upcoming  = matches.filter(m => m.status === 'upcoming')
  const completed = matches.filter(m => m.status === 'completed')

  return (
    <div style={{ paddingBottom: 80, maxWidth: 430, margin: '0 auto', width: '100%' }}>
      {/* League Header */}
      <div style={{ background: 'linear-gradient(160deg,var(--bg),var(--bg-2))', border: '1px solid var(--border)', borderRadius: 18, margin: '10px 10px 8px', padding: '14px 12px 12px' }}>
        {!missingBanners[`league_${league.id}`] && (
          <img
            src={`/media/banners/leagues/league_banner_${league.id}.png`}
            alt={`${league.name} league banner`}
            style={{ width: '100%', maxHeight: 140, objectFit: 'cover', borderRadius: 12, marginBottom: 10, border: '1px solid var(--border)' }}
            onError={() => markMissing(`league_${league.id}`)}
          />
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div className="league-logo" style={{ width: 60, height: 60, borderRadius: 16, flexShrink: 0, fontSize: '1.5rem' }}>
            {(league.logo_url || league.logo) ? <img src={league.logo_url || league.logo} alt={league.name} /> : league.name?.[0]}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 900, margin: '0 0 4px' }}>{league.name}</h2>
            <p style={{ fontSize: '.74rem', color: 'var(--t2)', margin: 0 }}>
              {[league.city, league.venue, league.format && `${league.format} - ${league.overs_per_innings || 20} ov`].filter(Boolean).join(' - ')}
            </p>
          </div>
          <span className={`badge badge-${league.status === 'active' ? 'live' : league.status === 'completed' ? 'completed' : 'upcoming'}`}>{league.status}</span>
        </div>
        <div className="stats-row" style={{ margin: 0, gap: 6 }}>
          {[{n:teams.length,l:'Teams'},{n:matches.length,l:'Matches'},{n:completed.length,l:'Done'},{n:live.length,l:'Live'}].map(s=>(
            <div key={s.l} className="stat-box"><div className="stat-num">{s.n}</div><div className="stat-lbl">{s.l}</div></div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="league-tabs-wrap" style={{ top: 62 }}>
        <div className="league-tabs">
          {TABS.map(t => (
            <button key={t.id} className={`league-tab${activeTab === t.id ? ' active' : ''}`} onClick={() => setActiveTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="page" style={{ paddingTop: 16 }}>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div>
            {live.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div className="sect-head"><h3>Live Now</h3></div>
                {live.map(m => (
                  <Link to={`/match/${m.id}`} key={m.id} className="card match-card card-hover" style={{ textDecoration: 'none', color: 'inherit', marginBottom: 8 }}>
                    <div className="match-card-header">
                      <span className="badge badge-live">Live</span>
                      <span style={{ fontSize: '.68rem', color: 'var(--t3)' }}>Match #{m.match_number}</span>
                    </div>
                    <div className="match-body">
                      <div className="match-teams">
                        <div className="match-team"><div className="team-logo">{m.team_a_name?.[0]}</div><div className="team-name">{m.team_a_name}</div></div>
                        <div className="match-vs live">VS</div>
                        <div className="match-team"><div className="team-logo">{m.team_b_name?.[0]}</div><div className="team-name">{m.team_b_name}</div></div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            {points.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div className="sect-head"><h3>Top Teams</h3><button onClick={() => setActiveTab('points')} style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '.75rem', fontWeight: 700 }}>Full table</button></div>
                <div className="card">
                  {points.slice(0, 4).map((p, i) => (
                    <div key={p.team_id} className="player-row">
                      <div className={`player-rank ${i===0?'gold':i===1?'silver':i===2?'bronze':''}`}>{i + 1}</div>
                      <div className="player-avatar">{p.name?.[0]}</div>
                      <div className="player-meta"><h5>{p.name}</h5><p>W:{p.wins} L:{p.losses} T:{p.ties}</p></div>
                      <div className="player-val">{p.points}pts</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {upcoming.slice(0, 3).map(m => (
              <div key={m.id} className="card" style={{ marginBottom: 8 }}>
                <div className="fixture-card">
                  <div className="fixture-teams">
                    <div className="fixture-team">{m.team_a_name}</div>
                    <div className="fixture-vs">VS</div>
                    <div className="fixture-team">{m.team_b_name}</div>
                  </div>
                  <div className="fixture-meta">{m.venue || 'Venue TBD'} - {(m.date || m.match_date || 'Date TBD')} - {(m.time || m.match_time || 'Time TBD')}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TEAMS */}
        {activeTab === 'teams' && (
          <div>
            {teams.length === 0
              ? <div className="empty"><span className="ico">T</span><h4>No teams yet</h4></div>
              : teams.map(t => (
                <div key={t.id} className="card" style={{ marginBottom: 10, overflow: 'hidden' }}>
                  <div className="league-card" style={{ cursor: 'pointer' }} onClick={() => toggleTeamPlayers(t.id)}>
                    <div className="league-logo">{(t.logo_url || t.logo) ? <img src={t.logo_url || t.logo} alt={t.name} /> : t.name?.[0]}</div>
                    <div className="league-info">
                      <h4>{t.name}</h4>
                      <p>{t.captain_name ? `Captain: ${t.captain_name}` : ''} - {t.player_count || 11} players</p>
                    </div>
                    <span style={{ color: 'var(--accent)', fontSize: '.8rem', transition: '.2s', transform: expandedTeam === t.id ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>v</span>
                  </div>
                  {expandedTeam === t.id && teamPlayers[t.id] && (
                    <div style={{ borderTop: '1px solid var(--border)' }}>
                      {!missingBanners[`team_banner_${t.id}`] && (
                        <img
                          src={`/media/banners/teams/team_banner_${t.id}.png`}
                          alt={`${t.name} squad banner`}
                          style={{ width: '100%', maxHeight: 130, objectFit: 'cover', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                          onError={() => markMissing(`team_banner_${t.id}`)}
                          onClick={() => onBannerTap(`/media/banners/teams/team_banner_${t.id}.png`, `team_banner_${t.id}.png`)}
                        />
                      )}
                      {!missingBanners[`captain_banner_${t.id}`] && (
                        <img
                          src={`/media/banners/teams/captain_banner_${t.id}.png`}
                          alt={`${t.name} captain poster`}
                          style={{ width: '100%', maxHeight: 130, objectFit: 'cover', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                          onError={() => markMissing(`captain_banner_${t.id}`)}
                          onClick={() => onBannerTap(`/media/banners/teams/captain_banner_${t.id}.png`, `captain_banner_${t.id}.png`)}
                        />
                      )}
                      {teamPlayers[t.id].map((pl, idx) => {
                        const playerKey = `${t.id}_${pl.id}`
                        const isSelected = selectedPlayerKey === playerKey
                        const stats = playerStatsById[pl.id]
                        const isLoading = !!playerStatsLoading[pl.id]

                        return (
                          <div key={pl.id}>
                            <div
                              className="player-row"
                              style={{ paddingLeft: 14, cursor: 'pointer' }}
                              onClick={() => openPlayerStats(t.id, pl)}
                            >
                              <div className="player-rank">{idx + 1}</div>
                              {pl.photo
                                ? <img src={pl.photo} alt={pl.name} className="player-avatar" style={{ objectFit: 'cover', objectPosition: 'top' }} />
                                : <div className="player-avatar">{pl.name?.[0]}</div>}
                              <div className="player-meta"><h5>{pl.name}</h5><p>{pl.role}</p></div>
                              {pl.is_captain && <span style={{ fontSize: '.7rem', color: 'var(--gold)', fontWeight: 700 }}>C</span>}
                            </div>

                            {isSelected && (
                              <div style={{ margin: '0 10px 10px', borderRadius: 12, border: '1px solid var(--border)', background: 'linear-gradient(155deg, var(--bg), var(--bg-2))', overflow: 'hidden' }}>
                                {isLoading && (
                                  <div style={{ padding: '14px 12px', fontSize: '.78rem', color: 'var(--t2)' }}>Loading player performance...</div>
                                )}

                                {!isLoading && stats && (
                                  <>
                                    <div style={{ display: 'flex', gap: 12, padding: 12, alignItems: 'stretch', borderBottom: '1px solid var(--border)' }}>
                                      <div style={{ width: 112, minWidth: 112, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg)' }}>
                                        {stats.player?.photo
                                          ? <img src={stats.player.photo} alt={stats.player.name} style={{ width: '100%', height: '100%', minHeight: 132, objectFit: 'cover', objectPosition: 'top' }} />
                                          : <div style={{ width: '100%', height: 132, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.1rem', fontWeight: 900, color: 'var(--accent)' }}>{stats.player?.name?.[0] || '?'}</div>}
                                      </div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <h4 style={{ margin: '0 0 4px', fontSize: '.95rem' }}>{stats.player?.name}</h4>
                                        <p style={{ margin: '0 0 6px', color: 'var(--t2)', fontSize: '.72rem' }}>{stats.player?.role || 'Player'} {stats.player?.jersey_number ? `- #${stats.player.jersey_number}` : ''}</p>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6, fontSize: '.68rem' }}>
                                          <div style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 8 }}>Matches: <strong>{stats.totals?.matches || 0}</strong></div>
                                          <div style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 8 }}>Runs: <strong>{stats.totals?.batting?.runs || 0}</strong></div>
                                          <div style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 8 }}>Wkts: <strong>{stats.totals?.bowling?.wickets || 0}</strong></div>
                                          <div style={{ padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 8 }}>SR: <strong>{stats.totals?.batting?.strike_rate || 0}</strong></div>
                                        </div>
                                      </div>
                                    </div>

                                    <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                                      <h5 style={{ margin: '0 0 8px', fontSize: '.74rem', textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--t2)' }}>Total Performance</h5>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6, fontSize: '.68rem' }}>
                                        <div style={{ padding: '7px 8px', borderRadius: 8, border: '1px solid var(--border)' }}>Bat Avg: <strong>{stats.totals?.batting?.average || 0}</strong></div>
                                        <div style={{ padding: '7px 8px', borderRadius: 8, border: '1px solid var(--border)' }}>High: <strong>{stats.totals?.batting?.highest || 0}</strong></div>
                                        <div style={{ padding: '7px 8px', borderRadius: 8, border: '1px solid var(--border)' }}>Econ: <strong>{stats.totals?.bowling?.economy || 0}</strong></div>
                                        <div style={{ padding: '7px 8px', borderRadius: 8, border: '1px solid var(--border)' }}>Best: <strong>{stats.totals?.bowling?.best || '0/0'}</strong></div>
                                        <div style={{ padding: '7px 8px', borderRadius: 8, border: '1px solid var(--border)' }}>50s/100s: <strong>{stats.totals?.batting?.fifties || 0}/{stats.totals?.batting?.hundreds || 0}</strong></div>
                                        <div style={{ padding: '7px 8px', borderRadius: 8, border: '1px solid var(--border)' }}>Overs Bowled: <strong>{fmtOvers(stats.totals?.bowling?.balls || 0)}</strong></div>
                                      </div>
                                    </div>

                                    <div style={{ padding: '10px 12px' }}>
                                      <h5 style={{ margin: '0 0 8px', fontSize: '.74rem', textTransform: 'uppercase', letterSpacing: '.4px', color: 'var(--t2)' }}>Match by Match</h5>
                                      {(stats.match_stats || []).length === 0 && (
                                        <p style={{ margin: 0, fontSize: '.72rem', color: 'var(--t2)' }}>No performance entries yet.</p>
                                      )}
                                      {(stats.match_stats || []).slice(0, 8).map((ms) => (
                                        <div key={ms.match_id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '8px 9px', marginBottom: 8 }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                                            <strong style={{ fontSize: '.72rem' }}>Match #{ms.match_number} vs {ms.opponent_name || 'TBD'}</strong>
                                            <span style={{ fontSize: '.65rem', color: 'var(--t2)' }}>{ms.date || 'Date TBD'} {ms.time ? `- ${ms.time}` : ''}</span>
                                          </div>
                                          <div style={{ fontSize: '.68rem', color: 'var(--t2)' }}>
                                            Batting: {ms.batting?.runs || 0} ({ms.batting?.balls || 0}) - 4s {ms.batting?.fours || 0}, 6s {ms.batting?.sixes || 0}
                                          </div>
                                          <div style={{ fontSize: '.68rem', color: 'var(--t2)' }}>
                                            Bowling: {ms.bowling?.wickets || 0}/{ms.bowling?.runs || 0} in {fmtOvers(ms.bowling?.balls || 0)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {/* FIXTURES */}
        {activeTab === 'fixtures' && (
          <div>
            {upcoming.length === 0
              ? <div className="empty"><span className="ico">F</span><h4>No upcoming fixtures</h4></div>
              : upcoming.map(m => (
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
                    <div className="fixture-meta">{m.venue || 'Venue TBD'} - {(m.date || m.match_date || 'Date TBD')} - {(m.time || m.match_time || 'Time TBD')}</div>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* RESULTS */}
        {activeTab === 'results' && (
          <div>
            {completed.length === 0
              ? <div className="empty"><span className="ico">R</span><h4>No results yet</h4></div>
              : completed.map(m => (
                <Link to={`/match/${m.id}`} key={m.id} className="card card-hover" style={{ textDecoration: 'none', color: 'inherit', marginBottom: 8, display: 'block' }}>
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
                    <span style={{ fontSize: '.68rem', color: 'var(--t3)' }}>Match #{m.match_number}</span>
                    <span className="badge badge-completed">Done</span>
                  </div>
                  <div className="fixture-card" style={{ paddingTop: 10 }}>
                    <div className="fixture-teams">
                      <div className="fixture-team">{m.team_a_name}</div>
                      <div className="fixture-vs" style={{ color: 'var(--accent)' }}>vs</div>
                      <div className="fixture-team">{m.team_b_name}</div>
                    </div>
                    <div className="result-summary">{m.result_summary || 'Result recorded'}</div>
                    {m.mom_name && <div style={{ fontSize: '.68rem', color: 'var(--gold)', marginTop: 4 }}>MOM: {m.mom_name}</div>}
                  </div>
                </Link>
              ))}
          </div>
        )}

        {/* POINTS TABLE */}
        {activeTab === 'points' && (
          <div className="card" style={{ overflow: 'auto' }}>
            {points.length === 0
              ? <div className="empty"><span className="ico">S</span><h4>No standings yet</h4></div>
              : (
                <table className="points-table">
                  <thead>
                    <tr><th>#</th><th>Team</th><th>M</th><th>W</th><th>L</th><th>Pts</th><th>NRR</th></tr>
                  </thead>
                  <tbody>
                    {points.map((p, i) => (
                      <tr key={p.team_id} style={{ background: i === 0 ? 'var(--gold-dim)' : '' }}>
                        <td><span className="pts-val">{i + 1}</span></td>
                        <td style={{ fontWeight: 700 }}>{p.name}</td>
                        <td>{p.matches_played}</td>
                        <td>{p.wins}</td>
                        <td>{p.losses}</td>
                        <td><span className="pts-val">{p.points}</span></td>
                        <td style={{ color: p.nrr >= 0 ? 'var(--accent)' : 'var(--red)', fontFamily: 'var(--mono)', fontSize: '.72rem' }}>
                          {p.nrr > 0 ? '+' : ''}{(p.nrr || 0).toFixed(3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
          </div>
        )}

        {/* STATISTICS */}
        {activeTab === 'statistics' && (
          <div>
            <div className="sect-head"><h3>Top Batters</h3></div>
            {battingStats.length === 0
              ? <div className="empty"><span className="ico">B</span><h4>No batting data yet</h4></div>
              : (
                <div className="card" style={{ marginBottom: 20 }}>
                  {battingStats.slice(0, 8).map((p, i) => (
                    <div key={p.id || i} className="player-row">
                      <div className={`player-rank ${i===0?'gold':i===1?'silver':i===2?'bronze':''}`}>{i + 1}</div>
                      <div className="player-avatar">{p.name?.[0]}</div>
                      <div className="player-meta"><h5>{p.name}</h5><p>{p.team_name}</p></div>
                      <div className="player-val">{p.total_runs}</div>
                    </div>
                  ))}
                </div>
              )}

            <div className="sect-head"><h3>Top Bowlers</h3></div>
            {bowlingStats.length === 0
              ? <div className="empty"><span className="ico">W</span><h4>No bowling data yet</h4></div>
              : (
                <div className="card">
                  {bowlingStats.slice(0, 8).map((p, i) => (
                    <div key={p.id || i} className="player-row">
                      <div className={`player-rank ${i===0?'gold':i===1?'silver':i===2?'bronze':''}`}>{i + 1}</div>
                      <div className="player-avatar">{p.name?.[0]}</div>
                      <div className="player-meta"><h5>{p.name}</h5><p>{p.team_name}</p></div>
                      <div className="player-val" style={{ color: 'var(--red)' }}>{p.total_wickets}W</div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  )
}
