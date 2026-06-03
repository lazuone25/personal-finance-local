import { useState } from 'react'
import { useBanks, useConnections, useConnectBank, useDisconnectBank, useSyncStatus, useManualSync } from '../api/hooks'

export default function Settings() {
  const { data: banks = [] } = useBanks()
  const { data: connections = [] } = useConnections()
  const { data: syncStatus } = useSyncStatus()
  const connectBank = useConnectBank()
  const disconnectBank = useDisconnectBank()
  const manualSync = useManualSync()
  const [selectedBank, setSelectedBank] = useState(null)
  const [selectedOwner, setSelectedOwner] = useState('andrei')
  const [connecting, setConnecting] = useState(false)

  const handleConnect = async () => {
    if (!selectedBank) return
    setConnecting(true)
    try {
      const result = await connectBank.mutateAsync({
        bank_id: selectedBank.bic,
        bank_name: selectedBank.name,
        country: selectedBank.country || 'RO',
        owner: selectedOwner,
      })
      window.open(result.redirect_url, '_blank')
    } finally {
      setConnecting(false)
    }
  }

  return (
    <div>
      <h1>Setări</h1>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Conectează o bancă</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            onChange={e => setSelectedBank(banks.find(b => b.bic === e.target.value) || null)}
            defaultValue=""
            style={{ padding: '0.5rem', minWidth: 200 }}
          >
            <option value="" disabled>Alege banca...</option>
            {banks.map(b => (
              <option key={b.bic || b.name} value={b.bic}>{b.name}</option>
            ))}
          </select>
          <select
            value={selectedOwner}
            onChange={e => setSelectedOwner(e.target.value)}
            style={{ padding: '0.5rem', minWidth: 120 }}
          >
            <option value="andrei">Andrei</option>
            <option value="anca">Anca</option>
            <option value="comun">Comun</option>
          </select>
          <button
            onClick={handleConnect}
            disabled={!selectedBank || connecting}
            style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
          >
            {connecting ? 'Se conectează...' : 'Conectează'}
          </button>
        </div>
        {connecting && (
          <p style={{ color: '#666', marginTop: '0.5rem' }}>
            Autorizează accesul în tab-ul deschis, apoi revino aici.
          </p>
        )}
      </section>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Bănci conectate</h2>
        {connections.length === 0 ? (
          <p style={{ color: '#666' }}>Nicio bancă conectată.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {connections.map(c => (
              <li key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                <span style={{ color: '#2ecc71' }}>✓</span>
                <span>{c.bank_name}</span>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 600, padding: '0.15rem 0.5rem',
                  borderRadius: 20,
                  background: c.owner === 'anca' ? '#FCE7F3' : c.owner === 'comun' ? '#EDE9FE' : '#DBEAFE',
                  color: c.owner === 'anca' ? '#9D174D' : c.owner === 'comun' ? '#5B21B6' : '#1E40AF',
                }}>
                  {c.owner === 'anca' ? 'Anca' : c.owner === 'comun' ? 'Comun' : 'Andrei'}
                </span>
                <button
                  onClick={() => disconnectBank.mutate(c.id)}
                  style={{ marginLeft: 'auto', color: '#e74c3c', background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  Deconectează
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Sincronizare</h2>
        {syncStatus && (
          <div>
            <p>Ultima sincronizare: {syncStatus.last_sync ? new Date(syncStatus.last_sync).toLocaleString('ro-RO') : 'Niciodată'}</p>
            <p>Interval: la {syncStatus.interval_minutes} minute</p>
          </div>
        )}
        <button
          onClick={() => manualSync.mutate()}
          disabled={manualSync.isPending}
          style={{ padding: '0.5rem 1rem', cursor: 'pointer' }}
        >
          {manualSync.isPending ? 'Se sincronizează...' : 'Sincronizează acum'}
        </button>
      </section>
    </div>
  )
}
