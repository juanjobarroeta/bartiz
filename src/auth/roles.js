/**
 * Encajonamiento por rol de construcción (activeCompany.construccionRol).
 *
 * ADMIN / null  → sin restricción (dueños y admins actuales).
 * TESORERIA     → sólo la cola de pagos que admin mandó a tesorería.
 * RESIDENTE     → genera requisiciones; ve obras/presupuestos/precios
 *                 unitarios (sólo lectura) y caja chica; nada más.
 *
 * El backend hace cumplir lo mismo por allowlist de endpoints
 * (contabilidad-os src/lib/construccion/rol.ts); esto sólo decide qué
 * navegación y rutas se muestran.
 */

export const ROL_HOME = {
  ADMIN: '/',
  TESORERIA: '/pagos-tesoreria',
  RESIDENTE: '/requisiciones',
  CONTABILIDAD: '/compras-por-autorizar',
}

// Prefijos de ruta permitidos por rol restringido. Todo lo demás redirige
// a ROL_HOME (guard en App.jsx).
const ROL_PREFIXES = {
  TESORERIA: ['/pagos-tesoreria'],
  RESIDENTE: [
    '/requisiciones',
    '/proyectos',
    // Presupuestos y sus precios unitarios se VEN aquí (readOnly vía rol);
    // el editor de APUs (/apu) vive en Catálogo y queda fuera.
    '/presupuesto',
    '/caja-chica',
    '/reembolsos',  // alias viejo de caja chica (botón "volver" del detalle)
    // Directorio de proveedores: ver y dar de alta (editar sigue siendo admin)
    '/proveedores-bartiz',
  ],
  // Escritorio de compras/pagos: proveedores completos, compras por
  // autorizar, cuentas por pagar y presupuestos en lectura.
  CONTABILIDAD: [
    '/compras-por-autorizar',
    '/cuentas-por-pagar',
    '/proveedores-bartiz',
    '/cuentas-proveedores',
    '/requisiciones',      // ver y capturar precios de requisiciones existentes
    '/proyectos',
    '/presupuesto',        // detalle (sólo lectura vía rol)
  ],
}

// ── Matriz de páginas por usuario ────────────────────────────────────────────
// Catálogo de páginas del satélite como llaves opacas (CompanyMember.
// construccionPaginas en el hub las guarda tal cual — agregar una página no
// pide migración). La matriz sólo RECORTA visibilidad: nunca amplía lo que el
// rol no permite (el backend seguiría regresando 403).
//
// El Panel ('/') no es una llave: siempre visible — es el home y esconderlo
// sólo produciría redirects circulares.
export const PAGINAS = [
  { key: 'obras',          label: 'Obras',        prefixes: ['/proyectos', '/presupuesto', '/estimaciones', '/estimacion-viviendas'] },
  { key: 'requisiciones',  label: 'Requisiciones', prefixes: ['/requisiciones'] },
  { key: 'compras',        label: 'Compras',      prefixes: ['/compras-por-autorizar'] },
  { key: 'pagos',          label: 'Pagos',        prefixes: ['/cuentas-por-pagar', '/pagos-tesoreria'] },
  { key: 'bancos',         label: 'Bancos',       prefixes: ['/tesoreria-bartiz'] },
  { key: 'facturas',       label: 'Facturas',     prefixes: ['/facturas'] },
  { key: 'gastos',         label: 'Gastos',       prefixes: ['/gastos'] },
  { key: 'caja',           label: 'Caja chica',   prefixes: ['/caja-chica', '/reembolsos'] },
  { key: 'destajo',        label: 'Destajo',      prefixes: ['/destajo'] },
  { key: 'proveedores',    label: 'Proveedores',  prefixes: ['/proveedores-bartiz'] },
  { key: 'edos-prov',      label: 'Edos. proveedor', prefixes: ['/cuentas-proveedores'] },
  { key: 'catalogo',       label: 'Catálogo',     prefixes: ['/catalogo', '/apu'] },
  { key: 'reportes',       label: 'Reportes',     prefixes: ['/reportes'] },
  { key: 'usuarios',       label: 'Usuarios',     prefixes: ['/usuarios'] },
]

/** Llave de página a la que pertenece un pathname (null = Panel u otra libre). */
export function paginaDePath(pathname) {
  for (const p of PAGINAS) {
    if (p.prefixes.some((pre) => pathname === pre || pathname.startsWith(pre + '/'))) return p.key
  }
  return null
}

/** Páginas que el ROL alcanza (la matriz sólo puede recortar dentro de esto). */
export function paginasDelRol(rol) {
  if (!rol || rol === 'ADMIN') return PAGINAS.map((p) => p.key)
  const prefijos = ROL_PREFIXES[rol] ?? []
  return PAGINAS.filter((p) =>
    p.prefixes.some((pre) => prefijos.some((rp) => rp === pre || rp.startsWith(pre + '/') || pre.startsWith(rp + '/')))
  ).map((p) => p.key)
}

/**
 * ¿Puede verse esta ruta? Dos capas:
 *   1. El rol (seguridad, espejo del allowlist del backend).
 *   2. La matriz de páginas (visibilidad): lista no-vacía = sólo esas llaves.
 * Un ADMIN nunca pierde 'usuarios' — evita que un admin deje a los demás
 * (o a sí mismo) sin la página que administra la matriz.
 */
export function rutaPermitida(rol, pathname, paginas = []) {
  const esAdmin = !rol || rol === 'ADMIN'
  if (!esAdmin) {
    const allowed = ROL_PREFIXES[rol] ?? []
    if (!allowed.some((p) => pathname === p || pathname.startsWith(p + '/'))) return false
  }
  if (!Array.isArray(paginas) || paginas.length === 0) return true
  const key = paginaDePath(pathname)
  if (!key) return true // Panel y rutas fuera del catálogo
  if (esAdmin && key === 'usuarios') return true
  return paginas.includes(key)
}

/** Home efectivo: el del rol, o la primera página visible si se lo taparon. */
export function homePermitida(rol, paginas = []) {
  const home = ROL_HOME[rol] ?? '/'
  if (rutaPermitida(rol, home, paginas)) return home
  for (const p of PAGINAS) {
    if (rutaPermitida(rol, p.prefixes[0], paginas)) return p.prefixes[0]
  }
  return '/'
}

/** true cuando el rol sólo puede LEER presupuestos/precios unitarios. */
export function esSoloLectura(rol) {
  return rol === 'RESIDENTE' || rol === 'CONTABILIDAD'
}
