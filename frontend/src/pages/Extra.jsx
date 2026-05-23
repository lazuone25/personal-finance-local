import { useState } from 'react'
import { useExtra, useUpdateExtra } from '../api/hooks'

function formatAmt(val) {
  return parseFloat(val || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })
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

export default function Extra() {
  const { data, isLoading } = useExtra()
  const updateExtra = useUpdateExtra()

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
  const fonduriNefolosite = (data.main_balance || 0) - baniPersonali - alocatieEma

  const subColors = ['#3B82F6', '#10B981']

  return (
    <div>
      <h1 style={{ margin: '0 0 1.5rem' }}>Extra</h1>

      {/* Main card — Economii cu acces instant */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #A8A9AD', padding: '1.25rem 1.75rem', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#A8A9AD', display: 'inline-block' }} />
            <div>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', margin: 0 }}>Economii cu acces instant</p>
              <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: '0.1rem 0 0' }}>Revolut</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.25rem' }}>Sold total</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
              <EditableAmount value={data.main_balance} onSave={updateMainBalance} fontSize="1.5rem" />
              <span style={{ fontSize: '0.85rem', color: '#94A3B8', fontWeight: 500 }}>{data.currency}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-accounts */}
      <div style={{ marginLeft: '2rem', borderLeft: '2px solid #E2E8F0', paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {editableSubs.map((sub, idx) => (
          <div key={sub.id} style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `3px solid ${subColors[idx % subColors.length]}`, padding: '0.9rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{sub.name}</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
              <EditableAmount value={sub.amount} onSave={(val) => updateSubAccount(sub.id, val)} fontSize="1.1rem" color="#0F172A" />
              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{data.currency}</span>
            </div>
          </div>
        ))}

        {/* FONDURI NEFOLOSITE — calculat automat */}
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `3px solid #8B5CF6`, padding: '0.9rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontWeight: 600, fontSize: '0.85rem', color: '#475569', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>FONDURI NEFOLOSITE</p>
            <p style={{ fontSize: '0.65rem', color: '#94A3B8', margin: '0.15rem 0 0' }}>calculat automat</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: fonduriNefolosite < 0 ? '#EF4444' : '#0F172A' }}>
              {formatAmt(fonduriNefolosite)}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{data.currency}</span>
          </div>
        </div>
      </div>

    </div>
  )
}
