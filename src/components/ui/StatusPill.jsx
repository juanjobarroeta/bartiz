/**
 * StatusPill — pill con punto de color (patrón Deel: "● Vencido").
 * tone: pos | warn | neg | info | muted (default).
 */
import './ui.css'

export default function StatusPill({ tone = 'muted', children, title, className = '' }) {
  return (
    <span className={`ui-pill ui-tone-${tone} ${className}`.trim()} title={title}>
      <span className="ui-pill-dot" aria-hidden="true" />
      {children}
    </span>
  )
}
