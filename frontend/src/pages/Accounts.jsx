import { useAccounts } from '../api/hooks'
import AccountCard from '../components/AccountCard'

const SECTIONS = [
  { key: 'checking', label: 'Cont curent / Card' },
  { key: 'card', label: 'Card' },
  { key: 'savings', label: 'Economii' },
  { key: 'deposit', label: 'Depozite' },
  { key: 'other', label: 'Altele' },
]

export default function Accounts() {
  const { data: accounts, isLoading, isError } = useAccounts()

  if (isLoading) return <p>Se încarcă...</p>
  if (isError) return <p style={{ color: '#e74c3c' }}>Eroare la încărcarea conturilor. Verifică că serverul rulează.</p>

  const hasAny = accounts && Object.values(accounts).some(l => l.length > 0)

  return (
    <div>
      <h1>Conturi</h1>
      {!hasAny && <p style={{ color: '#666' }}>Nicio bancă conectată. Mergi la Setări.</p>}
      {SECTIONS.map(({ key, label }) => {
        const list = accounts?.[key] || []
        if (list.length === 0) return null
        return (
          <section key={key} style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1rem', color: '#555', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>
              {label}
            </h2>
            {list.map(acc => <AccountCard key={acc.id} account={acc} />)}
          </section>
        )
      })}
    </div>
  )
}
