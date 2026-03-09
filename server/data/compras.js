// Compras - Registro de compras vinculadas al catálogo maestro

export let compras = [
  {
    id: 1,
    proveedorId: 1,
    proveedorNombre: 'Aceros del Norte',
    fecha: '2024-06-15',
    items: [
      { articuloId: 1, articuloCodigo: 'VAR-3/8', articuloNombre: 'Varilla Corrugada 3/8"', cantidad: 5, unidad: 'ton', precioUnitario: 18200, subtotal: 91000 },
      { articuloId: 6, articuloCodigo: 'ALM-REC', articuloNombre: 'Alambre Recocido', cantidad: 50, unidad: 'kg', precioUnitario: 45, subtotal: 2250 }
    ],
    subtotal: 93250,
    iva: 14920,
    total: 108170,
    estado: 'completada',
    notas: 'Entrega en obra Centro'
  },
  {
    id: 2,
    proveedorId: 2,
    proveedorNombre: 'Materiales Unidos',
    fecha: '2024-06-12',
    items: [
      { articuloId: 10, articuloCodigo: 'CEM-GRS-50', articuloNombre: 'Cemento Portland Gris 50kg', cantidad: 200, unidad: 'bulto', precioUnitario: 185, subtotal: 37000 },
      { articuloId: 20, articuloCodigo: 'ARN-M3', articuloNombre: 'Arena de Río', cantidad: 15, unidad: 'm3', precioUnitario: 450, subtotal: 6750 }
    ],
    subtotal: 43750,
    iva: 7000,
    total: 50750,
    estado: 'completada',
    notas: ''
  },
  {
    id: 3,
    proveedorId: 3,
    proveedorNombre: 'Fierros Express',
    fecha: '2024-06-10',
    items: [
      { articuloId: 1, articuloCodigo: 'VAR-3/8', articuloNombre: 'Varilla Corrugada 3/8"', cantidad: 3, unidad: 'ton', precioUnitario: 19100, subtotal: 57300 },
      { articuloId: 2, articuloCodigo: 'VAR-1/2', articuloNombre: 'Varilla Corrugada 1/2"', cantidad: 2, unidad: 'ton', precioUnitario: 18800, subtotal: 37600 }
    ],
    subtotal: 94900,
    iva: 15184,
    total: 110084,
    estado: 'completada',
    notas: ''
  }
]

// Historial de precios por artículo y proveedor
export let historialPrecios = [
  { articuloId: 1, proveedorId: 1, precio: 18200, fecha: '2024-06-15', unidad: 'ton' },
  { articuloId: 1, proveedorId: 3, precio: 19100, fecha: '2024-06-10', unidad: 'ton' },
  { articuloId: 1, proveedorId: 2, precio: 18500, fecha: '2024-06-01', unidad: 'ton' },
  { articuloId: 10, proveedorId: 2, precio: 185, fecha: '2024-06-12', unidad: 'bulto' },
  { articuloId: 10, proveedorId: 1, precio: 190, fecha: '2024-06-05', unidad: 'bulto' },
  { articuloId: 20, proveedorId: 2, precio: 450, fecha: '2024-06-12', unidad: 'm3' }
]

let nextCompraId = 4

// CRUD Compras
export function obtenerCompras(filtros = {}) {
  let resultado = [...compras]
  
  if (filtros.proveedorId) {
    resultado = resultado.filter(c => c.proveedorId === filtros.proveedorId)
  }
  if (filtros.estado) {
    resultado = resultado.filter(c => c.estado === filtros.estado)
  }
  if (filtros.desde) {
    resultado = resultado.filter(c => c.fecha >= filtros.desde)
  }
  if (filtros.hasta) {
    resultado = resultado.filter(c => c.fecha <= filtros.hasta)
  }
  
  return resultado.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
}

export function obtenerCompra(id) {
  return compras.find(c => c.id === id)
}

export function crearCompra(data) {
  const subtotal = data.items.reduce((sum, item) => sum + item.subtotal, 0)
  const iva = subtotal * 0.16
  
  const nuevaCompra = {
    id: nextCompraId++,
    proveedorId: data.proveedorId,
    proveedorNombre: data.proveedorNombre,
    fecha: data.fecha || new Date().toISOString().split('T')[0],
    items: data.items,
    subtotal,
    iva,
    total: subtotal + iva,
    estado: data.estado || 'pendiente',
    notas: data.notas || ''
  }
  
  compras.push(nuevaCompra)
  
  // Actualizar historial de precios
  data.items.forEach(item => {
    historialPrecios.push({
      articuloId: item.articuloId,
      proveedorId: data.proveedorId,
      precio: item.precioUnitario,
      fecha: nuevaCompra.fecha,
      unidad: item.unidad
    })
  })
  
  return nuevaCompra
}

export function actualizarCompra(id, data) {
  const index = compras.findIndex(c => c.id === id)
  if (index === -1) return null
  
  compras[index] = { ...compras[index], ...data }
  return compras[index]
}

// Comparación de precios
export function compararPrecios(articuloId) {
  const precios = historialPrecios
    .filter(h => h.articuloId === articuloId)
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
  
  // Agrupar por proveedor (último precio de cada uno)
  const porProveedor = {}
  precios.forEach(p => {
    if (!porProveedor[p.proveedorId]) {
      porProveedor[p.proveedorId] = p
    }
  })
  
  const resultado = Object.values(porProveedor)
    .sort((a, b) => a.precio - b.precio)
  
  return resultado
}

export function obtenerHistorialPrecios(articuloId, proveedorId = null) {
  let resultado = historialPrecios.filter(h => h.articuloId === articuloId)
  
  if (proveedorId) {
    resultado = resultado.filter(h => h.proveedorId === proveedorId)
  }
  
  return resultado.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
}

