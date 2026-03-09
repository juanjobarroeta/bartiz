// Presupuestos de Proyecto - Project Budgets
// Budget-first approach: Define what you need, then track purchases against it

export const fasesProyecto = [
  { id: 'preliminares', nombre: 'Preliminares', orden: 1 },
  { id: 'cimentacion', nombre: 'Cimentación', orden: 2 },
  { id: 'estructura', nombre: 'Estructura', orden: 3 },
  { id: 'albanileria', nombre: 'Albañilería', orden: 4 },
  { id: 'instalacion_hidraulica', nombre: 'Instalación Hidráulica', orden: 5 },
  { id: 'instalacion_electrica', nombre: 'Instalación Eléctrica', orden: 6 },
  { id: 'acabados_interiores', nombre: 'Acabados Interiores', orden: 7 },
  { id: 'acabados_exteriores', nombre: 'Acabados Exteriores', orden: 8 },
  { id: 'carpinteria', nombre: 'Carpintería', orden: 9 },
  { id: 'herreria', nombre: 'Herrería', orden: 10 },
  { id: 'limpieza', nombre: 'Limpieza y Entrega', orden: 11 }
]

// Presupuestos por proyecto
export let presupuestosProyecto = [
  {
    id: 1,
    proyectoId: 1,
    proyectoNombre: 'Edificio Residencial Centro',
    fechaCreacion: '2024-01-15',
    fechaActualizacion: '2024-06-10',
    estado: 'activo', // activo, cerrado, revision
    fases: [
      {
        id: 'cimentacion',
        nombre: 'Cimentación',
        items: [
          {
            id: 101,
            articuloId: 1,
            articuloCodigo: 'VAR-3/8',
            articuloNombre: 'Varilla Corrugada 3/8"',
            unidad: 'ton',
            cantidadPresupuestada: 8,
            precioUnitarioEstimado: 18500,
            subtotalEstimado: 148000,
            cantidadSolicitada: 5,
            cantidadRecibida: 5,
            cantidadPagada: 5,
            gastoReal: 92500
          },
          {
            id: 102,
            articuloId: 2,
            articuloCodigo: 'VAR-1/2',
            articuloNombre: 'Varilla Corrugada 1/2"',
            unidad: 'ton',
            cantidadPresupuestada: 5,
            precioUnitarioEstimado: 18800,
            subtotalEstimado: 94000,
            cantidadSolicitada: 0,
            cantidadRecibida: 0,
            cantidadPagada: 0,
            gastoReal: 0
          },
          {
            id: 103,
            articuloId: 7,
            articuloCodigo: 'ALM-REC',
            articuloNombre: 'Alambre Recocido',
            unidad: 'kg',
            cantidadPresupuestada: 150,
            precioUnitarioEstimado: 45,
            subtotalEstimado: 6750,
            cantidadSolicitada: 100,
            cantidadRecibida: 100,
            cantidadPagada: 100,
            gastoReal: 4500
          },
          {
            id: 104,
            articuloId: 50,
            articuloCodigo: 'CEM-GRS-50',
            articuloNombre: 'Cemento Portland Gris 50kg',
            unidad: 'bulto',
            cantidadPresupuestada: 500,
            precioUnitarioEstimado: 185,
            subtotalEstimado: 92500,
            cantidadSolicitada: 300,
            cantidadRecibida: 300,
            cantidadPagada: 0,
            gastoReal: 55500
          },
          {
            id: 105,
            articuloId: 70,
            articuloCodigo: 'ARN-RIO',
            articuloNombre: 'Arena de Río',
            unidad: 'm3',
            cantidadPresupuestada: 30,
            precioUnitarioEstimado: 450,
            subtotalEstimado: 13500,
            cantidadSolicitada: 20,
            cantidadRecibida: 20,
            cantidadPagada: 20,
            gastoReal: 9000
          },
          {
            id: 106,
            articuloId: 72,
            articuloCodigo: 'GRV-3/4',
            articuloNombre: 'Grava 3/4"',
            unidad: 'm3',
            cantidadPresupuestada: 25,
            precioUnitarioEstimado: 480,
            subtotalEstimado: 12000,
            cantidadSolicitada: 0,
            cantidadRecibida: 0,
            cantidadPagada: 0,
            gastoReal: 0
          },
          {
            id: 107,
            articuloId: 91,
            articuloCodigo: 'CON-200',
            articuloNombre: 'Concreto Premezclado f\'c=200',
            unidad: 'm3',
            cantidadPresupuestada: 80,
            precioUnitarioEstimado: 2200,
            subtotalEstimado: 176000,
            cantidadSolicitada: 0,
            cantidadRecibida: 0,
            cantidadPagada: 0,
            gastoReal: 0
          }
        ]
      },
      {
        id: 'estructura',
        nombre: 'Estructura',
        items: [
          {
            id: 201,
            articuloId: 2,
            articuloCodigo: 'VAR-1/2',
            articuloNombre: 'Varilla Corrugada 1/2"',
            unidad: 'ton',
            cantidadPresupuestada: 12,
            precioUnitarioEstimado: 18800,
            subtotalEstimado: 225600,
            cantidadSolicitada: 0,
            cantidadRecibida: 0,
            cantidadPagada: 0,
            gastoReal: 0
          },
          {
            id: 202,
            articuloId: 3,
            articuloCodigo: 'VAR-5/8',
            articuloNombre: 'Varilla Corrugada 5/8"',
            unidad: 'ton',
            cantidadPresupuestada: 6,
            precioUnitarioEstimado: 19200,
            subtotalEstimado: 115200,
            cantidadSolicitada: 0,
            cantidadRecibida: 0,
            cantidadPagada: 0,
            gastoReal: 0
          },
          {
            id: 203,
            articuloId: 9,
            articuloCodigo: 'MAL-6x6',
            articuloNombre: 'Malla Electrosoldada 6x6',
            unidad: 'pza',
            cantidadPresupuestada: 100,
            precioUnitarioEstimado: 850,
            subtotalEstimado: 85000,
            cantidadSolicitada: 0,
            cantidadRecibida: 0,
            cantidadPagada: 0,
            gastoReal: 0
          },
          {
            id: 204,
            articuloId: 240,
            articuloCodigo: 'TRI-16',
            articuloNombre: 'Triplay 16mm',
            unidad: 'pza',
            cantidadPresupuestada: 80,
            precioUnitarioEstimado: 650,
            subtotalEstimado: 52000,
            cantidadSolicitada: 0,
            cantidadRecibida: 0,
            cantidadPagada: 0,
            gastoReal: 0
          },
          {
            id: 205,
            articuloId: 243,
            articuloCodigo: 'POL-4x4',
            articuloNombre: 'Polín 4x4"',
            unidad: 'pza',
            cantidadPresupuestada: 120,
            precioUnitarioEstimado: 180,
            subtotalEstimado: 21600,
            cantidadSolicitada: 0,
            cantidadRecibida: 0,
            cantidadPagada: 0,
            gastoReal: 0
          }
        ]
      },
      {
        id: 'instalacion_electrica',
        nombre: 'Instalación Eléctrica',
        items: [
          {
            id: 301,
            articuloId: 200,
            articuloCodigo: 'CAB-12',
            articuloNombre: 'Cable THW Cal. 12',
            unidad: 'm',
            cantidadPresupuestada: 1000,
            precioUnitarioEstimado: 12,
            subtotalEstimado: 12000,
            cantidadSolicitada: 500,
            cantidadRecibida: 0,
            cantidadPagada: 0,
            gastoReal: 0
          },
          {
            id: 302,
            articuloId: 201,
            articuloCodigo: 'CAB-14',
            articuloNombre: 'Cable THW Cal. 14',
            unidad: 'm',
            cantidadPresupuestada: 500,
            precioUnitarioEstimado: 10,
            subtotalEstimado: 5000,
            cantidadSolicitada: 0,
            cantidadRecibida: 0,
            cantidadPagada: 0,
            gastoReal: 0
          },
          {
            id: 303,
            articuloId: 207,
            articuloCodigo: 'TUB-COND-1/2',
            articuloNombre: 'Tubo Conduit PVC 1/2"',
            unidad: 'pza',
            cantidadPresupuestada: 200,
            precioUnitarioEstimado: 35,
            subtotalEstimado: 7000,
            cantidadSolicitada: 100,
            cantidadRecibida: 0,
            cantidadPagada: 0,
            gastoReal: 0
          }
        ]
      }
    ],
    resumen: {
      totalPresupuestado: 1066150,
      totalSolicitado: 245500,
      totalRecibido: 161500,
      totalPagado: 106000,
      totalGastoReal: 161500
    }
  },
  {
    id: 2,
    proyectoId: 2,
    proyectoNombre: 'Centro Comercial Norte',
    fechaCreacion: '2024-02-01',
    fechaActualizacion: '2024-06-08',
    estado: 'activo',
    fases: [
      {
        id: 'estructura',
        nombre: 'Estructura',
        items: [
          {
            id: 401,
            articuloId: 2,
            articuloCodigo: 'VAR-1/2',
            articuloNombre: 'Varilla Corrugada 1/2"',
            unidad: 'ton',
            cantidadPresupuestada: 15,
            precioUnitarioEstimado: 18800,
            subtotalEstimado: 282000,
            cantidadSolicitada: 10,
            cantidadRecibida: 0,
            cantidadPagada: 0,
            gastoReal: 0
          },
          {
            id: 402,
            articuloId: 9,
            articuloCodigo: 'MAL-6x6',
            articuloNombre: 'Malla Electrosoldada 6x6',
            unidad: 'pza',
            cantidadPresupuestada: 100,
            precioUnitarioEstimado: 850,
            subtotalEstimado: 85000,
            cantidadSolicitada: 50,
            cantidadRecibida: 0,
            cantidadPagada: 0,
            gastoReal: 0
          }
        ]
      }
    ],
    resumen: {
      totalPresupuestado: 367000,
      totalSolicitado: 230500,
      totalRecibido: 0,
      totalPagado: 0,
      totalGastoReal: 0
    }
  }
]

