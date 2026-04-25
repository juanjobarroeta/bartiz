/**
 * Destajo — top-level page that lists cuadrillas + rayas across all
 * proyectos of the active company. Replaces the per-proyecto tabs that
 * Sprint 1 removed from ProyectoDetalle.
 *
 * Two views, switchable via tabs:
 *   • Cuadrillas — all active cuadrillas + their miembros
 *   • Rayas      — all rayas (filterable by estado), newest first
 *
 * Module-flag-gated: returns an empty state when CONSTRUCCION_CUADRILLAS
 * isn't enabled on the active company. Bartiz won't see destajo data
 * until that module ships for them; Decolsa already has it on.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../config/api'
import './Destajo.css'

const fmtMoney = (n) =>
  n == null ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(n) || 0)
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }) : '—'

export default function Destajo() {
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id
  const hasCuadrillas = activeCompany?.modulos?.includes('CONSTRUCCION_CUADRILLAS')

  const [tab, setTab] = useState('cuadrillas')
  const [proyectos, setProyectos] = useState([])
  const [proyectoFilter, setProyectoFilter] = useState('') // '' = all
  const [loading, setLoading] = useState(true)
  const [cuadrillas, setCuadrillas] = useState([])
  const [rayas, setRayas] = useState([])
  const [estadoFilter, setEstadoFilter] = useState('ALL')

  const reload = useCallback(async () => {
    if (!companyId || !hasCuadrillas) { setLoading(false); return }
    setLoading(true)
    try {
      const proys = await apiFetch(
        `/api/construccion/proyectos?companyId=${encodeURIComponent(companyId)}`
      )
      const proyList = Array.isArray(proys) ? proys : []
      setProyectos(proyList)

      // Cuadrillas + Rayas APIs are scoped to a single proyecto, so we
      // fan-out across all of them. For ~5-10 proyectos this is fine;
      // if the list grows, add a top-level endpoint that sums.
      const targets = proyectoFilter ? proyList.filter(p => p.id === proyectoFilter) : proyList
      const cuadResults = await Promise.all(
        targets.map((p) =>
          apiFetch(`/api/construccion/cuadrillas?proyectoId=${encodeURIComponent(p.id)}`)
            .then((d) => (Array.isArray(d) ? d.map((c) => ({ ...c, proyecto: p })) : []))
            .catch(() => [])
        )
      )
      const rayaResults = await Promise.all(
        targets.map((p) =>
          apiFetch(`/api/construccion/rayas?proyectoId=${encodeURIComponent(p.id)}`)
            .then((d) => (Array.isArray(d) ? d.map((r) => ({ ...r, proyecto: p })) : []))
            .catch(() => [])
        )
      )
      setCuadrillas(cuadResults.flat())
      setRayas(rayaResults.flat())
    } finally {
      setLoading(false)
    }
  }, [companyId, hasCuadrillas, proyectoFilter])

  useEffect(() => { reload() }, [reload])

  const filteredRayas = useMemo(() => {
    if (estadoFilter === 'ALL') return rayas
    return rayas.filter((r) => r.estado === estadoFilter)
  }, [rayas, estadoFilter])

  if (!companyId) return <div className="pd-empty">Selecciona una empresa.</div>
  if (!hasCuadrillas) {
    return (
      <div className="destajo-page">
        <header>
          <h1>Destajo / Nómina</h1>
          <p className="muted small">
            Cuadrillas, miembros y rayas semanales. Esta empresa aún no tiene
            el módulo CONSTRUCCION_CUADRILLAS habilitado — pídele al admin
            que lo encienda en contabilidad-os.
          </p>
        </header>
        <div className="pd-empty">Módulo no habilitado.</div>
      </div>
    )
  }

  return (
    <div className="destajo-page">
      <header>
        <h1>Destajo / Nómina</h1>
        <p className="muted small">
          Cuadrillas activas + rayas semanales del destajo. Cada raya = una
          semana de trabajo de una cuadrilla; al pagar se crea una
          BankTransaction debitada de la cuenta elegida.
        </p>
      </header>

      <div className="toolbar">
        <div className="filters">
          <button className={tab === 'cuadrillas' ? 'active' : ''} onClick={() => setTab('cuadrillas')}>
            Cuadrillas <span className="count">{cuadrillas.length}</span>
          </button>
          <button className={tab === 'rayas' ? 'active' : ''} onClick={() => setTab('rayas')}>
            Rayas <span className="count">{rayas.length}</span>
          </button>
        </div>
        {proyectos.length > 1 && (
          <select value={proyectoFilter} onChange={(e) => setProyectoFilter(e.target.value)}>
            <option value="">Todos los proyectos</option>
            {proyectos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo} — {p.nombre}
              </option>
            ))}
          </select>
        )}
      </div>

      {loading ? (
        <div className="pd-empty">Cargando…</div>
      ) : tab === 'cuadrillas' ? (
        cuadrillas.length === 0 ? (
          <div className="pd-empty">
            No hay cuadrillas. Créalas desde el detalle del proyecto (próximamente desde aquí).
          </div>
        ) : (
          <div className="cuadrilla-grid">
            {cuadrillas.map((c) => (
              <div key={c.id} className="cuadrilla-card">
                <div className="cuadrilla-head">
                  <strong>{c.nombre}</strong>
                  <span className="mono small muted">{c.especialidad}</span>
                </div>
                <div className="muted small">{c.proyecto?.codigo} · {c.proyecto?.nombre}</div>
                {c.jefeNombre && <div className="small">Jefe: {c.jefeNombre}</div>}
                <div className="cuadrilla-stats small muted">
                  {c.miembros?.length ?? 0} miembros · {c._count?.rayas ?? 0} rayas
                </div>
                {(c.miembros ?? []).length > 0 && (
                  <ul className="miembros">
                    {c.miembros.slice(0, 6).map((m) => (
                      <li key={m.id}>
                        {m.nombre}
                        {m.rolEnCuadrilla && <span className="muted small"> ({m.rolEnCuadrilla})</span>}
                        {m.employeeId && <span className="muted small" title="IMSS-registered"> · IMSS</span>}
                      </li>
                    ))}
                    {c.miembros.length > 6 && <li className="muted small">+{c.miembros.length - 6} más</li>}
                  </ul>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
        <>
          <div className="estado-filters">
            {['ALL', 'BORRADOR', 'APROBADA', 'PAGADA'].map((f) => (
              <button
                key={f}
                className={estadoFilter === f ? 'active' : ''}
                onClick={() => setEstadoFilter(f)}
              >
                {f === 'ALL' ? 'Todas' : f.charAt(0) + f.slice(1).toLowerCase()}
                {f === 'BORRADOR' && rayas.filter((r) => r.estado === 'BORRADOR').length > 0 && (
                  <span className="count">{rayas.filter((r) => r.estado === 'BORRADOR').length}</span>
                )}
              </button>
            ))}
          </div>
          {filteredRayas.length === 0 ? (
            <div className="pd-empty">Sin rayas en este filtro.</div>
          ) : (
            <table className="rayas-table">
              <thead>
                <tr>
                  <th>Semana</th>
                  <th>Proyecto</th>
                  <th>Cuadrilla</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Total destajo</th>
                </tr>
              </thead>
              <tbody>
                {filteredRayas.map((r) => (
                  <tr key={r.id}>
                    <td className="small">{fmtDate(r.semanaInicio)} — {fmtDate(r.semanaFin)}</td>
                    <td className="small">{r.proyecto?.codigo}</td>
                    <td>
                      {r.cuadrilla?.nombre}
                      <span className="mono small muted"> {r.cuadrilla?.especialidad}</span>
                    </td>
                    <td>
                      <span className={`badge estado-${r.estado?.toLowerCase()}`}>{r.estado}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                      <strong>{fmtMoney(r.totalDestajo)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="muted small" style={{ marginTop: '0.75rem' }}>
            Crear nueva raya o aprobar/pagar desde el detalle del proyecto. Próxima iteración: gestión completa desde aquí.
          </p>
        </>
      )}
    </div>
  )
}
