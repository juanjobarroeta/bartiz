/**
 * Drawer — panel lateral derecho sobre un fondo atenuado (patrón Deel
 * "review drawer"). Encabezado con título + cerrar, cuerpo con scroll y pie
 * fijo para acciones. En < 640px ocupa toda la pantalla.
 *
 *   <Drawer open={!!sel} onClose={() => setSel(null)} title="…" subtitle="…"
 *           footer={<><button …>Cancelar</button><button …>Pagar</button></>}>
 *     …
 *   </Drawer>
 *
 * Escape / clic en el fondo cierran. Escape se captura en window (fase de
 * captura) y se detiene ahí, así que NO cierra también un Modal que esté
 * debajo; si hay un Modal abierto ENCIMA del drawer, el drawer lo ignora y
 * deja que el Modal lo maneje. El foco queda atrapado dentro del panel y
 * regresa a donde estaba al cerrar.
 */
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import './ui.css'

// Drawers abiertos, en orden; sólo el de arriba responde a Escape.
const drawerStack = []

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function Drawer({ open, onClose, title, subtitle, children, footer, width = 480, ariaLabel }) {
  const rootRef = useRef(null)
  const panelRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    if (!open) return
    const prevFocus = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const entry = {}
    drawerStack.push(entry)

    // Un Modal (portal en body) abierto después del drawer está encima.
    const modalOnTop = () => {
      const root = rootRef.current
      if (!root) return false
      return [...document.querySelectorAll('.modal-backdrop')].some(
        (m) => root.compareDocumentPosition(m) & Node.DOCUMENT_POSITION_FOLLOWING
      )
    }

    const onKey = (e) => {
      if (drawerStack[drawerStack.length - 1] !== entry || modalOnTop()) return
      if (e.key === 'Escape') {
        e.stopPropagation()
        e.preventDefault()
        closeRef.current?.()
        return
      }
      if (e.key === 'Tab' && panelRef.current) {
        const els = [...panelRef.current.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)
        if (els.length === 0) { e.preventDefault(); panelRef.current.focus(); return }
        const first = els[0]
        const last = els[els.length - 1]
        const inside = panelRef.current.contains(document.activeElement)
        if (e.shiftKey && (document.activeElement === first || !inside)) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && (document.activeElement === last || !inside)) { e.preventDefault(); first.focus() }
      }
    }
    window.addEventListener('keydown', onKey, true)
    // Foco inicial en el panel (no en el primer botón: evita activar algo con Enter).
    requestAnimationFrame(() => panelRef.current?.focus())

    return () => {
      window.removeEventListener('keydown', onKey, true)
      document.body.style.overflow = prevOverflow
      const i = drawerStack.indexOf(entry)
      if (i >= 0) drawerStack.splice(i, 1)
      if (prevFocus && typeof prevFocus.focus === 'function') prevFocus.focus()
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div className="ds ui-drawer-root" ref={rootRef}>
      <div className="ui-drawer-backdrop" onClick={() => onClose?.()} />
      <aside
        className="ui-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel ?? (typeof title === 'string' ? title : undefined)}
        ref={panelRef}
        tabIndex={-1}
        style={{ '--ui-drawer-w': typeof width === 'number' ? `${width}px` : width }}
      >
        <header className="ui-drawer-head">
          <div className="ui-drawer-titles">
            <h2>{title}</h2>
            {subtitle && <div className="ui-drawer-sub">{subtitle}</div>}
          </div>
          <button type="button" className="ui-drawer-close" onClick={() => onClose?.()} aria-label="Cerrar">
            ✕
          </button>
        </header>
        <div className="ui-drawer-body">{children}</div>
        {footer && <footer className="ui-drawer-foot">{footer}</footer>}
      </aside>
    </div>,
    document.body
  )
}

/** Lista de pares etiqueta/valor en renglones grises (detalle del drawer). */
export function DetailList({ rows = [] }) {
  return (
    <dl className="ui-dl">
      {rows.filter(Boolean).map((r, i) => (
        <div key={r.key ?? i} className={'ui-dl-row' + (r.strong ? ' strong' : '')}>
          <dt>{r.label}</dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  )
}
