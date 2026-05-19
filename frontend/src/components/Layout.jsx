import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/accounts', label: 'Conturi' },
  { to: '/transactions', label: 'Tranzacții' },
  { to: '/settings', label: 'Setări' },
]

export default function Layout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <nav style={{ width: 200, background: '#1a1a2e', padding: '2rem 1rem' }}>
        <h2 style={{ color: '#fff', marginBottom: '2rem', fontSize: '1rem' }}>MoneyTrack</h2>
        {navItems.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'block',
              padding: '0.75rem 1rem',
              marginBottom: '0.5rem',
              borderRadius: 6,
              color: isActive ? '#fff' : '#aaa',
              background: isActive ? '#16213e' : 'transparent',
              textDecoration: 'none',
            })}
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <main style={{ flex: 1, padding: '2rem', background: '#f5f5f5' }}>
        {children}
      </main>
    </div>
  )
}
