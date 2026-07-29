/**
 * Requisiciones — list of material requests (SolicitudCompra rows)
 * with cotización counts. Gerardo's main surface for tracking which
 * requisiciones are still gathering quotes vs. ready to approve.
 *
 * Each row click → /requisiciones/:id detail with the multi-vendor
 * matrix.
 *
 * Creating a requisición captures supplier offers inline: pick the
 * concepts (from the presupuesto) and add one column per proveedor with
 * their price per concept. "Enviar a autorización" creates the requisición
 * (PENDIENTE) plus one cotización per supplier, ready for Gerardo to
 * adjudicate concept-by-concept. "Guardar borrador" saves it server-side as
 * a BORRADOR — shared across users — so anyone can resume it and finish
 * capturing prices before sending.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../config/api'
import Modal from '../components/Modal'
import SupplierPicker from '../components/SupplierPicker'
import { readTerms } from './ProveedoresBartiz'
import { alertDialog, confirmDialog } from '../components/Dialog'
import '../components/Modal.css'
import '../components/SupplierPicker.css'
import './Requisiciones.css'

const fmtMoney = (n) =>
  n == null ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(n) || 0)
const fmtMoneyDec = (n) =>
  n == null ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(Number(n) || 0)
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

// Displayed total for a requisición row. The persisted `total` is only filled
// in after adjudication (winning prices copied onto the partidas); before that
// it's 0 even though the cotizaciones carry prices. So pre-award we show the
// cheapest cotización as an estimate.
function requisicionTotal(r) {
  const real = Number(r.total) || 0
  if (real > 0) return { amount: real, estimated: false }
  const ofertas = (r.cotizaciones ?? []).map((c) => Number(c.total) || 0).filter((t) => t > 0)
  if (ofertas.length) return { amount: Math.min(...ofertas), estimated: true }
  return { amount: 0, estimated: false }
}

const ESTADO_LABEL = {
  BORRADOR: 'Borrador',
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  PAGADA: 'Pagada',
  RECHAZADA: 'Rechazada',
}

let _uidSeq = 0
const uid = () => `k${Date.now().toString(36)}${(_uidSeq++).toString(36)}`

// Map a server requisición (detail shape) back into editable form state so a
// BORRADOR can be reopened and finished. Concept rows get fresh local keys;
// each cotización becomes an offer column with prices keyed by concept.
function formFromSolicitud(sol) {
  const partidas = (sol.partidas ?? []).map((p) => ({
    key: uid(),
    descripcion: p.descripcion ?? '',
    cantidad: p.cantidad != null ? String(p.cantidad) : '',
    unidad: p.unidad ?? '',
    insumoId: p.insumoId ?? null,
    _serverId: p.id,
  }))
  const idToKey = {}
  partidas.forEach((p) => { idToKey[p._serverId] = p.key })
  const offers = (sol.cotizaciones ?? []).map((c) => {
    const prices = {}
    for (const cp of c.partidas ?? []) {
      const k = idToKey[cp.solicitudPartidaId]
      if (k) prices[k] = String(cp.precioUnitario)
    }
    return {
      key: uid(),
      supplier: c.supplier ? { id: c.supplier.id, razonSocial: c.supplier.razonSocial, rfc: c.supplier.rfc } : null,
      freeText: c.supplierId ? '' : (c.supplierNombre ?? ''),
      conIva: false, // los precios guardados son SIN IVA (canónico)
      credito: !!c.tieneCredito,
      diasCredito: c.diasCredito != null ? String(c.diasCredito) : '',
      diasEntrega: c.diasEntrega != null ? String(c.diasEntrega) : '',
      prices,
    }
  })
  return {
    id: sol.id,
    estado: sol.estado,
    folio: sol.folio,
    proyectoId: sol.proyectoId ?? sol.proyecto?.id ?? '',
    fechaEntrega: sol.fechaEntrega ? new Date(sol.fechaEntrega).toISOString().slice(0, 10) : '',
    notas: sol.notas ?? '',
    partidas,
    offers,
  }
}

export default function Requisiciones() {
  const navigate = useNavigate()
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id

  const [rows, setRows] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [newOpen, setNewOpen] = useState(false)
  const [draftsOpen, setDraftsOpen] = useState(false)
  // The draft (form state) currently loaded into the create form (null = new).
  const [editingDraft, setEditingDraft] = useState(null)

  const reload = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const [list, proys] = await Promise.all([
        apiFetch(`/api/construccion/solicitudes-compra?companyId=${encodeURIComponent(companyId)}`),
        apiFetch(`/api/construccion/proyectos?companyId=${encodeURIComponent(companyId)}`),
      ])
      setRows(Array.isArray(list) ? list : [])
      setProyectos(Array.isArray(proys) ? proys : [])
    } catch (err) {
      console.error('Error loading requisiciones:', err)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => { reload() }, [reload])

  // Borradores are server-side now; derive them from the list. They stay out of
  // the main table (work in progress) and surface via the "Borradores" button.
  const drafts = useMemo(() => rows.filter((r) => r.estado === 'BORRADOR'), [rows])
  const visibleRows = useMemo(() => rows.filter((r) => r.estado !== 'BORRADOR'), [rows])
  const filtered = useMemo(() => {
    if (filter === 'ALL') return visibleRows
    return visibleRows.filter((r) => r.estado === filter)
  }, [visibleRows, filter])

  const openNew = () => { setEditingDraft(null); setNewOpen(true) }
  const closeForm = () => { setNewOpen(false); setEditingDraft(null) }

  const continueDraft = async (draftRow) => {
    try {
      const sol = await apiFetch(`/api/construccion/solicitudes-compra/${draftRow.id}`)
      setEditingDraft(formFromSolicitud(sol))
      setDraftsOpen(false)
      setNewOpen(true)
    } catch (err) {
      alertDialog({ message: err.message || 'No se pudo abrir el borrador' })
    }
  }

  // Delete an un-authorized requisición (borrador or pendiente). The backend
  // rejects authorized ones (APROBADA/PAGADA).
  const removeSolicitud = async (row) => {
    const label = row.estado === 'BORRADOR' ? 'borrador' : 'requisición'
    if (!(await confirmDialog({ title: `Eliminar ${label}`, message: `¿Eliminar ${row.folio}? No se puede deshacer.`, okLabel: 'Eliminar' }))) return
    try {
      await apiFetch(`/api/construccion/solicitudes-compra/${row.id}`, { method: 'DELETE' })
      reload()
    } catch (err) {
      alertDialog({ message: err.message || 'No se pudo eliminar' })
    }
  }

  if (!companyId) return <div className="pd-empty">Selecciona una empresa.</div>

  return (
    <div className="requisiciones-page">
      <header>
        <h1>Requisiciones de material</h1>
        <p className="muted small">
          Solicita materiales por requisición. Captura los precios de
          cada proveedor por concepto, envíala a autorización y elige qué
          proveedor surte cada concepto.
        </p>
      </header>

      <div className="toolbar">
        <div className="filters">
          {['ALL', 'PENDIENTE', 'APROBADA', 'PAGADA'].map((f) => (
            <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
              {f === 'ALL' ? 'Todas' : ESTADO_LABEL[f]}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {drafts.length > 0 && (
            <button className="secondary" onClick={() => setDraftsOpen(true)}>
              Borradores ({drafts.length})
            </button>
          )}
          <button className="primary" onClick={openNew}>+ Nueva requisición</button>
        </div>
      </div>

      <Modal open={newOpen} onClose={closeForm} title={editingDraft ? (editingDraft.estado === 'BORRADOR' ? 'Continuar requisición' : 'Editar requisición') : 'Nueva requisición de material'} size="lg">
        <NewRequisicionForm
          companyId={companyId}
          proyectos={proyectos}
          initialDraft={editingDraft}
          onClose={closeForm}
          onCreated={(id) => { closeForm(); reload(); navigate(`/requisiciones/${id}`) }}
          onDraftSaved={() => { closeForm(); reload() }}
        />
      </Modal>

      <Modal open={draftsOpen} onClose={() => setDraftsOpen(false)} title="Borradores de requisición" size="md">
        <DraftsList
          drafts={drafts}
          onContinue={continueDraft}
          onDelete={removeSolicitud}
          onClose={() => setDraftsOpen(false)}
        />
      </Modal>

      {loading ? (
        <div className="pd-empty">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="pd-empty">
          {visibleRows.length === 0 ? 'No hay requisiciones aún. Crea la primera con "Nueva requisición".' : 'Nada en este filtro.'}
        </div>
      ) : (
        <table className="reqs-table">
          <thead>
            <tr>
              <th>Folio</th>
              <th>Proyecto</th>
              <th>Estado</th>
              <th>Forma pago</th>
              <th>Entrega</th>
              <th style={{ textAlign: 'right' }}># líneas</th>
              <th style={{ textAlign: 'right' }}># cotiz.</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th>Proveedor</th>
              <th>Solicitada</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="clickable" onClick={() => navigate(`/requisiciones/${r.id}`)}>
                <td className="mono">{r.folio}</td>
                <td className="small">{r.proyecto?.codigo ?? '—'}</td>
                <td>
                  <span className={`badge estado-${r.estado.toLowerCase()}`}>{ESTADO_LABEL[r.estado] ?? r.estado}</span>
                </td>
                <td className="small">
                  {r.formaPago === 'CREDITO' ? 'Crédito' : r.formaPago === 'CONTADO' ? 'Contado' : <span className="muted">—</span>}
                </td>
                <td className="small">{r.fechaEntrega ? fmtDate(r.fechaEntrega) : <span className="muted">—</span>}</td>
                <td style={{ textAlign: 'right' }}>{r._count?.partidas ?? 0}</td>
                <td style={{ textAlign: 'right' }}>{r._count?.cotizaciones ?? r.cotizaciones?.length ?? 0}</td>
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {(() => {
                    const t = requisicionTotal(r)
                    if (t.amount === 0) return <span className="muted">—</span>
                    return t.estimated
                      ? <span title="Estimado: oferta más baja (aún sin adjudicar)">≈ {fmtMoney(t.amount)}</span>
                      : fmtMoney(t.amount)
                  })()}
                </td>
                <td className="small">{r.supplier?.razonSocial ?? <span className="muted">— sin elegir —</span>}</td>
                <td className="small muted">{fmtDate(r.createdAt)}</td>
                <td className="reqs-actions" onClick={(e) => e.stopPropagation()}>
                  {r.estado === 'PENDIENTE' ? (
                    <>
                      <button className="link small" onClick={() => continueDraft(r)}>Editar</button>
                      <button className="link small danger" onClick={() => removeSolicitud(r)}>Eliminar</button>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Drafts list (server-side BORRADOR requisiciones) ─────────────────────────
function DraftsList({ drafts, onContinue, onDelete, onClose }) {
  if (drafts.length === 0) {
    return (
      <div>
        <div className="pd-empty">No hay borradores.</div>
        <div className="modal-actions"><button onClick={onClose}>Cerrar</button></div>
      </div>
    )
  }
  return (
    <div>
      <p className="muted small">
        Borradores compartidos: cualquiera puede continuar capturando precios y
        enviarlos a autorización.
      </p>
      <table className="reqs-table">
        <thead>
          <tr>
            <th>Folio</th>
            <th>Proyecto</th>
            <th style={{ textAlign: 'right' }}># líneas</th>
            <th style={{ textAlign: 'right' }}># ofertas</th>
            <th>Actualizado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {drafts.map((d) => (
            <tr key={d.id}>
              <td className="mono">{d.folio}</td>
              <td className="small">{d.proyecto?.codigo ?? '— sin proyecto —'}</td>
              <td style={{ textAlign: 'right' }}>{d._count?.partidas ?? 0}</td>
              <td style={{ textAlign: 'right' }}>{d._count?.cotizaciones ?? 0}</td>
              <td className="small muted">{fmtDate(d.updatedAt ?? d.createdAt)}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="link small" onClick={() => onContinue(d)}>Continuar</button>
                <button className="link small danger" onClick={() => onDelete(d)}>Eliminar</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="modal-actions"><button onClick={onClose}>Cerrar</button></div>
    </div>
  )
}

// ── Nueva requisición form ───────────────────────────────────────────────────
// Captures the requested concepts AND each proveedor's price per concept, then
// creates the requisición + one cotización per supplier in a single request.
// Can be parked as a shared server-side borrador (BORRADOR) and resumed.
function NewRequisicionForm({ companyId, proyectos, initialDraft, onClose, onCreated, onDraftSaved }) {
  // Server id when editing an existing borrador; null for a brand-new form.
  const serverId = initialDraft?.id ?? null
  const [folio, setFolio] = useState(
    () => initialDraft?.folio ?? `REQ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`
  )
  const [proyectoId, setProyectoId] = useState(initialDraft?.proyectoId ?? proyectos[0]?.id ?? '')
  const today = new Date().toISOString().slice(0, 10)
  const [notas, setNotas] = useState(initialDraft?.notas ?? '')
  // Each partida carries a stable `key` so supplier offer prices map to the
  // right concept even as rows are added/removed.
  const [partidas, setPartidas] = useState(
    () => initialDraft?.partidas ?? [{ key: uid(), descripcion: '', cantidad: '', unidad: '', insumoId: null }]
  )
  // offers: one per proveedor column. prices keyed by partida.key.
  const [offers, setOffers] = useState(() => initialDraft?.offers ?? [])
  const [busy, setBusy] = useState(false)

  // Material suggestions from the selected project's explosión de insumos.
  // A requisición de material is a request for insumos (cemento, acero, …),
  // so the picker lists the project's insumos — not the work conceptos.
  const [insumos, setInsumos] = useState([])
  useEffect(() => {
    let alive = true
    if (!proyectoId) { setInsumos([]); return }
    ;(async () => {
      try {
        const proy = await apiFetch(`/api/construccion/proyectos/${proyectoId}`)
        const presups = proy?.presupuestos ?? []
        // Same basis selection as the consumo view: prefer EJECUTADO, then an
        // approved/in-progress contrato, else the first presupuesto.
        const basis =
          presups.find((p) => p.tipoPresupuesto === 'EJECUTADO') ??
          presups.find((p) => p.estado === 'APROBADO' || p.estado === 'EN_EJECUCION') ??
          presups[0]
        if (!basis) { if (alive) setInsumos([]); return }
        const data = await apiFetch(`/api/construccion/presupuestos/${basis.id}/explosion`)
        if (!alive) return
        const out = (data?.explosion ?? []).map((e) => ({
          id: e.insumoId,
          descripcion: e.descripcion,
          unidad: e.unidad || '',
          codigo: e.codigo || '',
          // budget tracking from the explosion
          presupuestado: e.cantidadTotal ?? 0,
          comprado: e.compradoCantidad ?? 0,
          restante: e.restanteCantidad ?? 0,
        }))
        setInsumos(out)
      } catch {
        if (alive) setInsumos([])
      }
    })()
    return () => { alive = false }
  }, [proyectoId])

  const updatePart = (idx, field, val) => {
    setPartidas((arr) => arr.map((p, i) => (i === idx ? { ...p, [field]: val } : p)))
  }
  const budgetOf = (c) => c
    ? { presupuestado: c.presupuestado ?? 0, comprado: c.comprado ?? 0, restante: c.restante ?? 0 }
    : null
  const onDescChange = (idx, val) => {
    const match = insumos.find((c) => c.descripcion.toLowerCase() === val.trim().toLowerCase())
    setPartidas((arr) => arr.map((p, i) => (i === idx ? {
      ...p,
      descripcion: val,
      insumoId: match ? match.id : null,
      unidad: match && !p.unidad ? match.unidad : p.unidad,
      _budget: match ? budgetOf(match) : null,
    } : p)))
  }
  const pickConcept = (idx, c) => {
    setPartidas((arr) => arr.map((p, i) => (i === idx ? {
      ...p,
      descripcion: c.descripcion,
      insumoId: c.id,
      unidad: p.unidad || c.unidad || '',
      // Default the quantity to what's still missing vs budget (only if empty).
      cantidad: (p.cantidad === '' || p.cantidad == null) && c.restante > 0 ? String(c.restante) : p.cantidad,
      _budget: budgetOf(c),
    } : p)))
  }
  const addRow = () =>
    setPartidas((arr) => [...arr, { key: uid(), descripcion: '', cantidad: '', unidad: '', insumoId: null }])
  const removeRow = (idx) =>
    setPartidas((arr) => {
      if (arr.length <= 1) return arr
      const removed = arr[idx]
      setOffers((ofs) => ofs.map((o) => {
        const prices = { ...o.prices }
        delete prices[removed.key]
        return { ...o, prices }
      }))
      return arr.filter((_, i) => i !== idx)
    })

  // ── Offers (proveedor columns) ──
  const addOffer = () =>
    setOffers((arr) => [...arr, { key: uid(), supplier: null, freeText: '', conIva: false, credito: false, diasCredito: '', diasEntrega: '', prices: {} }])
  const removeOffer = (idx) =>
    setOffers((arr) => arr.filter((_, i) => i !== idx))
  const updateOffer = (idx, patch) =>
    setOffers((arr) => arr.map((o, i) => (i === idx ? { ...o, ...patch } : o)))
  const setOfferPrice = (idx, partidaKey, val) =>
    setOffers((arr) => arr.map((o, i) => (i === idx ? { ...o, prices: { ...o.prices, [partidaKey]: val } } : o)))

  const offerName = (o) => (o.supplier?.razonSocial ?? o.freeText ?? '').trim()
  const offerTotal = (o) =>
    partidas.reduce((sum, p) => sum + (parseFloat(o.prices[p.key]) || 0) * (Number(p.cantidad) || 0), 0)

  const validLines = () =>
    partidas.filter((p) => p.descripcion.trim() && Number(p.cantidad) > 0)

  // Build the create/update payload. Offers reference partidas by index into
  // `lines` (the backend maps those to the persisted partida ids).
  const buildPayload = (lines, estado) => ({
    companyId, // ignored by PUT, required by POST
    folio: folio.trim(),
    proyectoId: proyectoId || undefined,
    // Delivery AND payment terms are per-supplier now (offer.diasEntrega /
    // offer.credito), so there's no header fecha or formaPago.
    notas: notas.trim() || undefined,
    estado,
    partidas: lines.map((p) => ({
      descripcion: p.descripcion.trim(),
      unidad: p.unidad?.trim() || null,
      cantidad: Number(p.cantidad),
      insumoId: p.insumoId || undefined,
    })),
    offers: offers
      .filter((o) => offerName(o))
      .map((o) => ({
        supplierId: o.supplier?.id ?? null,
        supplierNombre: offerName(o),
        tieneCredito: !!o.credito,
        // Credit days only meaningful when the offer is a crédito; contado → null.
        diasCredito: o.credito && o.diasCredito !== '' && o.diasCredito != null ? parseInt(o.diasCredito, 10) : null,
        diasEntrega: o.diasEntrega !== '' && o.diasEntrega != null ? parseInt(o.diasEntrega, 10) : null,
        lineas: lines
          .map((p, idx) => {
            const raw = parseFloat(o.prices[p.key]) || 0
            // Canónico sin IVA: lo capturado "con IVA" se convierte (÷1.16).
            const sinIva = o.conIva ? raw / 1.16 : raw
            return { partidaIndex: idx, precioUnitario: Math.round(sinIva * 10000) / 10000 }
          })
          .filter((l) => l.precioUnitario > 0),
      }))
      .filter((o) => o.lineas.length > 0),
  })

  // Offers that carry data but would be dropped by buildPayload. Desde el
  // rediseño del picker, el texto tecleado YA cuenta como nombre (no hay
  // fallo silencioso por nombre); sólo queda el caso de columnas sin precio
  // en conceptos válidos. We surface these instead of dropping them silently.
  const droppedOffers = (lines) =>
    offers
      .map((o) => {
        const hasName = !!offerName(o)
        const hasAnyPrice = partidas.some((p) => parseFloat(o.prices[p.key]) > 0)
        const hasValidPriced = lines.some((p) => parseFloat(o.prices[p.key]) > 0)
        if (!hasName && !hasAnyPrice) return null // truly empty column — ignore
        if (hasName && hasValidPriced) return null // will be saved
        const label = offerName(o) || 'Un proveedor sin nombre'
        const reason = !hasName
          ? 'tiene precios pero ningún nombre de proveedor'
          : 'no tiene precios en conceptos con cantidad mayor a 0'
        return `• ${label} — ${reason}`
      })
      .filter(Boolean)

  const persist = async (estado) => {
    const lines = validLines()
    if (lines.length === 0) {
      alertDialog({ message: 'Agrega al menos una línea con descripción y cantidad.' })
      return null
    }
    const dropped = droppedOffers(lines)
    if (dropped.length > 0) {
      const ok = await confirmDialog({
        title: 'Ofertas que no se guardarán',
        message: `Estas columnas de proveedor no se guardarán:\n\n${dropped.join('\n')}\n\n¿Continuar de todos modos?`,
        okLabel: 'Continuar',
      })
      if (!ok) return null
    }
    const payload = buildPayload(lines, estado)
    const url = serverId
      ? `/api/construccion/solicitudes-compra/${serverId}`
      : '/api/construccion/solicitudes-compra'
    return apiFetch(url, { method: serverId ? 'PUT' : 'POST', body: payload })
  }

  const saveDraft = async () => {
    setBusy(true)
    try {
      const saved = await persist('BORRADOR')
      if (saved) onDraftSaved?.()
    } catch (err) {
      alertDialog({ message: err.message || 'Error al guardar el borrador' })
    } finally {
      setBusy(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    // Guard against submits that bubbled up from a NESTED form — e.g. the
    // "crear proveedor" modal renders its own <form>, and its submit would
    // otherwise trigger this handler and send the whole requisición. Only act
    // when this form is the actual target.
    if (e.target !== e.currentTarget) return
    setBusy(true)
    try {
      const saved = await persist('PENDIENTE')
      if (saved) onCreated?.(saved.id ?? serverId)
    } catch (err) {
      alertDialog({ message: err.message || 'Error al enviar la requisición' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="req-form">
      <div className="row">
        <label>
          <span>Folio / SOLICITUD N°</span>
          <input value={folio} onChange={(e) => setFolio(e.target.value)} required />
        </label>
        <label>
          <span>Obra / Proyecto</span>
          <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
            <option value="">— sin proyecto —</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>{p.codigo} {p.nombre}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="req-meta-line muted small">
        Solicitud creada el {fmtDate(today)}. La fecha de entrega la define cada
        proveedor en su oferta — distintos proveedores, distintos plazos.
      </div>

      <div className="lines">
        <div className="lines-head">
          <span>Concepto</span>
          <span style={{ width: 80 }}>Cantidad</span>
          <span style={{ width: 80 }}>Unidad</span>
          <span style={{ width: 30 }}></span>
        </div>
        {partidas.map((p, idx) => (
          <div key={p.key}>
            <div className="line-row">
              <ConceptoCombobox
                value={p.descripcion}
                conceptos={insumos}
                linked={!!p.insumoId}
                onText={(v) => onDescChange(idx, v)}
                onPick={(c) => pickConcept(idx, c)}
              />
              <input
                type="number"
                step="0.01"
                value={p.cantidad}
                onChange={(e) => updatePart(idx, 'cantidad', e.target.value)}
                placeholder="0"
                style={{ width: 80 }}
              />
              <input
                value={p.unidad}
                onChange={(e) => updatePart(idx, 'unidad', e.target.value)}
                placeholder="ton, m3…"
                style={{ width: 80 }}
              />
              <button type="button" className="link small danger" onClick={() => removeRow(idx)} disabled={partidas.length === 1}>
                ×
              </button>
            </div>
            {p._budget && <LineBudgetHint budget={p._budget} unidad={p.unidad} pedido={p.cantidad} />}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <button type="button" className="link small" onClick={addRow}>
            + agregar línea
          </button>
          {proyectoId && (
            <span className="muted small">
              {insumos.length > 0
                ? `${insumos.length} insumos en la explosión · haz clic para ver la lista`
                : 'Sin explosión de insumos en este proyecto — captura libre'}
            </span>
          )}
        </div>
      </div>

      {/* ── Ofertas de proveedores (precios por concepto) ── */}
      <OffersSection
        companyId={companyId}
        partidas={partidas}
        offers={offers}
        offerTotal={offerTotal}
        addOffer={addOffer}
        removeOffer={removeOffer}
        updateOffer={updateOffer}
        setOfferPrice={setOfferPrice}
      />

      <label className="stack">
        <span>Notas (opcional)</span>
        <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="urgencia, especificaciones…" />
      </label>

      <div className="modal-actions">
        <button type="button" onClick={onClose}>Cancelar</button>
        <button type="button" className="secondary" onClick={saveDraft} disabled={busy}>
          Guardar borrador
        </button>
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Enviando…' : 'Enviar a autorización'}
        </button>
      </div>
    </form>
  )
}

