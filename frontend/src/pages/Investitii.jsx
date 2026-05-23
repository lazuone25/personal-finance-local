import { useState, useRef } from 'react'
import { useXtbPortfolio } from '../api/hooks'

function formatAmt(val) {
  return parseFloat(val || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })
}

async function uploadXtb(file) {
  const fd = new FormData()
  fd.append('file', file)
  const res = await fetch('/api/xtb/import', { method: 'POST', body: fd })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export default function Investitii() {
  const { data: xtb, isLoading } = useXtbPortfolio()
  const [imported, setImported] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState(null)
  const [tab, setTab] = useState('libere')
  const fileRef = useRef(null)

  const displayData = imported || (xtb?.configured ? xtb : null)

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadErr(null)
    try {
      const result = await uploadXtb(file)
      setImported(result)
    } catch (err) {
      setUploadErr(err.message)
      setImported(null)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div>
      <h1 style={{ margin: '0 0 1.5rem' }}>Investiții</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

        {/* XTB */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #E4002B', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '1.25rem 1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: displayData ? '1px solid #F1F5F9' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#E4002B', display: 'inline-block' }} />
              <p style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', margin: 0 }}>XTB</p>
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{
                fontSize: '0.75rem',
                padding: '0.3rem 0.7rem',
                borderRadius: 6,
                border: '1px solid #E4002B',
                background: '#fff',
                color: '#E4002B',
                cursor: uploading ? 'not-allowed' : 'pointer',
                opacity: uploading ? 0.6 : 1,
                fontWeight: 600,
                whiteSpace: 'nowrap'
              }}
            >
              {uploading ? 'Se importă...' : '📥 Import .xlsx'}
            </button>
            <input
              type="file"
              accept=".xlsx"
              ref={fileRef}
              style={{ display: 'none' }}
              onChange={handleUpload}
            />
          </div>

          {/* Tab Bar - only shown when imported data exists */}
          {displayData && (
            <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #F1F5F9', padding: '0 1.75rem' }}>
              {[
                { id: 'libere', label: 'Fonduri libere' },
                { id: 'totale', label: 'Fonduri totale' },
                { id: 'portofoliu', label: 'Portofoliu' },
                { id: 'istoric', label: 'Istoric' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  style={{
                    flex: 1,
                    padding: '0.75rem 0',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: tab === t.id ? 600 : 400,
                    color: tab === t.id ? '#E4002B' : '#64748B',
                    borderBottom: tab === t.id ? '2px solid #E4002B' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Content Area */}
          {displayData ? (
            <div style={{ padding: '1.5rem 1.75rem' }}>
              {uploadErr && (
                <p style={{ color: '#EF4444', fontSize: '0.75rem', margin: '0 0 1rem' }}>Eroare: {uploadErr}</p>
              )}

              {/* Tab: Fonduri libere */}
              {tab === 'libere' && (
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.75rem' }}>Fonduri libere</p>
                  <p style={{ fontSize: '2rem', fontWeight: 700, color: '#0F172A', margin: '0 0 0.5rem' }}>{formatAmt(displayData.balance)} {displayData.currency}</p>
                  <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: 0 }}>Cash disponibil în cont</p>
                </div>
              )}

              {/* Tab: Fonduri totale */}
              {tab === 'totale' && (
                <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', alignItems: 'flex-start' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>Valoare totală</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>{formatAmt(displayData.equity)} {displayData.currency}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>Fonduri libere</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>{formatAmt(displayData.balance)} {displayData.currency}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 0.5rem' }}>P&amp;L nerealizat</p>
                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: (displayData.unrealized_pl ?? 0) >= 0 ? '#10B981' : '#EF4444', margin: 0 }}>
                      {(displayData.unrealized_pl ?? 0) >= 0 ? '+' : ''}{formatAmt(displayData.unrealized_pl)} {displayData.currency}
                    </p>
                  </div>
                </div>
              )}

              {/* Tab: Portofoliu — closed positions history */}
              {tab === 'portofoliu' && (
                <>
                  <p style={{ fontSize: '0.75rem', color: '#94A3B8', margin: '0 0 1rem', fontWeight: 500 }}>Poziții închise</p>

                  {/* Unrealized P&L info box (shown when non-zero) */}
                  {(displayData.unrealized_pl ?? 0) !== 0 && (
                    <div style={{
                      background: '#FFFBEB',
                      border: '1px solid #FEF3C7',
                      borderRadius: 8,
                      padding: '0.75rem',
                      marginBottom: '1rem',
                      fontSize: '0.8rem',
                      color: '#92400E'
                    }}>
                      <strong>P&amp;L nerealizat (poziții deschise):</strong>{' '}
                      {(displayData.unrealized_pl ?? 0) >= 0 ? '+' : ''}{formatAmt(displayData.unrealized_pl)} {displayData.currency}
                      <br />
                      <span style={{ opacity: 0.8 }}>(Pozițiile deschise nu apar în acest export)</span>
                    </div>
                  )}

                  {displayData.closed_positions && displayData.closed_positions.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC' }}>
                          {['Simbol', 'Tip', 'Volum', 'Preț deschidere', 'Preț închidere', 'P&L brut'].map(col => (
                            <th key={col} style={{ padding: '0.6rem 0.5rem', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {displayData.closed_positions.map((pos, i) => (
                          <tr key={i} style={{ borderTop: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '0.65rem 0.5rem', fontWeight: 700, fontSize: '0.9rem', color: '#0F172A' }}>{pos.symbol}</td>
                            <td style={{ padding: '0.65rem 0.5rem', fontSize: '0.875rem', color: '#475569' }}>{pos.type}</td>
                            <td style={{ padding: '0.65rem 0.5rem', fontSize: '0.875rem', color: '#475569' }}>{pos.volume}</td>
                            <td style={{ padding: '0.65rem 0.5rem', fontSize: '0.875rem', color: '#475569' }}>{formatAmt(pos.open_price)}</td>
                            <td style={{ padding: '0.65rem 0.5rem', fontSize: '0.875rem', color: '#475569' }}>{formatAmt(pos.close_price)}</td>
                            <td style={{ padding: '0.65rem 0.5rem', fontWeight: 600, fontSize: '0.875rem', color: (pos.gross_pl ?? 0) >= 0 ? '#10B981' : '#EF4444' }}>
                              {(pos.gross_pl ?? 0) >= 0 ? '+' : ''}{formatAmt(pos.gross_pl)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ color: '#94A3B8', fontSize: '0.875rem', margin: 0 }}>Nu există poziții închise în perioada exportată.</p>
                  )}
                </>
              )}

              {/* Tab: Istoric — cash operations */}
              {tab === 'istoric' && (
                <>
                  {displayData.operations && displayData.operations.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#F8FAFC' }}>
                          <th style={{ padding: '0.6rem 0', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Data</th>
                          <th style={{ padding: '0.6rem 0', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tip</th>
                          <th style={{ padding: '0.6rem 0', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Simbol</th>
                          <th style={{ padding: '0.6rem 0', textAlign: 'left', fontSize: '0.7rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sumă (EUR)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...displayData.operations]
                          .sort((a, b) => new Date(b.time) - new Date(a.time))
                          .map((op, i) => (
                            <tr key={i} style={{ borderTop: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '0.65rem 0', fontSize: '0.875rem', color: '#475569' }}>{op.time.slice(0, 10)}</td>
                              <td style={{ padding: '0.65rem 0', fontSize: '0.875rem', color: '#475569' }}>{op.type}</td>
                              <td style={{ padding: '0.65rem 0', fontSize: '0.875rem', color: '#475569' }}>{op.symbol || '—'}</td>
                              <td style={{ padding: '0.65rem 0', fontWeight: 600, fontSize: '0.875rem', color: op.amount > 0 ? '#10B981' : '#EF4444' }}>
                                {op.amount > 0 ? '+' : ''}{formatAmt(op.amount)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ color: '#94A3B8', fontSize: '0.875rem', margin: 0 }}>
                      Nu există operațiuni cash în fișierul exportat. Exportați &lsquo;Cash operation history&rsquo; din XTB pentru a vedea depozite și tranzacții.
                    </p>
                  )}
                </>
              )}
            </div>
          ) : (
            <div style={{ padding: '1.5rem 1.75rem' }}>
              <p style={{ color: '#94A3B8', fontSize: '0.875rem', margin: 0 }}>Neconfigurat — importați un fișier .xlsx din contul XTB</p>
            </div>
          )}
        </div>

        {/* Tradeville */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '1.25rem 1.75rem', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #1A56DB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#1A56DB', display: 'inline-block' }} />
            <p style={{ fontWeight: 700, fontSize: '1rem', color: '#0F172A', margin: 0 }}>Tradeville</p>
          </div>
          <p style={{ color: '#94A3B8', fontSize: '0.85rem', margin: 0 }}>În curând</p>
        </div>

      </div>
    </div>
  )
}
