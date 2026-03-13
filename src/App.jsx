import { Routes, Route, Navigate } from 'react-router-dom'
import { useContext } from 'react'
import { AuthContext } from './context/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import LeagueHub from './pages/LeagueHub'
import LeaguesPage from './pages/LeaguesPage'
import FixturesPage from './pages/FixturesPage'
import LiveMatchesPage from './pages/LiveMatchesPage'
import ResultsPage from './pages/ResultsPage'
import StatsPage from './pages/StatsPage'
import AdminPanel from './pages/AdminPanel.jsx'
import AdminLogin from './pages/AdminLogin'
import LiveMatch from './pages/LiveMatch'
import MatchScorecard from './pages/MatchScorecard'
import LiveScoring from './pages/LiveScoring'

function ProtectedRoute({ children }) {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/admin/login" replace />;
  return children;
}

function App() {
  return (
    <div className="app">
      <div className="stadium-bg"></div>
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/leagues" element={<LeaguesPage />} />
          <Route path="/fixtures" element={<FixturesPage />} />
          <Route path="/live" element={<LiveMatchesPage />} />
          <Route path="/results" element={<ResultsPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/league/:id" element={<LeagueHub />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<ProtectedRoute><AdminPanel /></ProtectedRoute>} />
          <Route path="/admin/scoring/:matchId" element={<ProtectedRoute><LiveScoring /></ProtectedRoute>} />
          <Route path="/match/:id/live" element={<LiveMatch />} />
          <Route path="/match/:id/scorecard" element={<MatchScorecard />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App