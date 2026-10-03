/**
 * FilterBar — barra blanca redondeada (patrón Deel):
 *   [🔍] [Obra ▾] [Proveedor ▾] …                         [acciones]
 *   Total N
 *
 * - search: { value, onChange, placeholder } — botón circular que se expande
 *   a un input; se queda abierto mientras tenga texto.
 * - filters: [{ id, label, value, options: [{ value, label }], onChange }]
 *   Cada pill abre un menú; activa muestra "Label: Valor ✕" (✕ limpia).
 * - actions: nodo a la derecha (p. ej. "Acciones ▾").
 * - total: número (o nodo) para la línea "Total N …"; totalLabel la completa.
 */
import { useEffect, useRef, useState } from 'react'
import './ui.css'

export default function FilterBar({ search, filters = [], actions, total, totalLabel, children }) {
  return (
    <div className="ui-filterbar-wrap">
      <div className="ui-filterbar">
        <div className="ui-filterbar-left">
          {search && <SearchToggle {...search} />}
          {filters.map((f) => (
            <FilterPill key={f.id} {...f} />
          ))}
          {children}
        </div>
        {actions && <div className="ui-filterbar-actions">{actions}</div>}
      </div>
      {total != null && (
        <div className="ui-filterbar-total">
          Total {total}{totalLabel ? <> {totalLabel}</> : null}
        </div>
      )}
    </div>
  )
}

function SearchToggle({ value = '', onChange, placeholder = 'Buscar…' }) {
  const [open, setOpen] = useState(!!value)
  const inputRef = useRef(null)
  useEffect(() => { if (value) setOpen(true) }, [value])
  useEffect(() => { if (open) inputRef.current?.focus() }, [open])

  if (!open) {
    return (
      <button type="button" className="ui-search-btn" onClick={() => setOpen(true)} aria-label="Buscar" title="Buscar">
        <SearchIcon />
      </button>
    )
  }
  return (
    <div className="ui-search-open">
      <SearchIcon />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={() => { if (!value) setOpen(false) }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation()
            onChange?.('')
            setOpen(false)
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          className="ui-search-clear"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { onChange?.(''); inputRef.current?.focus() }}
          aria-label="Limpiar búsqueda"
        >
          ✕
        </button>
      )}
    </div>
  )
}

function FilterPill({ label, value, options = [], onChange }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)
  const active = value != null && value !== ''
  const current = active ? options.find((o) => String(o.value) === String(value)) : null

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false) }
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [open])

  return (
    <div className="ui-pillmenu" ref={wrapRef}>
      <button
        type="button"
        className={'ui-fpill' + (active ? ' on' : '')}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {active ? (
          <>
            <span>{label}: <b>{current?.label ?? String(value)}</b></span>
            <span
              role="button"
              tabIndex={0}
              className="ui-fpill-x"
              aria-label={`Quitar filtro ${label}`}
              onClick={(e) => { e.stopPropagation(); onChange?.(null); setOpen(false) }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onChange?.(null) }
              }}
            >
              ✕
            </span>
          </>
        ) : (
          <>
            <span>{label}</span>
            <span className="ui-fpill-caret" aria-hidden="true">▾</span>
          </>
        )}
      </button>
      {open && (
        <div className="ui-menu" role="listbox" aria-label={label}>
          {options.length === 0 ? (
            <div className="ui-menu-empty">Sin opciones</div>
          ) : (
            options.map((o) => {
              const sel = active && String(o.value) === String(value)
              return (
                <button
                  type="button"
                  role="option"
                  aria-selected={sel}
                  key={String(o.value)}
                  className={'ui-menu-item' + (sel ? ' sel' : '')}
                  onClick={() => { onChange?.(sel ? null : o.value); setOpen(false) }}
                >
                  <span className="ui-menu-label">{o.label}</span>
                  {o.hint != null && <span className="ui-menu-hint">{o.hint}</span>}
                  {sel && <span className="ui-menu-check" aria-hidden="true">✓</span>}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}
