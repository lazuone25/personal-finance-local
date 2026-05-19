import { useState } from 'react'
import { useTransactions, useConnections } from '../api/hooks'

export default function Transactions() {
  const { data: connections = [] } = useConnections()
  const [filters, setFilters] = useState({})
  const { data: transactions = [], isLoading } = useTransactions(filters)

  const setFilter = (key, value) =>
    setFilters(prev => ({ ...prev, [key]: value || undefined }))

  return (
    <div>
      <h1>Tranzacții</h1>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <select onChange={e => setFilter('bank_id', e.target.value)} style={{ padding: '0.5rem' }}>
          <option value="">Toate băncile</option>
          {connections.map(c => <option key={c.bank_id} value={c.bank_id}>{c.bank_name}</option>)}
        </select>
        <select onChange={e => setFilter('transaction_type', e.target.value)} style={{ padding: '0.5rem' }}>
          <option value="">Toate tipurile</option>
          <option value="debit">Debit</option>
          <option value="credit">Credit</option>
        </select>
        <input type="date" placeholder="De la" onChange={e => setFilter('date_from', e.target.value)} style={{ padding: '0.5rem' }} />
        <input type="date" placeholder="Până la" onChange={e => setFilter('date_to', e.target.value)} style={{ padding: '0.5rem' }} />
      </div>

      {isLoading ? <p>Se încarcă...</p> : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden' }}>
          <thead style={{ background: '#f8f8f8' }}>
            <tr>
              {['Data', 'Descriere', 'Sumă', 'Valută', 'Tip'].map(h => (
                <th key={h} style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem', color: '#555' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>Nicio tranzacție găsită.</td></tr>
            ) : transactions.map(tx => (
              <tr key={tx.id} style={{ borderTop: '1px solid #eee' }}>
                <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{tx.booking_date}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{tx.description || '—'}</td>
                <td style={{ padding: '0.75rem', fontWeight: 600, color: tx.transaction_type === 'credit' ? '#2ecc71' : '#e74c3c' }}>
                  {tx.transaction_type === 'debit' ? '-' : '+'}{parseFloat(tx.amount).toLocaleString('ro-RO', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '0.75rem', fontSize: '0.9rem' }}>{tx.currency}</td>
                <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: '#888' }}>{tx.transaction_type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
