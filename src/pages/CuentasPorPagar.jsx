/**
 * Cuentas por pagar — payables aging + cashflow position.
 *
 * Answers the director's "what's going to be paid, to whom, and when?" and
 * "do we have the cash for it?". Built on the DECOLSA design system.
 *
 * Data sources, in priority order:
 *   1. GET /api/construccion/cuentas-por-pagar  (the dedicated endpoint from
 *      BACKEND-SUPPLIER-TERMS.md — preferred once it lands).
 *   2. Derived client-side from authorized requisiciones
 *      (solicitudes-compra, estado APROBADA) joined to supplier credit terms
 *      to compute each vencimiento. Works today.
 *   3. A documented sample, so the screen renders before any data exists.
 *
 * Bank balance for the coverage figure comes from the live bank-accounts
 * endpoint (sample fallback).
 */

import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../config/api'
import { useAuth } from '../auth/AuthContext'
import Modal from '../components/Modal'
import '../components/Modal.css'
import FileUpload from '../components/FileUpload'
import '../components/FileUpload.css'
import { money, compactMoney, MoneyParts } from '../lib/format'
import { StatFilters, FilterBar, Drawer, DetailList, Tracker, StatusPill } from '../components/ui'
import { readTerms } from './ProveedoresBartiz'
import './CuentasPorPagar.css'

const DAY = 86400000
const addDays = (d, n) => new Date(d.getTime() + n * DAY)
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

// Filtros rápidos (StatFilters). Los de vencimiento usan daysUntil; "En
// tesorería" es la etapa (enviadaTesoreriaAt) y se combina con ellos.
const BUCKETS = [
  { id: 'vencido', label: 'Vencido', tone: 'neg', test: (d) => d != null && d < 0 },
  { id: 'semana', label: 'Esta semana', tone: 'warn', test: (d) => d != null && d >= 0 && d <= 7 },
  { id: 'despues', label: 'Más adelante', tone: 'muted', test: (d) => d != null && d > 7 },
  { id: 'sinfecha', label: 'Sin fecha', tone: 'muted', test: (d) => d == null },
]
const ETAPA_OPTS = [
  { value: 'porEnviar', label: 'Por enviar' },
  { value: 'enTesoreria', label: 'En tesorería' },
]

const relVence = (d) =>
  d == null ? '' : d < 0 ? `vencido hace ${Math.abs(d)} d` : d === 0 ? 'hoy' : `en ${d} d`

// Tono + texto del vencimiento para StatusPill.
function venceStatus(p) {
  if (p.estado === 'PAGADA') return { tone: 'pos', label: 'Pagada' }
  const d = p.daysUntil
  if (d == null) return { tone: 'muted', label: 'Sin fecha' }
  if (d < 0) return { tone: 'neg', label: `Vencido ${Math.abs(d)} d` }
  if (d === 0) return { tone: 'warn', label: 'Vence hoy' }
  if (d <= 7) return { tone: 'warn', label: `Vence en ${d} d` }
  return { tone: 'muted', label: `Vence en ${d} d` }
}

// Seguimiento del renglón. Sólo se marca lo que el renglón permite inferir;
// lo demás queda pendiente (nunca se inventa un paso).
function trackerSteps(p) {
  const pagada = p.estado === 'PAGADA'
  const parcial = p.estado === 'PARCIAL' || (p.aplicado > 0.01 && !pagada)
  if (p.kind === 'gasto') {
    const steps = [
      { key: 'reg', title: 'Gasto registrado', sub: p.createdAt ? fmtDate(p.createdAt) : null, status: 'done' },
      { key: 'apr', title: 'Aprobado', sub: p.aprobadoAt ? fmtDate(p.aprobadoAt) : null, status: 'done' },
      { key: 'tes', title: 'En tesorería', sub: p.enviadaTesoreriaAt ? fmtDate(p.enviadaTesoreriaAt) : 'Pendiente de envío', status: p.enviadaTesoreriaAt ? 'done' : 'pending' },
      { key: 'pag', title: 'Pagado', sub: '—', status: pagada ? 'done' : 'pending' },
    ]
    return markCurrent(steps)
  }
  const cfdiKnown = p.cfdi !== undefined
  const steps = [
    { key: 'req', title: p.folio && p.folio !== '—' ? `Requisición ${p.folio}` : 'Requisición', sub: p.kind === 'legacy' ? 'anterior a adjudicaciones' : null, status: 'done' },
    {
      key: 'aut',
      title: 'Autorizada',
      sub: p.kind === 'legacy' ? 'sin adjudicar' : (p.aprobadaAt || p.createdAt) ? fmtDate(p.aprobadaAt || p.createdAt) : null,
      status: 'done',
    },
    {
      key: 'fac',
      title: 'Factura (CFDI)',
      sub: !cfdiKnown ? 'Se vincula al registrar el pago' : p.cfdi ? cfdiLabel(p.cfdi) : 'Sin factura vinculada',
      status: cfdiKnown && p.cfdi ? 'done' : 'pending',
      optional: true,
    },
    {
      key: 'tes',
      title: 'En tesorería',
      sub: p.enviadaTesoreriaAt ? fmtDate(p.enviadaTesoreriaAt) : 'Pendiente de envío',
      status: p.enviadaTesoreriaAt || pagada ? 'done' : 'pending',
    },
    {
      key: 'pag',
      title: pagada ? 'Pagada' : parcial ? 'Pago parcial' : 'Pagada',
      sub: parcial ? `${money(p.aplicado)} de ${money(p.total)}` : '—',
      status: pagada ? 'done' : 'pending',
    },
  ]
  if (p.kind === 'legacy') return steps
  return markCurrent(steps)
}
// El siguiente paso accionable (no opcional) después de lo hecho = en curso.
function markCurrent(steps) {
  const i = steps.findIndex((s) => s.status !== 'done' && !s.optional)
  if (i >= 0) steps[i] = { ...steps[i], status: 'current' }
  return steps
}
const cfdiLabel = (c) =>
  [c.serie, c.folio].filter(Boolean).join('-') || (c.uuid ? c.uuid.slice(0, 8) + '…' : 'vinculada')

