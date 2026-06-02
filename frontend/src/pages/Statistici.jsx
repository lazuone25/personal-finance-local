import { useTransactions, useDeposits, useRates, useXtbPortfolio, useExtra, useAccounts } from '../api/hooks'
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'

function fmt(val) {
  return parseFloat(val || 0).toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const INTERNAL_PATTERNS = [
  /economii cu acces instant/i,
  /cont de economii/i,
  /conturile proprii/i,
  /top-up by/i,
  /revolut\*\*/i,         // transfer intre carduri Revolut proprii
  /andrei anghel/i,       // transfer la/de la cont comun propriu
  /^to account,/i,        // transfer la cont bancar propriu
  /transfer depozit/i,    // depunere depozit
]

function isInternal(tx) {
  const desc = tx.description || ''
  return INTERNAL_PATTERNS.some(p => p.test(desc))
}

// Filtrare în două etape:
// 1. Exclude după descriere (transferuri interne cunoscute)
// 2. Exclude perechi credit+debit cu aceeași sumă în aceeași zi
function filterInternalTransfers(transactions) {
  const afterDesc = transactions.filter(tx => !isInternal(tx))

  const byDateAmt = {}
  for (const tx of afterDesc) {
    const key = `${tx.booking_date}_${Math.round(Math.abs(parseFloat(tx.amount)) * 100)}`
    if (!byDateAmt[key]) byDateAmt[key] = { credits: [], debits: [] }
    if (tx.transaction_type === 'credit') byDateAmt[key].credits.push(tx.id)
    else byDateAmt[key].debits.push(tx.id)
  }
  const internalIds = new Set()
  for (const group of Object.values(byDateAmt)) {
    const pairs = Math.min(group.credits.length, group.debits.length)
    for (let i = 0; i < pairs; i++) {
      internalIds.add(group.credits[i])
      internalIds.add(group.debits[i])
    }
  }
  return afterDesc.filter(tx => !internalIds.has(tx.id))
}

function monthLabel(d) {
  const mon = d.toLocaleDateString('ro-RO', { month: 'short' }).replace('.', '')
  return `${mon} '${d.getFullYear().toString().slice(-2)}`
}

function getMonthlyData(transactions) {
  const months = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months[key] = { month: monthLabel(d), Venituri: 0, Cheltuieli: 0, Net: 0 }
  }
  for (const tx of transactions) {
    const key = (tx.booking_date || '').substring(0, 7)
    if (!months[key]) continue
    const amt = Math.abs(parseFloat(tx.amount) || 0)
    if (tx.transaction_type === 'credit') months[key].Venituri += amt
    else months[key].Cheltuieli += amt
  }
  return Object.values(months).map(m => ({
    ...m,
    Venituri: Math.round(m.Venituri),
    Cheltuieli: Math.round(m.Cheltuieli),
    Net: Math.round(m.Venituri - m.Cheltuieli),
  }))
}

function getDailyData(transactions) {
  const days = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().substring(0, 10)
    const label = d.toLocaleDateString('ro-RO', { day: '2-digit', month: 'short' }).replace('.', '')
    days[key] = { day: label, Venituri: 0, Cheltuieli: 0 }
  }
  for (const tx of transactions) {
    const key = tx.booking_date || ''
    if (!days[key]) continue
    const amt = Math.abs(parseFloat(tx.amount) || 0)
    if (tx.transaction_type === 'credit') days[key].Venituri += amt
    else days[key].Cheltuieli += amt
  }
  return Object.values(days).map(d => ({
    ...d,
    Venituri: Math.round(d.Venituri),
    Cheltuieli: Math.round(d.Cheltuieli),
  }))
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '0.6rem 0.9rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', fontSize: '0.8rem' }}>
      <p style={{ fontWeight: 700, color: '#0F172A', margin: '0 0 0.4rem' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ margin: '0.15rem 0', color: p.color, fontWeight: 600 }}>
          {p.name}: {fmt(p.value)} RON
        </p>
      ))}
    </div>
  )
}

const Section = ({ title, children }) => (
  <div style={{ marginBottom: '2rem' }}>
    <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.75rem' }}>{title}</p>
    {children}
  </div>
)

const Card = ({ children, style }) => (
  <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '1.25rem 1.5rem', ...style }}>
    {children}
  </div>
)

