/**
 * Cuentas por pagar → renglones con vencimiento, para el Inicio.
 *
 * Duplicado mínimo de fromAdjudicacion/fromGasto de pages/CuentasPorPagar.jsx
 * (misma regla de vencimiento): adjudicación = fecha de aprobación + días de
 * crédito (oferta → términos del proveedor → 30); gasto aprobado = contado,
 * vence el día que se aprobó. Si cambia allá, cambiar aquí.
 */
import { readTerms } from '../../pages/ProveedoresBartiz'

export const DAY = 86400000
const addDays = (d, n) => new Date(d.getTime() + n * DAY)
export const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }

export function fromAdjudicacion(a, suppliersById) {
  const sup = a.supplierId ? suppliersById[a.supplierId] : null
  const dias = a.tieneCredito ? (a.diasCredito ?? readTerms(sup).diasCredito ?? 30) : 0
  const base = a.aprobadaAt || a.createdAt
  const total = Number(a.total) || 0
  const saldo = a.saldo != null ? Number(a.saldo) : (a.estado === 'PAGADA' ? 0 : total)
  return {
    id: `a-${a.id}`,
    supplierName: a.supplierNombre ?? '—',
    monto: saldo,
    vencimiento: base ? addDays(startOfDay(new Date(base)), dias) : null,
  }
}

export function fromGasto(g) {
  const base = g.aprobadoAt || g.createdAt
  return {
    id: `g-${g.id}`,
    supplierName: g.beneficiarioNombre ?? '—',
    monto: Number(g.importe) || 0,
    vencimiento: base ? startOfDay(new Date(base)) : null,
  }
}

/** Renglones abiertos con `daysUntil` (negativo = vencido), ordenados. */
export function buildPayables(adjs, gastos, suppliers) {
  const byId = {}
  for (const s of Array.isArray(suppliers) ? suppliers : []) byId[s.id] = s
  const today = startOfDay(new Date())
  return [
    ...(Array.isArray(adjs) ? adjs : []).map((a) => fromAdjudicacion(a, byId)),
    ...(Array.isArray(gastos) ? gastos : []).map(fromGasto),
  ]
    .filter((p) => p.monto > 0.01)
    .map((p) => ({
      ...p,
      daysUntil: p.vencimiento ? Math.round((startOfDay(p.vencimiento) - today) / DAY) : null,
    }))
    .sort((a, b) => (a.daysUntil ?? 1e9) - (b.daysUntil ?? 1e9))
}
