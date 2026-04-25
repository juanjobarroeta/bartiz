/**
 * Tesorería — bank accounts + recent movements at a glance.
 *
 * Surface for Juan/Katia to see the cash picture without bouncing to
 * contabilidad-os. Reads from the same BankAccount + BankTransaction
 * tables — both products share state, this is just the bartiz lens.
 *
 * Two-pane layout:
 *   • Left:  list of accounts grouped by tipo (CHEQUES / CAJA / TD).
 *           Each card shows banco, nombre, titular, saldo + flujo 30d.
 *   • Right: movements of the selected account, with status badges
 *           (UNMATCHED / MATCHED / IGNORED). Filter chips for unmatched-
 *           only. Each row links back to its source (Gasto / Reembolso
 *           / Raya / Invoice).
 *
 * Mutations (import CSV, edit account, manual reconciliation) live in
 * contabilidad-os — bartiz shows the read-only view.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../config/api'
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
          Cuentas y movimientos de la empresa. Para importar estados de
          cuenta o conciliar manualmente, ve a <strong>contabilidad-os → Bancos</strong>.
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
