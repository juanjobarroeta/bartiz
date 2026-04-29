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
import ImportPresupuestoModal from '../components/ImportPresupuestoModal'
import BootstrapTemplateModal from '../components/BootstrapTemplateModal'
import ProgramaTab from '../components/ProgramaTab'
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

// Sprint 1 cleanup: trimmed tabs to project-specific surfaces.
// Cuadrillas + Rayas now live at top-level /destajo (cross-project view).
// Compras / Pagos will move to top-level /requisiciones + /tesoreria
// in Sprint 2-3.
// Tabs a mostrar siempre (orden = como aparecen en la UI)
const PRIMARY_TABS = [
  { id: 'resumen', label: 'Resumen' },
  { id: 'presupuestos', label: 'Presupuestos' },
  { id: 'estimaciones', label: 'Estimaciones' },
  { id: 'programa', label: 'Programa' },
  { id: 'compras', label: 'Compras' },
  { id: 'bitacora', label: 'Bitácora' },
]

// Tabs avanzados — se muestran sólo cuando ya tienen datos. Si están vacíos
// no aportan, así que no llenan la barra de navegación. Para crearlos, el
// usuario abre el menú "+ más" (botón al final de la fila).
const SECONDARY_TABS = [
  { id: 'unidades', label: 'Unidades', hasData: (p) => (p.unidades ?? []).length > 0 },
  { id: 'consumo', label: 'Explosión vs Real', hasData: (p) => (p.presupuestos ?? []).some(x => x.tipoPresupuesto === 'EJECUTADO') },
  { id: 'pagos', label: 'Pagos', hasData: (p) => (p.pagos ?? []).length > 0 },
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
  // Include approved/paid Gastos in the top-level "Gastado" KPI so the
  // card reflects both OC payments and quick WhatsApp-style expenses.
  const gastosPagadosTotal = (proyecto.gastos ?? []).filter(g => g.estado === 'PAGADO' || g.estado === 'APROBADO').reduce((a, g) => a + (Number(g.importe) || 0), 0)
  const totalGastado = solicitudesPagadas + gastosPagadosTotal
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
          <div className="pd-kpi-value">{fmtMoney(totalGastado)}</div>
        </div>
        <div className="pd-kpi">
          <div className="pd-kpi-label">Pagos recibidos</div>
          <div className="pd-kpi-value">{fmtMoney(totalPagos)}</div>
        </div>
      </div>

      <nav className="pd-tabs">
        {PRIMARY_TABS.map(t => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === 'bitacora' && (proyecto.bitacora?.length > 0) && <span className="tab-count">{proyecto.bitacora.length}</span>}
            {t.id === 'estimaciones' && (proyecto.estimaciones?.length > 0) && <span className="tab-count">{proyecto.estimaciones.length}</span>}
          </button>
        ))}
        {SECONDARY_TABS.filter(t => t.hasData(proyecto) || tab === t.id).map(t => (
          <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === 'unidades' && (proyecto.unidades?.length > 0) && <span className="tab-count">{proyecto.unidades.length}</span>}
            {t.id === 'pagos' && (proyecto.pagos?.length > 0) && <span className="tab-count">{proyecto.pagos.length}</span>}
          </button>
        ))}
        <SecondaryTabsMenu hidden={SECONDARY_TABS.filter(t => !t.hasData(proyecto) && tab !== t.id)} onPick={setTab} />
      </nav>

      <div className="pd-tab-content">
        {tab === 'resumen' && <ResumenTab proyecto={proyecto} contrato={contrato} ejecutado={ejecutado} />}
        {tab === 'unidades' && <UnidadesTab proyecto={proyecto} onRefresh={cargar} />}
        {tab === 'consumo' && <ConsumoInsumosTab proyecto={proyecto} />}
        {tab === 'presupuestos' && <PresupuestosTab proyecto={proyecto} contrato={contrato} ejecutado={ejecutado} navigate={navigate} onRefresh={cargar} />}
        {tab === 'unidades' && <UnidadesTab proyecto={proyecto} onRefresh={cargar} />}
        {tab === 'consumo' && <ConsumoInsumosTab proyecto={proyecto} />}
        {tab === 'cuadrillas' && <CuadrillasTab proyecto={proyecto} />}
        {tab === 'rayas' && <RayasTab proyecto={proyecto} />}
        {tab === 'estimaciones' && <EstimacionesTab proyecto={proyecto} navigate={navigate} activeCompany={activeCompany} />}
        {tab === 'programa' && <ProgramaTab proyecto={proyecto} />}
        {tab === 'compras' && <ComprasTab proyecto={proyecto} />}
        {tab === 'pagos' && <PagosTab proyecto={proyecto} companyId={activeCompany?.id} onRefresh={cargar} />}
        {tab === 'bitacora' && <BitacoraTab proyecto={proyecto} ejecutado={ejecutado} onRefresh={cargar} />}
      </div>
    </div>
  )
}

