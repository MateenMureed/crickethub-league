import { useState, useEffect } from 'react'

export default function SplashScreen() {
  const [show, setShow] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  if (!show) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'linear-gradient(135deg, var(--bg-base) 0%, var(--bg-3) 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      animation: 'fadeOut 0.6s ease-in-out 2.4s forwards',
    }}>
      <style>{`
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(0,232,150,0.3), inset 0 0 20px rgba(0,232,150,0.1); }
          50% { box-shadow: 0 0 40px rgba(0,232,150,0.6), inset 0 0 40px rgba(0,232,150,0.2); }
        }
        .splash-logo {
          animation: float 2s ease-in-out infinite, pulse-glow 2s ease-in-out infinite;
        }
      `}</style>

      {/* Animated background circles */}
      <div style={{
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,232,150,0.2) 0%, transparent 70%)',
        top: '20%',
        left: '10%',
        filter: 'blur(40px)',
        animation: 'float 4s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute',
        width: 250,
        height: 250,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(247,201,72,0.15) 0%, transparent 70%)',
        bottom: '15%',
        right: '5%',
        filter: 'blur(40px)',
        animation: 'float 5s ease-in-out infinite',
      }} />

      {/* Logo Container */}
      <div className="splash-logo" style={{
        position: 'relative',
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
      }}>
        {/* Logo Circle */}
        <div style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '3rem',
          fontWeight: 900,
          color: '#fff',
          boxShadow: '0 0 40px rgba(0,232,150,0.5), 0 10px 30px rgba(0,0,0,0.3)',
          position: 'relative',
        }}>
          🏏
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.2)',
          }} />
        </div>

        {/* Brand Text */}
        <div style={{
          textAlign: 'center',
        }}>
          <h1 style={{
            fontSize: '2.2rem',
            fontWeight: 900,
            color: 'var(--t1)',
            margin: 0,
            marginBottom: 8,
            letterSpacing: '-0.02em',
            fontFamily: 'var(--font-display)',
          }}>
            Cricket<span style={{ color: 'var(--accent)' }}>Hub</span>
          </h1>
          <p style={{
            fontSize: '0.85rem',
            color: 'var(--t2)',
            margin: 0,
            fontWeight: 500,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}>
            Professional Cricket Management
          </p>
        </div>

        {/* Loading Indicator */}
        <div style={{
          display: 'flex',
          gap: 6,
          marginTop: 20,
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--accent)',
              animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }} />
          ))}
          <style>{`
            @keyframes pulse {
              0%, 100% { opacity: 0.3; }
              50% { opacity: 1; }
            }
          `}</style>
        </div>
      </div>

      {/* Bottom Text */}
      <div style={{
        position: 'absolute',
        bottom: 40,
        textAlign: 'center',
        zIndex: 10,
      }}>
        <p style={{
          color: 'var(--t3)',
          fontSize: '0.75rem',
          margin: 0,
          fontWeight: 600,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}>
          Loading...
        </p>
      </div>
    </div>
  )
}