// Budget context for a picked insumo: presupuestado / ya comprado / restante,
// with an over-budget warning when the requested qty exceeds what's left.
function LineBudgetHint({ budget, unidad, pedido }) {
  const fmtQty = (n) => Number(n || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 })
  const u = unidad ? ` ${unidad}` : ''
  const ped = Number(pedido) || 0
  const over = ped > 0 && ped > (budget.restante ?? 0)
  return (
    <div className={'line-budget' + (over ? ' over' : '')}>
      Presupuestado <b>{fmtQty(budget.presupuestado)}{u}</b>
      {' · '}comprado <b>{fmtQty(budget.comprado)}{u}</b>
      {' · '}resta <b>{fmtQty(budget.restante)}{u}</b>
      {over && <span className="line-budget-warn"> · excede lo presupuestado</span>}
    </div>
  )
}

// ── Offers section (suppliers × concepts price grid) ─────────────────────────
function OffersSection({ companyId, partidas, offers, offerTotal, addOffer, removeOffer, updateOffer, setOfferPrice }) {
  const conceptRows = partidas.filter((p) => p.descripcion.trim())

  return (
    <div className="offers-block">
      <div className="offers-head">
        <div>
          <strong>Ofertas de proveedores</strong>
          <div className="muted small">
            Agrega un proveedor por columna y captura su precio por concepto.
            Al enviar, cada proveedor queda como una cotización lista para
            adjudicar concepto por concepto en Compras por autorizar.
          </div>
        </div>
        <button type="button" className="link small" onClick={addOffer}>+ agregar proveedor</button>
      </div>

      {offers.length === 0 ? (
        <div className="muted small offers-empty">
          Sin ofertas aún — puedes enviar sin precios y capturarlos después, o
          agregar el primer proveedor.
        </div>
      ) : conceptRows.length === 0 ? (
        <div className="muted small offers-empty">Agrega al menos un concepto arriba para capturar precios.</div>
      ) : (
        <div className="offers-scroll">
          <table className="offers-table">
            <thead>
              <tr>
                <th className="oc-concept">Concepto</th>
                <th className="oc-qty">Cant.</th>
                {offers.map((o, idx) => (
                  <th key={o.key} className="oc-supplier">
                    <OfferSupplierHead
                      offer={o}
                      companyId={companyId}
                      onChange={(patch) => updateOffer(idx, patch)}
                      onRemove={() => removeOffer(idx)}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {conceptRows.map((p) => (
                <tr key={p.key}>
                  <td className="oc-concept">{p.descripcion}</td>
                  <td className="oc-qty mono small">{p.cantidad || 0} {p.unidad}</td>
                  {offers.map((o, idx) => {
                    const pu = parseFloat(o.prices[p.key]) || 0
                    const imp = pu * (Number(p.cantidad) || 0)
                    return (
                      <td key={o.key} className="oc-price">
                        <input
                          type="number"
                          step="0.01"
                          value={o.prices[p.key] ?? ''}
                          onChange={(e) => setOfferPrice(idx, p.key, e.target.value)}
                          placeholder="0.00"
                        />
                        {pu > 0 && <div className="muted small">= {fmtMoneyDec(imp)}</div>}
                      </td>
                    )
                  })}
                </tr>
              ))}
              <tr className="offers-total-row">
                <td colSpan={2}><strong>Total oferta</strong></td>
                {offers.map((o) => (
                  <td key={o.key} className="oc-price"><strong>{fmtMoneyDec(offerTotal(o))}</strong></td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// Default forma de pago for an offer = the supplier's saved terms (crédito if
// it has credit days or the flag is on), preloaded when the supplier is picked.
function defaultCredito(supplier) {
  if (!supplier) return false
  const t = readTerms(supplier)
  return t.tieneCredito === true || t.diasCredito > 0
}

// Default credit days from the supplier's saved terms (empty string when none),
// preloaded into the offer so tesorería gets a real due-date.
function defaultDiasCredito(supplier) {
  if (!supplier) return ''
  const t = readTerms(supplier)
  return t.diasCredito > 0 ? String(t.diasCredito) : ''
}

// One proveedor column header: supplier picker + a forma-de-pago toggle that
// preloads from the supplier's terms and can be checked/unchecked per offer.
function OfferSupplierHead({ offer, companyId, onChange, onRemove }) {
  const named = offer.supplier ?? offer.freeText.trim()
  return (
    <div className="offer-supplier-head">
      {offer.supplier ? (
        <div className="ofs-picked">
          <strong>{offer.supplier.razonSocial}</strong>
          <button type="button" className="link small" onClick={() => onChange({ supplier: null, freeText: '' })}>cambiar</button>
        </div>
      ) : (
        <div className="ofs-pick">
          {/* Un solo campo: escribe el nombre y ya cuenta (nombre libre);
              elegir del catálogo lo liga; "+ Crear proveedor" lo da de alta. */}
          <SupplierPicker
            value={null}
            allowFreeText
            initialText={offer.freeText}
            onTextChange={(t) => onChange({ freeText: t })}
            onChange={(s) => onChange({ supplier: s, freeText: '', credito: defaultCredito(s), diasCredito: defaultDiasCredito(s) })}
            companyId={companyId}
            placeholder="Proveedor (escribe o elige)…"
          />
          {offer.freeText.trim() && (
            <span className="ofs-libre-hint" title="No está en el catálogo; se guardará con este nombre">
              nombre libre ✓
            </span>
          )}
        </div>
      )}
      {named && (
        <div className="ofs-terms">
          <label className="ofs-credito" title="Precargado de las condiciones del proveedor; ajustable">
            <input
              type="checkbox"
              checked={!!offer.credito}
              onChange={(e) => onChange({ credito: e.target.checked })}
            />
            <span>{offer.credito ? 'A crédito' : 'Contado'}</span>
          </label>
          {offer.credito && (
            <label className="ofs-credito-dias" title="Días de crédito ofrecidos — define el vencimiento en cuentas por pagar">
              <input
                type="number"
                min="0"
                max="365"
                step="1"
                value={offer.diasCredito ?? ''}
                onChange={(e) => onChange({ diasCredito: e.target.value })}
                placeholder="—"
              />
              <span>días crédito</span>
            </label>
          )}
          <label className="ofs-iva" title="Marca si los precios que capturas ya incluyen IVA; se guardan sin IVA (÷1.16) para comparar parejo">
            <input
              type="checkbox"
              checked={!!offer.conIva}
              onChange={(e) => onChange({ conIva: e.target.checked })}
            />
            <span>precios con IVA</span>
          </label>
          <label className="ofs-entrega" title="Días de entrega prometidos por este proveedor">
            <input
              type="number"
              min="0"
              step="1"
              value={offer.diasEntrega ?? ''}
              onChange={(e) => onChange({ diasEntrega: e.target.value })}
              placeholder="—"
            />
            <span>días entrega</span>
          </label>
        </div>
      )}
      <button type="button" className="link small danger ofs-remove" onClick={onRemove} title="Quitar proveedor">× quitar</button>
    </div>
  )
}

// ── Concepto combobox ────────────────────────────────────────────────────────
// Visible, searchable picker over the project's explosión de insumos. Opens a
// dropdown on focus showing código · descripción · unidad. Picking one links
// the insumo; free text still works for anything off-budget.
function ConceptoCombobox({ value, conceptos, linked, onText, onPick }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const fn = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  const q = (value || '').trim().toLowerCase()
  const matches = useMemo(() => {
    if (!conceptos.length) return []
    if (!q) return conceptos.slice(0, 60)
    return conceptos
      .filter((c) => c.descripcion.toLowerCase().includes(q) || (c.codigo || '').toLowerCase().includes(q))
      .slice(0, 60)
  }, [conceptos, q])

  return (
    <div className="concepto-combo" ref={wrapRef}>
      <input
        value={value}
        onChange={(e) => { onText(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        placeholder={conceptos.length ? 'Escribe o elige un insumo…' : 'Captura libre…'}
        autoComplete="off"
      />
      {linked && <span className="line-tag" title="Vinculado a un insumo de la explosión">insumo</span>}
      {open && conceptos.length > 0 && (
        <div className="concepto-dropdown">
          {matches.length === 0 ? (
            <div className="concepto-empty">Sin coincidencias — se guardará como captura libre</div>
          ) : (
            matches.map((c) => (
              <button type="button" key={c.id} className="concepto-item" onClick={() => { onPick(c); setOpen(false) }}>
                {c.codigo && <span className="mono small cc-code">{c.codigo}</span>}
                <span className="cc-desc">{c.descripcion}</span>
                {c.unidad && <span className="muted small cc-unit">{c.unidad}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
