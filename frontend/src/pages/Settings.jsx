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
  const [connecting, setConnecting] = useState(false)

  const handleConnect = async () => {
    if (!selectedBank) return
    setConnecting(true)
    try {
      const result = await connectBank.mutateAsync({
        bank_id: selectedBank.bic,
        bank_name: selectedBank.name,
        country: selectedBank.country || 'RO',
      })
      window.open(result.redirect_url, '_blank')
    } finally {
      setConnecting(false)
    }
  }

  const connectedIds = new Set(connections.map(c => c.bank_id))

  return (
    <div>
      <h1>Setări</h1>

      <section style={{ marginBottom: '2rem' }}>
        <h2>Conectează o bancă</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
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
