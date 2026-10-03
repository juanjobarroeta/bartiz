/**
 * Mano de obra (destajo + jornales): fechas de semana, cálculo estimado del
 * jornal y qué puede hacer cada rol. El cálculo oficial vive en el backend
 * (raya-calculo.ts); el de aquí sólo es la vista previa mientras se captura
 * y usa la misma fórmula: tarifa por día u hora, extra al doble.
 */

export const DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
export const FACTOR_HORA_EXTRA = 2

/** YYYY-MM-DD de una fecha en hora local. */
export function isoLocal(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Suma n días a un YYYY-MM-DD (aritmética UTC: sin saltos de horario). */
export function sumarDias(iso, n) {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Lunes (YYYY-MM-DD) de la semana que contiene `iso`. */
export function lunesDe(iso = isoLocal()) {
  const d = new Date(`${iso}T00:00:00Z`)
  const dow = (d.getUTCDay() + 6) % 7 // 0 = lunes
  return sumarDias(iso, -dow)
}

/** "6 oct" */
export function fechaCorta(iso) {
  if (!iso) return '—'
  const d = new Date(`${String(iso).slice(0, 10)}T12:00:00Z`)
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' })
}

/** Etiqueta de semana "6 – 12 oct". */
export function etiquetaSemana(lunes) {
  return `${fechaCorta(lunes)} – ${fechaCorta(sumarDias(lunes, 6))}`
}

export function precioHora(t) {
  if (!t) return 0
  const tarifa = Number(t.tarifa) || 0
  if (t.tipoPago === 'HORA') return tarifa
  const jornada = Number(t.horasJornada) || 8
  return tarifa / jornada
}

/** Pago estimado de un día: horas a precio normal + extra al doble. */
export function importeDia(t, horas, horasExtra = 0) {
  const ph = precioHora(t)
  return Math.round((ph * (Number(horas) || 0) + ph * FACTOR_HORA_EXTRA * (Number(horasExtra) || 0)) * 100) / 100
}

export function tarifaTexto(t) {
  if (!t) return ''
  const n = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 })
    .format(Number(t.tarifa) || 0)
  return t.tipoPago === 'HORA' ? `${n}/hora` : `${n}/día`
}

// Quién hace qué (el backend lo vuelve a validar).
const esAdmin = (rol) => !rol || rol === 'ADMIN'
export const puedeCapturar = (rol) => esAdmin(rol) || rol === 'RESIDENTE' || rol === 'CONTABILIDAD'
export const puedeAutorizar = (rol) => esAdmin(rol) || rol === 'CONTABILIDAD'
export const puedePagar = (rol) => esAdmin(rol) || rol === 'TESORERIA'

/** Mensaje legible de un error de apiFetch (zod flatten incluido). */
export function errMsg(e) {
  const m = e?.message
  if (m && m !== '[object Object]') return m
  const err = e?.data?.error
  if (err && typeof err === 'object') {
    const campos = Object.entries(err.fieldErrors ?? {}).map(([k, v]) => `${k}: ${v?.[0]}`)
    return [...(err.formErrors ?? []), ...campos].join(' · ') || 'Datos inválidos'
  }
  return 'Ocurrió un error'
}

const MXN = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 })
/** "$1,234.50" */
export const pesos = (n) => MXN.format(Number(n) || 0)
/** Horas: "8", "4.5" */
export const num = (n) => (Number(n) || 0).toLocaleString('es-MX', { maximumFractionDigits: 2 })
