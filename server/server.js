const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 3001;
const MEDIA_ROOT = path.join(__dirname, '..', 'media');
const WEB_DIST = path.join(__dirname, '..', 'dist');
const BANNERS_ROOT = path.join(MEDIA_ROOT, 'banners');
const TEAM_BANNER_DIR = path.join(MEDIA_ROOT, 'banners', 'team_squad');
const LEAGUE_BANNER_DIR = path.join(BANNERS_ROOT, 'leagues');
const TEAMS_BANNER_DIR = path.join(BANNERS_ROOT, 'teams');
const MATCHES_BANNER_DIR = path.join(BANNERS_ROOT, 'matches');
const RESULTS_BANNER_DIR = path.join(BANNERS_ROOT, 'results');

if (!fs.existsSync(TEAM_BANNER_DIR)) fs.mkdirSync(TEAM_BANNER_DIR, { recursive: true });
[LEAGUE_BANNER_DIR, TEAMS_BANNER_DIR, MATCHES_BANNER_DIR, RESULTS_BANNER_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const defaultOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'];
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : defaultOrigins;

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '25mb' }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/media', express.static(MEDIA_ROOT));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`);
  }
});
const upload = multer({ storage });

// ===================== AUTHENTICATION =====================
app.post('/api/auth/signup', (req, res) => {
  const { username, password } = req.body;
  const result = db.createUser(username, password);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.getUser(username);
  if (!user || user.password !== password) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: 'mock-jwt-token-123', username });
});

// ===================== LEAGUES =====================
app.get('/api/leagues', (req, res) => res.json(db.getLeagues()));
app.get('/api/leagues/:id', (req, res) => {
  const league = db.getLeague(parseInt(req.params.id));
  if (!league) return res.status(404).json({ error: 'Not found' });
  res.json(league);
});
app.post('/api/leagues', upload.single('logo'), (req, res) => {
  const { name, city, venue, organizer, season, format, overs_per_innings } = req.body;
  const logo = req.file ? `/uploads/${req.file.filename}` : null;
  const id = db.createLeague({ name, city, venue, organizer, logo, season, format: format || 'round-robin', overs_per_innings: parseInt(overs_per_innings) || 20 });
  res.json({ id, message: 'League created' });
});
app.put('/api/leagues/:id', upload.single('logo'), (req, res) => {
  const { name, city, venue, organizer, season, format, overs_per_innings, status } = req.body;
  const league = db.getLeague(parseInt(req.params.id));
  if (!league) return res.status(404).json({ error: 'Not found' });
  const logo = req.file ? `/uploads/${req.file.filename}` : league.logo;
  db.updateLeague(parseInt(req.params.id), { name: name || league.name, city: city || league.city, venue: venue || league.venue, organizer: organizer || league.organizer, logo, season: season || league.season, format: format || league.format, overs_per_innings: parseInt(overs_per_innings) || league.overs_per_innings, status: status || league.status });
  res.json({ message: 'Updated' });
});
app.delete('/api/leagues/:id', (req, res) => { db.deleteLeague(parseInt(req.params.id)); res.json({ message: 'Deleted' }); });

// ===================== SPONSORS =====================
app.post('/api/leagues/:id/sponsors', upload.single('logo'), (req, res) => {
  const logo = req.file ? `/uploads/${req.file.filename}` : null;
  const id = db.addSponsor(parseInt(req.params.id), req.body.name, logo);
  res.json({ id });
});
app.delete('/api/sponsors/:id', (req, res) => { db.deleteSponsor(parseInt(req.params.id)); res.json({ message: 'Deleted' }); });

// ===================== TEAMS =====================
app.get('/api/leagues/:id/teams', (req, res) => res.json(db.getTeams(parseInt(req.params.id))));
app.get('/api/teams/:id', (req, res) => {
  const team = db.getTeam(parseInt(req.params.id));
  if (!team) return res.status(404).json({ error: 'Not found' });
  res.json(team);
});
app.post('/api/teams', upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'captain_photo', maxCount: 1 }]), (req, res) => {
  const logo = req.files?.logo?.[0] ? `/uploads/${req.files.logo[0].filename}` : null;
  const captain_photo = req.files?.captain_photo?.[0] ? `/uploads/${req.files.captain_photo[0].filename}` : null;
  const id = db.createTeam({ league_id: parseInt(req.body.league_id), name: req.body.name, logo, captain_name: req.body.captain_name, captain_photo });
  res.json({ id });
});

