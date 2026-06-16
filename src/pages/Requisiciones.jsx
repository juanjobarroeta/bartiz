/**
 * Requisiciones — list of material requests (SolicitudCompra rows)
 * with cotización counts. Gerardo's main surface for tracking which
 * requisiciones are still gathering quotes vs. ready to approve.
 *
 * Each row click → /requisiciones/:id detail with the multi-vendor
 * matrix.
 *
 * Creating a requisición now captures supplier offers inline: pick the
 * concepts (from the presupuesto) and add one column per proveedor with
 * their price per concept. On "Enviar a autorización" it creates the
 * requisición plus one cotización per supplier, ready for Gerardo to
 * adjudicate concept-by-concept. The half-filled form can be parked as a
 * local "borrador" and resumed later (kept in the browser, per company).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../config/api'
import Modal from '../components/Modal'
import SupplierPicker from '../components/SupplierPicker'
import { readTerms } from './ProveedoresBartiz'
import { alertDialog } from '../components/Dialog'
import '../components/Modal.css'
import '../components/SupplierPicker.css'
import './Requisiciones.css'

const fmtMoney = (n) =>
  n == null ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(n) || 0)
const fmtMoneyDec = (n) =>
  n == null ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(Number(n) || 0)
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const ESTADO_LABEL = {
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  PAGADA: 'Pagada',
  RECHAZADA: 'Rechazada',
}

let _uidSeq = 0
const uid = () => `k${Date.now().toString(36)}${(_uidSeq++).toString(36)}`

// ── Local (browser) drafts ───────────────────────────────────────────────────
// Half-filled requisiciones live in localStorage per company until the user
// sends them for authorization (which creates the real server-side rows). This
// keeps "guardar y continuar después" working without a server draft state.
const draftsKey = (companyId) => `bartiz:reqDrafts:${companyId}`
function loadDrafts(companyId) {
  if (!companyId) return []
  try {
    const raw = localStorage.getItem(draftsKey(companyId))
    const arr = raw ? JSON.parse(raw) : []
    return Array.isArray(arr) ? arr : []
  } catch {
    return []
  }
}
function writeDrafts(companyId, drafts) {
  try {
    localStorage.setItem(draftsKey(companyId), JSON.stringify(drafts))
  } catch { /* quota / private mode — non-fatal */ }
}
function upsertDraft(companyId, draft) {
  const drafts = loadDrafts(companyId)
  const idx = drafts.findIndex((d) => d.id === draft.id)
  const next = { ...draft, savedAt: new Date().toISOString() }
  if (idx >= 0) drafts[idx] = next
  else drafts.unshift(next)
  writeDrafts(companyId, drafts)
  return next
}
function removeDraft(companyId, draftId) {
  writeDrafts(companyId, loadDrafts(companyId).filter((d) => d.id !== draftId))
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
  const [drafts, setDrafts] = useState([])
  // The draft currently loaded into the create form (null = brand-new form).
  const [editingDraft, setEditingDraft] = useState(null)

  const refreshDrafts = useCallback(() => {
    setDrafts(loadDrafts(companyId))
  }, [companyId])

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
  useEffect(() => { refreshDrafts() }, [refreshDrafts])

  const filtered = useMemo(() => {
    if (filter === 'ALL') return rows
    return rows.filter((r) => r.estado === filter)
  }, [rows, filter])

  const openNew = () => { setEditingDraft(null); setNewOpen(true) }
  const continueDraft = (draft) => { setEditingDraft(draft); setDraftsOpen(false); setNewOpen(true) }
  const closeForm = () => { setNewOpen(false); setEditingDraft(null) }

  if (!companyId) return <div className="pd-empty">Selecciona una empresa.</div>

  return (
    <div className="requisiciones-page">
      <header>
        <h1>Requisiciones de material</h1>
        <p className="muted small">
          Gerardo solicita materiales por requisición. Captura los precios de
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

      <Modal open={newOpen} onClose={closeForm} title={editingDraft ? 'Continuar requisición' : 'Nueva requisición de material'} size="lg">
        <NewRequisicionForm
          companyId={companyId}
          proyectos={proyectos}
          initialDraft={editingDraft}
          onClose={closeForm}
          onCreated={(id) => { closeForm(); refreshDrafts(); navigate(`/requisiciones/${id}`) }}
          onDraftSaved={() => { closeForm(); refreshDrafts() }}
        />
      </Modal>

      <Modal open={draftsOpen} onClose={() => setDraftsOpen(false)} title="Borradores de requisición" size="md">
        <DraftsList
          drafts={drafts}
          proyectos={proyectos}
          onContinue={continueDraft}
          onDelete={(id) => { removeDraft(companyId, id); refreshDrafts() }}
          onClose={() => setDraftsOpen(false)}
        />
      </Modal>

      {loading ? (
        <div className="pd-empty">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="pd-empty">
          {rows.length === 0 ? 'No hay requisiciones aún. Crea la primera con "Nueva requisición".' : 'Nada en este filtro.'}
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
                <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtMoney(r.total)}</td>
                <td className="small">{r.supplier?.razonSocial ?? <span className="muted">— sin elegir —</span>}</td>
                <td className="small muted">{fmtDate(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Drafts list ──────────────────────────────────────────────────────────────
function DraftsList({ drafts, proyectos, onContinue, onDelete, onClose }) {
  if (drafts.length === 0) {
    return (
      <div>
        <div className="pd-empty">No hay borradores guardados.</div>
        <div className="modal-actions"><button onClick={onClose}>Cerrar</button></div>
      </div>
    )
  }
  const proyName = (id) => {
    const p = proyectos.find((x) => x.id === id)
    return p ? `${p.codigo} ${p.nombre}` : '— sin proyecto —'
  }
  return (
    <div>
      <p className="muted small">
        Borradores guardados en este navegador. Continúa para terminar de
        capturar precios y enviar a autorización.
      </p>
      <table className="reqs-table">
        <thead>
          <tr>
            <th>Folio</th>
            <th>Proyecto</th>
            <th style={{ textAlign: 'right' }}># líneas</th>
            <th style={{ textAlign: 'right' }}># ofertas</th>
            <th>Guardado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {drafts.map((d) => (
            <tr key={d.id}>
              <td className="mono">{d.folio}</td>
              <td className="small">{proyName(d.proyectoId)}</td>
              <td style={{ textAlign: 'right' }}>{(d.partidas ?? []).filter((p) => p.descripcion?.trim()).length}</td>
              <td style={{ textAlign: 'right' }}>{(d.offers ?? []).length}</td>
              <td className="small muted">{d.savedAt ? fmtDate(d.savedAt) : '—'}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="link small" onClick={() => onContinue(d)}>Continuar</button>
                <button className="link small danger" onClick={() => onDelete(d.id)}>Eliminar</button>
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
// Captures the requested concepts AND each proveedor's price per concept. On
// submit it creates the requisición then one cotización per supplier so the
// adjudicación matrix is ready immediately. Can be parked as a local borrador.
function NewRequisicionForm({ companyId, proyectos, initialDraft, onClose, onCreated, onDraftSaved }) {
  const [draftId] = useState(() => initialDraft?.id ?? uid())
  const [folio, setFolio] = useState(
    () => initialDraft?.folio ?? `REQ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`
  )
  const [proyectoId, setProyectoId] = useState(initialDraft?.proyectoId ?? proyectos[0]?.id ?? '')
  const today = new Date().toISOString().slice(0, 10)
  const [fechaEntrega, setFechaEntrega] = useState(initialDraft?.fechaEntrega ?? '')
  const [formaPago, setFormaPago] = useState(initialDraft?.formaPago ?? 'CREDITO')
  const [notas, setNotas] = useState(initialDraft?.notas ?? '')
  // Each partida carries a stable `key` so supplier offer prices map to the
  // right concept even as rows are added/removed.
  const [partidas, setPartidas] = useState(
    () => initialDraft?.partidas ?? [{ key: uid(), descripcion: '', cantidad: '', unidad: '', presupuestoPartidaId: null }]
  )
  // offers: one per proveedor column. prices keyed by partida.key.
  const [offers, setOffers] = useState(() => initialDraft?.offers ?? [])
  const [busy, setBusy] = useState(false)

  // Concept suggestions from the selected project's presupuesto.
  const [conceptos, setConceptos] = useState([])
  useEffect(() => {
    let alive = true
    if (!proyectoId) { setConceptos([]); return }
    apiFetch(`/api/construccion/proyectos/${proyectoId}`)
      .then((proy) => {
        if (!alive) return
        const out = []
        const seen = new Set()
        for (const pre of proy?.presupuestos ?? []) {
          for (const part of pre.partidas ?? []) {
            if (part.esRollup) continue
            const c = part.concepto
            const desc = c?.descripcion || part.descripcion
            if (!desc) continue
            const key = desc.toLowerCase()
            if (seen.has(key)) continue
            seen.add(key)
            out.push({ id: part.id, descripcion: desc, unidad: c?.unidad || part.unidad || '', codigo: c?.codigo || part.codigo || '' })
          }
        }
        setConceptos(out)
      })
      .catch(() => { if (alive) setConceptos([]) })
    return () => { alive = false }
  }, [proyectoId])

  const updatePart = (idx, field, val) => {
    setPartidas((arr) => arr.map((p, i) => (i === idx ? { ...p, [field]: val } : p)))
  }
  const onDescChange = (idx, val) => {
    const match = conceptos.find((c) => c.descripcion.toLowerCase() === val.trim().toLowerCase())
    setPartidas((arr) => arr.map((p, i) => (i === idx ? {
      ...p,
      descripcion: val,
      presupuestoPartidaId: match ? match.id : null,
      unidad: match && !p.unidad ? match.unidad : p.unidad,
    } : p)))
  }
  const pickConcept = (idx, c) => {
    setPartidas((arr) => arr.map((p, i) => (i === idx ? {
      ...p,
      descripcion: c.descripcion,
      presupuestoPartidaId: c.id,
      unidad: p.unidad || c.unidad || '',
    } : p)))
  }
  const addRow = () =>
    setPartidas((arr) => [...arr, { key: uid(), descripcion: '', cantidad: '', unidad: '', presupuestoPartidaId: null }])
  const removeRow = (idx) =>
    setPartidas((arr) => {
      if (arr.length <= 1) return arr
      const removed = arr[idx]
      // Drop this concept's price from every offer.
      setOffers((ofs) => ofs.map((o) => {
        const prices = { ...o.prices }
        delete prices[removed.key]
        return { ...o, prices }
      }))
      return arr.filter((_, i) => i !== idx)
    })

  // ── Offers (proveedor columns) ──
  const addOffer = () =>
    setOffers((arr) => [...arr, { key: uid(), supplier: null, freeText: '', useFreeText: false, prices: {} }])
  const removeOffer = (idx) =>
    setOffers((arr) => arr.filter((_, i) => i !== idx))
  const updateOffer = (idx, patch) =>
    setOffers((arr) => arr.map((o, i) => (i === idx ? { ...o, ...patch } : o)))
  const setOfferPrice = (idx, partidaKey, val) =>
    setOffers((arr) => arr.map((o, i) => (i === idx ? { ...o, prices: { ...o.prices, [partidaKey]: val } } : o)))

  const offerName = (o) => (o.useFreeText ? o.freeText.trim() : o.supplier?.razonSocial?.trim() ?? '')
  const offerTotal = (o) =>
    partidas.reduce((sum, p) => sum + (parseFloat(o.prices[p.key]) || 0) * (Number(p.cantidad) || 0), 0)

  const snapshot = () => ({
    id: draftId,
    folio: folio.trim(),
    proyectoId,
    fechaEntrega,
    formaPago,
    notas,
    partidas,
    offers,
  })

  const validLines = () =>
    partidas.filter((p) => p.descripcion.trim() && Number(p.cantidad) > 0)

  const saveDraft = () => {
    upsertDraft(companyId, snapshot())
    onDraftSaved?.()
  }

  // Create the requisición + one cotización per priced supplier.
  const submit = async (e) => {
    e.preventDefault()
    const lines = validLines()
    if (lines.length === 0) {
      alertDialog({ message: 'Agrega al menos una línea con descripción y cantidad.' })
      return
    }
    // Offers must name a supplier; warn if a column is blank but priced.
    const namedOffers = offers.filter((o) => offerName(o))
    setBusy(true)
    try {
      const created = await apiFetch('/api/construccion/solicitudes-compra', {
        method: 'POST',
        body: {
          companyId,
          folio: folio.trim(),
          proyectoId: proyectoId || undefined,
          fechaEntrega: fechaEntrega ? new Date(fechaEntrega + 'T12:00:00').toISOString() : null,
          formaPago: formaPago || null,
          notas: notas.trim() || undefined,
          partidas: lines.map((p) => ({
            descripcion: p.descripcion.trim(),
            unidad: p.unidad?.trim() || null,
            cantidad: Number(p.cantidad),
            precioUnitario: 0, // unknown until a cotización wins
            presupuestoPartidaId: p.presupuestoPartidaId || undefined,
          })),
        },
      })

      // Map each local concept row → the persisted partida id. Match on
      // descripción + cantidad + unidad (consuming matches so duplicate
      // concepts pair off in order); fall back to remaining order. This avoids
      // relying on the backend returning nested rows in input order.
      const pool = [...(created.partidas ?? [])]
      const keyToId = {}
      for (const p of lines) {
        const desc = p.descripcion.trim()
        const cant = Number(p.cantidad)
        const uni = p.unidad?.trim() || null
        let mi = pool.findIndex((cp) => cp.descripcion === desc && Number(cp.cantidad) === cant && (cp.unidad ?? null) === uni)
        if (mi === -1) mi = pool.findIndex((cp) => cp.descripcion === desc)
        if (mi === -1) mi = 0
        if (pool[mi]) { keyToId[p.key] = pool[mi].id; pool.splice(mi, 1) }
      }

      // One cotización per named supplier offer that has at least one price.
      for (const o of namedOffers) {
        const lineas = lines
          .map((p) => ({ solicitudPartidaId: keyToId[p.key], precioUnitario: parseFloat(o.prices[p.key]) || 0 }))
          .filter((l) => l.solicitudPartidaId && l.precioUnitario > 0)
        if (lineas.length === 0) continue
        try {
          await apiFetch(`/api/construccion/solicitudes-compra/${created.id}/cotizaciones`, {
            method: 'POST',
            body: {
              supplierId: o.useFreeText ? null : o.supplier?.id ?? null,
              supplierNombre: offerName(o),
              fechaCotizacion: new Date().toISOString(),
              lineas,
            },
          })
        } catch (cotErr) {
          console.error('No se pudo guardar la oferta de', offerName(o), cotErr)
        }
      }

      removeDraft(companyId, draftId)
      onCreated?.(created.id)
    } catch (err) {
      alertDialog({ message: err.message || 'Error al crear requisición' })
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

      <div className="row">
        <label>
          <span>Fecha de solicitud</span>
          <input type="date" value={today} disabled />
        </label>
        <label>
          <span>Fecha de entrega</span>
          <input
            type="date"
            value={fechaEntrega}
            onChange={(e) => setFechaEntrega(e.target.value)}
            min={today}
          />
        </label>
        <label>
          <span>Forma de pago</span>
          <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
            <option value="CREDITO">Crédito</option>
            <option value="CONTADO">Contado</option>
          </select>
        </label>
      </div>

      <div className="lines">
        <div className="lines-head">
          <span>Concepto</span>
          <span style={{ width: 80 }}>Cantidad</span>
          <span style={{ width: 80 }}>Unidad</span>
          <span style={{ width: 30 }}></span>
        </div>
        {partidas.map((p, idx) => (
          <div key={p.key} className="line-row">
            <ConceptoCombobox
              value={p.descripcion}
              conceptos={conceptos}
              linked={!!p.presupuestoPartidaId}
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
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <button type="button" className="link small" onClick={addRow}>
            + agregar línea
          </button>
          {proyectoId && (
            <span className="muted small">
              {conceptos.length > 0
                ? `${conceptos.length} conceptos del presupuesto · haz clic en un concepto para ver la lista`
                : 'Sin presupuesto aprobado en este proyecto — captura libre'}
            </span>
          )}
        </div>
      </div>

      {/* ── Ofertas de proveedores (precios por concepto) ── */}
      <OffersSection
        companyId={companyId}
        partidas={partidas}
        offers={offers}
        offerName={offerName}
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

// ── Offers section (suppliers × concepts price grid) ─────────────────────────
function OffersSection({ companyId, partidas, offers, offerName, offerTotal, addOffer, removeOffer, updateOffer, setOfferPrice }) {
  const conceptRows = partidas.filter((p) => p.descripcion.trim())

  return (
    <div className="offers-block">
      <div className="offers-head">
        <div>
          <strong>Ofertas de proveedores</strong>
          <div className="muted small">
            Agrega un proveedor por columna y captura su precio por concepto.
            Al enviar, cada proveedor queda como una cotización para que Gerardo
            adjudique concepto por concepto.
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

// One proveedor column header: supplier picker (with crédito/contado tag) or a
// free-text name for one-off vendors.
function OfferSupplierHead({ offer, companyId, onChange, onRemove }) {
  const terms = offer.supplier ? readTerms(offer.supplier) : null
  return (
    <div className="offer-supplier-head">
      {offer.useFreeText ? (
        <div className="ofs-freetext">
          <input
            value={offer.freeText}
            onChange={(e) => onChange({ freeText: e.target.value })}
            placeholder="Nombre del proveedor"
          />
          <button type="button" className="link small" onClick={() => onChange({ useFreeText: false, freeText: '' })}>
            catálogo
          </button>
        </div>
      ) : offer.supplier ? (
        <div className="ofs-picked">
          <strong>{offer.supplier.razonSocial}</strong>
          {terms && (terms.diasCredito > 0
            ? <span className="ofs-credit has">Crédito {terms.diasCredito}d</span>
            : terms.tieneCredito === false
              ? <span className="ofs-credit cash">Contado</span>
              : null)}
          <button type="button" className="link small" onClick={() => onChange({ supplier: null })}>cambiar</button>
        </div>
      ) : (
        <div className="ofs-pick">
          <SupplierPicker
            value={null}
            onChange={(s) => onChange({ supplier: s })}
            companyId={companyId}
            placeholder="Proveedor…"
          />
          <button type="button" className="link small" onClick={() => onChange({ useFreeText: true })}>
            nombre libre
          </button>
        </div>
      )}
      <button type="button" className="link small danger ofs-remove" onClick={onRemove} title="Quitar proveedor">× quitar</button>
    </div>
  )
}

// ── Concepto combobox ────────────────────────────────────────────────────────
// Visible, searchable picker over the project's presupuesto concepts. Opens a
// dropdown on focus showing código · descripción · unidad. Picking one links
// the budget partida; free text still works for anything off-budget.
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
        placeholder={conceptos.length ? 'Escribe o elige del presupuesto…' : 'Captura libre…'}
        autoComplete="off"
      />
      {linked && <span className="line-tag" title="Vinculado a un concepto del presupuesto">presupuesto</span>}
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
