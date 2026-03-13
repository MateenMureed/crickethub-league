import { useState, useEffect, useRef, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import GraphicsGeneratorPanel, {
  generateSquadBannerForTeam,
  generateCaptainPosterForTeam,
  generateLeagueBannerForLeague,
  generateVsBannerForMatch,
  generateInningsBannerForMatch,
  generateResultBannerForMatch,
  generateSummaryBannerForMatch,
} from '../components/GraphicsGeneratorPanel'

const API = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
const API_FALLBACK = `http://${window.location.hostname}:3001/api`

function buildApiUrls(path) {
  const cleanPath = String(path || '').startsWith('/') ? path : `/${path}`
  const primary = `${API}${cleanPath}`
  const urls = [primary]
  if (API.startsWith('/')) {
    urls.push(`${API_FALLBACK}${cleanPath}`)
  }
  return [...new Set(urls)]
}

async function apiJson(path, options) {
  let lastErr = null
  const urls = buildApiUrls(path)

  for (let i = 0; i < urls.length; i++) {
    try {
      const res = await fetch(urls[i], options)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      lastErr = err
    }
  }

  throw lastErr || new Error('Request failed')
}

async function apiCall(path, options) {
  let lastErr = null
  const urls = buildApiUrls(path)

  for (let i = 0; i < urls.length; i++) {
    try {
      return await fetch(urls[i], options)
    } catch (err) {
      lastErr = err
    }
  }

  throw lastErr || new Error('Request failed')
}

function buildFixtureDraftRows(teams, form) {
  const format = String(form.format || 'round-robin').toLowerCase()
  const meetings = Math.max(1, parseInt(form.matches_per_pair, 10) || 1)
  const gapDays = Math.max(0, parseInt(form.match_gap_days, 10) || 0)
  const baseDate = form.match_date || ''
  const baseTime = form.match_time || ''
  const venue = form.venue || ''
  const overs = Math.max(1, parseInt(form.overs_per_innings, 10) || 20)

  const rows = []
  const pushRow = (teamA, teamB, idx) => {
    let date = baseDate
    if (baseDate) {
      const dt = new Date(`${baseDate}T00:00:00`)
      if (!Number.isNaN(dt.getTime())) {
        dt.setDate(dt.getDate() + (idx * gapDays))
        date = dt.toISOString().slice(0, 10)
      }
    }
    rows.push({
      team_a_id: teamA.id,
      team_b_id: teamB.id,
      team_a_name: teamA.name,
      team_b_name: teamB.name,
      date,
      time: baseTime,
      venue,
      overs_per_innings: overs,
    })
  }

  if (format === 'knockout') {
    for (let i = 0; i + 1 < teams.length; i += 2) {
      pushRow(teams[i], teams[i + 1], rows.length)
    }
    return rows
  }

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      for (let r = 0; r < meetings; r++) {
        pushRow(teams[i], teams[j], rows.length)
      }
    }
  }
  return rows
}

function createEmptyLeagueForm() {
  return {
    name: '',
    city: '',
    venue: '',
    organizer: '',
    season: '',
    format: 'round-robin',
    overs_per_innings: 20,
    status: 'upcoming',
  }
}

/* ── Reusable inline banner button ── */
function BannerBtn({ label, icon = '🎨', onClick, busy, busyLabel }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '5px 12px',
        fontSize: '0.75rem',
        fontWeight: 700,
        letterSpacing: '0.4px',
        borderRadius: '6px',
        border: '1px solid rgba(240,180,41,0.4)',
        background: busy ? 'rgba(240,180,41,0.05)' : 'rgba(240,180,41,0.1)',
        color: busy ? '#64748b' : '#f0b429',
        cursor: busy ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { if (!busy) e.currentTarget.style.background = 'rgba(240,180,41,0.2)' }}
      onMouseLeave={e => { if (!busy) e.currentTarget.style.background = 'rgba(240,180,41,0.1)' }}
    >
      <span style={{ fontSize: '0.85rem' }}>{busy ? '⟳' : icon}</span>
      {busy ? (busyLabel || 'Generating…') : label}
    </button>
  )
}

/* ── Toast notification ── */
function Toast({ message, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [])
  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
      background: 'rgba(16,30,54,0.97)', border: '1px solid rgba(34,197,94,0.4)',
      borderLeft: '4px solid #22c55e', borderRadius: '10px',
      padding: '12px 18px', color: '#e2e8f0', fontSize: '0.875rem',
      display: 'flex', alignItems: 'center', gap: '10px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
    }}>
      <span style={{ color: '#22c55e', fontSize: '1.1rem' }}>✓</span>
      {message}
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginLeft: '8px', fontSize: '1rem' }}>×</button>
    </div>
  )
}

