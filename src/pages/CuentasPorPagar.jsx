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

// Per-supplier payable (adjudicación) → row. The due date is the approval date
// plus the supplier's credit days (delivery días are informational, separate).
function fromAdjudicacion(a, suppliersById) {
  const sup = a.supplierId ? suppliersById[a.supplierId] : null
  // Prefer the credit days captured on the offer (works for free-text suppliers
  // too); fall back to the saved supplier's terms, then a 30-day default.
  const dias = a.tieneCredito ? (a.diasCredito ?? readTerms(sup).diasCredito ?? 30) : 0
  const base = a.aprobadaAt || a.createdAt
  return {
    id: a.id, // adjudicación id — what we pay
    solicitudId: a.solicitudId, // requisición — what we navigate to
    supplierName: a.supplierNombre ?? '—',
    proyecto: a.proyecto?.codigo ?? '—',
    folio: a.folio ?? '—',
    monto: Number(a.total) || 0,
    formaPago: a.tieneCredito ? 'CREDITO' : 'CONTADO',
    diasCredito: dias,
    diasEntrega: a.diasEntrega,
    vencimiento: base ? addDays(startOfDay(new Date(base)), dias) : null,
    estado: a.estado === 'PAGADA' ? 'PAGADA' : 'APROBADA',
    payable: a.estado !== 'PAGADA',
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

      // 1) per-supplier payables (adjudicaciones) — source of truth.
      try {
        const [adjs, sups] = await Promise.all([
          apiFetch(`/api/construccion/adjudicaciones?companyId=${encodeURIComponent(companyId)}&estado=POR_PAGAR`),
          apiFetch(`/api/construccion/suppliers?companyId=${encodeURIComponent(companyId)}`).catch(() => []),
        ])
        if (alive && Array.isArray(adjs) && adjs.length) {
          const byId = {}
          for (const s of Array.isArray(sups) ? sups : []) byId[s.id] = s
          setPayables(adjs.map((a) => fromAdjudicacion(a, byId)))
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

  // Registrar el pago NO toca el banco: guarda comprobante + referencia y marca
  // la adjudicación PAGADA (por conciliar). El movimiento real llega por el CSV
  // y se empata en la conciliación.
  const payAdjudicacion = async (row, { fecha, referencia, comprobante }) => {
    await apiFetch(`/api/construccion/adjudicaciones/${row.id}/pagar`, {
      method: 'POST',
      body: {
        fecha: new Date((fecha || new Date().toISOString().slice(0, 10)) + 'T12:00:00').toISOString(),
        referencia: referencia?.trim() || undefined,
        comprobante: comprobante ? { data: comprobante.data, mime: comprobante.mime, name: comprobante.name } : undefined,
      },
    })
    setPaying(null)
    setReloadKey((k) => k + 1)
  }

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
                      <tr key={p.id} onClick={() => navigate(`/requisiciones/${p.solicitudId || p.id}`)}>
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
                        <td className="r" onClick={(e) => e.stopPropagation()}>
                          {p.payable !== false && p.estado !== 'PAGADA'
                            ? <button className="cxp-pay-btn" onClick={() => setPaying(p)}>Pagar</button>
                            : <span className="row-go"><Icon name="chevronRight" /></span>}
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

      <Modal open={!!paying} onClose={() => setPaying(null)} title="Registrar pago a proveedor" size="sm">
        {paying && (
          <PayModal row={paying} onPay={payAdjudicacion} onClose={() => setPaying(null)} />
        )}
      </Modal>
    </div>
  )
}

// Registrar pago = comprobante + referencia + fecha. NO se elige cuenta ni se
// mueve el banco: el movimiento real llega por el CSV y se empata al conciliar.
function PayModal({ row, onPay, onClose }) {
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [referencia, setReferencia] = useState('')
  const [comprobante, setComprobante] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const submit = async () => {
    setBusy(true); setError(null)
    try {
      await onPay(row, { fecha, referencia, comprobante })
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

      <label className="stack">
        <span>Fecha de pago</span>
        <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
      </label>
      <label className="stack">
        <span>Referencia SPEI (opcional)</span>
        <input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="folio de la transferencia" />
      </label>
      <label className="stack">
        <span>Comprobante (PDF / foto, opcional)</span>
        <FileUpload value={comprobante} onChange={setComprobante} />
      </label>

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
