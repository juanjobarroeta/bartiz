/**
 * Proyectos — portfolio list, wired to contabilidad-os.
 *
 * Rebuilt on the DECOLSA design system (`.ds`). Keeps the live data flow
 * intact: GET /api/construccion/proyectos?companyId=<active> to list,
 * POST /api/construccion/proyectos to create, plus the company switcher.
 * The page title lives in the shared topbar (see Layout REDESIGNED_ROUTES);
 * page-level controls live in the toolbar below.
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../config/api'
import { Icon } from '../components/ds/Icon'
import { money } from '../lib/format'
import { BADGE_COLORS } from '../data/dashboardSample'
import './Proyectos.css'

const ESTADO_META = {
  PLANEACION: { cls: 'plan', label: 'Planeación' },
  EN_EJECUCION: { cls: 'active', label: 'En obra' },
  EN_EJECUCIÓN: { cls: 'active', label: 'En obra' },
  SUSPENDIDO: { cls: 'risk', label: 'Suspendido' },
  TERMINADO: { cls: 'active', label: 'Terminado' },
  CANCELADO: { cls: 'risk', label: 'Cancelado' },
}

const TIPO_LABEL = { GOBIERNO: 'Gobierno', PRIVADO: 'Privado', MIXTO: 'Mixto' }

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

  // ── Empty states (no company / module) ─────────────────────────────────────
  if (!companies.length) {
    return (
      <div className="ds">
        <div className="page">
          <div className="card">
            <div className="empty" style={{ padding: 56 }}>
              <strong style={{ display: 'block', color: 'var(--ink)', marginBottom: 6 }}>
                No tienes empresas disponibles
              </strong>
              Inicia sesión con una cuenta que pertenezca a al menos una empresa en
              contabilidad-os.
              <div style={{ marginTop: 18 }}>
                <button className="btn btn-ghost" onClick={logout}>
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const construccionCompanies = companies.filter((c) => c.modulos?.includes('CONSTRUCCION'))
  if (!construccionCompanies.length) {
    return (
      <div className="ds">
        <div className="page">
          <div className="card">
            <div className="empty" style={{ padding: 56 }}>
              <strong style={{ display: 'block', color: 'var(--ink)', marginBottom: 6 }}>
                Módulo de Construcción no habilitado
              </strong>
              Ninguna de tus empresas tiene el add-on de Construcción activo. Contacta
              soporte para habilitarlo.
              <div className="mono" style={{ marginTop: 10, fontSize: 12 }}>{user?.email}</div>
              <div style={{ marginTop: 18 }}>
                <button className="btn btn-ghost" onClick={logout}>
                  Cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="ds">
      <div className="page">
        {/* toolbar */}
        <div className="page-toolbar">
          <span className="pill brand">
            <Icon name="external" style={{ width: 12, height: 12 }} />
            Conectado a contabilidad-os · {user?.email}
          </span>
          <div className="spacer" />
          {construccionCompanies.length > 1 && (
            <select
              className="input"
              style={{ width: 'auto' }}
              value={activeCompany?.id ?? ''}
              onChange={(e) => selectCompany(e.target.value)}
            >
              {construccionCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.razonSocial} ({c.rfc})
                </option>
              ))}
            </select>
          )}
          <button className="btn btn-primary" onClick={() => setMostrarFormulario((v) => !v)}>
            <Icon name={mostrarFormulario ? 'arrowLeft' : 'plus'} />
            {mostrarFormulario ? 'Cancelar' : 'Nuevo proyecto'}
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        {mostrarFormulario && (
          <div className="card" style={{ marginBottom: 'var(--gap)' }}>
            <div className="card-head">
              <h3>Nuevo proyecto</h3>
            </div>
            <form className="card-pad" onSubmit={handleSubmit}>
              <div className="form-row">
                <label className="field">
                  Código
                  <input
                    className="input"
                    required
                    value={nuevo.codigo}
                    onChange={(e) => setNuevo({ ...nuevo, codigo: e.target.value })}
                    placeholder="OBR-2026-001"
                  />
                </label>
                <label className="field">
                  Nombre
                  <input
                    className="input"
                    required
                    value={nuevo.nombre}
                    onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
                    placeholder="Rehabilitación Av. Reforma"
                  />
                </label>
                <label className="field">
                  Tipo
                  <select
                    className="input"
                    value={nuevo.tipo}
                    onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })}
                  >
                    <option value="PRIVADO">Privado</option>
                    <option value="GOBIERNO">Gobierno</option>
                    <option value="MIXTO">Mixto</option>
                  </select>
                </label>
              </div>
              <div className="form-row">
                <label className="field" style={{ flex: 2 }}>
                  Ubicación
                  <input
                    className="input"
                    value={nuevo.ubicacion}
                    onChange={(e) => setNuevo({ ...nuevo, ubicacion: e.target.value })}
                    placeholder="Puebla, Puebla"
                  />
                </label>
                <label className="field">
                  Monto contratado
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={nuevo.montoContratado}
                    onChange={(e) => setNuevo({ ...nuevo, montoContratado: e.target.value })}
                    placeholder="0.00"
                  />
                </label>
              </div>
              <label className="field" style={{ marginBottom: 16 }}>
                Descripción
                <textarea
                  className="input"
                  rows={2}
                  value={nuevo.descripcion}
                  onChange={(e) => setNuevo({ ...nuevo, descripcion: e.target.value })}
                />
              </label>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Creando…' : 'Crear proyecto'}
              </button>
            </form>
          </div>
        )}

        <div className="card">
          <div className="card-head">
            <h3>Proyectos</h3>
            <span className="hint">{proyectos.length} en cartera</span>
          </div>

          {loading ? (
            <div className="state-card">Cargando proyectos…</div>
          ) : proyectos.length === 0 ? (
            <div className="state-card">
              Aún no hay proyectos para esta empresa. Crea el primero.
            </div>
          ) : (
            <div className="scroll-x">
              <table className="ptable">
                <thead>
                  <tr>
                    <th>Proyecto</th>
                    <th>Tipo</th>
                    <th>Cliente</th>
                    <th className="r">Contratado</th>
                    <th className="r">Presup.</th>
                    <th className="r">Estim.</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {proyectos.map((p, i) => {
                    const meta = ESTADO_META[p.estado] ?? { cls: 'plan', label: p.estado ?? '—' }
                    return (
                      <tr key={p.id} onClick={() => navigate(`/proyectos/${p.id}`)}>
                        <td>
                          <div className="proj-cell">
                            <div
                              className="proj-badge"
                              style={{ background: BADGE_COLORS[i % BADGE_COLORS.length] }}
                            >
                              {(p.nombre?.[0] ?? '·').toUpperCase()}
                            </div>
                            <div>
                              <div className="proj-name">{p.nombre}</div>
                              <div className="proj-code">
                                {p.codigo}
                                {p.ubicacion ? ` · ${p.ubicacion}` : ''}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: 'var(--ink-2)', fontSize: 13.5 }}>
                          {TIPO_LABEL[p.tipo] ?? p.tipo}
                        </td>
                        <td style={{ color: 'var(--ink-2)', fontSize: 13.5 }}>
                          {p.customer?.razonSocial ?? '—'}
                        </td>
                        <td className="r">
                          <span className="money big">
                            {p.montoContratado != null ? money(p.montoContratado) : '—'}
                          </span>
                        </td>
                        <td className="r">
                          <span className="num">{p._count?.presupuestos ?? 0}</span>
                        </td>
                        <td className="r">
                          <span className="num">{p._count?.estimaciones ?? 0}</span>
                        </td>
                        <td>
                          <span className={'status ' + meta.cls}>
                            <span className="sdot" />
                            {meta.label}
                          </span>
                        </td>
                        <td className="r">
                          <span className="row-go">
                            <Icon name="chevronRight" />
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
