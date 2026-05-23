import { useAccounts, useTransactions } from '../api/hooks'
import AccountCard from '../components/AccountCard'

const ALL_TYPES = ['checking', 'card', 'savings', 'deposit', 'other']

const SECTIONS = [
  { key: 'checking', label: 'Cont curent' },
  { key: 'card', label: 'Card' },
  { key: 'savings', label: 'Economii' },
  { key: 'deposit', label: 'Depozite (API)' },
  { key: 'other', label: 'Altele' },
]

function AccountTransactions({ accountId }) {
  const { data: txData, isLoading } = useTransactions({ account_id: accountId })
  const transactions = txData?.transactions || []

  if (isLoading) return <p style={{ color: '#94A3B8', fontSize: '0.8rem', padding: '0.5rem 1.75rem' }}>Se încarcă tranzacțiile...</p>
  if (!transactions.length) return <p style={{ color: '#94A3B8', fontSize: '0.8rem', padding: '0.5rem 1.75rem' }}>Nicio tranzacție.</p>

  return (
    <div style={{ background: '#F8FAFC', borderRadius: '0 0 12px 12px', borderTop: '1px solid #F1F5F9' }}>
      {transactions.map(tx => (
        <div key={tx.id} style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.6rem 1.75rem', borderBottom: '1px solid #F1F5F9'
        }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#1E293B' }}>{tx.description || '—'}</p>
            <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>{tx.booking_date}</p>
          </div>
          <p style={{
            margin: 0, fontWeight: 600, fontSize: '0.9rem',
            color: tx.transaction_type === 'credit' ? '#10B981' : '#EF4444',
            whiteSpace: 'nowrap'
          }}>
            {tx.transaction_type === 'credit' ? '+' : '-'}{parseFloat(tx.amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} {tx.currency}
          </p>
        </div>
      ))}
    </div>
  )
}

export default function Accounts() {
  const { data: accounts, isLoading, isError } = useAccounts()

  if (isLoading) return <p style={{ color: '#64748B' }}>Se încarcă...</p>
  if (isError) return <p style={{ color: '#EF4444' }}>Eroare la încărcarea conturilor. Verifică că serverul rulează.</p>

  const hasAny = accounts && Object.values(accounts).some(l => l.length > 0)
  const userName = [...ALL_TYPES.flatMap(t => accounts?.[t] || [])].find(a => a.name)?.name || ''

  return (
    <div>
      <h1>Conturi</h1>
      {!hasAny && (
        <p style={{ color: '#64748B' }}>Nicio bancă conectată. Mergi la Setări.</p>
      )}
      {SECTIONS.map(({ key, label }) => {
        const list = accounts?.[key] || []
        if (list.length === 0) return null
        return (
          <section key={key} style={{ marginBottom: '2rem' }}>
            <h2 style={{
              fontSize: '0.75rem',
              color: '#64748B',
              marginBottom: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              fontWeight: 700,
            }}>
              {label}
            </h2>
            {list.map(acc => {
              const currency = acc.balance?.currency || acc.currency
              const isRevolutPersonalRON = acc.bank_name === 'Revolut' && !acc.name?.includes('&') && currency === 'RON'

              if (isRevolutPersonalRON) {
                return (
                  <div key={acc.id} style={{ borderRadius: 12, overflow: 'hidden', marginBottom: '0.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                    <AccountCard account={acc} fallbackName={userName} />
                    <AccountTransactions accountId={acc.id} />
                  </div>
                )
              }

              return <AccountCard key={acc.id} account={acc} fallbackName={userName} />
            })}
          </section>
        )
      })}
    </div>
  )
}
