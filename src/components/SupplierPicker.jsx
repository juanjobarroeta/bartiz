/**
 * SupplierPicker — typeahead input that searches existing Suppliers
 * for the active company. If the typed name doesn't match anything,
 * offers an inline "Crear proveedor" affordance that opens a small
 * form modal and returns the freshly-created Supplier on done.
 *
 * Props:
 *   value: { id, razonSocial, rfc } | null
 *   onChange(value)
 *   companyId (required)
 *   placeholder?
 *
 * The picker writes back a full supplier object so callers can pass
 * supplierId to their POST endpoints AND show the chosen razón social
 * in the UI without an extra round trip.
 */

import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../config/api'
import Modal from './Modal'
import { NewProveedorForm } from '../pages/ProveedoresBartiz'
import './SupplierPicker.css'

export default function SupplierPicker({
  value,
  onChange,
  companyId,
  placeholder = 'Buscar proveedor por nombre o RFC…',
}) {
  const [query, setQuery] = useState(value?.razonSocial ?? '')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const wrapRef = useRef(null)
  const debounceRef = useRef(null)

  // Sync display text when value changes externally (e.g. after create)
  useEffect(() => {
    setQuery(value?.razonSocial ?? '')
  }, [value])

  // Debounced search
  useEffect(() => {
    if (!companyId || query.trim().length < 2) {
      setResults([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ companyId, q: query.trim() })
        const data = await apiFetch(`/api/construccion/suppliers?${params.toString()}`)
        setResults(Array.isArray(data) ? data.slice(0, 8) : [])
      } catch {
        setResults([])
      }
    }, 200)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, companyId])

  // Click-outside closes the dropdown
  useEffect(() => {
    if (!open) return
    const fn = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open])

  const pick = (s) => {
    onChange?.(s)
    setQuery(s.razonSocial)
    setOpen(false)
  }

  const clear = () => {
    onChange?.(null)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="supplier-picker" ref={wrapRef}>
      {value ? (
        <div className="picked-supplier">
          <strong>{value.razonSocial}</strong>
          <span className="muted small mono"> {value.rfc}</span>
          <button type="button" className="link small" onClick={clear}>quitar</button>
        </div>
      ) : (
        <>
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="supplier-input"
            autoComplete="off"
          />
          {open && (results.length > 0 || query.trim().length >= 2) && (
            <div className="supplier-dropdown">
              {results.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  className="supplier-item"
                  onClick={() => pick(s)}
                >
                  <strong>{s.razonSocial}</strong>
                  <span className="muted small mono"> {s.rfc}</span>
                  {(s._count?.cotizaciones ?? 0) > 0 && (
                    <span className="muted small">
                      {' '}· {s._count.cotizaciones} cotizaciones
                    </span>
                  )}
                </button>
              ))}
              {query.trim().length >= 2 && (
                <button
                  type="button"
                  className="supplier-create"
                  onClick={() => { setOpen(false); setCreateOpen(true) }}
                >
                  + Crear proveedor "{query.trim()}"
                </button>
              )}
            </div>
          )}
        </>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Crear proveedor"
      >
        <NewProveedorForm
          companyId={companyId}
          defaultName={query.trim()}
          onClose={() => setCreateOpen(false)}
          onCreated={(s) => {
            setCreateOpen(false)
            pick(s)
          }}
        />
      </Modal>
    </div>
  )
}
