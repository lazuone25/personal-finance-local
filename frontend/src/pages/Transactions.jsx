import { useState } from 'react'
import { useTransactions, useConnections, useAddDePrimit } from '../api/hooks'
import { getBankColor } from '../utils/bankColors'

// Description patterns that indicate internal transfers
const INTERNAL_PATTERNS = [
  /^To Economii/i,
  /^From Economii/i,
  /^To Cont de economii/i,
  /^Top-Up by/i,               // Revolut: incoming top-up from own bank card
  /Revolut\*\*/i,              // Raiffeisen: card payment to Revolut
  /^To ANDREI ANGHEL/i,        // Revolut: transfer to joint account
  /^From Andrei/i,             // Revolut: transfer from personal to joint
  /^From Anca/i,               // Revolut: transfer from joint to personal
  /^To account,/i,             // ING: transfer to own account
  /transfer depozit/i,         // Raiffeisen↔ING deposit transfers
  /^tod autopayment/i,         // Raiffeisen RON→EUR intern
  /^plata restante/i,          // Raiffeisen EUR credit intern (FX conversion)
]

function detectInternalTransfers(transactions) {
  const flagged = new Set()

  // Method 1: description pattern matching
  for (const tx of transactions) {
    if (INTERNAL_PATTERNS.some(p => p.test(tx.description || ''))) {
      flagged.add(tx.id)
    }
  }

  // Method 2: cross-account amount matching
  // If a debit on bank A matches a credit on bank B (same amount to the cent,
  // same currency, within 3 days) → both are internal transfers
  for (let i = 0; i < transactions.length; i++) {
    const a = transactions[i]
    for (let j = i + 1; j < transactions.length; j++) {
      const b = transactions[j]
      if (a.bank_name === b.bank_name) continue             // same bank — skip
      if (a.currency !== b.currency) continue               // different currency — skip
      if (a.transaction_type === b.transaction_type) continue // same direction — skip
      const amtDiff = Math.abs(parseFloat(a.amount) - parseFloat(b.amount))
      if (amtDiff > 0.01) continue                          // amounts don't match
      const daysDiff = Math.abs(new Date(a.booking_date) - new Date(b.booking_date)) / 86400000
      if (daysDiff > 3) continue                            // more than 3 days apart
      flagged.add(a.id)
      flagged.add(b.id)
    }
  }

  return flagged
}

function groupByMonth(transactions) {
  const groups = {}
  for (const tx of transactions) {
    const date = tx.booking_date || ''
    const key = date.slice(0, 7) // "YYYY-MM"
    if (!groups[key]) groups[key] = []
    groups[key].push(tx)
  }
  // Return sorted descending (most recent month first)
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
}

function formatMonthLabel(key) {
  if (!key) return key
  const [year, month] = key.split('-')
  const months = ['Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie', 'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie']
  return `${months[parseInt(month, 10) - 1]} ${year}`
}

