/**
 * Estimaciones — monthly billing + progress tracking.
 *
 * Route: /estimaciones/:proyectoId
 *
 * Shows the list of estimaciones for a proyecto. Click "Nueva estimación"
 * to create one, then mark cantidadEjecutada per partida, then timbrar.
 *
 * The avance editor shows the approved presupuesto's partidas with:
 * - cantidadPresupuestada (from presupuesto)
 * - cantidadAcumuladaAnterior (from prior estimaciones)
 * - cantidadEjecutada (editable — what you did this period)
 * - importe (cantidadEjecutada × PU)
 *
 * Timbrar posts the accounting entries and computes retención + anticipo amortization.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../config/api'
import './Estimaciones.css'

const ESTADO_LABEL = {
  BORRADOR: 'Borrador',
  APROBADA: 'Aprobada',
  TIMBRADA: 'Timbrada',
  PAGADA: 'Pagada',
  CANCELADA: 'Cancelada',
}

const fmtMoney = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(Number(n) || 0)

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

export default function Estimaciones() {
  const { proyectoId } = useParams()
  const navigate = useNavigate()

  const [proyecto, setProyecto] = useState(null)
  const [estimaciones, setEstimaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null) // estimacion id being edited
  // Modales de vinculación (CFDI del cliente / cobro bancario)
  const [linkCfdiFor, setLinkCfdiFor] = useState(null)
  const [linkCobroFor, setLinkCobroFor] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [proy, est] = await Promise.all([
        apiFetch(`/api/construccion/proyectos/${proyectoId}`),
        apiFetch(`/api/construccion/estimaciones?proyectoId=${proyectoId}`),
      ])
      setProyecto(proy)
      setEstimaciones(Array.isArray(est) ? est : [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [proyectoId])

  useEffect(() => { cargar() }, [cargar])

  // Find the approved presupuesto
  const presAprobado = useMemo(
    () => (proyecto?.presupuestos ?? []).find(p => p.estado === 'APROBADO' || p.estado === 'EN_EJECUCION'),
    [proyecto]
  )

  const handleCreate = async ({ periodoInicio, periodoFin }) => {
    if (!presAprobado) {
      window.alert('No hay presupuesto aprobado. Aprueba uno primero.')
      return
    }
    try {
      const est = await apiFetch('/api/construccion/estimaciones/create', {
        method: 'POST',
        body: { proyectoId, presupuestoId: presAprobado.id, periodoInicio, periodoFin },
      })
      setCreating(false)
      setEditing(est.id)
      cargar()
    } catch (err) {
      window.alert(err.message)
    }
  }

  const timbrar = async (estId) => {
    if (!window.confirm('¿Timbrar esta estimación?\n\nEsto registra los asientos contables y no se puede deshacer.')) return
    try {
      const res = await apiFetch(`/api/construccion/estimaciones/${estId}/timbrar`, { method: 'POST' })
      window.alert(
        `✓ Estimación timbrada.\n\nRetención de garantía: ${fmtMoney(res.deductions?.retencionGarantia)}\nAmortización anticipo: ${fmtMoney(res.deductions?.amortizacionAnticipo)}\nNeto a cobrar: ${fmtMoney(res.deductions?.netoACobrar)}`
      )
      setEditing(null)
      cargar()
    } catch (err) {
      window.alert(err.message)
    }
  }

  // Adoptar como cobro un movimiento YA conciliado contra el CFDI de la
  // estimación (el backend lo acepta sólo en ese caso; no re-concilia nada).
  const adoptarCobro = async (estId, bankTransactionId) => {
    try {
      await apiFetch(`/api/construccion/estimaciones/${estId}/vincular-bt`, {
        method: 'POST',
        body: { bankTransactionId },
      })
      cargar()
    } catch (err) {
      window.alert(err.message || 'No se pudo vincular el cobro.')
    }
  }

  if (loading) return <div className="est-page"><div className="est-state">Cargando…</div></div>
  if (error) return <div className="est-page"><div className="est-state est-error">{error}</div></div>

  return (
    <div className="est-page">
      <button className="est-back" onClick={() => navigate(`/proyectos/${proyectoId}`)}>
        ← {proyecto?.codigo} — {proyecto?.nombre}
      </button>

      <header className="est-header">
        <div>
          <h1>Estimaciones</h1>
          <span className="muted">{estimaciones.length} estimación(es) · Presupuesto: {presAprobado?.nombre ?? 'ninguno aprobado'}</span>
        </div>
        {presAprobado && (
          <button className="primary" onClick={() => setCreating(true)}>
            + Nueva estimación
          </button>
        )}
      </header>

      {creating && (
        <CreateEstimacion onCancel={() => setCreating(false)} onCreate={handleCreate} />
      )}

      {estimaciones.length === 0 && !creating && (
        <div className="est-state">
          No hay estimaciones. {presAprobado ? 'Crea la primera.' : 'Aprueba un presupuesto primero.'}
        </div>
      )}

      {linkCfdiFor && (
        <VincularModal
          titulo={`Ligar CFDI a estimación #${linkCfdiFor.numero} (${fmtMoney(linkCfdiFor.total)})`}
          candidatosUrl={`/api/construccion/estimaciones/${linkCfdiFor.id}/vincular-invoice`}
          renderCandidato={(c) => (
            <>
              <strong>{c.serie ?? ''}{c.folio ?? (c.uuid ? c.uuid.slice(0, 8) + '…' : c.id.slice(0, 8))}</strong>
              <div className="muted small">
                {c.customer?.razonSocial ?? ''} · {fmtDate(c.fecha)} · {fmtMoney(c.total)}
              </div>
            </>
          )}
          vacio="No hay CFDIs de INGRESO timbrados que cuadren (cliente de la obra, monto ±5%, fecha ±30 días). Timbra la factura en contabilidad-os primero."
          onPick={(c) => apiFetch(`/api/construccion/estimaciones/${linkCfdiFor.id}/vincular-invoice`, { method: 'POST', body: { invoiceId: c.id } })}
          onDone={() => { setLinkCfdiFor(null); cargar() }}
          onClose={() => setLinkCfdiFor(null)}
        />
      )}
      {linkCobroFor && (
        <VincularModal
          titulo={`Registrar cobro de estimación #${linkCobroFor.numero} (${fmtMoney(linkCobroFor.total)})`}
          candidatosUrl={`/api/construccion/estimaciones/${linkCobroFor.id}/vincular-bt`}
          renderCandidato={(c) => (
            <>
              <strong>{fmtMoney(Math.abs(c.monto))}</strong>
              <div className="muted small">
                {fmtDate(c.fecha)} · {c.bankAccount ? `${c.bankAccount.banco} · ${c.bankAccount.nombre}` : ''}
                {c.referencia ? ` · ref ${c.referencia}` : ''}
              </div>
            </>
          )}
          vacio="No hay depósitos sin conciliar que cuadren (monto ±5%, fecha ±30 días). Importa el estado de cuenta en Bancos, o si el cobro ya se concilió contra el CFDI aparecerá aquí abajo como «cobro conciliado»."
          onPick={(c) => apiFetch(`/api/construccion/estimaciones/${linkCobroFor.id}/vincular-bt`, { method: 'POST', body: { bankTransactionId: c.id } })}
          onDone={() => { setLinkCobroFor(null); cargar() }}
          onClose={() => setLinkCobroFor(null)}
        />
      )}

      {estimaciones.map(est => (
        <div key={est.id} className="est-card">
          <div className="est-card-head">
            <div>
              <strong>Estimación #{est.numero}</strong>
              <span className="muted"> · {fmtDate(est.periodoInicio)} → {fmtDate(est.periodoFin)}</span>
            </div>
            <div className="est-card-right">
              <span className={`badge estado-${est.estado?.toLowerCase()}`}>
                {ESTADO_LABEL[est.estado] ?? est.estado}
              </span>
              <span className="mono">{fmtMoney(est.total)}</span>
            </div>
          </div>

          {editing === est.id ? (
            <AvanceEditor
              estimacion={est}
              presupuesto={presAprobado}
              estimaciones={estimaciones}
              aplicaIva={proyecto?.aplicaIva ?? false}
              onSave={() => { setEditing(null); cargar() }}
              onTimbrar={() => timbrar(est.id)}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <>
            <div className="est-card-actions">
              {est.estado === 'BORRADOR' && (
                <button className="link-action" onClick={() => setEditing(est.id)}>
                  Editar avance
                </button>
              )}
              {(est.estado === 'APROBADA' || est.estado === 'TIMBRADA') && !est.invoice && (
                <button className="link-action" onClick={() => setLinkCfdiFor(est)}>
                  Ligar CFDI…
                </button>
              )}
              {(est.estado === 'TIMBRADA' || est.estado === 'APROBADA') && !est.bankTransaction && (
                <button className="link-action" onClick={() => setLinkCobroFor(est)}>
                  Registrar cobro…
                </button>
              )}
              {est.partidas?.length > 0 && (
                <span className="muted">{est.partidas.length} partida(s) con avance</span>
              )}
              {est.retencionGarantia > 0 && <span className="muted">Retención: {fmtMoney(est.retencionGarantia)}</span>}
              {est.amortizacionAnticipo > 0 && <span className="muted">Amort. anticipo: {fmtMoney(est.amortizacionAnticipo)}</span>}
            </div>
            <div className="est-links">
              {est.invoice && (
                <span className="est-chip" title={est.invoice.uuid ?? ''}>
                  📄 CFDI {est.invoice.serie ?? ''}{est.invoice.folio ?? (est.invoice.uuid ? est.invoice.uuid.slice(0, 8) + '…' : '')}
                  {' · '}{fmtMoney(est.invoice.total)}
                </span>
              )}
              {est.bankTransaction && (
                <span className="est-chip cobro">
                  🏦 Cobro {fmtDate(est.bankTransaction.fecha)} · {fmtMoney(Math.abs(est.bankTransaction.monto))}
                  {est.bankTransaction.bankAccount ? ` · ${est.bankTransaction.bankAccount.banco}` : ''}
                </span>
              )}
              {/* Cobro YA identificado en la conciliación de bancos (del CFDI
                  ligado) que la estimación aún no refleja: se enseña y se
                  adopta con un clic — no se duplica nada, sólo se refleja. */}
              {!est.bankTransaction && (est.cobrosConciliados ?? []).map((c) => (
                <span key={c.id} className="est-chip conciliado">
                  ✓ Cobro conciliado en bancos: {fmtDate(c.fecha)} · {fmtMoney(c.monto)}
                  {c.banco ? ` · ${c.banco}` : ''}
                  <button
                    className="link-action"
                    onClick={() => adoptarCobro(est.id, c.id)}
                    title="Marca la estimación como PAGADA con este movimiento ya conciliado"
                  >
                    usar como cobro
                  </button>
                </span>
              ))}
            </div>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

