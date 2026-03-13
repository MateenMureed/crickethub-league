import { useEffect, useMemo, useState } from 'react'

const API = '/api'

/* ─── Canvas Helpers ──────────────────────────────────────────────── */

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

function fitText(ctx, text, maxWidth, startSize = 72, minSize = 14, weight = '900') {
  let size = startSize
  while (size >= minSize) {
    ctx.font = `${weight} ${size}px "Barlow Condensed", "Oswald", sans-serif`
    if (ctx.measureText(text).width <= maxWidth) break
    size -= 1
  }
  return size
}

function drawCover(ctx, img, x, y, w, h) {
  if (!img) return
  const scale = Math.max(w / img.width, h / img.height)
  const sw = w / scale, sh = h / scale
  const sx = (img.width - sw) / 2, sy = (img.height - sh) / 2
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h)
}

function drawPassport(ctx, img, x, y, w, h) {
  ctx.save()
  ctx.fillStyle = '#0d1730'
  ctx.fillRect(x, y, w, h)
  if (img) {
    const scale = Math.max(w / img.width, h / img.height)
    const sw = w / scale, sh = h / scale
    const sx = (img.width - sw) / 2, sy = (img.height - sh) / 3
    ctx.drawImage(img, sx, Math.max(0, sy), sw, sh, x, y, w, h)
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'
  ctx.lineWidth = 1.5
  ctx.strokeRect(x, y, w, h)
  ctx.restore()
}

/* Gold accent bar */
function goldBar(ctx, x, y, w, h = 6) {
  const g = ctx.createLinearGradient(x, y, x + w, y)
  g.addColorStop(0, '#f0b429')
  g.addColorStop(0.5, '#ffe066')
  g.addColorStop(1, '#c97b10')
  ctx.fillStyle = g
  ctx.fillRect(x, y, w, h)
}

/* Diagonal swoosh overlay */
function swoosh(ctx, W, H, color = 'rgba(255,255,255,0.04)') {
  ctx.save()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(W * 0.55, 0)
  ctx.lineTo(W * 0.72, 0)
  ctx.lineTo(W * 0.62, H)
  ctx.lineTo(W * 0.45, H)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/* Dot matrix texture */
function dotMatrix(ctx, W, H) {
  ctx.save()
  ctx.fillStyle = 'rgba(255,255,255,0.05)'
  for (let i = 0; i < W; i += 28) {
    for (let j = 0; j < H; j += 28) {
      ctx.beginPath()
      ctx.arc(i, j, 1.2, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

/* Bold label + value row */
function statRow(ctx, label, value, x, y, labelColor = '#94a3b8', valueColor = '#ffffff', size = 32) {
  ctx.fillStyle = labelColor
  ctx.font = `600 ${size * 0.7}px "Barlow Condensed", sans-serif`
  ctx.fillText(label.toUpperCase(), x, y)
  ctx.fillStyle = valueColor
  ctx.font = `900 ${size}px "Barlow Condensed", sans-serif`
  ctx.fillText(value, x, y + size * 1.05)
}

function createCanvas(w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = w; canvas.height = h
  return { canvas, ctx: canvas.getContext('2d') }
}

async function saveBanner({ category, fileName, imageData }) {
  const res = await fetch(`${API}/banners/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, fileName, imageData })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Failed to save banner')
  return data
}

function downloadPng(dataUrl, fileName) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = fileName
  link.click()
}

/* ─── Banner Generators ───────────────────────────────────────────── */

async function _generateLeagueBanner(leagueId) {
  const leagueDetails = await fetch(`${API}/leagues/${leagueId}`).then(r => r.json())
  const logo = await loadImage(leagueDetails.logo)
  const W = 1920, H = 720
  const { canvas, ctx } = createCanvas(W, H)

  // Deep navy base
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#020b1c')
  bg.addColorStop(0.6, '#071633')
  bg.addColorStop(1, '#03091a')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Right panel highlight
  const rp = ctx.createLinearGradient(W * 0.55, 0, W, 0)
  rp.addColorStop(0, 'rgba(240,180,41,0.0)')
  rp.addColorStop(1, 'rgba(240,180,41,0.12)')
  ctx.fillStyle = rp
  ctx.fillRect(0, 0, W, H)

  dotMatrix(ctx, W, H)
  swoosh(ctx, W, H, 'rgba(255,255,255,0.03)')

  // Gold top bar
  goldBar(ctx, 0, 0, W, 8)

  // Logo circle backdrop
  ctx.save()
  ctx.beginPath()
  ctx.arc(140, H / 2, 110, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(240,180,41,0.12)'
  ctx.fill()
  ctx.restore()
  if (logo) drawCover(ctx, logo, 60, H / 2 - 90, 160, 160)

  // Title
  const title = (leagueDetails.name || 'LEAGUE').toUpperCase()
  const season = (leagueDetails.season || '').toUpperCase()
  const titleSize = fitText(ctx, title, 1200, 92, 36)
  ctx.fillStyle = '#ffffff'
  ctx.font = `900 ${titleSize}px "Barlow Condensed", "Oswald", sans-serif`
  ctx.fillText(title, 280, 290)

  goldBar(ctx, 280, 310, 560, 5)

  ctx.fillStyle = '#f0b429'
  ctx.font = `700 42px "Barlow Condensed", sans-serif`
  ctx.fillText(season, 280, 370)

  ctx.fillStyle = '#94a3b8'
  ctx.font = `600 28px "Barlow Condensed", sans-serif`
  ctx.fillText(`${leagueDetails.city || ''}  ·  ${leagueDetails.organizer || ''}`, 280, 420)

  // Sponsors strip
  const sponsors = (leagueDetails.sponsors || []).map(s => s.name).slice(0, 5).join('   ·   ') || 'Official Partners'
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.fillRect(0, H - 90, W, 90)
  goldBar(ctx, 0, H - 90, W, 3)
  ctx.fillStyle = '#64748b'
  ctx.font = `600 20px "Barlow Condensed", sans-serif`
  ctx.fillText('POWERED BY', 280, H - 52)
  ctx.fillStyle = '#e2e8f0'
  ctx.font = `700 28px "Barlow Condensed", sans-serif`
  ctx.fillText(sponsors, 460, H - 48)

  // Gold bottom bar
  goldBar(ctx, 0, H - 6, W, 6)

  return { canvas, id: leagueDetails.id, name: 'league_banner' }
}

/* ── ICC-style corner bracket around a circular player photo ── */
function drawPlayerCard(ctx, img, cx, cy, r, name, accentColor, nameFontSize) {
  nameFontSize = nameFontSize || 20

  // Dark circle background
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.fillStyle = '#1a2340'
  ctx.fill()
  ctx.restore()

  if (img) {
    ctx.save()
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.clip()
    // FIT (contain) — entire image visible, no zoom crop
    const diameter = r * 2
    const scale = Math.min(diameter / img.width, diameter / img.height)
    const dw = img.width * scale
    const dh = img.height * scale
    const dx = cx - dw / 2
    const dy = cy - dh / 2 - dh * 0.04   // nudge up slightly to favour faces
    ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh)
    ctx.restore()
  }

  // Outer ring
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r + 3, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.12)'
  ctx.lineWidth = 2
  ctx.stroke()
  ctx.restore()

  // ICC-style corner brackets — sized proportionally to radius
  const pad = Math.round(r * 0.14)
  const bx = cx - r - pad, by = cy - r - pad
  const bw = (r + pad) * 2, bh = (r + pad) * 2
  const bl = Math.round(r * 0.28)
  const bth = Math.max(2, Math.round(r * 0.04))
  ctx.save()
  ctx.strokeStyle = accentColor
  ctx.lineWidth = bth
  ctx.lineCap = 'square'
  ctx.beginPath(); ctx.moveTo(bx, by + bl); ctx.lineTo(bx, by); ctx.lineTo(bx + bl, by); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(bx + bw - bl, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + bl); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(bx, by + bh - bl); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + bl, by + bh); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(bx + bw - bl, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by + bh - bl); ctx.stroke()
  ctx.restore()

  // Player name — two lines, centered below circle
  const nameY = cy + r + pad + nameFontSize + 4
  const lineH = nameFontSize * 1.15
  const words = (name || '').toUpperCase().split(' ')
  const mid = Math.ceil(words.length / 2)
  const line1 = words.slice(0, mid).join(' ')
  const line2 = words.slice(mid).join(' ')

  ctx.save()
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 ${nameFontSize}px "Barlow Condensed", sans-serif`
  ctx.fillText(line1, cx, nameY)
  if (line2) {
    ctx.fillStyle = '#b8cce0'
    ctx.font = `600 ${Math.round(nameFontSize * 0.88)}px "Barlow Condensed", sans-serif`
    ctx.fillText(line2, cx, nameY + lineH)
  }
  ctx.restore()
}

/* ── ICC-style diagonal geometric spike ── */
function drawSpike(ctx, W, H, color) {
  ctx.save()
  ctx.fillStyle = color
  // Top-right spike
  ctx.beginPath()
  ctx.moveTo(W - 220, 0)
  ctx.lineTo(W, 0)
  ctx.lineTo(W, 260)
  ctx.lineTo(W - 60, 0)
  ctx.closePath()
  ctx.fill()
  // Second spike offset
  ctx.beginPath()
  ctx.moveTo(W - 130, 0)
  ctx.lineTo(W - 60, 0)
  ctx.lineTo(W, 200)
  ctx.lineTo(W, 260)
  ctx.closePath()
  ctx.fillStyle = color + '88'
  ctx.fill()
  // Bottom-right spike
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(W, H - 220)
  ctx.lineTo(W, H)
  ctx.lineTo(W - 220, H)
  ctx.lineTo(W - 60, H - 60)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(W - 130, H)
  ctx.lineTo(W, H - 130)
  ctx.lineTo(W, H - 220)
  ctx.lineTo(W - 220, H)
  ctx.closePath()
  ctx.fillStyle = color + '55'
  ctx.fill()
  ctx.restore()
}

async function _generateTeamBanner(teamId) {
  const [team, players] = await Promise.all([
    fetch(`${API}/teams/${teamId}`).then(r => r.json()),
    fetch(`${API}/teams/${teamId}/players`).then(r => r.json())
  ])
  const leagueObj = team?.league_id
    ? await fetch(`${API}/leagues/${team.league_id}`).then(r => r.json()).catch(() => null)
    : null

  const captain = players.find(p => p.id === team.captain_id) || players.find(p => p.name === team.captain_name) || players[0]
  const others = players.filter(p => p.id !== captain?.id).slice(0, 15)
  const captainImg = await loadImage(captain?.photo)
  const playerImgs = await Promise.all(others.map(p => loadImage(p.photo)))
  const teamLogo = await loadImage(team.logo)

  // ICC accent color — magenta/pink like the reference
  const ACCENT = '#e91e8c'
  const ACCENT2 = '#c2185b'

  const W = 1920, H = 1080
  const { canvas, ctx } = createCanvas(W, H)

  // ── Background: deep navy-indigo gradient ──
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#0d0d2b')
  bg.addColorStop(0.5, '#0e1535')
  bg.addColorStop(1, '#0a0d26')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Subtle radial light behind players grid area
  const radial = ctx.createRadialGradient(W * 0.62, H * 0.5, 80, W * 0.62, H * 0.5, 700)
  radial.addColorStop(0, 'rgba(255,255,255,0.04)')
  radial.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = radial
  ctx.fillRect(0, 0, W, H)

  dotMatrix(ctx, W, H)

  // ── Pink geometric spikes (top-right + bottom-right) ──
  drawSpike(ctx, W, H, ACCENT)

  // ── Watermark team name behind captain ──
  ctx.save()
  ctx.globalAlpha = 0.06
  ctx.fillStyle = '#ffffff'
  ctx.font = `900 210px "Barlow Condensed", sans-serif`
  ctx.textAlign = 'left'
  const wm = (team.name || 'TEAM').toUpperCase()
  ctx.fillText(wm, -10, H - 30)
  ctx.globalAlpha = 1
  ctx.restore()

  // ── Captain left panel ──
  // Full-height portrait bleed, left side
  const capW = 390, capH = H
  if (captainImg) {
    // Draw captain image covering full left panel height
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, 0, capW, capH)
    ctx.clip()
    // Scale to fill height
    const scale = Math.max(capW / captainImg.width, capH / captainImg.height)
    const sw = capW / scale, sh = capH / scale
    const sx = (captainImg.width - sw) / 2
    const sy = Math.max(0, (captainImg.height - sh) / 5) // show upper body / face
    ctx.drawImage(captainImg, sx, sy, sw, sh, 0, 0, capW, capH)
    // Fade right edge of captain to background
    const fadeW = ctx.createLinearGradient(capW - 120, 0, capW, 0)
    fadeW.addColorStop(0, 'rgba(13,13,43,0)')
    fadeW.addColorStop(1, 'rgba(13,13,43,1)')
    ctx.fillStyle = fadeW
    ctx.fillRect(0, 0, capW, capH)
    ctx.restore()
  } else {
    // Placeholder
    ctx.fillStyle = '#151a3a'
    ctx.fillRect(0, 0, capW, capH)
  }

  // Captain name + label block (bottom-left)
  ctx.save()
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(0, H - 160, capW, 160)
  // Pink accent bar on left
  ctx.fillStyle = ACCENT
  ctx.fillRect(0, H - 160, 5, 160)

  // Team logo small top-left
  if (teamLogo) {
    drawCover(ctx, teamLogo, 16, 16, 64, 64)
  }

  // Captain name (large, two lines if needed)
  const capNameParts = (captain?.name || 'CAPTAIN').toUpperCase().split(' ')
  const capFirst = capNameParts.slice(0, -1).join(' ')
  const capLast = capNameParts[capNameParts.length - 1]
  ctx.fillStyle = '#ffffff'
  ctx.font = `900 62px "Barlow Condensed", sans-serif`
  ctx.textAlign = 'left'
  ctx.fillText(capFirst || capLast, 18, H - 96)
  if (capFirst) {
    ctx.fillText(capLast, 18, H - 28)
  }
  // CAPTAIN label
  ctx.fillStyle = ACCENT
  ctx.font = `700 22px "Barlow Condensed", sans-serif`
  ctx.fillText('(CAPTAIN)', 18, H - 8)
  ctx.restore()

  // ── Vertical divider line ──
  const divX = capW + 12
  const divGrad = ctx.createLinearGradient(divX, 60, divX, H - 60)
  divGrad.addColorStop(0, 'rgba(233,30,140,0)')
  divGrad.addColorStop(0.3, ACCENT)
  divGrad.addColorStop(0.7, ACCENT)
  divGrad.addColorStop(1, 'rgba(233,30,140,0)')
  ctx.fillStyle = divGrad
  ctx.fillRect(divX, 60, 2, H - 120)

  // ── Title block (centered in right panel) ──
  const rightX = divX + 30
  const rightW = W - rightX - 40
  const titleCx = rightX + rightW / 2

  const titleLine1 = ((team.name || 'TEAM') + ' SQUAD').toUpperCase()
  const titleLine2 = (
    team.event
    || leagueObj?.name
    || team.league_name
    || 'CRICKET LEAGUE'
  ).toUpperCase()

  ctx.save()
  ctx.textAlign = 'center'
  ctx.fillStyle = '#ffffff'
  const t1size = fitText(ctx, titleLine1, rightW - 80, 72, 28)
  ctx.font = `900 ${t1size}px "Barlow Condensed", sans-serif`
  ctx.fillText(titleLine1, titleCx, 90)

  ctx.fillStyle = '#c8d4e8'
  const t2size = fitText(ctx, titleLine2, rightW - 80, 40, 18)
  ctx.font = `700 ${t2size}px "Barlow Condensed", sans-serif`
  ctx.fillText(titleLine2, titleCx, 130)

  // Pink underline below title
  const ulW = Math.min(600, rightW * 0.6)
  const ulGrad = ctx.createLinearGradient(titleCx - ulW / 2, 0, titleCx + ulW / 2, 0)
  ulGrad.addColorStop(0, 'rgba(233,30,140,0)')
  ulGrad.addColorStop(0.5, ACCENT)
  ulGrad.addColorStop(1, 'rgba(233,30,140,0)')
  ctx.fillStyle = ulGrad
  ctx.fillRect(titleCx - ulW / 2, 140, ulW, 3)
  ctx.restore()

  // ── Player grid — auto-fit to available space ──
  const cols = 5
  const rows = Math.ceil(others.length / cols)

  // Available area: from title bottom (y=155) to canvas bottom minus bottom padding (20px)
  const gridTop    = 158
  const gridBottom = H - 22
  const gridLeft   = rightX + 10
  const gridRight  = W - 30          // leave 30px gap from spikes on right
  const availW     = gridRight - gridLeft
  const availH     = gridBottom - gridTop

  // Each card must contain: circle diameter + bracket pad each side + name lines below
  // Name block height = nameFontSize + lineH + small gap ≈ nameFontSize * 2.5
  // We solve for r from: rows * (2r + 2*pad + nameBlock) = availH
  // and cols * (2r + 2*pad + colGap) = availW
  // Estimate nameBlock = r*0.55, pad = r*0.14 each side => total vertical per card ≈ r*(2+0.28+0.55) = r*2.83
  // Estimate colGap = r*0.3 => total horizontal per card ≈ r*(2+0.28+0.30) = r*2.58
  const rFromH = availH / (rows * 2.88)
  const rFromW = availW / (cols * 2.62)
  const playerR = Math.floor(Math.min(rFromH, rFromW))

  // Derive paddings from radius
  const bracketPad  = Math.round(playerR * 0.14)
  const nameFontSz  = Math.max(14, Math.round(playerR * 0.27))
  const nameBlock   = nameFontSz * 2.5          // two name lines + gap
  const cardW       = playerR * 2 + bracketPad * 2 + Math.round(playerR * 0.28)
  const cardH       = playerR * 2 + bracketPad * 2 + nameBlock + Math.round(playerR * 0.1)

  // Center the full grid within available space
  const totalGridW  = cols * cardW
  const totalGridH  = rows * cardH
  const gStartX     = gridLeft + (availW - totalGridW) / 2 + cardW / 2
  const gStartY     = gridTop  + (availH - totalGridH) / 2 + playerR + bracketPad

  others.forEach((player, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const cx  = gStartX + col * cardW
    const cy  = gStartY + row * cardH
    drawPlayerCard(ctx, playerImgs[i], cx, cy, playerR, player.name || '', ACCENT, nameFontSz)
  })

  return { canvas, id: team.id, name: 'team_banner' }
}

async function _generateCaptainPoster(teamId) {
  const [team, players] = await Promise.all([
    fetch(`${API}/teams/${teamId}`).then(r => r.json()),
    fetch(`${API}/teams/${teamId}/players`).then(r => r.json())
  ])
  const captain = players.find(p => p.id === team.captain_id) || players.find(p => p.name === team.captain_name) || players[0]
  const [captainImg, teamLogo] = await Promise.all([loadImage(captain?.photo), loadImage(team.logo)])

  const W = 1600, H = 900
  const { canvas, ctx } = createCanvas(W, H)

  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#000d1e')
  bg.addColorStop(1, '#071428')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  dotMatrix(ctx, W, H)

  // Diagonal split
  ctx.save()
  ctx.fillStyle = 'rgba(240,180,41,0.08)'
  ctx.beginPath()
  ctx.moveTo(W * 0.5, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(W * 0.42, H)
  ctx.closePath(); ctx.fill(); ctx.restore()

  swoosh(ctx, W, H, 'rgba(255,255,255,0.035)')
  goldBar(ctx, 0, 0, W, 8)
  goldBar(ctx, 0, H - 6, W, 6)

  // Left accent
  const la = ctx.createLinearGradient(0, 0, 0, H)
  la.addColorStop(0, '#f0b429'); la.addColorStop(1, 'rgba(240,180,41,0)')
  ctx.fillStyle = la; ctx.fillRect(0, 0, 5, H)

  // Portrait
  drawPassport(ctx, captainImg, 50, 80, 580, 760)
  ctx.strokeStyle = '#f0b429'; ctx.lineWidth = 3
  ctx.strokeRect(50, 80, 580, 760)

  // Team logo
  if (teamLogo) drawCover(ctx, teamLogo, W - 240, 60, 180, 180)

  // Name
  const name = (captain?.name || 'CAPTAIN').toUpperCase()
  const ns = fitText(ctx, name, 860, 100, 36)
  ctx.fillStyle = '#ffffff'
  ctx.font = `900 ${ns}px "Barlow Condensed", sans-serif`
  ctx.fillText(name, 700, 400)

  goldBar(ctx, 700, 415, 720, 5)

  ctx.fillStyle = '#f0b429'
  ctx.font = `700 48px "Barlow Condensed", sans-serif`
  ctx.fillText('CAPTAIN', 700, 470)

  ctx.fillStyle = '#94a3b8'
  ctx.font = `600 32px "Barlow Condensed", sans-serif`
  ctx.fillText((team.name || '').toUpperCase(), 700, 530)

  // Bottom label bar
  ctx.fillStyle = '#f0b429'
  ctx.fillRect(0, H - 100, 6, 100)
  ctx.fillStyle = 'rgba(240,180,41,0.1)'
  ctx.fillRect(0, H - 100, W, 100)
  goldBar(ctx, 0, H - 100, W, 3)
  ctx.fillStyle = '#ffffff'
  ctx.font = `900 52px "Barlow Condensed", sans-serif`
  ctx.fillText((team.name || '').toUpperCase(), 40, H - 32)

  return { canvas, id: team.id, name: 'captain_banner' }
}

async function _generateVsBanner(match, leagueObj) {
  const leagueCity = leagueObj?.city || ''
  const leagueName = leagueObj?.name || ''
  const leagueSeason = leagueObj?.season || ''

  const [teamA, teamB] = await Promise.all([
    fetch(`${API}/teams/${match.team_a_id}`).then(r => r.json()),
    fetch(`${API}/teams/${match.team_b_id}`).then(r => r.json())
  ])
  const [aCapImg, bCapImg] = await Promise.all([
    loadImage(teamA.captain_photo),
    loadImage(teamB.captain_photo)
  ])

  const W = 1920, H = 1080
  const { canvas, ctx } = createCanvas(W, H)

  /* ── 1. STADIUM BACKGROUND ── */
  // Deep blue-black base (stadium night sky)
  const bg = ctx.createLinearGradient(0, 0, 0, H)
  bg.addColorStop(0, '#020a18')
  bg.addColorStop(0.45, '#051428')
  bg.addColorStop(0.75, '#071830')
  bg.addColorStop(1, '#030c1c')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Stadium upper stands — arc shape at top
  const stands = ctx.createRadialGradient(W / 2, -H * 0.15, H * 0.3, W / 2, -H * 0.15, H * 1.1)
  stands.addColorStop(0, 'rgba(15,40,90,0.0)')
  stands.addColorStop(0.5, 'rgba(8,22,55,0.55)')
  stands.addColorStop(0.75, 'rgba(3,10,30,0.85)')
  stands.addColorStop(1, 'rgba(2,8,20,0.95)')
  ctx.fillStyle = stands
  ctx.fillRect(0, 0, W, H)

  // Stadium floodlight glow — top corners
  for (const [lx, ly] of [[W * 0.15, H * 0.05], [W * 0.85, H * 0.05]]) {
    const fl = ctx.createRadialGradient(lx, ly, 0, lx, ly, H * 0.55)
    fl.addColorStop(0, 'rgba(160,200,255,0.18)')
    fl.addColorStop(0.3, 'rgba(100,150,240,0.09)')
    fl.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = fl
    ctx.fillRect(0, 0, W, H)
  }

  // Pitch spotlight — bright oval on ground/centre
  const pitch = ctx.createRadialGradient(W / 2, H * 0.72, 0, W / 2, H * 0.72, H * 0.55)
  pitch.addColorStop(0, 'rgba(80,130,255,0.18)')
  pitch.addColorStop(0.25, 'rgba(50,90,200,0.12)')
  pitch.addColorStop(0.6, 'rgba(20,50,140,0.06)')
  pitch.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = pitch
  ctx.fillRect(0, 0, W, H)

  // Champions-League-style starburst / hex glow in centre
  const burst = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, H * 0.48)
  burst.addColorStop(0, 'rgba(200,220,255,0.13)')
  burst.addColorStop(0.15, 'rgba(140,180,255,0.10)')
  burst.addColorStop(0.4, 'rgba(80,130,220,0.06)')
  burst.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = burst
  ctx.fillRect(0, 0, W, H)

  // Hexagonal pattern lines (UCL-style)
  ctx.save()
  ctx.globalAlpha = 0.04
  ctx.strokeStyle = '#6090e0'
  ctx.lineWidth = 1
  const hexR = 55
  const hexCols = Math.ceil(W / (hexR * 1.73)) + 2
  const hexRows = Math.ceil(H / (hexR * 1.5)) + 2
  for (let row = -1; row < hexRows; row++) {
    for (let col = -1; col < hexCols; col++) {
      const hx = col * hexR * 1.73 + (row % 2) * hexR * 0.865
      const hy = row * hexR * 1.5
      ctx.beginPath()
      for (let s = 0; s < 6; s++) {
        const angle = (Math.PI / 180) * (60 * s - 30)
        const px = hx + hexR * Math.cos(angle)
        const py = hy + hexR * Math.sin(angle)
        s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()
    }
  }
  ctx.globalAlpha = 1
  ctx.restore()

  // Turf colour tint at very bottom
  const turf = ctx.createLinearGradient(0, H * 0.78, 0, H)
  turf.addColorStop(0, 'rgba(0,30,15,0)')
  turf.addColorStop(1, 'rgba(0,40,10,0.45)')
  ctx.fillStyle = turf
  ctx.fillRect(0, 0, W, H)

  /* ── 2. SIDE VIGNETTES (frame the players) ── */
  const vigL = ctx.createLinearGradient(0, 0, W * 0.38, 0)
  vigL.addColorStop(0, 'rgba(2,8,20,0.55)')
  vigL.addColorStop(1, 'rgba(2,8,20,0)')
  ctx.fillStyle = vigL; ctx.fillRect(0, 0, W, H)

  const vigR = ctx.createLinearGradient(W * 0.62, 0, W, 0)
  vigR.addColorStop(0, 'rgba(2,8,20,0)')
  vigR.addColorStop(1, 'rgba(2,8,20,0.55)')
  ctx.fillStyle = vigR; ctx.fillRect(0, 0, W, H)

  const vigB = ctx.createLinearGradient(0, H * 0.7, 0, H)
  vigB.addColorStop(0, 'rgba(2,8,20,0)')
  vigB.addColorStop(1, 'rgba(2,8,20,0.7)')
  ctx.fillStyle = vigB; ctx.fillRect(0, 0, W, H)

  /* ── 3. CAPTAIN FULL-BODY CUTOUTS ── */
  // Helper: draw full-body player, anchored at bottom, on a given side
  function drawFullBody(img, side) {
    if (!img) return
    const pW = W * 0.42      // player occupies ~42% of canvas width
    const pH = H * 0.97      // nearly full height
    // Scale to fit height, contain width
    const scale = Math.min(pW / img.width, pH / img.height)
    const dw = img.width * scale
    const dh = img.height * scale
    const dy = H - dh         // anchor to bottom

    let dx
    if (side === 'left') {
      dx = pW * 0.05           // slight left offset
    } else {
      dx = W - pW * 0.05 - dw  // right side
    }

    ctx.save()
    // Fade inner edge so player blends into centre
    const fadeDir = side === 'left'
      ? ctx.createLinearGradient(dx + dw * 0.55, 0, dx + dw, 0)
      : ctx.createLinearGradient(dx, 0, dx + dw * 0.45, 0)
    fadeDir.addColorStop(0, side === 'left' ? 'rgba(0,0,0,0)' : 'rgba(2,8,20,0.0)')
    fadeDir.addColorStop(1, side === 'left' ? 'rgba(2,8,20,0.75)' : 'rgba(0,0,0,0)')

    // Bottom fade
    const fadeB2 = ctx.createLinearGradient(0, H * 0.78, 0, H)
    fadeB2.addColorStop(0, 'rgba(2,8,20,0)')
    fadeB2.addColorStop(1, 'rgba(2,8,20,0.3)')

    ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh)

    // Apply inner-edge fade
    ctx.fillStyle = fadeDir
    ctx.fillRect(dx, dy, dw, dh)
    ctx.restore()
  }

  drawFullBody(aCapImg, 'left')
  drawFullBody(bCapImg, 'right')

  /* ── 4. CENTRE TEXT STACK ── */
  const cx = W / 2
  // Measure and fit team names
  const nameA = (match.team_a_name || teamA.name || 'TEAM A').toUpperCase()
  const nameB = (match.team_b_name || teamB.name || 'TEAM B').toUpperCase()
  const maxNameW = W * 0.34   // max width for team name text

  // Dark semi-transparent backing behind text for legibility
  const textBg = ctx.createRadialGradient(cx, H * 0.47, 0, cx, H * 0.47, W * 0.22)
  textBg.addColorStop(0, 'rgba(0,5,15,0.72)')
  textBg.addColorStop(1, 'rgba(0,5,15,0)')
  ctx.fillStyle = textBg
  ctx.fillRect(0, 0, W, H)

  // Team A name
  ctx.save()
  ctx.textAlign = 'center'
  const sizeA = fitText(ctx, nameA, maxNameW, 130, 40)
  ctx.font = `900 italic ${sizeA}px "Barlow Condensed", sans-serif`
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 18; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 3
  ctx.fillText(nameA, cx, 390)
  ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0

  // VS
  ctx.font = `900 italic 110px "Barlow Condensed", sans-serif`
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 12
  ctx.fillText('VS', cx, 510)
  ctx.shadowBlur = 0

  // Team B name
  const sizeB = fitText(ctx, nameB, maxNameW, 130, 40)
  ctx.font = `900 italic ${sizeB}px "Barlow Condensed", sans-serif`
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 18; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 3
  ctx.fillText(nameB, cx, 640)
  ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0

  ctx.textAlign = 'left'
  ctx.restore()

  /* ── 5. BOTTOM MATCH INFO BAR ── */
  // Dark glass bar
  ctx.fillStyle = 'rgba(0,0,0,0.72)'
  ctx.fillRect(0, H - 110, W, 110)
  // Gold top line on bar
  const barLine = ctx.createLinearGradient(0, H - 110, W, H - 110)
  barLine.addColorStop(0, 'rgba(240,180,41,0)')
  barLine.addColorStop(0.15, '#f0b429')
  barLine.addColorStop(0.85, '#f0b429')
  barLine.addColorStop(1, 'rgba(240,180,41,0)')
  ctx.fillStyle = barLine
  ctx.fillRect(0, H - 110, W, 3)

  // Left: match number
  ctx.fillStyle = '#f0b429'
  ctx.font = `700 22px "Barlow Condensed", sans-serif`
  ctx.fillText(match.match_number ? `MATCH #${match.match_number}` : 'UPCOMING FIXTURE', 60, H - 70)

  // Centre: date · time · venue
  const bannerDate = match.date || match.match_date || 'DATE TBA'
  const bannerTime = match.time || match.match_time || 'TIME TBA'
  const infoText = [
    bannerDate,
    bannerTime,
    match.venue || 'VENUE TBA'
  ].join('   ·   ')
  ctx.fillStyle = '#ffffff'
  ctx.font = `700 38px "Barlow Condensed", sans-serif`
  ctx.textAlign = 'center'
  ctx.fillText(infoText, W / 2, H - 34)

  // Right: format badge
  ctx.textAlign = 'right'
  ctx.fillStyle = '#f0b429'
  ctx.font = `900 28px "Barlow Condensed", sans-serif`
  ctx.fillText(match.format || 'T20', W - 60, H - 52)
  ctx.fillStyle = '#64748b'
  ctx.font = `600 20px "Barlow Condensed", sans-serif`
  ctx.fillText(leagueName.toUpperCase() || 'CRICKET LEAGUE', W - 60, H - 24)
  ctx.textAlign = 'left'

  return { canvas, id: match.id, name: 'vs_banner' }
}

async function _generateInningsBanner(match, scorecard, type) {
  const first = scorecard.find(s => s.innings_number === 1)
  const second = scorecard.find(s => s.innings_number === 2)

  const W = 1920, H = 1080
  const { canvas, ctx } = createCanvas(W, H)

  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, '#01090f'); bg.addColorStop(1, '#061422')
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)
  dotMatrix(ctx, W, H)
  goldBar(ctx, 0, 0, W, 10)
  goldBar(ctx, 0, H - 8, W, 8)

  const la = ctx.createLinearGradient(0, 0, 0, H)
  la.addColorStop(0, '#f0b429'); la.addColorStop(1, 'rgba(240,180,41,0)')
  ctx.fillStyle = la; ctx.fillRect(0, 0, 6, H)

  if (type === 'first') {
    const topBat = first?.batting?.slice().sort((a, b) => b.runs - a.runs)[0]
    const topBowl = second?.bowling?.slice().sort((a, b) => b.wickets - a.wickets)[0] || first?.bowling?.slice().sort((a, b) => b.wickets - a.wickets)[0]

    ctx.fillStyle = '#f0b429'
    ctx.font = `700 38px "Barlow Condensed", sans-serif`
    ctx.fillText('1ST INNINGS', 80, 100)
    goldBar(ctx, 80, 110, 340, 5)

    ctx.fillStyle = '#ffffff'
    ctx.font = `900 96px "Barlow Condensed", sans-serif`
    ctx.fillText((first?.team_name || 'TEAM').toUpperCase(), 80, 220)

    ctx.fillStyle = '#f0b429'
    ctx.font = `900 160px "Barlow Condensed", sans-serif`
    ctx.fillText(`${first?.total_runs || 0}/${first?.total_wickets || 0}`, 80, 420)

    ctx.fillStyle = '#94a3b8'
    ctx.font = `700 48px "Barlow Condensed", sans-serif`
    ctx.fillText(`${Math.floor((first?.total_balls || 0) / 6)}.${(first?.total_balls || 0) % 6} OVERS`, 80, 490)

    // Right panel
    ctx.fillStyle = 'rgba(240,180,41,0.08)'
    ctx.fillRect(W - 680, 120, 600, 740)
    goldBar(ctx, W - 680, 120, 600, 4)

    ctx.fillStyle = '#f0b429'
    ctx.font = `700 28px "Barlow Condensed", sans-serif`
    ctx.fillText('TOP PERFORMERS', W - 640, 200)

    if (topBat) {
      ctx.fillStyle = '#94a3b8'; ctx.font = `600 22px "Barlow Condensed", sans-serif`
      ctx.fillText('LEADING BATSMAN', W - 640, 275)
      ctx.fillStyle = '#ffffff'; ctx.font = `900 52px "Barlow Condensed", sans-serif`
      ctx.fillText((topBat.name || '').toUpperCase(), W - 640, 340)
      goldBar(ctx, W - 640, 352, 520, 3)
      const sr = topBat.balls_faced > 0 ? ((topBat.runs / topBat.balls_faced) * 100).toFixed(1) : '0.0'
      ctx.fillStyle = '#f0b429'; ctx.font = `900 80px "Barlow Condensed", sans-serif`
      ctx.fillText(`${topBat.runs}`, W - 640, 450)
      ctx.fillStyle = '#64748b'; ctx.font = `600 36px "Barlow Condensed", sans-serif`
      ctx.fillText(`(${topBat.balls_faced}) · SR ${sr}`, W - 640, 500)
    }

    if (topBowl) {
      ctx.fillStyle = '#94a3b8'; ctx.font = `600 22px "Barlow Condensed", sans-serif`
      ctx.fillText('LEADING BOWLER', W - 640, 590)
      ctx.fillStyle = '#ffffff'; ctx.font = `900 52px "Barlow Condensed", sans-serif`
      ctx.fillText((topBowl.name || '').toUpperCase(), W - 640, 650)
      goldBar(ctx, W - 640, 662, 520, 3)
      ctx.fillStyle = '#f0b429'; ctx.font = `900 80px "Barlow Condensed", sans-serif`
      ctx.fillText(`${topBowl.wickets}/${topBowl.runs_conceded || 0}`, W - 640, 760)
    }

  } else {
    const target = (first?.total_runs || 0) + 1
    const ballsLeft = Math.max(0, ((match.overs_per_innings || 20) * 6) - (second?.total_balls || 0))
    const runsNeed = Math.max(0, target - (second?.total_runs || 0))
    const rrr = ballsLeft > 0 ? ((runsNeed / ballsLeft) * 6).toFixed(2) : '0.00'
    const crr = (second?.total_balls || 0) > 0
      ? (((second?.total_runs || 0) / (second?.total_balls || 0)) * 6).toFixed(2) : '0.00'

    ctx.fillStyle = '#f0b429'
    ctx.font = `700 38px "Barlow Condensed", sans-serif`
    ctx.fillText('2ND INNINGS · CHASE', 80, 100)
    goldBar(ctx, 80, 110, 440, 5)

    ctx.fillStyle = '#ffffff'
    ctx.font = `900 96px "Barlow Condensed", sans-serif`
    ctx.fillText((second?.team_name || 'TEAM B').toUpperCase(), 80, 220)

    ctx.fillStyle = '#f0b429'
    ctx.font = `900 160px "Barlow Condensed", sans-serif`
    ctx.fillText(`${second?.total_runs || 0}/${second?.total_wickets || 0}`, 80, 420)

    ctx.fillStyle = '#94a3b8'
    ctx.font = `700 48px "Barlow Condensed", sans-serif`
    ctx.fillText(`${Math.floor((second?.total_balls || 0) / 6)}.${(second?.total_balls || 0) % 6} OVERS`, 80, 490)

    // Target bar
    ctx.fillStyle = 'rgba(240,180,41,0.12)'
    ctx.fillRect(80, 560, 820, 110)
    goldBar(ctx, 80, 560, 820, 4)
    ctx.fillStyle = '#f0b429'; ctx.font = `700 26px "Barlow Condensed", sans-serif`
    ctx.fillText('TARGET', 120, 606)
    ctx.fillStyle = '#ffffff'; ctx.font = `900 72px "Barlow Condensed", sans-serif`
    ctx.fillText(`${target}`, 300, 650)
    ctx.fillStyle = '#64748b'; ctx.font = `600 26px "Barlow Condensed", sans-serif`
    ctx.fillText(`${runsNeed} NEEDED · ${Math.floor(ballsLeft / 6)}.${ballsLeft % 6} OVERS LEFT`, 460, 640)

    // Stats panel
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    ctx.fillRect(W - 640, 120, 560, 720)
    goldBar(ctx, W - 640, 120, 560, 4)
    statRow(ctx, 'REQUIRED RUN RATE', rrr, W - 600, 200, '#94a3b8', '#f0b429', 80)
    statRow(ctx, 'CURRENT RUN RATE', crr, W - 600, 430, '#94a3b8', '#ffffff', 60)
    statRow(ctx, 'BALLS REMAINING', String(ballsLeft), W - 600, 620, '#94a3b8', '#ffffff', 60)
  }

  return { canvas, id: match.id, name: `innings_banner_${type === 'second' ? 'second' : 'first'}` }
}

async function _generateResultBanner(match, scorecard) {
  const aInn  = scorecard.find(s => s.batting_team_id === match.team_a_id)
  const bInn  = scorecard.find(s => s.batting_team_id === match.team_b_id)
  // Show top 4 batters and top 5 bowlers — matching reference density
  const aBat  = (aInn?.batting  || []).slice(0, 4)
  const bBat  = (bInn?.batting  || []).slice(0, 4)
  const aBowl = (bInn?.bowling  || []).slice(0, 5)
  const bBowl = (aInn?.bowling  || []).slice(0, 5)

  const [aLogo, bLogo, tourneyLogo] = await Promise.all([
    loadImage(match.team_a_logo  || null),
    loadImage(match.team_b_logo  || null),
    loadImage(match.league_logo  || null),
  ])

  // ── Canvas & Palette ─────────────────────────────────────────────────────
  const W = 1920, H = 1080
  const { canvas, ctx } = createCanvas(W, H)

  const MAGENTA   = '#e91e8c'
  const MAG_DARK  = '#b5166d'
  const NAVY      = '#0d0a3a'
  const GOLD_WIN  = '#f5c518'
  const WHITE     = '#ffffff'
  const OFF_WHITE = '#f4f4f6'
  const GREY_ROW  = '#ececf1'
  const GREY_LINE = '#d8d8e0'
  const GREY_TXT  = '#9090a8'
  const BLACK_TXT = '#111122'
  const TEAL      = '#00c4d4'
  const F         = '"Barlow Condensed", "Oswald", Impact, sans-serif'

  // ── Helpers ──────────────────────────────────────────────────────────────
  const t = (text, x, y, sz, color, align, wt) => {
    ctx.save(); ctx.font = `${wt||'700'} ${sz}px ${F}`
    ctx.fillStyle = color; ctx.textAlign = align || 'left'
    ctx.fillText(String(text ?? ''), x, y); ctx.restore()
  }
  const r = (x, y, w, h, color) => { if (w>0&&h>0) { ctx.fillStyle=color; ctx.fillRect(x,y,w,h) } }
  const hl = (x, y, w, color, h=1) => r(x, y, w, h, color)

  // Magenta bat/cricket icon — small rectangle bat shape
  function drawBatIcon(cx, cy, size, color) {
    ctx.save()
    ctx.fillStyle = color
    // Bat handle
    ctx.fillRect(cx - size*0.07, cy - size*0.55, size*0.14, size*0.35)
    // Bat blade
    ctx.beginPath()
    ctx.ellipse(cx, cy + size*0.05, size*0.28, size*0.38, 0, 0, Math.PI*2)
    ctx.fill()
    ctx.restore()
  }

  // Cricket ball — solid circle with seam
  function drawBallIcon(cx, cy, r2, color) {
    ctx.save()
    ctx.beginPath(); ctx.arc(cx, cy, r2, 0, Math.PI*2)
    ctx.fillStyle = color; ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = Math.max(1, r2*0.22)
    ctx.beginPath(); ctx.arc(cx, cy, r2*0.52, Math.PI*0.35, Math.PI*1.65); ctx.stroke()
    ctx.beginPath(); ctx.arc(cx, cy, r2*0.52, Math.PI*1.35, Math.PI*2.65); ctx.stroke()
    ctx.restore()
  }

  // ── 1. OUTER BG — deep purple hex-grid ───────────────────────────────────
  const bgG = ctx.createLinearGradient(0,0,W,H)
  bgG.addColorStop(0,   '#180850'); bgG.addColorStop(0.45, '#261278')
  bgG.addColorStop(0.7, '#1c0d60'); bgG.addColorStop(1,   '#100840')
  ctx.fillStyle = bgG; ctx.fillRect(0,0,W,H)

  // Hex grid
  ctx.save(); ctx.globalAlpha=0.07; ctx.strokeStyle='#8050d8'; ctx.lineWidth=1
  const HR=50
  for (let row=-1; row<H/(HR*1.5)+2; row++) {
    for (let col=-1; col<W/(HR*1.73)+2; col++) {
      const hx=col*HR*1.73+(row%2)*HR*0.865, hy=row*HR*1.5
      ctx.beginPath()
      for (let s=0;s<6;s++){const a=(Math.PI/3)*s-Math.PI/6;s===0?ctx.moveTo(hx+HR*Math.cos(a),hy+HR*Math.sin(a)):ctx.lineTo(hx+HR*Math.cos(a),hy+HR*Math.sin(a))}
      ctx.closePath(); ctx.stroke()
    }
  }
  ctx.globalAlpha=1; ctx.restore()

  // Corner wedges
  const wedge = (pts, color, alpha=0.82) => {
    ctx.save(); ctx.globalAlpha=alpha; ctx.fillStyle=color
    ctx.beginPath(); pts.forEach(([x,y],i)=>i===0?ctx.moveTo(x,y):ctx.lineTo(x,y)); ctx.closePath(); ctx.fill()
    ctx.globalAlpha=1; ctx.restore()
  }
  wedge([[0,0],[240,0],[0,240]], TEAL)
  wedge([[0,60],[90,0],[60,0],[0,90]], '#00e0f0', 0.65)
  wedge([[W-240,0],[W,0],[W,240]], MAGENTA)
  wedge([[W-90,0],[W,0],[W,90]], '#ff5500', 0.6)
  wedge([[0,H-200],[200,H],[0,H]], GOLD_WIN, 0.78)
  wedge([[0,H-70],[70,H],[0,H]], '#ff8800', 0.55)
  wedge([[W,H-200],[W-200,H],[W,H]], TEAL, 0.72)

  // Edge dots
  for (let i=0;i<13;i++) {
    const dy=170+i*54
    ctx.save(); ctx.globalAlpha=0.72
    ctx.beginPath(); ctx.arc(20+Math.sin(i*.9)*7, dy, 4.5, 0, Math.PI*2); ctx.fillStyle=GOLD_WIN; ctx.fill()
    ctx.beginPath(); ctx.arc(W-20+Math.sin(i*.9+1)*7, dy, 4.5, 0, Math.PI*2); ctx.fillStyle=MAGENTA; ctx.fill()
    ctx.globalAlpha=1; ctx.restore()
  }

  // ── 2. WHITE CARD ─────────────────────────────────────────────────────────
  // Card dimensions — tight margins like reference
  const CX=96, CY=44, CW=W-192, CH=H-88, CRAD=12

  ctx.save()
  ctx.shadowColor='rgba(0,0,0,0.6)'; ctx.shadowBlur=36; ctx.shadowOffsetY=6
  ctx.fillStyle=WHITE
  ctx.beginPath(); ctx.roundRect(CX,CY,CW,CH,CRAD); ctx.fill()
  ctx.shadowBlur=0; ctx.restore()

  // ── 3. GROUP BADGE STRIP ─────────────────────────────────────────────────
  // Thin strip at very top of card (off-white)
  const GH=48   // group strip height
  ctx.save()
  ctx.beginPath(); ctx.roundRect(CX,CY,CW,GH,[CRAD,CRAD,0,0])
  ctx.fillStyle=OFF_WHITE; ctx.fill(); ctx.restore()
  hl(CX, CY+GH-1, CW, GREY_LINE)

  const GCX = CX+CW/2   // centre x of card
  const GCY = CY+GH/2

  // Flag A — left of group pill
  const FLAG_W=58, FLAG_H=30, FLAG_GAP=100
  if (aLogo) {
    ctx.save(); ctx.beginPath()
    ctx.roundRect(GCX-FLAG_GAP-FLAG_W, GCY-FLAG_H/2, FLAG_W, FLAG_H, 3); ctx.clip()
    drawCover(ctx, aLogo, GCX-FLAG_GAP-FLAG_W, GCY-FLAG_H/2, FLAG_W, FLAG_H)
    ctx.restore()
    ctx.strokeStyle=GREY_LINE; ctx.lineWidth=1
    ctx.strokeRect(GCX-FLAG_GAP-FLAG_W, GCY-FLAG_H/2, FLAG_W, FLAG_H)
  }

  // Group pill
  const PILL_W=156, PILL_H=28
  ctx.fillStyle=NAVY
  ctx.beginPath(); ctx.roundRect(GCX-PILL_W/2, GCY-PILL_H/2, PILL_W, PILL_H, PILL_H/2); ctx.fill()
  t((match.group_label||match.stage||'GROUP A').toUpperCase(), GCX, GCY+9, 16, WHITE, 'center', '700')

  // Flag B — right of group pill
  if (bLogo) {
    ctx.save(); ctx.beginPath()
    ctx.roundRect(GCX+FLAG_GAP, GCY-FLAG_H/2, FLAG_W, FLAG_H, 3); ctx.clip()
    drawCover(ctx, bLogo, GCX+FLAG_GAP, GCY-FLAG_H/2, FLAG_W, FLAG_H)
    ctx.restore()
    ctx.strokeStyle=GREY_LINE; ctx.lineWidth=1
    ctx.strokeRect(GCX+FLAG_GAP, GCY-FLAG_H/2, FLAG_W, FLAG_H)
  }

  // ── 4. TEAM NAMES ROW ────────────────────────────────────────────────────
  const NH=80   // names row height
  const NY=CY+GH
  r(CX, NY, CW, NH, WHITE)
  hl(CX, NY+NH-1, CW, GREY_LINE)

  // Tournament logo/text centre
  const LOGO_SZ=60
  if (tourneyLogo) {
    drawCover(ctx, tourneyLogo, GCX-LOGO_SZ/2, NY+(NH-LOGO_SZ)/2, LOGO_SZ, LOGO_SZ)
  } else {
    t(match.format||'T20', GCX, NY+NH/2+14, 28, BLACK_TXT, 'center', '900')
  }

  // Team name sizing — fit into half-card minus logo gap minus padding
  const NAME_MAX_W = CW/2 - LOGO_SZ/2 - 48
  function fitNameSz(text, maxW, startSz=88) {
    let sz=startSz
    while(sz>24){ ctx.font=`900 ${sz}px ${F}`; if(ctx.measureText(text).width<=maxW)break; sz-=2 }
    return sz
  }
  const nameA=(match.team_a_name||'TEAM A').toUpperCase()
  const nameB=(match.team_b_name||'TEAM B').toUpperCase()
  const szA=fitNameSz(nameA, NAME_MAX_W)
  const szB=fitNameSz(nameB, NAME_MAX_W)
  ctx.fillStyle=BLACK_TXT
  ctx.font=`900 ${szA}px ${F}`; ctx.textAlign='left'
  ctx.fillText(nameA, CX+28, NY+NH/2+szA*0.36)
  ctx.font=`900 ${szB}px ${F}`; ctx.textAlign='right'
  ctx.fillText(nameB, CX+CW-28, NY+NH/2+szB*0.36)

  // ── 5. VENUE STRIP ───────────────────────────────────────────────────────
  const VH=32
  const VY=NY+NH
  r(CX, VY, CW, VH, '#f0f0f5')
  t((match.venue||'').toUpperCase(), GCX, VY+22, 16, GREY_TXT, 'center', '600')
  hl(CX, VY+VH-2, CW, GOLD_WIN, 2)   // gold bottom rule

  // ── 6. SCORECARD BODY ────────────────────────────────────────────────────
  const BY = VY+VH       // body start y
  const WIN_H = 52       // winner bar height
  const BH = CY+CH-BY-WIN_H   // total body height (batting+overs+bowling)
  const HW = CW/2        // half width of card

  // Row heights — dynamic to fill space precisely
  const SCORE_H = 50     // magenta score bar
  const OVERS_H = 38     // magenta overs bar
  const nBat    = Math.max(aBat.length, bBat.length)
  const nBowl   = Math.max(aBowl.length, bBowl.length)
  const FIXED   = SCORE_H + OVERS_H
  const AVAIL   = BH - FIXED
  const BAT_RH  = nBat  > 0 ? Math.max(46, Math.floor(AVAIL*0.52/nBat))  : 54
  const BWL_RH  = nBowl > 0 ? Math.max(40, Math.floor(AVAIL*0.48/nBowl)) : 48

  // Magenta gradient bar factory
  function magBar(px, py, pw, ph) {
    const g=ctx.createLinearGradient(px,py,px,py+ph)
    g.addColorStop(0,MAGENTA); g.addColorStop(1,MAG_DARK)
    ctx.fillStyle=g; ctx.fillRect(px,py,pw,ph)
  }

  // ── Score bar: bat icon | SCORE bold centre | bat icon ───────────────────
  function drawScoreBar(px, py, pw, inn) {
    magBar(px, py, pw, SCORE_H)
    const sc=`${inn?.total_runs??0}-${inn?.total_wickets??0}`
    const icy=py+SCORE_H/2
    // Bat icons
    drawBatIcon(px+28, icy, SCORE_H*0.72, 'rgba(255,255,255,0.9)')
    drawBatIcon(px+pw-28, icy, SCORE_H*0.72, 'rgba(255,255,255,0.9)')
    // Score
    t(sc, px+pw/2, py+SCORE_H-10, 34, WHITE, 'center', '900')
  }

  // ── Batting row: NAME left | RUNS bold right-centre | BALLS small far-right
  function drawBatRow(p, px, py, pw, idx) {
    r(px, py, pw, BAT_RH, idx%2===0 ? WHITE : GREY_ROW)
    hl(px, py+BAT_RH-1, pw, GREY_LINE)
    if (!p) return
    const cy=py+BAT_RH*0.66
    const NSZ=Math.min(28, Math.floor(BAT_RH*0.46))
    const RSZ=Math.min(34, Math.floor(BAT_RH*0.56))
    const BSZ=Math.min(22, Math.floor(BAT_RH*0.38))
    t((p.name||'—').toUpperCase(), px+18, cy, NSZ, BLACK_TXT, 'left', '700')
    t(p.runs??'-', px+pw-86, cy, RSZ, BLACK_TXT, 'right', '900')
    t(p.balls_faced??'-', px+pw-14, cy, BSZ, GREY_TXT, 'right', '600')
  }

  // ── Overs bar: ball icon | NUMBER large "OVERS" small centre | ball icon ─
  function drawOversBar(px, py, pw, inn) {
    magBar(px, py, pw, OVERS_H)
    const balls=(inn?.total_balls||0)
    const ovNum=`${Math.floor(balls/6)}.${balls%6}`
    const icy=py+OVERS_H/2
    drawBallIcon(px+24, icy, OVERS_H*0.28, 'rgba(255,255,255,0.88)')
    drawBallIcon(px+pw-24, icy, OVERS_H*0.28, 'rgba(255,255,255,0.88)')
    // Two-part text: number large, "OVERS" smaller — rendered together centred
    const NSZ=Math.floor(OVERS_H*0.58)
    const LSZ=Math.floor(OVERS_H*0.40)
    ctx.save()
    ctx.font=`900 ${NSZ}px ${F}`; const nw=ctx.measureText(ovNum).width
    ctx.font=`700 ${LSZ}px ${F}`; const lw=ctx.measureText(' OVERS').width
    const total=nw+lw
    const sx=px+pw/2-total/2
    const ty=py+OVERS_H-9
    ctx.fillStyle=WHITE; ctx.textAlign='left'
    ctx.font=`900 ${NSZ}px ${F}`; ctx.fillText(ovNum, sx, ty)
    ctx.font=`700 ${LSZ}px ${F}`; ctx.fillText(' OVERS', sx+nw, ty)
    ctx.restore()
  }

  // ── Bowling row: NAME left | W-R bold right-centre | BALLS small far-right
  function drawBowlRow(p, px, py, pw, idx) {
    r(px, py, pw, BWL_RH, idx%2===0 ? WHITE : GREY_ROW)
    hl(px, py+BWL_RH-1, pw, GREY_LINE)
    if (!p) return
    const cy=py+BWL_RH*0.68
    const NSZ=Math.min(26, Math.floor(BWL_RH*0.46))
    const RSZ=Math.min(30, Math.floor(BWL_RH*0.52))
    const BSZ=Math.min(20, Math.floor(BWL_RH*0.38))
    t((p.name||'—').toUpperCase(), px+18, cy, NSZ, BLACK_TXT, 'left', '700')
    const wR=`${p.wickets??0}-${p.runs_conceded??0}`
    t(wR, px+pw-86, cy, RSZ, BLACK_TXT, 'right', '900')
    const mb=p.maidens??p.maiden_overs??'-'
    t(mb, px+pw-14, cy, BSZ, GREY_TXT, 'right', '600')
  }

  // ── Draw both panels ──────────────────────────────────────────────────────
  function drawPanel(px, pw, inn, bat, bowl) {
    let y=BY
    drawScoreBar(px, y, pw, inn); y+=SCORE_H
    for(let i=0;i<nBat;i++){ drawBatRow(bat[i]||null, px, y, pw, i); y+=BAT_RH }
    drawOversBar(px, y, pw, inn); y+=OVERS_H
    for(let i=0;i<nBowl;i++){ drawBowlRow(bowl[i]||null, px, y, pw, i); y+=BWL_RH }
  }

  drawPanel(CX,      HW,    aInn, aBat, aBowl)
  drawPanel(CX+HW+1, HW-1,  bInn, bBat, bBowl)

  // Centre vertical divider (inside card body)
  r(CX+HW, BY, 1, BH, GREY_LINE)

  // ── 7. WINNER BAR — dark navy, gold text, INSIDE card at bottom ───────────
  const WY = CY+CH-WIN_H
  ctx.save()
  ctx.beginPath(); ctx.roundRect(CX, WY, CW, WIN_H, [0,0,CRAD,CRAD])
  ctx.fillStyle=NAVY; ctx.fill(); ctx.restore()
  hl(CX, WY, CW, GOLD_WIN, 2)   // gold top border

  const resultTxt=(match.result_summary||'MATCH COMPLETE').toUpperCase()
  const rSz=fitText(ctx, resultTxt, CW-120, 38, 18, '900')
  ctx.save()
  ctx.font=`900 ${rSz}px ${F}`; ctx.fillStyle=GOLD_WIN; ctx.textAlign='center'
  ctx.shadowColor='rgba(245,197,24,0.55)'; ctx.shadowBlur=18
  ctx.fillText(resultTxt, GCX, WY+WIN_H-14)
  ctx.shadowBlur=0; ctx.restore()

  return { canvas, id: match.id, name: 'result_banner' }
}

async function _generateSummaryBanner(match, scorecard, leagueObj) {
  /* ── DATA ── */
  const inn1 = scorecard.find(s => s.innings_number === 1) || scorecard.find(s => s.batting_team_id === match.team_a_id)
  const inn2 = scorecard.find(s => s.innings_number === 2) || scorecard.find(s => s.batting_team_id === match.team_b_id)

  // Derive fall-of-wickets from batting array if not present
  function deriveFow(inn) {
    if (inn?.fall_of_wickets?.length) return inn.fall_of_wickets
    // Build from batting dismissals (exclude not-outs)
    const dismissed = (inn?.batting || [])
      .filter(p => p.runs != null && p.how_out !== 'not out' && !p.not_out)
      .sort((a, b) => (a.batting_order || 99) - (b.batting_order || 99))
    return dismissed.map((p, i) => ({
      wicket: i + 1,
      score: `${p.runs_at_dismissal || p.runs || 0}/${i + 1}`,
      player_name: p.name,
      over: p.over_dismissed || null,
    }))
  }

  async function loadPlayerPhotos(rows) {
    return Promise.all((rows || []).map(p => loadImage(p.photo || null)))
  }
  const [aLogo, bLogo, leagueLogo,
         inn1BatPhotos, inn1BowlPhotos,
         inn2BatPhotos, inn2BowlPhotos] = await Promise.all([
    loadImage(match.team_a_logo || null),
    loadImage(match.team_b_logo || null),
    loadImage(leagueObj?.logo || null),
    loadPlayerPhotos(inn1?.batting),
    loadPlayerPhotos(inn1?.bowling),
    loadPlayerPhotos(inn2?.batting),
    loadPlayerPhotos(inn2?.bowling),
  ])

  const fow1 = deriveFow(inn1)
  const fow2 = deriveFow(inn2)

  /* ── CANVAS — dynamic height ── */
  const W = 2560

  // Pre-calculate how many rows each panel needs to determine canvas height
  const LEAGUE_BAR_H = 90          // ← NEW: league info strip at top
  const TEAM_HDR_H   = 76
  const BAT_HDR_H    = 50
  const EXTRAS_H     = 44
  const TOTAL_H      = 54
  const BOWL_HDR_H   = 56
  const BOWLCOL_H    = 46

  const maxBatRows  = Math.max((inn1?.batting||[]).length,  (inn2?.batting||[]).length)
  const maxBowlRows = Math.max((inn1?.bowling||[]).length,  (inn2?.bowling||[]).length)
  const maxFowRows  = Math.max(fow1.length, fow2.length)
  const bottomRows  = Math.max(maxBowlRows, maxFowRows)

  const MIN_H      = 1440
  const FIXED_H    = LEAGUE_BAR_H + TEAM_HDR_H + BAT_HDR_H + EXTRAS_H + TOTAL_H + BOWL_HDR_H + BOWLCOL_H
  const AVAIL_ROWS = MIN_H - FIXED_H
  const BAT_AVAIL  = Math.floor(AVAIL_ROWS * 0.55)
  const BOWL_AVAIL = Math.floor(AVAIL_ROWS * 0.45)
  const ROW_H      = maxBatRows  > 0 ? Math.max(56, Math.floor(BAT_AVAIL  / maxBatRows))  : 72
  const BOWL_ROW_H = bottomRows  > 0 ? Math.max(50, Math.floor(BOWL_AVAIL / bottomRows))  : 62

  const H = Math.max(MIN_H,
    FIXED_H + maxBatRows * ROW_H + bottomRows * BOWL_ROW_H + 10)

  const { canvas, ctx } = createCanvas(W, H)

  /* ── DARK BRAND TOKENS (matches GraphicsGeneratorPanel deep navy) ── */
  const BG_DEEP    = '#020b1c'
  const BG_MID     = '#071633'
  const ROW_DARK   = 'rgba(255,255,255,0.04)'
  const ROW_ALT    = 'rgba(255,255,255,0.08)'
  const HDR_NAVY   = 'rgba(10,20,50,0.85)'
  const HDR_COL    = 'rgba(15,32,64,0.90)'
  const HDR_FOW    = 'rgba(8,24,56,0.90)'
  const DIVIDER    = 'rgba(240,180,41,0.25)'
  const BORDER     = 'rgba(255,255,255,0.10)'
  const WHITE      = '#ffffff'
  const TEXT_PRI   = '#ffffff'
  const TEXT_SEC   = '#a8c4e8'
  const TEXT_DIM   = '#6080a8'
  const GOLD       = '#f0b429'
  const GOLD_L     = '#ffe066'
  const GREEN      = '#22c55e'
  const RED_BULL   = '#ef4444'
  const BLUE_BULL  = '#60a5fa'
  const F          = '"Barlow Condensed", sans-serif'
  const FB         = '"Barlow", sans-serif'

  /* ── HELPERS ── */
  const t = (text, x, y, sz, color, align, wt, font) => {
    ctx.save()
    ctx.font = `${wt||'600'} ${sz}px ${font||F}`
    ctx.fillStyle = color; ctx.textAlign = align || 'left'
    ctx.fillText(String(text ?? ''), x, y); ctx.restore()
  }
  const r = (x, y, w, h, color) => { if (w > 0 && h > 0) { ctx.fillStyle = color; ctx.fillRect(x, y, w, h) } }
  const hl = (x, y, w, color, th) => r(x, y, w, th||1, color)

  function drawCirclePhoto(img, cx, cy, radius, fallbackColor, fallbackLetter) {
    ctx.save()
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.clip()
    if (img) {
      const scale = Math.max((radius*2)/img.width, (radius*2)/img.height)
      const dw = img.width * scale, dh = img.height * scale
      ctx.drawImage(img, cx - dw/2, cy - dh/2, dw, dh)
    } else {
      ctx.fillStyle = fallbackColor || 'rgba(255,255,255,0.15)'
      ctx.fillRect(cx-radius, cy-radius, radius*2, radius*2)
      if (fallbackLetter) {
        ctx.font = `700 ${Math.round(radius)}px ${F}`
        ctx.fillStyle = WHITE; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
        ctx.fillText(fallbackLetter.charAt(0).toUpperCase(), cx, cy)
        ctx.textBaseline = 'alphabetic'
      }
    }
    ctx.restore()
    ctx.save()
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI*2)
    ctx.strokeStyle = 'rgba(255,255,255,0.20)'; ctx.lineWidth = 2; ctx.stroke()
    ctx.restore()
  }

  /* ── LAYOUT ── */
  const PANEL_W = W / 2
  const GAP     = 3
  const P1X     = 0
  const P2X     = PANEL_W + GAP
  const PW      = PANEL_W - GAP / 2

  // Scale font/photo sizes with row height
  const PHOTO_R  = Math.min(30, Math.floor(ROW_H * 0.37))
  const NAME_SZ  = Math.min(26, Math.floor(ROW_H * 0.33))
  const DISM_SZ  = Math.min(18, Math.floor(ROW_H * 0.23))
  const STAT_SZ  = Math.min(26, Math.floor(ROW_H * 0.33))   // ← bigger stat font
  const B_PHOTO  = Math.min(26, Math.floor(BOWL_ROW_H * 0.37))
  const B_NAME   = Math.min(23, Math.floor(BOWL_ROW_H * 0.33))
  const B_STAT   = Math.min(22, Math.floor(BOWL_ROW_H * 0.31))

  // Batting stat columns — wider spacing for bigger numbers
  const COL_SR  = PW - 24
  const COL_6S  = COL_SR  - 128
  const COL_4S  = COL_6S  - 118
  const COL_B   = COL_4S  - 118
  const COL_R   = COL_B   - 118

  // Bowling stat columns (within half-panel)
  const HALF    = PW / 2
  const BC_ECO  = HALF - 24
  const BC_W    = BC_ECO - 88
  const BC_M    = BC_W   - 76
  const BC_R    = BC_M   - 76
  const BC_O    = BC_R   - 76

  /* ════════════ DEEP NAVY BACKGROUND (brand style) ════════════ */
  const bg = ctx.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0,   BG_DEEP)
  bg.addColorStop(0.5, BG_MID)
  bg.addColorStop(1,   BG_DEEP)
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H)

  // Subtle dot matrix texture
  dotMatrix(ctx, W, H)

  // Gold top bar
  goldBar(ctx, 0, 0, W, 7)

  // Centre divider — gold tint
  r(PANEL_W - 1, LEAGUE_BAR_H, GAP + 2, H - LEAGUE_BAR_H, DIVIDER)

  /* ════════════ LEAGUE INFO BAR (full width) ════════════ */
  // Semi-transparent dark overlay for league bar
  r(0, 7, W, LEAGUE_BAR_H - 7, 'rgba(0,0,0,0.45)')
  hl(0, LEAGUE_BAR_H, W, 'rgba(240,180,41,0.5)', 2)

  // League logo left
  const LBY = 7 + (LEAGUE_BAR_H - 7) / 2   // vertical centre of league bar
  if (leagueLogo) {
    const lSize = LEAGUE_BAR_H - 22
    drawCover(ctx, leagueLogo, 28, 7 + 11, lSize, lSize)
  }
  // League name
  const leagueName   = (leagueObj?.name   || match.league_name || '').toUpperCase()
  const leagueSeason = (leagueObj?.season || match.season      || '')
  const matchNum     = match.match_number ? `MATCH ${match.match_number}` : ''
  const matchDateRaw = match.match_date || match.date || ''
  const matchDate    = matchDateRaw ? new Date(matchDateRaw).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' }) : ''
  const venue        = (match.venue || match.ground || '').toUpperCase()
  const matchFormat  = (match.format || leagueObj?.format || '').toUpperCase()

  let lx = leagueLogo ? (28 + LEAGUE_BAR_H - 22 + 18) : 28
  if (leagueName) {
    t(leagueName, lx, LBY + 6,  32, GOLD,     'left', '900')
    if (leagueSeason) t(`• ${leagueSeason}`, lx + ctx.measureText(leagueName).width + 14, LBY + 6, 26, GOLD_L, 'left', '700')
  }

  // Centre: match number + date + venue
  const centreInfo = [matchNum, matchDate, venue].filter(Boolean).join('   •   ')
  if (centreInfo) t(centreInfo, W/2, LBY + 6, 26, TEXT_SEC, 'center', '700')
  if (matchFormat) t(matchFormat, W/2, LBY + 32, 20, TEXT_DIM, 'center', '600')

  // Right: format badge
  if (matchFormat && !centreInfo.includes(matchFormat)) {
    const fmtW = ctx.measureText(matchFormat).width + 32
    r(W - fmtW - 32, LBY - 18, fmtW, 36, 'rgba(240,180,41,0.15)')
    ctx.strokeStyle = 'rgba(240,180,41,0.4)'; ctx.lineWidth = 1.5
    ctx.strokeRect(W - fmtW - 32, LBY - 18, fmtW, 36)
    t(matchFormat, W - fmtW/2 - 32, LBY + 8, 22, GOLD, 'center', '800')
  }

  /* ════════════ PANEL DRAW ════════════ */
  function drawPanel(px, inn, teamName, teamLogo, batPhotos, bowlPhotos, fow, isLeft) {
    let y = LEAGUE_BAR_H   // start below the league info bar

    /* ── Team header ── */
    r(px, y, PW, TEAM_HDR_H, HDR_NAVY)
    if (teamLogo) drawCover(ctx, teamLogo, px + 16, y + 13, 50, 50)
    t(teamName.toUpperCase(), px + (teamLogo ? 80 : 22), y + 48, 34, WHITE, 'left', '900')
    const sc  = `${inn?.total_runs ?? 0}/${inn?.total_wickets ?? 0}`
    const ov  = `${Math.floor((inn?.total_balls||0)/6)}.${(inn?.total_balls||0)%6}`
    const crr = inn?.total_balls > 0 ? ((inn.total_runs / inn.total_balls)*6).toFixed(2) : '0.00'
    t(sc,               px + PW - 22, y + 34, 32, WHITE,   'right', '900')
    t(`(${ov} overs)`,  px + PW - 22, y + 58, 19, TEXT_SEC,'right', '600')
    t(`CRR: ${crr} rpo`,px + PW - 22, y + 73, 15, TEXT_DIM,'right', '600', FB)
    hl(px, y + TEAM_HDR_H - 1, PW, DIVIDER, 2)
    y += TEAM_HDR_H

    /* ── Batting column header ── */
    r(px, y, PW, BAT_HDR_H, HDR_COL)
    t('/ BATTING', px + 22, y + BAT_HDR_H - 14, 19, TEXT_SEC, 'left', '700')
    t('R',   px + COL_R,  y + BAT_HDR_H - 14, 18, TEXT_SEC, 'center', '700')
    t('B',   px + COL_B,  y + BAT_HDR_H - 14, 18, TEXT_SEC, 'center', '700')
    t('4S',  px + COL_4S, y + BAT_HDR_H - 14, 18, TEXT_SEC, 'center', '700')
    t('6S',  px + COL_6S, y + BAT_HDR_H - 14, 18, TEXT_SEC, 'center', '700')
    t('S/R', px + COL_SR, y + BAT_HDR_H - 14, 18, TEXT_SEC, 'right',  '700')
    hl(px, y + BAT_HDR_H - 1, PW, BORDER)
    y += BAT_HDR_H

    /* ── Batting rows ── */
    const batters = inn?.batting || []
    for (let i = 0; i < maxBatRows; i++) {
      const p     = batters[i]
      const rowBg = i % 2 === 0 ? ROW_DARK : ROW_ALT
      r(px, y, PW, ROW_H, rowBg)
      hl(px, y + ROW_H - 1, PW, BORDER)
      if (p) {
        const cy = y + ROW_H / 2
        ctx.save(); ctx.beginPath(); ctx.arc(px + 14, cy, 7, 0, Math.PI*2)
        ctx.fillStyle = BLUE_BULL; ctx.fill(); ctx.restore()
        const photoCX = px + 14 + 10 + PHOTO_R
        drawCirclePhoto(batPhotos[i], photoCX, cy, PHOTO_R, 'rgba(96,165,250,0.2)', p.name)
        const nameX = photoCX + PHOTO_R + 16
        const nameY = p.dismissal ? y + ROW_H * 0.42 : y + ROW_H * 0.60
        t(p.name || '—', nameX, nameY, NAME_SZ, TEXT_PRI, 'left', '700', FB)
        if (p.dismissal)
          t(p.dismissal, nameX, y + ROW_H * 0.76, DISM_SZ, TEXT_DIM, 'left', '400', FB)
        else if (p.how_out === 'not out' || p.not_out)
          t('not out', nameX, y + ROW_H * 0.76, DISM_SZ, GREEN, 'left', '600', FB)
        const statY = y + ROW_H * 0.62
        const sr = p.balls_faced > 0 ? ((p.runs/p.balls_faced)*100).toFixed(2) : '-'
        t(p.runs??'-',        px+COL_R,  statY, STAT_SZ, WHITE,    'center', '800', FB)
        t(p.balls_faced??'-', px+COL_B,  statY, STAT_SZ, TEXT_SEC, 'center', '600', FB)
        t(p.fours??'-',       px+COL_4S, statY, STAT_SZ, TEXT_SEC, 'center', '600', FB)
        t(p.sixes??'-',       px+COL_6S, statY, STAT_SZ, TEXT_SEC, 'center', '600', FB)
        t(sr,                 px+COL_SR, statY, STAT_SZ, TEXT_DIM, 'right',  '600', FB)
      }
      y += ROW_H
    }

    /* ── Extras ── */
    r(px, y, PW, EXTRAS_H, ROW_DARK)
    hl(px, y + EXTRAS_H - 1, PW, BORDER)
    const extStr = inn?.extras_detail || (inn?.extras != null ? `Extras  ${inn.extras}` : 'Extras  0')
    t(extStr, px + 22, y + EXTRAS_H * 0.68, 18, TEXT_DIM, 'left', '400', FB)
    if (inn?.extras != null)
      t(String(inn.extras), px + PW - 26, y + EXTRAS_H * 0.68, 20, TEXT_SEC, 'right', '600', FB)
    y += EXTRAS_H

    /* ── Total row ── */
    r(px, y, PW, TOTAL_H, HDR_NAVY)
    hl(px, y, PW, DIVIDER, 2)
    t(`TOTAL  ${ov} OVERS`, px + 22, y + TOTAL_H * 0.66, 22, WHITE, 'left', '900')
    t(sc, px + PW - 22, y + TOTAL_H * 0.66, 28, GOLD, 'right', '900')
    hl(px, y + TOTAL_H - 1, PW, DIVIDER, 2)
    y += TOTAL_H

    /* ── Bottom: BOWLING (left half) + FOW (right half) ── */
    const BL_X = px
    const FW_X = px + HALF

    const bowlTeamName = isLeft ? (match.team_b_name||'BOWLING') : (match.team_a_name||'BOWLING')
    const bowlTeamLogo = isLeft ? bLogo : aLogo
    const fowTeamName  = isLeft ? (match.team_a_name||'BATTING') : (match.team_b_name||'BATTING')
    const fowTeamLogo  = isLeft ? aLogo : bLogo

    r(BL_X, y, HALF, BOWL_HDR_H, HDR_NAVY)
    if (bowlTeamLogo) drawCover(ctx, bowlTeamLogo, BL_X+16, y+10, 38, 38)
    t(bowlTeamName.toUpperCase(), BL_X+(bowlTeamLogo?62:16), y+BOWL_HDR_H*0.68, 22, WHITE, 'left', '800')
    hl(BL_X, y + BOWL_HDR_H - 1, HALF, BORDER)

    r(FW_X, y, HALF, BOWL_HDR_H, HDR_FOW)
    if (fowTeamLogo) drawCover(ctx, fowTeamLogo, FW_X+16, y+10, 38, 38)
    t(fowTeamName.toUpperCase(), FW_X+(fowTeamLogo?62:16), y+BOWL_HDR_H*0.68, 22, WHITE, 'left', '800')
    hl(FW_X, y + BOWL_HDR_H - 1, HALF, BORDER)
    y += BOWL_HDR_H

    r(BL_X, y, HALF, BOWLCOL_H, HDR_COL)
    t('● BOWLING', BL_X+16, y+BOWLCOL_H*0.72, 17, TEXT_SEC, 'left', '700')
    t('O',   BL_X+BC_O,   y+BOWLCOL_H*0.70, 16, TEXT_SEC, 'center', '700')
    t('R',   BL_X+BC_R,   y+BOWLCOL_H*0.70, 16, TEXT_SEC, 'center', '700')
    t('M',   BL_X+BC_M,   y+BOWLCOL_H*0.70, 16, TEXT_SEC, 'center', '700')
    t('W',   BL_X+BC_W,   y+BOWLCOL_H*0.70, 16, TEXT_SEC, 'center', '700')
    t('ECO', BL_X+BC_ECO, y+BOWLCOL_H*0.70, 16, TEXT_SEC, 'right',  '700')
    hl(BL_X, y + BOWLCOL_H - 1, HALF, BORDER)

    r(FW_X, y, HALF, BOWLCOL_H, HDR_FOW)
    t('⚡ FALL OF WICKETS', FW_X+16, y+BOWLCOL_H*0.72, 17, TEXT_SEC, 'left', '700')
    t('OVERS', FW_X+HALF-20, y+BOWLCOL_H*0.70, 16, TEXT_SEC, 'right', '700')
    hl(FW_X, y + BOWLCOL_H - 1, HALF, BORDER)
    y += BOWLCOL_H

    const bowlers = inn?.bowling || []
    for (let i = 0; i < bottomRows; i++) {
      const p  = bowlers[i]
      const fw = fow[i]
      const rowBg = i % 2 === 0 ? ROW_DARK : ROW_ALT

      r(BL_X, y, HALF, BOWL_ROW_H, rowBg)
      hl(BL_X, y+BOWL_ROW_H-1, HALF, BORDER)
      r(FW_X, y, HALF, BOWL_ROW_H, i % 2 === 0 ? ROW_DARK : 'rgba(255,255,255,0.06)')
      hl(FW_X, y+BOWL_ROW_H-1, HALF, BORDER)

      const cy2  = y + BOWL_ROW_H / 2
      const txtY = y + BOWL_ROW_H * 0.64

      if (p) {
        ctx.save(); ctx.beginPath(); ctx.arc(BL_X+14, cy2, 7, 0, Math.PI*2)
        ctx.fillStyle = RED_BULL; ctx.fill(); ctx.restore()
        drawCirclePhoto(bowlPhotos[i], BL_X+14+10+B_PHOTO, cy2, B_PHOTO, 'rgba(239,68,68,0.2)', p.name)
        const bNameX = BL_X+14+10+B_PHOTO*2+16
        t(p.name||'—', bNameX, txtY, B_NAME, TEXT_PRI, 'left', '700', FB)
        const ov2  = p.balls_bowled > 0 ? `${Math.floor(p.balls_bowled/6)}.${p.balls_bowled%6}` : String(p.overs||'0')
        const eco2 = p.balls_bowled > 0 ? ((p.runs_conceded/p.balls_bowled)*6).toFixed(2) : '-'
        const wkts = p.wickets ?? 0
        t(ov2,                          BL_X+BC_O,   txtY, B_STAT, TEXT_SEC, 'center', '600', FB)
        t(String(p.runs_conceded??'-'), BL_X+BC_R,   txtY, B_STAT, TEXT_SEC, 'center', '600', FB)
        t(String(p.maidens??'0'),       BL_X+BC_M,   txtY, B_STAT, TEXT_SEC, 'center', '600', FB)
        t(String(wkts), BL_X+BC_W, txtY, B_STAT+2, wkts>0?GOLD:TEXT_DIM, 'center', wkts>0?'900':'600', FB)
        t(eco2,                         BL_X+BC_ECO, txtY, B_STAT, TEXT_SEC, 'right',  '600', FB)
      }
      if (fw) {
        const sc2    = fw.score || `${fw.runs||''}/${fw.wicket||i+1}`
        const plName = (fw.player_name || fw.batsman || '').toUpperCase()
        t(sc2,    FW_X+20,      txtY, B_STAT+1, TEXT_SEC, 'left',  '800', FB)
        t(plName, FW_X+130,     txtY, B_STAT,   TEXT_PRI, 'left',  '700', F)
        if (fw.over) t(String(fw.over), FW_X+HALF-20, txtY, B_STAT, TEXT_DIM, 'right', '600', FB)
      }
      y += BOWL_ROW_H
    }
  }

  // Gold bottom bar
  goldBar(ctx, 0, H - 6, W, 6)

  drawPanel(P1X, inn1, match.team_a_name||'TEAM A', aLogo, inn1BatPhotos, inn1BowlPhotos, fow1, true)
  drawPanel(P2X, inn2, match.team_b_name||'TEAM B', bLogo, inn2BatPhotos, inn2BowlPhotos, fow2, false)

  return { canvas, id: match.id, name: 'summary_banner' }
}

/* ─── Shared finish helper ────────────────────────────────────────── */

async function _finish(result, category, options = {}) {
  const dataUrl = result.canvas.toDataURL('image/png', 1.0)
  const fileName = `${result.name}_${result.id}.png`
  await saveBanner({ category, fileName, imageData: dataUrl })
  if (options.download !== false) {
    downloadPng(dataUrl, fileName)
  }
  return fileName
}

/* ─── Named Exports for AdminPanel integration ────────────────────── */

export async function generateSquadBannerForTeam(teamId, options = {}) {
  const result = await _generateTeamBanner(teamId)
  return _finish(result, 'teams', options)
}

export async function generateCaptainPosterForTeam(teamId, options = {}) {
  const result = await _generateCaptainPoster(teamId)
  return _finish(result, 'teams', options)
}

export async function generateLeagueBannerForLeague(leagueId, options = {}) {
  const result = await _generateLeagueBanner(leagueId)
  return _finish(result, 'leagues', options)
}

export async function generateVsBannerForMatch(match, leagueObj, options = {}) {
  const result = await _generateVsBanner(match, leagueObj)
  return _finish(result, 'matches', options)
}

export async function generateInningsBannerForMatch(match, scorecard, type, options = {}) {
  const result = await _generateInningsBanner(match, scorecard, type)
  return _finish(result, 'matches', options)
}

export async function generateResultBannerForMatch(match, scorecard, options = {}) {
  const result = await _generateResultBanner(match, scorecard)
  return _finish(result, 'results', options)
}

export async function generateSummaryBannerForMatch(match, scorecard, leagueObj, options = {}) {
  const result = await _generateSummaryBanner(match, scorecard, leagueObj)
  return _finish(result, 'results', options)
}

/* ─── Component ───────────────────────────────────────────────────── */

export default function GraphicsGeneratorPanel() {
  const [leagues, setLeagues] = useState([])
  const [teams, setTeams] = useState([])
  const [matches, setMatches] = useState([])
  const [selectedLeague, setSelectedLeague] = useState('')
  const [selectedTeam, setSelectedTeam] = useState('')
  const [selectedMatch, setSelectedMatch] = useState('')
  const [working, setWorking] = useState(false)
  const [lastGenerated, setLastGenerated] = useState(null)

  useEffect(() => {
    fetch(`${API}/leagues`).then(r => r.json()).then(data => {
      setLeagues(data || [])
      if (data?.[0]) setSelectedLeague(String(data[0].id))
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedLeague) return
    fetch(`${API}/leagues/${selectedLeague}/teams`).then(r => r.json()).then(data => {
      setTeams(data || [])
      if (data?.[0]) setSelectedTeam(String(data[0].id))
    }).catch(() => {})
    fetch(`${API}/leagues/${selectedLeague}/matches`).then(r => r.json()).then(data => {
      setMatches(data || [])
      if (data?.[0]) setSelectedMatch(String(data[0].id))
    }).catch(() => {})
  }, [selectedLeague])

  const selectedLeagueObj = useMemo(() => leagues.find(l => String(l.id) === String(selectedLeague)) || null, [leagues, selectedLeague])
  const selectedTeamObj   = useMemo(() => teams.find(t => String(t.id) === String(selectedTeam)) || null, [teams, selectedTeam])
  const selectedMatchObj  = useMemo(() => matches.find(m => String(m.id) === String(selectedMatch)) || null, [matches, selectedMatch])

  const withWorker = async (fn) => {
    setWorking(true)
    setLastGenerated(null)
    try { await fn() }
    catch (err) { alert(err.message || 'Banner generation failed') }
    finally { setWorking(false) }
  }

  const finish = async (result, category) => {
    const dataUrl = result.canvas.toDataURL('image/png', 1.0)
    const fileName = `${result.name}_${result.id}.png`
    await saveBanner({ category, fileName, imageData: dataUrl })
    downloadPng(dataUrl, fileName)
    setLastGenerated(fileName)
  }

  const generateLeagueBanner   = () => withWorker(async () => { if (!selectedLeagueObj) throw new Error('Select a league'); const result = await _generateLeagueBanner(selectedLeagueObj.id); await finish(result, 'leagues') })
  const generateTeamBanner     = () => withWorker(async () => { if (!selectedTeamObj) throw new Error('Select a team'); const result = await _generateTeamBanner(selectedTeamObj.id); await finish(result, 'teams') })
  const generateCaptainPoster  = () => withWorker(async () => { if (!selectedTeamObj) throw new Error('Select a team'); const result = await _generateCaptainPoster(selectedTeamObj.id); await finish(result, 'teams') })
  const generateVsBanner       = () => withWorker(async () => { if (!selectedMatchObj) throw new Error('Select a fixture match'); const result = await _generateVsBanner(selectedMatchObj, selectedLeagueObj); await finish(result, 'matches') })
  const generateResultBanner   = () => withWorker(async () => { if (!selectedMatchObj) throw new Error('Select a completed match'); const [match, sc] = await Promise.all([fetch(`${API}/matches/${selectedMatchObj.id}`).then(r => r.json()), fetch(`${API}/matches/${selectedMatchObj.id}/scorecard`).then(r => r.json())]); const result = await _generateResultBanner(match, sc); await finish(result, 'results') })
  const generateSummaryBanner  = () => withWorker(async () => { if (!selectedMatchObj) throw new Error('Select a match'); const [match, sc] = await Promise.all([fetch(`${API}/matches/${selectedMatchObj.id}`).then(r => r.json()), fetch(`${API}/matches/${selectedMatchObj.id}/scorecard`).then(r => r.json())]); const result = await _generateSummaryBanner(match, sc); await finish(result, 'results') })
  const generateInningsBanner  = (type) => withWorker(async () => { if (!selectedMatchObj) throw new Error('Select a match'); const [match, sc] = await Promise.all([fetch(`${API}/matches/${selectedMatchObj.id}`).then(r => r.json()), fetch(`${API}/matches/${selectedMatchObj.id}/scorecard`).then(r => r.json())]); const result = await _generateInningsBanner(match, sc, type); await finish(result, 'matches') })

  const sections = [
    { group: 'League',     icon: '🏆', color: 'var(--gold)',   items: [{ title: 'League Banner',        sub: '1920 × 720',  action: generateLeagueBanner }] },
    { group: 'Team',       icon: '👥', color: 'var(--accent)', items: [{ title: 'Squad Banner', sub: '1920 × 1080', action: generateTeamBanner }, { title: 'Captain Poster', sub: '1600 × 900', action: generateCaptainPoster }] },
    { group: 'Fixtures',   icon: '⚡', color: 'var(--sky)',    items: [{ title: 'VS Banner',            sub: '1920 × 1080', action: generateVsBanner }] },
    { group: 'Live Match', icon: '🔴', color: 'var(--red)',    items: [{ title: '1st Innings',          sub: '1920 × 1080', action: () => generateInningsBanner('first') }, { title: '2nd Innings / Chase', sub: '1920 × 1080', action: () => generateInningsBanner('second') }] },
    { group: 'Results',    icon: '🏅', color: 'var(--orange)', items: [{ title: 'Result Banner',        sub: '1920 × 1080', action: generateResultBanner }, { title: 'Full Match Summary', sub: '1920 × 1080', action: generateSummaryBanner }] },
  ]

  return (
    <div style={{ padding: '4px 0 40px' }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14,
        marginBottom: 28, paddingBottom: 20,
        borderBottom: '1px solid var(--glass-bd)',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 'var(--r-lg)',
          background: 'linear-gradient(135deg, var(--gold), #c97b10)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem', flexShrink: 0,
          boxShadow: '0 4px 20px rgba(247,201,72,0.25)',
        }}>🎨</div>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.3rem', letterSpacing: '-0.02em', margin: 0 }}>
            Graphics Generator
          </h2>
          <p style={{ color: 'var(--t3)', fontSize: '0.78rem', margin: '2px 0 0', fontFamily: 'var(--font-display)', letterSpacing: '0.3px' }}>
            Broadcast-quality banners · PNG export
          </p>
        </div>
      </div>

      {/* ── Context Selectors ── */}
      <div className="glass-card" style={{
        padding: '18px 20px', marginBottom: 28,
        borderTop: '3px solid var(--gold)',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="form-group">
            <label className="form-label" style={{ color: 'var(--gold)' }}>League</label>
            <select className="form-select" value={selectedLeague} onChange={e => setSelectedLeague(e.target.value)}
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23f7c948' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
              {leagues.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" style={{ color: 'var(--gold)' }}>Team</label>
            <select className="form-select" value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label" style={{ color: 'var(--gold)' }}>Match</label>
            <select className="form-select" value={selectedMatch} onChange={e => setSelectedMatch(e.target.value)}>
              {matches.map(m => <option key={m.id} value={m.id}>#{m.match_number} · {m.team_a_name} vs {m.team_b_name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Banner Sections ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {sections.map(section => (
          <div key={section.group}>
            {/* Section label */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontFamily: 'var(--font-display)', fontWeight: 700,
              fontSize: '0.68rem', letterSpacing: '2px', textTransform: 'uppercase',
              color: 'var(--t3)', marginBottom: 10,
            }}>
              <span>{section.icon}</span>
              <span>{section.group}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--glass-bd)', marginLeft: 4 }} />
            </div>

            {/* Cards grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 260px), 1fr))', gap: 10 }}>
              {section.items.map(item => (
                <div key={item.title} className="glass-card" style={{
                  padding: '16px 18px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                  borderLeft: `3px solid ${section.color}`,
                  transition: 'border-color 0.2s, background 0.2s',
                }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem', color: 'var(--t1)', letterSpacing: '0.2px', marginBottom: 2 }}>
                      {item.title}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--t3)', letterSpacing: '0.5px' }}>
                      {item.sub}
                    </div>
                  </div>
                  <button
                    disabled={working}
                    onClick={item.action}
                    style={{
                      background: working ? 'var(--glass-bg)' : `linear-gradient(135deg, ${section.color}, ${section.color}cc)`,
                      border: `1px solid ${section.color}55`,
                      borderRadius: 'var(--r-md)',
                      color: working ? 'var(--t3)' : '#fff',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 800, fontSize: '0.72rem',
                      letterSpacing: '1px', textTransform: 'uppercase',
                      padding: '8px 16px', cursor: working ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s', whiteSpace: 'nowrap', flexShrink: 0,
                      opacity: working ? 0.5 : 1,
                    }}
                  >
                    {working ? '…' : 'Generate'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Status ── */}
      {working && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginTop: 24, padding: '12px 16px',
          background: 'var(--gold-dim)',
          border: '1px solid rgba(247,201,72,0.22)',
          borderRadius: 'var(--r-lg)', fontSize: '0.84rem', color: 'var(--gold)',
          fontFamily: 'var(--font-display)', fontWeight: 700,
        }}>
          <span style={{ display: 'inline-block', animation: 'spin .8s linear infinite', fontSize: '1rem' }}>⟳</span>
          Rendering broadcast-quality banner…
        </div>
      )}
      {!working && lastGenerated && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginTop: 24, padding: '12px 16px',
          background: 'var(--accent-dim)',
          border: '1px solid rgba(0,232,150,0.22)',
          borderRadius: 'var(--r-lg)', fontSize: '0.84rem', color: 'var(--accent)',
          fontFamily: 'var(--font-display)', fontWeight: 700,
        }}>
          ✓ &nbsp;<strong>{lastGenerated}</strong> saved and downloaded
        </div>
      )}
    </div>
  )
}