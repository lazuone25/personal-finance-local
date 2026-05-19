export default function SummaryCard({ title, amount, currency = 'RON', color = '#3498db' }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 8, padding: '1.5rem',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)', borderTop: `4px solid ${color}`,
    }}>
      <p style={{ color: '#666', marginBottom: '0.5rem', fontSize: '0.9rem' }}>{title}</p>
      <p style={{ fontSize: '1.8rem', fontWeight: 'bold', color }}>
        {amount.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} {currency}
      </p>
    </div>
  )
}
