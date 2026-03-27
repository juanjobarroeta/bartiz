// Órdenes de Compra - Inicialmente vacío
let compras = []
let compraIdCounter = 1

export const obtenerCompras = (filtros = {}) => {
  let resultado = [...compras]
  
  if (filtros.proveedorId) {
    resultado = resultado.filter(c => c.proveedorId === filtros.proveedorId)
  }
  if (filtros.estado) {
    resultado = resultado.filter(c => c.estado === filtros.estado)
  }
  
  return resultado
}

export const obtenerCompra = (id) => {
  return compras.find(c => c.id === id)
}

export const crearCompra = (datos) => {
  const nuevaCompra = {
    id: compraIdCounter++,
    ...datos,
    estado: 'pendiente',
    fecha: datos.fecha || new Date().toISOString().split('T')[0],
    total: datos.items.reduce((sum, item) => sum + (item.precio * item.cantidad), 0)
  }
  compras.push(nuevaCompra)
  return nuevaCompra
}

export const actualizarCompra = (id, datos) => {
  const index = compras.findIndex(c => c.id === id)
  if (index === -1) return null
  
  compras[index] = { ...compras[index], ...datos }
  return compras[index]
}

export const compararPrecios = (articuloId) => {
  const precios = []
  compras.forEach(compra => {
    compra.items.forEach(item => {
      if (item.articuloId === articuloId) {
        precios.push({
          proveedorId: compra.proveedorId,
          precio: item.precio,
          fecha: compra.fecha
        })
      }
    })
  })
  return precios
}

export const obtenerHistorialPrecios = (articuloId, proveedorId = null) => {
  const historial = []
  compras.forEach(compra => {
    if (proveedorId && compra.proveedorId !== proveedorId) return
    
    compra.items.forEach(item => {
      if (item.articuloId === articuloId) {
        historial.push({
          proveedorId: compra.proveedorId,
          precio: item.precio,
          fecha: compra.fecha,
          cantidad: item.cantidad
        })
      }
    })
  })
  return historial.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
}

export default compras
