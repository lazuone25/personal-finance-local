import { useAccounts, useTransactions, useSyncStatus, useDeposits, useRates, useXtbPortfolio, useExtra, useDatorii, useConnections } from '../api/hooks'
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

function groupByOwner(accounts, connections) {
  const connOwnerMap = {}
  for (const c of (connections || [])) connOwnerMap[c.id] = c.owner || 'andrei'

  const all = ALL_TYPES.flatMap(t => accounts?.[t] || [])
  const groups = { comun: {}, andrei: {}, anca: {} }
  for (const acc of all) {
    const currency = acc.balance?.currency || acc.currency
    if (!currency) continue
    const amount = parseFloat(acc.balance?.amount || 0)
    if (acc.bank_name === 'Revolut' && currency === 'USD') continue
    const owner = connOwnerMap[acc.bank_connection_id] || 'andrei'
    const label = acc.bank_name || 'Altele'
    if (!groups[owner][label]) groups[owner][label] = {}
    if (!groups[owner][label][currency]) groups[owner][label][currency] = 0
    groups[owner][label][currency] += amount
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
  const { data: connections = [] } = useConnections()
  const { data: transactions = [] } = useTransactions()
  const { data: syncStatus } = useSyncStatus()
  const { data: deposits = [] } = useDeposits()
  const { data: rates = {} } = useRates()
  const { data: xtbData } = useXtbPortfolio()
  const { data: extraData } = useExtra()
  const { data: datoriiData } = useDatorii()
  const extraTotal = (extraData?.main_balance || 0) + (extraData?.fond_urgenta?.amount || 0)
  const xtbEquity = xtbData?.configured ? (xtbData.equity || 0) : 0
  const tradevilleTotal = 0  // placeholder until Tradeville is integrated
  const investitiiEur = xtbEquity + tradevilleTotal

  if (isLoading) return <p style={{ color: '#64748B' }}>Se încarcă...</p>
  if (isError) return <p style={{ color: '#EF4444' }}>Eroare la încărcarea datelor. Verifică că serverul rulează.</p>

  const byCurrency = groupByCurrency(accounts)
  const byOwner = groupByOwner(accounts, connections)
  const recent = transactions.slice(0, 10)

  const depositRonTotal = deposits.filter(d => d.currency === 'RON').reduce((s, d) => s + parseFloat(d.amount), 0)
  const dobanzaTotalaRon = deposits.filter(d => d.currency === 'RON').reduce((s, d) => s + (parseFloat(d.total_at_maturity) - parseFloat(d.amount)), 0)

  const xtbRon = Math.round(investitiiEur * (rates['EUR'] || 1))
  const totalRon = (byCurrency['RON'] || 0) + depositRonTotal + xtbRon + extraTotal

  // Datorii
  const creditRevolut = datoriiData?.credit_revolut || {}
  const cardRaiffeisen = datoriiData?.card_raiffeisen || {}
  const creditSold = creditRevolut.sold_curent || 0
  const cardCheltuit = Math.max(0, (cardRaiffeisen.limita || 0) - (cardRaiffeisen.sold_curent || 0))
  const dobandaZilnica = Math.round(creditSold * ((creditRevolut.rata_dobanzii || 0) / 100) / 365 * 100) / 100
  const ziScadenta = creditRevolut.zi_scadenta || 1
  const today = new Date()
  const lastScad = new Date(today.getFullYear(), today.getMonth(), ziScadenta) <= today
    ? new Date(today.getFullYear(), today.getMonth(), ziScadenta)
    : new Date(today.getFullYear(), today.getMonth() - 1, ziScadenta)
  const zileDobanda = Math.floor((today - lastScad) / (1000 * 60 * 60 * 24))
  const dobandaAcumulata = dobandaZilnica * zileDobanda
  const totalDatorii = creditSold + cardCheltuit + dobandaAcumulata

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
        {/* TOTAL RON — conturi + depozite + investitii + extra */}
        <SummaryCard
          title="Total RON"
          amount={totalRon}
          currency="RON"
          color="#3B82F6"
          extra={toEur(totalRon, rates)}
        />
        {/* DATORII */}
        <SummaryCard
          title="Datorii"
          amount={totalDatorii}
          currency="RON"
          color="#EF4444"
          extra={toEur(totalDatorii, rates)}
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

      {/* Per bancă — COMUN / ANDREI / ANCA */}
      {[
        { key: 'comun', label: 'Comun', accentColor: '#8B5CF6' },
        { key: 'andrei', label: 'Andrei', accentColor: '#3B82F6' },
        { key: 'anca', label: 'Anca', accentColor: '#EC4899' },
      ].map(({ key, label, accentColor }) => {
        const banks = byOwner[key]
        return (
          <div key={key} style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '0.75rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem', fontWeight: 700 }}>
              Per bancă — <span style={{ color: accentColor }}>{label}</span>
            </h2>
            {Object.keys(banks).length === 0 ? (
              <div style={{ color: '#94A3B8', fontSize: '0.85rem', padding: '0.5rem 0' }}>
                Nicio bancă conectată.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                {Object.entries(banks).map(([bankLabel, currencies]) => {
                  const bankColor = getBankColor(bankLabel)
                  const subtitleParts = Object.entries(currencies).map(([c, a]) => {
                    const formatted = a.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) + ' ' + c
                    if (c === 'RON') {
                      const eurStr = toEur(a, rates)
                      return eurStr ? formatted + ' ' + eurStr : formatted
                    }
                    return formatted
                  })
                  return (
                    <div key={bankLabel} style={{
                      background: '#fff',
                      borderRadius: 12,
                      padding: '1.25rem 1.5rem',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                      borderLeft: `4px solid ${bankColor}`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: bankColor, flexShrink: 0, display: 'inline-block' }} />
                        <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', margin: 0 }}>{bankLabel}</p>
                      </div>
                      <p style={{ color: '#475569', fontSize: '0.875rem', lineHeight: 1.6, margin: 0 }}>{subtitleParts.join(' · ')}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}

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
