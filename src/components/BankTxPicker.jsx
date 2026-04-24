/**
 * Modal that lists UNMATCHED bank transactions for a given account +
 * expected amount window. Used when Katia pays a Gasto or Reembolso —
 * instead of typing a SPEI reference into a prompt, she picks the
 * actual bank line Juan already imported in contabilidad-os.
 *
 * Props:
 *   open, onClose, onPick(tx)
 *   companyId              (required)
 *   bankAccountId?         (optional — narrows by account)
 *   expectedAmount?        (helpful to pre-filter ±10%)
 *   title?                 (defaults to "Elegir movimiento bancario")
 *
 * Also provides an escape hatch: "Crear movimiento nuevo" button for
 * the cash-paid / not-yet-imported case. Calling code gets back
 * { newTx: true, fecha, referencia } instead of a tx object.
 */

import { useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../config/api'
import Modal from './Modal'

const fmtMoney = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(Number(n) || 0)

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

export default function BankTxPicker({
  open,
  onClose,
  onPick,
  companyId,
  bankAccountId,
  expectedAmount,
  title = 'Elegir movimiento bancario',
}) {
  const [txs, setTxs] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState(expectedAmount ? 'NEAR' : 'ALL')
  // "Crear movimiento nuevo" alt path
  const [manualOpen, setManualOpen] = useState(false)
  const [manualFecha, setManualFecha] = useState(new Date().toISOString().slice(0, 10))
  const [manualRef, setManualRef] = useState('')

  useEffect(() => {
    if (!open || !companyId) return
    setLoading(true)
    const params = new URLSearchParams({
      companyId,
      status: 'UNMATCHED',
      limit: '100',
    })
    if (bankAccountId) params.set('bankAccountId', bankAccountId)
    if (filter === 'NEAR' && expectedAmount) {
      const delta = expectedAmount * 0.15 // ±15% window
      params.set('minMonto', String(-Math.abs(expectedAmount) - delta))
      params.set('maxMonto', String(-Math.abs(expectedAmount) + delta))
    }
    apiFetch(`/api/construccion/bank-transactions?${params.toString()}`)
      .then((data) => setTxs(Array.isArray(data) ? data : []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [open, companyId, bankAccountId, filter, expectedAmount])

  const close = () => {
    setManualOpen(false)
    onClose?.()
  }

  const sorted = useMemo(() => {
    if (!expectedAmount) return txs
    // Rank by closeness to expected amount
    return [...txs].sort(
      (a, b) =>
        Math.abs(Math.abs(a.monto) - Math.abs(expectedAmount)) -
        Math.abs(Math.abs(b.monto) - Math.abs(expectedAmount))
    )
  }, [txs, expectedAmount])

  return (
    <Modal open={open} onClose={close} title={title} size="lg">
      {!manualOpen && (
        <>
          <div className="btx-header">
            <div className="muted small">
              Mostrando transacciones <strong>UNMATCHED</strong> de la cuenta
              {bankAccountId ? ' seleccionada.' : ' de esta empresa.'}{' '}
              {expectedAmount && (
                <>Esperado: <strong>{fmtMoney(expectedAmount)}</strong>.</>
              )}
            </div>
            <div className="btx-filters">
              {expectedAmount && (
                <button
                  type="button"
                  className={filter === 'NEAR' ? 'active' : ''}
                  onClick={() => setFilter('NEAR')}
                >
                  Monto cercano
                </button>
              )}
              <button
                type="button"
                className={filter === 'ALL' ? 'active' : ''}
                onClick={() => setFilter('ALL')}
              >
                Todos
              </button>
            </div>
          </div>

          {loading ? (
            <div className="muted" style={{ padding: '2rem', textAlign: 'center' }}>Cargando…</div>
          ) : sorted.length === 0 ? (
            <div className="muted" style={{ padding: '2rem', textAlign: 'center' }}>
              No hay movimientos UNMATCHED{expectedAmount ? ' cerca del monto esperado.' : '.'}
              <div style={{ marginTop: '0.5rem' }}>
                <button type="button" className="link" onClick={() => setManualOpen(true)}>
                  Registrar manualmente →
                </button>
              </div>
            </div>
          ) : (
            <table className="btx-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th>Cuenta</th>
                  <th>Ref.</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((t) => {
                  const match =
                    Math.abs(Math.abs(t.monto) - Math.abs(expectedAmount ?? 0)) < 0.5
                  return (
                    <tr key={t.id} className={match ? 'exact' : ''}>
                      <td className="small muted">{fmtDate(t.fecha)}</td>
                      <td className="small">{t.descripcion?.slice(0, 60)}</td>
                      <td className="small muted">
                        {t.bankAccount?.banco} {t.bankAccount?.nombre}
                        {t.bankAccount?.tipo === 'TARJETA_DEPARTAMENTAL' && t.bankAccount?.titular && (
                          <div className="small">TD {t.bankAccount.titular}</div>
                        )}
                      </td>
                      <td className="mono small">{t.referencia ?? '—'}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        <strong>{fmtMoney(t.monto)}</strong>
                      </td>
                      <td>
                        <button type="button" className="primary small" onClick={() => onPick?.(t)}>
                          elegir
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          <div className="modal-actions">
            <button type="button" onClick={() => setManualOpen(true)}>
              Crear movimiento manual
            </button>
            <button type="button" onClick={close}>
              Cancelar
            </button>
          </div>
        </>
      )}

      {manualOpen && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onPick?.({ newTx: true, fecha: manualFecha, referencia: manualRef.trim() || null })
          }}
        >
          <div className="manual-form">
            <p className="small muted">
              Usa esto cuando pagaste en efectivo o el banco aún no importó la transferencia.
              Se creará una transacción nueva al procesar el pago.
            </p>
            <label>
              <span>Fecha del pago</span>
              <input
                type="date"
                value={manualFecha}
                onChange={(e) => setManualFecha(e.target.value)}
                required
              />
            </label>
            <label>
              <span>Referencia SPEI / concepto (opcional)</span>
              <input
                value={manualRef}
                onChange={(e) => setManualRef(e.target.value)}
                placeholder="Ref Santander, cheque #…"
              />
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={() => setManualOpen(false)}>
              ← Elegir de lista
            </button>
            <button type="submit" className="primary">
              Pagar con movimiento nuevo
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
