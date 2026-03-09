// Solicitudes de Compra - Purchase Request System
// Status flow: borrador → solicitado → aprobado → ordenado → recibido → pagado

export const estadosSolicitud = [
  { id: 'borrador', nombre: 'Borrador', color: '#6B7280', icon: '📝' },
  { id: 'solicitado', nombre: 'Solicitado', color: '#F59E0B', icon: '📤' },
  { id: 'aprobado', nombre: 'Aprobado', color: '#10B981', icon: '✓' },
  { id: 'rechazado', nombre: 'Rechazado', color: '#EF4444', icon: '✕' },
  { id: 'ordenado', nombre: 'Ordenado', color: '#3B82F6', icon: '📦' },
  { id: 'recibido', nombre: 'Recibido', color: '#8B5CF6', icon: '📥' },
  { id: 'pagado', nombre: 'Pagado', color: '#059669', icon: '💰' }
]

export const fases = [
  { id: 'preliminares', nombre: 'Preliminares' },
  { id: 'cimentacion', nombre: 'Cimentación' },
  { id: 'estructura', nombre: 'Estructura' },
  { id: 'albanileria', nombre: 'Albañilería' },
  { id: 'instalaciones', nombre: 'Instalaciones' },
  { id: 'acabados', nombre: 'Acabados' },
  { id: 'exteriores', nombre: 'Exteriores' },
  { id: 'varios', nombre: 'Varios' }
]