export default function Transactions() {
  const { data: connections = [] } = useConnections()
  const [filters, setFilters] = useState({})
  const { data: transactions = [], isLoading } = useTransactions(filters)
  const [collapsed, setCollapsed] = useState({})

  const setFilter = (key, value) =>
    setFilters(prev => ({ ...prev, [key]: value || undefined }))

  const toggleMonth = (key) => setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

  const addDePrimit = useAddDePrimit()
  const [dePrimitTx, setDePrimitTx] = useState(null) // tx being marked
  const [dePrimitName, setDePrimitName] = useState('')

  const internalIds = detectInternalTransfers(transactions)
  const visibleTransactions = transactions.filter(tx => !internalIds.has(tx.id))
  const monthGroups = groupByMonth(visibleTransactions)

  const submitDePrimit = () => {
    if (!dePrimitTx || !dePrimitName.trim()) return
    addDePrimit.mutate({ name: dePrimitName.trim(), amount: parseFloat(dePrimitTx.amount), note: dePrimitTx.description || '' })
    setDePrimitTx(null)
    setDePrimitName('')
  }

  const inputStyle = {
    padding: '0.5rem 0.75rem',
    border: '1px solid #E2E8F0',
    borderRadius: 8,
    fontSize: '0.875rem',
    color: '#1E293B',
    background: '#fff',
    outline: 'none',
    fontFamily: 'inherit',
  }

  return (
    <div>
      <h1>Tranzacții</h1>

      <div style={{
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        padding: '1rem',
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
      }}>
        <select onChange={e => setFilter('bank_id', e.target.value)} style={inputStyle}>
          <option value="">Toate băncile</option>
          {connections.map(c => <option key={c.bank_id} value={c.bank_id}>{c.bank_name}</option>)}
        </select>
        <select onChange={e => setFilter('transaction_type', e.target.value)} style={inputStyle}>
          <option value="">Toate tipurile</option>
          <option value="debit">Debit</option>
          <option value="credit">Credit</option>
        </select>
        <input
          type="date"
          onChange={e => setFilter('date_from', e.target.value)}
          style={inputStyle}
          title="De la"
        />
        <input
          type="date"
          onChange={e => setFilter('date_to', e.target.value)}
          style={inputStyle}
          title="Până la"
        />
      </div>

      {isLoading ? (
        <p style={{ color: '#64748B' }}>Se încarcă...</p>
      ) : monthGroups.length === 0 ? (
        <p style={{ color: '#64748B' }}>Nicio tranzacție găsită.</p>
      ) : (
        monthGroups.map(([key, txs]) => {
          const isCollapsed = collapsed[key]

          // Compute month summary: total credit and total debit per currency
          const summary = {}
          for (const tx of txs) {
            const cur = tx.currency || 'RON'
            if (!summary[cur]) summary[cur] = { credit: 0, debit: 0 }
            if (tx.transaction_type === 'credit') summary[cur].credit += parseFloat(tx.amount)
            else summary[cur].debit += parseFloat(tx.amount)
          }

          return (
            <div key={key} style={{ marginBottom: '1rem' }}>
              {/* Month header — clickable to collapse/expand */}
              <button
                onClick={() => toggleMonth(key)}
                style={{
                  width: '100%',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem 1.25rem',
                  background: '#1E293B',
                  border: 'none',
                  borderRadius: isCollapsed ? 12 : '12px 12px 0 0',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff' }}>
                    {formatMonthLabel(key)}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{txs.length} tranzacții</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  {/* Summary: +credit / -debit per currency */}
                  {Object.entries(summary).map(([cur, { credit, debit }]) => (
                    <span key={cur} style={{ fontSize: '0.8rem', color: '#94A3B8' }}>
                      {credit > 0 && <span style={{ color: '#10B981', fontWeight: 600 }}>+{credit.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} </span>}
                      {debit > 0 && <span style={{ color: '#F87171', fontWeight: 600 }}>−{debit.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} </span>}
                      <span style={{ color: '#64748B' }}>{cur}</span>
                    </span>
                  ))}
                  {/* Chevron */}
                  <span style={{ color: '#64748B', fontSize: '0.85rem', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)', display: 'inline-block', transition: 'transform 0.2s' }}>▼</span>
                </div>
              </button>

              {/* Transactions table — hidden when collapsed */}
              {!isCollapsed && (
                <div style={{ background: '#fff', borderRadius: '0 0 12px 12px', boxShadow: '0 2px 6px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                        {['Bancă', 'Data', 'Descriere', 'Sumă', 'Tip', ''].map(h => (
                          <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {txs.map(tx => {
                        const bankColor = getBankColor(tx.bank_name)
                        const isMarking = dePrimitTx?.id === tx.id
                        return (
                          <>
                          <tr key={tx.id} style={{ borderTop: '1px solid #F1F5F9', background: isMarking ? '#F0FDF4' : 'transparent' }}
                            onMouseEnter={e => { if (!isMarking) e.currentTarget.style.background = '#F8FAFC' }}
                            onMouseLeave={e => { if (!isMarking) e.currentTarget.style.background = 'transparent' }}
                          >
                            <td style={{ padding: '0.65rem 1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: bankColor, flexShrink: 0, display: 'inline-block' }} />
                                <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>{tx.bank_name || '—'}</span>
                              </div>
                            </td>
                            <td style={{ padding: '0.65rem 1rem', fontSize: '0.875rem', color: '#475569' }}>{tx.booking_date}</td>
                            <td style={{ padding: '0.65rem 1rem', fontSize: '0.875rem', color: '#1E293B', maxWidth: 300 }}>{tx.description || '—'}</td>
                            <td style={{ padding: '0.65rem 1rem', fontWeight: 600, fontSize: '0.9rem', color: tx.transaction_type === 'credit' ? '#10B981' : '#EF4444', whiteSpace: 'nowrap' }}>
                              {tx.transaction_type === 'debit' ? '−' : '+'}
                              {parseFloat(tx.amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                              <span style={{ fontSize: '0.8rem', fontWeight: 400, color: '#94A3B8', marginLeft: '0.3rem' }}>{tx.currency}</span>
                            </td>
                            <td style={{ padding: '0.65rem 1rem' }}>
                              <span style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: tx.transaction_type === 'credit' ? '#D1FAE5' : '#FEE2E2', color: tx.transaction_type === 'credit' ? '#065F46' : '#991B1B' }}>
                                {tx.transaction_type}
                              </span>
                            </td>
                            <td style={{ padding: '0.65rem 0.75rem' }}>
                              <button
                                onClick={() => { setDePrimitTx(isMarking ? null : tx); setDePrimitName('') }}
                                title="Marchează ca de primit"
                                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', borderRadius: 5, border: '1px solid #BBF7D0', background: isMarking ? '#10B981' : '#F0FDF4', color: isMarking ? '#fff' : '#059669', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}
                              >
                                De primit
                              </button>
                            </td>
                          </tr>
                          {isMarking && (
                            <tr key={`${tx.id}-form`} style={{ background: '#F0FDF4', borderTop: '1px solid #BBF7D0' }}>
                              <td colSpan={6} style={{ padding: '0.6rem 1rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>De la:</span>
                                  <input
                                    autoFocus
                                    type="text"
                                    value={dePrimitName}
                                    onChange={e => setDePrimitName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && submitDePrimit()}
                                    placeholder="Nume persoană"
                                    style={{ padding: '0.3rem 0.6rem', borderRadius: 6, border: '1px solid #BBF7D0', fontSize: '0.8rem', outline: 'none', background: '#fff', width: 160 }}
                                  />
                                  <span style={{ fontSize: '0.8rem', color: '#475569' }}>{parseFloat(tx.amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} {tx.currency}</span>
                                  <button onClick={submitDePrimit} style={{ padding: '0.3rem 0.75rem', borderRadius: 6, border: 'none', background: '#10B981', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Adaugă</button>
                                  <button onClick={() => setDePrimitTx(null)} style={{ padding: '0.3rem 0.6rem', borderRadius: 6, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', fontSize: '0.8rem', cursor: 'pointer' }}>✕</button>
                                </div>
                              </td>
                            </tr>
                          )}
                          </>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
