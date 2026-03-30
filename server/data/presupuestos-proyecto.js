// Presupuestos de Proyecto
let presupuestosProyecto = []
let presupuestoIdCounter = 1

export const fases = [
  { id: 'limpieza', nombre: 'Limpieza' },
  { id: 'demoliciones', nombre: 'Demoliciones' },
  { id: 'preliminares', nombre: 'Preliminares' },
  { id: 'cimentacion', nombre: 'Cimentación' },
  { id: 'estructura', nombre: 'Estructura' },
  { id: 'albanileria', nombre: 'Albañilería' },
  { id: 'instalaciones', nombre: 'Instalaciones' },
  { id: 'acabados', nombre: 'Acabados' },
  { id: 'exteriores', nombre: 'Exteriores' },
  { id: 'varios', nombre: 'Varios' }
]

export const obtenerPresupuestos = () => {
  return presupuestosProyecto
}

export const obtenerPresupuesto = (id) => {
  return presupuestosProyecto.find(p => p.id === id)
}

export const obtenerPresupuestoPorProyecto = (proyectoId) => {
  return presupuestosProyecto.find(p => p.proyectoId === parseInt(proyectoId))
}

export const crearPresupuesto = (datos) => {
  const nuevoPresupuesto = {
    id: presupuestoIdCounter++,
    ...datos,
    fases: datos.fases || [],
    estado: 'activo',
    fechaCreacion: new Date().toISOString(),
    fechaActualizacion: new Date().toLocaleDateString('es-MX')
  }
  presupuestosProyecto.push(nuevoPresupuesto)
  return nuevoPresupuesto
}

export const actualizarPresupuesto = (id, datos) => {
  const index = presupuestosProyecto.findIndex(p => p.id === id)
  if (index === -1) return null
  
  presupuestosProyecto[index] = {
    ...presupuestosProyecto[index],
    ...datos,
    fechaActualizacion: new Date().toLocaleDateString('es-MX')
  }
  return presupuestosProyecto[index]
}

export const agregarItemAFase = (presupuestoId, faseId, item) => {
  const presupuesto = obtenerPresupuesto(presupuestoId)
  if (!presupuesto) return null
  
  const fase = presupuesto.fases.find(f => f.id === faseId)
  if (!fase) return null
  
  fase.items.push(item)
  return actualizarPresupuesto(presupuestoId, presupuesto)
}

export const actualizarItemPresupuesto = (presupuestoId, faseId, itemId, datosItem) => {
  const presupuesto = obtenerPresupuesto(presupuestoId)
  if (!presupuesto) return null
  
  const fase = presupuesto.fases.find(f => f.id === faseId)
  if (!fase) return null
  
  const itemIndex = fase.items.findIndex(i => i.id === itemId)
  if (itemIndex === -1) return null
  
  fase.items[itemIndex] = { ...fase.items[itemIndex], ...datosItem }
  return actualizarPresupuesto(presupuestoId, presupuesto)
}

export const eliminarItemPresupuesto = (presupuestoId, faseId, itemId) => {
  const presupuesto = obtenerPresupuesto(presupuestoId)
  if (!presupuesto) return null
  
  const fase = presupuesto.fases.find(f => f.id === faseId)
  if (!fase) return null
  
  fase.items = fase.items.filter(i => i.id !== itemId)
  return actualizarPresupuesto(presupuestoId, presupuesto)
}

export const generarSolicitudCompra = (presupuestoId, itemsSeleccionados) => {
  const presupuesto = obtenerPresupuesto(presupuestoId)
  if (!presupuesto) return null
  
  return {
    proyectoId: presupuesto.proyectoId,
    proyectoNombre: presupuesto.proyectoNombre,
    items: itemsSeleccionados
  }
}

export const obtenerItemsPendientes = (presupuestoId) => {
  const presupuesto = obtenerPresupuesto(presupuestoId)
  if (!presupuesto) return []
  
  const itemsPendientes = []
  presupuesto.fases?.forEach(fase => {
    fase.items?.forEach(item => {
      if (!item.ordenado || item.cantidadPendiente > 0) {
        itemsPendientes.push({
          ...item,
          faseId: fase.id,
          faseNombre: fase.nombre
        })
      }
    })
  })
  
  return itemsPendientes
}

export default presupuestosProyecto