app.post('/api/teams/bulk', upload.any(), (req, res) => {
  try {
    const data = JSON.parse(req.body.data);
    const { league_id, name, captain_index, players } = data;

    const normalizedPlayers = Array.isArray(players)
      ? players.map((p) => ({
          ...p,
          name: String(p?.name || '').trim(),
          role: String(p?.role || 'batsman').toLowerCase()
        }))
      : [];
    const namedPlayers = normalizedPlayers.filter((p) => p.name);
    const bowlingCount = namedPlayers.filter((p) => p.role === 'bowler' || p.role === 'all-rounder' || p.role === 'all rounder').length;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: 'Team name is required' });
    }
    if (namedPlayers.length !== 11) {
      return res.status(400).json({ error: 'Exactly 11 players are mandatory for squad creation' });
    }
    if (bowlingCount < 2) {
      return res.status(400).json({ error: 'At least 2 bowlers/all-rounders are mandatory in squad' });
    }
    if (!Number.isInteger(captain_index) || captain_index < 0 || captain_index > 10 || !normalizedPlayers[captain_index]?.name) {
      return res.status(400).json({ error: 'Captain must be selected from entered players' });
    }
    
    // Find team logo
    const logoFile = req.files.find(f => f.fieldname === 'logo');
    const logo = logoFile ? `/uploads/${logoFile.filename}` : null;

    // Determine captain name and photo from the chosen index
    let captain_name = '';
    let captain_photo = null;
    let captain_id = null;

    if (captain_index !== null && normalizedPlayers[captain_index]) {
      captain_name = normalizedPlayers[captain_index].name;
      const capFile = req.files.find(f => f.fieldname === `player_photo_${captain_index}`);
      if (capFile) captain_photo = `/uploads/${capFile.filename}`;
    }

    // 1. Create Team
    const teamId = db.createTeam({ 
      league_id: parseInt(league_id), 
      name, 
      logo, 
      captain_name, 
      captain_photo 
    });

    // 2. Prepare players array
    const playersArray = normalizedPlayers.map((p, index) => {
      const pFile = req.files.find(f => f.fieldname === `player_photo_${index}`);
      return {
        name: p.name,
        role: p.role || 'batsman',
        jersey_number: parseInt(p.jersey_number) || 0,
        photo: pFile ? `/uploads/${pFile.filename}` : null
      };
    }).filter(p => p.name);

    // 3. Create Players
    if (playersArray.length > 0) {
      const playerIds = db.createPlayers(teamId, playersArray);
      if (captain_index !== null && normalizedPlayers[captain_index]) {
        captain_id = playerIds[captain_index] || null;
      }
    }

    if (captain_id) {
      db.updateTeam(teamId, { captain_id });
    }

    res.json({ id: teamId, message: 'Team and squad created successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create team and squad' });
  }
});

app.post('/api/banners/team-squad', (req, res) => {
  try {
    const { teamId, teamName, imageData } = req.body || {};
    if (!teamId || !teamName || !imageData || typeof imageData !== 'string') {
      return res.status(400).json({ error: 'teamId, teamName and imageData are required' });
    }

    const base64 = imageData.replace(/^data:image\/png;base64,/, '');
    const safeName = teamName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    const parsedTeamId = parseInt(teamId, 10);
    const teamDirName = `team_${parsedTeamId}`;
    const teamDir = path.join(TEAM_BANNER_DIR, teamDirName);
    if (!fs.existsSync(teamDir)) fs.mkdirSync(teamDir, { recursive: true });
    const fileName = `${safeName || 'team'}_squad_${Date.now()}.png`;
    const absPath = path.join(teamDir, fileName);
    fs.writeFileSync(absPath, Buffer.from(base64, 'base64'));

    const publicPath = `/media/banners/team_squad/${teamDirName}/${fileName}`;
    db.updateTeam(parsedTeamId, { squad_banner: publicPath });
    return res.json({ message: 'Team squad banner saved', path: publicPath });
  } catch (error) {
    console.error('Team banner save error:', error);
    return res.status(500).json({ error: 'Failed to save team squad banner' });
  }
});

