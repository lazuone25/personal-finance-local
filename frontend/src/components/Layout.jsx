import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'DASHBOARD' },
  { to: '/accounts', label: 'CONTURI' },
  { to: '/extra', label: 'EXTRA' },
  { to: '/investitii', label: 'INVESTIȚII' },
  { to: '/deposits', label: 'DEPOZITE' },
  { to: '/transactions', label: 'TRANZACȚII' },
  { to: '/statistici', label: 'STATISTICI' },
  { to: '/settings', label: 'SETĂRI' },
]

export default function Layout({ children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header style={{
        background: '#0F172A',
        boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
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
          <span style={{
            color: '#fff',
            fontWeight: 700,
            fontSize: '1.1rem',
            letterSpacing: '-0.01em',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          }}>
            MoneyTrack
          </span>
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
        </nav>
      </header>
      <main style={{
        flex: 1,
        background: '#F8FAFC',
        padding: '2rem',
        maxWidth: 1200,
        width: '100%',
        margin: '0 auto',
        alignSelf: 'stretch',
      }}>
        {children}
      </main>
    </div>
  )
}
