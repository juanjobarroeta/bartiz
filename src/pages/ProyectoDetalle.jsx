/**
 * ProyectoDetalle — tabbed project dashboard.
 *
 * Tabs: Resumen | Presupuestos | Estimaciones | Compras | Pagos | Bitácora
 *
 * The header + KPI bar are always visible. Each tab renders a focused section.
 * No transactional actions in the header area — everything lives in its tab.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../config/api'
import './ProyectoDetalle.css'

const ESTADO_LABEL = {
  PLANEACION: 'Planeación', EN_EJECUCION: 'En ejecución',
  SUSPENDIDO: 'Suspendido', TERMINADO: 'Terminado', CANCELADO: 'Cancelado',
}
const TIPO_LABEL = { GOBIERNO: 'Gobierno', PRIVADO: 'Privado', MIXTO: 'Mixto' }
const PRES_ESTADO = {
  BORRADOR: 'Borrador', APROBADO: 'Aprobado', EN_EJECUCION: 'En ejecución',
  CERRADO: 'Cerrado', RECHAZADO: 'Rechazado',
}
const EST_ESTADO = {
  BORRADOR: 'Borrador', APROBADA: 'Aprobada', TIMBRADA: 'Timbrada',
  PAGADA: 'Pagada', CANCELADA: 'Cancelada',
}
const SOL_ESTADO = {
  PENDIENTE: 'Pendiente', APROBADA: 'Aprobada', RECHAZADA: 'Rechazada',
  PAGADA: 'Pagada', CANCELADA: 'Cancelada',
}
const PAGO_TIPO = { ANTICIPO: 'Anticipo', ESTIMACION: 'Estimación', RETENCION_LIBERADA: 'Retención liberada' }
const BIT_TIPO = { NOTA: 'Nota', DECISION: 'Decisión', PROBLEMA: 'Problema', CLIMA: 'Clima', FOTO: 'Foto' }

const fmtMoney = (n) => n == null ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(n))
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'presupuestos', label: 'Presupuestos' },
  { id: 'unidades', label: 'Unidades' },
  { id: 'estimaciones', label: 'Estimaciones' },
  { id: 'compras', label: 'Compras' },
  { id: 'pagos', label: 'Pagos' },
  { id: 'bitacora', label: 'Bitácora' },
]

export default function ProyectoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeCompany } = useAuth()

  const [proyecto, setProyecto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('resumen')

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch(`/api/construccion/proyectos/${encodeURIComponent(id)}`)
      setProyecto(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { cargar() }, [cargar])

  const contrato = useMemo(() =>
    (proyecto?.presupuestos ?? []).find(p => p.tipoPresupuesto === 'CONTRATO' && (p.estado === 'APROBADO' || p.estado === 'EN_EJECUCION')),
    [proyecto]
  )
  const ejecutado = useMemo(() =>
    (proyecto?.presupuestos ?? []).find(p => p.tipoPresupuesto === 'EJECUTADO'),
    [proyecto]
  )

  if (loading) return <div className="pd-page"><div className="pd-state">Cargando proyecto…</div></div>
  if (error || !proyecto) return (
    <div className="pd-page">
      <button className="pd-back" onClick={() => navigate('/proyectos')}>← Proyectos</button>
      <div className="pd-state pd-error">{error ?? 'Proyecto no encontrado'}</div>
    </div>
  )

  const totalPagos = (proyecto.pagos ?? []).reduce((a, p) => a + (Number(p.monto) || 0), 0)
  const solicitudesPagadas = (proyecto.solicitudesCompra ?? []).filter(s => s.estado === 'PAGADA').reduce((a, s) => a + (Number(s.total) || 0), 0)
  const estimacionesTimbradas = (proyecto.estimaciones ?? []).filter(e => e.estado === 'TIMBRADA' || e.estado === 'PAGADA').reduce((a, e) => a + (Number(e.subtotal) || 0), 0)

  return (
    <div className="pd-page">
      <button className="pd-back" onClick={() => navigate('/proyectos')}>← Proyectos</button>

      <header className="pd-header">
        <div>
          <div className="pd-codigo">{proyecto.codigo}</div>
          <h1>{proyecto.nombre}</h1>
          <div className="pd-meta">
            <span className={`badge estado-${proyecto.estado?.toLowerCase()}`}>{ESTADO_LABEL[proyecto.estado] ?? proyecto.estado}</span>
            <span className="badge">{TIPO_LABEL[proyecto.tipo] ?? proyecto.tipo}</span>
            {proyecto.customer && <span className="pd-meta-item">{proyecto.customer.razonSocial}</span>}
            {proyecto.ubicacion && <span className="pd-meta-item">📍 {proyecto.ubicacion}</span>}
          </div>
        </div>
      </header>

      <div className="pd-kpis">
        <div className="pd-kpi">
          <div className="pd-kpi-label">Contratado</div>
          <div className="pd-kpi-value">{fmtMoney(proyecto.montoContratado)}</div>
        </div>
        <div className="pd-kpi">
          <div className="pd-kpi-label">Costo ejecutado</div>
          <div className="pd-kpi-value">{ejecutado ? fmtMoney(ejecutado.montoTotal) : '—'}</div>
          {ejecutado && contrato && ejecutado.montoTotal !== contrato.montoTotal && (
            <div className="pd-kpi-sub" style={{ color: ejecutado.montoTotal > contrato.montoTotal ? '#dc2626' : '#16a34a' }}>
              {ejecutado.montoTotal > contrato.montoTotal ? '▲' : '▼'} {fmtMoney(Math.abs(ejecutado.montoTotal - contrato.montoTotal))} vs contrato
            </div>
          )}
        </div>
        <div className="pd-kpi">
          <div className="pd-kpi-label">Facturado</div>
          <div className="pd-kpi-value">{fmtMoney(estimacionesTimbradas)}</div>
        </div>
        <div className="pd-kpi">
          <div className="pd-kpi-label">Gastado</div>
          <div className="pd-kpi-value">{fmtMoney(solicitudesPagadas)}</div>
        </div>
        <div className="pd-kpi">
          <div className="pd-kpi-label">Pagos recibidos</div>
          <div className="pd-kpi-value">{fmtMoney(totalPagos)}</div>
        </div>
      </div>

      <nav className="pd-tabs">
        {TABS.map(t => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === 'bitacora' && (proyecto.bitacora?.length > 0) && <span className="tab-count">{proyecto.bitacora.length}</span>}
            {t.id === 'pagos' && (proyecto.pagos?.length > 0) && <span className="tab-count">{proyecto.pagos.length}</span>}
          </button>
        ))}
      </nav>

      <div className="pd-tab-content">
        {tab === 'resumen' && <ResumenTab proyecto={proyecto} contrato={contrato} ejecutado={ejecutado} />}
        {tab === 'presupuestos' && <PresupuestosTab proyecto={proyecto} contrato={contrato} ejecutado={ejecutado} navigate={navigate} onRefresh={cargar} />}
        {tab === 'unidades' && <UnidadesTab proyecto={proyecto} onRefresh={cargar} />}
        {tab === 'estimaciones' && <EstimacionesTab proyecto={proyecto} navigate={navigate} />}
        {tab === 'compras' && <ComprasTab proyecto={proyecto} />}
        {tab === 'pagos' && <PagosTab proyecto={proyecto} companyId={activeCompany?.id} onRefresh={cargar} />}
        {tab === 'bitacora' && <BitacoraTab proyecto={proyecto} ejecutado={ejecutado} onRefresh={cargar} />}
      </div>
    </div>
  )
}

// ── Resumen Tab ─────────────────────────────────────────────────────────────

function ResumenTab({ proyecto, contrato, ejecutado }) {
  if (!contrato) {
    return <div className="pd-empty">Aprueba un presupuesto contrato para ver el resumen financiero.</div>
  }

  // Compute from contrato partidas — skip rollup branches (they have null
  // concepto + null cantidad and their importes are sums of children; including
  // them would double-count).
  let contratoCD = 0, contratoTotal = 0
  for (const p of contrato.partidas ?? []) {
    if (p.esRollup) continue
    contratoCD += (p.cantidad ?? 0) * (p.concepto?.apuActual?.costoDirecto ?? 0)
    contratoTotal += p.importe ?? 0
  }

  // Compute from ejecutado partidas (if exists)
  let ejecutadoCD = 0, ejecutadoTotal = 0
  if (ejecutado) {
    for (const p of ejecutado.partidas ?? []) {
      if (p.esRollup) continue
      ejecutadoCD += (p.cantidad ?? 0) * (p.concepto?.apuActual?.costoDirecto ?? 0)
      ejecutadoTotal += p.importe ?? 0
    }
  }

  const solicitudesPagadas = (proyecto.solicitudesCompra ?? []).filter(s => s.estado === 'PAGADA').reduce((a, s) => a + (Number(s.total) || 0), 0)
  const margenContrato = contratoTotal > 0 ? ((contratoTotal - contratoCD) / contratoTotal * 100) : 0

  return (
    <div className="pd-fin-grid">
      <div className="pd-fin-card">
        <h3>Contrato (cliente paga)</h3>
        <dl>
          <dt>Monto contratado</dt><dd>{fmtMoney(contratoTotal)}</dd>
          <dt>Costo directo</dt><dd>{fmtMoney(contratoCD)}</dd>
          <dt>Margen presupuestado</dt><dd><strong>{margenContrato.toFixed(1)}%</strong></dd>
        </dl>
      </div>
      <div className="pd-fin-card">
        <h3>Ejecutado (costo real estimado)</h3>
        {ejecutado ? (
          <dl>
            <dt>Monto ejecutado</dt><dd>{fmtMoney(ejecutadoTotal)}</dd>
            <dt>Costo directo</dt><dd>{fmtMoney(ejecutadoCD)}</dd>
            <dt>Desviación vs contrato</dt>
            <dd style={{ color: ejecutadoTotal > contratoTotal ? '#dc2626' : '#16a34a' }}>
              <strong>{fmtMoney(ejecutadoTotal - contratoTotal)}</strong>
            </dd>
          </dl>
        ) : (
          <div className="pd-empty-mini">Crea el ejecutado en la pestaña Presupuestos.</div>
        )}
      </div>
      <div className="pd-fin-card pd-fin-margin">
        <h3>Gastado real</h3>
        <dl>
          <dt>Compras pagadas</dt><dd>{fmtMoney(solicitudesPagadas)}</dd>
          <dt>% del costo ejecutado</dt>
          <dd>{ejecutadoCD > 0 ? (solicitudesPagadas / ejecutadoCD * 100).toFixed(1) + '%' : '—'}</dd>
          <dt>Por gastar</dt>
          <dd>{ejecutado ? fmtMoney(ejecutadoTotal - solicitudesPagadas) : '—'}</dd>
        </dl>
      </div>

      <AvancePresupuestoPorPartida proyecto={proyecto} contrato={contrato} ejecutado={ejecutado} />
    </div>
  )
}

// ── Avance + Presupuesto por partida ────────────────────────────────────────

function AvancePresupuestoPorPartida({ proyecto, contrato, ejecutado }) {
  // Use ejecutado as the basis if it exists, else contrato
  const basis = ejecutado ?? contrato
  if (!basis?.partidas?.length) return null

  // Aggregate: for each presupuestoPartida (contrato version — that's what estimaciones reference)
  // compute cantidadEjecutadaAcumulada from estimaciones.partidas
  const avancePorPartida = new Map()
  for (const est of proyecto.estimaciones ?? []) {
    if (est.estado !== 'TIMBRADA' && est.estado !== 'PAGADA' && est.estado !== 'BORRADOR') continue
    for (const p of est.partidas ?? []) {
      if (!p.presupuestoPartidaId) continue
      const cur = avancePorPartida.get(p.presupuestoPartidaId) ?? 0
      avancePorPartida.set(p.presupuestoPartidaId, cur + (Number(p.cantidadEjecutada) || 0))
    }
  }

  // Aggregate: gastado real per ejecutado partida (from paid solicitudes with presupuestoPartidaId link)
  const gastadoPorPartida = new Map()
  for (const sol of proyecto.solicitudesCompra ?? []) {
    if (sol.estado !== 'PAGADA') continue
    for (const sp of sol.partidas ?? []) {
      if (!sp.presupuestoPartidaId) continue
      const cur = gastadoPorPartida.get(sp.presupuestoPartidaId) ?? 0
      gastadoPorPartida.set(sp.presupuestoPartidaId, cur + (Number(sp.importe) || 0))
    }
  }

  // Group partidas by zona → partida — only leaves (rollup branches are
  // grouping nodes, their importe/cantidad are sums we'd double-count).
  const grouped = new Map()
  for (const p of basis.partidas) {
    if (p.esRollup) continue
    const key = `${p.zona ?? 'Sin zona'}__${p.partida ?? 'Sin partida'}`
    if (!grouped.has(key)) {
      grouped.set(key, { zona: p.zona, partida: p.partida, rows: [] })
    }
    grouped.get(key).rows.push(p)
  }

  return (
    <details className="pd-avance-section">
      <summary>Avance y presupuesto por partida</summary>

      {[...grouped.values()].map((g, idx) => {
        const groupPresup = g.rows.reduce((a, r) => a + (Number(r.importe) || 0), 0)
        const groupGastado = g.rows.reduce((a, r) => a + (gastadoPorPartida.get(r.id) ?? 0), 0)
        const groupCantTotal = g.rows.reduce((a, r) => a + (Number(r.cantidad) || 0), 0)
        const groupCantEjec = g.rows.reduce((a, r) => a + (avancePorPartida.get(r.contratoPartidaId ?? r.id) ?? 0), 0)
        const avancePct = groupCantTotal > 0 ? (groupCantEjec / groupCantTotal * 100) : 0
        const gastoPct = groupPresup > 0 ? (groupGastado / groupPresup * 100) : 0

        return (
          <div key={idx} className="pd-avance-group">
            <div className="pd-avance-group-head">
              <strong>{g.zona} → {g.partida}</strong>
              <span className="muted">{g.rows.length} concepto(s)</span>
            </div>
            <div className="pd-avance-bars">
              <div className="pd-avance-bar-row">
                <span className="label">Avance</span>
                <div className="pd-avance-bar">
                  <div className="pd-avance-bar-fill avance" style={{ width: `${Math.min(avancePct, 100)}%` }} />
                </div>
                <span className="pct">{avancePct.toFixed(1)}%</span>
              </div>
              <div className="pd-avance-bar-row">
                <span className="label">Gasto</span>
                <div className="pd-avance-bar">
                  <div
                    className={`pd-avance-bar-fill gasto ${gastoPct > 100 ? 'over' : ''}`}
                    style={{ width: `${Math.min(gastoPct, 100)}%` }}
                  />
                </div>
                <span className="pct">
                  {fmtMoney(groupGastado)} / {fmtMoney(groupPresup)} · {gastoPct.toFixed(1)}%
                </span>
              </div>
            </div>

            <table className="pd-avance-table">
              <thead>
                <tr>
                  <th>Concepto</th>
                  <th style={{ width: 90, textAlign: 'right' }}>Cant. total</th>
                  <th style={{ width: 90, textAlign: 'right' }}>Ejecutada</th>
                  <th style={{ width: 60, textAlign: 'right' }}>%</th>
                  <th style={{ width: 110, textAlign: 'right' }}>Presupuestado</th>
                  <th style={{ width: 110, textAlign: 'right' }}>Gastado</th>
                  <th style={{ width: 60, textAlign: 'right' }}>%</th>
                </tr>
              </thead>
              <tbody>
                {g.rows.map(r => {
                  // Avance is tracked on the CONTRATO partida (that's what estimaciones reference).
                  // If this row is an ejecutado partida, look up via its contratoPartidaId link.
                  // Brand-new ejecutado concepts (no contrato link) show 0% avance, which is correct.
                  const avanceKey = r.contratoPartidaId ?? r.id
                  const ejec = avancePorPartida.get(avanceKey) ?? 0
                  const gast = gastadoPorPartida.get(r.id) ?? 0
                  const pctAvance = r.cantidad > 0 ? (ejec / r.cantidad * 100) : 0
                  const pctGasto = r.importe > 0 ? (gast / r.importe * 100) : 0
                  return (
                    <tr key={r.id}>
                      <td>
                        <span className="mono">{r.concepto?.codigo}</span>
                        <span style={{ color: '#64748b', fontSize: '0.78rem', marginLeft: '0.4rem' }}>
                          {r.concepto?.descripcion?.slice(0, 50)}…
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {(r.cantidad ?? 0).toFixed(2)} {r.concepto?.unidad}
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {ejec.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', color: pctAvance >= 100 ? '#16a34a' : '#0f172a' }}>
                        {pctAvance.toFixed(0)}%
                      </td>
                      <td style={{ textAlign: 'right' }}>{fmtMoney(r.importe)}</td>
                      <td style={{ textAlign: 'right' }}>{gast > 0 ? fmtMoney(gast) : '—'}</td>
                      <td style={{ textAlign: 'right', color: pctGasto > 100 ? '#dc2626' : pctGasto > 80 ? '#ea580c' : '#0f172a' }}>
                        {gast > 0 ? `${pctGasto.toFixed(0)}%` : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}
    </details>
  )
}

// ── Presupuestos Tab ────────────────────────────────────────────────────────

function PresupuestosTab({ proyecto, contrato, ejecutado, navigate, onRefresh }) {
  const [creating, setCreating] = useState(false)

  const crearEjecutado = async () => {
    if (!contrato) { window.alert('Aprueba un contrato primero.'); return }
    setCreating(true)
    try {
      const res = await apiFetch(`/api/construccion/presupuestos/${contrato.id}/crear-ejecutado`, { method: 'POST' })
      window.alert('✓ Ejecutado creado. Ahora puedes editarlo para reflejar la realidad de la obra.')
      onRefresh()
    } catch (err) { window.alert(err.message) }
    finally { setCreating(false) }
  }

  return (
    <div>
      <div className="pd-pres-list">
        {(proyecto.presupuestos ?? []).map(p => (
          <div key={p.id} className={`pd-pres-card ${p.tipoPresupuesto === 'EJECUTADO' ? 'ejecutado' : ''}`}>
            <div className="pd-pres-card-head">
              <div>
                <span className={`badge tipo-${p.tipoPresupuesto?.toLowerCase()}`}>
                  {p.tipoPresupuesto === 'EJECUTADO' ? '📐 Ejecutado' : '📄 Contrato'}
                </span>
                <strong> {p.nombre ?? `Presupuesto v${p.version}`}</strong>
                <span className="muted"> · v{p.version} · {p._count?.partidas ?? 0} partidas</span>
              </div>
              <div className="pd-pres-card-right">
                <span className={`badge estado-${p.estado?.toLowerCase()}`}>{PRES_ESTADO[p.estado] ?? p.estado}</span>
                <span className="mono">{fmtMoney(p.montoTotal)}</span>
              </div>
            </div>
            <div className="pd-pres-card-actions">
              <button className="link" onClick={() => navigate(`/presupuesto/${p.id}`)}>
                {p.tipoPresupuesto === 'EJECUTADO' ? 'Editar →' : 'Ver →'}
              </button>
              {p.versiones?.length > 0 && (
                <span className="muted" style={{ fontSize: '0.78rem' }}>
                  {p.versiones.length} versión(es) · última: {p.versiones[0]?.descripcion}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {contrato && !ejecutado && (
        <button className="pd-create-ejecutado" onClick={crearEjecutado} disabled={creating}>
          {creating ? 'Creando…' : '📐 Crear presupuesto ejecutado (copia del contrato para editar)'}
        </button>
      )}
    </div>
  )
}

// ── Unidades Tab ────────────────────────────────────────────────────────────
//
// Torre / Nivel / Depto subdivisions of a proyecto. Decolsa's Torres Platino
// needs three Torres (A/B/C) × ~12 deptos each; Bartiz projects may have
// zero unidades and that's fine — the tab just shows empty state.
//
// Uses the GET/POST /proyectos/[id]/unidades + PUT/DELETE
// /unidades/[id] endpoints; tree is rendered recursively.

function UnidadesTab({ proyecto, onRefresh }) {
  // Seed from the server's initial include. After any mutation we refetch
  // via /unidades instead of bouncing the whole proyecto payload.
  const [unidades, setUnidades] = useState(proyecto.unidades ?? [])
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    try {
      const data = await apiFetch(
        `/api/construccion/proyectos/${proyecto.id}/unidades`
      )
      setUnidades(Array.isArray(data) ? data : [])
    } catch (err) {
      window.alert(err.message || 'Error al cargar unidades')
    }
  }, [proyecto.id])

  useEffect(() => {
    // If the outer proyecto refresh gave us unidades, trust them — no extra
    // round-trip. Otherwise (e.g. before the backend change ships), go fetch.
    if (proyecto.unidades !== undefined) {
      setUnidades(proyecto.unidades ?? [])
    } else {
      reload()
    }
  }, [proyecto, reload])

  const createUnidad = async ({ parentId = null, tipo = null } = {}) => {
    const nombre = window.prompt(
      parentId ? 'Nombre de la sub-unidad:' : 'Nombre de la unidad (ej. Torre A):'
    )
    if (!nombre) return
    const codigo = window.prompt('Código (opcional, ej. T-A o 101):') || null
    setBusy(true)
    try {
      await apiFetch(
        `/api/construccion/proyectos/${proyecto.id}/unidades`,
        {
          method: 'POST',
          body: {
            nombre: nombre.trim(),
            tipo,
            codigo: codigo?.trim() || undefined,
            parentId,
          },
        }
      )
      await reload()
      if (onRefresh) onRefresh() // keep outer proyecto payload in sync
    } catch (err) {
      window.alert(err.message || 'Error al crear unidad')
    } finally {
      setBusy(false)
    }
  }

  const renameUnidad = async (u) => {
    const nombre = window.prompt('Nuevo nombre:', u.nombre)
    if (!nombre || nombre === u.nombre) return
    setBusy(true)
    try {
      await apiFetch(
        `/api/construccion/proyectos/${proyecto.id}/unidades/${u.id}`,
        { method: 'PUT', body: { nombre: nombre.trim() } }
      )
      await reload()
      if (onRefresh) onRefresh()
    } catch (err) {
      window.alert(err.message || 'Error al renombrar')
    } finally {
      setBusy(false)
    }
  }

  const deleteUnidad = async (u) => {
    if (!window.confirm(`Eliminar "${u.nombre}"? Debe no tener sub-unidades.`)) return
    setBusy(true)
    try {
      await apiFetch(
        `/api/construccion/proyectos/${proyecto.id}/unidades/${u.id}`,
        { method: 'DELETE' }
      )
      await reload()
      if (onRefresh) onRefresh()
    } catch (err) {
      window.alert(err.message || 'Error al eliminar')
    } finally {
      setBusy(false)
    }
  }

  // Assemble tree from the flat list (server returns sorted by parentId, orden)
  const roots = useMemo(() => {
    const byParent = new Map()
    for (const u of unidades) {
      const key = u.parentId ?? '__root__'
      if (!byParent.has(key)) byParent.set(key, [])
      byParent.get(key).push(u)
    }
    const build = (parentKey) =>
      (byParent.get(parentKey) ?? []).map((u) => ({
        ...u,
        children: build(u.id),
      }))
    return build('__root__')
  }, [unidades])

  if (unidades.length === 0) {
    return (
      <div>
        <div className="pd-empty">
          No hay unidades definidas. Úsalas para dividir el proyecto en
          torres, niveles o deptos.
        </div>
        <button
          className="primary"
          style={{ marginTop: '1rem' }}
          disabled={busy}
          onClick={() => createUnidad({ tipo: 'TORRE' })}
        >
          + Crear primera unidad
        </button>
      </div>
    )
  }

  return (
    <div className="pd-unidades">
      <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.5rem' }}>
        <button
          className="secondary"
          disabled={busy}
          onClick={() => createUnidad({ tipo: 'TORRE' })}
        >
          + Torre / sección raíz
        </button>
      </div>

      <ul className="pd-unidad-tree" style={{ listStyle: 'none', padding: 0 }}>
        {roots.map((u) => (
          <UnidadNode
            key={u.id}
            unidad={u}
            depth={0}
            busy={busy}
            onAddChild={(parent) => createUnidad({ parentId: parent.id })}
            onRename={renameUnidad}
            onDelete={deleteUnidad}
          />
        ))}
      </ul>
    </div>
  )
}

function UnidadNode({ unidad, depth, busy, onAddChild, onRename, onDelete }) {
  return (
    <li
      style={{
        marginLeft: depth * 20,
        padding: '0.4rem 0.6rem',
        borderLeft: depth > 0 ? '2px solid #e2e8f0' : 'none',
        borderBottom: '1px solid #f1f5f9',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.9rem' }}>
        <strong>{unidad.nombre}</strong>
        {unidad.codigo && (
          <span className="mono" style={{ color: '#64748b', fontSize: '0.78rem' }}>
            {unidad.codigo}
          </span>
        )}
        {unidad.tipo && (
          <span
            style={{
              fontSize: '0.7rem',
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {unidad.tipo}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.35rem' }}>
          <button
            className="link small"
            disabled={busy}
            onClick={() => onAddChild(unidad)}
            title="Crear sub-unidad"
          >
            + sub
          </button>
          <button
            className="link small"
            disabled={busy}
            onClick={() => onRename(unidad)}
          >
            renombrar
          </button>
          <button
            className="link small danger"
            disabled={busy || (unidad.children ?? []).length > 0}
            onClick={() => onDelete(unidad)}
            title={
              (unidad.children ?? []).length > 0
                ? 'Elimina primero las sub-unidades'
                : undefined
            }
          >
            eliminar
          </button>
        </div>
      </div>
      {(unidad.children ?? []).length > 0 && (
        <ul className="pd-unidad-tree" style={{ listStyle: 'none', padding: 0, marginTop: '0.3rem' }}>
          {unidad.children.map((c) => (
            <UnidadNode
              key={c.id}
              unidad={c}
              depth={depth + 1}
              busy={busy}
              onAddChild={onAddChild}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

// ── Estimaciones Tab ────────────────────────────────────────────────────────

function EstimacionesTab({ proyecto, navigate }) {
  return (
    <div>
      {(proyecto.estimaciones ?? []).length === 0 ? (
        <div className="pd-empty">No hay estimaciones aún.</div>
      ) : (
        <table className="pd-table">
          <thead><tr><th>#</th><th>Período</th><th>Estado</th><th style={{textAlign:'right'}}>Subtotal</th><th style={{textAlign:'right'}}>Total</th></tr></thead>
          <tbody>
            {(proyecto.estimaciones ?? []).map(e => (
              <tr key={e.id}>
                <td>{e.numero}</td>
                <td className="small">{fmtDate(e.periodoInicio)} → {fmtDate(e.periodoFin)}</td>
                <td><span className={`badge estado-${e.estado?.toLowerCase()}`}>{EST_ESTADO[e.estado] ?? e.estado}</span></td>
                <td style={{textAlign:'right'}}>{fmtMoney(e.subtotal)}</td>
                <td style={{textAlign:'right'}}>{fmtMoney(e.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button className="link" style={{ marginTop: '1rem' }} onClick={() => navigate(`/estimaciones/${proyecto.id}`)}>
        Ver todas las estimaciones →
      </button>
    </div>
  )
}

// ── Compras Tab ─────────────────────────────────────────────────────────────

function ComprasTab({ proyecto }) {
  return (
    <div>
      {(proyecto.solicitudesCompra ?? []).length === 0 ? (
        <div className="pd-empty">No hay solicitudes de compra para este proyecto.</div>
      ) : (
        <table className="pd-table">
          <thead><tr><th>Folio</th><th>Proveedor</th><th>Fecha</th><th>Estado</th><th style={{textAlign:'right'}}>Total</th></tr></thead>
          <tbody>
            {(proyecto.solicitudesCompra ?? []).map(s => (
              <tr key={s.id}>
                <td className="mono">{s.folio}</td>
                <td>{s.supplier?.razonSocial ?? '—'}</td>
                <td className="small">{fmtDate(s.createdAt)}</td>
                <td><span className={`badge solicitud-${s.estado?.toLowerCase()}`}>{SOL_ESTADO[s.estado] ?? s.estado}</span></td>
                <td style={{textAlign:'right'}}>{fmtMoney(s.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Pagos Tab ───────────────────────────────────────────────────────────────

function PagosTab({ proyecto, companyId, onRefresh }) {
  const [showForm, setShowForm] = useState(false)
  const [bankAccounts, setBankAccounts] = useState([])
  const [form, setForm] = useState({ tipo: 'ANTICIPO', monto: '', referencia: '', bankAccountId: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!companyId || !showForm) return
    apiFetch(`/api/construccion/bank-accounts?companyId=${companyId}`)
      .then(d => setBankAccounts(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [companyId, showForm])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.monto) return
    setBusy(true)
    try {
      await apiFetch('/api/construccion/pagos', {
        method: 'POST',
        body: {
          proyectoId: proyecto.id,
          tipo: form.tipo,
          monto: parseFloat(form.monto),
          referencia: form.referencia || undefined,
          bankAccountId: form.bankAccountId || undefined,
        },
      })
      setShowForm(false)
      setForm({ tipo: 'ANTICIPO', monto: '', referencia: '', bankAccountId: '' })
      onRefresh()
    } catch (err) { window.alert(err.message) }
    finally { setBusy(false) }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Pagos del proyecto</h3>
        <button className="primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancelar' : '+ Registrar pago'}
        </button>
      </div>

      {showForm && (
        <form className="pd-pago-form" onSubmit={handleSubmit}>
          <div className="pd-pago-fields">
            <label>Tipo
              <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                <option value="ANTICIPO">Anticipo</option>
                <option value="ESTIMACION">Pago de estimación</option>
                <option value="RETENCION_LIBERADA">Retención liberada</option>
              </select>
            </label>
            <label>Monto
              <input type="number" min="0" step="0.01" required value={form.monto} onChange={e => setForm({...form, monto: e.target.value})} placeholder="0.00" />
            </label>
            <label>Cuenta bancaria
              <select value={form.bankAccountId} onChange={e => setForm({...form, bankAccountId: e.target.value})}>
                <option value="">Sin cuenta</option>
                {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.banco} — {b.nombre}</option>)}
              </select>
            </label>
            <label>Referencia
              <input value={form.referencia} onChange={e => setForm({...form, referencia: e.target.value})} placeholder="Nº transferencia" />
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
            <button type="submit" className="primary" disabled={busy}>{busy ? 'Registrando…' : 'Registrar'}</button>
          </div>
        </form>
      )}

      {(proyecto.pagos ?? []).length === 0 ? (
        <div className="pd-empty">No hay pagos registrados.</div>
      ) : (
        <table className="pd-table">
          <thead><tr><th>Fecha</th><th>Tipo</th><th style={{textAlign:'right'}}>Monto</th><th>Referencia</th></tr></thead>
          <tbody>
            {(proyecto.pagos ?? []).map(p => (
              <tr key={p.id}>
                <td className="small">{fmtDate(p.fecha)}</td>
                <td><span className={`badge pago-${p.tipo?.toLowerCase()}`}>{PAGO_TIPO[p.tipo] ?? p.tipo}</span></td>
                <td style={{textAlign:'right'}}><strong>{fmtMoney(p.monto)}</strong></td>
                <td className="muted">{p.referencia ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Bitácora Tab ────────────────────────────────────────────────────────────

function BitacoraTab({ proyecto, ejecutado, onRefresh }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ texto: '', tipo: 'NOTA', presupuestoPartidaId: '' })
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.texto.trim()) return
    setBusy(true)
    try {
      await apiFetch('/api/construccion/bitacora', {
        method: 'POST',
        body: {
          proyectoId: proyecto.id,
          texto: form.texto.trim(),
          tipo: form.tipo,
          presupuestoPartidaId: form.presupuestoPartidaId || undefined,
        },
      })
      setShowForm(false)
      setForm({ texto: '', tipo: 'NOTA', presupuestoPartidaId: '' })
      onRefresh()
    } catch (err) { window.alert(err.message) }
    finally { setBusy(false) }
  }

  const partidasEjecutado = ejecutado?.partidas ?? []

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Bitácora de obra</h3>
        <button className="primary" onClick={() => setShowForm(v => !v)}>
          {showForm ? 'Cancelar' : '+ Nueva entrada'}
        </button>
      </div>

      {showForm && (
        <form className="pd-bitacora-form" onSubmit={handleSubmit}>
          <div className="pd-bitacora-fields">
            <label>Tipo
              <select value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                {Object.entries(BIT_TIPO).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label>Partida (opcional)
              <select value={form.presupuestoPartidaId} onChange={e => setForm({...form, presupuestoPartidaId: e.target.value})}>
                <option value="">General</option>
                {partidasEjecutado.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.zona} → {p.partida} → {p.concepto?.codigo}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', fontSize: '0.82rem', fontWeight: 500, color: '#334155' }}>
            Nota
            <textarea rows={4} required value={form.texto} onChange={e => setForm({...form, texto: e.target.value})} placeholder="Observaciones, descubrimientos, decisiones tomadas en obra…" style={{ padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.9rem', fontFamily: 'inherit', resize: 'vertical' }} />
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
            <button type="submit" className="primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar entrada'}</button>
          </div>
        </form>
      )}

      {(proyecto.bitacora ?? []).length === 0 ? (
        <div className="pd-empty">No hay entradas en la bitácora.</div>
      ) : (
        <div className="pd-bitacora-list">
          {(proyecto.bitacora ?? []).map(entry => (
            <div key={entry.id} className="pd-bitacora-entry">
              <div className="pd-bitacora-head">
                <span className="small">{fmtDate(entry.fecha)}</span>
                <span className={`badge bit-${entry.tipo?.toLowerCase()}`}>{BIT_TIPO[entry.tipo] ?? entry.tipo}</span>
                {entry.presupuestoPartida && (
                  <span className="muted" style={{ fontSize: '0.78rem' }}>
                    {entry.presupuestoPartida.zona} → {entry.presupuestoPartida.partida} → {entry.presupuestoPartida.concepto?.codigo}
                  </span>
                )}
              </div>
              <p className="pd-bitacora-texto">{entry.texto}</p>
              {entry.fotos?.length > 0 && (
                <div className="pd-bitacora-fotos">
                  {entry.fotos.map((url, i) => (
                    <a key={i} href={url} target="_blank" rel="noreferrer" className="pd-bitacora-foto">📷</a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
