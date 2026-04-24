/**
 * Reembolsos — weekly "concentrado de gastos" packages.
 *
 * List view: one row per ReembolsoSemanal showing week dates, total,
 * estado, # gastos. Click to open detail page for line-by-line editing.
 * "+ Nuevo reembolso" creates an empty SUBMITTED package that Katia
 * then fills as she processes Rosy's WhatsApp submission.
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../config/api'
import Modal from '../components/Modal'
import '../components/Modal.css'
import './Reembolsos.css'

const fmtMoney = (n) =>
  n == null ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(n) || 0)

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }) : '—'

function NewReembolsoForm({ proyectos, bankAccounts, defaultMonday, onClose, onCreated }) {
  const [proyectoId, setProyectoId] = useState(proyectos[0]?.id ?? '')
  const cheques = bankAccounts.find(a => a.tipo === 'CHEQUES') ?? bankAccounts[0]
  const [bankAccountId, setBankAccountId] = useState(cheques?.id ?? '')
  const [lunes, setLunes] = useState(defaultMonday)
  const [anticipo, setAnticipo] = useState('0')
  const [notas, setNotas] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!proyectoId || !bankAccountId || !lunes) return
    const inicio = new Date(lunes + 'T00:00:00')
    const fin = new Date(inicio)
    fin.setDate(fin.getDate() + 6)
    fin.setHours(23, 59, 59, 999)
    setBusy(true)
    try {
      const created = await apiFetch('/api/construccion/reembolsos', {
        method: 'POST',
        body: {
          proyectoId,
          bankAccountId,
          semanaInicio: inicio.toISOString(),
          semanaFin: fin.toISOString(),
          anticipoAplicado: parseFloat(anticipo) || 0,
          notas: notas.trim() || null,
        },
      })
      onCreated?.(created.id)
    } catch (err) {
      window.alert(err.message || 'Error al crear reembolso')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="manual-form">
      <label>
        <span>Proyecto</span>
        <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)} required>
          {proyectos.map(p => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
        </select>
      </label>
      <label>
        <span>Lunes de la semana</span>
        <input type="date" value={lunes} onChange={(e) => setLunes(e.target.value)} required />
      </label>
      <label>
        <span>Cuenta bancaria (desde donde se paga)</span>
        <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} required>
          {bankAccounts.map(a => (
            <option key={a.id} value={a.id}>
              {a.banco} — {a.nombre}
              {a.tipo === 'CAJA' ? ' (Caja chica)' : a.tipo === 'TARJETA_DEPARTAMENTAL' ? ` (TD ${a.titular ?? ''})` : ''}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Anticipo previo de caja chica (opcional)</span>
        <input type="number" step="0.01" min="0" value={anticipo} onChange={(e) => setAnticipo(e.target.value)} />
      </label>
      <label>
        <span>Notas (opcional)</span>
        <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Contexto del paquete…" />
      </label>
      <div className="modal-actions">
        <button type="button" onClick={onClose}>Cancelar</button>
        <button type="submit" className="primary" disabled={busy}>{busy ? 'Creando…' : 'Crear reembolso'}</button>
      </div>
    </form>
  )
}

// Monday of the current/given week (Spanish-style: Monday = start).
function mondayOf(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0=Sun, 1=Mon
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

export default function Reembolsos() {
  const navigate = useNavigate()
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id

  const [rows, setRows] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [bankAccounts, setBankAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL') // SUBMITTED | REVISADO | REEMBOLSADO | ALL
  const [newOpen, setNewOpen] = useState(false)

  const reload = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const [list, proys, accts] = await Promise.all([
        apiFetch(`/api/construccion/reembolsos?companyId=${encodeURIComponent(companyId)}`),
        apiFetch(`/api/construccion/proyectos?companyId=${encodeURIComponent(companyId)}`),
        apiFetch(`/api/construccion/bank-accounts?companyId=${encodeURIComponent(companyId)}`).catch(() => []),
      ])
      setRows(Array.isArray(list) ? list : [])
      setProyectos(Array.isArray(proys) ? proys : [])
      setBankAccounts(Array.isArray(accts) ? accts : [])
    } catch (err) {
      console.error('Error loading reembolsos:', err)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => { reload() }, [reload])

  const openNewModal = () => {
    if (proyectos.length === 0) { window.alert('Crea un proyecto primero.'); return }
    if (bankAccounts.length === 0) { window.alert('Configura una cuenta bancaria primero (Tesorería).'); return }
    setNewOpen(true)
  }

  const filtered = filter === 'ALL' ? rows : rows.filter(r => r.estado === filter)

  if (!companyId) return <div className="pd-empty">Selecciona una empresa.</div>

  return (
    <div className="reembolsos-page">
      <header>
        <h1>Reembolsos semanales</h1>
        <p className="muted small">
          Concentrado de gastos de Rosy. Un paquete = una semana de gastos materiales + indirectos + nómina.
          Al cerrar, genera UN SPEI a Rosy.
        </p>
      </header>

      <div className="toolbar">
        <div className="filters">
          {['ALL', 'SUBMITTED', 'REVISADO', 'REEMBOLSADO'].map(f => (
            <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
              {f === 'ALL' ? 'Todos' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <button className="primary" onClick={openNewModal}>+ Nuevo reembolso</button>
      </div>

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Nuevo reembolso semanal">
        <NewReembolsoForm
          proyectos={proyectos}
          bankAccounts={bankAccounts}
          defaultMonday={mondayOf().toISOString().slice(0, 10)}
          onClose={() => setNewOpen(false)}
          onCreated={(id) => { setNewOpen(false); navigate(`/reembolsos/${id}`) }}
        />
      </Modal>

      {loading ? (
        <div className="pd-empty">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="pd-empty">
          {rows.length === 0
            ? 'No hay reembolsos aún. Crea el primero para la semana pasada.'
            : 'Nada en este filtro.'}
        </div>
      ) : (
        <table className="reembolsos-table">
          <thead>
            <tr>
              <th>Semana</th>
              <th>Proyecto</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}># gastos</th>
              <th style={{ textAlign: 'right' }}>Total gastos</th>
              <th style={{ textAlign: 'right' }}>Anticipo</th>
              <th style={{ textAlign: 'right' }}>A reembolsar</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} className="clickable" onClick={() => navigate(`/reembolsos/${r.id}`)}>
                <td>{fmtDate(r.semanaInicio)} — {fmtDate(r.semanaFin)}</td>
                <td>{r.proyecto?.codigo} <span className="muted small">{r.proyecto?.nombre}</span></td>
                <td><span className={`badge estado-${r.estado.toLowerCase()}`}>{r.estado}</span></td>
                <td style={{ textAlign: 'right' }}>{r._count?.gastos ?? 0}</td>
                <td style={{ textAlign: 'right' }}>{fmtMoney(r.totalGastos)}</td>
                <td style={{ textAlign: 'right', color: '#64748b' }}>{fmtMoney(r.anticipoAplicado)}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtMoney(r.totalReembolso)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