/**
 * Modal genérico de vinculación de estimaciones: pide los candidatos a
 * `candidatosUrl` (GET → { candidates }), los pinta con `renderCandidato`
 * y al elegir uno ejecuta `onPick` (el POST correspondiente). Mismo patrón
 * que el buscador de CFDIs de caja chica.
 */
function VincularModal({ titulo, candidatosUrl, renderCandidato, vacio, onPick, onDone, onClose }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    apiFetch(candidatosUrl)
      .then(setData)
      .catch((e) => setError(e.message || 'No se pudieron cargar candidatos'))
  }, [candidatosUrl])

  const pick = async (c) => {
    setBusy(true)
    try {
      await onPick(c)
      onDone?.()
    } catch (err) {
      window.alert(err.message || 'No se pudo vincular.')
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-content" style={{ maxWidth: 560 }}>
        <h3>{titulo}</h3>
        {error ? (
          <p className="muted small">{error}</p>
        ) : !data ? (
          <p className="muted small">Buscando candidatos…</p>
        ) : (data.candidates ?? []).length === 0 ? (
          <p className="muted small">{vacio}</p>
        ) : (
          <div className="est-cands">
            {data.candidates.map((c) => (
              <div key={c.id} className="est-cand">
                <div>{renderCandidato(c)}</div>
                <button type="button" disabled={busy} onClick={() => pick(c)}>Vincular</button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button type="button" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

function CreateEstimacion({ onCancel, onCreate }) {
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
  const [inicio, setInicio] = useState(firstOfMonth)
  const [fin, setFin] = useState(lastOfMonth)

  return (
    <div className="est-create">
      <h3>Nueva estimación</h3>
      <div className="est-create-fields">
        <label>Período inicio<input type="date" value={inicio} onChange={e => setInicio(e.target.value)} /></label>
        <label>Período fin<input type="date" value={fin} onChange={e => setFin(e.target.value)} /></label>
      </div>
      <div className="est-create-actions">
        <button onClick={onCancel}>Cancelar</button>
        <button className="primary" onClick={() => onCreate({
          periodoInicio: new Date(inicio).toISOString(),
          periodoFin: new Date(fin).toISOString(),
        })}>Crear y editar avance</button>
      </div>
    </div>
  )
}

function AvanceEditor({ estimacion, presupuesto, estimaciones, aplicaIva, onSave, onTimbrar, onCancel }) {
  const [avance, setAvance] = useState({}) // { presupuestoPartidaId: cantidadEjecutada }
  const [saving, setSaving] = useState(false)

  // Pre-fill from existing partidas on this estimacion
  useEffect(() => {
    const map = {}
    for (const p of estimacion.partidas ?? []) {
      map[p.presupuestoPartidaId] = p.cantidadEjecutada
    }
    setAvance(map)
  }, [estimacion])

  // Compute acumulado anterior per partida from OTHER estimaciones
  const acumuladoAnterior = useMemo(() => {
    const map = {}
    for (const est of estimaciones) {
      if (est.id === estimacion.id) continue
      for (const p of est.partidas ?? []) {
        map[p.presupuestoPartidaId] = (map[p.presupuestoPartidaId] ?? 0) + p.cantidadEjecutada
      }
    }
    return map
  }, [estimaciones, estimacion.id])

  // Only leaves are estimables — rollup branches are grouping nodes with
  // null concepto/cantidad and their importe is a sum of children.
  const partidas = (presupuesto?.partidas ?? []).filter(p => !p.esRollup)

  // Group by zona → partida
  const grouped = useMemo(() => {
    const zonaMap = new Map()
    for (const p of partidas) {
      const z = p.zona ?? 'Sin zona'
      if (!zonaMap.has(z)) zonaMap.set(z, new Map())
      const pMap = zonaMap.get(z)
      const g = p.partida ?? 'Sin partida'
      if (!pMap.has(g)) pMap.set(g, [])
      pMap.get(g).push(p)
    }
    return [...zonaMap.entries()].map(([zona, pMap]) => ({
      zona,
      grupos: [...pMap.entries()].map(([partida, rows]) => ({ partida, rows }))
    }))
  }, [partidas])

  let subtotal = 0
  for (const p of partidas) {
    const qty = Number(avance[p.id]) || 0
    subtotal += qty * p.precioUnitario
  }
  // Preview del IVA gated igual que el backend (vivienda no causa IVA).
  const iva = aplicaIva ? subtotal * 0.16 : 0

  const save = async () => {
    setSaving(true)
    try {
      const entries = Object.entries(avance)
        .filter(([, v]) => Number(v) > 0)
        .map(([presupuestoPartidaId, cantidadEjecutada]) => ({
          presupuestoPartidaId,
          cantidadEjecutada: Number(cantidadEjecutada),
        }))
      await apiFetch(`/api/construccion/estimaciones/${estimacion.id}`, {
        method: 'PATCH',
        body: { partidas: entries },
      })
      onSave()
    } catch (err) {
      window.alert(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="est-avance">
      {grouped.map(({ zona, grupos }) => (
        <div key={zona}>
          <div className="est-zona-label">{zona}</div>
          {grupos.map(({ partida, rows }) => (
            <div key={partida} className="est-grupo">
              <div className="est-grupo-label">{partida}</div>
              <table className="est-avance-table">
                <thead>
                  <tr>
                    <th>Código</th><th>Concepto</th><th>Unidad</th>
                    <th style={{textAlign:'right'}}>Presup.</th>
                    <th style={{textAlign:'right'}}>Acum. ant.</th>
                    <th style={{textAlign:'right', width:100}}>Este período</th>
                    <th style={{textAlign:'right'}}>Importe</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(p => {
                    const qty = Number(avance[p.id]) || 0
                    const prior = acumuladoAnterior[p.id] ?? 0
                    const imp = qty * p.precioUnitario
                    const pctTotal = p.cantidad > 0 ? ((prior + qty) / p.cantidad * 100) : 0
                    return (
                      <tr key={p.id}>
                        <td className="mono">{p.concepto?.codigo}</td>
                        <td className="desc">{p.concepto?.descripcion}</td>
                        <td>{p.concepto?.unidad}</td>
                        <td style={{textAlign:'right'}}>{p.cantidad}</td>
                        <td style={{textAlign:'right'}}>{prior > 0 ? prior.toFixed(2) : '—'}</td>
                        <td style={{textAlign:'right'}}>
                          <input
                            type="number" min="0" step="0.01"
                            value={avance[p.id] ?? ''}
                            onChange={e => setAvance(prev => ({...prev, [p.id]: e.target.value}))}
                            placeholder="0"
                            className="est-qty-input"
                          />
                        </td>
                        <td style={{textAlign:'right'}}>{qty > 0 ? fmtMoney(imp) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ))}

      <div className="est-summary">
        <div className="row"><span>Subtotal este período</span><strong>{fmtMoney(subtotal)}</strong></div>
        {aplicaIva && <div className="row"><span>IVA 16%</span><strong>{fmtMoney(iva)}</strong></div>}
        <div className="row total"><span>Total</span><strong>{fmtMoney(subtotal + iva)}</strong></div>
      </div>

      <div className="est-avance-actions">
        <button onClick={onCancel}>Cancelar</button>
        <button className="secondary" onClick={save} disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar avance'}
        </button>
        <button className="primary-green" onClick={() => { save().then(() => onTimbrar()) }} disabled={saving || subtotal <= 0}>
          Timbrar estimación
        </button>
      </div>
    </div>
  )
}
