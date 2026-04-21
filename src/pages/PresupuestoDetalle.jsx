/**
 * PresupuestoDetalle — PDF-style grouped view with BORRADOR edit mode.
 *
 * Route: /presupuesto/:id
 *
 * Two modes controlled by a toggle button (only visible on BORRADOR):
 *
 *   VIEW mode (default):
 *     Renders the presupuesto exactly like your partner's PDF: ZONA
 *     headers, PARTIDA groups, concept rows with cantidad/PU/importe/%.
 *     Shows Aprobar/Rechazar + Clonar-para-editar actions.
 *
 *   EDIT mode (only if estado === BORRADOR):
 *     Every cantidad input becomes editable. Delete × per row.
 *     "+ Agregar partida" button per group opens a picker modal that
 *     searches the concepto catalog and also offers "Crear concepto
 *     nuevo" inline for anything the customer asks for on the fly.
 *     All mutations auto-save. Totals refresh from the server response
 *     so the client never lies about montoTotal.
 *
 * Approving uses the cascade API (cascade: true) so a single click
 * marks siblings RECHAZADO and sets Proyecto.montoContratado.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../config/api'
import './PresupuestoDetalle.css'

const ESTADO_LABEL = {
  BORRADOR: 'Borrador',
  APROBADO: 'Aprobado',
  EN_EJECUCION: 'En ejecución',
  CERRADO: 'Cerrado',
  RECHAZADO: 'Rechazado',
}

const TIPO_LABEL_CONCEPTO = {
  MATERIAL: 'Material',
  MANO_OBRA: 'M.O.',
  EQUIPO: 'Equipo',
  HERRAMIENTA: 'Herram.',
  BASICO: 'Básico',
}

const fmtMoney = (n) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(Number(n) || 0)

const fmtQty = (n) =>
  new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(Number(n) || 0)

function groupPartidas(partidas) {
  const totalImporte = partidas.reduce((a, p) => a + (p.importe || 0), 0) || 1
  const zonaMap = new Map()

  for (const p of partidas) {
    const zonaKey = p.zona ?? 'Sin zona'
    if (!zonaMap.has(zonaKey)) {
      zonaMap.set(zonaKey, { zona: zonaKey, subtotal: 0, porc: 0, grupos: new Map() })
    }
    const z = zonaMap.get(zonaKey)

    const partidaKey = p.partida ?? 'Sin partida'
    if (!z.grupos.has(partidaKey)) {
      z.grupos.set(partidaKey, { partida: partidaKey, subtotal: 0, porc: 0, rows: [] })
    }
    const g = z.grupos.get(partidaKey)

    g.rows.push(p)
    g.subtotal += p.importe || 0
    z.subtotal += p.importe || 0
  }

  return [...zonaMap.values()].map((z) => ({
    zona: z.zona,
    subtotal: z.subtotal,
    porc: (z.subtotal / totalImporte) * 100,
    grupos: [...z.grupos.values()].map((g) => ({
      partida: g.partida,
      subtotal: g.subtotal,
      porc: (g.subtotal / totalImporte) * 100,
      rows: g.rows.map((r) => ({
        ...r,
        porc: ((r.importe || 0) / totalImporte) * 100,
      })),
    })),
  }))
}

export default function PresupuestoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeCompany } = useAuth()

  const [presupuesto, setPresupuesto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actioning, setActioning] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(null) // { zona, partida } | null
  const [explosion, setExplosion] = useState(null) // null = hidden, object = loaded

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch(
        `/api/construccion/presupuestos/${encodeURIComponent(id)}`
      )
      setPresupuesto(data)
    } catch (err) {
      setError(err.message || 'Error al cargar presupuesto')
      setPresupuesto(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    cargar()
  }, [cargar])

  const canEdit = presupuesto?.estado === 'BORRADOR' || presupuesto?.estado === 'EN_EJECUCION'
  const isEditing = canEdit && editMode

  // ── State transitions ───────────────────────────────────────────────────
  const aprobar = async () => {
    if (!presupuesto) return
    const ok = window.confirm(
      `¿Aprobar "${presupuesto.nombre}"?\n\nEsto:\n` +
        `• Marca este presupuesto como APROBADO\n` +
        `• Marca los otros presupuestos BORRADOR del proyecto como RECHAZADO\n` +
        `• Establece monto contratado del proyecto en ${fmtMoney(
          presupuesto.montoTotal
        )}`
    )
    if (!ok) return
    setActioning(true)
    try {
      const res = await apiFetch(
        `/api/construccion/presupuestos/${presupuesto.id}`,
        {
          method: 'PATCH',
          body: { estado: 'APROBADO', cascade: true },
        }
      )
      setPresupuesto((p) =>
        p ? { ...p, estado: res.presupuesto?.estado ?? 'APROBADO' } : p
      )
      setEditMode(false)
      window.alert(
        `✓ Aprobado. ${res.siblingsRechazados ?? 0} presupuesto(s) marcado(s) como rechazado(s). Monto contratado fijado.`
      )
    } catch (err) {
      window.alert(err.message || 'Error al aprobar')
    } finally {
      setActioning(false)
    }
  }

  const rechazar = async () => {
    if (!presupuesto) return
    if (!window.confirm(`¿Marcar "${presupuesto.nombre}" como RECHAZADO?`)) return
    setActioning(true)
    try {
      await apiFetch(`/api/construccion/presupuestos/${presupuesto.id}`, {
        method: 'PATCH',
        body: { estado: 'RECHAZADO' },
      })
      setPresupuesto((p) => (p ? { ...p, estado: 'RECHAZADO' } : p))
      setEditMode(false)
    } catch (err) {
      window.alert(err.message || 'Error al rechazar')
    } finally {
      setActioning(false)
    }
  }

  const clonar = async () => {
    if (!presupuesto) return
    const nombre = window.prompt(
      'Nombre para el presupuesto clonado:',
      `${presupuesto.nombre ?? 'Presupuesto'} (Editado)`
    )
    if (!nombre) return
    setActioning(true)
    try {
      const clone = await apiFetch(
        `/api/construccion/presupuestos/${presupuesto.id}/clone`,
        { method: 'POST', body: { nombre } }
      )
      navigate(`/presupuesto/${clone.id}`)
    } catch (err) {
      window.alert(err.message || 'Error al clonar')
    } finally {
      setActioning(false)
    }
  }

  // ── Partida mutations (auto-save) ──────────────────────────────────────
  const updateCantidad = async (partidaId, newCantidad) => {
    if (!(newCantidad > 0)) return
    try {
      const res = await apiFetch(
        `/api/construccion/presupuestos/${presupuesto.id}/partidas/${partidaId}`,
        {
          method: 'PATCH',
          body: { cantidad: newCantidad },
        }
      )
      setPresupuesto((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          montoTotal: res.presupuesto.montoTotal,
          partidas: prev.partidas.map((p) =>
            p.id === partidaId
              ? { ...p, cantidad: res.partida.cantidad, importe: res.partida.importe }
              : p
          ),
        }
      })
    } catch (err) {
      window.alert(err.message || 'Error al guardar cantidad')
      cargar()
    }
  }

  const updateNotas = async (partidaId, notas) => {
    try {
      await apiFetch(
        `/api/construccion/presupuestos/${presupuesto.id}/partidas/${partidaId}`,
        { method: 'PATCH', body: { notas } }
      )
      setPresupuesto((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          partidas: prev.partidas.map((p) =>
            p.id === partidaId ? { ...p, notas } : p
          ),
        }
      })
    } catch (err) {
      window.alert(err.message || 'Error al guardar nota')
    }
  }

  const deletePartida = async (partidaId, descripcion) => {
    if (!window.confirm(`¿Eliminar esta partida?\n${descripcion}`)) return
    try {
      const res = await apiFetch(
        `/api/construccion/presupuestos/${presupuesto.id}/partidas/${partidaId}`,
        { method: 'DELETE' }
      )
      setPresupuesto((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          montoTotal: res.presupuesto.montoTotal,
          partidas: prev.partidas.filter((p) => p.id !== partidaId),
        }
      })
    } catch (err) {
      window.alert(err.message || 'Error al eliminar partida')
    }
  }

  const addPartida = async ({ conceptoId, cantidad, zona, partida }) => {
    try {
      const res = await apiFetch(
        `/api/construccion/presupuestos/${presupuesto.id}/partidas`,
        {
          method: 'POST',
          body: { conceptoId, cantidad, zona, partida },
        }
      )
      setPresupuesto((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          montoTotal: res.presupuesto.montoTotal,
          partidas: [...prev.partidas, res.partida],
        }
      })
      setPickerOpen(null)
    } catch (err) {
      window.alert(err.message || 'Error al agregar partida')
    }
  }

  // ── Derived grouped view ────────────────────────────────────────────────
  const grouped = useMemo(
    () => (presupuesto ? groupPartidas(presupuesto.partidas) : []),
    [presupuesto]
  )

  if (loading) {
    return (
      <div className="pres-page">
        <div className="pres-state">Cargando presupuesto…</div>
      </div>
    )
  }

  if (error || !presupuesto) {
    return (
      <div className="pres-page">
        <button className="pres-back" onClick={() => navigate(-1)}>
          ← Regresar
        </button>
        <div className="pres-state pres-error">
          {error ?? 'Presupuesto no encontrado'}
        </div>
      </div>
    )
  }

  const subtotal = presupuesto.montoTotal
  const iva = subtotal * 0.16
  const total = subtotal + iva

  return (
    <div className="pres-page">
      <button
        className="pres-back"
        onClick={() => navigate(`/proyectos/${presupuesto.proyecto.id}`)}
      >
        ← {presupuesto.proyecto.codigo} — {presupuesto.proyecto.nombre}
      </button>

      <header className="pres-header">
        <div>
          <div className="pres-tag">Presupuesto v{presupuesto.version}</div>
          <h1>{presupuesto.nombre ?? `Presupuesto ${presupuesto.version}`}</h1>
          <div className="pres-meta">
            <span className={`pres-estado estado-${presupuesto.estado.toLowerCase()}`}>
              {ESTADO_LABEL[presupuesto.estado] ?? presupuesto.estado}
            </span>
            <span className="muted">
              {presupuesto.partidas.length} partidas · creado{' '}
              {new Date(presupuesto.createdAt).toLocaleDateString('es-MX')}
            </span>
          </div>
        </div>
        <div className="pres-totals-card">
          <div className="row">
            <span>Subtotal</span>
            <strong>{fmtMoney(subtotal)}</strong>
          </div>
          <div className="row">
            <span>IVA 16%</span>
            <strong>{fmtMoney(iva)}</strong>
          </div>
          <div className="row total">
            <span>Total</span>
            <strong>{fmtMoney(total)}</strong>
          </div>
        </div>
      </header>

      <div className="pres-actions">
        {canEdit && !isEditing && (
          <button className="secondary" onClick={() => setEditMode(true)}>
            ✎ Editar partidas
          </button>
        )}
        {canEdit && isEditing && (
          <button className="secondary" onClick={() => setEditMode(false)}>
            ✓ Listo editando
          </button>
        )}
        <button
          className="secondary"
          onClick={async () => {
            try {
              const data = await apiFetch(`/api/construccion/presupuestos/${presupuesto.id}/explosion`)
              setExplosion(data)
            } catch (err) { window.alert(err.message) }
          }}
        >
          📦 Explosión de insumos
        </button>
        {presupuesto.estado !== 'APROBADO' && (
          <button
            className="secondary"
            disabled={actioning}
            onClick={clonar}
            title="Crear una copia editable para negociación"
          >
            ⎘ Clonar para editar
          </button>
        )}
        {canEdit && !isEditing && (
          <>
            <button className="primary" disabled={actioning} onClick={aprobar}>
              ✓ Aprobar (cliente eligió este)
            </button>
            <button className="danger" disabled={actioning} onClick={rechazar}>
              ✕ Rechazar
            </button>
          </>
        )}
      </div>

      {grouped.map((z) => (
        <section key={z.zona} className="pres-zona">
          <h2 className="pres-zona-head">
            <span>{z.zona}</span>
            <span className="pres-zona-total">
              {fmtMoney(z.subtotal)}{' '}
              <span className="muted">({z.porc.toFixed(2)}%)</span>
            </span>
          </h2>

          {z.grupos.map((g) => (
            <div key={g.partida} className="pres-grupo">
              <div className="pres-grupo-head">
                <span className="mono">{g.partida}</span>
                <span className="mono">
                  {fmtMoney(g.subtotal)} · {g.porc.toFixed(2)}%
                </span>
              </div>

              <table className="pres-table">
                <colgroup>
                  <col style={{ width: '9%' }} />
                  <col />
                  <col style={{ width: '6%' }} />
                  <col style={{ width: isEditing ? '11%' : '9%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: isEditing ? '5%' : '6%' }} />
                  {isEditing && <col style={{ width: '5%' }} />}
                </colgroup>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Concepto</th>
                    <th>Unidad</th>
                    <th style={{ textAlign: 'right' }}>Cantidad</th>
                    <th style={{ textAlign: 'right' }}>P. Unitario</th>
                    <th style={{ textAlign: 'right' }}>Importe</th>
                    <th style={{ textAlign: 'right' }}>%</th>
                    {isEditing && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((p) => (
                    <PartidaRow
                      key={p.id}
                      partida={p}
                      isEditing={isEditing}
                      onCantidad={(v) => updateCantidad(p.id, v)}
                      onDelete={() => deletePartida(p.id, p.concepto?.descripcion ?? '')}
                      onNotas={(notas) => updateNotas(p.id, notas)}
                    />
                  ))}
                </tbody>
              </table>

              {isEditing && (
                <button
                  className="pres-add-row"
                  onClick={() =>
                    setPickerOpen({ zona: z.zona, partida: g.partida })
                  }
                >
                  + Agregar concepto a {g.partida}
                </button>
              )}
            </div>
          ))}

          {isEditing && (
            <button
              className="pres-add-row pres-add-partida"
              onClick={() => {
                const nombre = window.prompt(
                  `Nombre de la nueva partida en ${z.zona}:`,
                  ''
                )
                if (!nombre) return
                setPickerOpen({ zona: z.zona, partida: nombre })
              }}
            >
              + Agregar partida nueva a {z.zona}
            </button>
          )}
        </section>
      ))}

      {isEditing && (
        <div className="pres-add-zone-wrap">
          <button
            className="pres-add-row pres-add-zona"
            onClick={() => {
              const zonaNombre = window.prompt('Nombre de la nueva zona:', '')
              if (!zonaNombre) return
              const partidaNombre = window.prompt(
                `Nombre de la primera partida dentro de ${zonaNombre}:`,
                ''
              )
              if (!partidaNombre) return
              setPickerOpen({ zona: zonaNombre, partida: partidaNombre })
            }}
          >
            + Agregar zona nueva
          </button>
        </div>
      )}

      <footer className="pres-footer">
        <div className="pres-footer-card">
          <div className="row">
            <span>Total del presupuesto sin IVA</span>
            <strong>{fmtMoney(subtotal)}</strong>
          </div>
          <div className="row">
            <span>IVA 16%</span>
            <strong>{fmtMoney(iva)}</strong>
          </div>
          <div className="row total">
            <span>Total del presupuesto</span>
            <strong>{fmtMoney(total)}</strong>
          </div>
        </div>
      </footer>

      {explosion && (
        <ExplosionModal
          explosion={explosion}
          presupuesto={presupuesto}
          onClose={() => setExplosion(null)}
          navigate={navigate}
        />
      )}

      {pickerOpen && activeCompany?.id && (
        <ConceptoPicker
          companyId={activeCompany.id}
          zona={pickerOpen.zona}
          partida={pickerOpen.partida}
          onClose={() => setPickerOpen(null)}
          onPick={addPartida}
        />
      )}
    </div>
  )
}

// ── Partida row (edit-aware) ────────────────────────────────────────────────

function PartidaRow({ partida, isEditing, onCantidad, onDelete, onNotas }) {
  const [local, setLocal] = useState(partida.cantidad)
  const [notasOpen, setNotasOpen] = useState(false)
  const [notasLocal, setNotasLocal] = useState(partida.notas ?? '')
  const debounceRef = useRef()
  const notasRef = useRef()

  useEffect(() => { setLocal(partida.cantidad) }, [partida.cantidad])
  useEffect(() => { setNotasLocal(partida.notas ?? '') }, [partida.notas])

  const handleChange = (e) => {
    const v = parseFloat(e.target.value) || 0
    setLocal(v)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (v > 0 && v !== partida.cantidad) onCantidad(v)
    }, 500)
  }

  const handleBlur = () => {
    clearTimeout(debounceRef.current)
    if (local > 0 && local !== partida.cantidad) onCantidad(local)
  }

  const saveNotas = () => {
    clearTimeout(notasRef.current)
    const val = notasLocal.trim() || null
    if (val !== (partida.notas ?? null)) onNotas(val)
  }

  const hasNotas = !!(partida.notas?.trim())

  return (
    <>
      <tr>
        <td className="mono">
          {partida.concepto?.codigo ?? '—'}
          <button
            className={`pres-notas-btn ${hasNotas ? 'has-notas' : ''}`}
            onClick={() => setNotasOpen(v => !v)}
            title={hasNotas ? partida.notas : 'Agregar nota'}
          >
            {hasNotas ? '📝' : '💬'}
          </button>
        </td>
        <td className="desc">{partida.concepto?.descripcion ?? '—'}</td>
        <td>{partida.concepto?.unidad ?? '—'}</td>
        <td style={{ textAlign: 'right' }}>
          {isEditing ? (
            <input type="number" min="0" step="0.01" value={local}
              onChange={handleChange} onBlur={handleBlur} className="pres-qty-input" />
          ) : fmtQty(partida.cantidad)}
        </td>
        <td style={{ textAlign: 'right' }}>{fmtMoney(partida.precioUnitario)}</td>
        <td style={{ textAlign: 'right' }}><strong>{fmtMoney(partida.importe)}</strong></td>
        <td style={{ textAlign: 'right' }}>{partida.porc.toFixed(2)}%</td>
        {isEditing && (
          <td style={{ textAlign: 'center' }}>
            <button className="pres-delete-btn" onClick={onDelete} title="Eliminar">×</button>
          </td>
        )}
      </tr>
      {notasOpen && (
        <tr className="pres-notas-row">
          <td colSpan={isEditing ? 8 : 7}>
            <div className="pres-notas-editor">
              <textarea
                rows={2}
                value={notasLocal}
                onChange={(e) => setNotasLocal(e.target.value)}
                onBlur={saveNotas}
                placeholder="Notas internas sobre esta partida…"
              />
              {hasNotas && !notasLocal.trim() && (
                <span className="muted" style={{ fontSize: '0.72rem' }}>
                  Vaciar y salir para borrar la nota.
                </span>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Explosión de insumos modal (with OC generation) ────────────────────────

function ExplosionModal({ explosion, presupuesto, onClose, navigate }) {
  const [selected, setSelected] = useState(new Set())
  const [busy, setBusy] = useState(false)
  const items = explosion.explosion ?? []
  const materialItems = items.filter(e => e.tipo === 'MATERIAL')

  const toggleAll = () => {
    if (selected.size === materialItems.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(materialItems.map((_, i) => items.indexOf(materialItems[i]))))
    }
  }

  const toggle = (idx) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  const generateOC = async () => {
    const selectedItems = [...selected].map(i => items[i]).filter(Boolean)
    if (selectedItems.length === 0) {
      window.alert('Selecciona al menos un insumo para generar la orden de compra.')
      return
    }

    // Find the proyecto ID from the presupuesto
    const proyectoId = presupuesto?.proyecto?.id

    setBusy(true)
    try {
      const folio = `OC-${Date.now().toString(36).toUpperCase()}`
      await apiFetch('/api/construccion/solicitudes-compra', {
        method: 'POST',
        body: {
          companyId: presupuesto.companyId,
          folio,
          proyectoId: proyectoId || undefined,
          notas: `Generada desde explosión de insumos — ${presupuesto.nombre}`,
          partidas: selectedItems.map(e => ({
            descripcion: `${e.codigo} — ${e.descripcion}`,
            cantidad: e.cantidadTotal,
            precioUnitario: e.costoUnitario,
          })),
        },
      })
      window.alert(`✓ Solicitud de compra ${folio} creada con ${selectedItems.length} partida(s).`)
      onClose()
      navigate('/solicitudes-compra')
    } catch (err) {
      window.alert(err.message || 'Error al generar orden de compra')
    } finally {
      setBusy(false)
    }
  }

  const thStyle = { textAlign: 'left', padding: '0.5rem', borderBottom: '2px solid #e2e8f0', fontSize: '0.7rem', textTransform: 'uppercase', color: '#64748b' }
  const tdStyle = { padding: '0.45rem 0.5rem' }

  return (
    <div className="pres-picker-overlay" onClick={onClose}>
      <div className="pres-picker" style={{ maxWidth: 950, maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
        <header>
          <h3>Explosión de Insumos — {explosion.presupuestoNombre}</h3>
          <div className="muted">
            {explosion.resumen?.insumoCount} insumos · Costo directo: {fmtMoney(explosion.resumen?.totalCostoDirecto)}
          </div>
          <button className="pres-picker-close" onClick={onClose}>×</button>
        </header>
        <div style={{ padding: '1rem 1.25rem', overflow: 'auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Materiales</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#166534' }}>{fmtMoney(explosion.resumen?.totalMateriales)}</div>
            </div>
            <div style={{ background: '#eff6ff', padding: '0.75rem', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Mano de obra</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e40af' }}>{fmtMoney(explosion.resumen?.totalManoObra)}</div>
            </div>
            <div style={{ background: '#fefce8', padding: '0.75rem', borderRadius: 8, textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase' }}>Equipo</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#92400e' }}>{fmtMoney(explosion.resumen?.totalEquipo)}</div>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 30 }}>
                  <input type="checkbox" checked={selected.size === materialItems.length && materialItems.length > 0} onChange={toggleAll} title="Seleccionar todos los materiales" />
                </th>
                <th style={thStyle}>Código</th>
                <th style={thStyle}>Descripción</th>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>Unidad</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Cantidad</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Costo unit.</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Importe</th>
              </tr>
            </thead>
            <tbody>
              {items.map((e, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9', background: selected.has(idx) ? '#eff6ff' : undefined }}>
                  <td style={tdStyle}>
                    {e.tipo === 'MATERIAL' && (
                      <input type="checkbox" checked={selected.has(idx)} onChange={() => toggle(idx)} />
                    )}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'ui-monospace, monospace', fontSize: '0.78rem' }}>{e.codigo}</td>
                  <td style={{ ...tdStyle, maxWidth: 280, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.descripcion}</td>
                  <td style={{ ...tdStyle, color: '#64748b' }}>{e.tipo}</td>
                  <td style={tdStyle}>{e.unidad}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{e.cantidadTotal.toLocaleString('es-MX', { maximumFractionDigits: 2 })}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtMoney(e.costoUnitario)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600 }}>{fmtMoney(e.importeTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {selected.size > 0 && (
            <div style={{ marginTop: '1rem', padding: '0.85rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#166534', fontWeight: 600 }}>
                {selected.size} material(es) seleccionado(s) · {fmtMoney([...selected].reduce((a, i) => a + (items[i]?.importeTotal ?? 0), 0))}
              </span>
              <button
                onClick={generateOC}
                disabled={busy}
                style={{ background: '#16a34a', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
              >
                {busy ? 'Generando…' : '📋 Generar orden de compra'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Concepto picker modal ───────────────────────────────────────────────────
// Search the catalog + offer inline "crear concepto nuevo". On pick,
// asks for cantidad, then calls onPick({ conceptoId, cantidad, zona, partida }).

function ConceptoPicker({ companyId, zona, partida, onClose, onPick }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [picked, setPicked] = useState(null)
  const [cantidad, setCantidad] = useState('1')
  const [creating, setCreating] = useState(false)
  const [newForm, setNewForm] = useState({
    codigo: '',
    descripcion: '',
    unidad: '',
    categoria: '',
    precio: '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const search = useCallback(async () => {
    try {
      const qs = new URLSearchParams({ companyId })
      if (q.trim()) qs.set('q', q.trim())
      const data = await apiFetch(`/api/construccion/conceptos?${qs.toString()}`)
      setResults(Array.isArray(data) ? data.slice(0, 30) : [])
    } catch {
      setResults([])
    }
  }, [companyId, q])

  useEffect(() => {
    const t = setTimeout(search, 200)
    return () => clearTimeout(t)
  }, [search])

  const confirmPick = async () => {
    const qty = parseFloat(cantidad) || 0
    if (!picked || qty <= 0) return
    setBusy(true)
    await onPick({
      conceptoId: picked.id,
      cantidad: qty,
      zona,
      partida,
    })
    setBusy(false)
  }

  const createConceptoAndPick = async (e) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      // 1) Create the concepto
      const created = await apiFetch('/api/construccion/conceptos', {
        method: 'POST',
        body: {
          companyId,
          codigo: newForm.codigo.trim(),
          descripcion: newForm.descripcion.trim(),
          unidad: newForm.unidad.trim(),
          categoria: newForm.categoria.trim() || undefined,
        },
      })
      // 2) If user entered a precio, set it on the new APU via direct PATCH
      //    — the POST already created a v1 APU with precio 0. We need to
      //    set the precio, which requires the PUT /api/construccion/apus/:id/insumos
      //    endpoint. For v1 we'll just warn the user to set the PU in the APU
      //    editor if they need a real price. If they entered a precio, we'll
      //    overwrite precioUnitario directly via a synthetic PUT with empty
      //    lines + a pseudo manual PU.
      //    Actually: simpler path: since apus/:id/insumos PUT recomputes from
      //    overhead × costoDirecto / rendimiento, and we can't inject a manual
      //    PU through that, we'll rely on the existing precioUnitario=0 and
      //    let the user set it later. The partida will be added with PU=0.
      //    Juan can edit the PU via the APU editor page in another tab if
      //    urgent. Alternative: ask him to enter PU in the APU editor BEFORE
      //    using the concept. For now: trade-off noted.
      //
      // Use the created concepto with its current PU (0). Warn if user
      // supplied a price — tell them to set it in the APU editor.
      if (newForm.precio && parseFloat(newForm.precio) > 0) {
        window.alert(
          `Concepto creado. Nota: el precio unitario quedó en $0 porque la edición directa del PU aún no está disponible en este modal. Ábrelo en Catálogo → APU editor para fijarlo en $${parseFloat(
            newForm.precio
          ).toFixed(2)}.`
        )
      }
      const qty = parseFloat(cantidad) || 1
      await onPick({
        conceptoId: created.id,
        cantidad: qty,
        zona,
        partida,
      })
    } catch (error) {
      setErr(error.message || 'Error al crear concepto')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pres-picker-overlay" onClick={onClose}>
      <div className="pres-picker" onClick={(e) => e.stopPropagation()}>
        <header>
          <h3>Agregar concepto</h3>
          <div className="muted">
            {zona} → {partida}
          </div>
          <button className="pres-picker-close" onClick={onClose}>
            ×
          </button>
        </header>

        {!creating && !picked && (
          <>
            <input
              type="search"
              placeholder="Buscar código o descripción del concepto…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
            <div className="pres-picker-results">
              {results.length === 0 ? (
                <div className="muted" style={{ padding: '1rem' }}>
                  {q ? 'Sin resultados.' : 'Escribe para buscar conceptos…'}
                </div>
              ) : (
                results.map((c) => (
                  <button
                    key={c.id}
                    className="pres-picker-row"
                    onClick={() => setPicked(c)}
                  >
                    <span className="mono">{c.codigo}</span>
                    <span className="desc">{c.descripcion}</span>
                    <span className="muted">{c.unidad}</span>
                    <span className="mono">
                      {fmtMoney(c.apuActual?.precioUnitario ?? 0)}
                    </span>
                  </button>
                ))
              )}
            </div>
            <button
              className="pres-picker-new"
              onClick={() => setCreating(true)}
            >
              + Crear concepto nuevo (sobre la marcha)
            </button>
          </>
        )}

        {picked && (
          <div className="pres-picker-confirm">
            <div className="summary">
              <div className="mono">{picked.codigo}</div>
              <div>{picked.descripcion}</div>
              <div className="muted">
                Unidad: {picked.unidad} · PU actual:{' '}
                {fmtMoney(picked.apuActual?.precioUnitario ?? 0)}
              </div>
            </div>
            <label>
              Cantidad
              <input
                type="number"
                min="0"
                step="0.01"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                autoFocus
              />
            </label>
            <div className="summary">
              <strong>
                Importe:{' '}
                {fmtMoney(
                  (parseFloat(cantidad) || 0) *
                    (picked.apuActual?.precioUnitario ?? 0)
                )}
              </strong>
            </div>
            <div className="row">
              <button onClick={() => setPicked(null)}>← Regresar</button>
              <button className="primary" disabled={busy} onClick={confirmPick}>
                {busy ? 'Agregando…' : 'Agregar a partida'}
              </button>
            </div>
          </div>
        )}

        {creating && (
          <form
            className="pres-picker-new-form"
            onSubmit={createConceptoAndPick}
          >
            {err && <div className="pres-picker-error">{err}</div>}
            <label>
              Código
              <input
                required
                value={newForm.codigo}
                onChange={(e) =>
                  setNewForm({ ...newForm, codigo: e.target.value })
                }
                placeholder="NUEVO-001"
              />
            </label>
            <label>
              Descripción
              <textarea
                required
                rows={3}
                value={newForm.descripcion}
                onChange={(e) =>
                  setNewForm({ ...newForm, descripcion: e.target.value })
                }
                placeholder="Suministro y colocación de…"
              />
            </label>
            <div className="two-col">
              <label>
                Unidad
                <input
                  required
                  value={newForm.unidad}
                  onChange={(e) =>
                    setNewForm({ ...newForm, unidad: e.target.value })
                  }
                  placeholder="m2"
                />
              </label>
              <label>
                Categoría
                <input
                  value={newForm.categoria}
                  onChange={(e) =>
                    setNewForm({ ...newForm, categoria: e.target.value })
                  }
                  placeholder="Muros"
                />
              </label>
            </div>
            <label>
              Cantidad inicial
              <input
                type="number"
                min="0"
                step="0.01"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
            </label>
            <div className="muted" style={{ fontSize: '0.78rem' }}>
              El precio unitario del concepto nuevo queda en $0. Ábrelo después
              en el Catálogo → APU editor para fijar el PU real.
            </div>
            <div className="row">
              <button type="button" onClick={() => setCreating(false)}>
                ← Regresar
              </button>
              <button type="submit" className="primary" disabled={busy}>
                {busy ? 'Creando…' : 'Crear y agregar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