// Per-supplier payable (adjudicación) → row. The due date is the approval date
// plus the supplier's credit days (delivery días are informational, separate).
function fromAdjudicacion(a, suppliersById) {
  const sup = a.supplierId ? suppliersById[a.supplierId] : null
  // Prefer the credit days captured on the offer (works for free-text suppliers
  // too); fall back to the saved supplier's terms, then a 30-day default.
  const dias = a.tieneCredito ? (a.diasCredito ?? readTerms(sup).diasCredito ?? 30) : 0
  const base = a.aprobadaAt || a.createdAt
  const total = Number(a.total) || 0
  const aplicado = Number(a.aplicado) || 0
  // saldo viene del backend (con tolerancia legacy); fallback para respuestas
  // del backend anterior sin cuenta corriente.
  const saldo = a.saldo != null ? Number(a.saldo) : (a.estado === 'PAGADA' ? 0 : total)
  return {
    id: a.id, // adjudicación id — what we pay
    kind: 'adjudicacion',
    supplierId: a.supplierId ?? null,
    solicitudId: a.solicitudId, // requisición — what we navigate to
    supplierName: a.supplierNombre ?? '—',
    detalle: null,
    proyecto: a.proyecto?.codigo ?? '—',
    proyectoNombre: a.proyecto?.nombre ?? null,
    folio: a.folio ?? '—',
    total,
    // IVA ya incluido en total (null = adjudicación anterior al IVA por
    // línea: se registró sin desglose y su total no cambió).
    iva: a.iva != null ? Number(a.iva) : null,
    aplicado,
    monto: saldo, // lo que falta por pagar — la cifra operativa de la cola
    formaPago: a.tieneCredito ? 'CREDITO' : 'CONTADO',
    diasCredito: dias,
    diasEntrega: a.diasEntrega,
    vencimiento: base ? addDays(startOfDay(new Date(base)), dias) : null,
    aprobadaAt: a.aprobadaAt ?? null,
    createdAt: a.createdAt ?? null,
    enviadaTesoreriaAt: a.enviadaTesoreriaAt ?? null,
    // CFDI: sólo si el backend lo manda (undefined = sin dato, no "sin factura").
    cfdi: 'cfdi' in a ? a.cfdi : 'cfdiId' in a ? (a.cfdiId ? { id: a.cfdiId } : null) : undefined,
    estado: a.estado === 'PAGADA' ? 'PAGADA' : a.estado === 'PARCIAL' ? 'PARCIAL' : 'APROBADA',
    payable: saldo > 0.01,
  }
}

// Gasto APROBADO → payable row. Same admin→tesorería workflow as las compras;
// un gasto aprobado es contado (vence al aprobarse).
function fromGasto(g) {
  const base = g.aprobadoAt || g.createdAt
  return {
    id: g.id,
    kind: 'gasto',
    solicitudId: null,
    supplierName: g.beneficiarioNombre ?? '—',
    detalle: g.descripcion ?? null,
    proyecto: g.proyecto?.codigo ?? '—',
    proyectoNombre: g.proyecto?.nombre ?? null,
    folio: 'Gasto',
    monto: Number(g.importe) || 0,
    formaPago: 'CONTADO',
    diasCredito: 0,
    diasEntrega: null,
    vencimiento: base ? startOfDay(new Date(base)) : null,
    aprobadoAt: g.aprobadoAt ?? null,
    createdAt: g.createdAt ?? null,
    enviadaTesoreriaAt: g.enviadaTesoreriaAt ?? null,
    estado: 'APROBADA',
    payable: true,
  }
}

// Derive payables from authorized requisiciones + supplier credit terms.
function deriveFromRequisiciones(solicitudes, suppliersById) {
  return solicitudes
    .filter((s) => s.estado === 'APROBADA')
    .map((s) => {
      const sup = suppliersById[s.supplierId]
      const dias = readTerms(sup).diasCredito ?? (s.formaPago === 'CREDITO' ? 30 : 0)
      const base = s.fechaEntrega || s.createdAt
      return {
        id: s.id,
        // Renglón derivado de datos previos a adjudicaciones: sólo informativo.
        // Pagarlo crearía un pago sin aplicaciones (anticipo huérfano).
        kind: 'legacy',
        solicitudId: s.id,
        supplierName: s.supplier?.razonSocial ?? '—',
        proyecto: s.proyecto?.codigo ?? '—',
        proyectoNombre: s.proyecto?.nombre ?? null,
        folio: s.folio,
        monto: Number(s.total) || 0,
        formaPago: s.formaPago,
        diasCredito: dias,
        vencimiento: base ? addDays(startOfDay(new Date(base)), dias) : null,
        estado: s.estado,
      }
    })
}

