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
  boxSizing: 'border-box',
}

// Definit AFARĂ din Deposits — altfel React îl re-creează la fiecare render și inputurile pierd focus
function DepositFormFields({ values, onChange }) {
  return (
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
  )
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

  // Summary per currency: principal (amount) and interest (interest_earned)
  const summary = {}
  for (const d of deposits) {
    const cur = d.currency
    if (!summary[cur]) summary[cur] = { principal: 0, interest: 0 }
    summary[cur].principal += parseFloat(d.amount)
    summary[cur].interest += parseFloat(d.interest_earned)
  }

  // Sort deposits by start_date ascending
  const sortedDeposits = [...deposits].sort((a, b) => new Date(a.start_date) - new Date(b.start_date))

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {Object.entries(summary).map(([currency, { principal, interest }]) => [
            <SummaryCard
              key={`principal-${currency}`}
              title={`Total depozite ${currency}`}
              amount={principal}
              currency={currency}
              color="#3B82F6"
            />,
            <SummaryCard
              key={`interest-${currency}`}
              title={`Dobânzi ${currency}`}
              amount={interest}
              currency={currency}
              color="#10B981"
            />,
          ])}
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

      {/* Deposits card grid */}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {sortedDeposits.map(d => {
            if (editId === d.id && editForm) {
              return (
                <div key={d.id} style={{ background: '#EFF6FF', borderRadius: 12, padding: '1.25rem 1.5rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #3B82F6' }}>
                  <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: '#0F172A' }}>Editează depozit</h3>
                  <form onSubmit={handleEditSave}>
                    <DepositFormFields values={editForm} onChange={(k, v) => setEditForm(prev => ({ ...prev, [k]: v }))} />
                    <div style={{ marginTop: '1rem', display: 'flex', gap: '0.75rem' }}>
                      <button type="submit" style={btnPrimary} disabled={updateMutation.isPending}>{updateMutation.isPending ? 'Se salvează...' : 'Salvează'}</button>
                      <button type="button" onClick={() => { setEditId(null); setEditForm(null) }} style={btnSecondary}>Anulează</button>
                    </div>
                  </form>
                </div>
              )
            }
            return (
              <div key={d.id} style={{
                background: '#fff',
                borderRadius: 12,
                padding: '1.25rem 1.5rem',
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                borderLeft: `4px solid ${getBankColor(d.bank_name)}`,
              }}>
                {/* Top row: bank dot + name + label, and days badge top-right */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: getBankColor(d.bank_name), flexShrink: 0, display: 'inline-block' }} />
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A', margin: 0 }}>{d.bank_name}</p>
                      {d.name && <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: 0 }}>{d.name}</p>}
                    </div>
                  </div>
                  <span style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: 20,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    background: daysColor(d.days_remaining) + '22',
                    color: daysColor(d.days_remaining),
                  }}>
                    {d.days_remaining}z
                  </span>
                </div>

                {/* Amount row */}
                <p style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0F172A', margin: '0 0 0.25rem' }}>
                  {formatAmount(d.amount)} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#94A3B8' }}>{d.currency}</span>
                </p>

                {/* Period + rate */}
                <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '0 0 0.75rem' }}>
                  {d.start_date} → {d.maturity_date} · <strong>{parseFloat(d.interest_rate).toFixed(2)}%</strong>/an
                </p>

                {/* Interest + total */}
                <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
                  <div>
                    <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.15rem' }}>Dobândă</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#10B981', margin: 0 }}>+{formatAmount(d.interest_earned)}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.15rem' }}>Total scadență</p>
                    <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>{formatAmount(d.total_at_maturity)}</p>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => { setEditId(d.id); setEditForm({ bank_name: d.bank_name, amount: d.amount, currency: d.currency, interest_rate: d.interest_rate, start_date: d.start_date, maturity_date: d.maturity_date, name: d.name || '' }); setShowForm(false) }} style={btnSecondary}>Editează</button>
                  <button onClick={() => handleDelete(d.id)} style={btnDanger}>Șterge</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
