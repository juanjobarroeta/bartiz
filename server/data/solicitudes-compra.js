// Solicitudes de Compra
let solicitudesCompra = []
let solicitudIdCounter = 1

export const obtenerSolicitudes = (filtros = {}) => {
  let resultado = [...solicitudesCompra]
  
  if (filtros.estado) {
    resultado = resultado.filter(s => s.estado === filtros.estado)
  }
  if (filtros.proyectoId) {
    resultado = resultado.filter(s => s.proyectoId === parseInt(filtros.proyectoId))
  }
  
  return resultado
}

export const obtenerSolicitud = (id) => {
  return solicitudesCompra.find(s => s.id === id)
}

export const crearSolicitud = (datos) => {
  const nuevaSolicitud = {
    id: solicitudIdCounter++,
    ...datos,
    estado: 'pendiente',
    fechaSolicitud: datos.fechaSolicitud || new Date().toISOString().split('T')[0],
    fechaCreacion: new Date().toISOString()
  }
  solicitudesCompra.push(nuevaSolicitud)
  return nuevaSolicitud
}

export const actualizarSolicitud = (id, datos) => {
  const index = solicitudesCompra.findIndex(s => s.id === id)
  if (index === -1) return null
  
  solicitudesCompra[index] = { ...solicitudesCompra[index], ...datos }
  return solicitudesCompra[index]
}

export const cambiarEstado = (id, nuevoEstado) => {
  return actualizarSolicitud(id, { estado: nuevoEstado })
}

export const obtenerPlantillas = () => {
  return []
}

export const obtenerPlantilla = (id) => {
  return null
}

export const obtenerEstadisticas = () => {
  return {
    total: solicitudesCompra.length,
    pendientes: solicitudesCompra.filter(s => s.estado === 'pendiente').length,
    aprobadas: solicitudesCompra.filter(s => s.estado === 'aprobada').length,
    rechazadas: solicitudesCompra.filter(s => s.estado === 'rechazada').length
  }
}

export default solicitudesCompra
