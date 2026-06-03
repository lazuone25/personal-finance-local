import { useState } from 'react'
import { useDatorii, useUpdateDatorii, useAddPayment, useDeletePayment } from '../api/hooks'

function fmt(val) {
  return parseFloat(val || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })
}

function EditableAmount({ value, onSave, fontSize = '1.8rem', color = '#0F172A' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const commit = () => {
    setEditing(false)
    const n = parseFloat(String(draft).replace(',', '.'))
    if (!isNaN(n)) onSave(n)
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => e.key === 'Enter' && commit()}
        style={{ fontSize, fontWeight: 700, color, border: 'none', borderBottom: '2px solid #3B82F6', outline: 'none', width: 140, background: 'transparent' }}
      />
    )
  }

  return (
    <span
      onClick={() => { setDraft(String(value || 0)); setEditing(true) }}
      title="Click pentru a edita"
      style={{ fontSize, fontWeight: 700, color, cursor: 'pointer', borderBottom: '1px dashed #CBD5E1' }}
    >
      {fmt(value)}
    </span>
  )
}

function EditableField({ label, value, onSave, suffix = '' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const commit = () => {
    setEditing(false)
    const n = parseFloat(String(draft).replace(',', '.'))
    if (!isNaN(n)) onSave(n)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      {editing ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <input
            autoFocus
            type="number"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
            style={{ width: 80, padding: '0.2rem 0.4rem', borderRadius: 5, border: '1px solid #CBD5E1', fontSize: '0.85rem', outline: 'none' }}
          />
          {suffix && <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{suffix}</span>}
        </div>
      ) : (
        <span
          onClick={() => { setDraft(String(value || 0)); setEditing(true) }}
          style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1E293B', cursor: 'pointer', borderBottom: '1px dashed #E2E8F0' }}
        >
          {fmt(value)}{suffix}
        </span>
      )}
    </div>
  )
}