const NoData = () => <p style={{ color: '#94A3B8', fontSize: '0.875rem', margin: 0 }}>Nu există tranzacții sincronizate.</p>

export default function Statistici() {
  const { data: transactions = [] } = useTransactions()
  const { data: deposits = [] } = useDeposits()
  const { data: rates = {} } = useRates()
  const { data: xtbData } = useXtbPortfolio()
  const { data: extraData } = useExtra()
  const { data: accounts } = useAccounts()

  const eurRate = rates['EUR'] || 1

  // Filtrăm transferurile interne înainte de orice calcul
  const filtered = filterInternalTransfers(transactions)
  const hasData = filtered.length > 0

  // Wealth breakdown
  const allAccounts = ['checking', 'card', 'savings', 'deposit', 'other'].flatMap(t => accounts?.[t] || [])
  const conturiRon = allAccounts
    .filter(a => (a.balance?.currency || a.currency) === 'RON')
    .reduce((s, a) => s + parseFloat(a.balance?.amount || 0), 0)
  const conturiEur = allAccounts
    .filter(a => (a.balance?.currency || a.currency) === 'EUR')
    .reduce((s, a) => s + parseFloat(a.balance?.amount || 0), 0)
  const depoziteRon = deposits.filter(d => d.currency === 'RON').reduce((s, d) => s + parseFloat(d.amount), 0)
  const xtbEur = xtbData?.configured ? (xtbData.equity || 0) : 0
  const economiiRon = (extraData?.main_balance || 0) + (extraData?.fond_urgenta?.amount || 0)

  const wealthData = [
    { name: 'Conturi', value: Math.round(conturiRon + conturiEur * eurRate), color: '#3B82F6' },
    { name: 'Depozite', value: Math.round(depoziteRon), color: '#8B5CF6' },
    { name: 'Investiții', value: Math.round(xtbEur * eurRate), color: '#F59E0B' },
    { name: 'Economii', value: Math.round(economiiRon), color: '#A8A9AD' },
  ].filter(d => d.value > 0)

  const totalPatrimoniu = wealthData.reduce((s, d) => s + d.value, 0)
  const monthlyData = getMonthlyData(filtered)
  const dailyData = getDailyData(filtered)

  return (
    <div>
      <h1 style={{ margin: '0 0 1.5rem' }}>Statistici</h1>

      {/* Distribuție patrimoniu */}
      <Section title="Distribuție patrimoniu">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          {wealthData.map(d => (
            <Card key={d.name}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0, display: 'inline-block' }} />
                <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>{d.name}</p>
              </div>
              <p style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0F172A', margin: '0 0 0.15rem' }}>
                {fmt(d.value)} <span style={{ fontSize: '0.75rem', color: '#94A3B8', fontWeight: 500 }}>RON</span>
              </p>
              <p style={{ fontSize: '0.7rem', color: '#94A3B8', margin: 0 }}>
                {totalPatrimoniu > 0 ? Math.round(d.value / totalPatrimoniu * 100) : 0}% din total
              </p>
            </Card>
          ))}
        </div>
        <Card>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={wealthData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={fmt} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Valoare" radius={[4, 4, 0, 0]}>
                {wealthData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Section>

      {/* Venituri vs Cheltuieli */}
      <Section title="Venituri vs Cheltuieli — ultimele 6 luni (fără transferuri interne)">
        <Card>
          {!hasData ? <NoData /> : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '0.5rem' }} />
                <Line type="monotone" dataKey="Venituri" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="Cheltuieli" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      {/* Sold net lunar */}
      <Section title="Sold net lunar (venituri − cheltuieli)">
        <Card>
          {!hasData ? <NoData /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={0} stroke="#CBD5E1" strokeWidth={1.5} />
                <Line type="monotone" dataKey="Net" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4, fill: '#3B82F6' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>

      {/* Activitate zilnică */}
      <Section title="Activitate zilnică — ultimele 30 zile (fără transferuri interne)">
        <Card>
          {!hasData ? <NoData /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dailyData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#64748B' }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} tickFormatter={fmt} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '0.5rem' }} />
                <Line type="monotone" dataKey="Venituri" stroke="#10B981" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="Cheltuieli" stroke="#EF4444" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </Section>
    </div>
  )
}