export default function AdminPanel() {
  const navigate = useNavigate()
  const { logout, user } = useContext(AuthContext)
  const [theme, setTheme] = useState(() => localStorage.getItem('ch-theme') || 'dark')
  const [activeSection, setActiveSection] = useState('leagues')
  const [leagues, setLeagues] = useState([])
  const [selectedLeague, setSelectedLeague] = useState(null)
  const [teams, setTeams] = useState([])
  const [matches, setMatches] = useState([])
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [teamPlayers, setTeamPlayers] = useState([])

  // UI states
  const [showModal, setShowModal] = useState(null)
  const [showInlineLeagueForm, setShowInlineLeagueForm] = useState(false)
  const [showInlineTeamForm, setShowInlineTeamForm] = useState(false)
  const [editMatch, setEditMatch] = useState(null)
  const leagueBannerRef = useRef(null)

  // Forms
  const [leagueForm, setLeagueForm] = useState(createEmptyLeagueForm)
  const [leagueLogo, setLeagueLogo] = useState(null)
  const [inlineEditLeagueId, setInlineEditLeagueId] = useState(null)
  const [inlineLeagueDraft, setInlineLeagueDraft] = useState({ ...createEmptyLeagueForm() })
  const [inlineLeagueLogo, setInlineLeagueLogo] = useState(null)
  const [sponsorInputs, setSponsorInputs] = useState([{ name: '', logo: null }, { name: '', logo: null }])
  const [generatedLeagueBanner, setGeneratedLeagueBanner] = useState(null)

  const [playerForm, setPlayerForm] = useState({ name: '', role: 'batsman', jersey_number: '' })
  const [playerPhoto, setPlayerPhoto] = useState(null)
  const [editPlayerForm, setEditPlayerForm] = useState({ id: null, name: '', role: 'batsman', jersey_number: '' })
  const [editPlayerPhoto, setEditPlayerPhoto] = useState(null)
  const [inlineEditPlayerId, setInlineEditPlayerId] = useState(null)
  const [inlinePlayerDraft, setInlinePlayerDraft] = useState({ name: '', role: 'batsman', jersey_number: '' })
  const [inlineEditTeamId, setInlineEditTeamId] = useState(null)
  const [inlineTeamDraft, setInlineTeamDraft] = useState({ name: '', captain_name: '' })
  const [inlineTeamLogo, setInlineTeamLogo] = useState(null)
  const [inlineCaptainPhoto, setInlineCaptainPhoto] = useState(null)

  // Bulk Team Form
  const [bulkTeamName, setBulkTeamName] = useState('')
  const [bulkTeamLogo, setBulkTeamLogo] = useState(null)
  const [bulkCaptainIndex, setBulkCaptainIndex] = useState(0)
  const [bulkPlayers, setBulkPlayers] = useState(Array(11).fill({ name: '', role: 'batsman', jersey_number: '' }))
  const [bulkPhotos, setBulkPhotos] = useState(Array(11).fill(null))

  // ── Banner generating states (keyed by id) ──
  const [busyBanners, setBusyBanners] = useState({})  // { `${type}_${id}`: true }
  const [toast, setToast] = useState(null)
  const [fixtureGenerating, setFixtureGenerating] = useState(false)
  const [fixtureForm, setFixtureForm] = useState({
    format: 'round-robin',
    matches_per_pair: 1,
    expected_teams: 0,
    required_squad_size: 11,
    overs_per_innings: 20,
    match_date: '',
    match_time: '',
    match_gap_days: 0,
    venue: '',
    auto_generate_vs: true,
  })
  const [fixtureDrafts, setFixtureDrafts] = useState([])
  const [dataError, setDataError] = useState('')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('ch-theme', theme)
  }, [theme])

  const setBusy = (key, val) => setBusyBanners(prev => ({ ...prev, [key]: val }))
  const isBusy = (key) => !!busyBanners[key]
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
  const doLogout = () => {
    logout()
    navigate('/login')
  }

  const showToast = (msg) => setToast(msg)

  const withBanner = async (key, fn) => {
    setBusy(key, true)
    try {
      const fileName = await fn()
      showToast(`✓ ${fileName || 'Banner'} saved & downloaded`)
    } catch (err) {
      alert(err.message || 'Banner generation failed')
    } finally {
      setBusy(key, false)
    }
  }

  useEffect(() => { loadLeagues() }, [])
  useEffect(() => { if (selectedLeague) { loadTeams(); loadMatches() } }, [selectedLeague])
  useEffect(() => { if (selectedTeam) loadPlayers() }, [selectedTeam])
  useEffect(() => {
    if (!selectedLeague) return
    const league = leagues.find((l) => l.id === selectedLeague)
    if (!league) return
    setFixtureForm((p) => ({
      ...p,
      format: league.format || p.format || 'round-robin',
      overs_per_innings: parseInt(league.overs_per_innings, 10) || p.overs_per_innings || 20,
      venue: league.venue || p.venue || '',
      expected_teams: teams.length,
      required_squad_size: 11,
    }))
  }, [selectedLeague, leagues, teams])

  const loadLeagues = async () => {
    try {
      const data = await apiJson('/leagues')
      setLeagues(Array.isArray(data) ? data : [])
      setDataError('')
    } catch (_) {
      setLeagues([])
      setDataError('Backend connection failed. Start server on port 3001 and retry.')
    }
  }

  const loadTeams = async () => {
    if (!selectedLeague) return
    try {
      const data = await apiJson(`/leagues/${selectedLeague}/teams`)
      setTeams(Array.isArray(data) ? data : [])
      setDataError('')
    } catch (_) {
      setTeams([])
      setDataError('Could not load teams from database.')
    }
  }

  const loadMatches = async () => {
    if (!selectedLeague) return
    try {
      const data = await apiJson(`/leagues/${selectedLeague}/matches`)
      setMatches(Array.isArray(data) ? data : [])
      setDataError('')
    } catch (_) {
      setMatches([])
      setDataError('Could not load matches from database.')
    }
  }

  const loadPlayers = async () => {
    if (!selectedTeam) return
    try {
      const data = await apiJson(`/teams/${selectedTeam}/players`)
      setTeamPlayers(Array.isArray(data) ? data : [])
      setDataError('')
    } catch (_) {
      setTeamPlayers([])
      setDataError('Could not load squad data from database.')
    }
  }

  // ── Banner actions (contextual per item) ──

  const handleLeagueBanner = (league) =>
    withBanner(`league_${league.id}`, () => generateLeagueBannerForLeague(league.id))

  const handleSquadBanner = (team) =>
    withBanner(`squad_${team.id}`, () => generateSquadBannerForTeam(team.id))

  const handleCaptainPoster = (team) =>
    withBanner(`captain_${team.id}`, () => generateCaptainPosterForTeam(team.id))

  const handleVsBanner = (match) => {
    const leagueObj = leagues.find(l => String(l.id) === String(selectedLeague))
    withBanner(`vs_${match.id}`, () => generateVsBannerForMatch(match, leagueObj))
  }

  const handleInningsBanner = (match, type) =>
    withBanner(`innings_${match.id}_${type}`, async () => {
      const [m, sc] = await Promise.all([
        apiJson(`/matches/${match.id}`),
        apiJson(`/matches/${match.id}/scorecard`),
      ])
      return generateInningsBannerForMatch(m, sc, type)
    })

  const handleResultBanner = (match) =>
    withBanner(`result_${match.id}`, async () => {
      const [m, sc] = await Promise.all([
        apiJson(`/matches/${match.id}`),
        apiJson(`/matches/${match.id}/scorecard`),
      ])
      return generateResultBannerForMatch(m, sc)
    })

  const handleSummaryBanner = (match) =>
    withBanner(`summary_${match.id}`, async () => {
      const [m, sc] = await Promise.all([
        apiJson(`/matches/${match.id}`),
        apiJson(`/matches/${match.id}/scorecard`),
      ])
      let league = null
      try {
        const lid = m.league_id || match.league_id
        if (lid) league = await apiJson(`/leagues/${lid}`)
      } catch (_) {}
      return generateSummaryBannerForMatch(m, sc, league)
    })

  // ── Legacy squad banner (from Squads tab) ──
  const [isGeneratingSquadBanner, setIsGeneratingSquadBanner] = useState(false)
  const generateSquadBannerFromSquads = async (teamId = selectedTeam) => {
    if (!teamId) { alert('Select a team first.'); return }
    try {
      setIsGeneratingSquadBanner(true)
      await generateSquadBannerForTeam(teamId)
      await loadTeams()
      showToast('Squad banner generated and saved.')
    } catch (err) {
      alert(err.message || 'Failed to generate squad banner.')
    } finally {
      setIsGeneratingSquadBanner(false)
    }
  }

  const createLeague = async (e) => {
    e.preventDefault()
    const fd = new FormData()
    Object.entries(leagueForm).forEach(([k, v]) => fd.append(k, v))
    if (leagueLogo) fd.append('logo', leagueLogo)
    const res = await apiCall('/leagues', { method: 'POST', body: fd })
    const leagueData = await res.json()
    if (leagueData?.id) {
      const validSponsors = sponsorInputs.filter(s => s.name.trim())
      for (const sponsor of validSponsors) {
        const sfd = new FormData()
        sfd.append('name', sponsor.name.trim())
        if (sponsor.logo) sfd.append('logo', sponsor.logo)
        await apiCall(`/leagues/${leagueData.id}/sponsors`, { method: 'POST', body: sfd })
      }
      setGeneratedLeagueBanner({ id: leagueData.id, ...leagueForm, logo: leagueLogo ? URL.createObjectURL(leagueLogo) : null, sponsors: validSponsors })
      setShowModal('leagueBanner')
    }
    setLeagueForm(createEmptyLeagueForm())
    setSponsorInputs([{ name: '', logo: null }, { name: '', logo: null }])
    setLeagueLogo(null)
    setShowInlineLeagueForm(false)
    loadLeagues()
  }

  const startInlineLeagueEdit = (league) => {
    setInlineEditLeagueId(league.id)
    setInlineLeagueDraft({
      name: league.name || '',
      city: league.city || '',
      venue: league.venue || '',
      organizer: league.organizer || '',
      season: league.season || '',
      format: league.format || 'round-robin',
      overs_per_innings: parseInt(league.overs_per_innings, 10) || 20,
      status: league.status || 'upcoming',
    })
    setInlineLeagueLogo(null)
  }

  const cancelInlineLeagueEdit = () => {
    setInlineEditLeagueId(null)
    setInlineLeagueDraft({ ...createEmptyLeagueForm() })
    setInlineLeagueLogo(null)
  }

  const saveInlineLeagueEdit = async (leagueId) => {
    if (!leagueId) return
    const fd = new FormData()
    fd.append('name', inlineLeagueDraft.name)
    fd.append('city', inlineLeagueDraft.city)
    fd.append('venue', inlineLeagueDraft.venue)
    fd.append('organizer', inlineLeagueDraft.organizer)
    fd.append('season', inlineLeagueDraft.season)
    fd.append('format', inlineLeagueDraft.format)
    fd.append('overs_per_innings', inlineLeagueDraft.overs_per_innings)
    fd.append('status', inlineLeagueDraft.status)
    if (inlineLeagueLogo) fd.append('logo', inlineLeagueLogo)

    const res = await apiCall(`/leagues/${leagueId}`, { method: 'PUT', body: fd })
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}))
      alert(payload.error || 'Failed to update league')
      return
    }

    cancelInlineLeagueEdit()
    await loadLeagues()
    showToast('League updated successfully')
  }

  const createTeamBulk = async (e) => {
    e.preventDefault()
    const normalizedPlayers = bulkPlayers.map((p) => ({
      ...p,
      name: (p.name || '').trim(),
      role: p.role || 'batsman'
    }))
    const namedPlayers = normalizedPlayers.filter((p) => p.name)
    const bowlingCount = namedPlayers.filter((p) => ['bowler', 'all-rounder', 'all rounder'].includes((p.role || '').toLowerCase())).length

    if (!bulkTeamName.trim()) { alert('Team name is required.'); return }
    if (namedPlayers.length !== 11) { alert('Exactly 11 players are mandatory for squad creation.'); return }
    if (bowlingCount < 2) { alert('At least 2 bowlers/all-rounders are mandatory in the squad.'); return }
    if (!normalizedPlayers[bulkCaptainIndex]?.name) { alert('Captain must be selected from entered players.'); return }

    const fd = new FormData()
    const dataPayload = { league_id: selectedLeague, name: bulkTeamName.trim(), captain_index: bulkCaptainIndex, players: normalizedPlayers }
    fd.append('data', JSON.stringify(dataPayload))
    if (bulkTeamLogo) fd.append('logo', bulkTeamLogo)
    bulkPhotos.forEach((photo, index) => { if (photo) fd.append(`player_photo_${index}`, photo) })
    const res = await apiCall('/teams/bulk', { method: 'POST', body: fd })
    if (res.ok) {
      const created = await res.json()
      const createdTeamId = created.id
      setBulkTeamName(''); setBulkTeamLogo(null); setBulkCaptainIndex(0)
      setBulkPlayers(Array(11).fill({ name: '', role: 'batsman', jersey_number: '' }))
      setBulkPhotos(Array(11).fill(null))
      setShowInlineTeamForm(false)
      await loadTeams()
      if (createdTeamId) {
        setSelectedTeam(createdTeamId)
        setActiveSection('players')
        await generateSquadBannerFromSquads(createdTeamId)
      }
    } else {
      const d = await res.json().catch(() => ({}))
      alert(d.error || 'Failed to create team and squad. Please try again.')
    }
  }

  const handleBulkPlayerChange = (index, field, value) => {
    const newPlayers = [...bulkPlayers]
    newPlayers[index] = { ...newPlayers[index], [field]: value }
    setBulkPlayers(newPlayers)
  }

  const handleBulkPhotoChange = (index, file) => {
    const newPhotos = [...bulkPhotos]
    newPhotos[index] = file
    setBulkPhotos(newPhotos)
  }

  const downloadLeagueBanner = async () => {
    if (!leagueBannerRef.current) return
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(leagueBannerRef.current, { scale: 3, useCORS: true, backgroundColor: '#0f172a' })
      const image = canvas.toDataURL('image/png', 1.0)
      const link = document.createElement('a')
      link.download = `league-banner-${generatedLeagueBanner?.name || 'league'}.png`
      link.href = image; link.click()
    } catch (err) {
      alert('Failed to generate banner image.')
    }
  }

  const addPlayer = async (e) => {
    e.preventDefault()
    const fd = new FormData()
    fd.append('team_id', selectedTeam); fd.append('name', playerForm.name)
    fd.append('role', playerForm.role); fd.append('jersey_number', playerForm.jersey_number)
    if (playerPhoto) fd.append('photo', playerPhoto)
    await apiCall('/players', { method: 'POST', body: fd })
    setPlayerForm({ name: '', role: 'batsman', jersey_number: '' }); setPlayerPhoto(null); loadPlayers()
  }

  const openEditPlayerModal = (player) => {
    setEditPlayerForm({ id: player.id, name: player.name || '', role: player.role || 'batsman', jersey_number: player.jersey_number || '' })
    setEditPlayerPhoto(null); setShowModal('editPlayer')
  }

  const updatePlayer = async (e) => {
    e.preventDefault()
    if (!editPlayerForm.id) return
    const fd = new FormData()
    fd.append('name', editPlayerForm.name); fd.append('role', editPlayerForm.role); fd.append('jersey_number', editPlayerForm.jersey_number)
    if (editPlayerPhoto) fd.append('photo', editPlayerPhoto)
    await apiCall(`/players/${editPlayerForm.id}`, { method: 'PUT', body: fd })
    setShowModal(null); setEditPlayerForm({ id: null, name: '', role: 'batsman', jersey_number: '' }); setEditPlayerPhoto(null); loadPlayers()
  }

  const startInlinePlayerEdit = (player) => {
    setInlineEditPlayerId(player.id)
    setInlinePlayerDraft({ name: player.name || '', role: player.role || 'batsman', jersey_number: player.jersey_number || '' })
  }
  const cancelInlinePlayerEdit = () => { setInlineEditPlayerId(null); setInlinePlayerDraft({ name: '', role: 'batsman', jersey_number: '' }) }
  const saveInlinePlayerEdit = async (playerId) => {
    const fd = new FormData()
    fd.append('name', inlinePlayerDraft.name); fd.append('role', inlinePlayerDraft.role); fd.append('jersey_number', inlinePlayerDraft.jersey_number)
    await apiCall(`/players/${playerId}`, { method: 'PUT', body: fd })
    cancelInlinePlayerEdit(); loadPlayers()
  }
  const deletePlayer = async (id) => { await apiCall(`/players/${id}`, { method: 'DELETE' }); loadPlayers() }

  const deleteTeam = async (id) => {
    if (!confirm('Delete this team?')) return
    await apiCall(`/teams/${id}`, { method: 'DELETE' }); loadTeams()
    if (selectedTeam === id) { setSelectedTeam(null); setTeamPlayers([]) }
  }

  const startInlineTeamEdit = (team) => {
    setInlineEditTeamId(team.id)
    setInlineTeamDraft({ name: team.name || '', captain_name: team.captain_name || '' })
    setInlineTeamLogo(null)
    setInlineCaptainPhoto(null)
  }

  const cancelInlineTeamEdit = () => {
    setInlineEditTeamId(null)
    setInlineTeamDraft({ name: '', captain_name: '' })
    setInlineTeamLogo(null)
    setInlineCaptainPhoto(null)
  }

  const saveInlineTeamEdit = async (teamId) => {
    if (!teamId) return
    const fd = new FormData()
    fd.append('name', inlineTeamDraft.name)
    fd.append('captain_name', inlineTeamDraft.captain_name)
    if (inlineTeamLogo) fd.append('logo', inlineTeamLogo)
    if (inlineCaptainPhoto) fd.append('captain_photo', inlineCaptainPhoto)
    await apiCall(`/teams/${teamId}`, { method: 'PUT', body: fd })
    await loadTeams()
    if (selectedTeam === teamId) loadPlayers()
    cancelInlineTeamEdit()
  }

  const deleteLeague = async (id) => {
    if (!confirm('Delete this league and all its data?')) return
    await apiCall(`/leagues/${id}`, { method: 'DELETE' }); loadLeagues()
    if (selectedLeague === id) { setSelectedLeague(null); setTeams([]); setMatches([]) }
  }

  const submitFixtureSetup = async (e) => {
    e.preventDefault()
    if (!selectedLeague) return

    const payload = {
      format: (leagues.find((l) => l.id === selectedLeague)?.format || fixtureForm.format || 'round-robin'),
      matches_per_pair: parseInt(fixtureForm.matches_per_pair, 10) || 1,
      expected_teams: teams.length,
      required_squad_size: 11,
      overs_per_innings: parseInt(leagues.find((l) => l.id === selectedLeague)?.overs_per_innings, 10) || parseInt(fixtureForm.overs_per_innings, 10) || 20,
      match_date: fixtureForm.match_date,
      match_time: fixtureForm.match_time,
      match_gap_days: parseInt(fixtureForm.match_gap_days, 10) || 0,
      venue: fixtureForm.venue,
    }

    setFixtureGenerating(true)
    try {
      const res = await apiCall(`/leagues/${selectedLeague}/generate-fixtures`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Failed to generate fixtures')
        return
      }

      if (Array.isArray(data.matches) && data.matches.length > 0 && fixtureDrafts.length > 0) {
        for (let i = 0; i < data.matches.length; i++) {
          const createdMatch = data.matches[i]
          const draft = fixtureDrafts[i]
          if (!draft) {
            await apiCall(`/matches/${createdMatch.id}`, { method: 'DELETE' })
            continue
          }
          await apiCall(`/matches/${createdMatch.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date: draft.date || '', time: draft.time || '', venue: draft.venue || '', overs_per_innings: parseInt(draft.overs_per_innings, 10) || 20 }),
          })
        }
      }

      if (fixtureForm.auto_generate_vs && Array.isArray(data.matches) && data.matches.length > 0) {
        const leagueObj = leagues.find((l) => String(l.id) === String(selectedLeague)) || null
        for (let i = 0; i < data.matches.length; i++) {
          if (!fixtureDrafts[i]) continue
          await generateVsBannerForMatch(data.matches[i], leagueObj)
        }
      }

      await loadMatches()
      setShowModal(null)
      setFixtureDrafts([])
      showToast(`Fixtures generated${fixtureForm.auto_generate_vs ? ' + VS banners created' : ''}`)
    } catch (err) {
      alert(err.message || 'Failed to generate fixtures')
    } finally {
      setFixtureGenerating(false)
    }
  }

  const createFixtureDrafts = () => {
    const rows = buildFixtureDraftRows(teams, fixtureForm)
    setFixtureDrafts(rows)
  }

  const updateFixtureDraft = (index, field, value) => {
    setFixtureDrafts((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)))
  }

  const removeFixtureDraft = (index) => {
    setFixtureDrafts((prev) => prev.filter((_, i) => i !== index))
  }

  const deleteFixture = async (matchId) => {
    if (!confirm('Delete this fixture?')) return
    await apiCall(`/matches/${matchId}`, { method: 'DELETE' })
    await loadMatches()
  }

  const clearUpcomingFixtures = async () => {
    if (!selectedLeague) return
    if (!confirm('Delete all upcoming fixtures for this league?')) return
    const res = await apiCall(`/leagues/${selectedLeague}/fixtures/upcoming`, { method: 'DELETE' })
    const data = await res.json()
    showToast(data.message || 'Upcoming fixtures deleted')
    await loadMatches()
  }

  const updateMatch = async (matchId, updates) => {
    await apiCall(`/matches/${matchId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
    loadMatches(); setEditMatch(null)
  }

  const canStartScheduledMatch = (match) => {
    if (!match?.date) return true
    const rawDate = String(match.date).trim()
    const rawTime = String(match.time || '').trim()
    const scheduled = new Date(rawTime ? `${rawDate}T${rawTime}` : `${rawDate}T00:00:00`)
    if (Number.isNaN(scheduled.getTime())) return true
    return new Date() >= scheduled
  }

  const startMatch = async (matchId) => {
    const match = matches.find(m => m.id === matchId)
    if (!canStartScheduledMatch(match)) {
      alert(`Match can start only at scheduled time: ${match.date}${match.time ? ` ${match.time}` : ''}`)
      return
    }
    const tossWinner = prompt(`Toss Winner (enter team name):\n1. ${match.team_a_name}\n2. ${match.team_b_name}`)
    if (!tossWinner) return
    const tossWinnerId = tossWinner === '1' || tossWinner.toLowerCase().includes(match.team_a_name.toLowerCase()) ? match.team_a_id : match.team_b_id
    const decision = prompt('Toss decision: bat or bowl?')?.toLowerCase()
    if (!decision || (decision !== 'bat' && decision !== 'bowl')) return
    const res = await apiCall(`/matches/${matchId}/start`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toss_winner_id: tossWinnerId, toss_decision: decision })
    })
    const payload = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(payload.error || 'Failed to start match')
      return
    }
    navigate(`/admin/scoring/${matchId}`)
  }


  const sections = [
    { id: 'leagues',  label: 'Leagues',      icon: '🏆' },
    { id: 'teams',    label: 'Teams',         icon: '👥' },
    { id: 'players',  label: 'Squads',        icon: '🎽' },
    { id: 'fixtures', label: 'Fixtures',      icon: '📅' },
    { id: 'scoring',  label: 'Scoring',       icon: '🔴' },
    { id: 'results',  label: 'Results',       icon: '📊' },
    { id: 'graphics', label: 'Graphics',      icon: '🎨' },
  ]

  /* ── Shared compact section title ── */
  const SectionHead = ({ title, action }) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10, gap:8 }}>
      <h2 style={{ fontSize:'0.88rem', fontWeight:900, margin:0, letterSpacing:'0.1px' }}>{title}</h2>
      {action}
    </div>
  )

  /* ── Compact banner strip ── */
  const BannerSection = ({ children }) => (
    <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid var(--glass-bd)', display:'flex', flexWrap:'wrap', gap:4, alignItems:'center' }}>
      <span style={{ fontSize:'0.54rem', fontWeight:700, color:'var(--gold)', letterSpacing:'0.8px', textTransform:'uppercase' }}>🎨</span>
      {children}
    </div>
  )

  const enteredPlayerCount = bulkPlayers.filter((p) => (p.name || '').trim()).length
  const enteredBowlerCount = bulkPlayers
    .filter((p) => (p.name || '').trim())
    .filter((p) => ['bowler', 'all-rounder', 'all rounder'].includes((p.role || '').toLowerCase())).length
  const canSubmitBulkTeam = bulkTeamName.trim() && enteredPlayerCount === 11 && enteredBowlerCount >= 2 && !!(bulkPlayers[bulkCaptainIndex]?.name || '').trim()
  const selectedLeagueObj = leagues.find((l) => l.id === selectedLeague) || null

  return (
    <div className="admin-layout">

      <div className="admin-mobile-head">
        <div className="admin-mobile-brand">
          <h3>Admin</h3>
          <p>{user?.username || 'Organizer'}</p>
        </div>
        <div className="admin-mobile-actions">
          <button className="icon-btn" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="btn btn-sm btn-danger" onClick={doLogout}>Logout</button>
        </div>
      </div>

      {/* ══ SIDEBAR ══ */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <h3>Admin</h3>
        </div>
        {sections.map(s => (
          <button key={s.id} className={`admin-sidebar-item${activeSection === s.id ? ' active' : ''}`} onClick={() => setActiveSection(s.id)}>
            <span className="sidebar-icon">{s.icon}</span>
            <span className="sidebar-label">{s.label}</span>
          </button>
        ))}
      </aside>

      {/* ══ CONTENT ══ */}
      <div className="admin-content">
        {dataError && (
          <div className="error-banner" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span>{dataError}</span>
            <button className="btn btn-sm btn-secondary" onClick={loadLeagues}>Retry</button>
          </div>
        )}

        {/* ═══ LEAGUES ════════════════════════════════════════════ */}
        {activeSection === 'leagues' && (
          <div>
            <SectionHead
              title="Leagues"
              action={<button className="btn btn-primary btn-sm" onClick={() => setShowInlineLeagueForm(v => !v)}>{showInlineLeagueForm ? 'Close Form' : '+ Create'}</button>}
            />
            {selectedLeagueObj && (
              <div className="glass-card" style={{ padding:'10px 12px', marginBottom:10, borderLeft:'3px solid var(--gold)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:6 }}>
                  <div style={{ fontWeight:800, fontSize:'0.8rem' }}>League Details</div>
                  <span className={`badge ${selectedLeagueObj.status==='active'?'badge-live':selectedLeagueObj.status==='completed'?'badge-completed':'badge-upcoming'}`}>
                    {selectedLeagueObj.status || 'upcoming'}
                  </span>
                </div>
                <div style={{ fontSize:'0.72rem', color:'var(--t2)', lineHeight:1.45 }}>
                  <div><strong style={{ color:'var(--t1)' }}>{selectedLeagueObj.name}</strong> · {selectedLeagueObj.city || 'City N/A'}</div>
                  <div>Owner: {selectedLeagueObj.organizer || 'N/A'} · Season: {selectedLeagueObj.season || 'N/A'} · Format: {selectedLeagueObj.format || 'round-robin'}</div>
                  <div>Overs: {selectedLeagueObj.overs_per_innings || 20} · Venue: {selectedLeagueObj.venue || 'N/A'} · Teams: {selectedLeagueObj.team_count || 0}</div>
                </div>
              </div>
            )}
            {showInlineLeagueForm && (
              <div className="glass-card" style={{ padding:'14px 16px', marginBottom:12, borderLeft:'3px solid var(--accent)' }}>
                <form onSubmit={createLeague}>
                  <div className="form-group" style={{ marginBottom:10 }}>
                    <label className="form-label">League Name *</label>
                    <input className="form-input" value={leagueForm.name} onChange={e => setLeagueForm({ ...leagueForm, name: e.target.value })} required />
                  </div>
                  <div className="form-grid" style={{ marginBottom:10 }}>
                    <div className="form-group" style={{ marginBottom:0 }}>
                      <label className="form-label">City</label>
                      <input className="form-input" value={leagueForm.city} onChange={e => setLeagueForm({ ...leagueForm, city: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom:0 }}>
                      <label className="form-label">Venue</label>
                      <input className="form-input" value={leagueForm.venue} onChange={e => setLeagueForm({ ...leagueForm, venue: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-grid" style={{ marginBottom:10 }}>
                    <div className="form-group" style={{ marginBottom:0 }}>
                      <label className="form-label">Organizer</label>
                      <input className="form-input" value={leagueForm.organizer} onChange={e => setLeagueForm({ ...leagueForm, organizer: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ marginBottom:0 }}>
                      <label className="form-label">Season</label>
                      <input className="form-input" value={leagueForm.season} onChange={e => setLeagueForm({ ...leagueForm, season: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-grid" style={{ marginBottom:10 }}>
                    <div className="form-group" style={{ marginBottom:0 }}>
                      <label className="form-label">Format</label>
                      <select className="form-select" value={leagueForm.format} onChange={e => setLeagueForm({ ...leagueForm, format: e.target.value })}>
                        <option value="round-robin">Round Robin</option>
                        <option value="knockout">Knockout</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ marginBottom:0 }}>
                      <label className="form-label">Overs / Innings</label>
                      <input className="form-input" type="number" min="1" value={leagueForm.overs_per_innings} onChange={e => setLeagueForm({ ...leagueForm, overs_per_innings: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom:10 }}>
                    <label className="form-label">League Logo</label>
                    <input className="form-input" type="file" accept="image/*" onChange={e => setLeagueLogo(e.target.files[0])} />
                  </div>
                  <div className="form-group" style={{ marginBottom:10 }}>
                    <label className="form-label">Sponsors</label>
                    {sponsorInputs.map((s, i) => (
                      <div key={i} className="form-grid" style={{ marginBottom:8 }}>
                        <input className="form-input" placeholder={`Sponsor ${i + 1} name`} value={s.name} onChange={e => { const n = [...sponsorInputs]; n[i] = { ...n[i], name: e.target.value }; setSponsorInputs(n) }} />
                        <input className="form-input" type="file" accept="image/*" onChange={e => { const n = [...sponsorInputs]; n[i] = { ...n[i], logo: e.target.files[0] || null }; setSponsorInputs(n) }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display:'flex', justifyContent:'flex-end', gap:8 }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowInlineLeagueForm(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Create League</button>
                  </div>
                </form>
              </div>
            )}
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {leagues.map(league => (
                <div key={league.id} className="glass-card" style={{
                  padding:'11px 14px', cursor: inlineEditLeagueId === league.id ? 'default' : 'pointer',
                  borderLeft: selectedLeague === league.id ? '3px solid var(--accent)' : '3px solid transparent',
                }} onClick={() => { if (inlineEditLeagueId !== league.id) setSelectedLeague(league.id) }}>
                  {inlineEditLeagueId === league.id ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }} onClick={e => e.stopPropagation()}>
                      <input className="form-input" value={inlineLeagueDraft.name} onChange={e => setInlineLeagueDraft(p => ({ ...p, name:e.target.value }))} placeholder="League Name" />
                      <div className="form-grid">
                        <input className="form-input" value={inlineLeagueDraft.city} onChange={e => setInlineLeagueDraft(p => ({ ...p, city:e.target.value }))} placeholder="City" />
                        <input className="form-input" value={inlineLeagueDraft.venue} onChange={e => setInlineLeagueDraft(p => ({ ...p, venue:e.target.value }))} placeholder="Venue" />
                      </div>
                      <div className="form-grid">
                        <input className="form-input" value={inlineLeagueDraft.organizer} onChange={e => setInlineLeagueDraft(p => ({ ...p, organizer:e.target.value }))} placeholder="Owner / Organizer" />
                        <input className="form-input" value={inlineLeagueDraft.season} onChange={e => setInlineLeagueDraft(p => ({ ...p, season:e.target.value }))} placeholder="Season" />
                      </div>
                      <div className="form-grid">
                        <select className="form-select" value={inlineLeagueDraft.format} onChange={e => setInlineLeagueDraft(p => ({ ...p, format:e.target.value }))}>
                          <option value="round-robin">Round Robin</option>
                          <option value="knockout">Knockout</option>
                        </select>
                        <input className="form-input" type="number" min="1" value={inlineLeagueDraft.overs_per_innings} onChange={e => setInlineLeagueDraft(p => ({ ...p, overs_per_innings:e.target.value }))} placeholder="Overs" />
                      </div>
                      <div className="form-grid">
                        <select className="form-select" value={inlineLeagueDraft.status} onChange={e => setInlineLeagueDraft(p => ({ ...p, status:e.target.value }))}>
                          <option value="upcoming">Upcoming</option>
                          <option value="active">Active</option>
                          <option value="completed">Completed</option>
                        </select>
                        <input className="form-input" type="file" accept="image/*" onChange={e => setInlineLeagueLogo(e.target.files[0] || null)} />
                      </div>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn btn-sm btn-primary" onClick={() => saveInlineLeagueEdit(league.id)}>Save</button>
                        <button className="btn btn-sm btn-secondary" onClick={cancelInlineLeagueEdit}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    {league.logo
                      ? <img src={league.logo} alt="" style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
                      : <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--g-accent)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:'0.9rem', color:'#fff', flexShrink:0 }}>{league.name?.charAt(0)}</div>}
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:'0.88rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{league.name}</div>
                      <div style={{ fontSize:'0.68rem', color:'var(--t3)', marginTop:1 }}>
                        {league.city || 'City N/A'} · {league.team_count} teams · {league.format || 'round-robin'}
                      </div>
                      <div style={{ fontSize:'0.66rem', color:'var(--t3)', marginTop:3, lineHeight:1.35 }}>
                        Owner: {league.organizer || 'N/A'} · Season: {league.season || 'N/A'} · Overs: {league.overs_per_innings || 20} · Venue: {league.venue || 'N/A'}
                      </div>
                    </div>
                    <span className={`badge ${league.status==='active'?'badge-live':league.status==='completed'?'badge-completed':'badge-upcoming'}`} style={{ flexShrink:0 }}>{league.status}</span>
                    <button className="btn btn-sm btn-secondary" style={{ padding:'3px 9px', fontSize:'0.68rem', flexShrink:0 }} onClick={e => { e.stopPropagation(); startInlineLeagueEdit(league) }}>Edit</button>
                    <button className="btn btn-sm btn-danger" style={{ padding:'3px 9px', fontSize:'0.68rem', flexShrink:0 }} onClick={e => { e.stopPropagation(); deleteLeague(league.id) }}>✕</button>
                  </div>
                  )}
                  <BannerSection>
                    <BannerBtn label="League Banner" busy={isBusy(`league_${league.id}`)} onClick={e => { e.stopPropagation(); handleLeagueBanner(league) }} />
                  </BannerSection>
                </div>
              ))}
              {leagues.length === 0 && <div className="empty-state"><div className="empty-state-icon">🏆</div><h3>No Leagues Yet</h3></div>}
            </div>
          </div>
        )}

        {/* ═══ TEAMS ═══════════════════════════════════════════════ */}
        {activeSection === 'teams' && (
          <div>
            {!selectedLeague
              ? <div className="empty-state"><div className="empty-state-icon">👈</div><h3>Select a League First</h3></div>
              : <>
                  <SectionHead
                    title={`Teams — ${leagues.find(l=>l.id===selectedLeague)?.name || ''}`}
                    action={<button className="btn btn-primary btn-sm" onClick={() => setShowInlineTeamForm(v => !v)}>{showInlineTeamForm ? 'Close Form' : '+ Add Team'}</button>}
                  />
                  {showInlineTeamForm && (
                    <div className="glass-card" style={{ padding:'14px 16px', marginBottom:12, borderLeft:'3px solid var(--accent)' }}>
                      <form onSubmit={createTeamBulk}>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:10 }}>
                          <div className="form-group" style={{ marginBottom:0 }}>
                            <label className="form-label">Team Name *</label>
                            <input className="form-input" value={bulkTeamName} onChange={e => setBulkTeamName(e.target.value)} required />
                          </div>
                          <div className="form-group" style={{ marginBottom:0 }}>
                            <label className="form-label">Team Logo</label>
                            <input className="form-input" type="file" accept="image/*" onChange={e => setBulkTeamLogo(e.target.files[0])} />
                          </div>
                        </div>

                        <div style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--t2)', marginBottom:8 }}>
                          Squad Checkpoints: Players {enteredPlayerCount}/11 · Bowlers/All-rounders {enteredBowlerCount}/2 minimum
                        </div>

                        <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:'50vh', overflowY:'auto', paddingRight:4 }}>
                          {bulkPlayers.map((player, index) => (
                            <div key={index} className="glass-card" style={{
                              padding:'10px 12px',
                              borderLeft: bulkCaptainIndex===index ? '3px solid var(--gold)' : '3px solid transparent',
                              background: bulkCaptainIndex===index ? 'var(--gold-dim)' : undefined,
                            }}>
                              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                                <span style={{ fontFamily:'var(--font-mono)', fontWeight:700, fontSize:'0.72rem', color:'var(--t3)', minWidth:56 }}>S No {index + 1}</span>
                                <label style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', fontSize:'0.72rem', color: bulkCaptainIndex===index ? 'var(--gold)' : 'var(--t3)', marginLeft:'auto' }}>
                                  <input type="radio" name="captain" checked={bulkCaptainIndex===index} onChange={() => setBulkCaptainIndex(index)} />
                                  Captain
                                </label>
                              </div>
                              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:6 }}>
                                <input className="form-input" style={{ fontSize:'0.8rem' }} value={player.name} onChange={e => handleBulkPlayerChange(index,'name',e.target.value)} placeholder="Player Name *" required />
                                <select className="form-select" style={{ fontSize:'0.8rem' }} value={player.role} onChange={e => handleBulkPlayerChange(index,'role',e.target.value)}>
                                  <option value="batsman">Batsman</option>
                                  <option value="bowler">Bowler</option>
                                  <option value="all-rounder">All-Rounder</option>
                                  <option value="wicket-keeper">WK</option>
                                </select>
                              </div>
                              <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:6 }}>
                                <input className="form-input" style={{ fontSize:'0.8rem' }} type="number" value={player.jersey_number} onChange={e => handleBulkPlayerChange(index,'jersey_number',e.target.value)} placeholder="No." />
                                <input className="form-input" style={{ fontSize:'0.78rem', padding:'6px' }} type="file" accept="image/*" onChange={e => handleBulkPhotoChange(index,e.target.files[0])} />
                              </div>
                            </div>
                          ))}
                        </div>

                        <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:10 }}>
                          <button type="button" className="btn btn-secondary" onClick={() => setShowInlineTeamForm(false)}>Cancel</button>
                          <button type="submit" className="btn btn-primary" disabled={!canSubmitBulkTeam}>Save Team & Squad</button>
                        </div>
                      </form>
                    </div>
                  )}
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {teams.map(team => (
                      <div key={team.id} className="glass-card" style={{
                        padding:'10px 12px', cursor: inlineEditTeamId === team.id ? 'default' : 'pointer',
                        borderLeft: selectedTeam === team.id ? '3px solid var(--accent)' : '3px solid transparent',
                      }} onClick={() => { if (inlineEditTeamId !== team.id) setSelectedTeam(team.id) }}>
                        {inlineEditTeamId === team.id ? (
                          <div style={{ display:'flex', flexDirection:'column', gap:7 }} onClick={e => e.stopPropagation()}>
                            <input
                              className="form-input"
                              value={inlineTeamDraft.name}
                              onChange={e => setInlineTeamDraft(p => ({ ...p, name: e.target.value }))}
                              placeholder="Team Name"
                              style={{ fontSize:'0.77rem' }}
                            />
                            <input
                              className="form-input"
                              value={inlineTeamDraft.captain_name}
                              onChange={e => setInlineTeamDraft(p => ({ ...p, captain_name: e.target.value }))}
                              placeholder="Captain Name"
                              style={{ fontSize:'0.77rem' }}
                            />
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
                              <input className="form-input" type="file" accept="image/*" onChange={e => setInlineTeamLogo(e.target.files[0] || null)} style={{ fontSize:'0.72rem', padding:'5px' }} />
                              <input className="form-input" type="file" accept="image/*" onChange={e => setInlineCaptainPhoto(e.target.files[0] || null)} style={{ fontSize:'0.72rem', padding:'5px' }} />
                            </div>
                            <div style={{ display:'flex', gap:6 }}>
                              <button className="btn btn-sm btn-primary" style={{ flex:1 }} onClick={() => saveInlineTeamEdit(team.id)}>Save</button>
                              <button className="btn btn-sm btn-secondary" style={{ flex:1 }} onClick={cancelInlineTeamEdit}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          {team.logo
                            ? <img src={team.logo} alt="" style={{ width:36, height:36, borderRadius:'50%', objectFit:'cover', flexShrink:0, border:'1px solid var(--glass-bd)' }} />
                            : <div style={{ width:36, height:36, borderRadius:'50%', background:'var(--g-accent)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:'0.9rem', color:'#fff', flexShrink:0 }}>{team.name?.charAt(0)}</div>}
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontWeight:700, fontSize:'0.88rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{team.name}</div>
                            <div style={{ fontSize:'0.68rem', color:'var(--t3)', marginTop:1 }}>
                              {team.captain_name && <span>🎖 {team.captain_name} · </span>}
                              {team.player_count} players
                            </div>
                          </div>
                          <div style={{ display:'flex', gap:5, flexShrink:0 }}>
                            <button className="btn btn-sm" style={{ padding:'3px 9px', fontSize:'0.68rem', background:'var(--accent-dim)', color:'var(--accent)', border:'1px solid var(--accent)' }}
                              onClick={e => { e.stopPropagation(); setSelectedTeam(team.id); setActiveSection('players') }}>Squad</button>
                            <button className="btn btn-sm btn-secondary" style={{ padding:'3px 9px', fontSize:'0.68rem' }}
                              onClick={e => { e.stopPropagation(); startInlineTeamEdit(team) }}>Edit</button>
                            <button className="btn btn-sm btn-danger" style={{ padding:'3px 9px', fontSize:'0.68rem' }}
                              onClick={e => { e.stopPropagation(); deleteTeam(team.id) }}>✕</button>
                          </div>
                        </div>
                        )}
                        <BannerSection>
                          <BannerBtn label="Squad" busy={isBusy(`squad_${team.id}`)} onClick={e => { e.stopPropagation(); handleSquadBanner(team) }} />
                          <BannerBtn label="Captain" busy={isBusy(`captain_${team.id}`)} onClick={e => { e.stopPropagation(); handleCaptainPoster(team) }} />
                        </BannerSection>
                      </div>
                    ))}
                    {teams.length === 0 && <div className="empty-state"><div className="empty-state-icon">👥</div><h3>No Teams Yet</h3></div>}
                  </div>
                </>
            }
          </div>
        )}

        {/* ═══ SQUADS ══════════════════════════════════════════════ */}
        {activeSection === 'players' && (
          <div>
            {!selectedTeam
              ? <div className="empty-state"><div className="empty-state-icon">👈</div><h3>Select a Team First</h3></div>
              : <>
                  <SectionHead
                    title={`Squad — ${teams.find(t=>t.id===selectedTeam)?.name || ''}`}
                    action={
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        <BannerBtn label="Banner" icon="🎨" busy={isGeneratingSquadBanner} busyLabel="…" onClick={() => generateSquadBannerFromSquads(selectedTeam)} />
                        <button className="btn btn-primary btn-sm" onClick={() => setShowModal('addSinglePlayer')}>+ Player</button>
                      </div>
                    }
                  />
                  {/* Squad team selector */}
                  {teams.length > 1 && (
                    <div style={{ display:'flex', gap:6, flexWrap:'nowrap', overflowX:'auto', marginBottom:12, paddingBottom:4, scrollbarWidth:'none' }}>
                      {teams.map(t => (
                        <button key={t.id} onClick={() => setSelectedTeam(t.id)}
                          style={{ padding:'5px 12px', borderRadius:'var(--r-md)', border:'1px solid var(--glass-bd)', fontSize:'0.72rem', fontWeight:700, whiteSpace:'nowrap', flexShrink:0, cursor:'pointer', fontFamily:'var(--font-display)',
                            background: selectedTeam===t.id ? 'var(--accent-dim)' : 'var(--glass-bg)',
                            color: selectedTeam===t.id ? 'var(--accent)' : 'var(--t2)',
                            borderColor: selectedTeam===t.id ? 'var(--accent)' : 'var(--glass-bd)' }}>
                          {t.name}
                        </button>
                      ))}
                    </div>
                  )}
                  {/* Player rows */}
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {teamPlayers.map((player, idx) => (
                      <div key={player.id} className="glass-card" style={{ overflow:'hidden' }}>
                        {inlineEditPlayerId === player.id ? (
                          <div style={{ padding:'10px 14px', display:'flex', flexDirection:'column', gap:8 }}>
                            <input className="form-input" value={inlinePlayerDraft.name} onChange={e => setInlinePlayerDraft(p=>({...p,name:e.target.value}))} placeholder="Name" style={{ fontSize:'0.82rem' }} />
                            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                              <select className="form-select" value={inlinePlayerDraft.role} onChange={e => setInlinePlayerDraft(p=>({...p,role:e.target.value}))} style={{ fontSize:'0.8rem' }}>
                                <option value="batsman">Batsman</option>
                                <option value="bowler">Bowler</option>
                                <option value="all-rounder">All-Rounder</option>
                                <option value="wicket-keeper">WK</option>
                              </select>
                              <input className="form-input" type="number" value={inlinePlayerDraft.jersey_number} onChange={e => setInlinePlayerDraft(p=>({...p,jersey_number:e.target.value}))} placeholder="Jersey #" style={{ fontSize:'0.82rem' }} />
                            </div>
                            <div style={{ display:'flex', gap:6 }}>
                              <button className="btn btn-sm btn-primary" style={{ flex:1, padding:'5px' }} onClick={() => saveInlinePlayerEdit(player.id)}>Save</button>
                              <button className="btn btn-sm btn-secondary" style={{ flex:1, padding:'5px' }} onClick={cancelInlinePlayerEdit}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', background: idx%2===0?'transparent':'var(--glass-bg)' }}>
                            {player.photo
                              ? <img src={player.photo} alt="" style={{ width:32, height:32, borderRadius:'50%', objectFit:'cover', objectPosition:'top', flexShrink:0 }} />
                              : <div style={{ width:32, height:32, borderRadius:'50%', background:'var(--accent-dim)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.75rem', fontWeight:700, color:'var(--accent)', flexShrink:0 }}>{player.name?.charAt(0)}</div>}
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontWeight:600, fontSize:'0.82rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{player.name}</div>
                              <div style={{ fontSize:'0.63rem', color:'var(--t3)' }}>{player.role}</div>
                            </div>
                            {player.jersey_number && (
                              <div style={{ width:22, height:22, borderRadius:'50%', background:'var(--accent-dim)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.6rem', fontFamily:'var(--font-mono)', fontWeight:700, color:'var(--accent)', flexShrink:0 }}>{player.jersey_number}</div>
                            )}
                            <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                              <button className="btn btn-sm btn-secondary" style={{ padding:'2px 8px', fontSize:'0.64rem' }} onClick={() => startInlinePlayerEdit(player)}>Edit</button>
                              <button className="btn btn-sm btn-danger" style={{ padding:'2px 8px', fontSize:'0.64rem' }} onClick={() => deletePlayer(player.id)}>✕</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    {teamPlayers.length === 0 && <div className="empty-state"><div className="empty-state-icon">🎽</div><h3>No Players Added</h3></div>}
                  </div>
                </>
            }
          </div>
        )}

        {/* ═══ FIXTURES ════════════════════════════════════════════ */}
        {activeSection === 'fixtures' && (
          <div>
            {!selectedLeague
              ? <div className="empty-state"><h3>Select a League First</h3></div>
              : <>
                  <SectionHead
                    title="Fixtures"
                    action={
                      <div style={{ display:'flex', gap:6 }}>
                        <button className="btn btn-sm btn-secondary" style={{ padding:'5px 10px', fontSize:'0.72rem' }} onClick={clearUpcomingFixtures}>Clear</button>
                        <button className="btn btn-sm btn-gold" onClick={() => setShowModal('fixtureSetup')}>⚡ Generate</button>
                      </div>
                    }
                  />
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {matches.map(m => (
                      <div key={m.id} className="glass-card" style={{ padding:'11px 14px' }}>
                        {/* Match header row */}
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                          <span style={{ fontSize:'0.65rem', color:'var(--t3)', fontFamily:'var(--font-display)', fontWeight:700 }}>#{m.match_number}</span>
                          <span className={`badge ${m.status==='live'?'badge-live':m.status==='completed'?'badge-completed':'badge-upcoming'}`}>{m.status}</span>
                          {m.date && <span style={{ fontSize:'0.65rem', color:'var(--t3)', marginLeft:'auto' }}>{m.date}{m.time ? ' · '+m.time : ''}</span>}
                        </div>
                        {/* VS row — compact inline */}
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                          <span style={{ flex:1, fontWeight:700, fontSize:'0.84rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.team_a_name}</span>
                          <span style={{ fontFamily:'var(--font-display)', fontSize:'0.65rem', fontWeight:900, color:'var(--t3)', flexShrink:0, padding:'2px 6px', background:'var(--glass-bg)', borderRadius:'var(--r-sm)' }}>VS</span>
                          <span style={{ flex:1, fontWeight:700, fontSize:'0.84rem', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', textAlign:'right' }}>{m.team_b_name}</span>
                        </div>
                        {/* Actions */}
                        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                          {m.status==='upcoming' && (
                            <button
                              className="btn btn-sm btn-primary"
                              style={{ padding:'4px 10px', fontSize:'0.72rem' }}
                              onClick={() => startMatch(m.id)}
                              disabled={!canStartScheduledMatch(m)}
                              title={!canStartScheduledMatch(m) ? `Starts at ${m.date}${m.time ? ` ${m.time}` : ''}` : 'Start match'}
                            >
                              ▶ Start
                            </button>
                          )}
                          {m.status==='live' && <button className="btn btn-sm btn-gold" style={{ padding:'4px 10px', fontSize:'0.72rem' }} onClick={() => navigate(`/admin/scoring/${m.id}`)}>◉ Score</button>}
                          {m.status==='upcoming' && <button className="btn btn-sm btn-danger" style={{ padding:'4px 10px', fontSize:'0.72rem' }} onClick={() => deleteFixture(m.id)}>Delete</button>}
                        </div>
                        <BannerSection>
                          <BannerBtn label="VS Banner" busy={isBusy(`vs_${m.id}`)} onClick={() => handleVsBanner(m)} />
                        </BannerSection>
                      </div>
                    ))}
                    {matches.length === 0 && <div className="empty-state"><div className="empty-state-icon">📅</div><h3>No Fixtures</h3></div>}
                  </div>
                </>
            }
          </div>
        )}

        {/* ═══ LIVE SCORING ════════════════════════════════════════ */}
        {activeSection === 'scoring' && (
          <div>
            <SectionHead title="Live Scoring" />
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {matches.filter(m=>m.status==='live').map(m => (
                <div key={m.id} className="glass-card" style={{ padding:'11px 14px', borderLeft:'3px solid var(--red)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <span className="badge badge-live">● LIVE</span>
                    <span style={{ fontSize:'0.65rem', color:'var(--t3)', fontFamily:'var(--font-display)' }}>#{m.match_number}</span>
                  </div>
                  <div style={{ fontWeight:700, fontSize:'0.88rem', marginBottom:8 }}>
                    {m.team_a_name} <span style={{ color:'var(--t3)', fontWeight:400, fontSize:'0.78rem' }}>vs</span> {m.team_b_name}
                  </div>
                  <button className="btn btn-primary btn-sm" style={{ width:'100%', marginBottom:6 }} onClick={() => navigate(`/admin/scoring/${m.id}`)}>Open Scoring Interface</button>
                  <BannerSection>
                    <BannerBtn label="1st Inn." busy={isBusy(`innings_${m.id}_first`)} onClick={() => handleInningsBanner(m,'first')} />
                    <BannerBtn label="2nd Inn." busy={isBusy(`innings_${m.id}_second`)} onClick={() => handleInningsBanner(m,'second')} />
                  </BannerSection>
                </div>
              ))}
              {matches.filter(m=>m.status==='live').length === 0 && (
                <div className="empty-state"><div className="empty-state-icon">🔴</div><h3>No Live Matches</h3></div>
              )}
            </div>
          </div>
        )}

        {/* ═══ RESULTS ════════════════════════════════════════════ */}
        {activeSection === 'results' && (
          <div>
            <SectionHead title="Results" />
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {matches.filter(m=>m.status==='completed').map(m => (
                <div key={m.id} className="glass-card" style={{ padding:'11px 14px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                    <span style={{ fontSize:'0.65rem', color:'var(--t3)', fontFamily:'var(--font-display)', fontWeight:700 }}>#{m.match_number}</span>
                    <span className="badge badge-completed">done</span>
                  </div>
                  <div style={{ fontWeight:700, fontSize:'0.88rem', marginBottom:4 }}>
                    {m.team_a_name} <span style={{ color:'var(--t3)', fontWeight:400, fontSize:'0.78rem' }}>vs</span> {m.team_b_name}
                  </div>
                  {m.result_summary && <div style={{ fontSize:'0.75rem', color:'var(--accent)', marginBottom:8 }}>{m.result_summary}</div>}
                  <button className="btn btn-sm btn-secondary" style={{ padding:'4px 10px', fontSize:'0.72rem' }} onClick={() => navigate(`/match/${m.id}/scorecard`)}>View Scorecard</button>
                  <BannerSection>
                    <BannerBtn label="Result" busy={isBusy(`result_${m.id}`)} onClick={() => handleResultBanner(m)} />
                    <BannerBtn label="Summary" busy={isBusy(`summary_${m.id}`)} onClick={() => handleSummaryBanner(m)} />
                  </BannerSection>
                </div>
              ))}
              {matches.filter(m=>m.status==='completed').length === 0 && (
                <div className="empty-state"><div className="empty-state-icon">📊</div><h3>No Results Yet</h3></div>
              )}
            </div>
          </div>
        )}

        {/* ═══ GRAPHICS ════════════════════════════════════════════ */}
        {activeSection === 'graphics' && (
          <GraphicsGeneratorPanel initialLeagueId={selectedLeague} initialTeamId={selectedTeam} />
        )}

      </div>

      {/* ── Toast ── */}
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* ═══════════ MODALS ═══════════════════════════════════════ */}

      {showModal === 'createLeague' && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Create League</h3><button className="modal-close" onClick={() => setShowModal(null)}>×</button></div>
            <form onSubmit={createLeague}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">League Name *</label><input className="form-input" value={leagueForm.name} onChange={e => setLeagueForm({...leagueForm,name:e.target.value})} required /></div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">City</label><input className="form-input" value={leagueForm.city} onChange={e => setLeagueForm({...leagueForm,city:e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Venue</label><input className="form-input" value={leagueForm.venue} onChange={e => setLeagueForm({...leagueForm,venue:e.target.value})} /></div>
                </div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Organizer</label><input className="form-input" value={leagueForm.organizer} onChange={e => setLeagueForm({...leagueForm,organizer:e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Season</label><input className="form-input" value={leagueForm.season} onChange={e => setLeagueForm({...leagueForm,season:e.target.value})} /></div>
                </div>
                <div className="form-group"><label className="form-label">League Logo</label><input className="form-input" type="file" accept="image/*" onChange={e => setLeagueLogo(e.target.files[0])} /></div>
                <div className="form-group">
                  <label className="form-label">Sponsors</label>
                  {sponsorInputs.map((s,i) => (
                    <div key={i} className="form-grid" style={{ marginBottom:8 }}>
                      <input className="form-input" placeholder={`Sponsor ${i+1} name`} value={s.name} onChange={e => { const n=[...sponsorInputs]; n[i]={...n[i],name:e.target.value}; setSponsorInputs(n) }} />
                      <input className="form-input" type="file" accept="image/*" onChange={e => { const n=[...sponsorInputs]; n[i]={...n[i],logo:e.target.files[0]||null}; setSponsorInputs(n) }} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer"><button type="submit" className="btn btn-primary">Create League</button></div>
            </form>
          </div>
        </div>
      )}

      {showModal === 'editLeague' && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Edit League</h3><button className="modal-close" onClick={() => setShowModal(null)}>×</button></div>
            <form onSubmit={updateLeague}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">League Name *</label><input className="form-input" value={editLeagueForm.name} onChange={e => setEditLeagueForm({...editLeagueForm,name:e.target.value})} required /></div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">City</label><input className="form-input" value={editLeagueForm.city} onChange={e => setEditLeagueForm({...editLeagueForm,city:e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Venue</label><input className="form-input" value={editLeagueForm.venue} onChange={e => setEditLeagueForm({...editLeagueForm,venue:e.target.value})} /></div>
                </div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Owner / Organizer</label><input className="form-input" value={editLeagueForm.organizer} onChange={e => setEditLeagueForm({...editLeagueForm,organizer:e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Season</label><input className="form-input" value={editLeagueForm.season} onChange={e => setEditLeagueForm({...editLeagueForm,season:e.target.value})} /></div>
                </div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Format</label>
                    <select className="form-select" value={editLeagueForm.format} onChange={e => setEditLeagueForm({...editLeagueForm,format:e.target.value})}>
                      <option value="round-robin">Round Robin</option>
                      <option value="knockout">Knockout</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Overs / Innings</label><input className="form-input" type="number" min="1" value={editLeagueForm.overs_per_innings} onChange={e => setEditLeagueForm({...editLeagueForm,overs_per_innings:e.target.value})} /></div>
                </div>
                <div className="form-group"><label className="form-label">Status</label>
                  <select className="form-select" value={editLeagueForm.status} onChange={e => setEditLeagueForm({...editLeagueForm,status:e.target.value})}>
                    <option value="upcoming">Upcoming</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Replace League Logo</label><input className="form-input" type="file" accept="image/*" onChange={e => setEditLeagueLogo(e.target.files[0])} /></div>
              </div>
              <div className="modal-footer"><button type="submit" className="btn btn-primary">Save League</button></div>
            </form>
          </div>
        </div>
      )}

      {showModal === 'leagueBanner' && generatedLeagueBanner && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal modal-large" onClick={e => e.stopPropagation()} style={{ maxWidth:'1200px' }}>
            <div className="modal-header">
              <h3>League Banner</h3>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn btn-gold btn-sm" onClick={downloadLeagueBanner}>Download PNG</button>
                <button className="modal-close" onClick={() => setShowModal(null)}>×</button>
              </div>
            </div>
            <div className="modal-body" style={{ overflowX:'auto', background:'#020617' }}>
              <div ref={leagueBannerRef} style={{ width:'1920px', height:'600px', borderRadius:16, overflow:'hidden', position:'relative', background:'linear-gradient(120deg,#020617,#0f172a 45%,#1e293b)' }}>
                <div style={{ position:'absolute', inset:0, background:'radial-gradient(circle at 70% 20%,rgba(56,189,248,0.25),transparent 40%)' }} />
                <div style={{ position:'relative', zIndex:2, display:'grid', gridTemplateColumns:'1.3fr 1fr', height:'100%', padding:'34px 42px', color:'#fff' }}>
                  <div>
                    {generatedLeagueBanner.logo && <img src={generatedLeagueBanner.logo} alt="" style={{ width:120, height:120, borderRadius:'50%', objectFit:'cover' }} />}
                    <h1 style={{ margin:'18px 0 8px', fontSize:64, lineHeight:1.02 }}>{generatedLeagueBanner.name}</h1>
                    <p style={{ fontSize:24, color:'#cbd5e1' }}>{generatedLeagueBanner.city || 'City'} · {generatedLeagueBanner.organizer || 'Organizer'}</p>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:12 }}>
                    {generatedLeagueBanner.sponsors?.map((s,idx) => (
                      <div key={idx} style={{ background:'rgba(15,23,42,0.7)', border:'1px solid rgba(148,163,184,0.3)', borderRadius:14, padding:'8px 12px', minWidth:220, textAlign:'right' }}>{s.name}</div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal === 'fixtureSetup' && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth:860 }}>
            <div className="modal-header"><h3>Fixture Setup</h3><button className="modal-close" onClick={() => setShowModal(null)}>×</button></div>
            <form onSubmit={submitFixtureSetup}>
              <div className="modal-body">
                <div className="glass-card" style={{ padding:'10px 12px', marginBottom:10, borderLeft:'3px solid var(--gold)' }}>
                  <div style={{ fontSize:'0.78rem', color:'var(--t2)', lineHeight:1.45 }}>
                    <div>Format: <strong style={{ color:'var(--t1)' }}>{selectedLeagueObj?.format || fixtureForm.format}</strong></div>
                    <div>Teams: <strong style={{ color:'var(--t1)' }}>{teams.length}</strong> · Overs: <strong style={{ color:'var(--t1)' }}>{selectedLeagueObj?.overs_per_innings || fixtureForm.overs_per_innings}</strong></div>
                    <div>Venue: <strong style={{ color:'var(--t1)' }}>{selectedLeagueObj?.venue || fixtureForm.venue || 'N/A'}</strong></div>
                  </div>
                </div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Start Date</label><input className="form-input" type="date" value={fixtureForm.match_date} onChange={e => setFixtureForm(p=>({...p,match_date:e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Time</label><input className="form-input" type="time" value={fixtureForm.match_time} onChange={e => setFixtureForm(p=>({...p,match_time:e.target.value}))} /></div>
                </div>
                <label style={{ display:'flex', alignItems:'center', gap:8, marginTop:6, fontSize:'0.82rem', cursor:'pointer' }}>
                  <input type="checkbox" checked={fixtureForm.auto_generate_vs} onChange={e => setFixtureForm(p=>({...p,auto_generate_vs:e.target.checked}))} />
                  Auto-create VS banners after generation
                </label>
                <div style={{ marginTop:14, display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <span style={{ fontWeight:700, fontSize:'0.82rem' }}>Fixture Draft</span>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={createFixtureDrafts}>Preview Draft</button>
                </div>
                {fixtureDrafts.length > 0 && (
                  <div style={{ overflowX:'auto', borderRadius:'var(--r-md)', border:'1px solid var(--glass-bd)' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.78rem' }}>
                      <thead>
                        <tr style={{ background:'var(--glass-bg)' }}>
                          <th style={{ padding:'7px 10px', textAlign:'left', fontWeight:700, color:'var(--t3)', whiteSpace:'nowrap' }}>Match</th>
                          <th style={{ padding:'7px 10px', textAlign:'left', fontWeight:700, color:'var(--t3)' }}>Date</th>
                          <th style={{ padding:'7px 10px', textAlign:'left', fontWeight:700, color:'var(--t3)' }}>Time</th>
                          <th style={{ padding:'7px 8px' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {fixtureDrafts.map((row,idx) => (
                          <tr key={`${row.team_a_id}-${row.team_b_id}-${idx}`} style={{ borderTop:'1px solid var(--glass-bd)' }}>
                            <td style={{ padding:'6px 10px', whiteSpace:'nowrap', fontWeight:600 }}>{row.team_a_name} vs {row.team_b_name}</td>
                            <td style={{ padding:'6px 8px' }}><input className="form-input" type="date" value={row.date||''} onChange={e => updateFixtureDraft(idx,'date',e.target.value)} style={{ minWidth:130, fontSize:'0.78rem' }} /></td>
                            <td style={{ padding:'6px 8px' }}><input className="form-input" type="time" value={row.time||''} onChange={e => updateFixtureDraft(idx,'time',e.target.value)} style={{ minWidth:110, fontSize:'0.78rem' }} /></td>
                            <td style={{ padding:'6px 8px' }}><button type="button" className="btn btn-sm btn-danger" style={{ padding:'3px 8px', fontSize:'0.68rem' }} onClick={() => removeFixtureDraft(idx)}>✕</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-gold" disabled={fixtureGenerating}>{fixtureGenerating ? 'Generating…' : 'Generate Fixtures'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal === 'addSinglePlayer' && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Add Player</h3><button className="modal-close" onClick={() => setShowModal(null)}>×</button></div>
            <form onSubmit={addPlayer}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Player Name *</label><input className="form-input" value={playerForm.name} onChange={e => setPlayerForm({...playerForm,name:e.target.value})} required /></div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Role</label>
                    <select className="form-select" value={playerForm.role} onChange={e => setPlayerForm({...playerForm,role:e.target.value})}>
                      <option value="batsman">Batsman</option>
                      <option value="bowler">Bowler</option>
                      <option value="all-rounder">All-Rounder</option>
                      <option value="wicket-keeper">Wicket Keeper</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Jersey #</label><input className="form-input" type="number" value={playerForm.jersey_number} onChange={e => setPlayerForm({...playerForm,jersey_number:e.target.value})} placeholder="18" /></div>
                </div>
                <div className="form-group"><label className="form-label">Photo</label><input className="form-input" type="file" accept="image/*" onChange={e => setPlayerPhoto(e.target.files[0])} /></div>
              </div>
              <div className="modal-footer"><button type="submit" className="btn btn-primary">Add Player</button></div>
            </form>
          </div>
        </div>
      )}

      {showModal === 'editPlayer' && (
        <div className="modal-overlay" onClick={() => setShowModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h3>Edit Player</h3><button className="modal-close" onClick={() => setShowModal(null)}>×</button></div>
            <form onSubmit={updatePlayer}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={editPlayerForm.name} onChange={e => setEditPlayerForm({...editPlayerForm,name:e.target.value})} required /></div>
                <div className="form-grid">
                  <div className="form-group"><label className="form-label">Role</label>
                    <select className="form-select" value={editPlayerForm.role} onChange={e => setEditPlayerForm({...editPlayerForm,role:e.target.value})}>
                      <option value="batsman">Batsman</option>
                      <option value="bowler">Bowler</option>
                      <option value="all-rounder">All-Rounder</option>
                      <option value="wicket-keeper">Wicket Keeper</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Jersey #</label><input className="form-input" type="number" value={editPlayerForm.jersey_number} onChange={e => setEditPlayerForm({...editPlayerForm,jersey_number:e.target.value})} /></div>
                </div>
                <div className="form-group"><label className="form-label">Replace Photo</label><input className="form-input" type="file" accept="image/*" onChange={e => setEditPlayerPhoto(e.target.files[0])} /></div>
              </div>
              <div className="modal-footer"><button type="submit" className="btn btn-primary">Save Changes</button></div>
            </form>
          </div>
        </div>
      )}

    </div>
  )
}