function CardDeCredit({ data, updateDatorii }) {
  const sold = data?.sold_curent || 0
  const limita = data?.limita || 0
  const utilizat = limita > 0 ? Math.min(100, (sold / limita) * 100) : 0
  const barColor = utilizat > 80 ? '#EF4444' : utilizat > 50 ? '#F59E0B' : '#EF4444'

  return (
    <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: '1.5rem' }}>
      {/* Header */}
      <div style={{ background: '#EF4444', padding: '1.25rem 1.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Card de credit · Raiffeisen</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <EditableAmount value={sold} onSave={v => updateDatorii.mutate({ accountId: 'card_raiffeisen', sold_curent: v })} color="#fff" />
            <span style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.6)', fontWeight: 400 }}>
              / {fmt(limita)} RON
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', marginBottom: '0.25rem' }}>Disponibil</div>
          <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fff' }}>{fmt(Math.max(0, limita - sold))} RON</div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ padding: '0 1.5rem', marginTop: '-4px' }}>
        <div style={{ background: '#FEE2E2', borderRadius: 4, height: 10, overflow: 'hidden' }}>
          <div style={{
            width: `${utilizat}%`,
            background: barColor,
            height: '100%',
            borderRadius: 4,
            transition: 'width 0.4s ease',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Utilizat {Math.round(utilizat)}%</span>
          <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Limită credit</span>
        </div>
      </div>

      {/* Fields */}
      <div style={{ padding: '0.75rem 1.5rem 1.25rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', borderTop: '1px solid #FEE2E2' }}>
        <EditableField label="Limită" value={limita} onSave={v => updateDatorii.mutate({ accountId: 'card_raiffeisen', limita: v })} suffix=" RON" />
        <EditableField label="Dobândă / DAE" value={data?.dobanda || 0} onSave={v => updateDatorii.mutate({ accountId: 'card_raiffeisen', dobanda: v })} suffix="%" />
        <EditableField label="Plată minimă" value={data?.plata_minima || 0} onSave={v => updateDatorii.mutate({ accountId: 'card_raiffeisen', plata_minima: v })} suffix=" RON" />
        <EditableField label="Zi scadentă" value={data?.zi_scadenta || 1} onSave={v => updateDatorii.mutate({ accountId: 'card_raiffeisen', zi_scadenta: Math.round(v) })} suffix=" / lună" />
      </div>
    </div>
  )
}

function CreditRevolut({ data, updateDatorii }) {
  const addPayment = useAddPayment()
  const deletePayment = useDeletePayment()
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const sold = data?.sold_curent || 0

  const submitPayment = () => {
    const val = parseFloat(amount)
    if (!val) return
    addPayment.mutate({ accountId: 'credit_revolut', amount: val, note })
    setAmount('')
    setNote('')
    setShowForm(false)
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: '1.5rem' }}>
      {/* Header */}
      <div style={{ background: '#6366F1', padding: '1.25rem 1.5rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.75)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>Credit · Revolut</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <EditableAmount value={sold} onSave={v => updateDatorii.mutate({ accountId: 'credit_revolut', sold_curent: v })} color="#fff" />
            <span style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.6)', fontWeight: 400 }}>RON rămas</span>
          </div>
        </div>
        <button
          onClick={() => setShowForm(p => !p)}
          style={{ padding: '0.5rem 1.1rem', borderRadius: 8, border: '2px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          + Plată rată
        </button>
      </div>

      {/* Payment form */}
      {showForm && (
        <div style={{ padding: '0.9rem 1.5rem', background: '#EEF2FF', borderBottom: '1px solid #C7D2FE', display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            autoFocus
            type="number"
            placeholder="Sumă plătită (RON)"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitPayment()}
            style={{ width: 160, padding: '0.45rem 0.7rem', borderRadius: 7, border: '1px solid #A5B4FC', fontSize: '0.88rem', outline: 'none' }}
          />
          <input
            type="text"
            placeholder="Notă (opțional)"
            value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitPayment()}
            style={{ flex: 1, minWidth: 140, padding: '0.45rem 0.7rem', borderRadius: 7, border: '1px solid #A5B4FC', fontSize: '0.88rem', outline: 'none' }}
          />
          <button onClick={submitPayment} style={{ padding: '0.45rem 1rem', borderRadius: 7, border: 'none', background: '#6366F1', color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Înregistrează</button>
          <button onClick={() => setShowForm(false)} style={{ padding: '0.45rem 0.6rem', borderRadius: 7, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', fontSize: '0.85rem', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Fields */}
      <div style={{ padding: '0.85rem 1.5rem 1rem', display: 'flex', gap: '2rem', flexWrap: 'wrap', borderBottom: '1px solid #EEF2FF' }}>
        <EditableField label="DAE / Dobândă" value={data?.dobanda || 0} onSave={v => updateDatorii.mutate({ accountId: 'credit_revolut', dobanda: v })} suffix="%" />
        <EditableField label="Rată lunară" value={data?.plata_minima || 0} onSave={v => updateDatorii.mutate({ accountId: 'credit_revolut', plata_minima: v })} suffix=" RON" />
        <EditableField label="Zi scadentă" value={data?.zi_scadenta || 1} onSave={v => updateDatorii.mutate({ accountId: 'credit_revolut', zi_scadenta: Math.round(v) })} suffix=" / lună" />
      </div>

      {/* Payment history */}
      <div style={{ padding: '0.75rem 1.5rem 1rem' }}>
        <div style={{ fontSize: '0.78rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.6rem' }}>Istoricul plăților</div>
        {(!data?.payments || data.payments.length === 0) ? (
          <p style={{ color: '#CBD5E1', fontSize: '0.85rem', margin: 0 }}>Nicio plată înregistrată.</p>
        ) : (
          data.payments.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.45rem 0', borderBottom: '1px solid #F8FAFC' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: '#64748B' }}>{p.date}</span>
                {p.note && <span style={{ fontSize: '0.82rem', color: '#475569' }}>{p.note}</span>}
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#6366F1', fontSize: '0.9rem' }}>−{fmt(p.amount)} RON</span>
                <button
                  onClick={() => deletePayment.mutate({ accountId: 'credit_revolut', paymentId: p.id })}
                  style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: '0.8rem', padding: '0.1rem 0.3rem', lineHeight: 1 }}
                  title="Șterge"
                >✕</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function Datorii() {
  const { data, isLoading } = useDatorii()
  const updateDatorii = useUpdateDatorii()

  return (
    <div style={{ maxWidth: 720 }}>
      <h1>Datorii</h1>
      {isLoading ? (
        <p style={{ color: '#94A3B8' }}>Se încarcă...</p>
      ) : (
        <>
          <CardDeCredit data={data?.card_raiffeisen} updateDatorii={updateDatorii} />
          <CreditRevolut data={data?.credit_revolut} updateDatorii={updateDatorii} />
        </>
      )}
    </div>
  )
}
