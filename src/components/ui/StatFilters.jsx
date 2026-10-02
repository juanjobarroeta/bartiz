/**
 * StatFilters — fila de 3–5 tarjetas de conteo que funcionan como filtro.
 * Cada tarjeta: número grande, monto opcional y la etiqueta como StatusPill.
 * Al hacer clic se vuelve el filtro activo (contorno oscuro); otro clic lo
 * limpia.
 *
 *   <StatFilters
 *     items={[{ id: 'vencido', label: 'Vencido', tone: 'neg', count: 2, amount: '$86,400' }]}
 *     value={activo}             // id activo, o arreglo de ids activos
 *     onChange={(next, id) => …} // next = id al activar, null al limpiar
 *   />
 */
import StatusPill from './StatusPill'
import './ui.css'

export default function StatFilters({ items = [], value = null, onChange, ariaLabel = 'Filtros rápidos' }) {
  const active = Array.isArray(value) ? value : value != null ? [value] : []
  return (
    <div className="ui-stats" role="group" aria-label={ariaLabel} style={{ '--ui-stats-n': items.length || 1 }}>
      {items.map((it) => {
        const on = active.includes(it.id)
        return (
          <button
            type="button"
            key={it.id}
            className={'ui-stat' + (on ? ' on' : '')}
            aria-pressed={on}
            onClick={() => onChange?.(on ? null : it.id, it.id)}
            title={it.title ?? (on ? 'Quitar filtro' : `Filtrar: ${it.label}`)}
          >
            <div className="ui-stat-top">
              <span className="ui-stat-count">{it.count ?? 0}</span>
              {it.amount != null && <span className="ui-stat-amount">· {it.amount}</span>}
            </div>
            <StatusPill tone={it.tone ?? 'muted'}>{it.label}</StatusPill>
          </button>
        )
      })}
    </div>
  )
}
