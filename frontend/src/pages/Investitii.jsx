const brokers = [
  { name: 'XTB', color: '#E4002B' },
  { name: 'Tradeville', color: '#1A56DB' },
]

export default function Investitii() {
  return (
    <div>
      <h1 style={{ margin: '0 0 1.5rem' }}>Investiții</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {brokers.map(({ name, color }) => (
          <div key={name} style={{
            background: '#fff',
            borderRadius: 12,
            padding: '1.25rem 1.75rem',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            borderLeft: `4px solid ${color}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: color, flexShrink: 0, display: 'inline-block',
              }} />
              <p style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', margin: 0 }}>{name}</p>
            </div>
            <p style={{ color: '#94A3B8', fontSize: '0.85rem', margin: 0 }}>În curând</p>
          </div>
        ))}
      </div>
    </div>
  )
}
