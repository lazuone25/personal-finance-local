import { useState } from 'react'
import { useExtra, useUpdateExtra, useAddTransfer, useDeleteTransfer, useAddDePrimit, useDeleteDePrimit } from '../api/hooks'

function formatAmt(val) {
  return parseFloat(val || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })
}

function daysSince(dateStr) {
  if (!dateStr) return 0
  const start = new Date(dateStr)
  const now = new Date()
  const diff = now - start
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

function EditableAmount({ value, onSave, fontSize = '1.5rem', color = '#0F172A' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  const startEdit = () => {
    setDraft(String(value || 0))
    setEditing(true)
  }

  const commit = () => {
    setEditing(false)
    const n = parseFloat(draft.replace(',', '.'))
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
        style={{ fontSize, fontWeight: 700, color, border: 'none', borderBottom: '2px solid #E4002B', outline: 'none', width: '120px', background: 'transparent' }}
      />
    )
  }

  return (
    <span
      onClick={startEdit}
      title="Click pentru a edita"
      style={{ fontSize, fontWeight: 700, color, cursor: 'pointer', borderBottom: '1px dashed #CBD5E1' }}
    >
      {formatAmt(value)}
    </span>
  )
}

const SUB_ACCOUNT_OPTIONS = [
  { id: 'bani_personali', name: 'BANI PERSONALI' },
  { id: 'alocatie_ema', name: 'ALOCATIE EMA' },
  { id: 'fonduri_nefolosite', name: 'FONDURI NEFOLOSITE' },
]

const REVOLUT_OPTIONS = [
  { id: 'revolut_personal', name: 'Revolut Personal' },
  { id: 'revolut_comun', name: 'Revolut Comun' },
]

const SOURCE_OPTIONS = [...SUB_ACCOUNT_OPTIONS, ...REVOLUT_OPTIONS]
const DEST_OPTIONS   = [...SUB_ACCOUNT_OPTIONS, ...REVOLUT_OPTIONS]

function getAccountName(id) {
  return [...SOURCE_OPTIONS, ...DEST_OPTIONS].find(o => o.id === id)?.name || id
}

function TransferForm({ currency, onSave, onCancel }) {
  const [amount, setAmount] = useState('')
  const [sourceId, setSourceId] = useState('bani_personali')
  const [destId, setDestId] = useState('revolut_personal')
  const [note, setNote] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (sourceId === destId) return
    const n = parseFloat(amount.replace(',', '.'))
    if (!n || n <= 0) return
    onSave({ amount: n, source_id: sourceId, dest_id: destId, note })
  }

  const inputStyle = {
    padding: '0.5rem 0.75rem', borderRadius: 8, border: '1px solid #E2E8F0',
    fontSize: '0.875rem', outline: 'none', width: '100%', boxSizing: 'border-box',
    background: '#fff'
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: '#F8FAFC', borderRadius: 10, padding: '1rem 1.25rem', border: '1px solid #E2E8F0', marginBottom: '0.75rem' }}>
      <p style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0F172A', margin: '0 0 0.75rem' }}>Înregistrează transfer</p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Sumă ({currency})</label>
          <input autoFocus type="text" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="500" style={inputStyle} required />
        </div>
        <div>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Din contul</label>
          <select value={sourceId} onChange={e => {
            const newSrc = e.target.value
            setSourceId(newSrc)
            if (destId === newSrc) {
              const first = DEST_OPTIONS.find(o => o.id !== newSrc)
              if (first) setDestId(first.id)
            }
          }} style={inputStyle}>
            {SOURCE_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>În contul</label>
          <select value={destId} onChange={e => setDestId(e.target.value)} style={inputStyle}>
            {DEST_OPTIONS.filter(o => o.id !== sourceId).map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: '0.75rem' }}>
        <label style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.25rem' }}>Notă (opțional)</label>
        <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="ex: cumpărături, chirie..." style={inputStyle} />
      </div>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="submit" style={{ flex: 1, padding: '0.5rem', borderRadius: 8, border: 'none', background: '#A8A9AD', color: '#fff', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
          Înregistrează
        </button>
        <button type="button" onClick={onCancel} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer' }}>
          Anulează
        </button>
      </div>
    </form>
  )
}