app.post('/api/banners/save', (req, res) => {
  try {
    const { category, fileName, imageData } = req.body || {};
    if (!category || !fileName || !imageData || typeof imageData !== 'string') {
      return res.status(400).json({ error: 'category, fileName and imageData are required' });
    }

    const categoryMap = {
      leagues: LEAGUE_BANNER_DIR,
      teams: TEAMS_BANNER_DIR,
      matches: MATCHES_BANNER_DIR,
      results: RESULTS_BANNER_DIR,
    };

    const targetDir = categoryMap[category];
    if (!targetDir) return res.status(400).json({ error: 'Invalid banner category' });

    const safeFileName = String(fileName).replace(/[^a-zA-Z0-9._-]/g, '_');
    const absPath = path.join(targetDir, safeFileName);
    const base64 = imageData.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(absPath, Buffer.from(base64, 'base64'));

    return res.json({ message: 'Banner saved', path: `/media/banners/${category}/${safeFileName}` });
  } catch (error) {
    console.error('Banner save error:', error);
    return res.status(500).json({ error: 'Failed to save banner' });
  }
});
app.put('/api/teams/:id', upload.fields([{ name: 'logo', maxCount: 1 }, { name: 'captain_photo', maxCount: 1 }]), (req, res) => {
  const team = db.getTeam(parseInt(req.params.id));
  if (!team) return res.status(404).json({ error: 'Not found' });
  const logo = req.files?.logo?.[0] ? `/uploads/${req.files.logo[0].filename}` : team.logo;
  const captain_photo = req.files?.captain_photo?.[0] ? `/uploads/${req.files.captain_photo[0].filename}` : team.captain_photo;
  db.updateTeam(parseInt(req.params.id), { name: req.body.name || team.name, logo, captain_name: req.body.captain_name || team.captain_name, captain_photo });
  res.json({ message: 'Updated' });
});
app.delete('/api/teams/:id', (req, res) => { db.deleteTeam(parseInt(req.params.id)); res.json({ message: 'Deleted' }); });

// ===================== PLAYERS =====================
app.get('/api/teams/:id/players', (req, res) => res.json(db.getPlayers(parseInt(req.params.id))));
app.post('/api/players', upload.single('photo'), (req, res) => {
  const photo = req.file ? `/uploads/${req.file.filename}` : null;
  const id = db.createPlayer({ team_id: parseInt(req.body.team_id), name: req.body.name, photo, role: req.body.role || 'batsman', jersey_number: parseInt(req.body.jersey_number) || 0 });
  res.json({ id });
});
app.put('/api/players/:id', upload.single('photo'), (req, res) => {
  const updated = db.updatePlayer(parseInt(req.params.id), { name: req.body.name, role: req.body.role, jersey_number: parseInt(req.body.jersey_number), photo: req.file ? `/uploads/${req.file.filename}` : undefined });
  res.json({ message: updated ? 'Updated' : 'Not found' });
});
app.get('/api/players/:id/stats', (req, res) => {
  const playerId = parseInt(req.params.id, 10);
  if (!playerId) return res.status(400).json({ error: 'Invalid player id' });
  const stats = db.getPlayerStats(playerId, req.query.league_id || null);
  if (!stats) return res.status(404).json({ error: 'Player not found' });
  return res.json(stats);
});
app.delete('/api/players/:id', (req, res) => { db.deletePlayer(parseInt(req.params.id)); res.json({ message: 'Deleted' }); });

