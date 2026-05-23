import { useAccounts, useTransactions, useSyncStatus, useDeposits, useRates, useXtbPortfolio, useExtra } from '../api/hooks'
import SummaryCard from '../components/SummaryCard'
import { getBankColor } from '../utils/bankColors'

const ALL_TYPES = ['checking', 'card', 'savings', 'deposit', 'other']

function toEur(ronAmount, rates) {
  const rate = rates?.['EUR']
  if (!rate || !ronAmount) return null
  const eur = ronAmount / rate
  return '(' + eur.toLocaleString('ro-RO', { maximumFractionDigits: 0 }) + ' EUR)'
}

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

function groupByConnection(accounts) {
  const all = ALL_TYPES.flatMap(t => accounts?.[t] || [])
  const groups = {}
  for (const acc of all) {
    const currency = acc.balance?.currency || acc.currency
    if (!currency) continue
    const amount = parseFloat(acc.balance?.amount || 0)
    // Split Revolut: accounts with "&" in name are "comun"
    let label = acc.bank_name || 'Altele'
    if (acc.bank_name === 'Revolut' && acc.name?.includes('&')) {
      label = 'Revolut (comun)'
    }
    // Hide USD for Revolut (unused)
    if (acc.bank_name === 'Revolut' && currency === 'USD') continue
    if (!groups[label]) groups[label] = {}
    if (!groups[label][currency]) groups[label][currency] = 0
    groups[label][currency] += amount
  }
  return groups
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
  const { data: deposits = [] } = useDeposits()
  const { data: rates = {} } = useRates()
  const { data: xtbData } = useXtbPortfolio()
  const { data: extraData } = useExtra()
  const extraTotal = extraData?.main_balance || 0
  const xtbEquity = xtbData?.configured ? (xtbData.equity || 0) : 0
  const tradevilleTotal = 0  // placeholder until Tradeville is integrated
  const investitiiEur = xtbEquity + tradevilleTotal

  if (isLoading) return <p style={{ color: '#64748B' }}>Se încarcă...</p>
  if (isError) return <p style={{ color: '#EF4444' }}>Eroare la încărcarea datelor. Verifică că serverul rulează.</p>

  const byCurrency = groupByCurrency(accounts)
  const byConnection = groupByConnection(accounts)
  const recent = transactions.slice(0, 10)

  const depositRonTotal = deposits.filter(d => d.currency === 'RON').reduce((s, d) => s + parseFloat(d.amount), 0)
  const dobanzaTotalaRon = deposits.filter(d => d.currency === 'RON').reduce((s, d) => s + (parseFloat(d.total_at_maturity) - parseFloat(d.amount)), 0)

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

      {/* Top 5 summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {/* TOTAL RON */}
        <SummaryCard
          title="Total RON"
          amount={byCurrency['RON'] || 0}
          currency="RON"
          color="#3B82F6"
          extra={toEur(byCurrency['RON'] || 0, rates)}
        />
        {/* TOTAL EUR */}
        <SummaryCard
          title="Total EUR"
          amount={byCurrency['EUR'] || 0}
          currency="EUR"
          color="#10B981"
        />
        {/* DEPOZITE — sum of deposit amounts in RON */}
        <SummaryCard
          title="Depozite"
          amount={depositRonTotal}
          currency="RON"
          color="#8B5CF6"
          extra={toEur(depositRonTotal, rates) ? (
            <span>{toEur(depositRonTotal, rates)} <span style={{ color: '#10B981', fontWeight: 600 }}>+{Math.round(dobanzaTotalaRon).toLocaleString('ro-RO')} RON</span></span>
          ) : null}
        />
        {/* INVESTIȚII — real totals */}
        <SummaryCard
          title="Investiții"
          amount={investitiiEur}
          currency="EUR"
          color="#F59E0B"
          extra={investitiiEur > 0 && rates ? '(' + Math.round(investitiiEur * (rates['EUR'] || 1)).toLocaleString('ro-RO') + ' RON)' : null}
        />
        {/* EXTRA — static 0 */}
        <SummaryCard title="Extra" amount={extraTotal} currency="RON" color="#06B6D4" extra={toEur(extraTotal, rates)} />
      </div>

      {/* Per bancă */}
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', fontWeight: 700 }}>
          Per bancă
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {Object.entries(byConnection).map(([label, currencies]) => {
            // bankName is the base name without "(comun)"
            const bankName = label.replace(' (comun)', '')
            const bankColor = getBankColor(bankName)
            const currList = Object.entries(currencies)
            const subtitleParts = currList.map(([c, a]) => {
              const formatted = a.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) + ' ' + c
              if (c === 'RON') {
                const eurStr = toEur(a, rates)
                return eurStr ? formatted + ' ' + eurStr : formatted
              }
              return formatted
            })
            const subtitle = subtitleParts.join(' · ')

            return (
              <div key={label} style={{
                background: '#fff',
                borderRadius: 12,
                padding: '1.25rem 1.5rem',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                borderLeft: `4px solid ${bankColor}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: bankColor, flexShrink: 0, display: 'inline-block' }} />
                  <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', margin: 0 }}>{label}</p>
                </div>
                <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>{subtitle}</p>
              </div>
            )
          })}
        </div>
      </div>

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