function DePrimitForm({ onSave, onCancel }) {
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const n = parseFloat(amount.replace(',', '.'))
    if (!name.trim() || !n || n <= 0) return
    onSave({ name: name.trim(), amount: n, note: note.trim() || undefined })
  }

  const inputStyle = {
    padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid #E2E8F0',
    fontSize: '0.8rem', outline: 'none', width: '100%', boxSizing: 'border-box',
    background: '#fff'
  }

  return (
    <form onSubmit={handleSubmit} style={{ background: '#F0FDF4', borderRadius: 8, padding: '0.75rem 1rem', border: '1px solid #BBF7D0', marginTop: '0.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.4rem' }}>
        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: 600, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.2rem' }}>Persoană</label>
          <input autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Nume" style={inputStyle} required />
        </div>
        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: 600, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.2rem' }}>Sumă (RON)</label>
          <input type="text" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="100" style={inputStyle} required />
        </div>
      </div>
      <div style={{ marginBottom: '0.5rem' }}>
        <label style={{ fontSize: '0.65rem', fontWeight: 600, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.2rem' }}>Notă (opțional)</label>
        <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="ex: împrumut telefon" style={inputStyle} />
      </div>
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <button type="submit" style={{ flex: 1, padding: '0.4rem', borderRadius: 6, border: 'none', background: '#10B981', color: '#fff', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
          Adaugă
        </button>
        <button type="button" onClick={onCancel} style={{ padding: '0.4rem 0.75rem', borderRadius: 6, border: '1px solid #E2E8F0', background: '#fff', color: '#64748B', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}>
          Anulează
        </button>
      </div>
    </form>
  )
}

export default function Extra() {
  const { data, isLoading } = useExtra()
  const updateExtra = useUpdateExtra()
  const addTransfer = useAddTransfer()
  const deleteTransfer = useDeleteTransfer()
  const addDePrimit = useAddDePrimit()
  const deleteDePrimit = useDeleteDePrimit()
  const [showForm, setShowForm] = useState(false)
  const [showDePrimitForm, setShowDePrimitForm] = useState(false)
  const [economiiCollapsed, setEconomiiCollapsed] = useState(false)
  const [urgentaCollapsed, setUrgentaCollapsed] = useState(false)
  const [dePrimitCollapsed, setDePrimitCollapsed] = useState(false)

  if (isLoading || !data) return (
    <div>
      <h1 style={{ margin: '0 0 1.5rem' }}>Extra</h1>
      <p style={{ color: '#94A3B8' }}>Se încarcă...</p>
    </div>
  )

  const updateMainBalance = (val) => updateExtra.mutate({ ...data, main_balance: val })

  const updateSubAccount = (id, val) => {
    const newSubs = data.sub_accounts.map(s => s.id === id ? { ...s, amount: val } : s)
    updateExtra.mutate({ ...data, sub_accounts: newSubs })
  }

  const editableSubs = data.sub_accounts.filter(s => s.id !== 'fonduri_nefolosite')
  const baniPersonali = data.sub_accounts.find(s => s.id === 'bani_personali')?.amount || 0
  const alocatieEma = data.sub_accounts.find(s => s.id === 'alocatie_ema')?.amount || 0

  // Dobandă economii Revolut 3%/an
  const economiiDays = daysSince(data.interest_start_date)
  const dobandaEconomii = (data.main_balance || 0) * 0.03 * economiiDays / 365

  const fonduriNefolosite = (data.main_balance || 0) - baniPersonali - alocatieEma + dobandaEconomii

  // Dobandă fond urgență
  const fondUrgenta = data.fond_urgenta || { amount: 0, interest_rate: 0.025, interest_start_date: null }
  const fondUrgentaDays = daysSince(fondUrgenta.interest_start_date)
  const dobandaFondUrgenta = (fondUrgenta.amount || 0) * (fondUrgenta.interest_rate || 0.025) * fondUrgentaDays / 365

  const dePrimit = data.de_primit || []

  const subColors = ['#3B82F6', '#10B981']

  return (
    <div>
      <h1 style={{ margin: '0 0 1.5rem' }}>Extra</h1>

      {/* Main card — Economii cu acces instant */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #A8A9AD', padding: '1.25rem 1.75rem', marginBottom: '0.5rem', cursor: 'pointer' }} onClick={() => setEconomiiCollapsed(c => !c)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#A8A9AD', display: 'inline-block' }} />
            <div>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', margin: 0 }}>Economii cu acces instant</p>
              <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: '0.1rem 0 0' }}>Revolut</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
              <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.25rem' }}>Sold total</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                <EditableAmount value={data.main_balance} onSave={updateMainBalance} fontSize="1.5rem" />
                <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 500 }}>{data.currency}</span>
              </div>
            </div>
            <span style={{ color: '#CBD5E1', fontSize: '0.75rem', userSelect: 'none' }}>{economiiCollapsed ? '▶' : '▼'}</span>
          </div>
        </div>
      </div>

      {/* Sub-accounts */}
      {!economiiCollapsed && <div style={{ marginLeft: '2rem', borderLeft: '2px solid #E2E8F0', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {editableSubs.map((sub, idx) => (
          <div key={sub.id}>
            <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `3px solid ${subColors[idx % subColors.length]}`, padding: '0.9rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{sub.name}</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                <EditableAmount value={sub.amount} onSave={(val) => updateSubAccount(sub.id, val)} fontSize="1.1rem" color="#0F172A" />
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{data.currency}</span>
              </div>
            </div>

            {/* "De primit" section under BANI PERSONALI */}
            {sub.id === 'bani_personali' && (
              <div style={{ marginLeft: '1.5rem', borderLeft: '2px solid #BBF7D0', paddingLeft: '0.75rem', marginTop: '0.3rem', marginBottom: '0.1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem', cursor: 'pointer' }} onClick={() => setDePrimitCollapsed(c => !c)}>
                  <p style={{ fontSize: '0.65rem', fontWeight: 600, color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>
                    De primit {dePrimit.length > 0 && `· ${formatAmt(dePrimit.reduce((s, e) => s + (e.amount || 0), 0))} RON`}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={e => e.stopPropagation()}>
                    {!showDePrimitForm && !dePrimitCollapsed && (
                      <button
                        onClick={() => setShowDePrimitForm(true)}
                        style={{ fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: 5, border: '1px solid #BBF7D0', background: '#F0FDF4', color: '#059669', cursor: 'pointer', fontWeight: 600 }}
                      >
                        + De primit
                      </button>
                    )}
                    <span style={{ color: '#CBD5E1', fontSize: '0.65rem', userSelect: 'none', cursor: 'pointer' }} onClick={() => setDePrimitCollapsed(c => !c)}>
                      {dePrimitCollapsed ? '▶' : '▼'}
                    </span>
                  </div>
                </div>

                {!dePrimitCollapsed && showDePrimitForm && (
                  <DePrimitForm
                    onSave={(entry) => { addDePrimit.mutate(entry); setShowDePrimitForm(false) }}
                    onCancel={() => setShowDePrimitForm(false)}
                  />
                )}

                {!dePrimitCollapsed && dePrimit.length === 0 && !showDePrimitForm && (
                  <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: '0.1rem 0 0.3rem' }}>Nicio sumă de primit.</p>
                )}

                {!dePrimitCollapsed && dePrimit.map(entry => (
                  <div key={entry.id} style={{ background: '#F0FDF4', borderRadius: 7, padding: '0.45rem 0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#0F172A', fontWeight: 500 }}>
                        {entry.name}
                        {entry.note && <span style={{ color: '#64748B', fontWeight: 400 }}> · {entry.note}</span>}
                      </p>
                      <p style={{ margin: '0.1rem 0 0', fontSize: '0.65rem', color: '#94A3B8' }}>{entry.date}</p>
                    </div>
                    <p style={{ margin: '0 0.5rem', fontWeight: 600, fontSize: '0.85rem', color: '#10B981', whiteSpace: 'nowrap' }}>
                      +{formatAmt(entry.amount)} RON
                    </p>
                    <button
                      onClick={() => deleteDePrimit.mutate(entry.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1', fontSize: '0.85rem', padding: '0.15rem', lineHeight: 1 }}
                      title="Șterge"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* FONDURI NEFOLOSITE — calculat automat + dobândă */}
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `3px solid #8B5CF6`, padding: '0.9rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>FONDURI NEFOLOSITE</p>
            <p style={{ fontSize: '0.65rem', color: '#94A3B8', margin: '0.15rem 0 0' }}>calculat automat</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 700, color: fonduriNefolosite < 0 ? '#EF4444' : '#0F172A' }}>
                {formatAmt(fonduriNefolosite)}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{data.currency}</span>
            </div>
            {dobandaEconomii > 0 && (
              <p style={{ margin: '0.15rem 0 0', fontSize: '0.7rem', color: '#10B981', fontWeight: 500 }}>
                din care dobândă: {formatAmt(dobandaEconomii)} RON
              </p>
            )}
          </div>
        </div>
      </div>}

      {/* Fond de urgenta card */}
      <div style={{ marginTop: '1.25rem', background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #A8A9AD', padding: '1.25rem 1.75rem', cursor: 'pointer' }} onClick={() => setUrgentaCollapsed(c => !c)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#A8A9AD', display: 'inline-block' }} />
            <div>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', margin: 0 }}>Fond de urgență</p>
              <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: '0.1rem 0 0' }}>Revolut</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }} onClick={e => e.stopPropagation()}>
              <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.25rem' }}>Sold total</p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                <EditableAmount
                  value={fondUrgenta.amount}
                  onSave={(val) => updateExtra.mutate({ ...data, fond_urgenta: { ...fondUrgenta, amount: val } })}
                  fontSize="1.5rem"
                />
                <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 500 }}>{data.currency}</span>
              </div>
              {!urgentaCollapsed && dobandaFondUrgenta > 0 && (
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#10B981', fontWeight: 500 }}>
                  Dobândă acumulată: {formatAmt(dobandaFondUrgenta)} RON
                </p>
              )}
            </div>
            <span style={{ color: '#CBD5E1', fontSize: '0.75rem', userSelect: 'none' }}>{urgentaCollapsed ? '▶' : '▼'}</span>
          </div>
        </div>
      </div>

      {/* Transfers section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', marginBottom: '0.75rem' }}>
        <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Istoric transferuri</p>
        {!showForm && (
          <button onClick={() => setShowForm(true)} style={{ fontSize: '0.75rem', padding: '0.3rem 0.75rem', borderRadius: 6, border: '1px solid #A8A9AD', background: '#fff', color: '#475569', cursor: 'pointer', fontWeight: 600 }}>
            + Transfer
          </button>
        )}
      </div>

      {showForm && (
        <TransferForm
          currency={data.currency}
          onSave={(t) => { addTransfer.mutate(t); setShowForm(false) }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {(data.transfers || []).length === 0 ? (
        <p style={{ color: '#94A3B8', fontSize: '0.875rem', margin: 0 }}>Niciun transfer înregistrat.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {(data.transfers || []).map(tx => (
            <div key={tx.id} style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '0.8rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: '#0F172A', fontWeight: 500 }}>
                  {getAccountName(tx.source_id)} → {getAccountName(tx.dest_id)}
                  {tx.note && <span style={{ color: '#64748B', fontWeight: 400 }}> · {tx.note}</span>}
                </p>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.75rem', color: '#94A3B8' }}>{tx.date}</p>
              </div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '1rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                {formatAmt(tx.amount)} {data.currency}
              </p>
              <button onClick={() => deleteTransfer.mutate(tx.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1', fontSize: '1rem', padding: '0.25rem', lineHeight: 1 }} title="Șterge">✕</button>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}
