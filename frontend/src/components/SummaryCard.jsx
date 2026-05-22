export default function SummaryCard({ title, amount, currency = 'RON', color = '#3B82F6', subtitle, extra }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: '1.25rem 1.5rem',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      borderTop: `4px solid ${color}`,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <p style={{ color: '#64748B', marginBottom: '0.5rem', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {title}
      </p>
      <p style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0F172A', lineHeight: 1.2, marginBottom: subtitle ? '0.25rem' : 0 }}>
        {(isFinite(amount) ? amount : 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
        <span style={{ fontSize: '0.9rem', fontWeight: 500, color, marginLeft: '0.3rem' }}>{currency}</span>
        {extra && <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#94A3B8', marginLeft: '0.3rem' }}>{extra}</span>}
      </p>
      {subtitle && (
        <p style={{ color: '#94A3B8', fontSize: '0.8rem', marginTop: '0.25rem' }}>{subtitle}</p>
      )}
    </div>
  )
}
