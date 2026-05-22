import { useState } from 'react'
import { useDeposits, useCreateDeposit, useUpdateDeposit, useDeleteDeposit } from '../api/hooks'
import SummaryCard from '../components/SummaryCard'
import { getBankColor } from '../utils/bankColors'

const EMPTY_FORM = {
  bank_name: '',
  amount: '',
  currency: 'RON',
  interest_rate: '',
  start_date: '',
  maturity_date: '',
  name: '',
}

function daysColor(days) {
  if (days < 30) return '#EF4444'
  if (days < 90) return '#F59E0B'
  return '#10B981'
}

function formatAmount(val) {
  return parseFloat(val).toLocaleString('ro-RO', { minimumFractionDigits: 2 })
}

export default function Deposits() {
  const { data: deposits = [], isLoading, isError } = useDeposits()
  const createMutation = useCreateDeposit()
  const updateMutation = useUpdateDeposit()
  const deleteMutation = useDeleteDeposit()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editId, setEditId] = useState(null)
  const [editForm, setEditForm] = useState(null)

  // Summary per currency (sum of total_at_maturity)
  const summary = {}
  for (const d of deposits) {
    const cur = d.currency
    if (!summary[cur]) summary[cur] = 0
    summary[cur] += parseFloat(d.total_at_maturity)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    await createMutation.mutateAsync({
      ...form,
      amount: parseFloat(form.amount),
      interest_rate: parseFloat(form.interest_rate),
    })
    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  const handleEditSave = async (e) => {
    e.preventDefault()
    await updateMutation.mutateAsync({
      id: editId,
      ...editForm,
      amount: parseFloat(editForm.amount),
      interest_rate: parseFloat(editForm.interest_rate),
    })
    setEditId(null)
    setEditForm(null)
  }

  const handleDelete = (id) => {
    if (window.confirm('Ștergi depozitul?')) {
      deleteMutation.mutate(id)
    }
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
    width: '100%',
  }

  const btnPrimary = {
    padding: '0.5rem 1.2rem',
    background: '#3B82F6',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontSize: '0.875rem',
    fontWeight: 600,
    fontFamily: 'inherit',
  }

  const btnDanger = {
    padding: '0.35rem 0.8rem',
    background: '#FEE2E2',
    color: '#991B1B',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
    fontFamily: 'inherit',
  }

  const btnSecondary = {
    padding: '0.35rem 0.8rem',
    background: '#EFF6FF',
    color: '#1D4ED8',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
    fontFamily: 'inherit',
  }

  const DepositFormFields = ({ values, onChange }) => (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Bancă *
          </label>
          <input
            required
            value={values.bank_name}
            onChange={e => onChange('bank_name', e.target.value)}
            placeholder="ex: ING, Raiffeisen"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Sumă *
          </label>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={values.amount}
            onChange={e => onChange('amount', e.target.value)}
            placeholder="10000"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Monedă
          </label>
          <select value={values.currency} onChange={e => onChange('currency', e.target.value)} style={inputStyle}>
            <option value="RON">RON</option>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Rată anuală % *
          </label>
          <input
            required
            type="number"
            min="0"
            step="0.01"
            value={values.interest_rate}
            onChange={e => onChange('interest_rate', e.target.value)}
            placeholder="6.5"
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Data start *
          </label>
          <input
            required
            type="date"
            value={values.start_date}
            onChange={e => onChange('start_date', e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Data scadență *
          </label>
          <input
            required
            type="date"
            value={values.maturity_date}
            onChange={e => onChange('maturity_date', e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Etichetă (opțional)
          </label>
          <input
            value={values.name}
            onChange={e => onChange('name', e.target.value)}
            placeholder="ex: Depozit 6 luni"
            style={inputStyle}
          />
        </div>
      </div>
    </>
  )

  if (isLoading) return <p style={{ color: '#64748B' }}>Se încarcă...</p>
  if (isError) return <p style={{ color: '#EF4444' }}>Eroare la încărcarea depozitelor.</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>Depozite la termen</h1>
        <button
          onClick={() => { setShowForm(v => !v); setEditId(null) }}
          style={btnPrimary}
        >
          {showForm ? 'Anulează' : '+ Adaugă depozit'}
        </button>
      </div>

      {/* Summary cards */}
      {Object.keys(summary).length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {Object.entries(summary).map(([currency, total]) => (
            <SummaryCard
              key={currency}
              title={`Total la scadență ${currency}`}
              amount={total}
              currency={currency}
              color={currency === 'RON' ? '#3B82F6' : currency === 'EUR' ? '#10B981' : '#F59E0B'}
            />
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: '1.5rem',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          marginBottom: '1.5rem',
          borderTop: '4px solid #3B82F6',
        }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#0F172A' }}>Depozit nou</h2>
          <form onSubmit={handleCreate}>
            <DepositFormFields
              values={form}
              onChange={(k, v) => setForm(prev => ({ ...prev, [k]: v }))}
            />
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
              <button type="submit" style={btnPrimary} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Se salvează...' : 'Salvează'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }} style={btnSecondary}>
                Anulează
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Deposits table */}
      {deposits.length === 0 && !showForm ? (
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: '3rem',
          textAlign: 'center',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
          color: '#94A3B8',
        }}>
          <p style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Niciun depozit adăugat.</p>
          <p style={{ fontSize: '0.875rem' }}>Apasă „+ Adaugă depozit" pentru a înregistra primul depozit.</p>
        </div>
      ) : deposits.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0' }}>
                {['Bancă', 'Sumă inițială', 'Monedă', 'Rată', 'Perioadă', 'Dobândă acumulată', 'Total la scadență', 'Zile rămase', 'Acțiuni'].map(h => (
                  <th key={h} style={{
                    padding: '0.75rem 1rem',
                    textAlign: 'left',
                    fontWeight: 600,
                    fontSize: '0.72rem',
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deposits.map(d => {
                const bankColor = getBankColor(d.bank_name)
                const dColor = daysColor(d.days_remaining)
                if (editId === d.id && editForm) {
                  return (
                    <tr key={d.id} style={{ background: '#EFF6FF', borderTop: '1px solid #E2E8F0' }}>
                      <td colSpan={9} style={{ padding: '1rem 1.5rem' }}>
                        <form onSubmit={handleEditSave}>
                          <DepositFormFields
                            values={editForm}
                            onChange={(k, v) => setEditForm(prev => ({ ...prev, [k]: v }))}
                          />
                          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                            <button type="submit" style={btnPrimary} disabled={updateMutation.isPending}>
                              {updateMutation.isPending ? 'Se salvează...' : 'Salvează'}
                            </button>
                            <button type="button" onClick={() => { setEditId(null); setEditForm(null) }} style={btnSecondary}>
                              Anulează
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  )
                }
                return (
                  <tr key={d.id} style={{ borderTop: '1px solid #F1F5F9' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          width: 10,
                          height: 10,
                          borderRadius: '50%',
                          background: bankColor,
                          flexShrink: 0,
                          display: 'inline-block',
                        }} />
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '0.875rem', color: '#0F172A', marginBottom: '0.1rem' }}>{d.bank_name}</p>
                          {d.name && <p style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{d.name}</p>}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem', color: '#0F172A' }}>
                      {formatAmount(d.amount)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#475569' }}>
                      {d.currency}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#475569' }}>
                      {parseFloat(d.interest_rate).toFixed(2)}%
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                      {d.start_date} → {d.maturity_date}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600, fontSize: '0.875rem', color: '#10B981' }}>
                      +{formatAmount(d.interest_earned)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 700, fontSize: '0.875rem', color: '#0F172A' }}>
                      {formatAmount(d.total_at_maturity)}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '0.2rem 0.6rem',
                        borderRadius: 20,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        background: dColor + '22',
                        color: dColor,
                      }}>
                        {d.days_remaining}z
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => {
                            setEditId(d.id)
                            setEditForm({
                              bank_name: d.bank_name,
                              amount: d.amount,
                              currency: d.currency,
                              interest_rate: d.interest_rate,
                              start_date: d.start_date,
                              maturity_date: d.maturity_date,
                              name: d.name || '',
                            })
                            setShowForm(false)
                          }}
                          style={btnSecondary}
                        >
                          Editează
                        </button>
                        <button onClick={() => handleDelete(d.id)} style={btnDanger}>
                          Șterge
                        </button>
                      </div>
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
