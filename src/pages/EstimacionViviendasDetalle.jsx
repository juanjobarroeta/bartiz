/**
 * EstimacionViviendasDetalle — sheet 2 RESUMEN equivalent.
 *
 * Grid de capítulos × períodos. Gerardo edita SOLO la columna
 * "Viviendas avance período". El resto se calcula:
 *   viviendasAcumulado = viviendasAnterior + viviendasPeriodo (cap a objetivo)
 *   pctPeriodo         = viviendasPeriodo / viviendasObjetivo
 *   importePeriodo     = pctPeriodo × importeContrato
 *   pctAcumulado       = viviendasAcumulado / viviendasObjetivo
 *
 * Footer suma:
 *   subtotal periodo, IVA (si aplicaIva), total, pct acumulado
 *
 * Acciones:
 *   • Guardar borrador → PATCH viviendas
 *   • Aprobar → POST /aprobar (lock)
 *   • Vincular CFDI → modal con candidatos
 *   • Vincular pago → modal con candidatos UNMATCHED
 *   • Eliminar (solo BORRADOR)
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../config/api'
import Modal from '../components/Modal'
import { alertDialog, confirmDialog } from '../components/Dialog'
import '../components/Modal.css'
import './EstimacionViviendasDetalle.css'

const fmtMoney = (n) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(Number(n) || 0)

const fmtPct = (n) => (n == null ? '—' : `${((Number(n) || 0) * 100).toFixed(2)}%`)

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const ESTADO_LABEL = {
  BORRADOR: 'Borrador',
  APROBADA: 'Aprobada',
  TIMBRADA: 'Timbrada',
  PAGADA: 'Pagada',
  CANCELADA: 'Cancelada',
}

export default function EstimacionViviendasDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [edited, setEdited] = useState({}) // { partidaId: viviendasAvancePeriodo }
  const [busy, setBusy] = useState(false)
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false)
  const [btModalOpen, setBtModalOpen] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const r = await apiFetch(`/api/construccion/estimaciones/${id}`)
      setData(r)
      setEdited({})
    } catch (err) {
      alertDialog({ message: err.message || 'Error al cargar' })
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { reload() }, [reload])

  const isEditable = data?.estado === 'BORRADOR'

  // Compute live previews from edited values + persisted state
  const partidasView = useMemo(() => {
    if (!data) return []
    return (data.partidas ?? []).map((p) => {
      const obj = p.viviendasObjetivo ?? 1
      const anterior = p.viviendasAvanceAnterior ?? 0
      const editedVal = edited[p.id]
      const periodoVal = editedVal !== undefined ? editedVal : (p.viviendasAvancePeriodo ?? 0)
      const acumulado = Math.min(anterior + periodoVal, obj)
      const cappedPeriodo = acumulado - anterior
      const pctPer = obj > 0 ? cappedPeriodo / obj : 0
      const pctAcum = obj > 0 ? acumulado / obj : 0
      const importeContrato = p.importeContrato ?? 0
      const importePer = importeContrato * pctPer
      const importeAcum = importeContrato * pctAcum
      return {
        ...p,
        _periodoVal: periodoVal,
        _cappedPeriodo: cappedPeriodo,
        _acumulado: acumulado,
        _pctPer: pctPer,
        _pctAcum: pctAcum,
        _importePer: importePer,
        _importeAcum: importeAcum,
      }
    })
  }, [data, edited])

  const totals = useMemo(() => {
    let subtotal = 0, importeContrato = 0, importeAcum = 0
    for (const p of partidasView) {
      subtotal += p._importePer
      importeContrato += p.importeContrato ?? 0
      importeAcum += p._importeAcum
    }
    const aplicaIva = data?.proyecto?.aplicaIva ?? false
    const iva = aplicaIva ? subtotal * 0.16 : 0
    return {
      subtotal,
      importeContrato,
      importeAcum,
      iva,
      total: subtotal + iva,
      pctPeriodo: importeContrato > 0 ? subtotal / importeContrato : 0,
      pctAcum: importeContrato > 0 ? importeAcum / importeContrato : 0,
    }
  }, [partidasView, data])

  const setVal = (partidaId, value) => {
    const num = parseInt(value, 10)
    setEdited((prev) => ({ ...prev, [partidaId]: Number.isFinite(num) ? num : 0 }))
  }

  const guardar = async () => {
    const partidas = Object.entries(edited).map(([id, v]) => ({ id, viviendasAvancePeriodo: v }))
    if (partidas.length === 0) {
      alertDialog({ message: 'Sin cambios.' })
      return
    }
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/estimaciones/${id}`, {
        method: 'PATCH',
        body: { partidas },
      })
      await reload()
    } catch (err) {
      alertDialog({ message: err.message || 'Error al guardar' })
    } finally {
      setBusy(false)
    }
  }

  const aprobar = async () => {
    if (Object.keys(edited).length > 0) {
      alertDialog({ message: 'Guarda los cambios pendientes antes de aprobar.' })
      return
    }
    const ok = await confirmDialog({
      title: 'Aprobar estimación',
      message: `Se congelará la estimación con un total de ${fmtMoney(data.total)}. Después podrás vincular el CFDI y el pago. ¿Continuar?`,
      okLabel: 'Sí, aprobar',
    })
    if (!ok) return
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/estimaciones/${id}/aprobar`, { method: 'POST' })
      await reload()
    } catch (err) {
      alertDialog({ message: err.message || 'Error al aprobar' })
    } finally {
      setBusy(false)
    }
  }

  const eliminar = async () => {
    const ok = await confirmDialog({
      title: 'Eliminar estimación',
      message: 'Se eliminará permanentemente. ¿Continuar?',
      okLabel: 'Sí, eliminar',
    })
    if (!ok) return
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/estimaciones/${id}`, { method: 'DELETE' })
      navigate(`/proyectos/${data.proyectoId}`)
    } catch (err) {
      alertDialog({ message: err.message || 'Error al eliminar' })
      setBusy(false)
    }
  }

  if (loading) return <div className="ev-empty">Cargando…</div>
  if (!data) return <div className="ev-empty">No encontrada.</div>

  return (
    <div className="ev-page">
      <button className="ev-back" onClick={() => navigate(`/proyectos/${data.proyectoId}`)}>
        ← {data.proyecto?.codigo ?? 'Proyecto'}
      </button>

      <header className="ev-head">
        <div>
          <h1>EST. {data.numero}</h1>
          <div className="muted small">
            Período {fmtDate(data.periodoInicio)} → {fmtDate(data.periodoFin)}
            {data.fechaCorte && <> · Corte al {fmtDate(data.fechaCorte)}</>}
          </div>
        </div>
        <div className="ev-status">
          <span className={`badge estado-${data.estado?.toLowerCase()}`}>
            {ESTADO_LABEL[data.estado] ?? data.estado}
          </span>
          <div className="muted small">
            {data.proyecto?.viviendasObjetivo ?? '—'} viviendas objetivo
            {' · '}
            IVA {data.proyecto?.aplicaIva ? 'aplica' : 'no aplica'}
          </div>
        </div>
      </header>

      {/* Grid */}
      <div className="ev-grid-wrap">
        <table className="ev-grid">
          <thead>
            <tr>
              <th rowSpan="2">#</th>
              <th rowSpan="2">Capítulo</th>
              <th rowSpan="2">% contrato</th>
              <th rowSpan="2" style={{ textAlign: 'right' }}>Importe contrato</th>
              <th colSpan="3">Avance anterior</th>
              <th colSpan="3" className="ev-period">Avance período</th>
              <th colSpan="3">Avance acumulado</th>
            </tr>
            <tr>
              <th>Viv</th><th>%</th><th style={{ textAlign: 'right' }}>$</th>
              <th>Viv</th><th>%</th><th style={{ textAlign: 'right' }}>$</th>
              <th>Viv</th><th>%</th><th style={{ textAlign: 'right' }}>$</th>
            </tr>
          </thead>
          <tbody>
            {partidasView.map((p, idx) => (
              <tr key={p.id}>
                <td className="muted small">{idx + 1}</td>
                <td>
                  <div>{p.descripcionSnapshot ?? p.template?.descripcion}</div>
                  <div className="muted small mono">cap {p.template?.capituloCode}</div>
                </td>
                <td className="small mono">
                  {totals.importeContrato > 0
                    ? (((p.importeContrato ?? 0) / totals.importeContrato) * 100).toFixed(2) + '%'
                    : '—'}
                </td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtMoney(p.importeContrato)}
                </td>
                {/* Anterior */}
                <td>{p.viviendasAvanceAnterior ?? 0}</td>
                <td className="small mono">
                  {fmtPct((p.viviendasAvanceAnterior ?? 0) / Math.max(p.viviendasObjetivo ?? 1, 1))}
                </td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtMoney(((p.viviendasAvanceAnterior ?? 0) / Math.max(p.viviendasObjetivo ?? 1, 1)) * (p.importeContrato ?? 0))}
                </td>
                {/* Período (editable) */}
                <td className="ev-period">
                  {isEditable ? (
                    <input
                      type="number"
                      min="0"
                      max={p.viviendasObjetivo}
                      value={p._periodoVal}
                      onChange={(e) => setVal(p.id, e.target.value)}
                    />
                  ) : (
                    <span>{p.viviendasAvancePeriodo ?? 0}</span>
                  )}
                </td>
                <td className="small mono">{fmtPct(p._pctPer)}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtMoney(p._importePer)}
                </td>
                {/* Acumulado */}
                <td>{p._acumulado}</td>
                <td className="small mono">{fmtPct(p._pctAcum)}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtMoney(p._importeAcum)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="3"><strong>Total</strong></td>
              <td style={{ textAlign: 'right' }}><strong>{fmtMoney(totals.importeContrato)}</strong></td>
              <td colSpan="3"></td>
              <td colSpan="2"><strong>{fmtPct(totals.pctPeriodo)}</strong></td>
              <td style={{ textAlign: 'right' }}><strong>{fmtMoney(totals.subtotal)}</strong></td>
              <td colSpan="2"><strong>{fmtPct(totals.pctAcum)}</strong></td>
              <td style={{ textAlign: 'right' }}><strong>{fmtMoney(totals.importeAcum)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Summary block (sheet 1 footer equivalent) */}
      <div className="ev-summary">
        <div>
          <span className="muted small">Subtotal período</span>
          <strong>{fmtMoney(totals.subtotal)}</strong>
        </div>
        {data.proyecto?.aplicaIva && (
          <div>
            <span className="muted small">IVA 16%</span>
            <strong>{fmtMoney(totals.iva)}</strong>
          </div>
        )}
        <div className="ev-summary-total">
          <span className="muted small">Total a facturar</span>
          <strong>{fmtMoney(totals.total)}</strong>
        </div>
        <div>
          <span className="muted small">% del contrato (período)</span>
          <strong>{fmtPct(totals.pctPeriodo)}</strong>
        </div>
        <div>
          <span className="muted small">% acumulado</span>
          <strong>{fmtPct(totals.pctAcum)}</strong>
        </div>
      </div>

      {/* CFDI + Cobranza */}
      <div className="ev-links">
        <div className="ev-link-card">
          <div className="muted small">CFDI</div>
          {data.invoice ? (
            <div>
              <strong className="mono">{data.invoice.serie ?? ''}{data.invoice.folio}</strong>
              <div className="muted small">{fmtDate(data.invoice.fecha)} · {fmtMoney(data.invoice.total)}</div>
              <div className="muted small mono">UUID: {data.invoice.uuid?.slice(0, 8)}…</div>
            </div>
          ) : (
            <button
              className="link"
              disabled={data.estado !== 'APROBADA'}
              onClick={() => setInvoiceModalOpen(true)}
            >
              {data.estado === 'APROBADA' ? '+ Vincular CFDI' : 'Aprueba primero'}
            </button>
          )}
        </div>
        <div className="ev-link-card">
          <div className="muted small">Pago del cliente</div>
          {data.bankTransaction ? (
            <div>
              <strong>{fmtMoney(data.bankTransaction.monto)}</strong>
              <div className="muted small">{fmtDate(data.bankTransaction.fecha)}</div>
              {data.bankTransaction.referencia && <div className="muted small mono">Ref: {data.bankTransaction.referencia}</div>}
            </div>
          ) : (
            <button
              className="link"
              disabled={data.estado !== 'TIMBRADA' && data.estado !== 'APROBADA'}
              onClick={() => setBtModalOpen(true)}
            >
              {(data.estado === 'TIMBRADA' || data.estado === 'APROBADA') ? '+ Vincular pago' : 'Timbra primero'}
            </button>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="ev-actions">
        {isEditable && (
          <>
            <button className="primary" onClick={guardar} disabled={busy || Object.keys(edited).length === 0}>
              {busy ? 'Guardando…' : `Guardar borrador${Object.keys(edited).length > 0 ? ` (${Object.keys(edited).length})` : ''}`}
            </button>
            <button onClick={aprobar} disabled={busy}>
              ✓ Aprobar estimación
            </button>
            <button className="link danger" onClick={eliminar} disabled={busy}>
              Eliminar
            </button>
          </>
        )}
      </div>

      <CandidatosInvoiceModal
        open={invoiceModalOpen}
        onClose={() => setInvoiceModalOpen(false)}
        estimacionId={id}
        onLinked={() => { setInvoiceModalOpen(false); reload() }}
      />
      <CandidatosBtModal
        open={btModalOpen}
        onClose={() => setBtModalOpen(false)}
        estimacionId={id}
        onLinked={() => { setBtModalOpen(false); reload() }}
      />
    </div>
  )
}

