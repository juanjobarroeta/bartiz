/**
 * Rayas semanales: BORRADOR (se ajusta destajo y anticipos) → AUTORIZADA por
 * Contabilidad → PAGADA por Tesorería (sólo registra el pago: fecha y
 * referencia; el cargo real se concilia después desde Bancos). Lo autorizado
 * y lo pagado cuenta como costo de mano de obra de la obra.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../config/api'
import { alertDialog, confirmDialog } from '../Dialog'
import Modal from '../Modal'
import {
  errMsg,
  etiquetaSemana,
  fechaCorta,
  isoLocal,
  num,
  pesos,
  puedeAutorizar,
  puedeCapturar,
  puedePagar,
} from '../../lib/destajo'

const ESTADO_TXT = { BORRADOR: 'Borrador', APROBADA: 'Autorizada', PAGADA: 'Pagada' }
const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null)
// semanaInicio se guarda a las 00:00 de México (06:00Z): la fecha UTC es el lunes.
const semanaDe = (r) => etiquetaSemana(iso(r.semanaInicio))

export default function RayasTab({ proyectos, rol, abrirRayaId, onAbierta }) {
  const [proyectoFilter, setProyectoFilter] = useState('')
  const [estado, setEstado] = useState(rol === 'TESORERIA' ? 'APROBADA' : 'ALL')
  const [rayas, setRayas] = useState([])
  const [loading, setLoading] = useState(true)
  const [abierta, setAbierta] = useState(null)
  const cerrar = useCallback(() => setAbierta(null), [])

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const targets = proyectoFilter ? proyectos.filter((p) => p.id === proyectoFilter) : proyectos
      const res = await Promise.all(
        targets.map((p) =>
          apiFetch(`/api/construccion/rayas?proyectoId=${encodeURIComponent(p.id)}`)
            .then((d) => (Array.isArray(d) ? d.map((r) => ({ ...r, proyecto: p })) : []))
            .catch(() => [])
        )
      )
      setRayas(res.flat().sort((a, b) => String(b.semanaInicio).localeCompare(String(a.semanaInicio))))
    } finally {
      setLoading(false)
    }
  }, [proyectos, proyectoFilter])
  useEffect(() => { reload() }, [reload])

  useEffect(() => {
    if (abrirRayaId) {
      setAbierta(abrirRayaId)
      onAbierta?.()
    }
  }, [abrirRayaId, onAbierta])

  const filtradas = useMemo(
    () => (estado === 'ALL' ? rayas : rayas.filter((r) => r.estado === estado)),
    [rayas, estado]
  )
  const cuenta = (e) => rayas.filter((r) => r.estado === e).length
  const totalFiltro = filtradas.reduce((a, r) => a + (Number(r.total) || 0), 0)

  return (
    <div className="mo-section">
      <div className="mo-bar">
        {proyectos.length > 1 && (
          <select className="input mo-select" value={proyectoFilter} onChange={(e) => setProyectoFilter(e.target.value)}>
            <option value="">Todas las obras</option>
            {proyectos.map((p) => <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>)}
          </select>
        )}
      </div>
      <div className="estado-filters">
        {['ALL', 'BORRADOR', 'APROBADA', 'PAGADA'].map((f) => (
          <button key={f} className={estado === f ? 'active' : ''} onClick={() => setEstado(f)}>
            {f === 'ALL' ? 'Todas' : ESTADO_TXT[f]}
            {f !== 'ALL' && f !== 'PAGADA' && cuenta(f) > 0 && <span className="count">{cuenta(f)}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="pd-empty">Cargando…</div>
      ) : filtradas.length === 0 ? (
        <div className="pd-empty">
          {rayas.length === 0
            ? 'Aún no hay rayas. Se generan desde Asistencia al cerrar la semana de una cuadrilla.'
            : 'Sin rayas en este filtro.'}
        </div>
      ) : (
        <div className="mo-scroll">
          <table className="rayas-table mo-rayas">
            <thead>
              <tr>
                <th>Semana</th>
                <th>Obra · cuadrilla</th>
                <th>Estado</th>
                <th style={{ textAlign: 'right' }}>Jornales</th>
                <th style={{ textAlign: 'right' }}>Destajo</th>
                <th style={{ textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((r) => (
                <tr key={r.id} className="mo-click" onClick={() => setAbierta(r.id)}>
                  <td className="small">{semanaDe(r)}</td>
                  <td>
                    {r.cuadrilla?.nombre}
                    <div className="muted small">{r.proyecto?.codigo}</div>
                  </td>
                  <td><span className={`badge estado-${r.estado?.toLowerCase()}`}>{ESTADO_TXT[r.estado] ?? r.estado}</span></td>
                  <td style={{ textAlign: 'right' }} className="mono">{Number(r.totalJornales) ? pesos(r.totalJornales) : '—'}</td>
                  <td style={{ textAlign: 'right' }} className="mono">{Number(r.totalDestajo) ? pesos(r.totalDestajo) : '—'}</td>
                  <td style={{ textAlign: 'right' }} className="mono"><strong>{pesos(r.total)}</strong></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5}><strong>{filtradas.length} rayas</strong></td>
                <td style={{ textAlign: 'right' }} className="mono"><strong>{pesos(totalFiltro)}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {abierta && (
        <RayaModal
          rayaId={abierta}
          rol={rol}
          onClose={cerrar}
          onChanged={reload}
        />
      )}
    </div>
  )
}

const esJornal = (d) => Number(d.horas) > 0 || Number(d.horasExtra) > 0

function RayaModal({ rayaId, rol, onClose, onChanged }) {
  const [raya, setRaya] = useState(null)
  const [trabajos, setTrabajos] = useState([])
  const [anticipos, setAnticipos] = useState({})
  const [notas, setNotas] = useState('')
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [pago, setPago] = useState(null) // { fecha, referencia }

  const cargar = useCallback(async () => {
    try {
      const r = await apiFetch(`/api/construccion/rayas/${rayaId}`)
      setRaya(r)
      setTrabajos((r.trabajos ?? []).map((t) => ({ ...t, cantidad: t.cantidad ?? '', unidad: t.unidad ?? '' })))
      setAnticipos(Object.fromEntries((r.detalles ?? []).map((d) => [d.miembroId, Number(d.descuento) || 0])))
      setNotas(r.notas ?? '')
      setDirty(false)
    } catch (e) {
      alertDialog({ title: 'No se pudo abrir la raya', message: errMsg(e) })
      onClose()
    }
  }, [rayaId, onClose])
  useEffect(() => { cargar() }, [cargar])

  if (!raya) {
    return <Modal open onClose={onClose} title="Raya" size="lg"><div className="pd-empty">Cargando…</div></Modal>
  }

  const borrador = raya.estado === 'BORRADOR'
  const editable = borrador && puedeCapturar(rol)
  const detalles = raya.detalles ?? []
  const jornales = detalles.filter(esJornal)
  const reparto = detalles.filter((d) => !esJornal(d))

  // Totales en vivo mientras se edita (misma regla que el backend).
  const filaJornal = (d) => {
    const bruto = (Number(d.importe) || 0) + (Number(d.descuento) || 0)
    const anticipo = Math.min(Math.max(Number(anticipos[d.miembroId]) || 0, 0), bruto)
    return { bruto, anticipo, neto: Math.round((bruto - anticipo) * 100) / 100 }
  }
  const totalJornales = jornales.reduce((a, d) => a + filaJornal(d).neto, 0)
  const totalDestajo = trabajos.reduce((a, t) => a + (Number(t.importeDestajo) || 0), 0)
  const total = totalJornales + totalDestajo

  const setTrabajo = (i, patch) => {
    setTrabajos((p) => p.map((t, j) => (j === i ? { ...t, ...patch } : t)))
    setDirty(true)
  }

  const guardar = async () => {
    const malos = trabajos.filter((t) => !String(t.descripcion ?? '').trim())
    if (malos.length) {
      alertDialog({ title: 'Falta descripción', message: 'Cada trabajo a destajo necesita una descripción.' })
      return false
    }
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/rayas/${raya.id}`, {
        method: 'PUT',
        body: {
          notas: notas.trim() || null,
          trabajos: trabajos.map((t) => ({
            presupuestoPartidaId: t.presupuestoPartidaId ?? null,
            unidadProyectoId: t.unidadProyectoId ?? null,
            descripcion: String(t.descripcion).trim(),
            cantidad: t.cantidad === '' || t.cantidad == null ? null : Number(t.cantidad),
            unidad: String(t.unidad ?? '').trim() || null,
            importeDestajo: Number(t.importeDestajo) || 0,
          })),
          descuentos: jornales.map((d) => ({ miembroId: d.miembroId, descuento: filaJornal(d).anticipo })),
        },
      })
      await cargar()
      onChanged()
      return true
    } catch (e) {
      alertDialog({ title: 'No se guardó la raya', message: errMsg(e) })
      return false
    } finally {
      setBusy(false)
    }
  }

  const autorizar = async () => {
    if (dirty && !(await guardar())) return
    const ok = await confirmDialog({
      title: 'Autorizar raya',
      message: `Se autoriza el pago de ${pesos(total)}. La asistencia de la semana queda cerrada y la raya pasa a Tesorería.`,
      okLabel: 'Autorizar',
    })
    if (!ok) return
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/rayas/${raya.id}/aprobar`, { method: 'POST', body: {} })
      await cargar()
      onChanged()
    } catch (e) {
      alertDialog({ title: 'No se autorizó', message: errMsg(e) })
    } finally {
      setBusy(false)
    }
  }

  const pagar = async () => {
    if (!pago?.fecha) return
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/rayas/${raya.id}/pagar`, {
        method: 'POST',
        body: { fecha: pago.fecha, referencia: pago.referencia?.trim() || null },
      })
      setPago(null)
      await cargar()
      onChanged()
    } catch (e) {
      alertDialog({ title: 'No se registró el pago', message: errMsg(e) })
    } finally {
      setBusy(false)
    }
  }

  const eliminar = async () => {
    const ok = await confirmDialog({
      title: 'Eliminar raya',
      message: 'Se borra el borrador. La asistencia capturada se conserva y puedes volver a generarla.',
      okLabel: 'Eliminar',
    })
    if (!ok) return
    try {
      await apiFetch(`/api/construccion/rayas/${raya.id}`, { method: 'DELETE' })
      onChanged()
      onClose()
    } catch (e) {
      alertDialog({ title: 'No se eliminó', message: errMsg(e) })
    }
  }

  const titulo = `${raya.cuadrilla?.nombre ?? 'Raya'} · ${semanaDe(raya)}`

  return (
    <Modal open onClose={onClose} title={titulo} size="lg">
      <div className="mo-raya">
        <div className="mo-raya-estado">
          <span className={`badge estado-${raya.estado.toLowerCase()}`}>{ESTADO_TXT[raya.estado]}</span>
          {raya.estado === 'PAGADA' && (
            <span className="muted small">
              Pagada {fechaCorta(iso(raya.pagadaAt))}
              {raya.referenciaPago ? ` · ref. ${raya.referenciaPago}` : ''}
              {raya.bankTransaction ? ' · conciliada con el banco' : ' · pendiente de conciliar en Bancos'}
            </span>
          )}
        </div>

        <h4>Jornales</h4>
        {jornales.length === 0 ? (
          <p className="muted small">Sin jornales. Se calculan desde la asistencia (pestaña Asistencia → Generar raya).</p>
        ) : (
          <div className="mo-scroll">
            <table className="rayas-table">
              <thead>
                <tr>
                  <th>Trabajador</th>
                  <th style={{ textAlign: 'right' }}>Días</th>
                  <th style={{ textAlign: 'right' }}>Horas</th>
                  <th style={{ textAlign: 'right' }}>Extra</th>
                  <th style={{ textAlign: 'right' }}>Bruto</th>
                  <th style={{ textAlign: 'right' }}>Anticipo</th>
                  <th style={{ textAlign: 'right' }}>A pagar</th>
                </tr>
              </thead>
              <tbody>
                {jornales.map((d) => {
                  const f = filaJornal(d)
                  return (
                    <tr key={d.id}>
                      <td>{d.miembro?.nombre}</td>
                      <td style={{ textAlign: 'right' }}>{num(d.diasTrabajados)}</td>
                      <td style={{ textAlign: 'right' }}>{num(d.horas)}</td>
                      <td style={{ textAlign: 'right' }}>{Number(d.horasExtra) ? num(d.horasExtra) : '—'}</td>
                      <td style={{ textAlign: 'right' }} className="mono">{pesos(f.bruto)}</td>
                      <td style={{ textAlign: 'right' }}>
                        {editable ? (
                          <input
                            className="mo-num"
                            type="number" inputMode="decimal" min="0" step="1"
                            value={anticipos[d.miembroId] || ''}
                            placeholder="0"
                            onChange={(e) => { setAnticipos((p) => ({ ...p, [d.miembroId]: e.target.value })); setDirty(true) }}
                          />
                        ) : (
                          <span className="mono">{f.anticipo ? `−${pesos(f.anticipo)}` : '—'}</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }} className="mono"><strong>{pesos(f.neto)}</strong></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <h4>Destajo</h4>
        {trabajos.length === 0 && !editable && <p className="muted small">Sin trabajos a destajo.</p>}
        {trabajos.length > 0 && (
          <div className="mo-trabajos">
            {trabajos.map((t, i) => (
              <div key={t.id ?? `n${i}`} className="mo-trabajo">
                {editable ? (
                  <>
                    <input className="input mo-t-desc" value={t.descripcion ?? ''} placeholder="Trabajo (p. ej. muro de block planta baja)"
                      onChange={(e) => setTrabajo(i, { descripcion: e.target.value })} />
                    <input className="input mo-t-cant" type="number" inputMode="decimal" value={t.cantidad} placeholder="Cant."
                      onChange={(e) => setTrabajo(i, { cantidad: e.target.value })} />
                    <input className="input mo-t-uni" value={t.unidad} placeholder="m²"
                      onChange={(e) => setTrabajo(i, { unidad: e.target.value })} />
                    <input className="input mo-t-imp" type="number" inputMode="decimal" min="0" value={t.importeDestajo ?? ''} placeholder="$"
                      onChange={(e) => setTrabajo(i, { importeDestajo: e.target.value })} />
                    <button className="mo-x" title="Quitar" onClick={() => { setTrabajos((p) => p.filter((_, j) => j !== i)); setDirty(true) }}>×</button>
                  </>
                ) : (
                  <>
                    <span className="mo-t-desc">
                      {t.descripcion}
                      {t.presupuestoPartida?.concepto && <span className="muted small"> · {t.presupuestoPartida.concepto.codigo}</span>}
                    </span>
                    <span className="muted small">{t.cantidad !== '' ? `${num(t.cantidad)} ${t.unidad}` : ''}</span>
                    <span className="mono">{pesos(t.importeDestajo)}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
        {editable && (
          <button className="mo-link small" onClick={() => { setTrabajos((p) => [...p, { descripcion: '', cantidad: '', unidad: '', importeDestajo: '' }]); setDirty(true) }}>
            + Trabajo a destajo
          </button>
        )}

        {reparto.length > 0 && (
          <p className="muted small">
            Reparto del destajo capturado antes: {reparto.map((d) => `${d.miembro?.nombre} ${pesos(d.importe)}`).join(' · ')}
          </p>
        )}

        {editable ? (
          <label className="mo-notas">
            <span className="label">Notas</span>
            <input className="input" value={notas} onChange={(e) => { setNotas(e.target.value); setDirty(true) }} placeholder="Opcional" />
          </label>
        ) : raya.notas ? (
          <p className="small">Notas: {raya.notas}</p>
        ) : null}

        <div className="mo-totales">
          <div><span className="muted small">Jornales</span><span className="mono">{pesos(totalJornales)}</span></div>
          <div><span className="muted small">Destajo</span><span className="mono">{pesos(totalDestajo)}</span></div>
          <div className="total"><span>Total a pagar</span><span className="mono">{pesos(total)}</span></div>
        </div>

        {pago && (
          <div className="mo-pago">
            <label>
              <span className="label">Fecha de pago</span>
              <input className="input" type="date" value={pago.fecha} onChange={(e) => setPago((p) => ({ ...p, fecha: e.target.value }))} />
            </label>
            <label>
              <span className="label">Referencia</span>
              <input className="input" value={pago.referencia} onChange={(e) => setPago((p) => ({ ...p, referencia: e.target.value }))} placeholder="Efectivo, SPEI, folio…" />
            </label>
            <p className="muted small">
              Sólo registra el pago. Si salió del banco, el cargo se concilia con esta raya desde Bancos.
            </p>
          </div>
        )}

        <div className="mo-actions">
          {borrador && puedeCapturar(rol) && (
            <button className="btn mo-danger" onClick={eliminar} disabled={busy}>Eliminar</button>
          )}
          <span style={{ flex: 1 }} />
          {editable && dirty && (
            <button className="btn" onClick={guardar} disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button>
          )}
          {borrador && puedeAutorizar(rol) && (
            <button className="btn btn-primary" onClick={autorizar} disabled={busy || total <= 0}>Autorizar</button>
          )}
          {raya.estado === 'APROBADA' && puedePagar(rol) && (
            pago ? (
              <>
                <button className="btn" onClick={() => setPago(null)} disabled={busy}>Cancelar</button>
                <button className="btn btn-primary" onClick={pagar} disabled={busy || !pago.fecha}>Registrar pago</button>
              </>
            ) : (
              <button className="btn btn-primary" onClick={() => setPago({ fecha: isoLocal(), referencia: '' })}>Pagar {pesos(total)}</button>
            )
          )}
        </div>
      </div>
    </Modal>
  )
}
