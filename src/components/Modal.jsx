/**
 * Generic modal dialog. Replaces window.prompt/confirm/alert pops that
 * made the app feel like a 2005 phpBB demo. Uses portal-free absolute
 * positioning so it works without a root-level provider.
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
 * Click outside or press Escape to close. Body scroll is locked while
 * open. The wrapper also stops click-through on the backdrop so nested
 * dropdowns don't close the modal when clicking a suggestion.
 */

import { useEffect } from 'react'
import './Modal.css'

export default function Modal({ open, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={() => onClose?.()}>
      <div className={`modal-panel modal-${size}`} onClick={(e) => e.stopPropagation()}>
        {title && (
          <div className="modal-head">
            <h2>{title}</h2>
            <button type="button" className="modal-close" onClick={() => onClose?.()} aria-label="Cerrar">×</button>
          </div>
        )}
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