// ── SecondaryTabsMenu ──────────────────────────────────────────────────────
// Botón "+ más" que despliega los tabs avanzados ocultos. Sólo se renderiza
// si hay al menos uno oculto.
function SecondaryTabsMenu({ hidden, onPick }) {
  const [open, setOpen] = useState(false)
  if (hidden.length === 0) return null
  return (
    <div className="pd-tabs-menu">
      <button
        type="button"
        className="pd-tabs-more"
        onClick={() => setOpen(v => !v)}
        title="Más vistas"
      >
        + más
      </button>
      {open && (
        <div className="pd-tabs-menu-list" onMouseLeave={() => setOpen(false)}>
          {hidden.map(t => (
            <button key={t.id} onClick={() => { setOpen(false); onPick(t.id) }}>
              {t.label}
            </button>
          ))}
        </div>
      )}
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

  // "Gastado real" debe reflejar TODO lo que salió del proyecto: compras
  // pagadas + gastos aprobados/pagados. Antes solo sumaba compras, que era
  // inconsistente con el KPI de arriba.
  const solicitudesPagadas = (proyecto.solicitudesCompra ?? []).filter(s => s.estado === 'PAGADA').reduce((a, s) => a + (Number(s.total) || 0), 0)
  const gastosReales = (proyecto.gastos ?? []).filter(g => g.estado === 'PAGADO' || g.estado === 'APROBADO').reduce((a, g) => a + (Number(g.importe) || 0), 0)
  const gastadoReal = solicitudesPagadas + gastosReales

  const margenContrato = contratoTotal > 0 ? ((contratoTotal - contratoCD) / contratoTotal * 100) : 0
  const baseCD = ejecutadoCD > 0 ? ejecutadoCD : contratoCD
  const baseMonto = ejecutado ? ejecutadoTotal : contratoTotal

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
      {/* Ejecutado only shows when it diverges from Contrato — otherwise
          the duplicate "same numbers twice" is just visual noise. */}
      {ejecutado ? (
        <div className="pd-fin-card">
          <h3>Ejecutado (costo real estimado)</h3>
          <dl>
            <dt>Monto ejecutado</dt><dd>{fmtMoney(ejecutadoTotal)}</dd>
            <dt>Costo directo</dt><dd>{fmtMoney(ejecutadoCD)}</dd>
            <dt>Desviación vs contrato</dt>
            <dd style={{ color: ejecutadoTotal > contratoTotal ? '#dc2626' : '#16a34a' }}>
              <strong>{fmtMoney(ejecutadoTotal - contratoTotal)}</strong>
            </dd>
          </dl>
        </div>
      ) : (
        <div className="pd-fin-card pd-fin-hint">
          <h3>Ejecutado (aún no creado)</h3>
          <div className="pd-empty-mini">
            Crea un presupuesto <strong>Ejecutado</strong> en la pestaña Presupuestos
            cuando quieras registrar variaciones reales (cantidades extras, conceptos
            que surgieron en obra). Por ahora el contrato se toma como estimado.
          </div>
        </div>
      )}
      <div className="pd-fin-card pd-fin-margin">
        <h3>Gastado real</h3>
        <dl>
          <dt>Compras + gastos</dt><dd>{fmtMoney(gastadoReal)}</dd>
          <dt>% del presupuesto</dt>
          <dd>{baseMonto > 0 ? (gastadoReal / baseMonto * 100).toFixed(1) + '%' : '—'}</dd>
          <dt>Por gastar</dt>
          <dd>{fmtMoney(Math.max(0, baseMonto - gastadoReal))}</dd>
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

  // Aggregate: gastado real per partida from TWO sources:
  //   1. Paid SolicitudCompra partidas (formal OC flow — material orders).
  //   2. Approved/paid Gastos with a presupuestoPartidaId (Katia's quick
  //      payments like the WhatsApp "PSP $4,825 a Lesly").
  // Both feed the same "gastado" bar so the budget reflects everything
  // that's been committed against that partida regardless of flow.
  const gastadoPorPartida = new Map()
  for (const sol of proyecto.solicitudesCompra ?? []) {
    if (sol.estado !== 'PAGADA') continue
    for (const sp of sol.partidas ?? []) {
      if (!sp.presupuestoPartidaId) continue
      const cur = gastadoPorPartida.get(sp.presupuestoPartidaId) ?? 0
      gastadoPorPartida.set(sp.presupuestoPartidaId, cur + (Number(sp.importe) || 0))
    }
  }
  for (const g of proyecto.gastos ?? []) {
    if (g.estado !== 'PAGADO' && g.estado !== 'APROBADO') continue
    if (!g.presupuestoPartidaId) continue
    const cur = gastadoPorPartida.get(g.presupuestoPartidaId) ?? 0
    gastadoPorPartida.set(g.presupuestoPartidaId, cur + (Number(g.importe) || 0))
  }

  // Group partidas by zona → partida. For the Capítulo tree, zona =
  // root branch's label and partida = innermost branch's label (with
  // dotted code prefix when the tree is deep). For legacy rows with no
  // tree metadata, fall back to the flat zona/partida strings so
  // Bartiz's pre-tree data keeps grouping the way it always did.
  const byId = new Map((basis.partidas ?? []).map((p) => [p.id, p]))
  const ancestorChain = (leaf) => {
    const chain = []
    let cursor = leaf.parentPartidaId ? byId.get(leaf.parentPartidaId) : null
    while (cursor) {
      chain.push(cursor)
      cursor = cursor.parentPartidaId ? byId.get(cursor.parentPartidaId) : null
    }
    return chain.reverse() // root → ...innermost
  }
  const grouped = new Map()
  for (const p of basis.partidas) {
    if (p.esRollup) continue
    const chain = ancestorChain(p)
    let zonaLabel, partidaLabel
    if (chain.length > 0) {
      const root = chain[0]
      zonaLabel = (root.partida ?? root.zona ?? 'Sin zona').trim()
      const inner = chain.slice(1)
      if (inner.length === 0) {
        partidaLabel = p.partida ?? 'Sin partida'
      } else if (inner.length === 1) {
        partidaLabel = (inner[0].partida ?? inner[0].zona ?? p.partida ?? 'Sin partida').trim()
      } else {
        const innermost = inner[inner.length - 1]
        const prefix = innermost.codigo ? `${innermost.codigo} ` : ''
        const path = inner
          .map((b) => (b.partida ?? b.zona ?? '').trim())
          .filter(Boolean)
          .join(' › ')
        partidaLabel = `${prefix}${path}`.trim() || 'Sin partida'
      }
    } else {
      zonaLabel = p.zona ?? 'Sin zona'
      partidaLabel = p.partida ?? 'Sin partida'
    }
    const key = `${zonaLabel}__${partidaLabel}`
    if (!grouped.has(key)) {
      grouped.set(key, { zona: zonaLabel, partida: partidaLabel, rows: [] })
    }
    grouped.get(key).rows.push(p)
  }

  // Compute totals to drive the "no avance / no gasto-por-partida yet" hint.
  // When everything is zero, default the section to collapsed so it doesn't
  // look like the page is broken.
  const totalAvance = [...avancePorPartida.values()].reduce((a, n) => a + n, 0)
  const totalGastoPartida = [...gastadoPorPartida.values()].reduce((a, n) => a + n, 0)
  const everythingEmpty = totalAvance === 0 && totalGastoPartida === 0

  return (
    <details className="pd-avance-section" {...(!everythingEmpty && { open: true })}>
      <summary>
        Avance y gasto por partida
        {everythingEmpty && (
          <span className="muted small" style={{ marginLeft: '0.5rem' }}>
            (sin datos aún — el avance se mide con estimaciones; el gasto por partida solo cuenta gastos vinculados a una partida específica)
          </span>
        )}
      </summary>

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
  const [importOpen, setImportOpen] = useState(false)

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

  const hasPresupuesto = (proyecto.presupuestos ?? []).length > 0

  return (
    <div>
      {!hasPresupuesto && (
        <div className="pd-pres-empty-import">
          <div>
            <h3>Aún no hay presupuesto</h3>
            <p className="muted small">
              Sube el Excel del template (PROTOTIPO 2R / 3R) y el sistema detecta
              capítulos, conceptos e insumos automáticamente.
            </p>
          </div>
          <button className="primary" onClick={() => setImportOpen(true)}>
            📤 Importar presupuesto desde Excel
          </button>
        </div>
      )}

      {hasPresupuesto && (
        <div className="pd-pres-toolbar">
          <span className="muted small">
            {proyecto.presupuestoImportadoAt && (
              <>Importado el {fmtDate(proyecto.presupuestoImportadoAt)}
              {proyecto.presupuestoSourceFile && <> · {proyecto.presupuestoSourceFile}</>}</>
            )}
          </span>
        </div>
      )}

      <ImportPresupuestoModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        proyectoId={proyecto.id}
        onImported={onRefresh}
      />

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

// ── Explosión vs Real Tab (Neodata-style variance view) ──────────────────────
//
// For each insumo: planeado (from APU matrices × partida cantidades) vs
// real (sum of Gasto.cantidad / .importe). Highlights over-budget
// materials + shows weighted-average real PU vs catálogo PU.
//
// Also shows indirect-cost breakdown (gasolina, viáticos, etc.) since
// those don't belong to any insumo but do consume the project budget.

function ConsumoInsumosTab({ proyecto }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('variance') // variance | real | planeado | codigo

  useEffect(() => {
    let alive = true
    apiFetch(`/api/construccion/proyectos/${proyecto.id}/consumo-insumos`)
      .then((r) => { if (alive) setData(r) })
      .catch((err) => console.error(err))
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [proyecto.id])

  const insumos = useMemo(() => {
    if (!data?.insumos) return []
    const arr = [...data.insumos]
    arr.sort((a, b) => {
      switch (sort) {
        case 'real':     return b.realImporte - a.realImporte
        case 'planeado': return b.planeadoImporte - a.planeadoImporte
        case 'codigo':   return a.codigo.localeCompare(b.codigo)
        case 'variance':
        default:
          // Rank by absolute variance (most over/under budget first), insumos
          // with no real consumption get ranked last.
          const va = a.variancePct == null ? -999 : Math.abs(a.variancePct)
          const vb = b.variancePct == null ? -999 : Math.abs(b.variancePct)
          return vb - va
      }
    })
    return arr
  }, [data, sort])

  if (loading) return <div className="pd-empty">Cargando…</div>
  if (!data) return <div className="pd-empty">Error al cargar.</div>

  const pctReal = data.totals.planeadoImporte > 0
    ? (data.totals.realImporte / data.totals.planeadoImporte) * 100
    : 0

  return (
    <div>
      {/* Resumen arriba */}
      <div className="pd-kpis" style={{ marginBottom: '1rem' }}>
        <div className="pd-kpi">
          <div className="pd-kpi-label">Planeado (del presupuesto)</div>
          <div className="pd-kpi-value">{fmtMoney(data.totals.planeadoImporte)}</div>
        </div>
        <div className="pd-kpi">
          <div className="pd-kpi-label">Gastado real (insumos)</div>
          <div className="pd-kpi-value">{fmtMoney(data.totals.realImporte)}</div>
          <div className="small muted">{pctReal.toFixed(1)}% del planeado</div>
        </div>
        <div className="pd-kpi">
          <div className="pd-kpi-label">Indirectos</div>
          <div className="pd-kpi-value">{fmtMoney(data.totals.indirectosTotal)}</div>
        </div>
      </div>

      {/* Indirectos breakdown */}
      {data.indirectos?.length > 0 && (
        <details className="pd-avance-section" style={{ marginBottom: '1rem' }}>
          <summary>Costos indirectos ({fmtMoney(data.totals.indirectosTotal)})</summary>
          <table className="pd-table">
            <thead>
              <tr>
                <th>Categoría</th>
                <th style={{ textAlign: 'right' }}># gastos</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {data.indirectos.map((c) => (
                <tr key={c.categoria}>
                  <td>{c.categoria}</td>
                  <td style={{ textAlign: 'right' }}>{c.count}</td>
                  <td style={{ textAlign: 'right' }}>{fmtMoney(c.totalImporte)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      )}

      {insumos.length === 0 ? (
        <div className="pd-empty">
          Aún no hay consumo ni datos de APU para este proyecto.
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.5rem' }}>
            <span className="muted small">Ordenar por:</span>
            {['variance', 'real', 'planeado', 'codigo'].map((s) => (
              <button
                key={s}
                className="link small"
                style={{ fontWeight: sort === s ? 600 : 400, background: sort === s ? '#e0e7ff' : 'transparent', padding: '0.1rem 0.4rem', borderRadius: 4, border: 'none', cursor: 'pointer' }}
                onClick={() => setSort(s)}
              >
                {s === 'variance' ? 'variación' : s === 'real' ? 'gastado' : s === 'planeado' ? 'planeado' : 'código'}
              </button>
            ))}
          </div>

          <table className="pd-table">
            <thead>
              <tr>
                <th>Insumo</th>
                <th style={{ textAlign: 'right' }}>Unidad</th>
                <th style={{ textAlign: 'right' }}>Cant. planeada</th>
                <th style={{ textAlign: 'right' }}>Cant. real</th>
                <th style={{ textAlign: 'right' }}>PU catálogo</th>
                <th style={{ textAlign: 'right' }}>PU real prom.</th>
                <th style={{ textAlign: 'right' }}>Variación</th>
                <th style={{ textAlign: 'right' }}>Planeado $</th>
                <th style={{ textAlign: 'right' }}>Gastado $</th>
              </tr>
            </thead>
            <tbody>
              {insumos.map((i) => {
                const varColor =
                  i.variancePct == null ? '#64748b' :
                  Math.abs(i.variancePct) < 5 ? '#16a34a' :
                  Math.abs(i.variancePct) < 15 ? '#ea580c' :
                  '#dc2626'
                return (
                  <tr key={i.id}>
                    <td className="small">
                      <span className="mono">{i.codigo}</span>
                      <div className="muted small">{i.descripcion.slice(0, 55)}</div>
                    </td>
                    <td style={{ textAlign: 'right' }} className="small">{i.unidad}</td>
                    <td style={{ textAlign: 'right' }}>{i.planeadoCantidad ? i.planeadoCantidad.toFixed(2) : '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{i.realCantidad ? i.realCantidad.toFixed(2) : '—'}</td>
                    <td style={{ textAlign: 'right' }}>{fmtMoney(i.puCatalogo)}</td>
                    <td style={{ textAlign: 'right' }}>{i.puPromedioReal != null ? fmtMoney(i.puPromedioReal) : '—'}</td>
                    <td style={{ textAlign: 'right', color: varColor, fontWeight: 600 }}>
                      {i.variancePct != null ? `${i.variancePct > 0 ? '+' : ''}${i.variancePct.toFixed(1)}%` : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }} className="muted">{i.planeadoImporte ? fmtMoney(i.planeadoImporte) : '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>{i.realImporte ? fmtMoney(i.realImporte) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

// ── Cuadrillas Tab ──────────────────────────────────────────────────────────
//
// Per-especialidad trade teams (Decolsa feature, gated on CONSTRUCCION_CUADRILLAS).
// Inline CRUD: list cuadrillas, add/rename/deactivate; click a cuadrilla to
// expand and manage its miembros.

function CuadrillasTab({ proyecto }) {
  const [cuadrillas, setCuadrillas] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch(
        `/api/construccion/cuadrillas?proyectoId=${encodeURIComponent(proyecto.id)}`
      )
      setCuadrillas(Array.isArray(data) ? data : [])
    } catch (err) {
      window.alert(err.message || 'Error al cargar cuadrillas')
    } finally {
      setLoading(false)
    }
  }, [proyecto.id])

  useEffect(() => { reload() }, [reload])

  const crear = async () => {
    const nombre = window.prompt('Nombre de la cuadrilla (ej. "Albañilería"):')
    if (!nombre) return
    const especialidad = window.prompt(
      'Especialidad (tag corto, ej. ALBANILERIA, PLOMERIA, ELECTRICO):',
      'ALBANILERIA'
    )
    if (!especialidad) return
    const jefeNombre = window.prompt('Nombre del maestro/jefe (opcional):') || null
    setBusy(true)
    try {
      await apiFetch('/api/construccion/cuadrillas', {
        method: 'POST',
        body: {
          proyectoId: proyecto.id,
          nombre: nombre.trim(),
          especialidad: especialidad.trim().toUpperCase(),
          jefeNombre: jefeNombre?.trim() || null,
        },
      })
      await reload()
    } catch (err) { window.alert(err.message || 'Error al crear cuadrilla') }
    finally { setBusy(false) }
  }

  const eliminar = async (c) => {
    if (!window.confirm(`¿Eliminar "${c.nombre}"?`)) return
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/cuadrillas/${c.id}`, { method: 'DELETE' })
      await reload()
    } catch (err) { window.alert(err.message || 'Error al eliminar') }
    finally { setBusy(false) }
  }

  const addMiembro = async (cuadrillaId) => {
    const nombre = window.prompt('Nombre del miembro:')
    if (!nombre) return
    const rol = window.prompt('Rol (ej. Oficial, Ayudante, Maestro):') || null
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/cuadrillas/${cuadrillaId}/miembros`, {
        method: 'POST',
        body: { nombre: nombre.trim(), rolEnCuadrilla: rol?.trim() || null },
      })
      await reload()
    } catch (err) { window.alert(err.message || 'Error al agregar miembro') }
    finally { setBusy(false) }
  }

  const removeMiembro = async (cuadrillaId, miembro) => {
    if (!window.confirm(`¿Quitar a "${miembro.nombre}"?`)) return
    setBusy(true)
    try {
      await apiFetch(
        `/api/construccion/cuadrillas/${cuadrillaId}/miembros/${miembro.id}`,
        { method: 'DELETE' }
      )
      await reload()
    } catch (err) { window.alert(err.message || 'Error al quitar miembro') }
    finally { setBusy(false) }
  }

  if (loading) return <div className="pd-empty">Cargando…</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div className="muted small">
          {cuadrillas.length === 0
            ? 'Cuadrillas trabajan por destajo — se pagan semanalmente vía rayas.'
            : `${cuadrillas.length} cuadrilla(s) activas`}
        </div>
        <button className="secondary" disabled={busy} onClick={crear}>+ Nueva cuadrilla</button>
      </div>
      {cuadrillas.length === 0 ? (
        <div className="pd-empty">Aún no hay cuadrillas. Crea la primera.</div>
      ) : (
        <div>
          {cuadrillas.map(c => (
            <div key={c.id} style={{ border: '1px solid #e2e8f0', borderRadius: 6, padding: '0.75rem', marginBottom: '0.5rem', background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
                <strong>{c.nombre}</strong>
                <span className="mono small muted">{c.especialidad}</span>
                {c.jefeNombre && <span className="muted small">· Jefe: {c.jefeNombre}</span>}
                <span className="muted small">· {c.miembros?.length ?? 0} miembros · {c._count?.rayas ?? 0} rayas</span>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.35rem' }}>
                  <button className="link small" disabled={busy} onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                    {expanded === c.id ? 'ocultar' : 'miembros'}
                  </button>
                  <button className="link small danger" disabled={busy} onClick={() => eliminar(c)}>eliminar</button>
                </div>
              </div>
              {expanded === c.id && (
                <div style={{ marginTop: '0.6rem', paddingTop: '0.6rem', borderTop: '1px dashed #e2e8f0' }}>
                  {(c.miembros ?? []).length === 0 ? (
                    <div className="muted small">Sin miembros.</div>
                  ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {c.miembros.map(m => (
                        <li key={m.id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.85rem', padding: '0.2rem 0' }}>
                          <span>{m.nombre}</span>
                          {m.rolEnCuadrilla && <span className="muted small">({m.rolEnCuadrilla})</span>}
                          {m.employeeId && <span className="muted small" title="IMSS-registered">✓ IMSS</span>}
                          <button className="link small danger" style={{ marginLeft: 'auto' }} disabled={busy} onClick={() => removeMiembro(c.id, m)}>quitar</button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <button className="link small" style={{ marginTop: '0.4rem' }} disabled={busy} onClick={() => addMiembro(c.id)}>
                    + agregar miembro
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Rayas Tab ───────────────────────────────────────────────────────────────
//
// Weekly cash-flow rayas per cuadrilla. List shows every raya for this
// proyecto sorted newest-first with state badges + quick-action buttons
// (Aprobar, Pagar). A minimal inline form creates a new BORRADOR raya.

function RayasTab({ proyecto }) {
  const [rayas, setRayas] = useState([])
  const [cuadrillas, setCuadrillas] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [r, c] = await Promise.all([
        apiFetch(`/api/construccion/rayas?proyectoId=${encodeURIComponent(proyecto.id)}`),
        apiFetch(`/api/construccion/cuadrillas?proyectoId=${encodeURIComponent(proyecto.id)}`),
      ])
      setRayas(Array.isArray(r) ? r : [])
      setCuadrillas(Array.isArray(c) ? c : [])
    } catch (err) {
      window.alert(err.message || 'Error al cargar rayas')
    } finally {
      setLoading(false)
    }
  }, [proyecto.id])

  useEffect(() => { reload() }, [reload])

  const crear = async () => {
    if (cuadrillas.length === 0) {
      window.alert('Crea una cuadrilla primero (tab Cuadrillas).')
      return
    }
    const cuadrillaLabel = cuadrillas
      .map((c, i) => `${i + 1}) ${c.nombre}`)
      .join('\n')
    const pick = window.prompt(
      `¿Para qué cuadrilla?\n\n${cuadrillaLabel}\n\nEscribe el número:`
    )
    const idx = parseInt(pick ?? '', 10) - 1
    if (!(idx >= 0 && idx < cuadrillas.length)) return
    const cuadrilla = cuadrillas[idx]

    const lunes = window.prompt(
      'Lunes de la semana (YYYY-MM-DD):',
      defaultMonday()
    )
    if (!lunes) return
    const importe = parseFloat(window.prompt('Total destajo de la semana ($):') || '0')
    if (!(importe > 0)) { window.alert('Importe inválido'); return }
    const descripcion = window.prompt(
      'Descripción del trabajo (una línea, v1):',
      'Trabajo semanal'
    ) || 'Trabajo semanal'

    const inicio = new Date(lunes + 'T00:00:00')
    const fin = new Date(inicio)
    fin.setDate(fin.getDate() + 6)
    fin.setHours(23, 59, 59, 999)

    setBusy(true)
    try {
      await apiFetch('/api/construccion/rayas', {
        method: 'POST',
        body: {
          cuadrillaId: cuadrilla.id,
          semanaInicio: inicio.toISOString(),
          semanaFin: fin.toISOString(),
          trabajos: [{ descripcion, importeDestajo: importe }],
          detalles: [],
        },
      })
      await reload()
    } catch (err) { window.alert(err.message || 'Error al crear raya') }
    finally { setBusy(false) }
  }

  const aprobar = async (raya) => {
    if (!window.confirm(`¿Aprobar raya de ${raya.cuadrilla.nombre} (${fmtMoney(raya.totalDestajo)})?`)) return
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/rayas/${raya.id}/aprobar`, { method: 'POST' })
      await reload()
    } catch (err) { window.alert(err.message || 'Error al aprobar') }
    finally { setBusy(false) }
  }

  const pagar = async (raya) => {
    const bankAccountId = window.prompt('ID de la cuenta bancaria (TD GDCS, etc.). Pega el ID:')
    if (!bankAccountId) return
    const fecha = window.prompt('Fecha del pago (YYYY-MM-DD):', new Date().toISOString().slice(0, 10))
    if (!fecha) return
    const referencia = window.prompt('Referencia (opcional):') || null
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/rayas/${raya.id}/pagar`, {
        method: 'POST',
        body: {
          bankAccountId: bankAccountId.trim(),
          fecha: new Date(fecha + 'T12:00:00').toISOString(),
          referencia: referencia?.trim() || null,
        },
      })
      await reload()
    } catch (err) { window.alert(err.message || 'Error al pagar') }
    finally { setBusy(false) }
  }

  const eliminar = async (raya) => {
    if (!window.confirm('¿Eliminar raya en BORRADOR?')) return
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/rayas/${raya.id}`, { method: 'DELETE' })
      await reload()
    } catch (err) { window.alert(err.message || 'Error al eliminar') }
    finally { setBusy(false) }
  }

  if (loading) return <div className="pd-empty">Cargando rayas…</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <div className="muted small">{rayas.length} raya(s)</div>
        <button className="secondary" disabled={busy} onClick={crear}>+ Nueva raya</button>
      </div>
      {rayas.length === 0 ? (
        <div className="pd-empty">Sin rayas. Crea la primera semana.</div>
      ) : (
        <table className="pd-table">
          <thead>
            <tr>
              <th>Semana</th>
              <th>Cuadrilla</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Total</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rayas.map(r => (
              <tr key={r.id}>
                <td className="small">{fmtDate(r.semanaInicio)} – {fmtDate(r.semanaFin)}</td>
                <td>{r.cuadrilla?.nombre} <span className="muted small">{r.cuadrilla?.especialidad}</span></td>
                <td><span className={`badge estado-${r.estado?.toLowerCase()}`}>{r.estado}</span></td>
                <td style={{ textAlign: 'right' }}>{fmtMoney(r.totalDestajo)}</td>
                <td>
                  {r.estado === 'BORRADOR' && (
                    <>
                      <button className="link small" disabled={busy} onClick={() => aprobar(r)}>aprobar</button>
                      {' · '}
                      <button className="link small danger" disabled={busy} onClick={() => eliminar(r)}>eliminar</button>
                    </>
                  )}
                  {r.estado === 'APROBADA' && (
                    <button className="link small" disabled={busy} onClick={() => pagar(r)}>pagar</button>
                  )}
                  {r.estado === 'PAGADA' && <span className="muted small">pagada</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function defaultMonday() {
  const d = new Date()
  const day = d.getDay() // 0=Sun, 1=Mon
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

// ── Estimaciones Tab ────────────────────────────────────────────────────────

// EstimacionesTab — dual mode tab:
//   • If proyecto has EstimacionTemplate (Decolsa): list por periodo, "Nueva
//     estimación" button, click row → /estimacion-viviendas/:id grid editor.
//   • Empty + presupuesto exists: "Configurar estimaciones" → BootstrapTemplateModal.
//   • Empty + no presupuesto: "Importa el presupuesto primero".
//   • Bartiz-mode (no template, but estimaciones exist as leaf-mode): shows
//     legacy table + "Ver todas".
function EstimacionesTab({ proyecto, navigate, activeCompany }) {
  const [template, setTemplate] = useState(null)
  const [estimaciones, setEstimaciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [bootstrapOpen, setBootstrapOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [tpl, list] = await Promise.all([
        apiFetch(`/api/construccion/proyectos/${proyecto.id}/estimacion-template`).catch(() => null),
        apiFetch(`/api/construccion/proyectos/${proyecto.id}/estimaciones`).catch(() => []),
      ])
      setTemplate(tpl?.template ?? null)
      setEstimaciones(Array.isArray(list) ? list : [])
    } finally {
      setLoading(false)
    }
  }, [proyecto.id])

  useEffect(() => { reload() }, [reload])

  const hasPresupuesto = (proyecto.presupuestos ?? []).length > 0
  const hasTemplate = !!template

  if (loading) return <div className="pd-empty">Cargando…</div>

  // Empty states
  if (!hasTemplate) {
    if (!hasPresupuesto) {
      return (
        <div className="pd-empty">
          Importa el presupuesto del proyecto primero para configurar las
          estimaciones.
        </div>
      )
    }
    return (
      <>
        <div className="pd-pres-empty-import">
          <div>
            <h3>Configura estimaciones por avance de viviendas</h3>
            <p className="muted small">
              Crearemos la plantilla con la regla por defecto (capítulos 1-15
              compactados, ≥16 abiertos a sub-capítulo). Editable después.
            </p>
          </div>
          <button className="primary" onClick={() => setBootstrapOpen(true)}>
            ⚙ Configurar estimaciones
          </button>
        </div>
        <BootstrapTemplateModal
          open={bootstrapOpen}
          onClose={() => setBootstrapOpen(false)}
          proyectoId={proyecto.id}
          proyecto={proyecto}
          onDone={reload}
        />
      </>
    )
  }

  // ─── Métricas para el dashboard estilo Excel sheet 1 ─────────────────────
  const monto = proyecto.montoContratado ?? 0
  const anticipoMonto = proyecto.anticipoMonto ?? 0
  const fondoGarantia = (proyecto.retencionPorc ?? 0) > 0
    ? monto * ((proyecto.retencionPorc ?? 0) / 100)
    : 0

  // Estimaciones llevan estado normalizado (BORRADOR/APROBADA/TIMBRADA/PAGADA)
  // y traen importes + amortización + retención. Para vivienda Decolsa los
  // últimos 2 son típicamente 0.
  const importeBy = (e) => e.subtotal ?? e.total ?? 0
  const amortBy = (e) => e.amortizacionAnticipo ?? 0
  const fgBy = (e) => e.retencionGarantia ?? 0
  const netoBy = (e) => importeBy(e) - amortBy(e) - fgBy(e)

  const sortedEsts = [...estimaciones].sort((a, b) => a.numero - b.numero)
  let runningAcum = 0
  const enrichedRows = sortedEsts.map((e) => {
    const importe = importeBy(e)
    runningAcum += importe
    const pct = monto > 0 ? importe / monto : 0
    const pctAcum = monto > 0 ? runningAcum / monto : 0
    return {
      ...e,
      importe,
      pct,
      acumulado: runningAcum,
      pctAcum,
      amort: amortBy(e),
      fg: fgBy(e),
      neto: netoBy(e),
      cobrado: (e.estado === 'PAGADA') ? netoBy(e) : 0,
    }
  })

  const totalImporte = enrichedRows.reduce((a, r) => a + r.importe, 0)
  const totalAmort = enrichedRows.reduce((a, r) => a + r.amort, 0)
  const totalFG = enrichedRows.reduce((a, r) => a + r.fg, 0)
  const totalNeto = enrichedRows.reduce((a, r) => a + r.neto, 0)
  const totalCobrado = enrichedRows.reduce((a, r) => a + r.cobrado, 0)
  const flujoPorPagar = monto - anticipoMonto - totalCobrado
  const estimacionesPendientes = flujoPorPagar - fondoGarantia

  // El último período captura el "NO. REPORTE" + "PERIODO DEL / CORTE AL"
  const ultimaEst = sortedEsts[sortedEsts.length - 1]

  return (
    <div className="est-excel">
      {/* ── Header estilo Excel sheet 1 ───────────────────────────────────── */}
      <div className="est-excel-header">
        <div className="est-excel-meta">
          <div className="row"><span className="lbl">CONTRATO:</span><span>{proyecto.numeroContrato ?? '—'} {proyecto.nombre}</span></div>
          <div className="row"><span className="lbl">CONTRATISTA:</span><span>{activeCompany?.razonSocial ?? '—'}</span></div>
          <div className="row"><span className="lbl">MONTO CONTRATADO {proyecto.aplicaIva ? '' : 'SIN IVA'}:</span><strong>{fmtMoney(monto)}</strong></div>
          <div className="row"><span className="lbl">PORCENTAJE ANTICIPO:</span><span>{(proyecto.anticipoPorc ?? 0).toFixed(2)}%</span></div>
          <div className="row"><span className="lbl">IMPORTE DE ANTICIPO:</span><span>{fmtMoney(anticipoMonto)}</span></div>
          <div className="row"><span className="lbl">PORCENTAJE F.G.:</span><span>{(proyecto.retencionPorc ?? 0).toFixed(2)}%</span></div>
          <div className="row"><span className="lbl">IMPORTE FONDO GARANTIA:</span><span>{fmtMoney(fondoGarantia)}</span></div>
          <div className="row"><span className="lbl">NÚMERO DE VIVIENDAS:</span><span>{proyecto.viviendasObjetivo ?? '—'}</span></div>
          <div className="row"><span className="lbl">INICIO DE OBRA:</span><span>{fmtDate(proyecto.fechaInicio)}</span></div>
          <div className="row"><span className="lbl">TERMINACIÓN DE OBRA:</span><span>{fmtDate(proyecto.fechaFinPlan)}</span></div>
        </div>

        <div className="est-excel-meta-right">
          {proyecto.customer?.razonSocial && (
            <div className="est-cliente">{proyecto.customer.razonSocial}</div>
          )}
          {ultimaEst && (
            <>
              <div className="row"><span className="lbl">PERÍODO DEL:</span><span>{fmtDate(ultimaEst.periodoInicio)}</span></div>
              <div className="row"><span className="lbl">CORTE AL:</span><span>{fmtDate(ultimaEst.fechaCorte ?? ultimaEst.periodoFin)}</span></div>
              <div className="est-reporte-num">
                <div className="lbl">NO. REPORTE</div>
                <strong>{ultimaEst.numero}</strong>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="pd-pres-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0' }}>
        <span className="muted small">
          {template.partidas?.length ?? 0} partidas en plantilla
        </span>
        <button className="primary" onClick={() => setNewOpen(true)}>
          + Nueva estimación
        </button>
      </div>

      {/* ── Registro estilo Excel sheet 1 ──────────────────────────────────── */}
      {enrichedRows.length === 0 ? (
        <div className="pd-empty">
          Aún no hay estimaciones. Crea la primera con el botón.
        </div>
      ) : (
        <div className="est-excel-table-wrap">
          <table className="est-excel-table">
            <thead>
              <tr>
                <th rowSpan="2">NO.</th>
                <th rowSpan="2">CONCEPTO</th>
                <th rowSpan="2">PÓLIZA</th>
                <th rowSpan="2">Nº DE FACT</th>
                <th rowSpan="2">FECHA<br/>FACTURA</th>
                <th rowSpan="2">FECHA<br/>DE PAGO</th>
                <th rowSpan="2">PAGADA</th>
                <th>IMPORTE</th>
                <th>%</th>
                <th>ESTIMACIÓN</th>
                <th>PORCENTAJE</th>
                <th>AMORT.</th>
                <th>FONDO DE</th>
                <th>NETO ESTIMADO</th>
                <th>NETO COBRADO</th>
              </tr>
              <tr>
                <th>ESTIMACIÓN</th>
                <th></th>
                <th>ACUMULADA</th>
                <th>ACUMULADO</th>
                <th>ANTICIPO</th>
                <th>GARANTÍA</th>
                <th>{proyecto.aplicaIva ? '(SIN IVA)' : ''}</th>
                <th>{proyecto.aplicaIva ? '(SIN IVA)' : ''}</th>
              </tr>
            </thead>
            <tbody>
              {anticipoMonto > 0 && (
                <tr className="est-anticipo-row">
                  <td>1</td>
                  <td><strong>ANTICIPO</strong></td>
                  <td colSpan="6"></td>
                  <td className="num"></td>
                  <td className="num"></td>
                  <td className="num">{fmtMoney(anticipoMonto)}</td>
                  <td className="num">{((anticipoMonto / Math.max(monto, 1)) * 100).toFixed(2)}%</td>
                  <td className="num"></td>
                  <td className="num"></td>
                  <td className="num">{fmtMoney(anticipoMonto)}</td>
                  <td className="num">{fmtMoney(anticipoMonto)}</td>
                </tr>
              )}
              {enrichedRows.map((r, i) => (
                <tr
                  key={r.id}
                  className="clickable"
                  onClick={() => navigate(`/estimacion-viviendas/${r.id}`)}
                >
                  <td>{i + 1}</td>
                  <td><strong>EST. {r.numero}</strong></td>
                  <td></td>
                  <td className="mono">{r.invoice ? `${r.invoice.serie ?? ''}${r.invoice.folio}` : ''}</td>
                  <td className="small">{r.invoice ? fmtDate(r.invoice.fecha) : ''}</td>
                  <td className="small">{r.bankTransaction ? fmtDate(r.bankTransaction.fecha) : ''}</td>
                  <td>
                    {r.estado === 'PAGADA'
                      ? <strong className="est-si">SÍ</strong>
                      : (r.estado === 'APROBADA' || r.estado === 'TIMBRADA')
                        ? <span className={`badge estado-${r.estado.toLowerCase()}`}>{EST_ESTADO[r.estado]}</span>
                        : '—'}
                  </td>
                  <td className="num">{fmtMoney(r.importe)}</td>
                  <td className="num">{(r.pct * 100).toFixed(2)}%</td>
                  <td className="num">{fmtMoney(r.acumulado)}</td>
                  <td className="num">{(r.pctAcum * 100).toFixed(2)}%</td>
                  <td className="num">{fmtMoney(r.amort)}</td>
                  <td className="num">{fmtMoney(r.fg)}</td>
                  <td className="num">{fmtMoney(r.neto)}</td>
                  <td className="num">{r.cobrado > 0 ? fmtMoney(r.cobrado) : ''}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="7" style={{ textAlign: 'right' }}><strong>Totales</strong></td>
                <td className="num"><strong>{fmtMoney(totalImporte)}</strong></td>
                <td className="num"><strong>{((totalImporte / Math.max(monto, 1)) * 100).toFixed(2)}%</strong></td>
                <td colSpan="2"></td>
                <td className="num"><strong>{fmtMoney(totalAmort)}</strong></td>
                <td className="num"><strong>{fmtMoney(totalFG)}</strong></td>
                <td className="num"><strong>{fmtMoney(totalNeto)}</strong></td>
                <td className="num"><strong>{fmtMoney(totalCobrado)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── Bloque inferior A/B/C/D/E/F ─────────────────────────────────────── */}
      <div className="est-excel-summary">
        <div className="est-excel-summary-row">
          <span className="key">A</span>
          <span className="lbl">MONTO CONTRATO</span>
          <span className="val">{fmtMoney(monto)}</span>
        </div>
        <div className="est-excel-summary-row">
          <span className="key">B</span>
          <span className="lbl">ANTICIPO</span>
          <span className="val">{fmtMoney(anticipoMonto)}</span>
        </div>
        <div className="est-excel-summary-row">
          <span className="key">C</span>
          <span className="lbl">ESTIMACIONES PAGADAS</span>
          <span className="val">{fmtMoney(totalCobrado)}</span>
        </div>
        <div className="est-excel-summary-row highlight">
          <span className="key">D</span>
          <span className="lbl">FLUJO POR PAGAR (A − B − C)</span>
          <span className="val">{fmtMoney(flujoPorPagar)}</span>
        </div>
        <div className="est-excel-summary-row">
          <span className="key">E</span>
          <span className="lbl">F.G.</span>
          <span className="val">{fmtMoney(fondoGarantia)}</span>
        </div>
        <div className="est-excel-summary-row highlight">
          <span className="key">F</span>
          <span className="lbl">ESTIMACIONES PENDIENTES</span>
          <span className="val">{fmtMoney(estimacionesPendientes)}</span>
        </div>
      </div>

      <NewEstimacionModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        proyectoId={proyecto.id}
        prevEstimacion={estimaciones[0]}
        onCreated={(created) => {
          setNewOpen(false)
          navigate(`/estimacion-viviendas/${created.id}`)
        }}
      />
    </div>
  )
}

// Inline modal for creating a new estimación
function NewEstimacionModal({ open, onClose, proyectoId, prevEstimacion, onCreated }) {
  const [periodoInicio, setPeriodoInicio] = useState('')
  const [periodoFin, setPeriodoFin] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    // Suggest period: day after prev's periodoFin → today
    const today = new Date().toISOString().slice(0, 10)
    if (prevEstimacion?.periodoFin) {
      const next = new Date(prevEstimacion.periodoFin)
      next.setDate(next.getDate() + 1)
      setPeriodoInicio(next.toISOString().slice(0, 10))
    } else {
      setPeriodoInicio(today)
    }
    setPeriodoFin(today)
  }, [open, prevEstimacion])

  const submit = async (e) => {
    e.preventDefault()
    if (!periodoInicio || !periodoFin) return
    setBusy(true)
    try {
      const created = await apiFetch(
        `/api/construccion/proyectos/${proyectoId}/estimaciones`,
        {
          method: 'POST',
          body: {
            periodoInicio: new Date(periodoInicio).toISOString(),
            periodoFin: new Date(periodoFin).toISOString(),
          },
        },
      )
      onCreated?.(created)
    } catch (err) {
      window.alert(err.message || 'Error al crear estimación')
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <header className="modal-header">
          <h2>Nueva estimación</h2>
          <button onClick={onClose} aria-label="Cerrar">×</button>
        </header>
        <form onSubmit={submit}>
          <div className="modal-body">
            <p className="muted small">
              {prevEstimacion
                ? `Se clonará desde EST. ${prevEstimacion.numero}, arrastrando viviendas acumuladas.`
                : 'Primera estimación del proyecto.'}
            </p>
            <label style={{ display: 'block', marginTop: '0.75rem' }}>
              <span className="muted small">Período inicio</span>
              <input type="date" value={periodoInicio} onChange={(e) => setPeriodoInicio(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 6 }} />
            </label>
            <label style={{ display: 'block', marginTop: '0.5rem' }}>
              <span className="muted small">Período fin</span>
              <input type="date" value={periodoFin} onChange={(e) => setPeriodoFin(e.target.value)} required style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: 6 }} />
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose}>Cancelar</button>
            <button type="submit" className="primary" disabled={busy}>{busy ? 'Creando…' : 'Crear estimación'}</button>
          </div>
        </form>
      </div>
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
