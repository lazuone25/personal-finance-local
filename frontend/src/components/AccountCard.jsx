export default function AccountCard({ account }) {
  const balance = account.balance
  return (
    <div style={{
      background: '#fff', borderRadius: 8, padding: '1.25rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '0.75rem',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <div>
        <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{account.name}</p>
        <p style={{ color: '#888', fontSize: '0.85rem' }}>{account.bank_name} {account.iban ? `· ${account.iban}` : ''}</p>
      </div>
      <div style={{ textAlign: 'right' }}>
        {balance ? (
          <>
            <p style={{ fontWeight: 700, fontSize: '1.1rem' }}>
              {parseFloat(balance.amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} {balance.currency}
            </p>
            <p style={{ color: '#aaa', fontSize: '0.75rem' }}>
              {new Date(balance.last_updated).toLocaleString('ro-RO')}
            </p>
          </>
        ) : (
          <p style={{ color: '#aaa' }}>—</p>
        )}
      </div>
    </div>
  )
}
