import { useState, useContext } from 'react'
import { useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'

const API = '/api'

export default function AdminLogin() {
  const [isLogin, setIsLogin]   = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login }               = useContext(AuthContext)
  const navigate                = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const endpoint = isLogin ? '/auth/login' : '/auth/signup'
    try {
      const res  = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Authentication failed'); return }
      if (isLogin) { login(data); navigate('/admin') }
      else { alert('Signup successful! Please login.'); setIsLogin(true) }
    } catch {
      setError('Network error, please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-login-wrap">
      <div className="glass-card admin-login-card">

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{
            width:52, height:52, borderRadius:'50%',
            background:'var(--accent-dim)',
            border:'1px solid rgba(0,212,132,.25)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:'1.4rem', margin:'0 auto 14px',
          }}>🏏</div>
          <h2 style={{
            fontSize:'1.45rem', fontFamily:'var(--font-display)',
            background:'var(--g-accent)', WebkitBackgroundClip:'text',
            WebkitTextFillColor:'transparent', marginBottom:4,
          }}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p style={{ color:'var(--t2)', fontSize:'.85rem' }}>
            {isLogin ? 'Sign in to manage your leagues' : 'Register a new organizer account'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background:'var(--red-dim)', color:'var(--red)',
            padding:'10px 13px', borderRadius:'var(--r-md)',
            marginBottom:16, fontSize:'.85rem',
            border:'1px solid rgba(255,77,109,.22)',
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              required
              autoComplete="username"
            />
          </div>
          <div className="form-group" style={{ marginBottom:22 }}>
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              required
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width:'100%', marginBottom:12, padding:'11px' }}
            disabled={loading}
          >
            {loading ? (
              <span style={{ display:'flex', alignItems:'center', gap:7 }}>
                <span style={{ width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,.3)',borderTopColor:'#fff',animation:'spin .7s linear infinite',display:'inline-block' }} />
                {isLogin ? 'Signing in…' : 'Creating…'}
              </span>
            ) : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        {/* Toggle */}
        <p style={{ textAlign:'center', color:'var(--t2)', fontSize:'.85rem', marginTop:4 }}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            onClick={() => { setIsLogin(l => !l); setError('') }}
            style={{ background:'none',border:'none',color:'var(--accent)',cursor:'pointer',fontWeight:700,padding:0,fontFamily:'var(--font-body)',fontSize:'.85rem' }}
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  )
}