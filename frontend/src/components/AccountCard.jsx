import { getBankColor } from '../utils/bankColors'

export default function AccountCard({ account, fallbackName }) {
  const balance = account.balance
  const bankColor = getBankColor(account.bank_name)
  const displayName = account.name || fallbackName || account.bank_name

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      padding: '1.25rem 1.5rem',
      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      marginBottom: '0.75rem',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderLeft: `4px solid ${bankColor}`,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: bankColor + '22',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: bankColor }}>
            {account.bank_name?.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div>
          <p style={{ fontWeight: 600, marginBottom: '0.2rem', color: '#1E293B', fontSize: '0.95rem' }}>{displayName}</p>
          <p style={{ color: '#64748B', fontSize: '0.8rem' }}>
            {account.bank_name}
            {account.iban ? ` · ${account.iban}` : ''}
          </p>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        {balance ? (
          <>
            <p style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0F172A' }}>
              {parseFloat(balance.amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
              <span style={{ fontSize: '0.8rem', color: '#64748B', marginLeft: '0.3rem' }}>{balance.currency}</span>
            </p>
            <p style={{ color: '#94A3B8', fontSize: '0.75rem', marginTop: '0.15rem' }}>
              {balance.last_updated ? new Date(balance.last_updated).toLocaleString('ro-RO') : 'N/A'}
            </p>
          </>
        ) : (
          <p style={{ color: '#94A3B8' }}>—</p>
        )}
      </div>
    </div>
  )
}
