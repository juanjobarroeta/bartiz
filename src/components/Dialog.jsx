/**
 * Dialog helpers — drop-in replacements for window.confirm and
 * window.prompt that look like the rest of the app instead of a 1995
 * browser chrome dialog.
 *
 * Imperative API (matches what the prompts already do, minimal diff at
 * call sites):
 *
 *   import { confirmDialog, promptDialog } from '../components/Dialog'
 *
 *   if (await confirmDialog({ message: '¿Eliminar?' })) { ... }
 *
 *   const v = await promptDialog({
 *     title: 'Nombre',
 *     defaultValue: 'foo',
 *     placeholder: '...',
 *     validate: (v) => v.length > 0 || 'Requerido',
 *   })
 *   if (v == null) return  // user canceled
 *
 * Both render via a singleton container mounted by <DialogHost />,
 * which sits next to the Layout so it's always available.
 */

import { useEffect, useState } from 'react'
import './Dialog.css'

// Module-scoped subscriber set + queue. Each open() pushes a request,
// the host renders one at a time.
const subs = new Set()
const queue = []
const notify = () => subs.forEach((fn) => fn(queue.length > 0 ? queue[0] : null))

function push(req) {
  queue.push(req)
  notify()
}
function pop() {
  queue.shift()
  notify()
}

// Public imperative API
export function confirmDialog(opts) {
  return new Promise((resolve) => {
    push({
      kind: 'confirm',
      title: opts.title ?? 'Confirmar',
      message: opts.message,
      okLabel: opts.okLabel ?? 'Aceptar',
      cancelLabel: opts.cancelLabel ?? 'Cancelar',
      destructive: !!opts.destructive,
      resolve: (v) => { pop(); resolve(v) },
    })
  })
}

export function promptDialog(opts = {}) {
  return new Promise((resolve) => {
    push({
      kind: 'prompt',
      title: opts.title ?? 'Capturar valor',
      message: opts.message,
      label: opts.label,
      placeholder: opts.placeholder ?? '',
      defaultValue: opts.defaultValue ?? '',
      type: opts.type ?? 'text',
      validate: opts.validate, // (v) => true | string error
      okLabel: opts.okLabel ?? 'Guardar',
      cancelLabel: opts.cancelLabel ?? 'Cancelar',
      resolve: (v) => { pop(); resolve(v) },
    })
  })
}

export function alertDialog(opts) {
  return new Promise((resolve) => {
    push({
      kind: 'alert',
      title: opts.title ?? 'Aviso',
      message: typeof opts === 'string' ? opts : opts.message,
      okLabel: opts.okLabel ?? 'OK',
      resolve: () => { pop(); resolve() },
    })
  })
}

// Convenience wrapper for when callers want a string-only signature
// matching window.alert / window.confirm directly.
export const ui = {
  confirm: (msg) => confirmDialog({ message: msg }),
  prompt: (msg, def) => promptDialog({ message: msg, defaultValue: def ?? '' }),
  alert: (msg) => alertDialog({ message: msg }),
}

// ── Host component ─────────────────────────────────────────────────────────
export function DialogHost() {
  const [current, setCurrent] = useState(null)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    const fn = (req) => {
      setCurrent(req)
      setDraft(req?.defaultValue ?? '')
      setError(null)
    }
    subs.add(fn)
    return () => subs.delete(fn)
  }, [])

  useEffect(() => {
    if (!current) return
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (current.kind === 'alert') current.resolve()
        else current.resolve(current.kind === 'confirm' ? false : null)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [current])

  if (!current) return null

  const submit = (e) => {
    e?.preventDefault?.()
    if (current.kind === 'prompt') {
      const v = draft
      if (current.validate) {
        const r = current.validate(v)
        if (r !== true) { setError(typeof r === 'string' ? r : 'Inválido'); return }
      }
      current.resolve(v)
    } else if (current.kind === 'confirm') {
      current.resolve(true)
    } else {
      current.resolve()
    }
  }

  const cancel = () => {
    current.resolve(current.kind === 'confirm' ? false : current.kind === 'prompt' ? null : undefined)
  }

  return (
    <div className="dlg-backdrop" onClick={cancel}>
      <div className="dlg-panel" onClick={(e) => e.stopPropagation()}>
        <h3 className="dlg-title">{current.title}</h3>
        {current.message && <p className="dlg-message">{current.message}</p>}
        {current.kind === 'prompt' && (
          <form onSubmit={submit}>
            {current.label && <label className="dlg-label">{current.label}</label>}
            <input
              className="dlg-input"
              type={current.type}
              value={draft}
              onChange={(e) => { setDraft(e.target.value); setError(null) }}
              placeholder={current.placeholder}
              autoFocus
            />
            {error && <div className="dlg-error">{error}</div>}
          </form>
        )}
        <div className="dlg-actions">
          {current.kind !== 'alert' && (
            <button type="button" className="dlg-cancel" onClick={cancel}>
              {current.cancelLabel ?? 'Cancelar'}
            </button>
          )}
          <button
            type="button"
            className={`dlg-ok ${current.destructive ? 'destructive' : ''}`}
            onClick={submit}
            autoFocus={current.kind !== 'prompt'}
          >
            {current.okLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
