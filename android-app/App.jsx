import { useContext } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthContext } from './context/AuthContext'

import BottomTabBar from './components/BottomTabBar'

import AdminLogin from './pages/AdminLogin'
import HomePage from './pages/HomePage'
import LeaguesPage from './pages/LeaguesPage'
import LeagueHub from './pages/LeagueHub'
import LiveMatchesPage from './pages/LiveMatchesPage'
import LiveMatch from './pages/LiveMatch'
import FixturesPage from './pages/FixturesPage'
import ResultsPage from './pages/ResultsPage'
import StatsPage from './pages/StatsPage'
import MatchScorecard from './pages/MatchScorecard'
import AdminPanel from './pages/AdminPanel'
import LiveScoring from './pages/LiveScoring'

export default function App() {
  const { user } = useContext(AuthContext)

  return (
    <div className="app-wrapper" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--t1)' }}>
      <main style={{ flex: 1, paddingBottom: '64px', overflowY: 'auto', overflowX: 'hidden' }}>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<AdminLogin />} />
          <Route path="/leagues" element={<LeaguesPage />} />
          <Route path="/leagues/:leagueId" element={<LeagueHub />} />
          <Route path="/live" element={<LiveMatchesPage />} />
          <Route path="/live/:matchId" element={<LiveMatch />} />
          <Route path="/match/:id/live" element={<LiveMatch />} />
          <Route path="/fixtures" element={<FixturesPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/match/:matchId" element={<MatchScorecard />} />
          <Route path="/match/:id/scorecard" element={<MatchScorecard />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Protected admin routes */}
          <Route path="/admin" element={user ? <AdminPanel /> : <Navigate to="/login" />} />
          <Route path="/admin/scoring/:matchId" element={user ? <LiveScoring /> : <Navigate to="/login" />} />

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      <BottomTabBar />
    </div>
  )
}
