import { useState } from 'react'
import { useTransactions, useConnections } from '../api/hooks'
import { getBankColor } from '../utils/bankColors'

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

  const monthGroups = groupByMonth(transactions)

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
                        {['Bancă', 'Data', 'Descriere', 'Sumă', 'Tip'].map(h => (
                          <th key={h} style={{ padding: '0.65rem 1rem', textAlign: 'left', fontWeight: 600, fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {txs.map(tx => {
                        const bankColor = getBankColor(tx.bank_name)
                        return (
                          <tr key={tx.id} style={{ borderTop: '1px solid #F1F5F9' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
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
                          </tr>
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
