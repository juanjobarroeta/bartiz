/**
 * Sample data for the DECOLSA mobile PWA — ported from the design handoff's
 * `data.js`. These are the real DECOLSA figures captured in the handoff.
 *
 * As with the desktop screens, treat this as the documented sample / shape
 * reference: the project list and contracted total are wired to the live
 * `/api/construccion/proyectos` endpoint in MobileApp, while figures the
 * API doesn't expose yet (banks, the Platino financial detail, the
 * portfolio S-curve, the pending-approvals inbox) come from here.
 */

const projects = [
  {
    code: 'obr-2026-002', name: 'Platino 2br', short: 'P', color: '#E2571E',
    type: 'Privado', location: 'Puebla, Puebla', status: 'active',
    contratado: 12076058, facturado: 109350, gastado: 0, cobrado: 0,
    avance: 1.0, plan: 79.49, viviendas: 24, presupuestos: 1, estimaciones: 2,
    porCobrar: 109350,
  },
  {
    code: 'TP01', name: 'Torres Platino', short: 'T', color: '#2A241F',
    type: 'Privado', location: 'Puebla, Pue.', status: 'plan',
    contratado: 15515510, facturado: 0, gastado: 0, cobrado: 0,
    avance: 0, plan: 12, viviendas: 32, presupuestos: 1, estimaciones: 0,
    porCobrar: 0,
  },
  {
    code: 'TR-CSH', name: 'Torres Rosas', short: 'T', color: '#2F7D56',
    type: 'Privado', location: 'Puebla, Puebla', status: 'plan',
    contratado: 12076058, facturado: 0, gastado: 0, cobrado: 0,
    avance: 0, plan: 8, viviendas: 24, presupuestos: 1, estimaciones: 1,
    porCobrar: 0,
  },
  {
    code: 'OBR-2026-001', name: 'Torres Platino II', short: 'T', color: '#B5820F',
    type: 'Privado', location: 'Puebla, Puebla', status: 'plan',
    contratado: 0, facturado: 0, gastado: 0, cobrado: 0,
    avance: 0, plan: 0, viviendas: 0, presupuestos: 0, estimaciones: 0,
    porCobrar: 0,
  },
]

const totals = {
  contratado: projects.reduce((s, p) => s + p.contratado, 0), // 39,667,626
  facturado: projects.reduce((s, p) => s + p.facturado, 0), // 109,350
  porCobrar: projects.reduce((s, p) => s + p.porCobrar, 0),
  activos: projects.filter((p) => p.contratado > 0).length,
  rendimiento: 89,
  valorPlaneado: 72940.5,
  valorGanado: 64765.5,
}

const banks = [
  { name: 'BBVA', sub: 'Concentradora', acct: '0106404324', balance: 41961.41, mov: 215 },
  { name: 'BBVA', sub: 'Operaciones', acct: '0118552047', balance: -3202.46, mov: 128 },
]
const saldoTotal = banks.reduce((s, b) => s + b.balance, 0) // 38,758.95

const acciones = [
  { ic: 'shuffle', tone: 'warn', txt: 'movimientos bancarios sin conciliar', n: 343, sub: 'BBVA Concentradora · Operaciones' },
  { ic: 'file', tone: 'brand', txt: 'presupuestos por aprobar', n: 2, sub: 'Platino 2br · Torres Platino' },
  { ic: 'edit', tone: 'info', txt: 'estimaciones en borrador', n: 1, sub: 'EST. 2 — Platino 2br' },
]

const curve = {
  labels: ['1/4', '29/4', '27/5', '24/6', '22/7', '19/8', '16/9', '14/10', '11/11', '9/12', '6/1', '3/2'],
  plan: [0, 4, 13, 28, 48, 72, 90, 97, 99, 100, 100, 100],
  real: [0, 0.2, 0.4, 0.7, 0.9, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
  interno: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
}

// Full Platino 2br project detail (mobile detail tabs).
const platino = {
  code: 'obr-2026-002', name: 'Platino 2br', short: 'P', color: '#E2571E',
  type: 'Privado', status: 'active', location: 'Puebla, Puebla',
  contratado: 12076058, ejecutado: null, facturado: 0, gastado: 0, cobrado: 0,
  presupuesto: {
    name: 'Presupuesto de Edificación — Prototipo 2R', v: 'V1',
    subtotal: 10978234.58, iva: 1756517.53, total: 12734752.11,
    partidas: 2090, estado: 'Borrador', creado: '29/4/2026',
  },
  contrato: {
    monto: 12076058, anticipoPct: 0, anticipo: 0, fgPct: 0, fg: 0,
    viviendas: 24, inicio: '1 abr 2026', fin: '—', corte: '29 abr 2026', reporte: 2,
  },
  estimaciones: [
    { no: 1, nm: 'EST. 1', estado: 'APROBADA', importe: 109350, pct: 0.91, acum: 109350, acumPct: 0.91, neto: 109350 },
    { no: 2, nm: 'EST. 2', estado: 'BORRADOR', importe: 0, pct: 0, acum: 109350, acumPct: 0.91, neto: 0 },
  ],
  flujo: [
    { k: 'A', l: 'Monto contrato', v: 12076058 },
    { k: 'B', l: 'Anticipo', v: 0 },
    { k: 'C', l: 'Estimaciones pagadas', v: 0 },
    { k: 'D', l: 'Flujo por pagar (A − B − C)', v: 12076058, hl: true },
    { k: 'E', l: 'Fondo de garantía', v: 0 },
    { k: 'F', l: 'Estimaciones pendientes', v: 12076058 },
  ],
  programa: { realAcum: 1.0, realMonto: 109350, programado: 100, planInterno: 0, totalContrato: 10978235 },
  curve: {
    labels: ['1/4', '29/4', '27/5', '24/6', '22/7', '19/8', '16/9', '14/10', '11/11', '9/12', '6/1', '3/2'],
    plan: [0, 6, 18, 36, 58, 79, 92, 98, 100, 100, 100, 100],
    real: [0, 0.3, 0.6, 0.8, 0.95, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
  },
}

// Sample bank movements (Tesorería reconciliation list).
export const MOVS = [
  { id: 'm1', d: '5 may', desc: 'DEPÓSITO DE TERCERO', ref: 'MTTO LOCALES 372 · FACT 75530', amt: 60000 },
  { id: 'm2', d: '4 may', desc: 'TRASPASO A PERIFÉRICA', ref: '1541397683 · AUT 774941', amt: -241 },
  { id: 'm3', d: '4 may', desc: 'TRASPASO A PERIFÉRICA', ref: '1525229539 · AUT 106571', amt: -876 },
  { id: 'm4', d: '4 may', desc: 'IVA EMISIÓN LIBRAMIENTO', ref: '16%', amt: -2.56 },
  { id: 'm5', d: '30 abr', desc: 'TRASPASO A TERCEROS', ref: 'QUIN 09 · BMRCASH', amt: -7178.99 },
  { id: 'm6', d: '30 abr', desc: 'SPEI ENVIADO BANORTE', ref: '0000374312 · QUIN 08', amt: -4820.68 },
  { id: 'm7', d: '29 abr', desc: 'PAGO PROVEEDOR', ref: 'ACEROS DEL CENTRO SA', amt: -12450 },
]

export const DATA = { projects, totals, banks, saldoTotal, acciones, curve, platino }

export const BADGE_COLORS = ['#E2571E', '#2A241F', '#2F7D56', '#B5820F', '#2C5DA8', '#BF4329']