// Solicitudes de compra
export let solicitudesCompra = [
  {
    id: 1,
    folio: 'SC-2024-001',
    proyectoId: 1,
    proyectoNombre: 'Edificio Residencial Centro',
    fase: 'cimentacion',
    proveedorId: 1,
    proveedorNombre: 'Aceros del Norte',
    items: [
      { 
        articuloId: 1, 
        articuloCodigo: 'VAR-3/8', 
        articuloNombre: 'Varilla Corrugada 3/8"', 
        cantidad: 5, 
        unidad: 'ton', 
        precioEstimado: 18500,
        enPresupuesto: true,
        cantidadPresupuestada: 8
      },
      { 
        articuloId: 7, 
        articuloCodigo: 'ALM-REC', 
        articuloNombre: 'Alambre Recocido', 
        cantidad: 100, 
        unidad: 'kg', 
        precioEstimado: 45,
        enPresupuesto: true,
        cantidadPresupuestada: 150
      }
    ],
    subtotalEstimado: 97000,
    estado: 'aprobado',
    solicitadoPor: 'Carlos Mendoza',
    solicitadoPorRol: 'supervisor',
    fechaSolicitud: '2024-06-10',
    aprobadoPor: 'Juan Pérez',
    fechaAprobacion: '2024-06-11',
    notas: 'Urgente para inicio de cimentación',
    historial: [
      { estado: 'borrador', fecha: '2024-06-10', usuario: 'Carlos Mendoza' },
      { estado: 'solicitado', fecha: '2024-06-10', usuario: 'Carlos Mendoza' },
      { estado: 'aprobado', fecha: '2024-06-11', usuario: 'Juan Pérez', comentario: 'Aprobado, proceder con compra' }
    ]
  },
  {
    id: 2,
    folio: 'SC-2024-002',
    proyectoId: 1,
    proyectoNombre: 'Edificio Residencial Centro',
    fase: 'cimentacion',
    proveedorId: 2,
    proveedorNombre: 'Materiales Unidos',
    items: [
      { 
        articuloId: 50, 
        articuloCodigo: 'CEM-GRS-50', 
        articuloNombre: 'Cemento Portland Gris 50kg', 
        cantidad: 300, 
        unidad: 'bulto', 
        precioEstimado: 185,
        enPresupuesto: true,
        cantidadPresupuestada: 500
      },
      { 
        articuloId: 70, 
        articuloCodigo: 'ARN-RIO', 
        articuloNombre: 'Arena de Río', 
        cantidad: 20, 
        unidad: 'm3', 
        precioEstimado: 450,
        enPresupuesto: true,
        cantidadPresupuestada: 30
      },
      { 
        articuloId: 72, 
        articuloCodigo: 'GRV-3/4', 
        articuloNombre: 'Grava 3/4"', 
        cantidad: 15, 
        unidad: 'm3', 
        precioEstimado: 480,
        enPresupuesto: false,
        cantidadPresupuestada: 0
      }
    ],
    subtotalEstimado: 71700,
    estado: 'solicitado',
    solicitadoPor: 'María García',
    solicitadoPorRol: 'admin',
    fechaSolicitud: '2024-06-12',
    aprobadoPor: null,
    fechaAprobacion: null,
    notas: 'Incluye grava no presupuestada - requiere aprobación especial',
    historial: [
      { estado: 'borrador', fecha: '2024-06-12', usuario: 'María García' },
      { estado: 'solicitado', fecha: '2024-06-12', usuario: 'María García' }
    ]
  },
  {
    id: 3,
    folio: 'SC-2024-003',
    proyectoId: 2,
    proyectoNombre: 'Centro Comercial Norte',
    fase: 'estructura',
    proveedorId: 3,
    proveedorNombre: 'Fierros Express',
    items: [
      { 
        articuloId: 2, 
        articuloCodigo: 'VAR-1/2', 
        articuloNombre: 'Varilla Corrugada 1/2"', 
        cantidad: 10, 
        unidad: 'ton', 
        precioEstimado: 18800,
        enPresupuesto: true,
        cantidadPresupuestada: 15
      },
      { 
        articuloId: 9, 
        articuloCodigo: 'MAL-6x6', 
        articuloNombre: 'Malla Electrosoldada 6x6', 
        cantidad: 50, 
        unidad: 'pza', 
        precioEstimado: 850,
        enPresupuesto: true,
        cantidadPresupuestada: 100
      }
    ],
    subtotalEstimado: 230500,
    estado: 'ordenado',
    solicitadoPor: 'Roberto Sánchez',
    solicitadoPorRol: 'project_manager',
    fechaSolicitud: '2024-06-08',
    aprobadoPor: 'Juan Pérez',
    fechaAprobacion: '2024-06-09',
    ordenadoPor: 'María García',
    fechaOrden: '2024-06-10',
    notas: '',
    historial: [
      { estado: 'borrador', fecha: '2024-06-08', usuario: 'Roberto Sánchez' },
      { estado: 'solicitado', fecha: '2024-06-08', usuario: 'Roberto Sánchez' },
      { estado: 'aprobado', fecha: '2024-06-09', usuario: 'Juan Pérez' },
      { estado: 'ordenado', fecha: '2024-06-10', usuario: 'María García', comentario: 'Orden #1234 generada' }
    ]
  },
  {
    id: 4,
    folio: 'SC-2024-004',
    proyectoId: 1,
    proyectoNombre: 'Edificio Residencial Centro',
    fase: 'instalaciones',
    proveedorId: null,
    proveedorNombre: null,
    items: [
      { 
        articuloId: 200, 
        articuloCodigo: 'CAB-12', 
        articuloNombre: 'Cable THW Cal. 12', 
        cantidad: 500, 
        unidad: 'm', 
        precioEstimado: 12,
        enPresupuesto: true,
        cantidadPresupuestada: 1000
      },
      { 
        articuloId: 207, 
        articuloCodigo: 'TUB-COND-1/2', 
        articuloNombre: 'Tubo Conduit PVC 1/2"', 
        cantidad: 100, 
        unidad: 'pza', 
        precioEstimado: 35,
        enPresupuesto: true,
        cantidadPresupuestada: 200
      }
    ],
    subtotalEstimado: 9500,
    estado: 'borrador',
    solicitadoPor: 'Carlos Mendoza',
    solicitadoPorRol: 'supervisor',
    fechaSolicitud: '2024-06-14',
    notas: 'Pendiente seleccionar proveedor',
    historial: [
      { estado: 'borrador', fecha: '2024-06-14', usuario: 'Carlos Mendoza' }
    ]
  }
]

