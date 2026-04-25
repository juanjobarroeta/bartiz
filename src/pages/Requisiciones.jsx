/**
 * Requisiciones — list of material requests (SolicitudCompra rows)
 * with cotización counts. Gerardo's main surface for tracking which
 * requisiciones are still gathering quotes vs. ready to approve.
 *
 * Each row click → /requisiciones/:id detail with the multi-vendor
 * matrix.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../config/api'
import Modal from '../components/Modal'
import { alertDialog } from '../components/Dialog'
import '../components/Modal.css'
import './Requisiciones.css'

const fmtMoney = (n) =>
  n == null ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(n) || 0)
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

const ESTADO_LABEL = {
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  PAGADA: 'Pagada',
  RECHAZADA: 'Rechazada',
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

  const filtered = useMemo(() => {
    if (filter === 'ALL') return rows
    return rows.filter((r) => r.estado === filter)
  }, [rows, filter])

  if (!companyId) return <div className="pd-empty">Selecciona una empresa.</div>

  return (
    <div className="requisiciones-page">
      <header>
        <h1>Requisiciones de material</h1>
        <p className="muted small">
          Gerardo solicita materiales por requisición. Cada una recoge
          cotizaciones de varios proveedores y, al elegir el ganador,
          se convierte en orden de compra.
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
        <button className="primary" onClick={() => setNewOpen(true)}>+ Nueva requisición</button>
      </div>

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Nueva requisición de material" size="lg">
        <NewRequisicionForm
          companyId={companyId}
          proyectos={proyectos}
          onClose={() => setNewOpen(false)}
          onCreated={(id) => { setNewOpen(false); navigate(`/requisiciones/${id}`) }}
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
              <th style={{ textAlign: 'right' }}># líneas</th>
              <th style={{ textAlign: 'right' }}># cotizaciones</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th>Proveedor (ganador)</th>
              <th>Fecha</th>
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
                <td style={{ textAlign: 'right' }}>{r._count?.partidas ?? 0}</td>
                <td style={{ textAlign: 'right' }}>{r.cotizaciones?.length ?? 0}</td>
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

// ── Nueva requisición form ───────────────────────────────────────────────────
// Lets Gerardo enter line items (materials he needs). Picks proyecto.
// Skips supplier — that gets set when he picks a winning cotización later.
function NewRequisicionForm({ companyId, proyectos, onClose, onCreated }) {
  const [folio, setFolio] = useState(`REQ-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`)
  const [proyectoId, setProyectoId] = useState(proyectos[0]?.id ?? '')
  const [notas, setNotas] = useState('')
  const [partidas, setPartidas] = useState([
    { descripcion: '', cantidad: '', unidad: '' },
  ])
  const [busy, setBusy] = useState(false)

  const updatePart = (idx, field, val) => {
    setPartidas((arr) => arr.map((p, i) => (i === idx ? { ...p, [field]: val } : p)))
  }
  const addRow = () =>
    setPartidas((arr) => [...arr, { descripcion: '', cantidad: '', unidad: '' }])
  const removeRow = (idx) =>
    setPartidas((arr) => (arr.length > 1 ? arr.filter((_, i) => i !== idx) : arr))

  const submit = async (e) => {
    e.preventDefault()
    const cleanLines = partidas
      .filter((p) => p.descripcion.trim() && Number(p.cantidad) > 0)
      .map((p) => ({
        descripcion: p.descripcion.trim() + (p.unidad ? ` (${p.unidad})` : ''),
        cantidad: Number(p.cantidad),
        precioUnitario: 0, // unknown until cotización lands
      }))
    if (cleanLines.length === 0) {
      alertDialog({ message: 'Agrega al menos una línea con descripción y cantidad.' })
      return
    }
    setBusy(true)
    try {
      const created = await apiFetch('/api/construccion/solicitudes-compra', {
        method: 'POST',
        body: {
          companyId,
          folio: folio.trim(),
          proyectoId: proyectoId || undefined,
          notas: notas.trim() || undefined,
          partidas: cleanLines,
        },
      })
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
          <span>Folio</span>
          <input value={folio} onChange={(e) => setFolio(e.target.value)} required />
        </label>
        <label>
          <span>Proyecto / Obra</span>
          <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
            <option value="">— sin proyecto —</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>{p.codigo} {p.nombre}</option>
            ))}
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
          <div key={idx} className="line-row">
            <input
              value={p.descripcion}
              onChange={(e) => updatePart(idx, 'descripcion', e.target.value)}
              placeholder="ej. Cemento gris"
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
        <button type="button" className="link small" onClick={addRow}>
          + agregar línea
        </button>
      </div>

      <label className="stack">
        <span>Notas (opcional)</span>
        <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="urgencia, especificaciones…" />
      </label>

      <div className="modal-actions">
        <button type="button" onClick={onClose}>Cancelar</button>
        <button type="submit" className="primary" disabled={busy}>{busy ? 'Creando…' : 'Crear requisición'}</button>
      </div>
    </form>
  )
}
