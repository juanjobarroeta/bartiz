/**
 * Tesorería — bank accounts + recent movements at a glance.
 *
 * Two-pane layout (left: accounts grouped by tipo, right: movements
 * of the selected account with status badges + entity-link descriptors).
 *
 * Now also supports importing bank statements (CSV / PDF text) directly.
 * Reuses the shared importBankStatement helper on the backend so dedup
 * + auto-categorize behaviour is identical to contabilidad-os's bancos
 * upload flow. Same logic both sides — re-importing a file is safe,
 * existing rows get skipped on (fecha, monto, descripcion, referencia).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../config/api'
import Modal from '../components/Modal'
import { alertDialog } from '../components/Dialog'
import '../components/Modal.css'
import './TesoreriaBartiz.css'

const fmtMoney = (n) =>
  n == null ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(Number(n) || 0)
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }) : '—'

const TIPO_LABEL = {
  CHEQUES: 'Cuentas operativas',
  TARJETA_DEPARTAMENTAL: 'Tarjetas departamentales',
  CAJA: 'Caja chica',
}

export default function TesoreriaBartiz() {
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id

  const [accounts, setAccounts] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [txs, setTxs] = useState([])
  const [txLoading, setTxLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [uploadOpen, setUploadOpen] = useState(false)

  // Load accounts with balances baked in
  useEffect(() => {
    if (!companyId) return
    setLoading(true)
    apiFetch(`/api/construccion/bank-accounts?companyId=${encodeURIComponent(companyId)}&withBalances=true`)
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setAccounts(list)
        if (list.length > 0 && !selected) setSelected(list[0].id)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [companyId]) // eslint-disable-line

  // Load txs for the selected account
  const reloadTxs = useCallback(async () => {
    if (!selected || !companyId) return
    setTxLoading(true)
    try {
      const params = new URLSearchParams({
        companyId,
        bankAccountId: selected,
        limit: '100',
      })
      params.set('onlyDebitos', 'false')
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      const data = await apiFetch(`/api/construccion/bank-transactions?${params.toString()}`)
      setTxs(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
    } finally {
      setTxLoading(false)
    }
  }, [selected, companyId, statusFilter])

  useEffect(() => { reloadTxs() }, [reloadTxs])

  const grouped = useMemo(() => {
    const m = new Map()
    for (const a of accounts) {
      const k = a.tipo ?? 'OTROS'
      if (!m.has(k)) m.set(k, [])
      m.get(k).push(a)
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [accounts])

  if (!companyId) return <div className="pd-empty">Selecciona una empresa.</div>

  const totalGlobal = accounts.reduce((a, x) => a + (x.balance ?? 0), 0)
  const selectedAcc = accounts.find((a) => a.id === selected)

  return (
    <div className="tesoreria-page">
      <header>
        <h1>Tesorería</h1>
        <p className="muted small">
          Cuentas y movimientos de la empresa. Sube tus estados de cuenta
          (CSV/PDF) desde la cuenta seleccionada — los movimientos
          existentes se ignoran y solo los nuevos se importan.
        </p>
      </header>

      {loading ? (
        <div className="pd-empty">Cargando…</div>
      ) : accounts.length === 0 ? (
        <div className="pd-empty">
          No hay cuentas configuradas. Agrégalas desde contabilidad-os → Bancos.
        </div>
      ) : (
        <div className="teso-grid">
          {/* Left: accounts */}
          <aside className="teso-accounts">
            <div className="teso-header">
              <span className="muted small">Saldo total</span>
              <strong className="teso-total">{fmtMoney(totalGlobal)}</strong>
            </div>
            {grouped.map(([tipo, list]) => {
              const grpTotal = list.reduce((a, x) => a + (x.balance ?? 0), 0)
              return (
                <div key={tipo} className="teso-group">
                  <div className="teso-group-head">
                    <span>{TIPO_LABEL[tipo] ?? tipo}</span>
                    <span className="muted small">{fmtMoney(grpTotal)}</span>
                  </div>
                  {list.map((a) => (
                    <button
                      key={a.id}
                      className={`teso-acc-card ${selected === a.id ? 'active' : ''}`}
                      onClick={() => setSelected(a.id)}
                    >
                      <div className="teso-acc-name">
                        <strong>{a.banco}</strong>
                        <span className="muted small"> {a.nombre}</span>
                      </div>
                      {a.titular && <div className="muted small">Titular: {a.titular}</div>}
                      <div className="teso-acc-figures">
                        <strong className={a.balance < 0 ? 'neg' : ''}>{fmtMoney(a.balance)}</strong>
                        <span className={`teso-flow ${a.flow30d >= 0 ? 'up' : 'down'}`}>
                          {a.flow30d >= 0 ? '↑' : '↓'} {fmtMoney(Math.abs(a.flow30d))}
                          <span className="muted small"> 30d</span>
                        </span>
                      </div>
                      <div className="muted small">{a.transactionCount ?? 0} mov.</div>
                    </button>
                  ))}
                </div>
              )
            })}
          </aside>

          {/* Right: transactions */}
          <main className="teso-txs">
            {selectedAcc ? (
              <>
                <div className="teso-tx-head">
                  <div>
                    <h2>
                      {selectedAcc.banco} <span className="muted small">{selectedAcc.nombre}</span>
                    </h2>
                    <div className="muted small">
                      {selectedAcc.tipo} · cuenta {selectedAcc.numeroCuenta}
                    </div>
                  </div>
                  <div className="teso-tx-toolbar">
                    <button
                      type="button"
                      className="teso-import-btn"
                      onClick={() => setUploadOpen(true)}
                    >
                      ⬆ Importar movimientos
                    </button>
                    <div className="teso-filters">
                      {['ALL', 'UNMATCHED', 'MATCHED', 'IGNORED'].map((f) => (
                        <button
                          key={f}
                          className={statusFilter === f ? 'active' : ''}
                          onClick={() => setStatusFilter(f)}
                        >
                          {f === 'ALL' ? 'Todos' : f === 'UNMATCHED' ? 'Sin conciliar' : f === 'MATCHED' ? 'Conciliados' : 'Ignorados'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <Modal
                  open={uploadOpen}
                  onClose={() => setUploadOpen(false)}
                  title={`Importar movimientos a ${selectedAcc.banco} ${selectedAcc.nombre}`}
                  size="md"
                >
                  <ImportForm
                    bankAccountId={selectedAcc.id}
                    onClose={() => setUploadOpen(false)}
                    onImported={() => {
                      setUploadOpen(false)
                      reloadTxs()
                    }}
                  />
                </Modal>

                {txLoading ? (
                  <div className="pd-empty">Cargando movimientos…</div>
                ) : txs.length === 0 ? (
                  <div className="pd-empty">Sin movimientos en este filtro.</div>
                ) : (
                  <table className="teso-tx-table">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Descripción</th>
                        <th>Status</th>
                        <th>Vinculado a</th>
                        <th style={{ textAlign: 'right' }}>Monto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {txs.map((t) => {
                        const linkedTo =
                          t.gastoPagado
                            ? `Gasto · ${t.gastoPagado.beneficiarioNombre} · ${fmtMoney(t.gastoPagado.importe)}`
                            : t.reembolsoPagado
                            ? `Reembolso semanal ${fmtDate(t.reembolsoPagado.semanaInicio)}–${fmtDate(t.reembolsoPagado.semanaFin)}`
                            : t.rayaPagada
                            ? `Raya ${t.rayaPagada.id.slice(0, 8)}`
                            : t.invoice
                            ? `Factura ${t.invoice.folio}`
                            : null
                        return (
                          <tr key={t.id}>
                            <td className="small muted">{fmtDate(t.fecha)}</td>
                            <td className="small">
                              {t.descripcion?.slice(0, 60)}
                              {t.referencia && (
                                <div className="muted small">Ref: <span className="mono">{t.referencia}</span></div>
                              )}
                            </td>
                            <td>
                              <span className={`badge status-${(t.status ?? 'UNMATCHED').toLowerCase()}`}>
                                {t.status ?? 'UNMATCHED'}
                              </span>
                              {t.source === 'MANUAL' && (
                                <span
                                  className="badge source-manual"
                                  title="Creado por flujo de pago, no por importación de CSV. Reimporta el estado de cuenta para que esta línea coincida con el banco real."
                                  style={{ marginLeft: '0.3rem' }}
                                >
                                  manual
                                </span>
                              )}
                            </td>
                            <td className="small">{linkedTo ?? <span className="muted">—</span>}</td>
                            <td
                              style={{
                                textAlign: 'right',
                                fontVariantNumeric: 'tabular-nums',
                                color: t.tipo === 'CREDITO' ? '#16a34a' : t.monto < 0 ? '#dc2626' : '#0f172a',
                                fontWeight: 600,
                              }}
                            >
                              {fmtMoney(t.monto)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </>
            ) : (
              <div className="pd-empty">Selecciona una cuenta a la izquierda.</div>
            )}
          </main>
        </div>
      )}
    </div>
  )
}

// ── ImportForm ───────────────────────────────────────────────────────────────
// Reads a CSV / PDF text file via FileReader and POSTs the raw text +
// filename to /api/construccion/bank-accounts/[id]/upload. Server parses
// + dedupes + auto-categorizes. Re-importing the same file is safe.
function ImportForm({ bankAccountId, onClose, onImported }) {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null) // { name, content }
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  const onPick = (f) => {
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => setFile({ name: f.name, content: String(reader.result ?? '') })
    reader.onerror = () => alertDialog({ message: 'No se pudo leer el archivo.' })
    reader.readAsText(f)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!file) return
    setBusy(true)
    setResult(null)
    try {
      const r = await apiFetch(
        `/api/construccion/bank-accounts/${bankAccountId}/upload`,
        { method: 'POST', body: { fileContent: file.content, filename: file.name } }
      )
      setResult(r)
      if (r.ok && r.imported > 0) {
        // Defer onImported a beat so user can read the result message
        setTimeout(() => onImported?.(), 1500)
      }
    } catch (err) {
      alertDialog({ message: err.message || 'Error al importar' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="teso-import-form">
      <p className="muted small" style={{ marginTop: 0 }}>
        Sube el estado de cuenta del banco (CSV o PDF convertido a texto).
        Los movimientos que ya existen se ignoran automáticamente; solo
        se agregan los nuevos. El sistema reconoce comisiones bancarias,
        pagos al SAT y traspasos internos como <em>Ignorados</em> para que
        tu bandeja "Sin conciliar" se mantenga limpia.
      </p>

      {!file ? (
        <button
          type="button"
          className="file-btn"
          onClick={() => inputRef.current?.click()}
        >
          📂 Elegir archivo (.csv / .txt)
        </button>
      ) : (
        <div className="file-chip-row">
          <span>📄 {file.name}</span>
          <button
            type="button"
            className="link small"
            onClick={() => { setFile(null); setResult(null); if (inputRef.current) inputRef.current.value = '' }}
          >
            quitar
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.txt,.tsv"
        style={{ display: 'none' }}
        onChange={(e) => onPick(e.target.files?.[0])}
      />

      {result && (
        <div className={`import-result ${result.ok ? 'ok' : 'err'}`}>
          {result.ok ? (
            <>
              <strong>{result.message}</strong>
              {result.detectedBank && (
                <div className="small muted">Formato detectado: {result.detectedBank}</div>
              )}
              {(result.warnings ?? []).slice(0, 3).map((w, i) => (
                <div key={i} className="small muted">⚠ {w}</div>
              ))}
            </>
          ) : (
            <strong>{result.error || result.message}</strong>
          )}
        </div>
      )}

      <div className="modal-actions">
        <button type="button" onClick={onClose}>Cerrar</button>
        <button type="submit" className="primary" disabled={!file || busy}>
          {busy ? 'Importando…' : 'Importar'}
        </button>
      </div>
    </form>
  )
}