// etapaInicial: 'todas' (default, vista admin) | 'enTesoreria' (feed de la
// tesorera, montada en /pagos-tesoreria).
export default function CuentasPorPagar({ etapaInicial = 'todas' }) {
  const navigate = useNavigate()
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id

  const [payables, setPayables] = useState([])
  // null = sin cuentas bancarias o no se pudo leer: nunca un saldo inventado.
  const [saldo, setSaldo] = useState(null)
  const [bankAccounts, setBankAccounts] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(null) // row being paid
  const [selected, setSelected] = useState(null) // row shown in the drawer
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!companyId) {
      setPayables([])
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    setLoadError(null)
    ;(async () => {
      // Bank balance + accounts (for the pay dialog).
      try {
        const accts = await apiFetch(`/api/construccion/bank-accounts?companyId=${encodeURIComponent(companyId)}&withBalances=true`)
        if (alive && Array.isArray(accts)) {
          setBankAccounts(accts)
          setSaldo(accts.length ? accts.reduce((a, x) => a + (x.balance ?? 0), 0) : null)
        }
      } catch (err) {
        console.error('cuentas por pagar · bancos:', err)
        if (alive) setSaldo(null)
      }

      // 1) per-supplier payables (adjudicaciones) + gastos aprobados — the
      // unified admin queue: todo lo aprobado vive aquí.
      try {
        const [adjs, gastos, sups] = await Promise.all([
          // abiertas=1 (backend nuevo) = POR_PAGAR + PARCIAL; estado=POR_PAGAR
          // queda como fallback para el backend anterior.
          apiFetch(`/api/construccion/adjudicaciones?companyId=${encodeURIComponent(companyId)}&estado=POR_PAGAR&abiertas=1`),
          apiFetch(`/api/construccion/gastos?companyId=${encodeURIComponent(companyId)}&estado=APROBADO`),
          apiFetch(`/api/construccion/suppliers?companyId=${encodeURIComponent(companyId)}`).catch(() => []),
        ])
        const byId = {}
        for (const s of Array.isArray(sups) ? sups : []) byId[s.id] = s
        const rows = [
          ...(Array.isArray(adjs) ? adjs : []).map((a) => fromAdjudicacion(a, byId)),
          ...(Array.isArray(gastos) ? gastos : []).map(fromGasto),
        ]
        if (alive && rows.length) {
          setPayables(rows)
          setLoading(false)
          return
        }
      } catch (err) {
        // Un error NO es "nada por pagar": se muestra y se detiene.
        console.error('cuentas por pagar:', err)
        if (alive) {
          setPayables([])
          setLoadError(err.message || 'No se pudo cargar la cola de pagos.')
          setLoading(false)
        }
        return
      }

      // 2) derive from authorized requisiciones (pre-Phase-2 data) + suppliers.
      try {
        const [sols, sups] = await Promise.all([
          apiFetch(`/api/construccion/solicitudes-compra?companyId=${encodeURIComponent(companyId)}`),
          apiFetch(`/api/construccion/suppliers?companyId=${encodeURIComponent(companyId)}`),
        ])
        const byId = {}
        for (const s of Array.isArray(sups) ? sups : []) byId[s.id] = s
        const derived = deriveFromRequisiciones(Array.isArray(sols) ? sols : [], byId)
        if (alive) setPayables(derived)
      } catch (err) {
        console.error('cuentas por pagar:', err)
        if (alive) { setPayables([]); setLoadError(err.message || 'No se pudo cargar la cola de pagos.') }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [companyId, reloadKey])

  // Registrar el pago NO toca el banco: se registra contra la cuenta corriente
  // del proveedor (PagoProveedor) y se APLICA a adjudicaciones — parciales,
  // varias requisiciones en un pago, o excedente como anticipo. El movimiento
  // real llega por el CSV y se empata en la conciliación.
  const payAdjudicacion = async (row, { fecha, referencia, comprobante, monto, aplicaciones }) => {
    await apiFetch('/api/construccion/pagos-proveedor', {
      method: 'POST',
      body: {
        companyId,
        supplierId: row.supplierId ?? null,
        supplierNombre: row.supplierName,
        fecha: new Date((fecha || new Date().toISOString().slice(0, 10)) + 'T12:00:00').toISOString(),
        monto,
        referencia: referencia?.trim() || undefined,
        comprobante: comprobante ? { data: comprobante.data, mime: comprobante.mime, name: comprobante.name } : undefined,
        aplicaciones,
      },
    })
    setPaying(null)
    setReloadKey((k) => k + 1)
  }

  // Registrar pago de un gasto aprobado (mismo modal): marca PAGADO, sin tocar
  // el banco. La cuenta real se resuelve al conciliar.
  const payGasto = async (row, { fecha, referencia, comprobante }) => {
    await apiFetch(`/api/construccion/gastos/${row.id}/aprobar-pagar`, {
      method: 'POST',
      body: {
        fecha: new Date((fecha || new Date().toISOString().slice(0, 10)) + 'T12:00:00').toISOString(),
        referencia: referencia?.trim() || undefined,
        pagoComprobanteData: comprobante?.data ?? undefined,
        pagoComprobanteMime: comprobante?.mime ?? undefined,
        pagoComprobanteName: comprobante?.name ?? undefined,
      },
    })
    setPaying(null)
    setReloadKey((k) => k + 1)
  }

  const pay = (row, args) => (row.kind === 'gasto' ? payGasto(row, args) : payAdjudicacion(row, args))

  // Admin → tesorería hand-off. La tesorera trabaja del filtro "En tesorería".
  const [sending, setSending] = useState(null)
  const enviarTesoreria = async (row) => {
    const url = row.kind === 'gasto'
      ? `/api/construccion/gastos/${row.id}/enviar-tesoreria`
      : `/api/construccion/adjudicaciones/${row.id}/enviar-tesoreria`
    setSending(row.kind + row.id)
    try {
      await apiFetch(url, { method: 'POST' })
      setReloadKey((k) => k + 1)
      // El drawer refleja el envío al instante (la recarga trae el dato real).
      setSelected((s) => (s && s.kind === row.kind && s.id === row.id ? { ...s, enviadaTesoreriaAt: new Date().toISOString() } : s))
    } catch (e) {
      console.error('enviar a tesorería:', e)
    } finally {
      setSending(null)
    }
  }

  // Filtros: tarjeta de vencimiento + etapa (por enviar / en tesorería) +
  // búsqueda + obra + proveedor (+ CFDI si el backend lo manda).
  const [bucketFilter, setBucketFilter] = useState(null)
  const [etapa, setEtapa] = useState(etapaInicial) // todas | porEnviar | enTesoreria
  // Cambiar entre las dos entradas del nav (/cuentas-por-pagar y
  // /pagos-tesoreria) reutiliza el componente montado — re-sincroniza el filtro.
  useEffect(() => { setEtapa(etapaInicial) }, [etapaInicial])
  const [q, setQ] = useState('')
  const [obra, setObra] = useState(null)
  const [proveedor, setProveedor] = useState(null)
  const [cfdiFilter, setCfdiFilter] = useState(null)

  const today = startOfDay(new Date())
  const rows = useMemo(() => {
    return payables
      .map((p) => ({
        ...p,
        daysUntil: p.vencimiento ? Math.round((startOfDay(p.vencimiento) - today) / DAY) : null,
      }))
      .sort((a, b) => {
        if (a.daysUntil == null) return 1
        if (b.daysUntil == null) return -1
        return a.daysUntil - b.daysUntil
      })
  }, [payables])

  const hasCfdiData = rows.some((r) => r.cfdi !== undefined)

  // Filtros de barra (todo menos tarjeta/etapa) — base para los conteos de
  // las tarjetas, para que cuadren con lo que se ve.
  const barRows = useMemo(() => {
    let out = rows
    const term = q.trim().toLowerCase()
    if (term) {
      out = out.filter((p) =>
        [p.supplierName, p.folio, p.detalle, p.proyecto, p.proyectoNombre]
          .some((v) => v && String(v).toLowerCase().includes(term))
      )
    }
    if (obra) out = out.filter((p) => p.proyecto === obra)
    if (proveedor) out = out.filter((p) => p.supplierName === proveedor)
    if (cfdiFilter === 'con') out = out.filter((p) => !!p.cfdi)
    if (cfdiFilter === 'sin') out = out.filter((p) => p.cfdi === null)
    return out
  }, [rows, q, obra, proveedor, cfdiFilter])

  const visibleRows = useMemo(() => {
    let out = barRows
    if (bucketFilter) {
      const b = BUCKETS.find((x) => x.id === bucketFilter)
      if (b) out = out.filter((p) => b.test(p.daysUntil))
    }
    if (etapa === 'porEnviar') out = out.filter((p) => !p.enviadaTesoreriaAt)
    if (etapa === 'enTesoreria') out = out.filter((p) => !!p.enviadaTesoreriaAt)
    return out
  }, [barRows, bucketFilter, etapa])

  const totals = useMemo(() => {
    const total = rows.reduce((a, p) => a + p.monto, 0)
    const sum = (items) => items.reduce((a, p) => a + p.monto, 0)
    const stats = BUCKETS.map((b) => {
      const items = barRows.filter((p) => b.test(p.daysUntil))
      return { ...b, count: items.length, amount: compactMoney(sum(items)) }
    })
    const enTes = barRows.filter((p) => p.enviadaTesoreriaAt)
    stats.push({ id: 'enTesoreria', label: 'En tesorería', tone: 'info', count: enTes.length, amount: compactMoney(sum(enTes)) })
    return { total, stats }
  }, [rows, barRows])

  const cobertura = saldo != null && totals.total > 0 ? Math.round((saldo / totals.total) * 100) : null

  const obraOpts = useMemo(() => {
    const m = new Map()
    for (const r of rows) if (r.proyecto && r.proyecto !== '—' && !m.has(r.proyecto)) m.set(r.proyecto, r.proyectoNombre)
    return [...m].sort((a, b) => a[0].localeCompare(b[0])).map(([v, n]) => ({ value: v, label: n ? `${v} · ${n}` : v }))
  }, [rows])
  const provOpts = useMemo(() => {
    const m = new Map()
    for (const r of rows) if (r.supplierName && r.supplierName !== '—') m.set(r.supplierName, (m.get(r.supplierName) || 0) + 1)
    return [...m].sort((a, b) => a[0].localeCompare(b[0], 'es')).map(([v, n]) => ({ value: v, label: v, hint: n }))
  }, [rows])

  const filters = [
    { id: 'etapa', label: 'Etapa', value: etapa === 'todas' ? null : etapa, options: ETAPA_OPTS, onChange: (v) => setEtapa(v ?? 'todas') },
    { id: 'obra', label: 'Obra', value: obra, options: obraOpts, onChange: setObra },
    { id: 'prov', label: 'Proveedor', value: proveedor, options: provOpts, onChange: setProveedor },
  ]
  if (hasCfdiData) {
    filters.push({
      id: 'cfdi', label: 'CFDI', value: cfdiFilter,
      options: [{ value: 'con', label: 'Con CFDI' }, { value: 'sin', label: 'Sin CFDI' }],
      onChange: setCfdiFilter,
    })
  }
  const anyFilter = bucketFilter || etapa !== 'todas' || q.trim() || obra || proveedor || cfdiFilter
  const clearAll = () => { setBucketFilter(null); setEtapa('todas'); setQ(''); setObra(null); setProveedor(null); setCfdiFilter(null) }
  const visibleSum = visibleRows.reduce((a, p) => a + p.monto, 0)

  const openPay = (row) => { setSelected(null); setPaying(row) }

  return (
    <div className="ds">
      <div className="page cxp">
        {/* Resumen: total abierto + saldo en bancos (sin datos de muestra). */}
        <div className="ui-headline">
          <span>Total por pagar <b>{money(totals.total)}</b> · {rows.length} cuenta{rows.length === 1 ? '' : 's'}</span>
          <span className="sep" aria-hidden="true">|</span>
          <span>
            Saldo en bancos <b>{saldo != null ? <MoneyParts value={saldo} /> : '—'}</b>
            {' · '}cobertura{' '}
            <b style={cobertura != null && cobertura < 100 ? { color: 'var(--warn)' } : undefined}>
              {cobertura != null ? `${cobertura}%` : '—'}
            </b>
          </span>
        </div>

        <StatFilters
          items={totals.stats}
          value={[bucketFilter, etapa === 'enTesoreria' ? 'enTesoreria' : null].filter(Boolean)}
          onChange={(next, id) => {
            if (id === 'enTesoreria') setEtapa(next ? 'enTesoreria' : 'todas')
            else setBucketFilter(next)
          }}
        />

        <FilterBar
          search={{ value: q, onChange: setQ, placeholder: 'Buscar proveedor o folio…' }}
          filters={filters}
          actions={anyFilter ? (
            <button type="button" className="ui-btn sm" onClick={clearAll}>Limpiar filtros</button>
          ) : null}
          total={visibleRows.length}
          totalLabel={<>cuenta{visibleRows.length === 1 ? '' : 's'} · {money(visibleSum)}</>}
        />

        {/* Payables table */}
        <div className="card">
          {loading ? (
            <div className="empty">Cargando…</div>
          ) : visibleRows.length === 0 ? (
            <div className="empty">
              {rows.length === 0
                ? 'Nada por pagar. Las compras autorizadas y los gastos aprobados aparecerán aquí con su vencimiento.'
                : 'Nada en este filtro.'}
            </div>
          ) : (
            <div className="scroll-x">
              <table className="ptable">
                <thead>
                  <tr>
                    <th>Proveedor</th>
                    <th>Proyecto</th>
                    <th>Folio</th>
                    <th>Pago</th>
                    <th className="r">Monto</th>
                    <th>Vence</th>
                    <th>Estado</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((p) => {
                    const overdue = p.daysUntil != null && p.daysUntil < 0
                    const soon = p.daysUntil != null && p.daysUntil >= 0 && p.daysUntil <= 7
                    const rel = relVence(p.daysUntil)
                    return (
                      <tr
                        key={p.kind + p.id}
                        onClick={() => setSelected(p)}
                        className={selected && selected.kind === p.kind && selected.id === p.id ? 'cxp-row-sel' : undefined}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') setSelected(p) }}
                      >
                        <td>
                          <span className="proj-name">{p.supplierName}</span>
                          {p.detalle && <div className="muted" style={{ fontSize: 11.5 }}>{p.detalle.slice(0, 60)}</div>}
                        </td>
                        <td className="mono" style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{p.proyecto}</td>
                        <td className="mono" style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{p.folio}</td>
                        <td>
                          {p.formaPago === 'CREDITO'
                            ? <span className="pill">Crédito{p.diasCredito ? ` ${p.diasCredito}d` : ''}</span>
                            : p.formaPago === 'CONTADO'
                            ? <span className="pill">Contado</span>
                            : <span className="money muted">—</span>}
                        </td>
                        <td className="r">
                          <span className="money big">{money(p.monto)}</span>
                          {p.aplicado > 0.01 && (
                            <div className="muted" style={{ fontSize: 11 }}>de {money(p.total)} · parcial</div>
                          )}
                          {p.iva != null && (
                            <div className="muted" style={{ fontSize: 11 }}>
                              {p.iva > 0.005 ? `incl. IVA ${money(p.iva)}` : 'sin IVA'}
                            </div>
                          )}
                        </td>
                        <td>
                          <div style={{ fontSize: 13 }}>{fmtDate(p.vencimiento)}</div>
                          {rel && (
                            <div style={{ fontSize: 11.5, fontWeight: 600, color: overdue ? 'var(--neg)' : soon ? 'var(--warn)' : 'var(--ink-3)' }}>
                              {rel}
                            </div>
                          )}
                        </td>
                        <td>
                          {p.enviadaTesoreriaAt
                            ? <StatusPill tone="info">En tesorería</StatusPill>
                            : <StatusPill tone="muted">Por enviar</StatusPill>}
                        </td>
                        <td className="r" onClick={(e) => e.stopPropagation()} style={{ whiteSpace: 'nowrap' }}>
                          {p.kind === 'legacy' ? (
                            <span className="muted small" title="Requisición autorizada antes de las adjudicaciones; adjudícala en Compras por autorizar para poder pagarla.">
                              sin adjudicar
                            </span>
                          ) : (
                            <>
                              {!p.enviadaTesoreriaAt && (
                                <button className="cxp-send-btn" onClick={() => enviarTesoreria(p)} title="Mandar a tesorería para pago">
                                  → Tesorería
                                </button>
                              )}
                              <button className="cxp-pay-btn" onClick={() => setPaying(p)}>Pagar</button>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {loadError && (
          <p className="cxp-note" role="alert" style={{ color: 'var(--neg)' }}>
            No se pudo cargar la cola de pagos: {loadError}{' '}
            <button type="button" className="link" onClick={() => setReloadKey((k) => k + 1)}>Reintentar</button>
          </p>
        )}
      </div>

      <PayableDrawer
        row={selected}
        onClose={() => setSelected(null)}
        onEnviar={enviarTesoreria}
        sending={selected ? sending === selected.kind + selected.id : false}
        onPagar={openPay}
        onVerRequisicion={(id) => navigate(`/requisiciones/${id}`)}
      />

      <Modal open={!!paying} onClose={() => setPaying(null)} title="Registrar pago" size="sm">
        {paying && (
          <PayModal
            row={paying}
            companyId={companyId}
            openRows={rows.filter((r) =>
              r.kind === 'adjudicacion' && r.monto > 0.01 &&
              ((paying.supplierId && r.supplierId === paying.supplierId) ||
                (!paying.supplierId && r.supplierName === paying.supplierName))
            )}
            onPay={pay}
            onClose={() => setPaying(null)}
          />
        )}
      </Modal>
    </div>
  )
}

// Detalle de una cuenta por pagar (drawer lateral): datos, seguimiento y las
// mismas acciones de la tabla (→ Tesorería / Pagar).
function PayableDrawer({ row, onClose, onEnviar, sending, onPagar, onVerRequisicion }) {
  const p = row
  const vs = p ? venceStatus(p) : null
  const legacy = p?.kind === 'legacy'
  return (
    <Drawer
      open={!!p}
      onClose={onClose}
      title={p ? (p.kind === 'gasto' ? `Gasto · ${p.supplierName}` : `${p.folio !== '—' ? p.folio + ' · ' : ''}${p.supplierName}`) : ''}
      subtitle={p && (
        <>
          <StatusPill tone={vs.tone}>{vs.label}</StatusPill>
          {p.proyecto !== '—' && <StatusPill tone="muted">{p.proyecto}{p.proyectoNombre ? ` · ${p.proyectoNombre}` : ''}</StatusPill>}
        </>
      )}
      footer={p && (legacy ? (
        <>
          <span className="muted small" style={{ marginRight: 'auto' }}>
            Autorizada antes de las adjudicaciones: adjudícala en Compras por autorizar para poder pagarla.
          </span>
          <button type="button" className="ui-btn" onClick={onClose}>Cerrar</button>
        </>
      ) : (
        <>
          {p.solicitudId && (
            <button type="button" className="ui-btn" style={{ marginRight: 'auto' }} onClick={() => onVerRequisicion(p.solicitudId)}>
              Ver requisición
            </button>
          )}
          {!p.enviadaTesoreriaAt && (
            <button type="button" className="ui-btn" onClick={() => onEnviar(p)} disabled={sending} title="Mandar a tesorería para pago">
              {sending ? 'Enviando…' : '→ Tesorería'}
            </button>
          )}
          <button type="button" className="ui-btn primary" onClick={() => onPagar(p)}>Pagar</button>
        </>
      ))}
    >
      {p && (
        <>
          <DetailList
            rows={[
              { key: 'monto', label: p.aplicado > 0.01 ? 'Saldo por pagar' : 'Monto', value: money(p.monto), strong: true },
              p.aplicado > 0.01 && { key: 'tot', label: 'Total de la compra', value: <>{money(p.total)}<span className="ui-dl-note">pagado {money(p.aplicado)}</span></> },
              p.iva != null && { key: 'iva', label: 'IVA', value: p.iva > 0.005 ? `incluido ${money(p.iva)}` : 'sin IVA' },
              { key: 'prov', label: p.kind === 'gasto' ? 'Beneficiario' : 'Proveedor', value: p.supplierName },
              p.detalle && { key: 'det', label: 'Concepto', value: p.detalle },
              {
                key: 'venc', label: 'Vencimiento',
                value: <>{fmtDate(p.vencimiento)}{p.daysUntil != null && <span className="ui-dl-note">{relVence(p.daysUntil)}</span>}</>,
              },
              { key: 'obra', label: 'Obra', value: p.proyecto !== '—' ? `${p.proyecto}${p.proyectoNombre ? ' · ' + p.proyectoNombre : ''}` : '—' },
              p.kind !== 'gasto' && {
                key: 'folio', label: 'Requisición',
                value: p.solicitudId
                  ? <button type="button" className="ui-link" onClick={() => onVerRequisicion(p.solicitudId)}>{p.folio} →</button>
                  : p.folio,
              },
              {
                key: 'pago', label: 'Forma de pago',
                value: p.formaPago === 'CREDITO'
                  ? `Crédito · ${p.diasCredito} días`
                  : p.formaPago === 'CONTADO' ? 'Contado' : '—',
              },
              p.diasEntrega != null && { key: 'ent', label: 'Entrega', value: `${p.diasEntrega} días` },
              p.kind !== 'gasto' && {
                key: 'cfdi', label: 'CFDI',
                value: p.cfdi === undefined
                  ? <span className="muted">Se vincula al registrar el pago</span>
                  : p.cfdi ? <span style={{ color: 'var(--pos)' }}>{cfdiLabel(p.cfdi)} · vinculado ✓</span>
                  : <span style={{ color: 'var(--warn)' }}>Sin factura</span>,
              },
              { key: 'etapa', label: 'Etapa', value: p.enviadaTesoreriaAt ? <StatusPill tone="info">En tesorería</StatusPill> : <StatusPill tone="muted">Por enviar</StatusPill> },
            ]}
          />
          <div className="ui-drawer-section">
            <h4>Seguimiento</h4>
            <Tracker steps={trackerSteps(p)} />
          </div>
        </>
      )}
    </Drawer>
  )
}

// Registrar pago = comprobante + referencia + fecha. NO se elige cuenta ni se
// mueve el banco: el movimiento real llega por el CSV y se empata al conciliar.
// Para compras (adjudicaciones) el pago va a la cuenta corriente del proveedor
// y se aplica FIFO a sus adjudicaciones abiertas: un pago puede cubrir varias
// requisiciones, ser parcial, o dejar excedente como anticipo. Opcionalmente
// vincula la factura del proveedor (CFDI) — atribución, no conciliación.
function PayModal({ row, companyId, openRows = [], onPay, onClose }) {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [referencia, setReferencia] = useState('')
  const [comprobante, setComprobante] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const isAdj = row.kind !== 'gasto'
  const [monto, setMonto] = useState(() => String(row.monto || ''))
  // Adjudicaciones del proveedor incluidas en la distribución (la clickeada
  // siempre primero; el resto por antigüedad de vencimiento).
  const ordered = useMemo(() => {
    const rest = openRows.filter((r) => r.id !== row.id)
      .sort((a, b) => (a.vencimiento?.getTime?.() ?? 0) - (b.vencimiento?.getTime?.() ?? 0))
    const self = openRows.find((r) => r.id === row.id)
    return self ? [self, ...rest] : rest
  }, [openRows, row.id])
  const [incluidas, setIncluidas] = useState(() => new Set(ordered.map((r) => r.id)))
  const toggleIncluida = (id) =>
    setIncluidas((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  // Distribución FIFO del monto entre las adjudicaciones incluidas.
  const distribucion = useMemo(() => {
    let restante = parseFloat(monto) || 0
    const out = []
    for (const r of ordered) {
      if (!incluidas.has(r.id) || restante <= 0.005) { out.push({ row: r, aplicar: 0 }); continue }
      const aplicar = Math.min(r.monto, restante)
      out.push({ row: r, aplicar })
      restante -= aplicar
    }
    return { out, anticipo: Math.max(0, restante) }
  }, [ordered, incluidas, monto])
  // CFDI candidates. Sin búsqueda: facturas recibidas cerca del monto (±15%),
  // aún sin vincular. Con búsqueda (folio/uuid/proveedor/RFC): consulta al
  // backend sin restricción de monto, para encontrar cualquier factura.
  const [cfdis, setCfdis] = useState([])
  const [cfdiId, setCfdiId] = useState(null)
  const [cfdiQ, setCfdiQ] = useState('')

  useEffect(() => {
    if (!companyId) return
    let alive = true
    const q = cfdiQ.trim()
    const run = () => {
      const url = `/api/construccion/cfdis?companyId=${encodeURIComponent(companyId)}&tipo=RECIBIDA${q ? `&q=${encodeURIComponent(q)}` : ''}`
      apiFetch(url)
        .then((list) => {
          if (!alive || !Array.isArray(list)) return
          const monto = Number(row.monto) || 0
          const linkables = list.filter(
            (c) => (c.matchEstado === 'SIN_VINCULAR' || c.matchEstado === 'SUGERIDA') && c.estadoSat !== 'CANCELADO'
          )
          const out = q
            ? linkables.slice(0, 8) // búsqueda: sin filtro de monto
            : linkables
                .filter((c) => monto > 0 && Math.abs(c.total - monto) / monto <= 0.15)
                .sort((a, b) => {
                  // Cercanía de monto primero; empate → coincidencia de nombre.
                  const da = Math.abs(a.total - monto) - Math.abs(b.total - monto)
                  if (Math.abs(da) > 0.005 * monto) return da
                  const name = (row.supplierName || '').toLowerCase()
                  const am = (a.emisorNombre || '').toLowerCase().includes(name.slice(0, 8)) ? 0 : 1
                  const bm = (b.emisorNombre || '').toLowerCase().includes(name.slice(0, 8)) ? 0 : 1
                  return am - bm
                })
                .slice(0, 6)
          setCfdis(out)
        })
        .catch(() => {})
    }
    const t = setTimeout(run, q ? 300 : 0) // debounce mientras se escribe
    return () => { alive = false; clearTimeout(t) }
  }, [companyId, row.monto, row.supplierName, cfdiQ])

  const submit = async () => {
    const m = parseFloat(monto) || 0
    if (isAdj && !(m > 0)) { setError('Captura el monto del pago.'); return }
    const aplicaciones = isAdj
      ? distribucion.out.filter((d) => d.aplicar > 0.005).map((d) => ({
          adjudicacionId: d.row.id,
          monto: Math.round(d.aplicar * 100) / 100,
        }))
      : undefined
    setBusy(true); setError(null)
    try {
      await onPay(row, { fecha, referencia, comprobante, monto: m, aplicaciones })
      // Atribución best-effort: el pago ya quedó registrado; si el vínculo
      // falla se puede hacer después desde Facturas.
      if (cfdiId) {
        try {
          await apiFetch(`/api/construccion/cfdis/${cfdiId}/vincular`, {
            method: 'POST',
            body: {
              tipo: row.kind === 'gasto' ? 'GASTO' : 'SOLICITUD',
              targetId: row.kind === 'gasto' ? row.id : row.solicitudId,
            },
          })
        } catch (e) {
          console.error('vincular CFDI tras pago:', e)
        }
      }
    } catch (e) {
      setError(e.message || 'No se pudo registrar el pago')
      setBusy(false)
    }
  }

  return (
    <div className="ds cxp-pay">
      <div className="cxp-pay-head">
        <div className="proj-name">{row.supplierName}</div>
        <div className="money big">{money(row.monto)}</div>
      </div>
      <div className="muted small" style={{ marginBottom: 12 }}>
        {row.folio}{row.proyecto !== '—' ? ` · ${row.proyecto}` : ''} · {row.formaPago === 'CREDITO' ? `Crédito ${row.diasCredito}d` : 'Contado'}
      </div>

      <div className="cxp-pay-note muted small">
        El pago queda <b>registrado (por conciliar)</b>. No mueve la cuenta bancaria —
        eso se empata con el movimiento importado en la conciliación.
      </div>

      {isAdj && (
        <label className="stack">
          <span>Monto del pago</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            style={{ fontFamily: 'var(--font-mono)' }}
          />
        </label>
      )}
      <label className="stack">
        <span>Fecha de pago</span>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </label>
      <label className="stack">
        <span>Referencia SPEI (opcional)</span>
        <input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="folio de la transferencia" />
      </label>

      {isAdj && ordered.length > 0 && (
        <div className="stack" style={{ marginTop: 10 }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-2)' }}>
            Se aplica a (cuenta del proveedor)
          </span>
          <div className="cxp-aplic-list">
            {distribucion.out.map(({ row: r, aplicar }) => (
              <label key={r.id} className={'cxp-aplic-item' + (incluidas.has(r.id) ? '' : ' off')}>
                <input
                  type="checkbox"
                  checked={incluidas.has(r.id)}
                  onChange={() => toggleIncluida(r.id)}
                />
                <span className="mono small">{r.folio}</span>
                <span className="muted small">saldo {money(r.monto)}</span>
                <span className="num" style={{ marginLeft: 'auto', fontWeight: 700 }}>
                  {aplicar > 0.005 ? `aplica ${money(aplicar)}` : '—'}
                </span>
              </label>
            ))}
          </div>
          {distribucion.anticipo > 0.005 && (
            <div className="cxp-anticipo">
              Excedente de <b>{money(distribucion.anticipo)}</b> quedará como <b>anticipo</b> (saldo a favor del proveedor).
            </div>
          )}
        </div>
      )}
      <label className="stack">
        <span>Comprobante (PDF / foto, opcional)</span>
        <FileUpload value={comprobante} onChange={setComprobante} />
      </label>

      <div className="stack" style={{ marginTop: 10 }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--ink-2)' }}>
          Factura del proveedor (CFDI, opcional)
        </span>
        <input
          value={cfdiQ}
          onChange={(e) => setCfdiQ(e.target.value)}
          placeholder="Buscar por folio, UUID, proveedor o RFC…"
        />
        {cfdis.length === 0 ? (
          <span className="muted" style={{ fontSize: 11.5 }}>
            {cfdiQ.trim()
              ? 'Sin CFDIs que coincidan con la búsqueda.'
              : 'Sin sugerencias cercanas al monto — busca arriba para encontrar cualquier factura.'}
          </span>
        ) : (
          <div className="cxp-cfdi-list">
            {cfdis.map((c) => (
              <button
                type="button"
                key={c.id}
                className={'cxp-cfdi-item' + (cfdiId === c.id ? ' active' : '')}
                onClick={() => setCfdiId(cfdiId === c.id ? null : c.id)}
                title={c.uuid || ''}
              >
                <span className="mono small">{[c.serie, c.folio].filter(Boolean).join('-') || (c.uuid ? c.uuid.slice(0, 8) + '…' : '—')}</span>
                <span className="cxp-cfdi-emisor">{c.emisorNombre ?? '—'}</span>
                <span className="mono small muted">{fmtDate(c.fecha)}</span>
                <span className="num" style={{ marginLeft: 'auto', fontWeight: 700 }}>{money(c.total)}</span>
              </button>
            ))}
          </div>
        )}
        <span className="muted" style={{ fontSize: 11.5 }}>
          Vincula la factura a esta {row.kind === 'gasto' ? 'partida de gasto' : 'compra'} (atribución).
          La conciliación bancaria se hace aparte, en Bancos y conciliación.
        </span>
      </div>

      {error && <div className="cxp-pay-error">{error}</div>}

      <div className="prov-modal-actions" style={{ marginTop: 14 }}>
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancelar</button>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>
          {busy ? 'Registrando…' : 'Registrar pago'}
        </button>
      </div>
    </div>
  )
}
