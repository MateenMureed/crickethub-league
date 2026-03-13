export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div>
          <div className="footer-logo">CricketHub</div>
          <p className="footer-text" style={{ marginTop: 5 }}>
            Professional Cricket League Management Platform
          </p>
        </div>
        <p className="footer-text">
          © {new Date().getFullYear()} CricketHub. All rights reserved.
        </p>
      </div>
    </footer>
  )
}