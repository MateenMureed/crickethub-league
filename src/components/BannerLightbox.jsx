import { useEffect } from 'react'

export default function BannerLightbox({ src, alt = 'Banner preview', onClose }) {
  useEffect(() => {
    if (!src) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose?.()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [src, onClose])

  if (!src) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 10, 14, 0.88)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        zIndex: 9999,
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.25)',
          background: 'rgba(18, 29, 38, 0.9)',
          color: '#fff',
          fontSize: '1.35rem',
          lineHeight: 1,
          cursor: 'pointer',
        }}
      >
        x
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(event) => event.stopPropagation()}
        style={{
          maxWidth: 'min(1200px, 96vw)',
          maxHeight: '92vh',
          width: 'auto',
          height: 'auto',
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.18)',
          boxShadow: '0 18px 52px rgba(0,0,0,0.55)',
          objectFit: 'contain',
        }}
      />
    </div>
  )
}