// Plantillas de solicitud (bundles)
export const plantillas = [
  {
    id: 1,
    nombre: 'Cimbra para Losa',
    descripcion: 'Materiales típicos para cimbra de losa',
    items: [
      { articuloId: 240, articuloCodigo: 'TRI-16', cantidad: 20, unidad: 'pza' },
      { articuloId: 243, articuloCodigo: 'POL-4x4', cantidad: 50, unidad: 'pza' },
      { articuloId: 245, articuloCodigo: 'TAB-1x8', cantidad: 100, unidad: 'pza' },
      { articuloId: 360, articuloCodigo: 'CLV-2.5', cantidad: 20, unidad: 'kg' },
      { articuloId: 7, articuloCodigo: 'ALM-REC', cantidad: 10, unidad: 'kg' }
    ]
  },
  {
    id: 2,
    nombre: 'Acero Cimentación Básico',
    descripcion: 'Acero típico para cimentación residencial',
    items: [
      { articuloId: 1, articuloCodigo: 'VAR-3/8', cantidad: 3, unidad: 'ton' },
      { articuloId: 2, articuloCodigo: 'VAR-1/2', cantidad: 2, unidad: 'ton' },
      { articuloId: 7, articuloCodigo: 'ALM-REC', cantidad: 50, unidad: 'kg' },
      { articuloId: 13, articuloCodigo: 'EST-1/4', cantidad: 500, unidad: 'pza' }
    ]
  },
  {
    id: 3,
    nombre: 'Instalación Eléctrica Básica',
    descripcion: 'Materiales para instalación eléctrica residencial',
    items: [
      { articuloId: 200, articuloCodigo: 'CAB-12', cantidad: 200, unidad: 'm' },
      { articuloId: 201, articuloCodigo: 'CAB-14', cantidad: 100, unidad: 'm' },
      { articuloId: 207, articuloCodigo: 'TUB-COND-1/2', cantidad: 50, unidad: 'pza' },
      { articuloId: 211, articuloCodigo: 'CHK-2P', cantidad: 20, unidad: 'pza' },
      { articuloId: 218, articuloCodigo: 'APG-SEN', cantidad: 15, unidad: 'pza' },
      { articuloId: 221, articuloCodigo: 'CON-DUP', cantidad: 20, unidad: 'pza' }
    ]
  },
  {
    id: 4,
    nombre: 'Concreto para Losa',
    descripcion: 'Materiales para colado de losa',
    items: [
      { articuloId: 91, articuloCodigo: 'CON-200', cantidad: 30, unidad: 'm3' },
      { articuloId: 94, articuloCodigo: 'CON-BOM', cantidad: 30, unidad: 'm3' },
      { articuloId: 97, articuloCodigo: 'FBR-PPL', cantidad: 30, unidad: 'kg' }
    ]
  }
]

let nextSolicitudId = 5
let nextFolio = 5

// CRUD Operations
export function obtenerSolicitudes(filtros = {}) {
  let resultado = [...solicitudesCompra]
  
  if (filtros.proyectoId) {
    resultado = resultado.filter(s => s.proyectoId === filtros.proyectoId)
  }
  if (filtros.fase) {
    resultado = resultado.filter(s => s.fase === filtros.fase)
  }
  if (filtros.estado) {
    resultado = resultado.filter(s => s.estado === filtros.estado)
  }
  if (filtros.proveedorId) {
    resultado = resultado.filter(s => s.proveedorId === filtros.proveedorId)
  }
  
  return resultado.sort((a, b) => new Date(b.fechaSolicitud) - new Date(a.fechaSolicitud))
}

export function obtenerSolicitud(id) {
  return solicitudesCompra.find(s => s.id === id)
}

