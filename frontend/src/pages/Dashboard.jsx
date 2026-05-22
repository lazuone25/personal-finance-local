import { useAccounts, useTransactions, useSyncStatus } from '../api/hooks'
import SummaryCard from '../components/SummaryCard'

const ALL_TYPES = ['checking', 'card', 'savings', 'deposit', 'other']

function groupByCurrency(accounts) {
  const all = ALL_TYPES.flatMap(t => accounts?.[t] || [])
  const grouped = {}
  for (const acc of all) {
    const currency = acc.balance?.currency || acc.currency
    if (!currency) continue
    const amount = parseFloat(acc.balance?.amount || 0)
    if (!grouped[currency]) grouped[currency] = 0
    grouped[currency] += amount
  }
  return grouped
}

function groupByBank(accounts) {
  const all = ALL_TYPES.flatMap(t => accounts?.[t] || [])
  const banks = {}
  for (const acc of all) {
    const bank = acc.bank_name || 'Altele'
    const currency = acc.balance?.currency || acc.currency
    if (!currency) continue
    const amount = parseFloat(acc.balance?.amount || 0)
    if (!banks[bank]) banks[bank] = {}
    if (!banks[bank][currency]) banks[bank][currency] = 0
    banks[bank][currency] += amount
  }
  return banks
}

const CURRENCY_COLORS = {
  RON: '#3498db',
  EUR: '#2ecc71',
  USD: '#f39c12',
  GBP: '#e67e22',
  CHF: '#9b59b6',
}

function currencyColor(currency) {
  return CURRENCY_COLORS[currency] || '#888'
}

export default function Dashboard() {
  const { data: accounts, isLoading, isError } = useAccounts()
  const { data: transactions = [] } = useTransactions()
  const { data: syncStatus } = useSyncStatus()

  if (isLoading) return <p>Se încarcă...</p>
  if (isError) return <p style={{ color: '#e74c3c' }}>Eroare la încărcarea datelor. Verifică că serverul rulează.</p>

  const byCurrency = groupByCurrency(accounts)
  const currencyEntries = Object.entries(byCurrency).filter(([, amount]) => amount > 0)
  const byBank = groupByBank(accounts)
  const bankEntries = Object.entries(byBank)
  const recent = transactions.slice(0, 10)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1>Dashboard</h1>
        {syncStatus?.last_sync && (
          <span style={{ color: '#888', fontSize: '0.85rem' }}>
            Sync: {new Date(syncStatus.last_sync).toLocaleString('ro-RO')}
          </span>
        )}
      </div>

      {/* Total per currency */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {currencyEntries.length === 0 ? (
          <p style={{ color: '#666', gridColumn: '1 / -1' }}>Niciun cont cu sold. Conectează o bancă din Setări.</p>
        ) : (
          currencyEntries.map(([currency, amount]) => (
            <SummaryCard
              key={currency}
              title={`Total ${currency}`}
              amount={amount}
              currency={currency}
              color={currencyColor(currency)}
            />
          ))
        )}
      </div>

      {/* Per-bank breakdown */}
      {bankEntries.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '0.85rem', color: '#999', textTransform: 'uppercase', letterSpacing: 1, marginBottom: '0.75rem' }}>
            Per bancă
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {bankEntries.map(([bankName, currencies]) => {
              const currList = Object.entries(currencies).filter(([, a]) => a > 0)
              if (currList.length === 0) return null
              // Primary currency for color (first by amount)
              const primaryCurrency = currList.sort((a, b) => b[1] - a[1])[0][0]
              // Format multi-currency label
              const subtitle = currList
                .map(([c, a]) => `${a.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} ${c}`)
                .join(' · ')

              return (
                <div key={bankName} style={{
                  background: '#fff',
                  borderRadius: 8,
                  padding: '1.25rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  borderLeft: `4px solid ${currencyColor(primaryCurrency)}`,
                }}>
                  <p style={{ fontWeight: 700, marginBottom: '0.4rem', fontSize: '1rem' }}>{bankName}</p>
                  <p style={{ color: '#555', fontSize: '0.9rem', lineHeight: 1.6 }}>{subtitle}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <section>
        <h2>Tranzacții recente</h2>
        {recent.length === 0 ? (
          <p style={{ color: '#666' }}>Nicio tranzacție. Conectează o bancă din Setări.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
            <thead style={{ background: '#f8f8f8' }}>
              <tr>
                {['Data', 'Descriere', 'Sumă', 'Tip'].map(h => (
                  <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem', color: '#555' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map(tx => (
                <tr key={tx.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{tx.booking_date}</td>
                  <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{tx.description || '—'}</td>
                  <td style={{ padding: '0.75rem', fontWeight: 600, color: tx.transaction_type === 'credit' ? '#2ecc71' : '#e74c3c' }}>
                    {tx.transaction_type === 'debit' ? '-' : '+'}{parseFloat(tx.amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} {tx.currency}
                  </td>
                  <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#888' }}>{tx.transaction_type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
