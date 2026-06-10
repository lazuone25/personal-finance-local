import { useState, useRef } from 'react'
import { useDatorii, useUpdateDatorii, useAddPayment, useDeletePayment, useUpdateInstallment, useImportPdf, useApplyImport } from '../api/hooks'

function fmt(val) {
  return parseFloat(val || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function EditableAmount({ value, onSave, fontSize = '1.5rem', color = '#0F172A' }) {
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
        style={{ fontSize, fontWeight: 700, color, border: 'none', borderBottom: '2px solid #E4002B', outline: 'none', width: 130, background: 'transparent' }}
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

function EditableField({ label, value, onSave, suffix = '', integer = false }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const commit = () => {
    setEditing(false)
    const n = parseFloat(String(draft).replace(',', '.'))
    if (!isNaN(n)) onSave(n)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
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
          {integer ? String(Math.round(value)).padStart(2, '0') : fmt(value)}{suffix}
        </span>
      )}
    </div>
  )
}

const RATA_COLORS = ['#3B82F6', '#8B5CF6', '#10B981']

function InstallmentCard({ inst, onUpdate }) {
  const pct = inst.total > 0 ? Math.min(100, (inst.paid / inst.total) * 100) : 0
  const remaining = Math.max(0, inst.total - inst.paid)
  const color = RATA_COLORS[parseInt(inst.id.replace('rata', '')) - 1] || '#64748B'
  const monthly = inst.total_count > 0 ? inst.total / inst.total_count : 0
  const done = inst.paid_count >= inst.total_count

  const markPaid = () => {
    if (done) return
    onUpdate({
      paid_count: inst.paid_count + 1,
      paid: Math.round((inst.paid + monthly) * 100) / 100,
    })
  }

  return (
    <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `3px solid ${color}`, padding: '0.9rem 1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <p style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{inst.name}</p>
          {done && <span style={{ fontSize: '0.68rem', color: '#10B981', fontWeight: 600 }}>✓ achitat</span>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
            <EditableAmount value={inst.paid} onSave={v => onUpdate({ paid: v })} fontSize="1.05rem" color="#0F172A" />
            <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>/ {fmt(inst.total)} LEI</span>
          </div>
          <p style={{ margin: '0.15rem 0 0', fontSize: '0.7rem', color: '#94A3B8' }}>
            {inst.paid_count} / {inst.total_count} rate
          </p>
        </div>
      </div>
      <div style={{ marginTop: '0.6rem' }}>
        <div style={{ background: '#F1F5F9', borderRadius: 4, height: 6, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 4, transition: 'width 0.4s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
          <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>{Math.round(pct)}% plătit</span>
          <span style={{ fontSize: '0.68rem', color: '#94A3B8' }}>Rămas {fmt(remaining)} LEI</span>
        </div>
      </div>
    </div>
  )
}

function ImportPanel({ onClose }) {
  const importPdf = useImportPdf()
  const applyImport = useApplyImport()
  const fileRef = useRef()
  const [preview, setPreview] = useState(null)
  const [rawText, setRawText] = useState('')

  const [disponibil, setDisponibil] = useState(null)

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const result = await importPdf.mutateAsync(file)
    setPreview(result.parsed)
    setDisponibil(result.disponibil)
  }

  const handleApply = async () => {
    await applyImport.mutateAsync({ installments: preview, disponibil })
    onClose()
  }

  return (
    <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '1rem 1.25rem', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', color: '#0F172A' }}>Import raport Raiffeisen (PDF)</p>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: '1rem' }}>✕</button>
      </div>

      <input ref={fileRef} type="file" accept=".pdf" onChange={handleFile} style={{ display: 'none' }} />
      <button
        onClick={() => fileRef.current.click()}
        disabled={importPdf.isPending}
        style={{ padding: '0.45rem 1rem', borderRadius: 7, border: '1px solid #CBD5E1', background: '#fff', color: '#475569', fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer', marginBottom: '0.75rem' }}
      >
        {importPdf.isPending ? 'Se procesează...' : '↑ Alege fișier PDF'}
      </button>

      {preview !== null && (
        <>
          {preview.length === 0 ? (
            <p style={{ color: '#EF4444', fontSize: '0.82rem', margin: 0 }}>Nu am găsit rate în PDF. Contactează suportul.</p>
          ) : (
            <div>
              <p style={{ fontSize: '0.78rem', color: '#475569', margin: '0 0 0.5rem', fontWeight: 600 }}>Rate găsite — verifică și confirmă:</p>
              {disponibil !== null && (
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 7, padding: '0.4rem 0.75rem', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#1E40AF' }}>
                  Disponibil actualizat: <strong>{disponibil?.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} LEI</strong>
                </div>
              )}
              {preview.map((inst, i) => (
                <div key={i} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 7, padding: '0.5rem 0.75rem', marginBottom: '0.4rem', fontSize: '0.8rem', color: '#0F172A' }}>
                  <strong>{inst.name}</strong>{inst.desc ? ` · ${inst.desc}` : ''} — {inst.paid?.toFixed(2)} / {inst.total?.toFixed(2)} LEI · {inst.paid_count}/{inst.total_count} rate · {inst.monthly?.toFixed(2)} LEI/lună
                </div>
              ))}
              <button
                onClick={handleApply}
                disabled={applyImport.isPending}
                style={{ marginTop: '0.5rem', padding: '0.45rem 1.1rem', borderRadius: 7, border: 'none', background: '#EF4444', color: '#fff', fontSize: '0.83rem', fontWeight: 600, cursor: 'pointer' }}
              >
                {applyImport.isPending ? 'Se salvează...' : 'Aplică'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function CardDeCredit({ data, updateDatorii }) {
  const updateInstallment = useUpdateInstallment()
  const [collapsed, setCollapsed] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const disponibil = data?.sold_curent || 0
  const limita = data?.limita || 0
  const cheltuit = Math.max(0, limita - disponibil)
  const utilizat = limita > 0 ? Math.min(100, (cheltuit / limita) * 100) : 0
  const disponibilPct = limita > 0 ? Math.min(100, (disponibil / limita) * 100) : 0
  const barColor = disponibilPct < 20 ? '#EF4444' : disponibilPct < 50 ? '#F59E0B' : '#22C55E'
  const installments = data?.installments || []

  return (
    <>
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #EF4444', padding: '1.25rem 1.75rem', marginBottom: installments.length && !collapsed ? '0.5rem' : '1rem', cursor: 'default' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => setCollapsed(c => !c)}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444', display: 'inline-block', flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', margin: 0 }}>Card de credit</p>
              <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: '0.1rem 0 0' }}>Raiffeisen</p>
            </div>
            {installments.length > 0 && (
              <span style={{ color: '#CBD5E1', fontSize: '0.75rem', userSelect: 'none', marginLeft: '0.25rem' }}>{collapsed ? '▶' : '▼'}</span>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.25rem' }}>Disponibil</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
              <EditableAmount
                value={disponibil}
                onSave={v => updateDatorii.mutate({ accountId: 'card_raiffeisen', sold_curent: v })}
                fontSize="1.5rem"
              />
              <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 500 }}>/ {fmt(limita)} LEI</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ margin: '1rem 0 0.5rem' }}>
          <div style={{ background: '#F1F5F9', borderRadius: 4, height: 8, overflow: 'hidden' }}>
            <div style={{ width: `${disponibilPct}%`, background: barColor, height: '100%', borderRadius: 4, transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
            <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Cheltuit {Math.round(utilizat)}%</span>
            <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Cheltuit {fmt(cheltuit)} LEI</span>
          </div>
        </div>

        {/* Fields */}
        <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '0.85rem', marginTop: '0.5rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <EditableField label="Limită" value={limita} onSave={v => updateDatorii.mutate({ accountId: 'card_raiffeisen', limita: v })} suffix=" LEI" />
          <EditableField label="DAE" value={data?.dobanda || 0} onSave={v => updateDatorii.mutate({ accountId: 'card_raiffeisen', dobanda: v })} suffix="%" />
          <EditableField label="Plată minimă" value={data?.plata_minima || 0} onSave={v => updateDatorii.mutate({ accountId: 'card_raiffeisen', plata_minima: v })} suffix=" LEI" />
          <EditableField label="Zi scadentă" value={data?.zi_scadenta || 1} onSave={v => updateDatorii.mutate({ accountId: 'card_raiffeisen', zi_scadenta: Math.round(v) })} suffix=" a lunii" integer />
        </div>
      </div>

      {/* Sub-cadrane rate */}
      {!collapsed && (
        <div style={{ marginLeft: '2rem', borderLeft: '2px solid #E2E8F0', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
          {showImport && <ImportPanel onClose={() => setShowImport(false)} />}
          {installments.map(inst => (
            <InstallmentCard
              key={inst.id}
              inst={inst}
              onUpdate={(payload) => updateInstallment.mutate({ accountId: 'card_raiffeisen', installmentId: inst.id, ...payload })}
            />
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
            <button
              onClick={() => setShowImport(p => !p)}
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.75rem', borderRadius: 6, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', cursor: 'pointer', fontWeight: 600 }}
            >
              ↑ Import raport PDF
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function lastScadenta(ziScadenta) {
  const today = new Date()
  const zi = ziScadenta || 1
  const candidate = new Date(today.getFullYear(), today.getMonth(), zi)
  if (candidate <= today) return candidate
  return new Date(today.getFullYear(), today.getMonth() - 1, zi)
}

function DobandaAcumulata({ data }) {
  const sold = data?.sold_curent || 0
  const rata = data?.rata_dobanzii || data?.dobanda || 0
  const zi = data?.zi_scadenta || 1
  const refDate = lastScadenta(zi)
  const zile = Math.floor((new Date() - refDate) / (1000 * 60 * 60 * 24))
  const dailyInterest = Math.round(sold * (rata / 100) / 365 * 100) / 100
  const dobanda = dailyInterest * zile
  const refStr = refDate.toLocaleDateString('ro-RO', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
      <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dobândă acumulată</span>
      <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#EF4444' }}>{fmt(dobanda)} LEI</span>
      <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>din {refStr} · {zile} zile</span>
    </div>
  )
}

function daysSince(dateStr) {
  if (!dateStr) return 0
  const diff = new Date() - new Date(dateStr)
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

function CreditRevolut({ data, updateDatorii }) {
  const addPayment = useAddPayment()
  const deletePayment = useDeletePayment()
  const [showForm, setShowForm] = useState(false)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [includeDobanda, setIncludeDobanda] = useState(true)

  const sold = data?.sold_curent || 0

  const submitPayment = () => {
    const val = parseFloat(amount)
    if (!val) return
    addPayment.mutate({ accountId: 'credit_revolut', amount: val, note, include_dobanda: includeDobanda })
    setAmount('')
    setNote('')
    setShowForm(false)
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #6366F1', padding: '1.25rem 1.75rem', marginBottom: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366F1', display: 'inline-block', flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', margin: 0 }}>Credit</p>
            <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: '0.1rem 0 0' }}>Revolut</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.25rem' }}>Sold rămas</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
              <EditableAmount
                value={sold}
                onSave={v => updateDatorii.mutate({ accountId: 'credit_revolut', sold_curent: v })}
                fontSize="1.5rem"
              />
              <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 500 }}>LEI</span>
            </div>
          </div>
          <button
            onClick={() => setShowForm(p => !p)}
            style={{ marginTop: '0.1rem', padding: '0.4rem 0.85rem', borderRadius: 7, border: '1px solid #C7D2FE', background: '#EEF2FF', color: '#6366F1', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            + Plată rată
          </button>
        </div>
      </div>

      {/* Payment form */}
      {showForm && (
        <div style={{ margin: '0.85rem 0 0', background: '#F8FAFC', borderRadius: 8, padding: '0.85rem 1rem', border: '1px solid #E2E8F0', display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            autoFocus
            type="number"
            placeholder="Sumă plătită (LEI)"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitPayment()}
            style={{ width: 155, padding: '0.45rem 0.7rem', borderRadius: 7, border: '1px solid #CBD5E1', fontSize: '0.88rem', outline: 'none' }}
          />
          <input
            type="text"
            placeholder="Notă (opțional)"
            value={note}
            onChange={e => setNote(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submitPayment()}
            style={{ flex: 1, minWidth: 130, padding: '0.45rem 0.7rem', borderRadius: 7, border: '1px solid #CBD5E1', fontSize: '0.88rem', outline: 'none' }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: '#475569', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <input type="checkbox" checked={includeDobanda} onChange={e => setIncludeDobanda(e.target.checked)} />
            Include dobânda
          </label>
          <button onClick={submitPayment} style={{ padding: '0.45rem 1rem', borderRadius: 7, border: 'none', background: '#6366F1', color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Înregistrează</button>
          <button onClick={() => setShowForm(false)} style={{ padding: '0.45rem 0.6rem', borderRadius: 7, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', fontSize: '0.85rem', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Fields */}
      <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '0.85rem', marginTop: '0.85rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        <EditableField label="DAE" value={data?.dobanda || 0} onSave={v => updateDatorii.mutate({ accountId: 'credit_revolut', dobanda: v })} suffix="%" />
        <EditableField label="Rată dobândă" value={data?.rata_dobanzii || 0} onSave={v => updateDatorii.mutate({ accountId: 'credit_revolut', rata_dobanzii: v })} suffix="%" />
        <EditableField label="Rată lunară" value={data?.plata_minima || 0} onSave={v => updateDatorii.mutate({ accountId: 'credit_revolut', plata_minima: v })} suffix=" LEI" />
        <EditableField label="Zi scadentă" value={data?.zi_scadenta || 1} onSave={v => updateDatorii.mutate({ accountId: 'credit_revolut', zi_scadenta: Math.round(v) })} suffix=" a lunii" integer />
        <DobandaAcumulata data={data} />
        {data?.suma_originala > 0 && (() => {
          const pct = Math.round((1 - sold / data.suma_originala) * 1000) / 10
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rambursat</span>
              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#10B981' }}>{pct}%</span>
              <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>din {fmt(data.suma_originala)} LEI</span>
            </div>
          )
        })()}
      </div>

      {/* Payment history */}
      {data?.payments?.length > 0 && (
        <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '0.75rem', marginTop: '0.75rem' }}>
          <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>Istoric plăți</p>
          {data.payments.map(p => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid #F8FAFC' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>{p.date}</span>
                {p.note && <span style={{ fontSize: '0.8rem', color: '#475569' }}>{p.note}</span>}
              </div>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#6366F1', fontSize: '0.88rem' }}>−{fmt(p.amount)} LEI</span>
                {p.dobanda_inclusa > 0 && <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>(+{fmt(p.dobanda_inclusa)} dob.)</span>}
                <button
                  onClick={() => deletePayment.mutate({ accountId: 'credit_revolut', paymentId: p.id })}
                  style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: '0.8rem', padding: '0.1rem 0.3rem', lineHeight: 1 }}
                  title="Șterge"
                >✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Datorii() {
  const { data, isLoading } = useDatorii()
  const updateDatorii = useUpdateDatorii()

  return (
    <div>
      <h1 style={{ margin: '0 0 1.5rem' }}>Datorii</h1>
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