export function crearSolicitud(data) {
  const folio = `SC-2024-${String(nextFolio++).padStart(3, '0')}`
  
  const nueva = {
    id: nextSolicitudId++,
    folio,
    proyectoId: data.proyectoId,
    proyectoNombre: data.proyectoNombre,
    fase: data.fase,
    proveedorId: data.proveedorId || null,
    proveedorNombre: data.proveedorNombre || null,
    items: data.items || [],
    subtotalEstimado: data.items?.reduce((sum, item) => sum + (item.cantidad * item.precioEstimado), 0) || 0,
    estado: 'borrador',
    solicitadoPor: data.solicitadoPor || 'Usuario',
    solicitadoPorRol: data.solicitadoPorRol || 'admin',
    fechaSolicitud: new Date().toISOString().split('T')[0],
    notas: data.notas || '',
    historial: [
      { estado: 'borrador', fecha: new Date().toISOString().split('T')[0], usuario: data.solicitadoPor || 'Usuario' }
    ]
  }
  
  solicitudesCompra.push(nueva)
  return nueva
}

export function actualizarSolicitud(id, data) {
  const index = solicitudesCompra.findIndex(s => s.id === id)
  if (index === -1) return null
  
  // Recalcular subtotal si hay items
  if (data.items) {
    data.subtotalEstimado = data.items.reduce((sum, item) => sum + (item.cantidad * item.precioEstimado), 0)
  }
  
  solicitudesCompra[index] = { ...solicitudesCompra[index], ...data }
  return solicitudesCompra[index]
}

export function cambiarEstado(id, nuevoEstado, usuario, comentario = '') {
  const solicitud = obtenerSolicitud(id)
  if (!solicitud) return null
  
  const estadoAnterior = solicitud.estado
  solicitud.estado = nuevoEstado
  
  // Agregar al historial
  solicitud.historial.push({
    estado: nuevoEstado,
    estadoAnterior,
    fecha: new Date().toISOString().split('T')[0],
    usuario,
    comentario
  })
  
  // Campos adicionales según estado
  if (nuevoEstado === 'aprobado') {
    solicitud.aprobadoPor = usuario
    solicitud.fechaAprobacion = new Date().toISOString().split('T')[0]
  } else if (nuevoEstado === 'ordenado') {
    solicitud.ordenadoPor = usuario
    solicitud.fechaOrden = new Date().toISOString().split('T')[0]
  } else if (nuevoEstado === 'recibido') {
    solicitud.recibidoPor = usuario
    solicitud.fechaRecepcion = new Date().toISOString().split('T')[0]
  } else if (nuevoEstado === 'pagado') {
    solicitud.pagadoPor = usuario
    solicitud.fechaPago = new Date().toISOString().split('T')[0]
  }
  
  return solicitud
}

export function obtenerPlantillas() {
  return plantillas
}

export function obtenerPlantilla(id) {
  return plantillas.find(p => p.id === id)
}

// Estadísticas
export function obtenerEstadisticas(proyectoId = null) {
  let solicitudes = proyectoId 
    ? solicitudesCompra.filter(s => s.proyectoId === proyectoId)
    : solicitudesCompra
  
  return {
    total: solicitudes.length,
    porEstado: {
      borrador: solicitudes.filter(s => s.estado === 'borrador').length,
      solicitado: solicitudes.filter(s => s.estado === 'solicitado').length,
      aprobado: solicitudes.filter(s => s.estado === 'aprobado').length,
      ordenado: solicitudes.filter(s => s.estado === 'ordenado').length,
      recibido: solicitudes.filter(s => s.estado === 'recibido').length,
      pagado: solicitudes.filter(s => s.estado === 'pagado').length,
      rechazado: solicitudes.filter(s => s.estado === 'rechazado').length
    },
    montoTotal: solicitudes.reduce((sum, s) => sum + s.subtotalEstimado, 0),
    pendientesAprobacion: solicitudes.filter(s => s.estado === 'solicitado').length
  }
}

