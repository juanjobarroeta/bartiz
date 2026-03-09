# Sistema Administrativo para Constructora

Sistema de gestión administrativa completo para empresas constructoras, con diseño minimalista y funcionalidades profesionales.

## 🏗️ Características Principales

### Gestión de Proyectos
- Registro y seguimiento de proyectos de construcción
- Estados: Planeación, En Progreso, Pausado, Completado
- Control de presupuesto por proyecto
- Indicadores de progreso visuales

### Administración de Clientes
- Base de datos de clientes y empresas
- Información de contacto completa
- Registro de empresas asociadas

### Gestión de Personal
- Control de empleados y recursos humanos
- Registro de puestos y especialidades
- Seguimiento de salarios
- Historial de contrataciones

### Control Financiero
- Seguimiento de presupuestos por proyecto
- Comparativo de presupuestado vs gastado
- Indicadores de disponibilidad
- Alertas de sobregasto

### Inventario
- Control de materiales de construcción
- Gestión de equipos y maquinaria
- Valorización de inventario
- Control de ubicaciones

### Dashboard Ejecutivo
- Resumen general de operaciones
- Estadísticas en tiempo real
- Proyectos recientes
- Indicadores clave de negocio

## 📦 Instalación

### Requisitos Previos
- Node.js 18 o superior
- npm o yarn

### Pasos de Instalación

1. **Clonar o descargar el proyecto**
```bash
cd construccion-admin
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Iniciar el servidor de desarrollo**
```bash
npm run dev
```

Esto iniciará:
- Frontend en `http://localhost:3000`
- Backend API en `http://localhost:5000`

## 🚀 Scripts Disponibles

```bash
npm run dev       # Inicia frontend y backend en modo desarrollo
npm run client    # Solo frontend (Vite)
npm run server    # Solo backend (Express)
npm run build     # Construye la aplicación para producción
npm run preview   # Vista previa de la build de producción
```

## 🛠️ Tecnologías

### Frontend
- **React 18**: Biblioteca de UI
- **React Router 6**: Navegación y rutas
- **Vite**: Build tool y dev server
- **CSS Vanilla**: Estilos puros sin frameworks

### Backend
- **Express.js**: Framework de servidor
- **CORS**: Manejo de peticiones cross-origin
- **ES Modules**: JavaScript moderno

### Diseño
- Diseño minimalista "clean canvas"
- Tipografía mixta (sans-serif, italic, monospace)
- Sistema de colores ultra-minimal

## 📁 Estructura del Proyecto

```
construccion-admin/
├── src/                        # Código frontend
│   ├── components/             # Componentes reutilizables
│   │   ├── Layout.jsx         # Layout principal con sidebar
│   │   └── Layout.css
│   ├── pages/                  # Páginas de la aplicación
│   │   ├── Dashboard.jsx      # Dashboard principal
│   │   ├── Proyectos.jsx      # Gestión de proyectos
│   │   ├── Clientes.jsx       # Gestión de clientes
│   │   ├── Empleados.jsx      # Gestión de empleados
│   │   ├── Presupuestos.jsx   # Control financiero
│   │   ├── Inventario.jsx     # Control de inventario
│   │   └── *.css              # Estilos por página
│   ├── styles/
│   │   └── global.css         # Estilos globales y utilidades
│   ├── App.jsx                # Componente raíz
│   └── main.jsx               # Punto de entrada
├── server/                     # Código backend
│   ├── routes/                # Rutas de la API
│   │   ├── proyectos.js
│   │   ├── clientes.js
│   │   ├── empleados.js
│   │   ├── presupuestos.js
│   │   ├── inventario.js
│   │   └── stats.js
│   ├── data/                  # Datos simulados
│   │   ├── proyectos.js
│   │   ├── clientes.js
│   │   ├── empleados.js
│   │   ├── presupuestos.js
│   │   └── inventario.js
│   └── index.js               # Servidor Express
├── index.html                 # HTML base
├── vite.config.js            # Configuración de Vite
├── package.json              # Dependencias
└── README.md                 # Este archivo
```

## 🎨 Sistema de Diseño

### Paleta de Colores
```css
--color-black: #000000    /* Texto principal */
--color-white: #FFFFFF    /* Fondos */
--color-gray: #C6C6C6     /* Bordes y elementos sutiles */
--color-beige: #DFD8CB    /* Acentos mínimos */
```

### Tipografía
- **Headers**: Sans-serif, peso 900 (black)
- **Body**: Sans-serif, peso 400 (regular)
- **Section titles**: Italic, peso 400
- **Labels**: Monospace, uppercase, tracking amplio

### Componentes Reutilizables
- `.btn` - Botones base
- `.btn-primary` - Botones primarios
- `.card` - Tarjetas de contenido
- `.input` - Campos de formulario
- `.label` - Etiquetas monospace
- `.table` - Tablas de datos

## 🔌 API Endpoints

### Proyectos
- `GET /api/proyectos` - Listar todos los proyectos
- `GET /api/proyectos/:id` - Obtener un proyecto
- `POST /api/proyectos` - Crear proyecto
- `PUT /api/proyectos/:id` - Actualizar proyecto
- `DELETE /api/proyectos/:id` - Eliminar proyecto

### Clientes
- `GET /api/clientes` - Listar todos los clientes
- `GET /api/clientes/:id` - Obtener un cliente
- `POST /api/clientes` - Crear cliente
- `PUT /api/clientes/:id` - Actualizar cliente
- `DELETE /api/clientes/:id` - Eliminar cliente

### Empleados
- `GET /api/empleados` - Listar todos los empleados
- `GET /api/empleados/:id` - Obtener un empleado
- `POST /api/empleados` - Crear empleado
- `PUT /api/empleados/:id` - Actualizar empleado
- `DELETE /api/empleados/:id` - Eliminar empleado

### Presupuestos
- `GET /api/presupuestos` - Listar todos los presupuestos
- `GET /api/presupuestos/:id` - Obtener un presupuesto
- `POST /api/presupuestos` - Crear presupuesto
- `PUT /api/presupuestos/:id` - Actualizar presupuesto
- `DELETE /api/presupuestos/:id` - Eliminar presupuesto

### Inventario
- `GET /api/inventario` - Listar todo el inventario
- `GET /api/inventario/:id` - Obtener un item
- `POST /api/inventario` - Crear item
- `PUT /api/inventario/:id` - Actualizar item
- `DELETE /api/inventario/:id` - Eliminar item

### Estadísticas
- `GET /api/stats` - Obtener estadísticas generales

## 🔄 Próximas Características

- [ ] Autenticación y autorización
- [ ] Base de datos persistente (PostgreSQL/MongoDB)
- [ ] Exportación a PDF de reportes
- [ ] Gráficas y visualizaciones
- [ ] Calendario de proyectos
- [ ] Notificaciones en tiempo real
- [ ] Gestión de documentos
- [ ] Sistema de permisos por rol

## 📝 Notas de Desarrollo

### Base de Datos
Actualmente usa datos simulados en memoria. Para producción, se recomienda:
- PostgreSQL para datos relacionales
- MongoDB para documentos flexibles
- Prisma o TypeORM como ORM

### Estado
La aplicación usa React state local. Para escalar, considerar:
- Redux Toolkit
- Zustand
- React Query para cache de API

### Autenticación
No implementada. Se recomienda:
- JWT tokens
- bcrypt para passwords
- express-session o passport.js

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 👥 Autor

Sistema desarrollado para gestión administrativa de empresas constructoras.

## 📞 Soporte

Para reportar bugs o solicitar features, por favor crea un issue en el repositorio.


