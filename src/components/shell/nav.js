/**
 * Navegación del shell (top nav estilo Deel): áreas → páginas.
 *
 * ADMIN ve las áreas completas (recortadas por la matriz `paginas` vía
 * rutaPermitida). Los roles restringidos conservan SU lista de siempre
 * (ROLE_NAV) — se reparte en las mismas áreas sólo para agrupar; si al final
 * quedan ≤5 páginas se muestran como pestañas planas sin sub-nav.
 *
 * `badge` es una llave del objeto de contadores (useNavCounts).
 * `match` son prefijos extra que activan la página/área (rutas de detalle).
 */

export const AREAS = [
  {
    key: 'inicio',
    label: 'Inicio',
    items: [{ path: '/', label: 'Inicio' }],
  },
  {
    key: 'obras',
    label: 'Obras',
    match: ['/presupuesto', '/estimaciones', '/estimacion-viviendas', '/apu'],
    items: [
      {
        path: '/proyectos',
        label: 'Obras',
        match: ['/presupuesto', '/estimaciones', '/estimacion-viviendas', '/apu'],
      },
    ],
  },
  {
    key: 'compras',
    label: 'Compras',
    items: [
      { path: '/requisiciones',         label: 'Requisiciones' },
      { path: '/compras-por-autorizar', label: 'Por autorizar', badge: 'compras' },
      { path: '/proveedores-bartiz',    label: 'Proveedores' },
      { path: '/catalogo',              label: 'Catálogo' },
    ],
  },
  {
    key: 'pagos',
    label: 'Pagos',
    items: [
      { path: '/cuentas-por-pagar',   label: 'Cuentas por pagar' },
      { path: '/pagos-tesoreria',     label: 'En tesorería' },
      { path: '/tesoreria-bartiz',    label: 'Bancos' },
      { path: '/cuentas-proveedores', label: 'Estados de cuenta' },
    ],
  },
  {
    key: 'comprobantes',
    label: 'Comprobantes',
    items: [
      { path: '/facturas',   label: 'Facturas', badge: 'facturas' },
      { path: '/gastos',     label: 'Gastos' },
      { path: '/caja-chica', label: 'Caja chica', match: ['/reembolsos'] },
      { path: '/destajo',    label: 'Mano de obra' },
    ],
  },
  {
    key: 'mas',
    label: 'Más',
    items: [
      { path: '/reportes', label: 'Reportes' },
      { path: '/usuarios', label: 'Usuarios' },
    ],
  },
]

// Listas encajonadas por rol restringido (ver src/auth/roles.js). Son
// exactamente las que el sidebar mostraba antes del rediseño.
export const ROLE_NAV = {
  TESORERIA: [
    { path: '/pagos-tesoreria', label: 'Pagos' },
    { path: '/destajo',         label: 'Mano de obra' },
  ],
  RESIDENTE: [
    { path: '/requisiciones',      label: 'Requisiciones' },
    { path: '/proyectos',          label: 'Obras', match: ['/presupuesto'] },
    { path: '/caja-chica',         label: 'Caja chica', match: ['/reembolsos'] },
    { path: '/destajo',            label: 'Mano de obra' },
    { path: '/proveedores-bartiz', label: 'Proveedores' },
  ],
  CONTABILIDAD: [
    { path: '/compras-por-autorizar', label: 'Compras', badge: 'compras' },
    { path: '/cuentas-por-pagar',     label: 'Pagos' },
    { path: '/requisiciones',         label: 'Requisiciones' },
    { path: '/proveedores-bartiz',    label: 'Proveedores' },
    { path: '/cuentas-proveedores',   label: 'Estados de cuenta' },
    { path: '/proyectos',             label: 'Obras', match: ['/presupuesto'] },
    { path: '/destajo',               label: 'Mano de obra' },
  ],
}

const FLAT_MAX = 5

const hit = (pathname, p) => pathname === p || pathname.startsWith(p + '/')

/** ¿La página `item` está activa en `pathname`? */
export function itemActivo(item, pathname) {
  if (item.path === '/') return pathname === '/'
  if (hit(pathname, item.path)) return true
  return (item.match ?? []).some((p) => hit(pathname, p))
}

/**
 * Construye la navegación para un rol.
 * @returns {{ flat: boolean, areas: Array<{key,label,items}>, items: Array }}
 */
export function navParaRol(rol, visible) {
  const restricted = ROLE_NAV[rol]
  let areas
  if (!restricted) {
    areas = AREAS.map((a) => ({ ...a, items: a.items.filter(visible) }))
  } else {
    const permitidas = restricted.filter(visible)
    const usadas = new Set()
    areas = AREAS.map((a) => {
      const items = a.items
        .map((ai) => permitidas.find((ri) => ri.path === ai.path))
        .filter(Boolean)
        .map((ri) => {
          usadas.add(ri.path)
          // Dentro de un área se usa la etiqueta de sub-nav del área, que es
          // más específica; en la vista plana se conserva la del rol.
          const ai = a.items.find((x) => x.path === ri.path)
          return { ...ri, areaLabel: ai.label }
        })
      return { ...a, items }
    })
    const sueltas = permitidas.filter((ri) => !usadas.has(ri.path))
    if (sueltas.length) areas.push({ key: 'otros', label: 'Otros', items: sueltas })
    // Las áreas siguen el orden de la lista del rol (su home va primero).
    const orden = (a) => {
      const idx = a.items.map((i) => permitidas.findIndex((ri) => ri.path === i.path))
      return idx.length ? Math.min(...idx) : Infinity
    }
    areas.sort((a, b) => orden(a) - orden(b))
  }
  areas = areas.filter((a) => a.items.length > 0)
  const items = restricted
    ? restricted.filter(visible)
    : areas.flatMap((a) => a.items)
  return { flat: items.length <= FLAT_MAX, areas, items }
}

/** Área activa para `pathname` (o null). */
export function areaActiva(areas, pathname) {
  return (
    areas.find((a) => a.items.some((i) => itemActivo(i, pathname))) ||
    areas.find((a) => (a.match ?? []).some((p) => hit(pathname, p))) ||
    null
  )
}
