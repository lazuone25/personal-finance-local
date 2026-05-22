import { useAccounts, useTransactions, useSyncStatus } from '../api/hooks'
import SummaryCard from '../components/SummaryCard'
import { getBankColor } from '../utils/bankColors'

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
  RON: '#3B82F6',
  EUR: '#10B981',
  USD: '#F59E0B',
  GBP: '#8B5CF6',
  CHF: '#06B6D4',
}

function currencyColor(currency) {
  return CURRENCY_COLORS[currency] || '#64748B'
}

export default function Dashboard() {
  const { data: accounts, isLoading, isError } = useAccounts()
  const { data: transactions = [] } = useTransactions()
  const { data: syncStatus } = useSyncStatus()

  if (isLoading) return <p style={{ color: '#64748B' }}>Se încarcă...</p>
  if (isError) return <p style={{ color: '#EF4444' }}>Eroare la încărcarea datelor. Verifică că serverul rulează.</p>

  const byCurrency = groupByCurrency(accounts)
  const currencyEntries = Object.entries(byCurrency).filter(([, amount]) => amount > 0)
  const byBank = groupByBank(accounts)
  const bankEntries = Object.entries(byBank)
  const recent = transactions.slice(0, 10)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Dashboard</h1>
        {syncStatus?.last_sync && (
          <span style={{ color: '#94A3B8', fontSize: '0.8rem' }}>
            Sync: {new Date(syncStatus.last_sync).toLocaleString('ro-RO')}
          </span>
        )}
      </div>

      {/* Total per currency */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {currencyEntries.length === 0 ? (
          <p style={{ color: '#64748B', gridColumn: '1 / -1' }}>Niciun cont cu sold. Conectează o bancă din Setări.</p>
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
          <h2 style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', fontWeight: 700 }}>
            Per bancă
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {bankEntries.map(([bankName, currencies]) => {
              const currList = Object.entries(currencies).filter(([, a]) => a > 0)
              if (currList.length === 0) return null
              const bankColor = getBankColor(bankName)
              const subtitle = currList
                .map(([c, a]) => `${a.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} ${c}`)
                .join(' · ')

              return (
                <div key={bankName} style={{
                  background: '#fff',
                  borderRadius: 12,
                  padding: '1.25rem 1.5rem',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  borderLeft: `4px solid ${bankColor}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                    <span style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: bankColor,
                      flexShrink: 0,
                      display: 'inline-block',
                    }} />
                    <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>{bankName}</p>
                  </div>
                  <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: 1.6 }}>{subtitle}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <section>
        <h2 style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', fontWeight: 700 }}>
          Tranzacții recente
        </h2>
        {recent.length === 0 ? (
          <p style={{ color: '#64748B' }}>Nicio tranzacție. Conectează o bancă din Setări.</p>
        ) : (
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                  {['Data', 'Descriere', 'Sumă', 'Tip'].map(h => (
                    <th key={h} style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      color: '#64748B',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map(tx => (
                  <tr key={tx.id} style={{ borderTop: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#475569' }}>{tx.booking_date}</td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1E293B' }}>{tx.description || '—'}</td>
                    <td style={{
                      padding: '0.75rem 1rem',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      color: tx.transaction_type === 'credit' ? '#10B981' : '#EF4444',
                      whiteSpace: 'nowrap',
                    }}>
                      {tx.transaction_type === 'debit' ? '−' : '+'}
                      {parseFloat(tx.amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                      <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#94A3B8', marginLeft: '0.3rem' }}>{tx.currency}</span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.2rem 0.6rem',
                        borderRadius: 20,
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: tx.transaction_type === 'credit' ? '#D1FAE5' : '#FEE2E2',
                        color: tx.transaction_type === 'credit' ? '#065F46' : '#991B1B',
                      }}>
                        {tx.transaction_type}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
