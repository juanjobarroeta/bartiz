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
import { Icon } from '../components/ds/Icon'
import Modal from '../components/Modal'
import '../components/Modal.css'
import FileUpload from '../components/FileUpload'
import '../components/FileUpload.css'
import { money, compactMoney, MoneyParts } from '../lib/format'
import { readTerms } from './ProveedoresBartiz'
import { SAMPLE_SALDO_TOTAL } from '../data/dashboardSample'
import './CuentasPorPagar.css'

const DAY = 86400000
const addDays = (d, n) => new Date(d.getTime() + n * DAY)
const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const ESTADO_META = {
  APROBADA: { cls: 'plan', label: 'Autorizada' },
  PENDIENTE: { cls: 'risk', label: 'Pendiente' },
  PAGADA: { cls: 'active', label: 'Pagada' },
}

// Aging buckets (by days until vencimiento). Clickable — they filter the
// table: vencido / hoy / esta semana / más adelante, per the admin workflow.
const BUCKETS = [
  { id: 'vencido', label: 'Vencido', tone: 'neg', test: (d) => d != null && d < 0 },
  { id: 'hoy', label: 'Vence hoy', tone: 'warn', test: (d) => d === 0 },
  { id: 'semana', label: 'Esta semana', tone: 'info', test: (d) => d != null && d >= 1 && d <= 7 },
  { id: 'despues', label: 'Más adelante', tone: 'muted', test: (d) => d != null && d > 7 },
  { id: 'sinfecha', label: 'Sin fecha', tone: 'muted', test: (d) => d == null },
]

