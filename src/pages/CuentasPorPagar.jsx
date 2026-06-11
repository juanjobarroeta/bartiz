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

// Aging buckets (by days until vencimiento). Order matters for display.
const BUCKETS = [
  { id: 'vencido', label: 'Vencido', tone: 'neg', test: (d) => d != null && d < 0 },
  { id: 'd7', label: '0–7 días', tone: 'warn', test: (d) => d != null && d >= 0 && d <= 7 },
  { id: 'd15', label: '8–15 días', tone: 'info', test: (d) => d != null && d > 7 && d <= 15 },
  { id: 'd30', label: '16–30 días', tone: 'muted', test: (d) => d != null && d > 15 && d <= 30 },
  { id: 'd30plus', label: '30+ días', tone: 'muted', test: (d) => d != null && d > 30 },
  { id: 'sinfecha', label: 'Sin fecha', tone: 'muted', test: (d) => d == null },
]

const SAMPLE_PAYABLES = [
  { id: 's1', supplierName: 'Aceros del Centro S.A.', proyecto: 'obr-2026-002', folio: 'REQ-0291', monto: 124500, formaPago: 'CREDITO', diasCredito: 30, vencimiento: addDays(new Date(), -4), estado: 'APROBADA' },
  { id: 's2', supplierName: 'Cementos RYSCO', proyecto: 'obr-2026-002', folio: 'REQ-0288', monto: 86200, formaPago: 'CREDITO', diasCredito: 15, vencimiento: addDays(new Date(), 3), estado: 'APROBADA' },
  { id: 's3', supplierName: 'Ferretería La Obra', proyecto: 'TP01', folio: 'REQ-0285', monto: 19850, formaPago: 'CONTADO', diasCredito: 0, vencimiento: addDays(new Date(), 0), estado: 'APROBADA' },
  { id: 's4', supplierName: 'Arrendadora de Equipo MX', proyecto: 'obr-2026-002', folio: 'REQ-0280', monto: 64000, formaPago: 'CREDITO', diasCredito: 30, vencimiento: addDays(new Date(), 12), estado: 'APROBADA' },
  { id: 's5', supplierName: 'Transportes del Valle', proyecto: 'TR-CSH', folio: 'REQ-0276', monto: 41200, formaPago: 'CREDITO', diasCredito: 45, vencimiento: addDays(new Date(), 26), estado: 'APROBADA' },
]

// Normalize a dedicated-endpoint row to the shape the screen renders.
function fromEndpoint(p) {
  return {
    id: p.id,
    supplierName: p.supplier?.razonSocial ?? p.supplierNombre ?? '—',
    proyecto: p.proyecto?.codigo ?? '—',
    folio: p.folio ?? '—',
    monto: Number(p.monto ?? p.total) || 0,
    formaPago: p.formaPago ?? null,
    diasCredito: p.diasCredito ?? null,
    vencimiento: p.vencimiento ? new Date(p.vencimiento) : null,
    estado: p.estado ?? 'APROBADA',
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

export default function CuentasPorPagar() {
  const navigate = useNavigate()
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id

  const [payables, setPayables] = useState([])
  const [saldo, setSaldo] = useState(SAMPLE_SALDO_TOTAL)
  const [usingSample, setUsingSample] = useState(false)
  const [loading, setLoading] = useState(true)

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
      // Bank balance (best-effort).
      try {
        const accts = await apiFetch(`/api/construccion/bank-accounts?companyId=${encodeURIComponent(companyId)}&withBalances=true`)
        if (alive && Array.isArray(accts) && accts.length) {
          setSaldo(accts.reduce((a, x) => a + (x.balance ?? 0), 0))
        }
      } catch { /* keep sample saldo */ }

      // 1) dedicated endpoint
      try {
        const data = await apiFetch(`/api/construccion/cuentas-por-pagar?companyId=${encodeURIComponent(companyId)}`)
        if (alive && Array.isArray(data)) {
          setPayables(data.map(fromEndpoint))
          setUsingSample(false)
          setLoading(false)
          return
        }
      } catch { /* fall through to derive */ }

      // 2) derive from requisiciones + suppliers
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
          else { setPayables(SAMPLE_PAYABLES); setUsingSample(true) }
        }
      } catch (err) {
        console.error('cuentas por pagar:', err)
        if (alive) { setPayables(SAMPLE_PAYABLES); setUsingSample(true) }
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [companyId])

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

        {/* Aging buckets */}
        <div className="cxp-buckets">
          {totals.buckets.map((b) => (
            <div key={b.id} className={'cxp-bucket ' + b.tone}>
              <div className="cxp-bucket-label">{b.label}</div>
              <div className="cxp-bucket-sum num">{compactMoney(b.sum)}</div>
              <div className="cxp-bucket-count">{b.count} cuenta{b.count === 1 ? '' : 's'}</div>
            </div>
          ))}
        </div>

        {/* Payables table */}
        <div className="card">
          <div className="card-head">
            <h3>Cuentas por pagar</h3>
            <span className="hint">Ordenadas por vencimiento · autorizadas pendientes de pago</span>
          </div>
          {loading ? (
            <div className="empty">Cargando…</div>
          ) : rows.length === 0 ? (
            <div className="empty">Nada por pagar. Las requisiciones autorizadas aparecerán aquí con su vencimiento.</div>
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
                  {rows.map((p) => {
                    const meta = ESTADO_META[p.estado] ?? { cls: 'plan', label: p.estado }
                    const overdue = p.daysUntil != null && p.daysUntil < 0
                    const soon = p.daysUntil != null && p.daysUntil >= 0 && p.daysUntil <= 7
                    const rel = p.daysUntil == null ? ''
                      : p.daysUntil < 0 ? `vencido hace ${Math.abs(p.daysUntil)} d`
                      : p.daysUntil === 0 ? 'hoy'
                      : `en ${p.daysUntil} d`
                    return (
                      <tr key={p.id} onClick={() => navigate(`/requisiciones/${p.id}`)}>
                        <td><span className="proj-name">{p.supplierName}</span></td>
                        <td className="mono" style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{p.proyecto}</td>
                        <td className="mono" style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>{p.folio}</td>
                        <td>
                          {p.formaPago === 'CREDITO'
                            ? <span className="pill brand">Crédito{p.diasCredito ? ` ${p.diasCredito}d` : ''}</span>
                            : p.formaPago === 'CONTADO'
                            ? <span className="pill">Contado</span>
                            : <span className="money muted">—</span>}
                        </td>
                        <td className="r"><span className="money big">{money(p.monto)}</span></td>
                        <td>
                          <div style={{ fontSize: 13 }}>{fmtDate(p.vencimiento)}</div>
                          {rel && (
                            <div style={{ fontSize: 11.5, fontWeight: 600, color: overdue ? 'var(--neg)' : soon ? 'var(--warn)' : 'var(--ink-3)' }}>
                              {rel}
                            </div>
                          )}
                        </td>
                        <td><span className={'status ' + meta.cls}><span className="sdot" />{meta.label}</span></td>
                        <td className="r"><span className="row-go"><Icon name="chevronRight" /></span></td>
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
            Mostrando datos de muestra. Se llenará con tus requisiciones autorizadas y las
            condiciones de crédito de cada proveedor en cuanto existan (y con el endpoint
            <span className="mono"> /cuentas-por-pagar</span> de contabilidad-os cuando esté listo).
          </p>
        )}
      </div>
    </div>
  )
}
