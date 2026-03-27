import express from 'express'
import cors from 'cors'
import proyectosRouter from './routes/proyectos.js'
import clientesRouter from './routes/clientes.js'
import empleadosRouter from './routes/empleados.js'
import presupuestosRouter from './routes/presupuestos.js'
import inventarioRouter from './routes/inventario.js'
import solicitudesRouter from './routes/solicitudes.js'
import pagosRouter from './routes/pagos.js'
import contabilidadRouter from './routes/contabilidad.js'
import proveedoresRouter from './routes/proveedores.js'
import catalogoCuentasRouter from './routes/catalogo-cuentas.js'
import catalogoRouter from './routes/catalogo.js'
import comprasRouter from './routes/compras.js'
import solicitudesCompraRouter from './routes/solicitudes-compra.js'
import presupuestosProyectoRouter from './routes/presupuestos-proyecto.js'
import statsRouter from './routes/stats.js'
import usuariosRouter from './routes/usuarios.js'

const app = express()
const PORT = process.env.PORT || 5000

// CORS configuration
const allowedOrigins = [
  'http://localhost:3001',
  'https://bartiz.vercel.app',
  process.env.CORS_ORIGIN
].filter(Boolean)

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true)
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
}

// Middleware
app.use(cors(corsOptions))
app.use(express.json())

// Rutas
app.use('/api/proyectos', proyectosRouter)
app.use('/api/clientes', clientesRouter)
app.use('/api/empleados', empleadosRouter)
app.use('/api/presupuestos', presupuestosRouter)
app.use('/api/inventario', inventarioRouter)
app.use('/api/solicitudes', solicitudesRouter)
app.use('/api/pagos', pagosRouter)
app.use('/api/contabilidad', contabilidadRouter)
app.use('/api/proveedores', proveedoresRouter)
app.use('/api/catalogo-cuentas', catalogoCuentasRouter)
app.use('/api/catalogo', catalogoRouter)
app.use('/api/compras', comprasRouter)
app.use('/api/solicitudes-compra', solicitudesCompraRouter)
app.use('/api/presupuestos-proyecto', presupuestosProyectoRouter)
app.use('/api/stats', statsRouter)
app.use('/api/usuarios', usuariosRouter)

// Ruta raíz
app.get('/', (req, res) => {
  res.json({ 
    mensaje: 'API Sistema Administrativo Constructora',
    version: '1.0.0',
    endpoints: [
      '/api/proyectos',
      '/api/clientes',
      '/api/empleados',
      '/api/presupuestos',
      '/api/inventario',
      '/api/solicitudes',
      '/api/pagos',
      '/api/contabilidad',
      '/api/proveedores',
      '/api/stats'
    ]
  })
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`)
})