let nextPresupuestoId = 3
let nextItemId = 500

// Funciones CRUD
export function obtenerPresupuestos(filtros = {}) {
  let resultado = [...presupuestosProyecto]
  
  if (filtros.proyectoId) {
    resultado = resultado.filter(p => p.proyectoId === filtros.proyectoId)
  }
  if (filtros.estado) {
    resultado = resultado.filter(p => p.estado === filtros.estado)
  }
  
  return resultado
}

export function obtenerPresupuesto(id) {
  return presupuestosProyecto.find(p => p.id === id)
}

export function obtenerPresupuestoPorProyecto(proyectoId) {
  return presupuestosProyecto.find(p => p.proyectoId === proyectoId)
}

export function crearPresupuesto(data) {
  const nuevo = {
    id: nextPresupuestoId++,
    proyectoId: data.proyectoId,
    proyectoNombre: data.proyectoNombre,
    fechaCreacion: new Date().toISOString().split('T')[0],
    fechaActualizacion: new Date().toISOString().split('T')[0],
    estado: 'activo',
    fases: data.fases || [],
    resumen: calcularResumen(data.fases || [])
  }
  
  presupuestosProyecto.push(nuevo)
  return nuevo
}

export function actualizarPresupuesto(id, data) {
  const index = presupuestosProyecto.findIndex(p => p.id === id)
  if (index === -1) return null
  
  const actualizado = {
    ...presupuestosProyecto[index],
    ...data,
    fechaActualizacion: new Date().toISOString().split('T')[0]
  }
  
  // Recalcular resumen si hay fases
  if (data.fases) {
    actualizado.resumen = calcularResumen(data.fases)
  }
  
  presupuestosProyecto[index] = actualizado
  return actualizado
}

