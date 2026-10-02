/**
 * Tracker — lista vertical de pasos (seguimiento estilo Deel Payment).
 *   steps: [{ key?, title, sub?, status: 'done' | 'current' | 'pending' | 'error' }]
 * done = check verde, current = anillo del acento, pending = gris,
 * error = ✕ rojo (p. ej. requisición rechazada).
 */
import './ui.css'

export default function Tracker({ steps = [], className = '' }) {
  return (
    <ol className={`ui-tracker ${className}`.trim()}>
      {steps.map((s, i) => (
        <li key={s.key ?? i} className={`ui-step ${s.status || 'pending'}`}>
          <span className="ui-step-mark" aria-hidden="true">
            {s.status === 'done' ? '✓' : s.status === 'error' ? '✕' : ''}
          </span>
          <div className="ui-step-txt">
            <div className="ui-step-title">{s.title}</div>
            {s.sub && <div className="ui-step-sub">{s.sub}</div>}
          </div>
          <span className="ui-sr">
            {s.status === 'done' ? ' (completado)' : s.status === 'current' ? ' (en curso)' : s.status === 'error' ? ' (detenido)' : ' (pendiente)'}
          </span>
        </li>
      ))}
    </ol>
  )
}
