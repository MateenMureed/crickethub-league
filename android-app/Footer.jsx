export default function Footer() {
  return (
    <footer style={{
      padding: '20px 16px',
      borderTop: '1px solid var(--border2)',
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontWeight: 900,
        fontSize: '1rem',
        letterSpacing: '2px',
        background: 'var(--g-accent)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        marginBottom: 4,
      }}>
        CricketHub
      </div>
      <p style={{ fontSize: '0.7rem', color: 'var(--t4)', margin: 0 }}>
        © {new Date().getFullYear()} CricketHub. All rights reserved.
      </p>
    </footer>
  )
}
