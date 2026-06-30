/**
 * Generic modal dialog. Replaces window.prompt/confirm/alert pops that
 * made the app feel like a 2005 phpBB demo.
 *
 * Renders through a portal to document.body so a modal opened from inside
 * another component's markup (e.g. the "crear proveedor" modal opened from
 * within the requisición <form>) is NOT nested in that DOM subtree. Without
 * the portal, a <form> inside the modal becomes a nested form inside the
 * parent form, and submitting it can trigger the parent form (sending/closing
 * the requisición). The portal makes stacked modals DOM siblings under body.
 *
 * Usage:
 *   <Modal open={open} onClose={...} title="Title">
 *     <form onSubmit={...}>
 *       <label>Campo <input /></label>
 *       <div className="modal-actions">
 *         <button type="button" onClick={onClose}>Cancelar</button>
 *         <button type="submit">Guardar</button>
 *       </div>
 *     </form>
 *   </Modal>
 *
 * Click outside or press Escape to close. Body scroll is locked while open.
 * Escape only closes the topmost open modal (see escapeStack) so dismissing a
 * nested modal doesn't also dismiss the one behind it.
 */

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import './Modal.css'

// Stack of open modals' close handlers; only the topmost reacts to Escape.
const escapeStack = []

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const entry = { onClose }
    escapeStack.push(entry)
    const onKey = (e) => {
      if (e.key === 'Escape' && escapeStack[escapeStack.length - 1] === entry) {
        // eslint-disable-next-line no-console
        console.warn('[MODAL-DBG] Escape close →', title)
        onClose?.()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
      const i = escapeStack.indexOf(entry)
      if (i >= 0) escapeStack.splice(i, 1)
    }
  }, [open, onClose])

  if (!open) return null
  // eslint-disable-next-line no-console
  const dbg = (src) => console.warn('[MODAL-DBG]', src, 'close →', title)
  return createPortal(
    <div className="modal-backdrop" onClick={() => { dbg('backdrop'); onClose?.() }}>
      <div className={`modal-panel modal-${size}`} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="modal-head">
            <h2>{title}</h2>
            <button type="button" className="modal-close" onClick={() => { dbg('button'); onClose?.() }} aria-label="Cerrar">×</button>
          </div>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body
  )
}
