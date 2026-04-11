/**
 * APU editor — the differentiator.
 *
 * Route: /apu/:conceptoId
 *
 * Reads the concepto via GET /api/construccion/conceptos/[id] which includes
 * the current APU + all insumo lines expanded with the master insumo data.
 *
 * The user can:
 *   • add insumo lines from a live-searching picker
 *   • edit cantidad / costoUnitario inline
 *   • delete a line
 *   • edit the overhead percentages (indirectos / financieros / utilidad / cargos)
 *   • edit rendimiento
 *   • save — sends a single PUT /api/construccion/apus/[id]/insumos with all
 *     lines + overhead fields. The server replaces the line set atomically
 *     and recomputes costoDirecto + precioUnitario.
 *
 * The PU shown in the header updates locally as you edit (optimistic) and
 * snaps to the authoritative value on save.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../config/api'
import './APU.css'

const TIPO_LABEL = {
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

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

export default function APU() {
  const { conceptoId } = useParams()
  const navigate = useNavigate()
  const { activeCompany } = useAuth()

  const [concepto, setConcepto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Editable state
  const [lines, setLines] = useState([]) // { insumoId, cantidad, costoUnitario, orden, insumo: {...} }
  const [indirectosPorc, setIndirectosPorc] = useState(0)
  const [financierosPorc, setFinancierosPorc] = useState(0)
  const [utilidadPorc, setUtilidadPorc] = useState(0)
  const [cargosAdicPorc, setCargosAdicPorc] = useState(0)
  const [rendimiento, setRendimiento] = useState(1)

  // Save state
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [saveOk, setSaveOk] = useState(false)

  // Add-line picker state
  const [pickerQ, setPickerQ] = useState('')
  const [pickerResults, setPickerResults] = useState([])
  const [pickerOpen, setPickerOpen] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch(`/api/construccion/conceptos/${conceptoId}`)
      setConcepto(data)
      const apu = data.apuActual
      setLines(
        (apu?.insumos ?? []).map((l) => ({
          insumoId: l.insumoId,
          cantidad: l.cantidad,
          costoUnitario: l.costoUnitario,
          orden: l.orden,
          insumo: l.insumo,
        }))
      )
      setIndirectosPorc(apu?.indirectosPorc ?? 0)
      setFinancierosPorc(apu?.financierosPorc ?? 0)
      setUtilidadPorc(apu?.utilidadPorc ?? 0)
      setCargosAdicPorc(apu?.cargosAdicPorc ?? 0)
      setRendimiento(apu?.rendimiento ?? 1)
    } catch (err) {
      setError(err.message || 'Error al cargar concepto')
    } finally {
      setLoading(false)
    }
  }, [conceptoId])

  useEffect(() => {
    cargar()
  }, [cargar])

  // ── Live search for the insumo picker ────────────────────────────────────
  const pickerTimerRef = useRef()
  useEffect(() => {
    if (!activeCompany?.id || !pickerOpen) return
    clearTimeout(pickerTimerRef.current)
    pickerTimerRef.current = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({ companyId: activeCompany.id })
        if (pickerQ.trim()) qs.set('q', pickerQ.trim())
        const data = await apiFetch(`/api/construccion/insumos?${qs.toString()}`)
        setPickerResults(Array.isArray(data) ? data.slice(0, 25) : [])
      } catch {
        setPickerResults([])
      }
    }, 200)
    return () => clearTimeout(pickerTimerRef.current)
  }, [pickerQ, pickerOpen, activeCompany?.id])

  // ── Computed totals (mirror the server formula) ──────────────────────────
  const costoDirecto = useMemo(
    () =>
      round2(
        lines.reduce(
          (acc, l) => acc + (Number(l.cantidad) || 0) * (Number(l.costoUnitario) || 0),
          0
        )
      ),
    [lines]
  )

  // Cascading overhead formula matching Mexican construction standard:
  //   subtotal1 = CD × (1 + indirectos)
  //   subtotal2 = subtotal1 × (1 + financieros)
  //   PU = subtotal2 × (1 + utilidad + cargosAdic) / rendimiento
  const rend = Number(rendimiento) > 0 ? Number(rendimiento) : 1
  const subtotal1 = costoDirecto * (1 + (Number(indirectosPorc) || 0))
  const subtotal2 = subtotal1 * (1 + (Number(financierosPorc) || 0))
  const precioUnitario = round2(
    (subtotal2 * (1 + (Number(utilidadPorc) || 0) + (Number(cargosAdicPorc) || 0))) / rend
  )

  // ── Mutators ─────────────────────────────────────────────────────────────
  const addLine = (insumo) => {
    if (lines.some((l) => l.insumoId === insumo.id)) {
      // bump cantidad by 1 instead of dupe
      setLines((prev) =>
        prev.map((l) =>
          l.insumoId === insumo.id ? { ...l, cantidad: (Number(l.cantidad) || 0) + 1 } : l
        )
      )
    } else {
      setLines((prev) => [
        ...prev,
        {
          insumoId: insumo.id,
          cantidad: 1,
          costoUnitario: insumo.costoActual,
          orden: prev.length,
          insumo,
        },
      ])
    }
    setPickerQ('')
    setPickerOpen(false)
  }

  const updateLine = (idx, patch) => {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)))
  }

  const removeLine = (idx) => {
    setLines((prev) => prev.filter((_, i) => i !== idx))
  }

  const save = async () => {
    if (!concepto?.apuActual?.id) return
    setSaving(true)
    setSaveError(null)
    setSaveOk(false)
    try {
      const body = {
        lines: lines.map((l, idx) => ({
          insumoId: l.insumoId,
          cantidad: Number(l.cantidad) || 0,
          costoUnitario: Number(l.costoUnitario) || 0,
          orden: idx,
        })),
        indirectosPorc: Number(indirectosPorc) || 0,
        financierosPorc: Number(financierosPorc) || 0,
        utilidadPorc: Number(utilidadPorc) || 0,
        cargosAdicPorc: Number(cargosAdicPorc) || 0,
        rendimiento: Number(rendimiento) > 0 ? Number(rendimiento) : 1,
      }
      const updated = await apiFetch(
        `/api/construccion/apus/${concepto.apuActual.id}/insumos`,
        { method: 'PUT', body }
      )
      // Snap to authoritative values
      setConcepto((c) => (c ? { ...c, apuActual: updated } : c))
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 2500)
    } catch (err) {
      setSaveError(err.message || 'Error al guardar APU')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="apu-page">
        <div className="apu-state">Cargando concepto…</div>
      </div>
    )
  }

  if (error || !concepto) {
    return (
      <div className="apu-page">
        <button className="apu-back" onClick={() => navigate('/catalogo')}>
          ← Catálogo
        </button>
        <div className="apu-state apu-error">{error ?? 'Concepto no encontrado'}</div>
      </div>
    )
  }

  return (
    <div className="apu-page">
      <button className="apu-back" onClick={() => navigate('/catalogo')}>
        ← Catálogo
      </button>

      <header className="apu-header">
        <div>
          <div className="apu-codigo">{concepto.codigo}</div>
          <h1>{concepto.descripcion}</h1>
          <div className="apu-meta">
            <span className="badge">{concepto.categoria ?? 'Sin categoría'}</span>
            <span className="muted">Unidad: {concepto.unidad}</span>
            <span className="muted">
              APU v{concepto.apuActual?.version ?? 1}
            </span>
          </div>
        </div>
        <div className="apu-pu">
          <div className="label">Precio unitario</div>
          <div className="value">{fmtMoney(precioUnitario)}</div>
          <div className="sub">por {concepto.unidad}</div>
        </div>
      </header>

      <div className="apu-body">
        <section className="apu-card">
          <div className="apu-card-head">
            <h2>Insumos ({lines.length})</h2>
            <div className="apu-add">
              <input
                type="text"
                placeholder="Buscar insumo para agregar…"
                value={pickerQ}
                onChange={(e) => {
                  setPickerQ(e.target.value)
                  setPickerOpen(true)
                }}
                onFocus={() => setPickerOpen(true)}
              />
              {pickerOpen && (
                <div className="apu-picker">
                  {pickerResults.length === 0 ? (
                    <div className="apu-picker-empty">
                      {pickerQ ? 'Sin resultados.' : 'Escribe para buscar…'}
                    </div>
                  ) : (
                    pickerResults.map((ins) => (
                      <button
                        key={ins.id}
                        className="apu-picker-row"
                        onClick={() => addLine(ins)}
                      >
                        <span className="mono">{ins.codigo}</span>
                        <span className="desc">{ins.descripcion}</span>
                        <span className="muted">{TIPO_LABEL[ins.tipo] ?? ins.tipo}</span>
                        <span className="muted">{ins.unidad}</span>
                        <span className="mono">{fmtMoney(ins.costoActual)}</span>
                      </button>
                    ))
                  )}
                  <button
                    className="apu-picker-close"
                    onClick={() => setPickerOpen(false)}
                  >
                    Cerrar
                  </button>
                </div>
              )}
            </div>
          </div>

          {lines.length === 0 ? (
            <div className="apu-empty">
              Aún no hay insumos en este APU. Agrega el primero con el buscador de arriba.
            </div>
          ) : (
            <table className="apu-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th>Tipo</th>
                  <th>Unidad</th>
                  <th style={{ width: 100 }}>Cantidad</th>
                  <th style={{ width: 130 }}>Costo unit.</th>
                  <th style={{ textAlign: 'right' }}>Importe</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, idx) => {
                  const importe =
                    (Number(l.cantidad) || 0) * (Number(l.costoUnitario) || 0)
                  return (
                    <tr key={`${l.insumoId}-${idx}`}>
                      <td className="mono">{l.insumo?.codigo ?? l.insumoId}</td>
                      <td>{l.insumo?.descripcion ?? '—'}</td>
                      <td>
                        {l.insumo?.tipo ? TIPO_LABEL[l.insumo.tipo] : '—'}
                      </td>
                      <td>{l.insumo?.unidad ?? '—'}</td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={l.cantidad}
                          onChange={(e) => updateLine(idx, { cantidad: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={l.costoUnitario}
                          onChange={(e) =>
                            updateLine(idx, { costoUnitario: e.target.value })
                          }
                        />
                      </td>
                      <td style={{ textAlign: 'right' }}>{fmtMoney(importe)}</td>
                      <td>
                        <button className="link-danger" onClick={() => removeLine(idx)}>
                          ×
                        </button>
                      </td>
                    </tr>
                  )
                })}
                <tr className="apu-total-row">
                  <td colSpan={6} style={{ textAlign: 'right' }}>
                    <strong>Costo directo</strong>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <strong>{fmtMoney(costoDirecto)}</strong>
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          )}
        </section>

        <aside className="apu-side">
          <section className="apu-card">
            <h2>Sobrecostos</h2>
            <label>
              Indirectos (%)
              <input
                type="number"
                min="0"
                step="0.01"
                value={indirectosPorc * 100}
                onChange={(e) => setIndirectosPorc((parseFloat(e.target.value) || 0) / 100)}
              />
            </label>
            <label>
              Financieros (%)
              <input
                type="number"
                min="0"
                step="0.01"
                value={financierosPorc * 100}
                onChange={(e) => setFinancierosPorc((parseFloat(e.target.value) || 0) / 100)}
              />
            </label>
            <label>
              Utilidad (%)
              <input
                type="number"
                min="0"
                step="0.01"
                value={utilidadPorc * 100}
                onChange={(e) => setUtilidadPorc((parseFloat(e.target.value) || 0) / 100)}
              />
            </label>
            <label>
              Cargos adicionales (%)
              <input
                type="number"
                min="0"
                step="0.01"
                value={cargosAdicPorc * 100}
                onChange={(e) => setCargosAdicPorc((parseFloat(e.target.value) || 0) / 100)}
              />
            </label>
            <label>
              Rendimiento
              <input
                type="number"
                min="0.0001"
                step="0.01"
                value={rendimiento}
                onChange={(e) => setRendimiento(parseFloat(e.target.value) || 1)}
              />
            </label>
          </section>

          <section className="apu-card apu-summary">
            <div className="row">
              <span>Costo directo</span>
              <strong>{fmtMoney(costoDirecto)}</strong>
            </div>
            <div className="row">
              <span>+ Indirectos ({((Number(indirectosPorc) || 0) * 100).toFixed(1)}%)</span>
              <strong>{fmtMoney(subtotal1 - costoDirecto)}</strong>
            </div>
            <div className="row">
              <span>+ Financiamiento ({((Number(financierosPorc) || 0) * 100).toFixed(1)}%)</span>
              <strong>{fmtMoney(subtotal2 - subtotal1)}</strong>
            </div>
            <div className="row">
              <span>+ Utilidad ({((Number(utilidadPorc) || 0) * 100).toFixed(1)}%)</span>
              <strong>{fmtMoney(subtotal2 * (Number(utilidadPorc) || 0))}</strong>
            </div>
            {(Number(cargosAdicPorc) || 0) > 0 && (
              <div className="row">
                <span>+ Cargos adic. ({((Number(cargosAdicPorc) || 0) * 100).toFixed(1)}%)</span>
                <strong>{fmtMoney(subtotal2 * (Number(cargosAdicPorc) || 0))}</strong>
              </div>
            )}
            {rend !== 1 && (
              <div className="row">
                <span>÷ Rendimiento</span>
                <strong>÷{rend}</strong>
              </div>
            )}
            <div className="row total">
              <span>Precio unitario</span>
              <strong>{fmtMoney(precioUnitario)}</strong>
            </div>
          </section>

          <div className="apu-save-block">
            {saveError && <div className="cat-error">{saveError}</div>}
            {saveOk && <div className="apu-ok">Guardado ✓</div>}
            <button className="primary wide" onClick={save} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar APU'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
