/**
 * Solicitudes de Compra — purchase request lifecycle.
 *
 * Create → Aprobar → Pagar. Each paid solicitud posts to the ledger
 * (DR 5101 Costo de obra / CR 1101 Bancos) and feeds Control Financiero.
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../config/api'
import './SolicitudesCompra.css'

const ESTADO_LABEL = {
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  PAGADA: 'Pagada',
  CANCELADA: 'Cancelada',
}

const fmtMoney = (n) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(Number(n) || 0)

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

export default function SolicitudesCompra() {
  const { activeCompany } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [bankAccounts, setBankAccounts] = useState([])
  const companyId = activeCompany?.id

  const cargar = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({ companyId })
      if (filter) qs.set('estado', filter)
      const data = await apiFetch(`/api/construccion/solicitudes-compra?${qs}`)
      setItems(Array.isArray(data) ? data : [])
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }, [companyId, filter])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    if (!companyId) return
    apiFetch(`/api/construccion/bank-accounts?companyId=${companyId}`)
      .then((d) => setBankAccounts(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [companyId])

  const aprobar = async (id) => {
    if (!window.confirm('¿Aprobar esta solicitud?')) return
    try {
      await apiFetch(`/api/construccion/solicitudes-compra/${id}/aprobar`, { method: 'POST' })
      cargar()
    } catch (err) { window.alert(err.message) }
  }

  const pagar = async (id) => {
    if (bankAccounts.length === 0) {
      window.alert('No hay cuentas bancarias. Crea una en contabilidad-os.')
      return
    }
    const bankAccountId = bankAccounts.length === 1
      ? bankAccounts[0].id
      : window.prompt(`Cuenta bancaria:\n${bankAccounts.map(b => `${b.id} — ${b.banco} ${b.nombre}`).join('\n')}`)
    if (!bankAccountId || !window.confirm('¿Confirmar el pago?')) return
    try {
      await apiFetch(`/api/construccion/solicitudes-compra/${id}/pagar`, {
        method: 'POST', body: { bankAccountId }
      })
      cargar()
    } catch (err) { window.alert(err.message) }
  }

  return (
    <div className="sc-page">
      <header className="sc-header">
        <h1>Solicitudes de Compra</h1>
        <div className="sc-actions">
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="">Todas</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="APROBADA">Aprobadas</option>
            <option value="PAGADA">Pagadas</option>
          </select>
          <button className="primary" onClick={() => setShowCreate(v => !v)}>
            {showCreate ? 'Cancelar' : '+ Nueva solicitud'}
          </button>
        </div>
      </header>

      {error && <div className="sc-error">{error}</div>}

      {showCreate && (
        <CreateSolicitud companyId={companyId} onCreated={() => { setShowCreate(false); cargar() }} />
      )}

      {loading ? <div className="sc-state">Cargando…</div> :
       items.length === 0 ? <div className="sc-state">No hay solicitudes.</div> : (
        <table className="sc-table">
          <thead>
            <tr>
              <th>Folio</th><th>Proyecto</th><th>Proveedor</th><th>Fecha</th><th>Estado</th>
              <th style={{ textAlign: 'right' }}>Total</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map(s => (
              <tr key={s.id}>
                <td className="mono">{s.folio}</td>
                <td>{s.proyecto?.nombre ?? '—'}</td>
                <td>{s.supplier?.razonSocial ?? '—'}</td>
                <td className="small">{fmtDate(s.createdAt)}</td>
                <td><span className={`badge solicitud-${s.estado?.toLowerCase()}`}>{ESTADO_LABEL[s.estado] ?? s.estado}</span></td>
                <td style={{ textAlign: 'right' }}>{fmtMoney(s.total)}</td>
                <td>
                  {s.estado === 'PENDIENTE' && <button className="link-action" onClick={() => aprobar(s.id)}>Aprobar</button>}
                  {s.estado === 'APROBADA' && <button className="link-action pay" onClick={() => pagar(s.id)}>Pagar</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function CreateSolicitud({ companyId, onCreated }) {
  const [form, setForm] = useState({ folio: `SC-${Date.now().toString(36).toUpperCase()}`, proyectoId: '', notas: '' })
  const [lines, setLines] = useState([{ descripcion: '', cantidad: 1, precioUnitario: 0 }])
  const [proyectos, setProyectos] = useState([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    apiFetch(`/api/construccion/proyectos?companyId=${companyId}`)
      .then(d => setProyectos(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [companyId])

  const total = lines.reduce((a, l) => a + (Number(l.cantidad) || 0) * (Number(l.precioUnitario) || 0), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const valid = lines.filter(l => l.descripcion.trim() && Number(l.cantidad) > 0)
    if (!valid.length) { setError('Agrega al menos una partida'); return }
    setBusy(true); setError(null)
    try {
      await apiFetch('/api/construccion/solicitudes-compra', {
        method: 'POST',
        body: {
          companyId, folio: form.folio,
          proyectoId: form.proyectoId || undefined,
          notas: form.notas || undefined,
          partidas: valid.map(l => ({
            descripcion: l.descripcion.trim(),
            cantidad: Number(l.cantidad),
            precioUnitario: Number(l.precioUnitario) || 0,
          })),
        },
      })
      onCreated()
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }

  return (
    <form className="sc-create" onSubmit={handleSubmit}>
      <h3>Nueva solicitud de compra</h3>
      {error && <div className="sc-error">{error}</div>}
      <div className="sc-create-meta">
        <label>Folio<input required value={form.folio} onChange={e => setForm({ ...form, folio: e.target.value })} /></label>
        <label>Proyecto
          <select value={form.proyectoId} onChange={e => setForm({ ...form, proyectoId: e.target.value })}>
            <option value="">Sin proyecto</option>
            {proyectos.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
          </select>
        </label>
        <label>Notas<input value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} placeholder="Opcional" /></label>
      </div>
      <table className="sc-lines-table">
        <thead><tr><th>Descripción</th><th style={{width:100}}>Cantidad</th><th style={{width:130}}>Precio unit.</th><th style={{width:110, textAlign:'right'}}>Importe</th><th style={{width:40}}></th></tr></thead>
        <tbody>
          {lines.map((l, idx) => (
            <tr key={idx}>
              <td><input required value={l.descripcion} onChange={e => setLines(prev => prev.map((x,i) => i===idx ? {...x, descripcion: e.target.value} : x))} placeholder="Cemento, acero..." /></td>
              <td><input type="number" min="0" step="0.01" value={l.cantidad} onChange={e => setLines(prev => prev.map((x,i) => i===idx ? {...x, cantidad: e.target.value} : x))} /></td>
              <td><input type="number" min="0" step="0.01" value={l.precioUnitario} onChange={e => setLines(prev => prev.map((x,i) => i===idx ? {...x, precioUnitario: e.target.value} : x))} /></td>
              <td style={{textAlign:'right'}}>{fmtMoney((Number(l.cantidad)||0)*(Number(l.precioUnitario)||0))}</td>
              <td>{lines.length > 1 && <button type="button" className="sc-remove" onClick={() => setLines(prev => prev.filter((_,i) => i!==idx))}>×</button>}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td colSpan={3} style={{textAlign:'right'}}><strong>Total</strong></td><td style={{textAlign:'right'}}><strong>{fmtMoney(total)}</strong></td><td></td></tr></tfoot>
      </table>
      <div className="sc-create-actions">
        <button type="button" onClick={() => setLines(prev => [...prev, { descripcion: '', cantidad: 1, precioUnitario: 0 }])}>+ Agregar línea</button>
        <button type="submit" className="primary" disabled={busy}>{busy ? 'Creando…' : 'Crear solicitud'}</button>
      </div>
    </form>
  )
}
