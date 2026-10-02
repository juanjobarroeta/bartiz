/**
 * Paleta de comandos mínima (⌘K / Ctrl+K): lista las páginas de la nav del
 * usuario filtradas por texto; ↑/↓ para moverse, Enter para navegar.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const norm = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

export default function CommandPalette({ entries, onClose }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const results = useMemo(() => {
    const t = norm(q.trim())
    if (!t) return entries
    // Primero coincidencias por nombre de página; luego por área.
    const byLabel = entries.filter((e) => norm(e.label).includes(t))
    const byGroup = entries.filter((e) => !byLabel.includes(e) && e.group && norm(e.group).includes(t))
    return [...byLabel, ...byGroup]
  }, [q, entries])

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => { setSel(0) }, [q])

  const go = (e) => {
    if (!e) return
    navigate(e.path)
    onClose()
  }

  const onKey = (ev) => {
    if (ev.key === 'Escape') { ev.preventDefault(); onClose() }
    else if (ev.key === 'ArrowDown') { ev.preventDefault(); setSel((s) => Math.min(s + 1, results.length - 1)) }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
    else if (ev.key === 'Enter') { ev.preventDefault(); go(results[sel]) }
  }

  return (
    <div className="bz-cmd-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bz-cmd" role="dialog" aria-label="Buscar página">
        <input
          ref={inputRef}
          className="bz-cmd-input"
          placeholder="Ir a…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
        />
        <div className="bz-cmd-list" role="listbox">
          {results.length === 0 && <div className="bz-cmd-empty">Sin resultados</div>}
          {results.map((e, i) => (
            <button
              type="button"
              key={e.path}
              role="option"
              aria-selected={i === sel}
              className={`bz-cmd-item${i === sel ? ' sel' : ''}`}
              onMouseEnter={() => setSel(i)}
              onClick={() => go(e)}
            >
              <span>{e.label}</span>
              {e.group && <span className="bz-cmd-group">{e.group}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
