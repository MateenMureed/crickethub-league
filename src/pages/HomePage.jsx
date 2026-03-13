import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import BannerLightbox from '../components/BannerLightbox'
import {
  generateLeagueBannerForLeague,
  generateVsBannerForMatch,
  generateResultBannerForMatch,
  generateSummaryBannerForMatch,
} from '../components/GraphicsGeneratorPanel'

const API = '/api'

export default function HomePage() {
  const [stats, setStats]               = useState({ leagues:0, teams:0, matches:0, players:0 })
  const [leagues, setLeagues]           = useState([])
  const [liveMatches, setLiveMatches]   = useState([])
  const [upcoming, setUpcoming]         = useState([])
  const [results, setResults]           = useState([])
  const [batting, setBatting]           = useState([])
  const [bowling, setBowling]           = useState([])
  const [missingBanners, setMissingBanners] = useState({})
  const [lightboxSrc, setLightboxSrc] = useState('')

  useEffect(() => {
    fetch(`${API}/stats/dashboard`).then(r=>r.json()).then(setStats).catch(()=>{})
    fetch(`${API}/leagues`).then(r=>r.json()).then(setLeagues).catch(()=>{})
    fetch(`${API}/matches/live/all`).then(r=>r.json()).then(setLiveMatches).catch(()=>{})
    fetch(`${API}/matches/upcoming/all`).then(r=>r.json()).then(setUpcoming).catch(()=>{})
    fetch(`${API}/matches/completed/all`).then(r=>r.json()).then(setResults).catch(()=>{})
    fetch(`${API}/stats/global/batting`).then(r=>r.json()).then(setBatting).catch(()=>{})
    fetch(`${API}/stats/global/bowling`).then(r=>r.json()).then(setBowling).catch(()=>{})
  }, [])

  // live auto-refresh every second
  useEffect(() => {
    const id = setInterval(() => {
      fetch(`${API}/matches/live/all`).then(r=>r.json()).then(setLiveMatches).catch(()=>{})
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const featuredLeague = useMemo(() => leagues.find(l=>l.status==='active') || leagues[0] || null, [leagues])
  const featuredMatch  = useMemo(() => {
    if (!featuredLeague) return upcoming[0] || null
    return upcoming.find(m=>m.league_id===featuredLeague.id) || upcoming[0] || null
  }, [featuredLeague, upcoming])

  const topPlayers = useMemo(() => {
    const bat  = batting.slice(0,3).map(p=>({ ...p, metric:`${p.total_runs||0} Runs` }))
    const bowl = bowling.slice(0,3).map(p=>({ ...p, metric:`${p.total_wickets||0} Wickets` }))
    return [...bat,...bowl].slice(0,6)
  }, [batting, bowling])
  const leagueNameStrip = useMemo(() => leagues.slice(0, 8).map(l => l.name).join('  •  '), [leagues])
  const heroLeagues = useMemo(() => leagues.slice(0, 6), [leagues])

  const fmtOvers = b => !b ? '0.0' : `${Math.floor(b/6)}.${b%6}`
  const markMissing = (key) => setMissingBanners((prev) => ({ ...prev, [key]: true }))
  const openBanner = (src) => {
    if (!src) return
    setLightboxSrc(src)
  }

  useEffect(() => {
    if (!leagues.length && !upcoming.length && !results.length) return

    const key = 'web_home_banner_autogen_v1'
    const now = Date.now()
    const last = Number(localStorage.getItem(key) || 0)
    if (now - last < 5 * 60 * 1000) return
    localStorage.setItem(key, String(now))

    const leagueById = new Map(leagues.map((l) => [String(l.id), l]))

    const run = async () => {
      try {
        for (const l of leagues.slice(0, 3)) {
          await generateLeagueBannerForLeague(l.id, { download: false })
        }
        for (const m of upcoming.slice(0, 4)) {
          await generateVsBannerForMatch(m, leagueById.get(String(m.league_id)) || null, { download: false })
        }
        for (const m of results.slice(0, 3)) {
          const [matchRes, scoreRes] = await Promise.all([
            fetch(`${API}/matches/${m.id}`),
            fetch(`${API}/matches/${m.id}/scorecard`),
          ])
          const fullMatch = matchRes.ok ? await matchRes.json() : m
          const scorecard = scoreRes.ok ? await scoreRes.json() : []
          const leagueObj = leagueById.get(String(fullMatch.league_id)) || null
          await generateSummaryBannerForMatch(fullMatch, scorecard, leagueObj, { download: false })
          await generateResultBannerForMatch(fullMatch, scorecard, { download: false })
        }
      } catch (error) {
        console.warn('Home banner auto-generation skipped:', error?.message || error)
      }
    }

    run()
  }, [leagues, upcoming, results])

  return (
    <div>
      <BannerLightbox src={lightboxSrc} alt="Banner preview" onClose={() => setLightboxSrc('')} />
      {/* ── Hero ── */}
      <section className="section hero-main-banner">
        <div className="container">
          <div className="hero-banner-1920">
            <div className="hero-particles" />
            <div className="hero-logo-block">
              {featuredLeague?.logo
                ? <img src={featuredLeague.logo} alt={featuredLeague.name} className="hero-league-logo" />
                : <div className="hero-league-logo hero-logo-fallback">{featuredLeague?.name?.charAt(0)||'C'}</div>}
            </div>
            <div className="hero-text-block">
              <h1>CricketHub League Center</h1>
              <p>{stats.leagues || 0} leagues running · {stats.matches || 0} matches tracked</p>
              {leagueNameStrip && <p style={{ marginTop: 6, color: 'var(--t2)', fontSize: '.78rem' }}>Leagues: {leagueNameStrip}</p>}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:10 }}>
                {heroLeagues.map((league) => (
                  <Link key={`hero-league-${league.id}`} to={`/league/${league.id}`} className="badge badge-upcoming" style={{ textDecoration:'none' }}>
                    {league.name}
                  </Link>
                ))}
              </div>
              <div className="hero-stats-mini">
                <span>{stats.leagues} leagues</span>
                <span>{stats.teams} teams</span>
                <span>{stats.matches} matches</span>
                <span>{stats.players} players</span>
              </div>
            </div>
            <div className="hero-bottom-match">
              {featuredMatch ? (
                <>
                  <strong>Upcoming: {featuredMatch.team_a_name} vs {featuredMatch.team_b_name}</strong>
                  <span>{featuredMatch.date || featuredMatch.match_date || 'Date TBA'} · {featuredMatch.time || featuredMatch.match_time || 'Time TBA'} · {featuredMatch.venue || 'Main Stadium'}</span>
                </>
              ) : (
                <span style={{color:'rgba(255,255,255,.5)',fontSize:'.78rem'}}>Create fixtures to show the big match preview.</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── League Banners Strip ── */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="section-title">
            <h2>League Banners</h2>
            <div className="accent-line" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
            {leagues.slice(0, 8).map((league) => (
              <div key={`banner-${league.id}`} className="glass-card" style={{ padding: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                {league.logo
                  ? <img src={league.logo} alt={league.name} style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--glass-bd)' }} />
                  : <div style={{ width: 56, height: 56, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--g-accent)', color: '#fff', fontWeight: 700 }}>{league.name?.charAt(0)}</div>}
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '.92rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{league.name}</div>
                  <div style={{ fontSize: '.72rem', color: 'var(--t3)' }}>{league.city || 'City'} · {league.season || 'Season'}</div>
                </div>
              </div>
            ))}
            {leagues.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                <div className="empty-state-icon">🏆</div>
                <h3>No league banners available yet</h3>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Live Matches ── */}
      <section id="live-matches" className="section">
        <div className="container">
          <div className="section-title">
            <h2>Live Matches</h2>
            <div className="accent-line" />
          </div>
          <div className="grid-3">
            {liveMatches.length === 0 && (
              <div className="empty-state" style={{gridColumn:'1/-1'}}>
                <div className="empty-state-icon">📡</div>
                <h3>No live matches right now</h3>
              </div>
            )}
            {liveMatches.map(m => (
              <Link to={`/match/${m.id}/live`} key={m.id} className="glass-card match-card" style={{textDecoration:'none',color:'inherit'}}>
                {!missingBanners[`live_vs_${m.id}`] && (
                  <img
                    src={`/media/banners/matches/vs_banner_${m.id}.png`}
                    alt={`${m.team_a_name} vs ${m.team_b_name} banner`}
                    style={{ width:'100%', height:120, objectFit:'cover', borderBottom:'1px solid var(--glass-bd)', cursor: 'zoom-in' }}
                    onError={() => markMissing(`live_vs_${m.id}`)}
                    onClick={(e) => {
                      e.preventDefault()
                      openBanner(`/media/banners/matches/vs_banner_${m.id}.png`)
                    }}
                  />
                )}
                <div className="match-card-header">
                  <span className="badge badge-live">● Live</span>
                  <span style={{fontSize:'.72rem',color:'var(--t3)'}}>Match #{m.match_number}</span>
                </div>
                <div className="match-card-body">
                  <div className="match-teams">
                    <div className="match-team">
                      <div className="match-team-logo">{m.team_a_name?.charAt(0)}</div>
                      <div className="match-team-name">{m.team_a_name}</div>
                    </div>
                    <div className="match-vs live">VS</div>
                    <div className="match-team">
                      <div className="match-team-logo">{m.team_b_name?.charAt(0)}</div>
                      <div className="match-team-name">{m.team_b_name}</div>
                    </div>
                  </div>
                  {m.innings?.length > 0 && (
                    <div className="live-mini-score">
                      {m.innings.map(inn => (
                        <div key={inn.id}>
                          {inn.batting_team_id===m.team_a_id ? m.team_a_name : m.team_b_name}: {inn.total_runs}/{inn.total_wickets} ({fmtOvers(inn.total_balls)})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Active Leagues ── */}
      <section id="active-leagues" className="section">
        <div className="container">
          <div className="section-title">
            <h2>Active Leagues</h2>
            <div className="accent-line" />
          </div>
          <div className="active-league-grid">
            {leagues.slice(0,8).map(league => (
              <div key={league.id} className="glass-card active-league-card">
                {!missingBanners[`league_${league.id}`] && (
                  <img
                    src={`/media/banners/leagues/league_banner_${league.id}.png`}
                    alt={`${league.name} league banner`}
                    style={{ width:'100%', height:120, objectFit:'cover', borderBottom:'1px solid var(--glass-bd)', cursor: 'zoom-in' }}
                    onError={() => markMissing(`league_${league.id}`)}
                    onClick={() => openBanner(`/media/banners/leagues/league_banner_${league.id}.png`)}
                  />
                )}
                <div className="active-card-top">
                  {league.logo
                    ? <img src={league.logo} alt={league.name} className="active-league-logo" />
                    : <div className="active-league-logo fallback">{league.name?.charAt(0)}</div>}
                </div>
                <div className="active-card-center">
                  <h3>{league.name}</h3>
                  <p>{league.city||'City TBD'}</p>
                  <span>{league.team_count||0} Teams</span>
                </div>
                <div className="active-card-bottom">
                  <Link to={`/league/${league.id}`} className="btn btn-primary btn-sm">View League</Link>
                </div>
              </div>
            ))}
            {leagues.length === 0 && (
              <div className="empty-state" style={{gridColumn:'1/-1'}}>
                <div className="empty-state-icon">🏆</div>
                <h3>No leagues yet</h3>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Upcoming Fixtures ── */}
      <section id="upcoming-fixtures" className="section">
        <div className="container">
          <div className="section-title">
            <h2>Upcoming Fixtures</h2>
            <div className="accent-line" />
          </div>
          <div className="fixtures-vertical-list">
            {upcoming.length === 0 && (
              <div className="empty-state">
                <div className="empty-state-icon">📅</div>
                <h3>No upcoming fixtures</h3>
              </div>
            )}
            {upcoming.slice(0,10).map(m => (
              <div className="fixture-card-wide" key={m.id}>
                {!missingBanners[`upcoming_vs_${m.id}`] && (
                  <img
                    src={`/media/banners/matches/vs_banner_${m.id}.png`}
                    alt={`${m.team_a_name} vs ${m.team_b_name} banner`}
                    style={{ width:'100%', flexBasis:'100%', height:110, objectFit:'cover', borderBottom:'1px solid var(--glass-bd)', cursor: 'zoom-in' }}
                    onError={() => markMissing(`upcoming_vs_${m.id}`)}
                    onClick={() => openBanner(`/media/banners/matches/vs_banner_${m.id}.png`)}
                  />
                )}
                <div className="fixture-side"><h3>{m.team_a_name}</h3></div>
                <div className="fixture-center">
                  <span className="fixture-vs">VS</span>
                  <p>{m.date || m.match_date || 'Date TBA'} · {m.time || m.match_time || 'Time TBA'}</p>
                </div>
                <div className="fixture-side"><h3>{m.team_b_name}</h3></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Latest Results ── */}
      <section id="latest-results" className="section">
        <div className="container">
          <div className="section-title">
            <h2>Latest Results</h2>
            <div className="accent-line" />
          </div>
          <div className="grid-3">
            {results.length === 0 && (
              <div className="empty-state" style={{gridColumn:'1/-1'}}>
                <div className="empty-state-icon">🏅</div>
                <h3>No results published yet</h3>
              </div>
            )}
            {results.slice(0,6).map(m => (
              <Link to={`/match/${m.id}/scorecard`} key={m.id} className="glass-card result-card-broadcast" style={{textDecoration:'none',color:'inherit',display:'block'}}>
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
                      style={{ width:'100%', height:140, objectFit:'cover', borderBottom:'1px solid var(--glass-bd)', cursor: 'zoom-in' }}
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
                <div className="result-summary">{m.result_summary||'Result pending'}</div>
                {m.mom_name && <div className="result-mom">⭐ MOM: {m.mom_name}</div>}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Global Leaderboards ── */}
      <section id="global-leaderboards" className="section">
        <div className="container">
          <div className="section-title">
            <h2>Global Leaderboards</h2>
            <div className="accent-line" />
          </div>
          <div className="stats-player-grid">
            {topPlayers.length === 0 && (
              <div className="empty-state" style={{gridColumn:'1/-1'}}>
                <div className="empty-state-icon">📊</div>
                <h3>No stats available yet</h3>
              </div>
            )}
            {topPlayers.map(p => (
              <div className="glass-card stat-player-card" key={`${p.id}-${p.metric}`}>
                {p.photo
                  ? <img src={p.photo} alt={p.name} className="stat-player-photo" />
                  : <div className="stat-player-photo fallback">{p.name?.charAt(0)}</div>}
                <h3 style={{fontSize:'.875rem',marginBottom:2}}>{p.name}</h3>
                <div className="team-logo-text">{p.team_name}</div>
                <div className="stat-value-emphasis">{p.metric}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}