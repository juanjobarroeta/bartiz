let usuarios = [
  {
    id: 1,
    nombre: 'Juan',
    apellido: 'Pérez García',
    email: 'juan.perez@construccion.com',
    telefono: '555-0101',
    rol: 'admin',
    departamento: 'Administración',
    estado: 'activo',
    fechaIngreso: '2023-01-15',
    avatar: null,
    permisos: ['todos']
  },
  {
    id: 2,
    nombre: 'María',
    apellido: 'González López',
    email: 'maria.gonzalez@construccion.com',
    telefono: '555-0102',
    rol: 'gerente_proyecto',
    departamento: 'Proyectos',
    estado: 'activo',
    fechaIngreso: '2023-03-20',
    avatar: null,
    permisos: ['proyectos', 'presupuestos', 'solicitudes', 'inventario']
  },
  {
    id: 3,
    nombre: 'Carlos',
    apellido: 'Rodríguez Sánchez',
    email: 'carlos.rodriguez@construccion.com',
    telefono: '555-0103',
    rol: 'tesorero',
    departamento: 'Tesorería',
    estado: 'activo',
    fechaIngreso: '2023-02-10',
    avatar: null,
    permisos: ['pagos', 'tesoreria', 'proveedores', 'aprobaciones']
  },
  {
    id: 4,
    nombre: 'Ana',
    apellido: 'Martínez Torres',
    email: 'ana.martinez@construccion.com',
    telefono: '555-0104',
    rol: 'contador',
    departamento: 'Contabilidad',
    estado: 'activo',
    fechaIngreso: '2023-01-25',
    avatar: null,
    permisos: ['contabilidad', 'pagos', 'compras', 'proveedores']
  },
  {
    id: 5,
    nombre: 'Luis',
    apellido: 'Hernández Ruiz',
    email: 'luis.hernandez@construccion.com',
    telefono: '555-0105',
    rol: 'almacenista',
    departamento: 'Almacén',
    estado: 'activo',
    fechaIngreso: '2023-04-05',
    avatar: null,
    permisos: ['inventario', 'compras']
  },
  {
    id: 6,
    nombre: 'Patricia',
    apellido: 'López Jiménez',
    email: 'patricia.lopez@construccion.com',
    telefono: '555-0106',
    rol: 'comprador',
    departamento: 'Compras',
    estado: 'activo',
    fechaIngreso: '2023-05-12',
    avatar: null,
    permisos: ['compras', 'proveedores', 'solicitudes', 'catalogo']
  },
  {
    id: 7,
    nombre: 'Roberto',
    apellido: 'Díaz Morales',
    email: 'roberto.diaz@construccion.com',
    telefono: '555-0107',
    rol: 'residente_obra',
    departamento: 'Obra',
    estado: 'activo',
    fechaIngreso: '2023-06-01',
    avatar: null,
    permisos: ['proyectos', 'solicitudes', 'inventario']
  },
  {
    id: 8,
    nombre: 'Sofía',
    apellido: 'Ramírez Cruz',
    email: 'sofia.ramirez@construccion.com',
    telefono: '555-0108',
    rol: 'auxiliar',
    departamento: 'Administración',
    estado: 'inactivo',
    fechaIngreso: '2023-02-15',
    fechaSalida: '2024-01-10',
    avatar: null,
    permisos: ['clientes', 'proyectos']
  }
]

export const getRoles = () => {
  return [
    { 
      id: 'admin', 
      nombre: 'Administrador', 
      descripcion: 'Acceso completo al sistema',
      permisos: ['todos']
    },
    { 
      id: 'gerente_proyecto', 
      nombre: 'Gerente de Proyecto', 
      descripcion: 'Gestión de proyectos, presupuestos y solicitudes',
      permisos: ['proyectos', 'presupuestos', 'solicitudes', 'inventario', 'clientes']
    },
    { 
      id: 'tesorero', 
      nombre: 'Tesorero', 
      descripcion: 'Gestión de pagos y tesorería',
      permisos: ['pagos', 'tesoreria', 'proveedores', 'aprobaciones']
    },
    { 
      id: 'contador', 
      nombre: 'Contador', 
      descripcion: 'Gestión contable y financiera',
      permisos: ['contabilidad', 'pagos', 'compras', 'proveedores']
    },
    { 
      id: 'comprador', 
      nombre: 'Comprador', 
      descripcion: 'Gestión de compras y proveedores',
      permisos: ['compras', 'proveedores', 'solicitudes', 'catalogo']
    },
    { 
      id: 'almacenista', 
      nombre: 'Almacenista', 
      descripcion: 'Gestión de inventario y almacén',
      permisos: ['inventario', 'compras']
    },
    { 
      id: 'residente_obra', 
      nombre: 'Residente de Obra', 
      descripcion: 'Supervisión de obra y solicitudes',
      permisos: ['proyectos', 'solicitudes', 'inventario']
    },
    { 
      id: 'auxiliar', 
      nombre: 'Auxiliar Administrativo', 
      descripcion: 'Apoyo administrativo básico',
      permisos: ['clientes', 'proyectos']
    }
  ]
}

export default usuarios