export function agregarItemAFase(presupuestoId, faseId, item) {
  const presupuesto = obtenerPresupuesto(presupuestoId)
  if (!presupuesto) return null
  
  let fase = presupuesto.fases.find(f => f.id === faseId)
  
  // Crear fase si no existe
  if (!fase) {
    const faseInfo = fasesProyecto.find(f => f.id === faseId)
    fase = {
      id: faseId,
      nombre: faseInfo?.nombre || faseId,
      items: []
    }
    presupuesto.fases.push(fase)
  }
  
  // Verificar si el artículo ya existe en la fase
  const existe = fase.items.find(i => i.articuloId === item.articuloId)
  if (existe) {
    return { error: 'El artículo ya existe en esta fase' }
  }
  
  const nuevoItem = {
    id: nextItemId++,
    articuloId: item.articuloId,
    articuloCodigo: item.articuloCodigo,
    articuloNombre: item.articuloNombre,
    unidad: item.unidad,
    cantidadPresupuestada: item.cantidadPresupuestada || 0,
    precioUnitarioEstimado: item.precioUnitarioEstimado || 0,
    subtotalEstimado: (item.cantidadPresupuestada || 0) * (item.precioUnitarioEstimado || 0),
    cantidadSolicitada: 0,
    cantidadRecibida: 0,
    cantidadPagada: 0,
    gastoReal: 0
  }
  
  fase.items.push(nuevoItem)
  presupuesto.resumen = calcularResumen(presupuesto.fases)
  presupuesto.fechaActualizacion = new Date().toISOString().split('T')[0]
  
  return nuevoItem
}

