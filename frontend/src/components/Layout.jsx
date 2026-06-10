import { useEffect, useState } from 'react'
import { NavLink, Link, useLocation } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'DASHBOARD' },
  { to: '/accounts', label: 'CONTURI' },
  { to: '/extra', label: 'EXTRA' },
  { to: '/investitii', label: 'INVESTIȚII' },
  { to: '/deposits', label: 'DEPOZITE' },
  { to: '/transactions', label: 'TRANZACȚII' },
  { to: '/datorii', label: 'DATORII' },
  { to: '/statistici', label: 'STATISTICI' },
  { to: '/settings', label: 'SETĂRI' },
]

function useIsMobile(breakpoint = 820) {
  const [isMobile, setIsMobile] = useState(() => window.matchMedia(`(max-width: ${breakpoint}px)`).matches)
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`)
    const onChange = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [breakpoint])
  return isMobile
}

export default function Layout({ children }) {
  const isMobile = useIsMobile()
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()

  // închide meniul la navigare
  useEffect(() => { setMenuOpen(false) }, [location.pathname])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{
        background: '#0F172A',
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        paddingTop: 'env(safe-area-inset-top)',
      }}>
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 1.5rem',
          height: 56,
        }}>
          <Link to="/" style={{
            color: '#fff',
            fontWeight: 700,
            fontSize: '1.1rem',
            letterSpacing: '-0.01em',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            textDecoration: 'none',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}>
            Tracker Anghel Family
          </Link>
          {isMobile ? (
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Meniu"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '1.5rem',
                cursor: 'pointer',
                padding: '0.25rem 0.5rem',
                lineHeight: 1,
              }}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
              {navItems.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  style={({ isActive }) => ({
                    padding: '0.4rem 0.9rem',
                    borderRadius: 6,
                    color: isActive ? '#fff' : 'rgba(255,255,255,0.6)',
                    background: isActive ? 'rgba(59,130,246,0.25)' : 'transparent',
                    textDecoration: 'none',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    borderBottom: isActive ? '2px solid #3B82F6' : '2px solid transparent',
                    transition: 'all 0.15s ease',
                  })}
                >
                  {label}
                </NavLink>
              ))}
            </div>
          )}
        </nav>
        {isMobile && menuOpen && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            background: '#0F172A',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            padding: '0.5rem 0.75rem 0.75rem',
            gap: '0.15rem',
          }}>
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                style={({ isActive }) => ({
                  padding: '0.7rem 1rem',
                  borderRadius: 8,
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.65)',
                  background: isActive ? 'rgba(59,130,246,0.25)' : 'transparent',
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                })}
              >
                {label}
              </NavLink>
            ))}
          </div>
        )}
      </header>
      <main style={{
        flex: 1,
        background: '#F8FAFC',
        padding: isMobile ? '1rem' : '2rem',
        maxWidth: 1200,
        width: '100%',
        margin: '0 auto',
        alignSelf: 'stretch',
        boxSizing: 'border-box',
      }}>
        {children}
      </main>
    </div>
  )
}