// ===================== MATCHES =====================
app.get('/api/leagues/:id/matches', (req, res) => res.json(db.getMatches(parseInt(req.params.id))));
app.get('/api/matches', (req, res) => res.json(db.getAllMatches()));
app.get('/api/matches/:id', (req, res) => {
  const match = db.getMatch(parseInt(req.params.id));
  if (!match) return res.status(404).json({ error: 'Not found' });
  res.json(match);
});
app.get('/api/matches/live/all', (req, res) => res.json(db.getLiveMatches()));
app.get('/api/matches/upcoming/all', (req, res) => res.json(db.getUpcomingMatches()));
app.get('/api/matches/completed/all', (req, res) => res.json(db.getCompletedMatches()));
app.post('/api/matches', (req, res) => {
  const result = db.createMatch(req.body || {});
  if (result.error) return res.status(400).json(result);
  res.json(result);
});
app.post('/api/leagues/:id/generate-fixtures', (req, res) => {
  const result = db.generateFixtures(parseInt(req.params.id), req.body || {});
  if (result.error) return res.status(400).json(result);
  res.json(result);
});
app.put('/api/matches/:id', (req, res) => {
  db.updateMatch(parseInt(req.params.id), req.body);
  res.json({ message: 'Updated' });
});
app.delete('/api/matches/:id', (req, res) => {
  const deleted = db.deleteMatch(parseInt(req.params.id));
  if (!deleted) return res.status(404).json({ error: 'Match not found' });
  res.json({ message: 'Fixture deleted' });
});
app.delete('/api/leagues/:id/fixtures/upcoming', (req, res) => {
  const result = db.deleteUpcomingFixtures(parseInt(req.params.id));
  res.json({ message: `${result.count} upcoming fixtures deleted`, count: result.count });
});

// ===================== SCORING =====================
app.post('/api/matches/:id/start', (req, res) => {
  const result = db.startMatch(parseInt(req.params.id), req.body);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});
app.post('/api/innings/:id/ball', (req, res) => {
  const result = db.recordBall(parseInt(req.params.id), req.body);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});
app.delete('/api/innings/:id/ball/last', (req, res) => {
  const result = db.undoLastBall(parseInt(req.params.id));
  if (result.error) return res.status(400).json(result);
  res.json(result);
});
app.post('/api/innings/:id/select-bowler', (req, res) => {
  const result = db.selectBowler(parseInt(req.params.id), parseInt(req.body.bowler_id));
  if (result.error) return res.status(400).json(result);
  res.json(result);
});
app.post('/api/innings/:id/initialize', (req, res) => {
  const result = db.initializeInnings(parseInt(req.params.id), req.body);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});
app.post('/api/matches/:id/second-innings', (req, res) => {
  const result = db.startSecondInnings(parseInt(req.params.id));
  if (result.error) return res.status(400).json(result);
  res.json(result);
});
app.post('/api/matches/:id/end', (req, res) => {
  const result = db.endMatch(parseInt(req.params.id), req.body.man_of_match_id ? parseInt(req.body.man_of_match_id) : null);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});
app.get('/api/matches/:id/scorecard', (req, res) => res.json(db.getScorecard(parseInt(req.params.id))));
app.get('/api/innings/:id/balls', (req, res) => res.json(db.getBalls(parseInt(req.params.id))));

// ===================== POINTS & STATS =====================
app.get('/api/leagues/:id/points', (req, res) => res.json(db.getPoints(parseInt(req.params.id))));
app.get('/api/leagues/:id/stats/batting', (req, res) => res.json(db.getBattingStats(parseInt(req.params.id))));
app.get('/api/leagues/:id/stats/bowling', (req, res) => res.json(db.getBowlingStats(parseInt(req.params.id))));
app.get('/api/stats/global/batting', (req, res) => res.json(db.getGlobalBattingStats()));
app.get('/api/stats/global/bowling', (req, res) => res.json(db.getGlobalBowlingStats()));
app.get('/api/stats/dashboard', (req, res) => res.json(db.getDashboardStats()));

if (fs.existsSync(WEB_DIST)) {
  app.use(express.static(WEB_DIST));
  app.get(/^\/(?!api|uploads|media).*/, (req, res) => {
    res.sendFile(path.join(WEB_DIST, 'index.html'));
  });
}

async function startServer() {
  await db.initStorage();
  app.listen(PORT, () => console.log(`CricketHub API running on http://localhost:${PORT}`));
}

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});