export function actualizarItemPresupuesto(presupuestoId, faseId, itemId, data) {
  const presupuesto = obtenerPresupuesto(presupuestoId)
  if (!presupuesto) return null
  
  const fase = presupuesto.fases.find(f => f.id === faseId)
  if (!fase) return null
  
  const itemIndex = fase.items.findIndex(i => i.id === itemId)
  if (itemIndex === -1) return null
  
  fase.items[itemIndex] = {
    ...fase.items[itemIndex],
    ...data,
    subtotalEstimado: (data.cantidadPresupuestada || fase.items[itemIndex].cantidadPresupuestada) * 
                      (data.precioUnitarioEstimado || fase.items[itemIndex].precioUnitarioEstimado)
  }
  
  presupuesto.resumen = calcularResumen(presupuesto.fases)
  presupuesto.fechaActualizacion = new Date().toISOString().split('T')[0]
  
  return fase.items[itemIndex]
}

export function eliminarItemPresupuesto(presupuestoId, faseId, itemId) {
  const presupuesto = obtenerPresupuesto(presupuestoId)
  if (!presupuesto) return false
  
  const fase = presupuesto.fases.find(f => f.id === faseId)
  if (!fase) return false
  
  const itemIndex = fase.items.findIndex(i => i.id === itemId)
  if (itemIndex === -1) return false
  
  fase.items.splice(itemIndex, 1)
  presupuesto.resumen = calcularResumen(presupuesto.fases)
  presupuesto.fechaActualizacion = new Date().toISOString().split('T')[0]
  
  return true
}

// Obtener items pendientes de solicitar
export function obtenerItemsPendientes(presupuestoId, faseId = null) {
  const presupuesto = obtenerPresupuesto(presupuestoId)
  if (!presupuesto) return []
  
  const items = []
  
  const fasesToCheck = faseId 
    ? presupuesto.fases.filter(f => f.id === faseId)
    : presupuesto.fases
  
  fasesToCheck.forEach(fase => {
    fase.items.forEach(item => {
      const pendiente = item.cantidadPresupuestada - item.cantidadSolicitada
      if (pendiente > 0) {
        items.push({
          ...item,
          faseId: fase.id,
          faseNombre: fase.nombre,
          cantidadPendiente: pendiente
        })
      }
    })
  })
  
  return items
}

// Calcular resumen del presupuesto
function calcularResumen(fases) {
  let totalPresupuestado = 0
  let totalSolicitado = 0
  let totalRecibido = 0
  let totalPagado = 0
  let totalGastoReal = 0
  
  fases.forEach(fase => {
    fase.items.forEach(item => {
      totalPresupuestado += item.subtotalEstimado || 0
      totalSolicitado += (item.cantidadSolicitada || 0) * (item.precioUnitarioEstimado || 0)
      totalRecibido += (item.cantidadRecibida || 0) * (item.precioUnitarioEstimado || 0)
      totalPagado += (item.cantidadPagada || 0) * (item.precioUnitarioEstimado || 0)
      totalGastoReal += item.gastoReal || 0
    })
  })
  
  return {
    totalPresupuestado,
    totalSolicitado,
    totalRecibido,
    totalPagado,
    totalGastoReal
  }
}

// Actualizar cantidades cuando se crea una solicitud
export function registrarSolicitud(presupuestoId, faseId, articuloId, cantidad) {
  const presupuesto = obtenerPresupuesto(presupuestoId)
  if (!presupuesto) return null
  
  const fase = presupuesto.fases.find(f => f.id === faseId)
  if (!fase) return null
  
  const item = fase.items.find(i => i.articuloId === articuloId)
  if (!item) return null
  
  item.cantidadSolicitada = (item.cantidadSolicitada || 0) + cantidad
  presupuesto.resumen = calcularResumen(presupuesto.fases)
  
  return item
}

export function registrarRecepcion(presupuestoId, faseId, articuloId, cantidad, precioReal) {
  const presupuesto = obtenerPresupuesto(presupuestoId)
  if (!presupuesto) return null
  
  const fase = presupuesto.fases.find(f => f.id === faseId)
  if (!fase) return null
  
  const item = fase.items.find(i => i.articuloId === articuloId)
  if (!item) return null
  
  item.cantidadRecibida = (item.cantidadRecibida || 0) + cantidad
  item.gastoReal = (item.gastoReal || 0) + (cantidad * precioReal)
  presupuesto.resumen = calcularResumen(presupuesto.fases)
  
  return item
}

export function registrarPago(presupuestoId, faseId, articuloId, cantidad) {
  const presupuesto = obtenerPresupuesto(presupuestoId)
  if (!presupuesto) return null
  
  const fase = presupuesto.fases.find(f => f.id === faseId)
  if (!fase) return null
  
  const item = fase.items.find(i => i.articuloId === articuloId)
  if (!item) return null
  
  item.cantidadPagada = (item.cantidadPagada || 0) + cantidad
  presupuesto.resumen = calcularResumen(presupuesto.fases)
  
  return item
}

export { fasesProyecto as fases }