const SAMPLE_PAYABLES = [
  { id: 's1', supplierName: 'Aceros del Centro S.A.', proyecto: 'obr-2026-002', folio: 'REQ-0291', monto: 124500, formaPago: 'CREDITO', diasCredito: 30, vencimiento: addDays(new Date(), -4), estado: 'APROBADA' },
  { id: 's2', supplierName: 'Cementos RYSCO', proyecto: 'obr-2026-002', folio: 'REQ-0288', monto: 86200, formaPago: 'CREDITO', diasCredito: 15, vencimiento: addDays(new Date(), 3), estado: 'APROBADA' },
  { id: 's3', supplierName: 'Ferretería La Obra', proyecto: 'TP01', folio: 'REQ-0285', monto: 19850, formaPago: 'CONTADO', diasCredito: 0, vencimiento: addDays(new Date(), 0), estado: 'APROBADA' },
  { id: 's4', supplierName: 'Arrendadora de Equipo MX', proyecto: 'obr-2026-002', folio: 'REQ-0280', monto: 64000, formaPago: 'CREDITO', diasCredito: 30, vencimiento: addDays(new Date(), 12), estado: 'APROBADA' },
  { id: 's5', supplierName: 'Transportes del Valle', proyecto: 'TR-CSH', folio: 'REQ-0276', monto: 41200, formaPago: 'CREDITO', diasCredito: 45, vencimiento: addDays(new Date(), 26), estado: 'APROBADA' },
]

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
    folio: a.folio ?? '—',
    total,
    aplicado,
    monto: saldo, // lo que falta por pagar — la cifra operativa de la cola
    formaPago: a.tieneCredito ? 'CREDITO' : 'CONTADO',
    diasCredito: dias,
    diasEntrega: a.diasEntrega,
    vencimiento: base ? addDays(startOfDay(new Date(base)), dias) : null,
    enviadaTesoreriaAt: a.enviadaTesoreriaAt ?? null,
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
    folio: 'Gasto',
    monto: Number(g.importe) || 0,
    formaPago: 'CONTADO',
    diasCredito: 0,
    diasEntrega: null,
    vencimiento: base ? startOfDay(new Date(base)) : null,
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
        supplierName: s.supplier?.razonSocial ?? '—',
        proyecto: s.proyecto?.codigo ?? '—',
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
  const [saldo, setSaldo] = useState(SAMPLE_SALDO_TOTAL)
  const [bankAccounts, setBankAccounts] = useState([])
  const [usingSample, setUsingSample] = useState(false)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(null) // row being paid
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (!companyId) {
      setPayables(SAMPLE_PAYABLES)
      setUsingSample(true)
      setLoading(false)
      return
    }
    let alive = true
    setLoading(true)
    ;(async () => {
      // Bank balance + accounts (for the pay dialog).
      try {
        const accts = await apiFetch(`/api/construccion/bank-accounts?companyId=${encodeURIComponent(companyId)}&withBalances=true`)
        if (alive && Array.isArray(accts)) {
          setBankAccounts(accts)
          if (accts.length) setSaldo(accts.reduce((a, x) => a + (x.balance ?? 0), 0))
        }
      } catch { /* keep sample saldo */ }

      // 1) per-supplier payables (adjudicaciones) + gastos aprobados — the
      // unified admin queue: todo lo aprobado vive aquí.
      try {
        const [adjs, gastos, sups] = await Promise.all([
          // abiertas=1 (backend nuevo) = POR_PAGAR + PARCIAL; estado=POR_PAGAR
          // queda como fallback para el backend anterior.
          apiFetch(`/api/construccion/adjudicaciones?companyId=${encodeURIComponent(companyId)}&estado=POR_PAGAR&abiertas=1`).catch(() => []),
          apiFetch(`/api/construccion/gastos?companyId=${encodeURIComponent(companyId)}&estado=APROBADO`).catch(() => []),
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
          setUsingSample(false)
          setLoading(false)
          return
        }
      } catch { /* fall through */ }

      // 2) derive from authorized requisiciones (pre-Phase-2 data) + suppliers.
      try {
        const [sols, sups] = await Promise.all([
          apiFetch(`/api/construccion/solicitudes-compra?companyId=${encodeURIComponent(companyId)}`),
          apiFetch(`/api/construccion/suppliers?companyId=${encodeURIComponent(companyId)}`),
        ])
        const byId = {}
        for (const s of Array.isArray(sups) ? sups : []) byId[s.id] = s
        const derived = deriveFromRequisiciones(Array.isArray(sols) ? sols : [], byId)
        if (alive) {
          if (derived.length) { setPayables(derived); setUsingSample(false) }
          else { setPayables([]); setUsingSample(false) }
        }
      } catch (err) {
        console.error('cuentas por pagar:', err)
        if (alive) { setPayables(SAMPLE_PAYABLES); setUsingSample(true) }
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
  const enviarTesoreria = async (row) => {
    const url = row.kind === 'gasto'
      ? `/api/construccion/gastos/${row.id}/enviar-tesoreria`
      : `/api/construccion/adjudicaciones/${row.id}/enviar-tesoreria`
    try {
      await apiFetch(url, { method: 'POST' })
      setReloadKey((k) => k + 1)
    } catch (e) {
      console.error('enviar a tesorería:', e)
    }
  }

  // Filters: bucket (vencimiento) + etapa (por enviar / en tesorería).
  const [bucketFilter, setBucketFilter] = useState(null)
  const [etapa, setEtapa] = useState(etapaInicial) // todas | porEnviar | enTesoreria
  // Cambiar entre las dos entradas del nav (/cuentas-por-pagar y
  // /pagos-tesoreria) reutiliza el componente montado — re-sincroniza el filtro.
  useEffect(() => { setEtapa(etapaInicial) }, [etapaInicial])

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

  const visibleRows = useMemo(() => {
    let out = rows
    if (bucketFilter) {
      const b = BUCKETS.find((x) => x.id === bucketFilter)
      if (b) out = out.filter((p) => b.test(p.daysUntil))
    }
    if (etapa === 'porEnviar') out = out.filter((p) => !p.enviadaTesoreriaAt)
    if (etapa === 'enTesoreria') out = out.filter((p) => !!p.enviadaTesoreriaAt)
    return out
  }, [rows, bucketFilter, etapa])

  const totals = useMemo(() => {
    const total = rows.reduce((a, p) => a + p.monto, 0)
    const vencido = rows.filter((p) => p.daysUntil != null && p.daysUntil < 0).reduce((a, p) => a + p.monto, 0)
    const next7 = rows.filter((p) => p.daysUntil != null && p.daysUntil >= 0 && p.daysUntil <= 7).reduce((a, p) => a + p.monto, 0)
    const buckets = BUCKETS.map((b) => {
      const items = rows.filter((p) => b.test(p.daysUntil))
      return { ...b, count: items.length, sum: items.reduce((a, p) => a + p.monto, 0) }
    })
    return { total, vencido, next7, buckets }
  }, [rows])

  const cobertura = totals.total > 0 ? Math.round((saldo / totals.total) * 100) : null

  return (
    <div className="ds">
      <div className="page cxp">
        {/* KPI strip */}
        <div className="kpi-row">
          <div className="kpi feature">
            <div className="kpi-top"><div className="kpi-ic"><Icon name="receipt" /></div><div className="kpi-label">Total por pagar</div></div>
            <div className="kpi-value">{money(totals.total)}</div>
            <div className="kpi-sub"><span>{rows.length} cuentas abiertas</span></div>
          </div>
          <div className="kpi">
            <div className="kpi-top"><div className="kpi-ic" style={{ background: 'var(--neg-soft)', color: 'var(--neg)' }}><Icon name="clock" /></div><div className="kpi-label">Vencido</div></div>
            <div className="kpi-value" style={{ color: totals.vencido > 0 ? 'var(--neg)' : 'var(--ink)' }}>{money(totals.vencido)}</div>
            <div className="kpi-sub"><span>requiere acción</span></div>
          </div>
          <div className="kpi">
            <div className="kpi-top"><div className="kpi-ic" style={{ background: 'var(--warn-soft)', color: 'var(--warn)' }}><Icon name="calendar" /></div><div className="kpi-label">Vence ≤ 7 días</div></div>
            <div className="kpi-value">{money(totals.next7)}</div>
            <div className="kpi-sub"><span>a programar</span></div>
          </div>
          <div className="kpi">
            <div className="kpi-top"><div className="kpi-ic" style={{ background: 'var(--pos-soft)', color: 'var(--pos)' }}><Icon name="bank" /></div><div className="kpi-label">Saldo en bancos</div></div>
            <div className="kpi-value"><MoneyParts value={saldo} /></div>
            <div className="kpi-sub">
              {cobertura != null && (
                <span className={'pill ' + (cobertura >= 100 ? 'brand' : 'warn')}>
                  {cobertura}% de cobertura
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Aging buckets — clickable filters */}
        <div className="cxp-buckets">
          {totals.buckets.map((b) => (
            <button
              type="button"
              key={b.id}
              className={'cxp-bucket ' + b.tone + (bucketFilter === b.id ? ' active' : '')}
              onClick={() => setBucketFilter(bucketFilter === b.id ? null : b.id)}
              title="Filtrar por vencimiento"
            >
              <div className="cxp-bucket-label">{b.label}</div>
              <div className="cxp-bucket-sum num">{compactMoney(b.sum)}</div>
              <div className="cxp-bucket-count">{b.count} cuenta{b.count === 1 ? '' : 's'}</div>
            </button>
          ))}
        </div>

        {/* Payables table */}
        <div className="card">
          <div className="card-head">
            <h3>Cuentas por pagar</h3>
            <div className="cxp-etapa">
              {[['todas', 'Todas'], ['porEnviar', 'Por enviar'], ['enTesoreria', 'En tesorería']].map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  className={'cxp-etapa-btn' + (etapa === id ? ' active' : '')}
                  onClick={() => setEtapa(id)}
                >
                  {label}
                  {id === 'enTesoreria' && rows.some((r) => r.enviadaTesoreriaAt) && (
                    <span className="cxp-etapa-n">{rows.filter((r) => r.enviadaTesoreriaAt).length}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
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
                    const rel = p.daysUntil == null ? ''
                      : p.daysUntil < 0 ? `vencido hace ${Math.abs(p.daysUntil)} d`
                      : p.daysUntil === 0 ? 'hoy'
                      : `en ${p.daysUntil} d`
                    return (
                      <tr
                        key={p.kind + p.id}
                        onClick={() => { if (p.solicitudId) navigate(`/requisiciones/${p.solicitudId}`) }}
                        style={p.solicitudId ? undefined : { cursor: 'default' }}
                      >
                        <td>
                          <span className="proj-name">{p.supplierName}</span>
                          {p.detalle && <div className="muted" style={{ fontSize: 11.5 }}>{p.detalle.slice(0, 60)}</div>}
                        </td>
                        <td className="mono" style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{p.proyecto}</td>
                        <td className="mono" style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{p.folio}</td>
                        <td>
                          {p.formaPago === 'CREDITO'
                            ? <span className="pill brand">Crédito{p.diasCredito ? ` ${p.diasCredito}d` : ''}</span>
                            : p.formaPago === 'CONTADO'
                            ? <span className="pill">Contado</span>
                            : <span className="money muted">—</span>}
                        </td>
                        <td className="r">
                          <span className="money big">{money(p.monto)}</span>
                          {p.aplicado > 0.01 && (
                            <div className="muted" style={{ fontSize: 11 }}>de {money(p.total)} · parcial</div>
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
                            ? <span className="status active"><span className="sdot" />En tesorería</span>
                            : <span className="status plan"><span className="sdot" />Por enviar</span>}
                        </td>
                        <td className="r" onClick={(e) => e.stopPropagation()}>
                          {!p.enviadaTesoreriaAt && (
                            <button className="cxp-send-btn" onClick={() => enviarTesoreria(p)} title="Mandar a tesorería para pago">
                              → Tesorería
                            </button>
                          )}
                          <button className="cxp-pay-btn" onClick={() => setPaying(p)}>Pagar</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {usingSample && (
          <p className="cxp-note">
            Mostrando datos de muestra. Se llenará con las adjudicaciones por pagar (un
            renglón por proveedor) cuando autorices requisiciones.
          </p>
        )}
      </div>

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
