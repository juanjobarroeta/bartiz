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

export function rutaPermitida(rol, pathname) {
  if (!rol || rol === 'ADMIN') return true
  const allowed = ROL_PREFIXES[rol] ?? []
  return allowed.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

/** true cuando el rol sólo puede LEER presupuestos/precios unitarios. */
export function esSoloLectura(rol) {
  return rol === 'RESIDENTE' || rol === 'CONTABILIDAD'
}
