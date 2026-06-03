import { useState } from 'react'
import { useDatorii, useUpdateDatorii, useAddPayment, useDeletePayment } from '../api/hooks'

const ACCOUNTS = [
  {
    id: 'credit_revolut',
    label: 'Credit',
    bank: 'Revolut',
    color: '#6366F1',
    lightColor: '#EEF2FF',
  },
  {
    id: 'card_raiffeisen',
    label: 'Card de credit',
    bank: 'Raiffeisen',
    color: '#EF4444',
    lightColor: '#FEF2F2',
  },
]

function fmt(val) {
  return parseFloat(val || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function pct(used, limit) {
  if (!limit) return 0
  return Math.min(100, Math.round((used / limit) * 100))
}

function EditableField({ label, value, onSave, type = 'number', suffix = '' }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)

  const commit = () => {
    onSave(type === 'number' ? parseFloat(val) || 0 : parseInt(val) || 1)
    setEditing(false)
  }

  if (editing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span style={{ fontSize: '0.78rem', color: '#64748B' }}>{label}:</span>
        <input
          autoFocus
          type="number"
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
          style={{ width: 90, padding: '0.2rem 0.4rem', borderRadius: 5, border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none' }}
        />
        {suffix && <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{suffix}</span>}
        <button onClick={commit} style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: 4, border: 'none', background: '#3B82F6', color: '#fff', cursor: 'pointer' }}>✓</button>
        <button onClick={() => setEditing(false)} style={{ fontSize: '0.75rem', padding: '0.15rem 0.4rem', borderRadius: 4, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', cursor: 'pointer' }}>✕</button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }} onClick={() => { setVal(value); setEditing(true) }}>
      <span style={{ fontSize: '0.78rem', color: '#64748B' }}>{label}:</span>
      <span style={{ fontSize: '0.82rem', color: '#1E293B', fontWeight: 500 }}>{value}{suffix}</span>
      <span style={{ fontSize: '0.7rem', color: '#CBD5E1' }}>✎</span>
    </div>
  )
}

function AccountTab({ accountId, data, color, lightColor }) {
  const updateDatorii = useUpdateDatorii()
  const addPayment = useAddPayment()
  const deletePayment = useDeletePayment()

  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNote, setPaymentNote] = useState('')

  const sold = data?.sold_curent || 0
  const limita = data?.limita || 0
  const utilizat = pct(sold, limita)
  const disponibil = Math.max(0, limita - sold)

  const submitPayment = () => {
    if (!paymentAmount) return
    addPayment.mutate({ accountId, amount: parseFloat(paymentAmount), note: paymentNote })
    setPaymentAmount('')
    setPaymentNote('')
    setShowPaymentForm(false)
  }

  const cardStyle = {
    background: '#fff',
    borderRadius: 14,
    padding: '1.5rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    marginBottom: '1rem',
  }

  const rowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px solid #F1F5F9',
  }

  return (
    <div>
      {/* Main balance card */}
      <div style={{ ...cardStyle, borderLeft: `4px solid ${color}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
              Sold curent
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, color: sold > 0 ? '#EF4444' : '#10B981' }}>
              {fmt(sold)} <span style={{ fontSize: '1rem', fontWeight: 400, color: '#94A3B8' }}>RON</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: '0.25rem' }}>Disponibil</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 600, color: '#10B981' }}>{fmt(disponibil)} RON</div>
          </div>
        </div>

        {/* Progress bar */}
        {limita > 0 && (
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Utilizat {utilizat}%</span>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>Limită {fmt(limita)} RON</span>
            </div>
            <div style={{ background: '#F1F5F9', borderRadius: 8, height: 8, overflow: 'hidden' }}>
              <div style={{ width: `${utilizat}%`, background: utilizat > 80 ? '#EF4444' : utilizat > 50 ? '#F59E0B' : color, height: '100%', borderRadius: 8, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {/* Editable fields */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem 2rem' }}>
          <EditableField label="Sold curent" value={sold} onSave={v => updateDatorii.mutate({ accountId, sold_curent: v })} suffix=" RON" />
          <EditableField label="Limită credit" value={limita} onSave={v => updateDatorii.mutate({ accountId, limita: v })} suffix=" RON" />
          <EditableField label="Dobândă" value={data?.dobanda || 0} onSave={v => updateDatorii.mutate({ accountId, dobanda: v })} suffix="% / an" />
          <EditableField label="Plată minimă" value={data?.plata_minima || 0} onSave={v => updateDatorii.mutate({ accountId, plata_minima: v })} suffix=" RON" />
          <EditableField label="Zi scadentă" value={data?.zi_scadenta || 1} onSave={v => updateDatorii.mutate({ accountId, zi_scadenta: v })} type="int" suffix=" / lună" />
        </div>
      </div>

      {/* Payments section */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1E293B' }}>Plăți efectuate</span>
          <button
            onClick={() => setShowPaymentForm(p => !p)}
            style={{ padding: '0.35rem 0.9rem', borderRadius: 7, border: 'none', background: color, color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}
          >
            + Plată
          </button>
        </div>

        {showPaymentForm && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', padding: '0.75rem', background: lightColor, borderRadius: 8 }}>
            <input
              autoFocus
              type="number"
              placeholder="Sumă (RON)"
              value={paymentAmount}
              onChange={e => setPaymentAmount(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitPayment()}
              style={{ width: 130, padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.85rem', outline: 'none' }}
            />
            <input
              type="text"
              placeholder="Notă (opțional)"
              value={paymentNote}
              onChange={e => setPaymentNote(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submitPayment()}
              style={{ flex: 1, padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid #CBD5E1', fontSize: '0.85rem', outline: 'none' }}
            />
            <button onClick={submitPayment} style={{ padding: '0.4rem 0.9rem', borderRadius: 6, border: 'none', background: color, color: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>Adaugă</button>
            <button onClick={() => setShowPaymentForm(false)} style={{ padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', fontSize: '0.82rem', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {(!data?.payments || data.payments.length === 0) ? (
          <p style={{ color: '#94A3B8', fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>Nicio plată înregistrată.</p>
        ) : (
          <div>
            {data.payments.map(p => (
              <div key={p.id} style={rowStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.82rem', color: '#64748B' }}>{p.date}</span>
                  {p.note && <span style={{ fontSize: '0.82rem', color: '#475569' }}>{p.note}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontWeight: 600, color: '#10B981', fontSize: '0.9rem' }}>−{fmt(p.amount)} RON</span>
                  <button
                    onClick={() => deletePayment.mutate({ accountId, paymentId: p.id })}
                    style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: '0.85rem', padding: '0.1rem 0.3rem' }}
                    title="Șterge"
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Datorii() {
  const { data, isLoading } = useDatorii()
  const [activeTab, setActiveTab] = useState('credit_revolut')

  const activeAccount = ACCOUNTS.find(a => a.id === activeTab)

  const tabStyle = (id) => ({
    flex: 1,
    padding: '0.85rem 1rem',
    border: 'none',
    borderBottom: activeTab === id ? `3px solid ${ACCOUNTS.find(a => a.id === id).color}` : '3px solid transparent',
    background: activeTab === id ? '#fff' : '#F8FAFC',
    color: activeTab === id ? '#1E293B' : '#64748B',
    fontWeight: activeTab === id ? 700 : 500,
    fontSize: '0.92rem',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'all 0.15s',
  })

  return (
    <div>
      <h1>Datorii</h1>

      {/* Tab bar */}
      <div style={{ display: 'flex', background: '#F8FAFC', borderRadius: '12px 12px 0 0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', marginBottom: 0 }}>
        {ACCOUNTS.map(acc => (
          <button key={acc.id} onClick={() => setActiveTab(acc.id)} style={tabStyle(acc.id)}>
            <div style={{ fontSize: '0.68rem', color: activeTab === acc.id ? activeAccount.color : '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.1rem' }}>{acc.bank}</div>
            {acc.label}
          </button>
        ))}
      </div>

      <div style={{ background: '#F1F5F9', borderRadius: '0 0 12px 12px', padding: '1.25rem', marginBottom: '1rem' }}>
        {isLoading ? (
          <p style={{ color: '#94A3B8' }}>Se încarcă...</p>
        ) : (
          <AccountTab
            key={activeTab}
            accountId={activeTab}
            data={data?.[activeTab]}
            color={activeAccount.color}
            lightColor={activeAccount.lightColor}
          />
        )}
      </div>
    </div>
  )
}
