import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  generateLeagueBannerForLeague,
  generateVsBannerForMatch,
  generateResultBannerForMatch,
  generateSummaryBannerForMatch,
} from '../components/GraphicsGeneratorPanel'

const API = '/api'

const fmtOvers = b => !b ? '0.0' : `${Math.floor(b / 6)}.${b % 6}`

export default function HomePage() {
  const [stats, setStats]             = useState({ leagues: 0, teams: 0, matches: 0, players: 0 })
  const [leagues, setLeagues]         = useState([])
  const [liveMatches, setLiveMatches] = useState([])
  const [upcoming, setUpcoming]       = useState([])
  const [results, setResults]         = useState([])
  const [batting, setBatting]         = useState([])
  const [bowling, setBowling]         = useState([])
  const [missingBanners, setMissingBanners] = useState({})

  useEffect(() => {
    fetch(`${API}/stats/dashboard`).then(r => r.json()).then(setStats).catch(() => {})
    fetch(`${API}/leagues`).then(r => r.json()).then(setLeagues).catch(() => {})
    fetch(`${API}/matches/live/all`).then(r => r.json()).then(setLiveMatches).catch(() => {})
    fetch(`${API}/matches/upcoming/all`).then(r => r.json()).then(setUpcoming).catch(() => {})
    fetch(`${API}/matches/completed/all`).then(r => r.json()).then(setResults).catch(() => {})
    fetch(`${API}/stats/global/batting`).then(r => r.json()).then(setBatting).catch(() => {})
    fetch(`${API}/stats/global/bowling`).then(r => r.json()).then(setBowling).catch(() => {})
  }, [])

  // live auto-refresh every 5s
  useEffect(() => {
    const id = setInterval(() => {
      fetch(`${API}/matches/live/all`).then(r => r.json()).then(setLiveMatches).catch(() => {})
    }, 5000)
    return () => clearInterval(id)
  }, [])

  const topBat = useMemo(() => batting.slice(0, 5), [batting])
  const topBowl = useMemo(() => bowling.slice(0, 5), [bowling])
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

  useEffect(() => {
    if (!leagues.length && !upcoming.length && !results.length) return

    const key = 'mobile_home_banner_autogen_v1'
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
    <div className="page" style={{ paddingBottom: 80 }}>

      {/* Hero */}
      <div className="hero-banner">
        <div className="hero-glow" />
        <div className="hero-body">
          <h2>CricketHub</h2>
          <p>Live scores · Fixtures · Stats</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/live" className="btn btn-accent btn-sm">Live</Link>
            <Link to="/leagues" className="btn btn-ghost btn-sm">Leagues</Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-row">
        {[
          { num: stats.leagues,  lbl: 'Leagues' },
          { num: stats.teams,    lbl: 'Teams'   },
          { num: stats.matches,  lbl: 'Matches' },
          { num: stats.players,  lbl: 'Players' },
        ].map(s => (
          <div key={s.lbl} className="stat-box">
            <div className="stat-num">{s.num || 0}</div>
            <div className="stat-lbl">{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* Live Matches */}
      {liveMatches.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="sect-head">
            <h3>Live Now</h3>
            <Link to="/live">See all</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {liveMatches.slice(0, 3).map(m => (
              <Link to={`/match/${m.id}`} key={m.id} className="card match-card card-hover" style={{ textDecoration: 'none', color: 'inherit' }}>
                {!missingBanners[`live_vs_${m.id}`] && (
                  <img
                    src={`/media/banners/matches/vs_banner_${m.id}.png`}
                    alt={`${m.team_a_name} vs ${m.team_b_name} banner`}
                    style={{ width: '100%', height: 108, objectFit: 'cover', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onError={() => markMissing(`live_vs_${m.id}`)}
                    onClick={(e) => {
                      e.preventDefault()
                      onBannerTap(`/media/banners/matches/vs_banner_${m.id}.png`, `vs_banner_${m.id}.png`)
                    }}
                  />
                )}
                <div className="match-card-header">
                  <span className="badge badge-live">Live</span>
                  <span style={{ fontSize: '.7rem', color: 'var(--t3)' }}>{m.league_name}</span>
                </div>
                <div className="match-body">
                  <div className="match-teams">
                    <div className="match-team">
                      <div className="team-logo">{m.team_a_name?.[0]}</div>
                      <div className="team-name">{m.team_a_name}</div>
                    </div>
                    <div className="match-vs live">VS</div>
                    <div className="match-team">
                      <div className="team-logo">{m.team_b_name?.[0]}</div>
                      <div className="team-name">{m.team_b_name}</div>
                    </div>
                  </div>
                  {m.innings?.length > 0 && (
                    <div className="live-mini-score" style={{ textAlign: 'center', marginTop: 8 }}>
                      {m.innings.map(inn => (
                        <span key={inn.id} style={{ marginRight: 12 }}>
                          {inn.batting_team_id === m.team_a_id ? m.team_a_name : m.team_b_name}: {inn.total_runs}/{inn.total_wickets} ({fmtOvers(inn.total_balls)})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Active Leagues */}
      <div style={{ marginBottom: 24 }}>
        <div className="sect-head">
          <h3>Leagues</h3>
          <Link to="/leagues">All leagues</Link>
        </div>
        {leagues.length === 0
          ? <div className="empty"><span className="ico">L</span><h4>No leagues yet</h4></div>
          : (
            <div className="active-league-grid">
              {leagues.slice(0, 6).map(l => (
                <Link to={`/leagues/${l.id}`} key={l.id} className="card active-league-card card-hover" style={{ textDecoration: 'none', color: 'inherit' }}>
                  {!missingBanners[`league_${l.id}`] && (
                    <img
                      src={`/media/banners/leagues/league_banner_${l.id}.png`}
                      alt={`${l.name} league banner`}
                      style={{ width: '100%', height: 108, objectFit: 'cover', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                      onError={() => markMissing(`league_${l.id}`)}
                      onClick={(e) => {
                        e.preventDefault()
                        onBannerTap(`/media/banners/leagues/league_banner_${l.id}.png`, `league_banner_${l.id}.png`)
                      }}
                    />
                  )}
                  <div className="active-card-top">
                    {(l.logo_url || l.logo)
                      ? <img src={l.logo_url || l.logo} alt={l.name} className="active-league-logo" />
                      : <div className="active-league-logo fallback">{l.name?.[0]}</div>}
                  </div>
                  <div className="active-card-center">
                    <h3>{l.name}</h3>
                    <p>{l.city || 'City TBD'}</p>
                    <span>{l.team_count || 0} teams</span>
                  </div>
                  <div className="active-card-bottom">
                    <span className="badge badge-upcoming">{l.format || 'T20'}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="sect-head">
            <h3>Upcoming</h3>
            <Link to="/fixtures">All fixtures</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {upcoming.slice(0, 4).map(m => (
              <div key={m.id} className="card">
                {!missingBanners[`upcoming_vs_${m.id}`] && (
                  <img
                    src={`/media/banners/matches/vs_banner_${m.id}.png`}
                    alt={`${m.team_a_name} vs ${m.team_b_name} banner`}
                    style={{ width: '100%', height: 108, objectFit: 'cover', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onError={() => markMissing(`upcoming_vs_${m.id}`)}
                    onClick={() => onBannerTap(`/media/banners/matches/vs_banner_${m.id}.png`, `vs_banner_${m.id}.png`)}
                  />
                )}
                <div className="fixture-card">
                  <div className="fixture-teams">
                    <div className="fixture-team">{m.team_a_name}</div>
                    <div className="fixture-vs">VS</div>
                    <div className="fixture-team">{m.team_b_name}</div>
                  </div>
                  <div className="fixture-meta">{m.venue || 'Venue TBD'} · {m.date || m.match_date || 'Date TBD'} · {m.time || m.match_time || 'Time TBD'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Results */}
      {results.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="sect-head">
            <h3>Results</h3>
            <Link to="/results">All results</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.slice(0, 4).map(m => (
              <Link to={`/match/${m.id}`} key={m.id} className="card card-hover" style={{ textDecoration: 'none', color: 'inherit' }}>
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
                <div className="fixture-card">
                  <div className="fixture-teams">
                    <div className="fixture-team">{m.team_a_name}</div>
                    <div className="fixture-vs" style={{ color: 'var(--accent)' }}>vs</div>
                    <div className="fixture-team">{m.team_b_name}</div>
                  </div>
                  <div className="result-summary">{m.result_summary || 'Result recorded'}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Top Batting */}
      {topBat.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="sect-head">
            <h3>Top Batters</h3>
            <Link to="/stats">Full stats</Link>
          </div>
          <div className="card">
            {topBat.map((p, i) => (
              <div key={p.player_id || i} className="player-row">
                <div className={`player-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>{i + 1}</div>
                <div className="player-avatar">{p.player_name?.[0]}</div>
                <div className="player-meta">
                  <h5>{p.player_name}</h5>
                  <p>{p.team_name}</p>
                </div>
                <div className="player-val">{p.total_runs}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Bowling */}
      {topBowl.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="sect-head">
            <h3>Top Bowlers</h3>
            <Link to="/stats">Full stats</Link>
          </div>
          <div className="card">
            {topBowl.map((p, i) => (
              <div key={p.player_id || i} className="player-row">
                <div className={`player-rank ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''}`}>{i + 1}</div>
                <div className="player-avatar">{p.player_name?.[0]}</div>
                <div className="player-meta">
                  <h5>{p.player_name}</h5>
                  <p>{p.team_name}</p>
                </div>
                <div className="player-val">{p.total_wickets}W</div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
