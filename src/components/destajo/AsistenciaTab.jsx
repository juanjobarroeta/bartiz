/**
 * Pasar lista: obra → cuadrilla → semana → día. Por trabajador se marca si
 * vino (jornada completa de un toque), las horas y las horas extra. Abajo, el
 * resumen de la semana con el pago estimado y el botón para generar (o
 * recalcular) la raya, que queda en BORRADOR para que Contabilidad la
 * autorice. Una semana con raya autorizada o pagada ya no se edita.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../config/api'
import { alertDialog, confirmDialog } from '../Dialog'
import {
  DIAS_CORTOS,
  errMsg,
  etiquetaSemana,
  fechaCorta,
  importeDia,
  isoLocal,
  lunesDe,
  num,
  pesos,
  sumarDias,
  tarifaTexto,
} from '../../lib/destajo'

export default function AsistenciaTab({ proyectos, proyectoId, setProyectoId, editable, onRayaGenerada }) {
  const hoy = isoLocal()
  const [cuadrillas, setCuadrillas] = useState([])
  const [cuadrillaId, setCuadrillaId] = useState('')
  const [lunes, setLunes] = useState(() => lunesDe(hoy))
  const [dia, setDia] = useState(hoy)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState({}) // trabajadorId -> { horas, horasExtra }
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  // Cuadrillas de la obra.
  useEffect(() => {
    let alive = true
    setCuadrillas([])
    setData(null)
    if (!proyectoId) return
    apiFetch(`/api/construccion/cuadrillas?proyectoId=${encodeURIComponent(proyectoId)}`)
      .then((c) => {
        if (!alive) return
        const list = Array.isArray(c) ? c : []
        setCuadrillas(list)
        setCuadrillaId((prev) => (list.some((x) => x.id === prev) ? prev : list[0]?.id ?? ''))
      })
      .catch((e) => alertDialog({ title: 'No se pudieron cargar las cuadrillas', message: errMsg(e) }))
    return () => { alive = false }
  }, [proyectoId])

  const cargarSemana = useCallback(async () => {
    if (!cuadrillaId) { setData(null); return }
    setLoading(true)
    try {
      const d = await apiFetch(`/api/construccion/asistencias?cuadrillaId=${encodeURIComponent(cuadrillaId)}&semana=${lunes}`)
      setData(d)
      setDirty(false)
    } catch (e) {
      alertDialog({ title: 'No se pudo cargar la asistencia', message: errMsg(e) })
    } finally {
      setLoading(false)
    }
  }, [cuadrillaId, lunes])
  useEffect(() => { cargarSemana() }, [cargarSemana])

  const miembros = data?.miembros ?? []
  const conTrabajador = miembros.filter((m) => m.trabajador)
  const sinTrabajador = miembros.filter((m) => !m.trabajador)

  // Lo guardado, indexado por día y trabajador.
  const guardado = useMemo(() => {
    const map = {}
    for (const a of data?.asistencias ?? []) {
      ;(map[a.fecha] ??= {})[a.trabajadorId] = { horas: a.horas, horasExtra: a.horasExtra }
    }
    return map
  }, [data])

  // El borrador del día seleccionado parte de lo guardado.
  useEffect(() => {
    const base = guardado[dia] ?? {}
    const next = {}
    for (const m of conTrabajador) {
      const g = base[m.trabajador.id]
      next[m.trabajador.id] = { horas: g?.horas ?? 0, horasExtra: g?.horasExtra ?? 0 }
    }
    setDraft(next)
    setDirty(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardado, dia, data])

  const confirmarDescarte = async () =>
    !dirty || (await confirmDialog({ title: 'Cambios sin guardar', message: 'Tienes asistencia sin guardar en este día. ¿Descartarla?', okLabel: 'Descartar' }))

  const irSemana = async (delta) => {
    if (!(await confirmarDescarte())) return
    const nl = delta === 0 ? lunesDe(hoy) : sumarDias(lunes, delta * 7)
    setLunes(nl)
    setDia(nl === lunesDe(hoy) ? hoy : nl)
  }
  const irDia = async (d) => {
    if (d === dia || !(await confirmarDescarte())) return
    setDia(d)
  }
  const cambiarCuadrilla = async (id) => {
    if (!(await confirmarDescarte())) return
    setCuadrillaId(id)
  }

  const cerrada = !!data?.cerrada
  const puedeEditar = editable && !cerrada

  const setFila = (tid, patch) => {
    setDraft((p) => ({ ...p, [tid]: { ...p[tid], ...patch } }))
    setDirty(true)
  }
  const todosVinieron = () => {
    const next = {}
    for (const m of conTrabajador) {
      const cur = draft[m.trabajador.id] ?? { horas: 0, horasExtra: 0 }
      next[m.trabajador.id] = cur.horas > 0 ? cur : { ...cur, horas: Number(m.trabajador.horasJornada) || 8 }
    }
    setDraft(next)
    setDirty(true)
  }

  const guardarDia = async () => {
    if (!conTrabajador.length) return
    setSaving(true)
    try {
      await apiFetch('/api/construccion/asistencias', {
        method: 'PUT',
        body: {
          cuadrillaId,
          registros: conTrabajador.map((m) => {
            const r = draft[m.trabajador.id] ?? { horas: 0, horasExtra: 0 }
            return {
              trabajadorId: m.trabajador.id,
              fecha: dia,
              horas: Number(r.horas) || 0,
              horasExtra: Number(r.horasExtra) || 0,
            }
          }),
        },
      })
      await cargarSemana()
    } catch (e) {
      alertDialog({ title: 'No se guardó la asistencia', message: errMsg(e) })
    } finally {
      setSaving(false)
    }
  }

  // Resumen de la semana (lo guardado).
  const resumen = useMemo(() => {
    const filas = conTrabajador.map((m) => {
      const t = m.trabajador
      let dias = 0, horas = 0, extra = 0, importe = 0
      for (const d of data?.dias ?? []) {
        const g = guardado[d]?.[t.id]
        if (!g) continue
        if (g.horas > 0 || g.horasExtra > 0) dias += 1
        horas += g.horas
        extra += g.horasExtra
        importe += importeDia(t, g.horas, g.horasExtra)
      }
      return { id: t.id, nombre: t.nombre, dias, horas, extra, importe }
    })
    return { filas, total: filas.reduce((a, f) => a + f.importe, 0) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guardado, data])

  const generarRaya = async () => {
    if (dirty) {
      const ok = await confirmDialog({ title: 'Cambios sin guardar', message: 'Guarda primero la asistencia del día; la raya se calcula con lo guardado.', okLabel: 'Generar de todos modos' })
      if (!ok) return
    }
    try {
      const raya = await apiFetch(`/api/construccion/cuadrillas/${cuadrillaId}/raya`, { method: 'POST', body: { semana: lunes } })
      await cargarSemana()
      const ver = await confirmDialog({
        title: data?.raya ? 'Raya recalculada' : 'Raya generada',
        message: `Semana ${etiquetaSemana(lunes)}: ${pesos(raya.total)} en borrador. Ahí puedes sumar destajo y anticipos; Contabilidad la autoriza.`,
        okLabel: 'Ver raya',
        cancelLabel: 'Seguir aquí',
      })
      if (ver) onRayaGenerada?.(raya.id)
    } catch (e) {
      alertDialog({ title: 'No se generó la raya', message: errMsg(e) })
    }
  }

  const diaTotal = conTrabajador.reduce((a, m) => {
    const r = draft[m.trabajador.id]
    return a + (r ? importeDia(m.trabajador, r.horas, r.horasExtra) : 0)
  }, 0)
  const presentes = conTrabajador.filter((m) => (draft[m.trabajador.id]?.horas ?? 0) > 0).length

  return (
    <div className="mo-section">
      <div className="mo-bar">
        <select className="input mo-select" value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
          {proyectos.length === 0 && <option value="">Sin obras</option>}
          {proyectos.map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
        </select>
        <select className="input mo-select" value={cuadrillaId} onChange={(e) => cambiarCuadrilla(e.target.value)} disabled={!cuadrillas.length}>
          {cuadrillas.length === 0 && <option value="">Sin cuadrillas</option>}
          {cuadrillas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
      </div>

      {!cuadrillaId ? (
        <div className="pd-empty">
          {proyectoId ? 'Esta obra no tiene cuadrillas. Créalas en la pestaña Cuadrillas.' : 'Elige una obra.'}
        </div>
      ) : (
        <>
          <div className="mo-week">
            <button className="btn small" onClick={() => irSemana(-1)} aria-label="Semana anterior">‹</button>
            <div className="mo-week-label">
              <strong>{etiquetaSemana(lunes)}</strong>
              {lunes !== lunesDe(hoy) && <button className="mo-link small" onClick={() => irSemana(0)}>Esta semana</button>}
            </div>
            <button className="btn small" onClick={() => irSemana(1)} aria-label="Semana siguiente">›</button>
          </div>

          <div className="mo-days">
            {(data?.dias ?? Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i))).map((d, i) => {
              const n = Object.values(guardado[d] ?? {}).filter((g) => g.horas > 0 || g.horasExtra > 0).length
              return (
                <button key={d} className={`mo-day${d === dia ? ' active' : ''}${d === hoy ? ' hoy' : ''}`} onClick={() => irDia(d)}>
                  <span>{DIAS_CORTOS[i]}</span>
                  <span className="mo-day-num">{Number(d.slice(8))}</span>
                  <span className="mo-day-count">{n > 0 ? n : '·'}</span>
                </button>
              )
            })}
          </div>

          {data?.raya && (
            <div className={`mo-banner${cerrada ? ' cerrada' : ''}`}>
              Raya de la semana: <span className={`badge estado-${data.raya.estado.toLowerCase()}`}>{data.raya.estado}</span>{' '}
              <strong>{pesos(data.raya.total)}</strong>
              {cerrada && <span className="small"> — la asistencia de esta semana está cerrada.</span>}
            </div>
          )}

          {loading && !data ? (
            <div className="pd-empty">Cargando…</div>
          ) : miembros.length === 0 ? (
            <div className="pd-empty">La cuadrilla no tiene miembros. Agrégalos en la pestaña Cuadrillas.</div>
          ) : (
            <>
              <div className="mo-dia-head">
                <strong>{DIAS_CORTOS[(new Date(`${dia}T12:00:00Z`).getUTCDay() + 6) % 7]} {fechaCorta(dia)}</strong>
                <span className="muted small">{presentes}/{conTrabajador.length} vinieron · {pesos(diaTotal)}</span>
                {puedeEditar && conTrabajador.length > 0 && (
                  <button className="mo-link small" onClick={todosVinieron}>Todos vinieron</button>
                )}
              </div>

              <div className="mo-lista">
                {conTrabajador.map((m) => {
                  const t = m.trabajador
                  const r = draft[t.id] ?? { horas: 0, horasExtra: 0 }
                  const jornada = Number(t.horasJornada) || 8
                  const vino = r.horas > 0
                  return (
                    <div key={m.id} className={`mo-asis${vino ? ' vino' : ''}`}>
                      <label className="mo-asis-who">
                        <input
                          type="checkbox"
                          checked={vino}
                          disabled={!puedeEditar}
                          onChange={(e) => setFila(t.id, e.target.checked ? { horas: jornada } : { horas: 0, horasExtra: 0 })}
                        />
                        <span>
                          <strong>{t.nombre}</strong>
                          <span className="muted small"> {tarifaTexto(t)}</span>
                        </span>
                      </label>
                      <div className="mo-asis-nums">
                        <label>
                          <span className="muted small">Horas</span>
                          <input
                            type="number" inputMode="decimal" min="0" max="24" step="0.5"
                            value={r.horas || ''}
                            placeholder="0"
                            disabled={!puedeEditar}
                            onChange={(e) => setFila(t.id, { horas: Math.min(24, Math.max(0, Number(e.target.value) || 0)) })}
                          />
                        </label>
                        <button
                          type="button" className="mo-half" disabled={!puedeEditar}
                          title="Medio día" onClick={() => setFila(t.id, { horas: jornada / 2 })}
                        >½</button>
                        <label>
                          <span className="muted small">Extra</span>
                          <input
                            type="number" inputMode="decimal" min="0" max="24" step="0.5"
                            value={r.horasExtra || ''}
                            placeholder="0"
                            disabled={!puedeEditar}
                            onChange={(e) => setFila(t.id, { horasExtra: Math.min(24, Math.max(0, Number(e.target.value) || 0)) })}
                          />
                        </label>
                        <span className="mo-asis-imp mono">{pesos(importeDia(t, r.horas, r.horasExtra))}</span>
                      </div>
                    </div>
                  )
                })}
                {sinTrabajador.map((m) => (
                  <div key={m.id} className="mo-asis sin">
                    <span><strong>{m.nombre}</strong> <span className="muted small">— sin tarifa; vincúlalo a un trabajador en Cuadrillas para pasarle lista.</span></span>
                  </div>
                ))}
              </div>

              {puedeEditar && conTrabajador.length > 0 && (
                <div className="mo-sticky">
                  <button className="btn btn-primary" disabled={!dirty || saving} onClick={guardarDia}>
                    {saving ? 'Guardando…' : dirty ? `Guardar ${fechaCorta(dia)}` : 'Guardado'}
                  </button>
                </div>
              )}

              <div className="mo-resumen">
                <h3>Semana</h3>
                <table className="rayas-table">
                  <thead>
                    <tr>
                      <th>Trabajador</th>
                      <th style={{ textAlign: 'right' }}>Días</th>
                      <th style={{ textAlign: 'right' }}>Horas</th>
                      <th style={{ textAlign: 'right' }}>Extra</th>
                      <th style={{ textAlign: 'right' }}>Estimado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.filas.map((f) => (
                      <tr key={f.id}>
                        <td>{f.nombre}</td>
                        <td style={{ textAlign: 'right' }}>{f.dias}</td>
                        <td style={{ textAlign: 'right' }}>{num(f.horas)}</td>
                        <td style={{ textAlign: 'right' }}>{f.extra ? num(f.extra) : '—'}</td>
                        <td style={{ textAlign: 'right' }} className="mono">{pesos(f.importe)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={4}><strong>Jornales de la semana</strong></td>
                      <td style={{ textAlign: 'right' }} className="mono"><strong>{pesos(resumen.total)}</strong></td>
                    </tr>
                  </tfoot>
                </table>
                {puedeEditar && (
                  <div className="mo-actions">
                    <span className="muted small">
                      La raya toma lo guardado. Destajo y anticipos se ajustan en la raya.
                    </span>
                    <button className="btn btn-primary" onClick={generarRaya} disabled={resumen.total <= 0 && !data?.raya}>
                      {data?.raya ? 'Recalcular raya' : 'Generar raya'}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
