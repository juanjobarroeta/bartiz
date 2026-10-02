/**
 * IVA por línea de requisición.
 *
 * El backend guarda la tasa en SolicitudPartida.ivaTasa con la convención de
 * la casa: null = exento, 0 = tasa 0 %, 0.16 = gravado. Los formularios usan
 * el valor del <select> (string) y convierten en las orillas.
 */

export const IVA_OPCIONES = [
  { value: '0.16', label: 'IVA 16%' },
  { value: '0', label: 'Tasa 0%' },
  { value: 'exento', label: 'Exento' },
]

/** Valor del select → tasa del backend. */
export const ivaTasaDe = (value) => (value === 'exento' ? null : value === '0' ? 0 : 0.16)

/**
 * Tasa del backend → valor del select. Ojo: null (exento) ≠ undefined (una
 * respuesta sin el campo = línea anterior al IVA por línea, que siempre se
 * trató al 16 %).
 */
export const ivaValueDe = (tasa) => (tasa === null ? 'exento' : Number(tasa) === 0 ? '0' : '0.16')

/** Tasa numérica efectiva de una línea del backend (exento y tasa 0 → 0). */
export const tasaNum = (tasa) => (tasa === null ? 0 : tasa === undefined ? 0.16 : Number(tasa) || 0)

/** Etiqueta corta para tablas. */
export const ivaEtiqueta = (tasa) =>
  tasa === null ? 'Exento' : tasa !== undefined && Number(tasa) === 0 ? '0%' : '16%'
