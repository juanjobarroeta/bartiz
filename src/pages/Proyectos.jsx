/**
 * Proyectos — first page wired to contabilidad-os.
 *
 * Calls GET /api/construccion/proyectos?companyId=<active>
 * Creates via POST /api/construccion/proyectos
 *
 * Every other page in this app still talks to the old Express server and
 * will error when opened. This one is the proof that the cross-origin
 * bearer-token flow works end to end.
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../config/api'
import './Proyectos.css'

const ESTADO_LABEL = {
  PLANEACION: 'Planeación',
  EN_EJECUCION: 'En ejecución',
  SUSPENDIDO: 'Suspendido',
  TERMINADO: 'Terminado',
  CANCELADO: 'Cancelado',
}

const TIPO_LABEL = {
  GOBIERNO: 'Gobierno',
  PRIVADO: 'Privado',
  MIXTO: 'Mixto',
}

const fmtMoney = (n) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        maximumFractionDigits: 0,
      }).format(Number(n))

export default function Proyectos() {
  const navigate = useNavigate()
  const { activeCompany, companies, selectCompany, user, logout } = useAuth()

  const [proyectos, setProyectos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [nuevo, setNuevo] = useState({
    codigo: '',
    nombre: '',
    descripcion: '',
    ubicacion: '',
    tipo: 'PRIVADO',
    montoContratado: '',
  })

  const cargar = useCallback(async () => {
    if (!activeCompany?.id) {
      setProyectos([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch(
        `/api/construccion/proyectos?companyId=${encodeURIComponent(activeCompany.id)}`
      )
      setProyectos(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Error al cargar proyectos')
      setProyectos([])
    } finally {
      setLoading(false)
    }
  }, [activeCompany?.id])

  useEffect(() => {
    cargar()
  }, [cargar])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!activeCompany?.id) return
    setSubmitting(true)
    setError(null)
    try {
      const body = {
        companyId: activeCompany.id,
        codigo: nuevo.codigo.trim(),
        nombre: nuevo.nombre.trim(),
        descripcion: nuevo.descripcion.trim() || undefined,
        ubicacion: nuevo.ubicacion.trim() || undefined,
        tipo: nuevo.tipo,
      }
      if (nuevo.montoContratado) {
        const parsed = parseFloat(nuevo.montoContratado)
        if (parsed > 0) body.montoContratado = parsed
      }
      const created = await apiFetch('/api/construccion/proyectos', {
        method: 'POST',
        body,
      })
      setProyectos((prev) => [created, ...prev])
      setNuevo({
        codigo: '',
        nombre: '',
        descripcion: '',
        ubicacion: '',
        tipo: 'PRIVADO',
        montoContratado: '',
      })
      setMostrarFormulario(false)
    } catch (err) {
      setError(err.message || 'Error al crear proyecto')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Empty states ──────────────────────────────────────────────────────────
  if (!companies.length) {
    return (
      <div className="proyectos-page">
        <header className="proyectos-header">
          <h1>Proyectos</h1>
        </header>
        <div className="empty-card">
          <h2>No tienes empresas disponibles</h2>
          <p>
            Inicia sesión con una cuenta que pertenezca a al menos una empresa
            en contabilidad-os.
          </p>
          <button onClick={logout}>Cerrar sesión</button>
        </div>
      </div>
    )
  }

  const construccionCompanies = companies.filter((c) =>
    c.modulos?.includes('CONSTRUCCION')
  )
  if (!construccionCompanies.length) {
    return (
      <div className="proyectos-page">
        <header className="proyectos-header">
          <h1>Proyectos</h1>
        </header>
        <div className="empty-card">
          <h2>Módulo de Construcción no habilitado</h2>
          <p>
            Ninguna de tus empresas tiene el add-on de Construcción activo.
            Contacta soporte para habilitarlo.
          </p>
          <p className="muted">Cuenta: {user?.email}</p>
          <button onClick={logout}>Cerrar sesión</button>
        </div>
      </div>
    )
  }

  return (
    <div className="proyectos-page">
      <header className="proyectos-header">
        <div>
          <h1>Proyectos</h1>
          <p className="muted">
            Conectado a contabilidad-os · {user?.email}
          </p>
        </div>
        <div className="header-actions">
          <select
            value={activeCompany?.id ?? ''}
            onChange={(e) => selectCompany(e.target.value)}
          >
            {construccionCompanies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.razonSocial} ({c.rfc})
              </option>
            ))}
          </select>
          <button
            className="primary"
            onClick={() => setMostrarFormulario((v) => !v)}
          >
            {mostrarFormulario ? 'Cancelar' : '+ Nuevo proyecto'}
          </button>
          <button className="link" onClick={logout}>
            Salir
          </button>
        </div>
      </header>

      {error && <div className="error-banner">{error}</div>}

      {mostrarFormulario && (
        <form className="nuevo-proyecto" onSubmit={handleSubmit}>
          <div className="row">
            <label>
              Código
              <input
                required
                value={nuevo.codigo}
                onChange={(e) => setNuevo({ ...nuevo, codigo: e.target.value })}
                placeholder="OBR-2026-001"
              />
            </label>
            <label>
              Nombre
              <input
                required
                value={nuevo.nombre}
                onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                placeholder="Rehabilitación Av. Reforma"
              />
            </label>
            <label>
              Tipo
              <select
                value={nuevo.tipo}
                onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })}
              >
                <option value="PRIVADO">Privado</option>
                <option value="GOBIERNO">Gobierno</option>
                <option value="MIXTO">Mixto</option>
              </select>
            </label>
          </div>
          <div className="row">
            <label className="grow">
              Ubicación
              <input
                value={nuevo.ubicacion}
                onChange={(e) => setNuevo({ ...nuevo, ubicacion: e.target.value })}
                placeholder="Puebla, Puebla"
              />
            </label>
            <label>
              Monto contratado
              <input
                type="number"
                min="0"
                step="0.01"
                value={nuevo.montoContratado}
                onChange={(e) =>
                  setNuevo({ ...nuevo, montoContratado: e.target.value })
                }
                placeholder="0.00"
              />
            </label>
          </div>
          <label>
            Descripción
            <textarea
              rows={2}
              value={nuevo.descripcion}
              onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })}
            />
          </label>
          <div className="form-actions">
            <button type="submit" disabled={submitting}>
              {submitting ? 'Creando…' : 'Crear proyecto'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="state-card">Cargando proyectos…</div>
      ) : proyectos.length === 0 ? (
        <div className="state-card">
          Aún no hay proyectos para esta empresa. Crea el primero.
        </div>
      ) : (
        <table className="proyectos-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Contratado</th>
              <th style={{ textAlign: 'right' }}>Presupuestos</th>
              <th style={{ textAlign: 'right' }}>Estimaciones</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {proyectos.map((p) => (
              <tr key={p.id}>
                <td className="mono">{p.codigo}</td>
                <td>{p.nombre}</td>
                <td>{TIPO_LABEL[p.tipo] ?? p.tipo}</td>
                <td>{p.customer?.razonSocial ?? '—'}</td>
                <td>
                  <span className={`badge estado-${p.estado?.toLowerCase()}`}>
                    {ESTADO_LABEL[p.estado] ?? p.estado}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>{fmtMoney(p.montoContratado)}</td>
                <td style={{ textAlign: 'right' }}>{p._count?.presupuestos ?? 0}</td>
                <td style={{ textAlign: 'right' }}>{p._count?.estimaciones ?? 0}</td>
                <td>
                  <button
                    className="link"
                    onClick={() => navigate(`/proyectos/${p.id}`)}
                  >
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
