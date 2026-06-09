/**
 * Sample portfolio data for the redesigned Dashboard.
 *
 * These are the real DECOLSA figures captured in the design handoff. They
 * seed the parts of the command center that the current
 * `/api/construccion/proyectos` list endpoint does NOT yet expose — bank
 * balances, the portfolio S-curve, the "pendientes" action list and the
 * earned/planned performance split.
 *
 * As contabilidad-os grows endpoints for treasury + avance, replace the
 * matching block with a live fetch. The portfolio table + contracted total
 * already come from the live projects list (see Dashboard.jsx); this module
 * is the documented fallback / placeholder source for everything else.
 */

// Deterministic, on-brand badge colors for project rows.
export const BADGE_COLORS = ['#E2571E', '#2A241F', '#2F7D56', '#B5820F', '#2C5DA8', '#BF4329']

export const SAMPLE_PROJECTS = [
  {
    code: 'obr-2026-002',
    name: 'Platino 2br',
    short: 'P',
    color: '#E2571E',
    location: 'Puebla, Puebla',
    status: 'active',
    contratado: 12076058,
    avance: 1.0,
    plan: 79.49,
    porCobrar: 109350,
  },
  {
    code: 'TP01',
    name: 'Torres Platino',
    short: 'T',
    color: '#2A241F',
    location: 'Puebla, Pue.',
    status: 'plan',
    contratado: 15515510,
    avance: 0,
    plan: 12,
    porCobrar: 0,
  },
  {
    code: 'TR-CSH',
    name: 'Torres Rosas',
    short: 'T',
    color: '#2F7D56',
    location: 'Puebla, Puebla',
    status: 'plan',
    contratado: 12076058,
    avance: 0,
    plan: 8,
    porCobrar: 0,
  },
  {
    code: 'OBR-2026-001',
    name: 'Torres Platino II',
    short: 'T',
    color: '#B5820F',
    location: 'Puebla, Puebla',
    status: 'plan',
    contratado: 0,
    avance: 0,
    plan: 0,
    porCobrar: 0,
  },
]

export const SAMPLE_BANKS = [
  { name: 'BBVA', sub: 'Concentradora', acct: '0106404324', balance: 41961.41, mov: 215 },
  { name: 'BBVA', sub: 'Operaciones', acct: '0118552047', balance: -3202.46, mov: 128 },
]

export const SAMPLE_SALDO_TOTAL = SAMPLE_BANKS.reduce((s, b) => s + b.balance, 0) // 38,758.95

export const SAMPLE_PERFORMANCE = {
  rendimiento: 89,
  valorPlaneado: 72940.5,
  valorGanado: 64765.5,
}

// Cartera billing snapshot (not exposed by the projects list endpoint yet).
export const SAMPLE_FACTURADO = 109350
export const SAMPLE_COBRADO = 0
export const SAMPLE_SIN_CONCILIAR = 343

export const SAMPLE_ACCIONES = [
  {
    ic: 'shuffle',
    tone: 'warn',
    txt: 'movimientos bancarios sin conciliar',
    n: 343,
    sub: 'BBVA Concentradora · Operaciones',
  },
  { ic: 'file', tone: 'brand', txt: 'presupuestos por aprobar', n: 2, sub: 'Platino 2br · Torres Platino' },
  { ic: 'edit', tone: 'info', txt: 'estimaciones en borrador', n: 1, sub: 'EST. 2 — Platino 2br' },
]

// Aggregated portfolio S-curve (% completion over the project timeline).
export const SAMPLE_CURVE = {
  labels: ['1/4', '29/4', '27/5', '24/6', '22/7', '19/8', '16/9', '14/10', '11/11', '9/12', '6/1', '3/2'],
  plan: [0, 4, 13, 28, 48, 72, 90, 97, 99, 100, 100, 100],
  real: [0, 0.2, 0.4, 0.7, 0.9, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0],
  interno: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
}
