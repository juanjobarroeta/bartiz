/**
 * RequisicionDetalle — multi-vendor matrix UI.
 *
 * Header: folio, proyecto, estado, total, supplier ganador.
 * Matrix: rows = partidas, cols = cotizaciones (1 col per vendor).
 *   Each cell shows precio + importe per line for that vendor.
 *   Row footer highlights the best price + the difference vs the
 *   selected cotización.
 * Tools:
 *   • "+ Nueva cotización" modal — vendor name + per-line PUs.
 *   • Per-cotización "Elegir como ganadora" button → atomic seleccionar.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../config/api'
import Modal from '../components/Modal'
import FileUpload from '../components/FileUpload'
import SupplierPicker from '../components/SupplierPicker'
import { readTerms } from './ProveedoresBartiz'
import { confirmDialog, alertDialog } from '../components/Dialog'
import { useAuth } from '../auth/AuthContext'
import '../components/Modal.css'
import '../components/FileUpload.css'
import '../components/SupplierPicker.css'
import './Requisiciones.css'

const fmtMoney = (n) =>
  n == null ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(Number(n) || 0)
const DAY = 86400000
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const addDays = (d, n) => new Date(d.getTime() + n * DAY)
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

export default function RequisicionDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [newCotOpen, setNewCotOpen] = useState(false)
  // Per-concept award: { [partidaId]: cotizacionId }. Lets the buyer split one
  // requisición across suppliers — concept A to vendor X, concept B to vendor Y.
  const [awards, setAwards] = useState({})
  const [awardLocalOnly, setAwardLocalOnly] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/construccion/solicitudes-compra/${id}`)
      setData(res)
    } catch (err) {
      alertDialog({ message: err.message || 'Error al cargar' })
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { reload() }, [reload])

  // Per partida, find the cheapest cotización + the selected one
  const matrix = useMemo(() => {
    if (!data) return null
    const cots = data.cotizaciones ?? []
    return data.partidas.map((p) => {
      const lines = cots.map((c) => {
        const ln = c.partidas.find((cp) => cp.solicitudPartidaId === p.id)
        return { cotizacionId: c.id, line: ln, supplierNombre: c.supplierNombre, isSelected: c.isSelected }
      })
      const priced = lines.filter((l) => l.line)
      const cheapest =
        priced.length > 0
          ? priced.reduce((a, b) => (b.line.precioUnitario < a.line.precioUnitario ? b : a))
          : null
      return { partida: p, lines, cheapest }
    })
  }, [data])

  // Seed awards from the backend (partida.cotizacionGanadoraId) when present;
  // otherwise default to the whole-requisición winner so existing data keeps
  // showing a sensible adjudicación the buyer can then refine per concept.
  useEffect(() => {
    if (!data) return
    const cots = data.cotizaciones ?? []
    const selected = cots.find((c) => c.isSelected)
    const init = {}
    for (const p of data.partidas) {
      if (p.cotizacionGanadoraId) {
        init[p.id] = p.cotizacionGanadoraId
      } else if (selected?.partidas?.some((cp) => cp.solicitudPartidaId === p.id)) {
        init[p.id] = selected.id
      }
    }
    setAwards(init)
    setAwardLocalOnly(false)
  }, [data])

  // Persist the full award map. Optimistic: if the endpoint isn't live yet we
  // keep the local selection so the screen stays usable (same pattern as
  // Facturas). The backend contract lives in BACKEND-SPLIT-AWARD.md.
  const persistAwards = useCallback(async (map) => {
    try {
      await apiFetch(`/api/construccion/solicitudes-compra/${id}/adjudicaciones`, {
        method: 'PUT',
        body: { adjudicaciones: map },
      })
      setAwardLocalOnly(false)
    } catch {
      setAwardLocalOnly(true)
    }
  }, [id])

  // Edit locking (#4): a PAGADA/cerrada requisición is read-only; an APROBADA
  // one already generated cuentas por pagar, so changing an award warns first.
  const estado = data?.estado
  const locked = estado === 'PAGADA' || estado === 'RECHAZADA' || estado === 'CANCELADA'
  const approved = estado === 'APROBADA'
  const guardMutation = async () => {
    if (locked) {
      alertDialog({ message: `Esta requisición está ${String(estado).toLowerCase()}; ya no se puede modificar.` })
      return false
    }
    if (approved) {
      return confirmDialog({
        title: 'Requisición ya autorizada',
        message: 'Esta requisición ya fue autorizada y generó cuentas por pagar. Cambiar la adjudicación de un proveedor ya aprobado puede desincronizarlas. ¿Cambiar de todos modos?',
        okLabel: 'Cambiar de todos modos',
      })
    }
    return true
  }

  const award = async (partidaId, cotizacionId) => {
    if (!(await guardMutation())) return
    const next = { ...awards }
    if (next[partidaId] === cotizacionId) delete next[partidaId]
    else next[partidaId] = cotizacionId
    setAwards(next)
    persistAwards(next)
  }

  const awardCheapestAll = async () => {
    if (!(await guardMutation())) return
    const next = {}
    for (const row of matrix ?? []) if (row.cheapest) next[row.partida.id] = row.cheapest.cotizacionId
    setAwards(next)
    persistAwards(next)
  }

  const clearAwards = async () => { if (!(await guardMutation())) return; setAwards({}); persistAwards({}) }

  // Group the awarded concepts by supplier for the summary: one purchase order
  // per supplier, plus the combined cost of the split award.
  const adjudicacion = useMemo(() => {
    if (!data) return null
    const cots = data.cotizaciones ?? []
    const groups = new Map()
    let total = 0
    let assigned = 0
    for (const p of data.partidas) {
      const cotId = awards[p.id]
      if (!cotId) continue
      const c = cots.find((x) => x.id === cotId)
      const ln = c?.partidas?.find((cp) => cp.solicitudPartidaId === p.id)
      if (!c || !ln) continue
      const importe = ln.importe ?? (Number(ln.precioUnitario) || 0) * (Number(p.cantidad) || 0)
      assigned += 1
      total += importe
      if (!groups.has(cotId)) groups.set(cotId, { cotizacion: c, concepts: [], subtotal: 0 })
      const g = groups.get(cotId)
      g.concepts.push({ partida: p, line: ln, importe })
      g.subtotal += importe
    }
    return { groups: [...groups.values()], total, assigned, totalConcepts: data.partidas.length }
  }, [data, awards])

  const selectCot = async (cotId) => {
    if (locked) { alertDialog({ message: `Esta requisición está ${String(estado).toLowerCase()}; ya no se puede modificar.` }); return }
    if (!(await confirmDialog({ title: 'Elegir cotización ganadora', message: 'Se actualizarán precios y proveedor en la requisición. ¿Continuar?', okLabel: 'Sí, elegir' }))) return
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/solicitudes-compra/${id}/cotizaciones/${cotId}/seleccionar`, { method: 'POST' })
      await reload()
    } catch (err) {
      alertDialog({ message: err.message || 'Error' })
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="pd-empty">Cargando…</div>
  if (!data) return <div className="pd-empty">No encontrado.</div>

  return (
    <div className="req-detalle">
      <button className="pd-back" onClick={() => navigate('/requisiciones')}>← Requisiciones</button>

      <header className="req-head">
        <div>
          <div className="muted small">
            OBRA: {data.proyecto?.codigo ?? 'Sin proyecto'}
            {data.proyecto?.nombre && <> · {data.proyecto.nombre}</>}
          </div>
          <h1>Solicitud N° {data.folio}</h1>
          <div className="req-meta">
            <span className={`badge estado-${data.estado.toLowerCase()}`}>{data.estado}</span>
            <span className="muted small">
              Solicitada: {data.createdAt ? new Date(data.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
            </span>
            <span className="muted small">
              Entrega:{' '}
              {data.fechaEntrega ? (
                new Date(data.fechaEntrega).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
              ) : (
                <span className="muted">— sin definir —</span>
              )}
            </span>
            {data.supplier && (
              <span className="muted small">
                Ganador: <strong>{data.supplier.razonSocial}</strong>
              </span>
            )}
          </div>
        </div>
        <div className="req-totals">
          <div className="row">
            <span>Total actual</span>
            <strong>{fmtMoney(data.total)}</strong>
          </div>
          <div className="row">
            <span>Cotizaciones</span>
            <strong>{(data.cotizaciones ?? []).length}</strong>
          </div>
        </div>
      </header>

      {locked && (
        <div className="req-locked-banner">
          🔒 Esta requisición está {String(estado).toLowerCase()} y es de solo lectura. No se pueden cambiar cotizaciones ni adjudicaciones.
        </div>
      )}
      {approved && (
        <div className="req-approved-banner">
          Esta requisición ya fue autorizada. Cambiar adjudicaciones pedirá confirmación (ya generaron cuentas por pagar).
        </div>
      )}

      {!locked && (
        <div className="req-actions">
          <button className="secondary" onClick={() => setNewCotOpen(true)}>+ Agregar cotización</button>
        </div>
      )}

      {/* Pagos por proveedor (adjudicaciones) — el modelo por proveedor reemplaza
          el pago único cuando la requisición ya fue adjudicada. */}
      {(data.adjudicaciones ?? []).length > 0 ? (
        <AdjudicacionesPanel data={data} onGoPagar={() => navigate('/cuentas-por-pagar')} />
      ) : (
        <BankLinkPanel data={data} reload={reload} />
      )}


      <Modal open={newCotOpen} onClose={() => setNewCotOpen(false)} title="Nueva cotización" size="lg">
        <NewCotizacionForm
          requisicion={data}
          onClose={() => setNewCotOpen(false)}
          onCreated={() => { setNewCotOpen(false); reload() }}
        />
      </Modal>

      {/* Requested concepts — always visible, even before any quote lands so
          the buyer can see what was requested. */}
      <div className="req-conceptos">
        <h3>Conceptos solicitados</h3>
        {(data.partidas ?? []).length === 0 ? (
          <div className="muted small">Esta requisición no tiene conceptos.</div>
        ) : (
          <table className="reqs-table compact">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Unidad</th>
                <th style={{ textAlign: 'right' }}>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {data.partidas.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.descripcion}
                    {p.insumo && <span className="muted small"> · <span className="mono">{p.insumo.codigo}</span></span>}
                  </td>
                  <td className="small mono">{p.unidad ?? '—'}</td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{p.cantidad}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Matrix */}
      {(data.cotizaciones ?? []).length === 0 ? (
        <div className="pd-empty">
          Aún no hay cotizaciones. Agrega la primera con "Agregar cotización" para comparar proveedores y adjudicar por concepto.
        </div>
      ) : (
        <>
        <div className="adjudicacion-bar">
          <div>
            <strong>Adjudicación por concepto</strong>
            <div className="muted small">
              Haz clic en una celda de precio para adjudicar ese concepto a ese proveedor.
              Puedes repartir la requisición entre varios proveedores.
              {awardLocalOnly && (
                <span className="adj-local"> · guardado localmente (pendiente del backend)</span>
              )}
            </div>
          </div>
          {!locked && (
            <div className="aq-actions">
              <button type="button" className="link small" onClick={awardCheapestAll}>
                Adjudicar lo más barato
              </button>
              {adjudicacion?.assigned > 0 && (
                <button type="button" className="link small danger" onClick={clearAwards}>
                  Limpiar
                </button>
              )}
            </div>
          )}
        </div>
        <div className="matrix-scroll">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Unidad</th>
                <th style={{ textAlign: 'right' }}>Cant.</th>
                {data.cotizaciones.map((c) => (
                  <th key={c.id} className={c.isSelected ? 'cot-selected' : ''}>
                    <div className="cot-head">
                      <strong>{c.supplierNombre}</strong>
                      <button
                        type="button"
                        className={c.isSelected ? 'link small selected' : 'link small'}
                        onClick={() => !c.isSelected && selectCot(c.id)}
                        disabled={busy || c.isSelected}
                      >
                        {c.isSelected ? '✓ ganadora' : 'elegir'}
                      </button>
                    </div>
                    <div className="muted small">
                      <span className={c.tieneCredito ? 'cot-credit has' : 'cot-credit cash'}>
                        {c.tieneCredito ? 'Crédito' : 'Contado'}
                      </span>
                      {c.diasEntrega != null && ` · ${c.diasEntrega} d entrega`}
                      {' · '}Total {fmtMoney(c.total)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map(({ partida, lines, cheapest }) => (
                <tr key={partida.id}>
                  <td>
                    <div>{partida.descripcion}</div>
                    {partida.insumo && (
                      <div className="muted small">
                        Insumo: <span className="mono">{partida.insumo.codigo}</span>
                      </div>
                    )}
                  </td>
                  <td className="small mono">{partida.unidad ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>{partida.cantidad}</td>
                  {lines.map(({ cotizacionId, line, isSelected }) => {
                    const isCheapest = cheapest && cheapest.cotizacionId === cotizacionId
                    const isAwarded = awards[partida.id] === cotizacionId
                    return (
                      <td
                        key={cotizacionId}
                        className={`matrix-cell ${isSelected ? 'cot-selected' : ''} ${isCheapest ? 'cheapest' : ''} ${isAwarded ? 'awarded' : ''}`}
                        role={line ? 'button' : undefined}
                        onClick={line ? () => award(partida.id, cotizacionId) : undefined}
                        title={line ? (isAwarded ? 'Adjudicado a este proveedor — clic para quitar' : 'Adjudicar este concepto a este proveedor') : undefined}
                      >
                        {line ? (
                          <>
                            <div className="mono">{fmtMoney(line.precioUnitario)}/u</div>
                            <div className="muted small">= {fmtMoney(line.importe)}</div>
                            {isAwarded && <div className="awarded-tag">✓ adjudicado</div>}
                          </>
                        ) : (
                          <span className="muted small">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {/* Footer totals */}
              <tr className="totals-row">
                <td colSpan={3}><strong>Total cotización</strong></td>
                {data.cotizaciones.map((c) => (
                  <td key={c.id} className={c.isSelected ? 'cot-selected' : ''}>
                    <strong>{fmtMoney(c.total)}</strong>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {adjudicacion?.assigned > 0 && (
          <div className="adjudicacion-summary">
            <h3>Resumen de adjudicación</h3>
            <p className="muted small">
              {adjudicacion.assigned} de {adjudicacion.totalConcepts} conceptos adjudicados ·{' '}
              {adjudicacion.groups.length} proveedor{adjudicacion.groups.length === 1 ? '' : 'es'}
              {adjudicacion.groups.length > 1 && ' (se generaría una orden de compra por proveedor)'}
            </p>
            {adjudicacion.groups.map((g) => (
              <div key={g.cotizacion.id} className="adj-supplier">
                <div className="adj-supplier-head">
                  <span>{g.cotizacion.supplierNombre}</span>
                  <span className="num">{fmtMoney(g.subtotal)}</span>
                </div>
                <ul className="adj-concepts">
                  {g.concepts.map(({ partida, importe }) => (
                    <li key={partida.id}>
                      <span>{partida.descripcion}</span>
                      <span className="num">{fmtMoney(importe)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="adj-total-row">
              <span>Total adjudicado</span>
              <span className="num">{fmtMoney(adjudicacion.total)}</span>
            </div>
            {adjudicacion.assigned < adjudicacion.totalConcepts && (
              <div className="adj-warn">
                Faltan {adjudicacion.totalConcepts - adjudicacion.assigned} concepto(s) por adjudicar.
              </div>
            )}
          </div>
        )}
        </>
      )}
    </div>
  )
}

// ── Pagos por proveedor (adjudicaciones) ────────────────────────────────────
// Once a requisición is authorized it splits into one SolicitudAdjudicacion per
// winning supplier, each paid separately from Tesorería. This panel shows each
// supplier's amount, credit condition, due date (aprobación + días de crédito)
// and whether it's already paid — the per-supplier counterpart to the old
// single-payment BankLinkPanel.
function AdjudicacionesPanel({ data, onGoPagar }) {
  const base = data.aprobadaAt || data.createdAt
  const rows = (data.adjudicaciones ?? []).map((a) => {
    const dias = a.tieneCredito ? (a.diasCredito ?? 0) : 0
    const venc = a.tieneCredito && base ? addDays(startOfDay(new Date(base)), dias) : null
    return { ...a, venc }
  })
  const total = rows.reduce((s, a) => s + (Number(a.total) || 0), 0)
  // PAGADA (por conciliar) y CONCILIADA cuentan como pagadas para el progreso.
  const isPaid = (e) => e === 'PAGADA' || e === 'CONCILIADA'
  const pagadas = rows.filter((a) => isPaid(a.estado))
  const totalPagado = pagadas.reduce((s, a) => s + (Number(a.total) || 0), 0)
  const today = startOfDay(new Date())
  const pendientes = rows.length - pagadas.length

  return (
    <div className="adj-pagos">
      <div className="adj-pagos-head">
        <div>
          <h3>Pagos por proveedor</h3>
          <p className="muted small">
            Cada proveedor adjudicado se paga por separado. Los pagos se registran en Tesorería.
          </p>
        </div>
        <div className="adj-pagos-progress">
          <strong>{pagadas.length}/{rows.length}</strong> pagados
          <div className="muted small">{fmtMoney(totalPagado)} de {fmtMoney(total)}</div>
        </div>
      </div>
      <div className="matrix-scroll">
        <table className="reqs-table compact adj-pagos-table">
          <thead>
            <tr>
              <th>Proveedor</th>
              <th>Condición</th>
              <th>Entrega</th>
              <th>Vence</th>
              <th style={{ textAlign: 'right' }}>Monto</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const overdue = a.estado === 'POR_PAGAR' && a.venc && startOfDay(a.venc) < today
              return (
                <tr key={a.id}>
                  <td><strong>{a.supplierNombre}</strong></td>
                  <td className="small">
                    {a.tieneCredito ? (
                      <span className="cot-credit has">Crédito{a.diasCredito != null ? ` ${a.diasCredito}d` : ''}</span>
                    ) : (
                      <span className="cot-credit cash">Contado</span>
                    )}
                  </td>
                  <td className="small">{a.diasEntrega != null ? `${a.diasEntrega} d` : '—'}</td>
                  <td className="small">
                    {isPaid(a.estado) ? (
                      <span className="muted">—</span>
                    ) : a.venc ? (
                      <span className={overdue ? 'adj-overdue' : ''}>{fmtDate(a.venc)}</span>
                    ) : (
                      <span className="muted">contado</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(a.total)}</td>
                  <td>
                    {a.estado === 'CONCILIADA' ? (
                      <div>
                        <span className="badge estado-pagada">Conciliada</span>
                        {a.bankTransaction && (
                          <div className="muted small">
                            {fmtDate(a.bankTransaction.fecha)}
                            {a.bankTransaction.bankAccount && ` · ${a.bankTransaction.bankAccount.banco ?? ''} ${a.bankTransaction.bankAccount.nombre ?? ''}`}
                          </div>
                        )}
                      </div>
                    ) : a.estado === 'PAGADA' ? (
                      <div>
                        <span className="badge estado-aprobada">Pagada · por conciliar</span>
                        <div className="muted small">
                          {a.pagadaAt ? fmtDate(a.pagadaAt) : ''}
                          {a.referenciaPago ? ` · ref ${a.referenciaPago}` : ''}
                          {a.comprobanteName ? ' · comprobante' : ''}
                        </div>
                      </div>
                    ) : (
                      <span className="badge estado-pendiente">Por pagar</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {pendientes > 0 && (
        <div className="adj-pagos-foot">
          <span className="muted small">{pendientes} proveedor{pendientes === 1 ? '' : 'es'} por pagar</span>
          <button type="button" className="link small" onClick={onGoPagar}>Ir a Cuentas por pagar →</button>
        </div>
      )}
    </div>
  )
}

// ── Bank-link panel ─────────────────────────────────────────────────────────
// Two states:
//   1. Already paid (has bankTransaction) → show fecha + cuenta + monto.
//   2. APROBADA + no BT yet → "Vincular movimiento" button opens picker
//      with candidates from /bt-candidates (matched by amount + date).
function BankLinkPanel({ data, reload }) {
  const [open, setOpen] = useState(false)

  if (data.bankTransaction) {
    const bt = data.bankTransaction
    return (
      <div className="bank-link-panel paid">
        <div>
          <span className="muted small">Pagada con SPEI</span>
          <div>
            <strong>{fmtMoney(Math.abs(bt.monto))}</strong>
            {' · '}
            <span className="muted small">
              {new Date(bt.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
            {' · '}
            <span className="small">{bt.bankAccount?.banco} {bt.bankAccount?.nombre}</span>
          </div>
          {bt.referencia && <div className="muted small mono">Ref: {bt.referencia}</div>}
        </div>
      </div>
    )
  }

  if (data.estado !== 'APROBADA') return null

  return (
    <>
      <div className="bank-link-panel">
        <div>
          <span className="muted small">
            Esta requisición está aprobada pero aún no tiene un movimiento bancario asignado.
          </span>
        </div>
        <button className="secondary" onClick={() => setOpen(true)}>
          Vincular movimiento bancario
        </button>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Vincular movimiento bancario" size="lg">
        <BankLinkPicker
          solicitudId={data.id}
          onClose={() => setOpen(false)}
          onLinked={() => { setOpen(false); reload() }}
        />
      </Modal>
    </>
  )
}

function BankLinkPicker({ solicitudId, onClose, onLinked }) {
  const [loading, setLoading] = useState(true)
  const [candidates, setCandidates] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    apiFetch(`/api/construccion/solicitudes-compra/${solicitudId}/bt-candidates`)
      .then((r) => { if (alive) setCandidates(r.candidates ?? []) })
      .catch((err) => alertDialog({ message: err.message || 'Error al cargar candidatos' }))
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [solicitudId])

  const link = async (btId) => {
    if (!(await confirmDialog({
      title: 'Vincular movimiento',
      message: 'Esto marcará la requisición como PAGADA y conciliará el movimiento. ¿Continuar?',
      okLabel: 'Sí, vincular',
    }))) return
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/solicitudes-compra/${solicitudId}/vincular-bt`, {
        method: 'POST',
        body: { bankTransactionId: btId },
      })
      onLinked?.()
    } catch (err) {
      alertDialog({ message: err.message || 'Error al vincular' })
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="pd-empty">Cargando candidatos…</div>
  if (candidates.length === 0) {
    return (
      <div>
        <div className="pd-empty">
          No se encontraron movimientos bancarios sin conciliar que coincidan en
          monto (±15%) y fecha (±10 días). Sube el estado de cuenta o usa
          "Pagar" para generar el movimiento.
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>Cerrar</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="muted small">
        Movimientos bancarios candidatos según monto y fecha. Selecciona el SPEI
        que pagó esta requisición.
      </p>
      <table className="prov-table compact">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Cuenta</th>
            <th>Descripción</th>
            <th style={{ textAlign: 'right' }}>Monto</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => (
            <tr key={c.id}>
              <td className="small muted">
                {new Date(c.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
              </td>
              <td className="small">{c.bankAccount?.banco} {c.bankAccount?.nombre}</td>
              <td className="small">
                {c.descripcion?.slice(0, 80)}
                {c.referencia && <div className="muted small mono">Ref: {c.referencia}</div>}
              </td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--neg)' }}>
                {fmtMoney(c.monto)}
              </td>
              <td>
                <button className="link small" disabled={busy} onClick={() => link(c.id)}>
                  Vincular
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="modal-actions">
        <button onClick={onClose}>Cancelar</button>
      </div>
    </div>
  )
}

// ── New cotización form ─────────────────────────────────────────────────────
function NewCotizacionForm({ requisicion, onClose, onCreated }) {
  const { activeCompany } = useAuth()
  // Supplier flow has two modes: picked from catalog (preferred — gets a
  // real Supplier row + RFC + history aggregation) OR a quick free-text
  // fallback when the proveedor is one-off and not worth promoting.
  const [supplier, setSupplier] = useState(null)
  const [freeTextName, setFreeTextName] = useState('')
  const [useFreeText, setUseFreeText] = useState(false)
  // Forma de pago de la oferta: precargada de las condiciones del proveedor.
  const [credito, setCredito] = useState(false)
  const pickSupplier = (s) => {
    setSupplier(s)
    if (s) {
      const t = readTerms(s)
      setCredito(t.tieneCredito === true || t.diasCredito > 0)
    }
  }
  const [fechaCotizacion, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [vigenciaHasta, setVigencia] = useState('')
  const [diasEntrega, setDiasEntrega] = useState('')
  const [notas, setNotas] = useState('')
  const [archivo, setArchivo] = useState(null)
  // Per-line PUs keyed by partidaId
  const [pus, setPus] = useState(() => {
    const o = {}
    for (const p of requisicion.partidas) o[p.id] = ''
    return o
  })
  const [busy, setBusy] = useState(false)

  const totalPreview = useMemo(() => {
    return requisicion.partidas.reduce((sum, p) => {
      const pu = parseFloat(pus[p.id]) || 0
      return sum + pu * p.cantidad
    }, 0)
  }, [pus, requisicion.partidas])

  const submit = async (e) => {
    e.preventDefault()
    const finalSupplierNombre = useFreeText
      ? freeTextName.trim()
      : supplier?.razonSocial?.trim() ?? ''
    if (!finalSupplierNombre) { alertDialog({ message: 'Elige un proveedor del catálogo o escribe un nombre.' }); return }
    const lineas = requisicion.partidas
      .filter((p) => parseFloat(pus[p.id]) >= 0)
      .map((p) => ({
        solicitudPartidaId: p.id,
        precioUnitario: parseFloat(pus[p.id]) || 0,
      }))
      .filter((l) => l.precioUnitario > 0)
    if (lineas.length === 0) {
      alertDialog({ message: 'Captura al menos un precio.' }); return
    }
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/solicitudes-compra/${requisicion.id}/cotizaciones`, {
        method: 'POST',
        body: {
          // Send both: id when we have a Supplier row, plus the
          // razonSocial as a fallback / display text. Backend stores
          // both columns.
          supplierId: useFreeText ? null : supplier?.id ?? null,
          supplierNombre: finalSupplierNombre,
          tieneCredito: credito,
          diasEntrega: diasEntrega !== '' ? parseInt(diasEntrega, 10) : null,
          fechaCotizacion: new Date(fechaCotizacion + 'T12:00:00').toISOString(),
          vigenciaHasta: vigenciaHasta ? new Date(vigenciaHasta + 'T12:00:00').toISOString() : null,
          notas: notas.trim() || null,
          archivoData: archivo?.data ?? null,
          archivoMime: archivo?.mime ?? null,
          archivoName: archivo?.name ?? null,
          lineas,
        },
      })
      onCreated?.()
    } catch (err) {
      alertDialog({ message: err.message || 'Error al guardar cotización' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="req-form">
      <label className="stack">
        <span>Proveedor</span>
        {useFreeText ? (
          <div className="row" style={{ alignItems: 'center', gap: '0.4rem' }}>
            <input
              value={freeTextName}
              onChange={(e) => setFreeTextName(e.target.value)}
              placeholder="Nombre libre (no se guarda al catálogo)"
              style={{ flex: 1, padding: '9px 11px', border: '1px solid var(--line-2)', borderRadius: 'var(--r-sm)', fontSize: '0.9rem', fontFamily: 'var(--font-ui)' }}
            />
            <button type="button" className="link small" onClick={() => { setUseFreeText(false); setFreeTextName('') }}>
              elegir del catálogo
            </button>
          </div>
        ) : (
          <>
            <SupplierPicker
              value={supplier}
              onChange={pickSupplier}
              companyId={activeCompany?.id}
              placeholder="Buscar proveedor por nombre o RFC…"
            />
            {!supplier && (
              <button
                type="button"
                className="link small"
                style={{ alignSelf: 'flex-start', marginTop: 4 }}
                onClick={() => setUseFreeText(true)}
              >
                ¿Cotización de un solo uso? Usar nombre libre →
              </button>
            )}
          </>
        )}
      </label>

      <div className="ofs-terms" style={{ alignSelf: 'flex-start' }}>
        <label className="ofs-credito" title="Precargado de las condiciones del proveedor; ajustable">
          <input type="checkbox" checked={credito} onChange={(e) => setCredito(e.target.checked)} />
          <span>{credito ? 'A crédito' : 'Contado'}</span>
        </label>
        <label className="ofs-entrega" title="Días de entrega prometidos por este proveedor">
          <input type="number" min="0" step="1" value={diasEntrega} onChange={(e) => setDiasEntrega(e.target.value)} placeholder="—" />
          <span>días entrega</span>
        </label>
      </div>

      <div className="row">
        <label>
          <span>Fecha</span>
          <input type="date" value={fechaCotizacion} onChange={(e) => setFecha(e.target.value)} required />
        </label>
        <label>
          <span>Vigencia</span>
          <input type="date" value={vigenciaHasta} onChange={(e) => setVigencia(e.target.value)} />
        </label>
      </div>

      <div className="lines">
        <div className="lines-head">
          <span>Concepto</span>
          <span style={{ width: 70 }}>Unidad</span>
          <span style={{ width: 80 }}>Cantidad</span>
          <span style={{ width: 100 }}>P. Unitario</span>
          <span style={{ width: 100, textAlign: 'right' }}>Importe</span>
        </div>
        {requisicion.partidas.map((p) => {
          const pu = parseFloat(pus[p.id]) || 0
          return (
            <div key={p.id} className="line-row">
              <span>{p.descripcion}</span>
              <span className="mono small" style={{ width: 70 }}>{p.unidad ?? '—'}</span>
              <span style={{ width: 80 }}>{p.cantidad}</span>
              <input
                type="number"
                step="0.01"
                value={pus[p.id]}
                onChange={(e) => setPus((o) => ({ ...o, [p.id]: e.target.value }))}
                placeholder="0.00"
                style={{ width: 100 }}
              />
              <span style={{ width: 100, textAlign: 'right' }}>{fmtMoney(pu * p.cantidad)}</span>
            </div>
          )
        })}
        <div className="line-row">
          <strong style={{ flex: 1, textAlign: 'right', paddingRight: '0.5rem' }}>Total cotización</strong>
          <strong style={{ width: 100, textAlign: 'right' }}>{fmtMoney(totalPreview)}</strong>
        </div>
      </div>

      <label className="stack">
        <span>Cotización (PDF / foto, opcional)</span>
        <FileUpload value={archivo} onChange={setArchivo} />
      </label>

      <label className="stack">
        <span>Notas (opcional)</span>
        <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="entrega, condiciones de pago…" />
      </label>

      <div className="modal-actions">
        <button type="button" onClick={onClose}>Cancelar</button>
        <button type="submit" className="primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cotización'}</button>
      </div>
    </form>
  )
}
