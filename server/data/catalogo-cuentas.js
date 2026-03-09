export const catalogoCuentas = [
  // ==================== ACTIVO ====================
  {
    id: 1000,
    codigo: '1000',
    nombre: 'ACTIVO',
    tipo: 'grupo',
    naturaleza: 'deudora',
    nivel: 1,
    padre: null,
    activa: true
  },
  // Activo Circulante
  {
    id: 1100,
    codigo: '1100',
    nombre: 'ACTIVO CIRCULANTE',
    tipo: 'subgrupo',
    naturaleza: 'deudora',
    nivel: 2,
    padre: 1000,
    activa: true
  },
  {
    id: 1101,
    codigo: '1101',
    nombre: 'Bancos',
    tipo: 'cuenta',
    naturaleza: 'deudora',
    nivel: 3,
    padre: 1100,
    saldo: 5000000,
    activa: true,
    descripcion: 'Efectivo en bancos y cuentas de cheques'
  },
  {
    id: 1102,
    codigo: '1102',
    nombre: 'Inversiones Temporales',
    tipo: 'cuenta',
    naturaleza: 'deudora',
    nivel: 3,
    padre: 1100,
    saldo: 0,
    activa: true,
    descripcion: 'Inversiones a corto plazo'
  },
  {
    id: 1103,
    codigo: '1103',
    nombre: 'Cuentas por Cobrar',
    tipo: 'cuenta',
    naturaleza: 'deudora',
    nivel: 3,
    padre: 1100,
    saldo: 850000,
    activa: true,
    descripcion: 'Estimaciones pendientes de cobro a clientes'
  },
  {
    id: 1104,
    codigo: '1104',
    nombre: 'Anticipos a Proveedores',
    tipo: 'cuenta',
    naturaleza: 'deudora',
    nivel: 3,
    padre: 1100,
    saldo: 340000,
    activa: true,
    descripcion: 'Anticipos entregados a proveedores'
  },
  {
    id: 1105,
    codigo: '1105',
    nombre: 'Inventario de Materiales',
    tipo: 'cuenta',
    naturaleza: 'deudora',
    nivel: 3,
    padre: 1100,
    saldo: 450000,
    activa: true,
    descripcion: 'Materiales de construcción en almacén'
  },
  {
    id: 1106,
    codigo: '1106',
    nombre: 'IVA por Acreditar',
    tipo: 'cuenta',
    naturaleza: 'deudora',
    nivel: 3,
    padre: 1100,
    saldo: 125000,
    activa: true,
    descripcion: 'IVA acreditable de compras'
  },

  // Activo Fijo
  {
    id: 1200,
    codigo: '1200',
    nombre: 'ACTIVO FIJO',
    tipo: 'subgrupo',
    naturaleza: 'deudora',
    nivel: 2,
    padre: 1000,
    activa: true
  },
  {
    id: 1201,
    codigo: '1201',
    nombre: 'Maquinaria y Equipo',
    tipo: 'cuenta',
    naturaleza: 'deudora',
    nivel: 3,
    padre: 1200,
    saldo: 2500000,
    activa: true,
    descripcion: 'Equipo de construcción'
  },
  {
    id: 1202,
    codigo: '1202',
    nombre: 'Vehículos',
    tipo: 'cuenta',
    naturaleza: 'deudora',
    nivel: 3,
    padre: 1200,
    saldo: 800000,
    activa: true,
    descripcion: 'Vehículos de la empresa'
  },
  {
    id: 1203,
    codigo: '1203',
    nombre: 'Depreciación Acumulada',
    tipo: 'cuenta',
    naturaleza: 'acreedora',
    nivel: 3,
    padre: 1200,
    saldo: -450000,
    activa: true,
    descripcion: 'Depreciación acumulada de activos fijos'
  },

  // ==================== PASIVO ====================
  {
    id: 2000,
    codigo: '2000',
    nombre: 'PASIVO',
    tipo: 'grupo',
    naturaleza: 'acreedora',
    nivel: 1,
    padre: null,
    activa: true
  },
  {
    id: 2100,
    codigo: '2100',
    nombre: 'PASIVO CIRCULANTE',
    tipo: 'subgrupo',
    naturaleza: 'acreedora',
    nivel: 2,
    padre: 2000,
    activa: true
  },
  {
    id: 2101,
    codigo: '2101',
    nombre: 'Cuentas por Pagar',
    tipo: 'cuenta',
    naturaleza: 'acreedora',
    nivel: 3,
    padre: 2100,
    saldo: 650000,
    activa: true,
    descripcion: 'Adeudos a proveedores'
  },
  {
    id: 2102,
    codigo: '2102',
    nombre: 'IVA por Pagar',
    tipo: 'cuenta',
    naturaleza: 'acreedora',
    nivel: 3,
    padre: 2100,
    saldo: 95000,
    activa: true,
    descripcion: 'IVA trasladado pendiente de pago'
  },
  {
    id: 2103,
    codigo: '2103',
    nombre: 'Retenciones por Pagar',
    tipo: 'cuenta',
    naturaleza: 'acreedora',
    nivel: 3,
    padre: 2100,
    saldo: 45000,
    activa: true,
    descripcion: 'Retenciones de impuestos por enterar'
  },
  {
    id: 2104,
    codigo: '2104',
    nombre: 'Nómina por Pagar',
    tipo: 'cuenta',
    naturaleza: 'acreedora',
    nivel: 3,
    padre: 2100,
    saldo: 125000,
    activa: true,
    descripcion: 'Sueldos pendientes de pago'
  },
  {
    id: 2105,
    codigo: '2105',
    nombre: 'Anticipos de Clientes',
    tipo: 'cuenta',
    naturaleza: 'acreedora',
    nivel: 3,
    padre: 2100,
    saldo: 1200000,
    activa: true,
    descripcion: 'Anticipos recibidos de clientes'
  },

  // ==================== CAPITAL ====================
  {
    id: 3000,
    codigo: '3000',
    nombre: 'CAPITAL',
    tipo: 'grupo',
    naturaleza: 'acreedora',
    nivel: 1,
    padre: null,
    activa: true
  },
  {
    id: 3100,
    codigo: '3100',
    nombre: 'CAPITAL CONTABLE',
    tipo: 'subgrupo',
    naturaleza: 'acreedora',
    nivel: 2,
    padre: 3000,
    activa: true
  },
  {
    id: 3101,
    codigo: '3101',
    nombre: 'Capital Social',
    tipo: 'cuenta',
    naturaleza: 'acreedora',
    nivel: 3,
    padre: 3100,
    saldo: 5000000,
    activa: true,
    descripcion: 'Capital aportado por socios'
  },
  {
    id: 3102,
    codigo: '3102',
    nombre: 'Utilidades Retenidas',
    tipo: 'cuenta',
    naturaleza: 'acreedora',
    nivel: 3,
    padre: 3100,
    saldo: 850000,
    activa: true,
    descripcion: 'Utilidades de ejercicios anteriores'
  },
  {
    id: 3103,
    codigo: '3103',
    nombre: 'Utilidad del Ejercicio',
    tipo: 'cuenta',
    naturaleza: 'acreedora',
    nivel: 3,
    padre: 3100,
    saldo: 0,
    activa: true,
    descripcion: 'Resultado del ejercicio actual'
  },

  // ==================== INGRESOS ====================
  {
    id: 4000,
    codigo: '4000',
    nombre: 'INGRESOS',
    tipo: 'grupo',
    naturaleza: 'acreedora',
    nivel: 1,
    padre: null,
    activa: true
  },
  {
    id: 4100,
    codigo: '4100',
    nombre: 'INGRESOS POR PROYECTOS',
    tipo: 'subgrupo',
    naturaleza: 'acreedora',
    nivel: 2,
    padre: 4000,
    activa: true
  },
  {
    id: 4101,
    codigo: '4101',
    nombre: 'Ingresos por Construcción',
    tipo: 'cuenta',
    naturaleza: 'acreedora',
    nivel: 3,
    padre: 4100,
    saldo: 8500000,
    activa: true,
    descripcion: 'Ingresos por proyectos de construcción'
  },
  {
    id: 4102,
    codigo: '4102',
    nombre: 'Ingresos por Remodelación',
    tipo: 'cuenta',
    naturaleza: 'acreedora',
    nivel: 3,
    padre: 4100,
    saldo: 1200000,
    activa: true,
    descripcion: 'Ingresos por remodelaciones'
  },

  // ==================== EGRESOS / COSTOS ====================
  {
    id: 5000,
    codigo: '5000',
    nombre: 'COSTOS Y GASTOS',
    tipo: 'grupo',
    naturaleza: 'deudora',
    nivel: 1,
    padre: null,
    activa: true
  },
  // Costos Directos
  {
    id: 5100,
    codigo: '5100',
    nombre: 'COSTOS DIRECTOS',
    tipo: 'subgrupo',
    naturaleza: 'deudora',
    nivel: 2,
    padre: 5000,
    activa: true
  },
  {
    id: 5101,
    codigo: '5101',
    nombre: 'Costo de Materiales',
    tipo: 'cuenta',
    naturaleza: 'deudora',
    nivel: 3,
    padre: 5100,
    saldo: 3200000,
    activa: true,
    descripcion: 'Costo de materiales de construcción'
  },
  {
    id: 5102,
    codigo: '5102',
    nombre: 'Mano de Obra Directa',
    tipo: 'cuenta',
    naturaleza: 'deudora',
    nivel: 3,
    padre: 5100,
    saldo: 2500000,
    activa: true,
    descripcion: 'Sueldos de personal de obra'
  },
  {
    id: 5103,
    codigo: '5103',
    nombre: 'Renta de Maquinaria',
    tipo: 'cuenta',
    naturaleza: 'deudora',
    nivel: 3,
    padre: 5100,
    saldo: 450000,
    activa: true,
    descripcion: 'Renta de equipo y maquinaria'
  },
  {
    id: 5104,
    codigo: '5104',
    nombre: 'Subcontratos',
    tipo: 'cuenta',
    naturaleza: 'deudora',
    nivel: 3,
    padre: 5100,
    saldo: 850000,
    activa: true,
    descripcion: 'Pagos a subcontratistas'
  },

  // Gastos de Operación
  {
    id: 5200,
    codigo: '5200',
    nombre: 'GASTOS DE OPERACIÓN',
    tipo: 'subgrupo',
    naturaleza: 'deudora',
    nivel: 2,
    padre: 5000,
    activa: true
  },
  {
    id: 5201,
    codigo: '5201',
    nombre: 'Sueldos Administrativos',
    tipo: 'cuenta',
    naturaleza: 'deudora',
    nivel: 3,
    padre: 5200,
    saldo: 650000,
    activa: true,
    descripcion: 'Sueldos de personal administrativo'
  },
  {
    id: 5202,
    codigo: '5202',
    nombre: 'Renta de Oficinas',
    tipo: 'cuenta',
    naturaleza: 'deudora',
    nivel: 3,
    padre: 5200,
    saldo: 120000,
    activa: true,
    descripcion: 'Renta de oficinas administrativas'
  },
  {
    id: 5203,
    codigo: '5203',
    nombre: 'Servicios Profesionales',
    tipo: 'cuenta',
    naturaleza: 'deudora',
    nivel: 3,
    padre: 5200,
    saldo: 85000,
    activa: true,
    descripcion: 'Honorarios de contadores, abogados, etc.'
  },
  {
    id: 5204,
    codigo: '5204',
    nombre: 'Combustibles y Mantenimiento',
    tipo: 'cuenta',
    naturaleza: 'deudora',
    nivel: 3,
    padre: 5200,
    saldo: 95000,
    activa: true,
    descripcion: 'Gasolina y mantenimiento de vehículos'
  }
]

// Movimientos contables (asientos)
export let movimientosContables = [
  {
    id: 1,
    fecha: '2024-11-01',
    tipo: 'ingreso',
    concepto: 'Anticipo 40% Torre Corporativa Centro',
    proyecto: 'Torre Corporativa Centro',
    referencia: 'ANT-001',
    asientos: [
      { cuenta: 1101, cuentaNombre: 'Bancos', debe: 1000000, haber: 0 },
      { cuenta: 2105, cuentaNombre: 'Anticipos de Clientes', debe: 0, haber: 1000000 }
    ],
    createdBy: 'Sistema',
    aprobado: true
  },
  {
    id: 2,
    fecha: '2024-11-05',
    tipo: 'egreso',
    concepto: 'Pago anticipo cemento - Materiales del Norte',
    proyecto: 'Torre Corporativa Centro',
    referencia: 'PAG-045',
    asientos: [
      { cuenta: 1104, cuentaNombre: 'Anticipos a Proveedores', debe: 27750, haber: 0 },
      { cuenta: 1101, cuentaNombre: 'Bancos', debe: 0, haber: 27750 }
    ],
    createdBy: 'Tesorería',
    aprobado: true
  }
]




