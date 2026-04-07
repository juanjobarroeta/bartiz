/**
 * Catálogo — two sub-tabs wired to contabilidad-os:
 *
 *   • Insumos: master list of materiales/mano de obra/equipo/herramienta/basicos
 *   • Conceptos: APU-headed concepts (cada uno con su costo unitario calculado)
 *
 * GET/POST /api/construccion/insumos
 * GET/POST /api/construccion/conceptos
 *
 * Clicking a concepto navigates to /apu/:conceptoId where the APU editor
 * lives.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../config/api'
import './Catalogo.css'

const TIPO_LABEL = {
  MATERIAL: 'Material',
  MANO_OBRA: 'Mano de obra',
  EQUIPO: 'Equipo',
  HERRAMIENTA: 'Herramienta',
  BASICO: 'Básico',
}

const TIPO_OPTIONS = [
  { value: 'MATERIAL', label: 'Material' },
  { value: 'MANO_OBRA', label: 'Mano de obra' },
  { value: 'EQUIPO', label: 'Equipo' },
  { value: 'HERRAMIENTA', label: 'Herramienta' },
  { value: 'BASICO', label: 'Básico' },
]

const fmtMoney = (n) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        maximumFractionDigits: 2,
      }).format(Number(n))

export default function Catalogo() {
  const navigate = useNavigate()
  const { activeCompany } = useAuth()
  const [tab, setTab] = useState('conceptos')

  if (!activeCompany?.id) {
    return (
      <div className="cat-page">
        <div className="cat-empty">Selecciona una empresa para ver el catálogo.</div>
      </div>
    )
  }

  return (
    <div className="cat-page">
      <header className="cat-header">
        <h1>Catálogo</h1>
        <div className="cat-tabs">
          <button
            className={tab === 'conceptos' ? 'active' : ''}
            onClick={() => setTab('conceptos')}
          >
            Conceptos ({'\u202F'}APUs{'\u202F'})
          </button>
          <button
            className={tab === 'insumos' ? 'active' : ''}
            onClick={() => setTab('insumos')}
          >
            Insumos
          </button>
        </div>
      </header>

      {tab === 'conceptos' ? (
        <ConceptosTab companyId={activeCompany.id} onOpen={(id) => navigate(`/apu/${id}`)} />
      ) : (
        <InsumosTab companyId={activeCompany.id} />
      )}
    </div>
  )
}

// ─── Insumos ────────────────────────────────────────────────────────────────

function InsumosTab({ companyId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    codigo: '',
    descripcion: '',
    tipo: 'MATERIAL',
    unidad: '',
    costoActual: '',
  })

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({ companyId })
      if (q) qs.set('q', q)
      if (tipoFilter) qs.set('tipo', tipoFilter)
      const data = await apiFetch(`/api/construccion/insumos?${qs.toString()}`)
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Error al cargar insumos')
    } finally {
      setLoading(false)
    }
  }, [companyId, q, tipoFilter])

  useEffect(() => {
    const t = setTimeout(cargar, 200)
    return () => clearTimeout(t)
  }, [cargar])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const body = {
        companyId,
        codigo: form.codigo.trim(),
        descripcion: form.descripcion.trim(),
        tipo: form.tipo,
        unidad: form.unidad.trim(),
        costoActual: parseFloat(form.costoActual) || 0,
      }
      const created = await apiFetch('/api/construccion/insumos', { method: 'POST', body })
      setItems((prev) => [created, ...prev])
      setForm({ codigo: '', descripcion: '', tipo: 'MATERIAL', unidad: '', costoActual: '' })
      setShowForm(false)
    } catch (err) {
      setError(err.message || 'Error al crear insumo')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section>
      <div className="cat-toolbar">
        <input
          type="search"
          placeholder="Buscar código o descripción…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)}>
          <option value="">Todos los tipos</option>
          {TIPO_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <button className="primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : '+ Nuevo insumo'}
        </button>
      </div>

      {error && <div className="cat-error">{error}</div>}

      {showForm && (
        <form className="cat-form" onSubmit={handleCreate}>
          <div className="row">
            <label>
              Código
              <input required value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="MAT-001" />
            </label>
            <label className="grow">
              Descripción
              <input required value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Cemento gris Portland CPC 30R saco 50kg" />
            </label>
            <label>
              Tipo
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                {TIPO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Unidad
              <input required value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} placeholder="saco" />
            </label>
            <label>
              Costo actual
              <input type="number" min="0" step="0.01" required value={form.costoActual} onChange={(e) => setForm({ ...form, costoActual: e.target.value })} placeholder="0.00" />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={submitting}>
              {submitting ? 'Guardando…' : 'Guardar insumo'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="cat-state">Cargando insumos…</div>
      ) : items.length === 0 ? (
        <div className="cat-state">No hay insumos. Agrega el primero.</div>
      ) : (
        <table className="cat-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descripción</th>
              <th>Tipo</th>
              <th>Unidad</th>
              <th style={{ textAlign: 'right' }}>Costo</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td className="mono">{i.codigo}</td>
                <td>{i.descripcion}</td>
                <td>{TIPO_LABEL[i.tipo] ?? i.tipo}</td>
                <td>{i.unidad}</td>
                <td style={{ textAlign: 'right' }}>{fmtMoney(i.costoActual)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

// ─── Conceptos ──────────────────────────────────────────────────────────────

function ConceptosTab({ companyId, onOpen }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    codigo: '',
    descripcion: '',
    unidad: '',
    categoria: '',
  })

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = new URLSearchParams({ companyId })
      if (q) qs.set('q', q)
      const data = await apiFetch(`/api/construccion/conceptos?${qs.toString()}`)
      setItems(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Error al cargar conceptos')
    } finally {
      setLoading(false)
    }
  }, [companyId, q])

  useEffect(() => {
    const t = setTimeout(cargar, 200)
    return () => clearTimeout(t)
  }, [cargar])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const body = {
        companyId,
        codigo: form.codigo.trim(),
        descripcion: form.descripcion.trim(),
        unidad: form.unidad.trim(),
        categoria: form.categoria.trim() || undefined,
      }
      const created = await apiFetch('/api/construccion/conceptos', { method: 'POST', body })
      setItems((prev) => [created, ...prev])
      setForm({ codigo: '', descripcion: '', unidad: '', categoria: '' })
      setShowForm(false)
    } catch (err) {
      setError(err.message || 'Error al crear concepto')
    } finally {
      setSubmitting(false)
    }
  }

  const grouped = useMemo(() => {
    const map = new Map()
    for (const c of items) {
      const key = c.categoria || 'Sin categoría'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(c)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [items])

  return (
    <section>
      <div className="cat-toolbar">
        <input
          type="search"
          placeholder="Buscar código o descripción…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="primary" onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'Cancelar' : '+ Nuevo concepto'}
        </button>
      </div>

      {error && <div className="cat-error">{error}</div>}

      {showForm && (
        <form className="cat-form" onSubmit={handleCreate}>
          <div className="row">
            <label>
              Código
              <input required value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} placeholder="EXC-001" />
            </label>
            <label className="grow">
              Descripción
              <input required value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Excavación a cielo abierto en material tipo II" />
            </label>
            <label>
              Unidad
              <input required value={form.unidad} onChange={(e) => setForm({ ...form, unidad: e.target.value })} placeholder="m3" />
            </label>
            <label>
              Categoría
              <input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Preliminares" />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={submitting}>
              {submitting ? 'Guardando…' : 'Guardar concepto'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="cat-state">Cargando conceptos…</div>
      ) : items.length === 0 ? (
        <div className="cat-state">
          Aún no hay conceptos. Crea el primero para empezar a armar APUs.
        </div>
      ) : (
        grouped.map(([categoria, group]) => (
          <div key={categoria} className="cat-group">
            <h3>{categoria}</h3>
            <table className="cat-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th>Unidad</th>
                  <th style={{ textAlign: 'right' }}>Insumos</th>
                  <th style={{ textAlign: 'right' }}>Costo directo</th>
                  <th style={{ textAlign: 'right' }}>P.U.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {group.map((c) => (
                  <tr key={c.id}>
                    <td className="mono">{c.codigo}</td>
                    <td>{c.descripcion}</td>
                    <td>{c.unidad}</td>
                    <td style={{ textAlign: 'right' }}>{c.apuActual?._count?.insumos ?? 0}</td>
                    <td style={{ textAlign: 'right' }}>{fmtMoney(c.apuActual?.costoDirecto)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <strong>{fmtMoney(c.apuActual?.precioUnitario)}</strong>
                    </td>
                    <td>
                      <button className="link" onClick={() => onOpen(c.id)}>
                        Editar APU →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </section>
  )
}
