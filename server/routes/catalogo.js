import { Router } from 'express'
import { 
  catalogo, 
  categorias, 
  unidades,
  buscarEnCatalogo, 
  obtenerArticulo, 
  crearArticulo, 
  actualizarArticulo, 
  eliminarArticulo,
  obtenerPorCategoria
} from '../data/catalogo.js'

const router = Router()

// GET /api/catalogo - Listar todos los artículos
router.get('/', (req, res) => {
  const { categoria, activo = 'true' } = req.query
  let resultado = catalogo.filter(item => activo === 'true' ? item.activo : true)
  
  if (categoria) {
    resultado = resultado.filter(item => item.categoria === categoria)
  }
  
  res.json(resultado)
})

// GET /api/catalogo/categorias - Listar categorías
router.get('/categorias', (req, res) => {
  res.json(categorias)
})

// GET /api/catalogo/unidades - Listar unidades
router.get('/unidades', (req, res) => {
  res.json(unidades)
})

// GET /api/catalogo/buscar - Búsqueda fuzzy
router.get('/buscar', (req, res) => {
  const { q, limite = 10 } = req.query
  
  if (!q || q.length < 2) {
    return res.json([])
  }
  
  const resultados = buscarEnCatalogo(q, parseInt(limite))
  res.json(resultados)
})

// GET /api/catalogo/categoria/:id - Artículos por categoría
router.get('/categoria/:id', (req, res) => {
  const articulos = obtenerPorCategoria(req.params.id)
  res.json(articulos)
})

// GET /api/catalogo/:id - Obtener un artículo
router.get('/:id', (req, res) => {
  const articulo = obtenerArticulo(parseInt(req.params.id))
  
  if (!articulo) {
    return res.status(404).json({ error: 'Artículo no encontrado' })
  }
  
  res.json(articulo)
})

// POST /api/catalogo - Crear artículo
router.post('/', (req, res) => {
  const { nombre, categoria, unidad, aliases, especificaciones, codigo } = req.body
  
  if (!nombre || !categoria || !unidad) {
    return res.status(400).json({ error: 'Nombre, categoría y unidad son requeridos' })
  }
  
  const nuevoArticulo = crearArticulo({
    nombre,
    categoria,
    unidad,
    aliases: aliases || [],
    especificaciones: especificaciones || {},
    codigo
  })
  
  res.status(201).json(nuevoArticulo)
})

// PUT /api/catalogo/:id - Actualizar artículo
router.put('/:id', (req, res) => {
  const articulo = actualizarArticulo(parseInt(req.params.id), req.body)
  
  if (!articulo) {
    return res.status(404).json({ error: 'Artículo no encontrado' })
  }
  
  res.json(articulo)
})

// DELETE /api/catalogo/:id - Eliminar artículo (soft delete)
router.delete('/:id', (req, res) => {
  const eliminado = eliminarArticulo(parseInt(req.params.id))
  
  if (!eliminado) {
    return res.status(404).json({ error: 'Artículo no encontrado' })
  }
  
  res.json({ success: true })
})

export default router

