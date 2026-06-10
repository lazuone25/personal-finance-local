import { useState } from 'react'
import { useTransactions, useDeposits, useRates, useXtbPortfolio, useExtra, useAccounts, useCategories } from '../api/hooks'
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, PieChart, Pie,
} from 'recharts'

function fmt(val) {
  return parseFloat(val || 0).toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

const INTERNAL_PATTERNS = [
  /economii cu acces instant/i,
  /cont de economii/i,
  /conturile proprii/i,
  /top-up by/i,
  /revolut\*\*/i,
  /andrei anghel/i,
  /^to andrei anghel/i,
  /^from andrei/i,
  /^from anca/i,
  /^to account,/i,
  /transfer depozit/i,
  /trimis de pe revolut/i,
  /^cap\.dep/i,
  /^from economii/i,
  /^bani personali/i,
  /^tod autopayment/i,
  /^plata restante/i,
  /ordering party.*andrei anghel/i,
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

function DetaliiTab({ included, excluded, accountMap }) {
  const [showExcluded, setShowExcluded] = useState(false)
  const [filterType, setFilterType] = useState('all')

  const list = showExcluded ? excluded : included
  const displayed = list
    .filter(tx => filterType === 'all' || tx.transaction_type === filterType)
    .sort((a, b) => (b.booking_date || '').localeCompare(a.booking_date || ''))

  const byMonth = {}
  for (const tx of displayed) {
    const month = (tx.booking_date || '').substring(0, 7)
    if (!byMonth[month]) byMonth[month] = []
    byMonth[month].push(tx)
  }

  const tabBtn = (active) => ({
    padding: '0.35rem 0.9rem', borderRadius: 6, border: 'none', cursor: 'pointer',
    fontSize: '0.78rem', fontWeight: 600,
    background: active ? '#0F172A' : 'transparent',
    color: active ? '#fff' : '#64748B',
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.25rem', background: '#F1F5F9', borderRadius: 8, padding: '0.2rem' }}>
          <button style={tabBtn(!showExcluded)} onClick={() => setShowExcluded(false)}>
            Incluse ({included.length})
          </button>
          <button style={tabBtn(showExcluded)} onClick={() => setShowExcluded(true)}>
            Excluse ({excluded.length})
          </button>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem', background: '#F1F5F9', borderRadius: 8, padding: '0.2rem' }}>
          {[['all', 'Toate'], ['credit', 'Venituri'], ['debit', 'Cheltuieli']].map(([val, lbl]) => (
            <button key={val} style={tabBtn(filterType === val)} onClick={() => setFilterType(val)}>{lbl}</button>
          ))}
        </div>
      </div>

      {showExcluded && (
        <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: '0.75rem' }}>
          Acestea sunt excluse din grafice — transferuri interne detectate după descriere sau perechi credit/debit în aceeași zi.
        </p>
      )}

      {Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0])).map(([month, txs]) => {
        const d = new Date(month + '-01')
        const label = d.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })
        const totalCredit = txs.filter(t => t.transaction_type === 'credit').reduce((s, t) => s + parseFloat(t.amount || 0), 0)
        const totalDebit = txs.filter(t => t.transaction_type === 'debit').reduce((s, t) => s + parseFloat(t.amount || 0), 0)
        return (
          <div key={month} style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>{label}</p>
              <p style={{ fontSize: '0.7rem', color: '#94A3B8', margin: 0 }}>
                <span style={{ color: '#10B981', fontWeight: 600 }}>+{fmt(totalCredit)}</span>
                {' · '}
                <span style={{ color: '#EF4444', fontWeight: 600 }}>-{fmt(totalDebit)}</span>
                {' RON'}
              </p>
            </div>
            <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
              {txs.map((tx, i) => (
                <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 1rem', borderTop: i > 0 ? '1px solid #F1F5F9' : 'none', gap: '1rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: '0.825rem', color: '#0F172A', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {tx.description || '—'}
                    </p>
                    <p style={{ margin: '0.1rem 0 0', fontSize: '0.7rem', color: '#94A3B8' }}>
                      {tx.booking_date}
                      {accountMap?.[tx.account_id] && (
                        <span style={{ marginLeft: '0.4rem', color: '#CBD5E1' }}>·</span>
                      )}
                      {accountMap?.[tx.account_id] && (
                        <span style={{ marginLeft: '0.4rem', color: '#94A3B8' }}>{accountMap[tx.account_id]}</span>
                      )}
                    </p>
                  </div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', whiteSpace: 'nowrap', color: tx.transaction_type === 'credit' ? '#10B981' : '#EF4444' }}>
                    {tx.transaction_type === 'credit' ? '+' : '-'}{fmt(Math.abs(parseFloat(tx.amount)))} {tx.currency}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {displayed.length === 0 && <p style={{ color: '#94A3B8', fontSize: '0.875rem' }}>Nicio tranzacție.</p>}
    </div>
  )
}

function classifyTx(tx, catData) {
  if (!catData) return 'necategorizat'
  const { rules = [], overrides = {} } = catData
  const txId = String(tx.id)
  if (overrides[txId]) return overrides[txId]
  const desc = (tx.description || '').toLowerCase()
  for (const rule of rules) {
    try { if (new RegExp(rule.pattern, 'i').test(desc)) return rule.category_id } catch {}
  }
  return 'necategorizat'
}

function CategoriiTab({ transactions, catData }) {
  const categories = catData?.categories || []
  const currentMonth = new Date().toISOString().slice(0, 7)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  const allMonths = [...new Set(transactions.map(tx => (tx.booking_date || '').slice(0, 7)).filter(Boolean))].sort().reverse()

  const settledIds = new Set((catData?.settled || []).map(String))
  const owners = catData?.owners || {}

  const cheltuieliLuna = transactions.filter(tx =>
    tx.transaction_type === 'debit' &&
    tx.currency === 'RON' &&
    (tx.booking_date || '').startsWith(selectedMonth) &&
    !settledIds.has(String(tx.id))
  )

  const OWNERS = [
    { id: 'andrei', label: 'Andrei', color: '#3B82F6' },
    { id: 'anca',   label: 'Anca',   color: '#EC4899' },
    { id: 'comun',  label: 'Comun',  color: '#10B981' },
  ]

  const monthNames = ['Ianuarie','Februarie','Martie','Aprilie','Mai','Iunie','Iulie','August','Septembrie','Octombrie','Noiembrie','Decembrie']
  const fmtMonth = (ym) => { const [y, m] = ym.split('-'); return `${monthNames[+m-1]} ${y}` }

  const buildPieData = (txs) => {
    const byCat = {}
    for (const tx of txs) {
      const catId = classifyTx(tx, catData)
      byCat[catId] = (byCat[catId] || 0) + parseFloat(tx.amount)
    }
    return Object.entries(byCat)
      .map(([catId, amount]) => {
        const cat = categories.find(c => c.id === catId) || { name: catId, color: '#CBD5E1' }
        return { name: cat.name, value: Math.round(amount * 100) / 100, color: cat.color }
      })
      .sort((a, b) => b.value - a.value)
  }

  const OwnerChart = ({ owner }) => {
    const txs = cheltuieliLuna.filter(tx => owners[String(tx.id)] === owner.id)
    const pieData = buildPieData(txs)
    const total = pieData.reduce((s, d) => s + d.value, 0)
    const [expandedCat, setExpandedCat] = useState(null)

    // map catName → transactions
    const catTxs = {}
    for (const tx of txs) {
      const catId = classifyTx(tx, catData)
      const cat = categories.find(c => c.id === catId) || { name: catId }
      if (!catTxs[cat.name]) catTxs[cat.name] = []
      catTxs[cat.name].push(tx)
    }

    return (
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: owner.color, flexShrink: 0 }} />
          <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A' }}>{owner.label}</span>
          <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
            {total > 0 ? total.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) + ' RON' : '— nicio cheltuială atribuită'}
          </span>
        </div>
        {total > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '1.25rem' }}>
              <ResponsiveContainer width="100%" height={230}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                    outerRadius={90} innerRadius={42} paddingAngle={2}
                    labelLine={false}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                      if (percent < 0.06) return null
                      const RADIAN = Math.PI / 180
                      const r = innerRadius + (outerRadius - innerRadius) * 0.5
                      const x = cx + r * Math.cos(-midAngle * RADIAN)
                      const y = cy + r * Math.sin(-midAngle * RADIAN)
                      return <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>{`${Math.round(percent * 100)}%`}</text>
                    }}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [v.toLocaleString('ro-RO', { minimumFractionDigits: 2 }) + ' RON', '']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: '1.25rem' }}>
              {pieData.map(({ name, value, color }) => {
                const isOpen = expandedCat === name
                const catTransactions = catTxs[name] || []
                return (
                  <div key={name}>
                    <div
                      onClick={() => setExpandedCat(isOpen ? null : name)}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: isOpen ? 'none' : '1px solid #F1F5F9', cursor: 'pointer' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: '0.83rem', color: '#1E293B' }}>{name}</span>
                        <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>{catTransactions.length}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.83rem', fontWeight: 700, color: '#1E293B' }}>{value.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</span>
                        <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{Math.round(value / total * 100)}%</span>
                        <span style={{ fontSize: '0.65rem', color: '#CBD5E1' }}>{isOpen ? '▲' : '▼'}</span>
                      </div>
                    </div>
                    {isOpen && (
                      <div style={{ background: '#F8FAFC', borderRadius: '0 0 6px 6px', marginBottom: '0.25rem', borderBottom: '1px solid #F1F5F9' }}>
                        {catTransactions.map(tx => (
                          <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.3rem 0.75rem', borderTop: '1px solid #F1F5F9' }}>
                            <div>
                              <span style={{ fontSize: '0.75rem', color: '#1E293B' }}>{tx.description || '—'}</span>
                              <span style={{ fontSize: '0.68rem', color: '#94A3B8', marginLeft: '0.4rem' }}>{tx.booking_date}</span>
                            </div>
                            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#EF4444', whiteSpace: 'nowrap' }}>
                              −{parseFloat(tx.amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} {tx.currency}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', marginTop: '0.15rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748B' }}>Total</span>
                <span style={{ fontSize: '0.83rem', fontWeight: 700, color: '#EF4444' }}>{total.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</span>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
          style={{ padding: '0.4rem 0.75rem', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: '0.875rem', color: '#1E293B', background: '#fff', outline: 'none' }}>
          {allMonths.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
        </select>
      </div>
      {OWNERS.map(o => <OwnerChart key={o.id} owner={o} />)}
    </div>
  )
}

export default function Statistici() {
  const { data: transactions = [] } = useTransactions()
  const { data: deposits = [] } = useDeposits()
  const { data: rates = {} } = useRates()
  const { data: catData } = useCategories()
  const { data: xtbData } = useXtbPortfolio()
  const { data: extraData } = useExtra()
  const { data: accounts } = useAccounts()

  const eurRate = rates['EUR'] || 1

  const [activeTab, setActiveTab] = useState('grafice')

  // Filtrăm transferurile interne înainte de orice calcul
  const filtered = filterInternalTransfers(transactions)
  const excluded = transactions.filter(tx => !filtered.includes(tx))
  const hasData = filtered.length > 0

  // Map account_id → nume scurt pentru tab Detalii
  const allAccounts = ['checking', 'card', 'savings', 'deposit', 'other'].flatMap(t => accounts?.[t] || [])
  const accountMap = Object.fromEntries(
    allAccounts.map(a => [a.id, `${a.bank_name} · ${a.name || ''} ${a.balance?.currency || a.currency || ''}`.trim()])
  )

  // Wealth breakdown
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

  const tabBtn = (key, label) => (
    <button
      onClick={() => setActiveTab(key)}
      style={{
        padding: '0.4rem 1.1rem', borderRadius: 6, border: 'none', cursor: 'pointer',
        fontSize: '0.8rem', fontWeight: 600,
        background: activeTab === key ? '#0F172A' : 'transparent',
        color: activeTab === key ? '#fff' : '#64748B',
      }}
    >{label}</button>
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Statistici</h1>
        <div style={{ display: 'flex', gap: '0.25rem', background: '#F1F5F9', borderRadius: 8, padding: '0.25rem' }}>
          {tabBtn('grafice', 'Grafice')}
          {tabBtn('detalii', 'Detalii tranzacții')}
          {tabBtn('categorii', 'Categorii')}
        </div>
      </div>

      {activeTab === 'detalii' && <DetaliiTab included={filtered} excluded={excluded} accountMap={accountMap} />}
      {activeTab === 'categorii' && <CategoriiTab transactions={filtered} catData={catData} />}
      {activeTab === 'grafice' && <>

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
      </>}
    </div>
  )
}