// ── CFDI candidates modal
function CandidatosInvoiceModal({ open, onClose, estimacionId, onLinked }) {
  const [loading, setLoading] = useState(true)
  const [candidates, setCandidates] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    let alive = true
    setLoading(true)
    apiFetch(`/api/construccion/estimaciones/${estimacionId}/vincular-invoice`)
      .then((r) => alive && setCandidates(r.candidates ?? []))
      .catch((err) => alertDialog({ message: err.message }))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [open, estimacionId])

  const link = async (invoiceId) => {
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/estimaciones/${estimacionId}/vincular-invoice`, {
        method: 'POST',
        body: { invoiceId },
      })
      onLinked?.()
    } catch (err) {
      alertDialog({ message: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Vincular CFDI" size="lg">
      {loading ? (
        <div className="ev-empty">Cargando candidatos…</div>
      ) : candidates.length === 0 ? (
        <div className="ev-empty">
          No se encontraron CFDIs disponibles. Timbra el CFDI desde
          contabilidad-os primero (mismo cliente, monto similar al total).
        </div>
      ) : (
        <table className="pd-table" style={{ width: '100%' }}>
          <thead>
            <tr><th>Folio</th><th>Cliente</th><th>Fecha</th><th style={{ textAlign: 'right' }}>Total</th><th></th></tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.id}>
                <td className="mono">{c.serie ?? ''}{c.folio}</td>
                <td className="small">{c.customer?.razonSocial}</td>
                <td className="small">{fmtDate(c.fecha)}</td>
                <td style={{ textAlign: 'right' }}>{fmtMoney(c.total)}</td>
                <td><button className="link small" disabled={busy} onClick={() => link(c.id)}>Vincular</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="modal-actions">
        <button onClick={onClose}>Cerrar</button>
      </div>
    </Modal>
  )
}

// ── BankTx candidates modal
function CandidatosBtModal({ open, onClose, estimacionId, onLinked }) {
  const [loading, setLoading] = useState(true)
  const [candidates, setCandidates] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    let alive = true
    setLoading(true)
    apiFetch(`/api/construccion/estimaciones/${estimacionId}/vincular-bt`)
      .then((r) => alive && setCandidates(r.candidates ?? []))
      .catch((err) => alertDialog({ message: err.message }))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [open, estimacionId])

  const link = async (btId) => {
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/estimaciones/${estimacionId}/vincular-bt`, {
        method: 'POST',
        body: { bankTransactionId: btId },
      })
      onLinked?.()
    } catch (err) {
      alertDialog({ message: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Vincular pago del cliente" size="lg">
      {loading ? (
        <div className="ev-empty">Cargando candidatos…</div>
      ) : candidates.length === 0 ? (
        <div className="ev-empty">
          No se encontraron créditos sin conciliar que coincidan en monto y fecha.
          Sube el estado de cuenta o vincula manualmente desde Tesorería.
        </div>
      ) : (
        <table className="pd-table" style={{ width: '100%' }}>
          <thead>
            <tr><th>Fecha</th><th>Cuenta</th><th>Descripción</th><th style={{ textAlign: 'right' }}>Monto</th><th></th></tr>
          </thead>
          <tbody>
            {candidates.map((c) => (
              <tr key={c.id}>
                <td className="small">{fmtDate(c.fecha)}</td>
                <td className="small">{c.bankAccount?.banco} {c.bankAccount?.nombre}</td>
                <td className="small">{c.descripcion?.slice(0, 60)}</td>
                <td style={{ textAlign: 'right', color: '#16a34a' }}>{fmtMoney(c.monto)}</td>
                <td><button className="link small" disabled={busy} onClick={() => link(c.id)}>Vincular</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="modal-actions">
        <button onClick={onClose}>Cerrar</button>
      </div>
    </Modal>
  )
}
