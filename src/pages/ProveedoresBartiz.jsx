/**
 * Proveedores — supplier directory for the active company.
 *
 * Same Supplier table contabilidad-os uses for SPEI matching, just
 * surfaced from bartiz so Gerardo and Katia can manage proveedores
 * without bouncing to the accounting product.
 *
 * Each row shows # cotizaciones, # OCs, # bank txs (movements paid
 * to this RFC). Click → detail with full history.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../config/api'
import Modal from '../components/Modal'
import { alertDialog } from '../components/Dialog'
import '../components/Modal.css'
import './ProveedoresBartiz.css'

export default function ProveedoresBartiz() {
  const navigate = useNavigate()
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [newOpen, setNewOpen] = useState(false)

  const reload = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ companyId })
      if (q.trim().length >= 2) params.set('q', q.trim())
      const data = await apiFetch(`/api/construccion/suppliers?${params.toString()}`)
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [companyId, q])

  useEffect(() => {
    const t = setTimeout(() => reload(), 200)
    return () => clearTimeout(t)
  }, [reload])

  if (!companyId) return <div className="pd-empty">Selecciona una empresa.</div>

  return (
    <div className="prov-page">
      <header>
        <h1>Proveedores</h1>
        <p className="muted small">
          Catálogo de proveedores de la empresa. Cada uno acumula sus
          cotizaciones, órdenes de compra y movimientos bancarios. Mismo
          padrón que usa contabilidad-os para conciliar SPEIs.
        </p>
      </header>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Buscar por nombre o RFC…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="search"
        />
        <button className="primary" onClick={() => setNewOpen(true)}>+ Nuevo proveedor</button>
      </div>

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Nuevo proveedor">
        <NewProveedorForm
          companyId={companyId}
          onClose={() => setNewOpen(false)}
          onCreated={(s) => { setNewOpen(false); navigate(`/proveedores-bartiz/${s.id}`) }}
        />
      </Modal>

      {loading ? (
        <div className="pd-empty">Cargando…</div>
      ) : rows.length === 0 ? (
        <div className="pd-empty">
          {q.trim()
            ? 'Sin resultados para esa búsqueda.'
            : 'Aún no hay proveedores. Crea el primero o aparecerán automáticamente al cotizar requisiciones.'}
        </div>
      ) : (
        <table className="prov-table">
          <thead>
            <tr>
              <th>Razón social</th>
              <th>RFC</th>
              <th>Régimen</th>
              <th>Email</th>
              <th style={{ textAlign: 'right' }}>Cotizaciones</th>
              <th style={{ textAlign: 'right' }}>OCs</th>
              <th style={{ textAlign: 'right' }}>Movimientos banco</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr
                key={s.id}
                className="clickable"
                onClick={() => navigate(`/proveedores-bartiz/${s.id}`)}
              >
                <td><strong>{s.razonSocial}</strong></td>
                <td className="mono">{s.rfc}</td>
                <td className="small">{s.regimenFiscal ?? '—'}</td>
                <td className="small muted">{s.email ?? '—'}</td>
                <td style={{ textAlign: 'right' }}>{s._count?.cotizaciones ?? 0}</td>
                <td style={{ textAlign: 'right' }}>{s._count?.solicitudesCompra ?? 0}</td>
                <td style={{ textAlign: 'right' }}>{s._count?.bankTransactions ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Nuevo proveedor inline form ──────────────────────────────────────────────
export function NewProveedorForm({ companyId, defaultName = '', onClose, onCreated }) {
  const [razonSocial, setRazonSocial] = useState(defaultName)
  const [rfc, setRfc] = useState('')
  const [regimen, setRegimen] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!razonSocial.trim() || !rfc.trim()) {
      alertDialog({ message: 'Razón social y RFC son requeridos.' })
      return
    }
    setBusy(true)
    try {
      const created = await apiFetch('/api/construccion/suppliers', {
        method: 'POST',
        body: {
          companyId,
          rfc: rfc.trim().toUpperCase(),
          razonSocial: razonSocial.trim(),
          regimenFiscal: regimen.trim() || null,
          email: email.trim() || null,
        },
      })
      onCreated?.(created)
    } catch (err) {
      // 409: existing supplier with same RFC. Server returns the row in `existing`
      if (err.status === 409 && err.data?.existing) {
        if (window.confirm(`Ya existe "${err.data.existing.razonSocial}" con RFC ${err.data.existing.rfc}. ¿Usar ese registro?`)) {
          onCreated?.(err.data.existing)
          return
        }
      }
      alertDialog({ message: err.message || 'Error al crear proveedor' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="prov-form">
      <label>
        <span>Razón social</span>
        <input value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} placeholder="RYSCO S.A. de C.V." />
      </label>
      <label>
        <span>RFC</span>
        <input
          value={rfc}
          onChange={(e) => setRfc(e.target.value.toUpperCase())}
          placeholder="XAXX010101000"
          maxLength={13}
          style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}
        />
      </label>
      <div className="row">
        <label>
          <span>Régimen fiscal (opcional)</span>
          <input value={regimen} onChange={(e) => setRegimen(e.target.value)} placeholder="601, 612…" />
        </label>
        <label>
          <span>Email (opcional)</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contacto@proveedor.mx" />
        </label>
      </div>
      <div className="modal-actions">
        <button type="button" onClick={onClose}>Cancelar</button>
        <button type="submit" className="primary" disabled={busy}>{busy ? 'Creando…' : 'Crear proveedor'}</button>
      </div>
    </form>
  )
}
