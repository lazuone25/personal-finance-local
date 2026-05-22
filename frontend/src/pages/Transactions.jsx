import { useState } from 'react'
import { useTransactions, useConnections } from '../api/hooks'
import { getBankColor } from '../utils/bankColors'

export default function Transactions() {
  const { data: connections = [] } = useConnections()
  const [filters, setFilters] = useState({})
  const { data: transactions = [], isLoading } = useTransactions(filters)

  const setFilter = (key, value) =>
    setFilters(prev => ({ ...prev, [key]: value || undefined }))

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
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Bancă', 'Data', 'Descriere', 'Sumă', 'Tip'].map(h => (
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
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>
                    Nicio tranzacție găsită.
                  </td>
                </tr>
              ) : transactions.map(tx => {
                const bankColor = getBankColor(tx.bank_name)
                return (
                  <tr key={tx.id} style={{ borderTop: '1px solid #F1F5F9', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: bankColor,
                          flexShrink: 0,
                          display: 'inline-block',
                        }} />
                        <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 500 }}>{tx.bank_name || '—'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#475569' }}>{tx.booking_date}</td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#1E293B', maxWidth: 300 }}>
                      {tx.description || '—'}
                    </td>
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
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
