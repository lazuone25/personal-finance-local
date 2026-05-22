import { useAccounts } from '../api/hooks'
import AccountCard from '../components/AccountCard'

const ALL_TYPES = ['checking', 'card', 'savings', 'deposit', 'other']

const SECTIONS = [
  { key: 'checking', label: 'Cont curent' },
  { key: 'card', label: 'Card' },
  { key: 'savings', label: 'Economii' },
  { key: 'deposit', label: 'Depozite (API)' },
  { key: 'other', label: 'Altele' },
]

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
            {list.map(acc => (
              <AccountCard key={acc.id} account={acc} fallbackName={userName} />
            ))}
          </section>
        )
      })}
    </div>
  )
}
