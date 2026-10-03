/**
 * Cuadrillas de una obra y sus miembros. Cada miembro apunta a un
 * trabajador del registro (de ahí sale su tarifa); los miembros que venían
 * de antes sin trabajador se vinculan aquí para poder pasarles lista.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../config/api'
import { alertDialog, confirmDialog } from '../Dialog'
import Modal from '../Modal'
import TrabajadorForm from './TrabajadorForm'
import { errMsg, tarifaTexto } from '../../lib/destajo'

const NUEVO = '__nuevo__'

export default function CuadrillasTab({ companyId, proyectos, proyectoId, setProyectoId, editable }) {
  const [cuadrillas, setCuadrillas] = useState([])
  const [trabajadores, setTrabajadores] = useState([])
  const [loading, setLoading] = useState(true)
  const [nueva, setNueva] = useState(false)
  const [altaPara, setAltaPara] = useState(null) // cuadrilla a la que se suma el trabajador nuevo

  const reload = useCallback(async () => {
    if (!proyectoId) { setCuadrillas([]); setLoading(false); return }
    setLoading(true)
    try {
      const [c, t] = await Promise.all([
        apiFetch(`/api/construccion/cuadrillas?proyectoId=${encodeURIComponent(proyectoId)}`),
        apiFetch(`/api/construccion/trabajadores?companyId=${encodeURIComponent(companyId)}`),
      ])
      setCuadrillas(Array.isArray(c) ? c : [])
      setTrabajadores(Array.isArray(t) ? t : [])
    } catch (e) {
      alertDialog({ title: 'No se pudieron cargar las cuadrillas', message: errMsg(e) })
    } finally {
      setLoading(false)
    }
  }, [proyectoId, companyId])
  useEffect(() => { reload() }, [reload])

  const agregar = async (cuadrillaId, trabajadorId) => {
    try {
      await apiFetch(`/api/construccion/cuadrillas/${cuadrillaId}/miembros`, { method: 'POST', body: { trabajadorId } })
      reload()
    } catch (e) {
      alertDialog({ title: 'No se pudo agregar', message: errMsg(e) })
    }
  }

  const vincular = async (cuadrillaId, miembroId, trabajadorId) => {
    try {
      await apiFetch(`/api/construccion/cuadrillas/${cuadrillaId}/miembros/${miembroId}`, { method: 'PUT', body: { trabajadorId } })
      reload()
    } catch (e) {
      alertDialog({ title: 'No se pudo vincular', message: errMsg(e) })
    }
  }

  const quitar = async (c, m) => {
    const ok = await confirmDialog({
      title: 'Quitar de la cuadrilla',
      message: `${m.nombre} sale de ${c.nombre}. La asistencia y rayas ya capturadas se conservan.`,
      okLabel: 'Quitar',
    })
    if (!ok) return
    try {
      await apiFetch(`/api/construccion/cuadrillas/${c.id}/miembros/${m.id}`, { method: 'DELETE' })
      reload()
    } catch (e) {
      alertDialog({ title: 'No se pudo quitar', message: errMsg(e) })
    }
  }

  const archivar = async (c) => {
    const ok = await confirmDialog({
      title: 'Archivar cuadrilla',
      message: `${c.nombre} deja de aparecer para pasar lista. Sus rayas se conservan.`,
      okLabel: 'Archivar',
    })
    if (!ok) return
    try {
      await apiFetch(`/api/construccion/cuadrillas/${c.id}`, { method: 'DELETE' })
      reload()
    } catch (e) {
      alertDialog({ title: 'No se pudo archivar', message: errMsg(e) })
    }
  }

  return (
    <div className="mo-section">
      <div className="mo-bar">
        <select className="input mo-select" value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
          {proyectos.length === 0 && <option value="">Sin obras</option>}
          {proyectos.map((p) => (
            <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>
          ))}
        </select>
        {editable && proyectoId && (
          <button className="btn btn-primary" onClick={() => setNueva(true)}>+ Cuadrilla</button>
        )}
      </div>

      {loading ? (
        <div className="pd-empty">Cargando…</div>
      ) : cuadrillas.length === 0 ? (
        <div className="pd-empty">
          Esta obra no tiene cuadrillas. Crea una (p. ej. «Albañilería – Juan») y súmale a sus trabajadores.
        </div>
      ) : (
        <div className="cuadrilla-grid">
          {cuadrillas.map((c) => (
            <CuadrillaCard
              key={c.id}
              c={c}
              trabajadores={trabajadores}
              editable={editable}
              onAgregar={(tid) => (tid === NUEVO ? setAltaPara(c.id) : agregar(c.id, tid))}
              onVincular={(mid, tid) => vincular(c.id, mid, tid)}
              onQuitar={(m) => quitar(c, m)}
              onArchivar={() => archivar(c)}
            />
          ))}
        </div>
      )}

      {nueva && (
        <NuevaCuadrilla
          proyectoId={proyectoId}
          onClose={() => setNueva(false)}
          onSaved={() => { setNueva(false); reload() }}
        />
      )}
      {altaPara && (
        <TrabajadorForm
          open
          companyId={companyId}
          onClose={() => setAltaPara(null)}
          onSaved={(t) => { if (t?.id) agregar(altaPara, t.id) }}
        />
      )}
    </div>
  )
}

function CuadrillaCard({ c, trabajadores, editable, onAgregar, onVincular, onQuitar, onArchivar }) {
  const [sel, setSel] = useState('')
  const miembros = c.miembros ?? []
  const enCuadrilla = useMemo(() => new Set(miembros.map((m) => m.trabajador?.id).filter(Boolean)), [miembros])
  const disponibles = trabajadores.filter((t) => !enCuadrilla.has(t.id))

  return (
    <div className="cuadrilla-card">
      <div className="cuadrilla-head">
        <strong>{c.nombre}</strong>
        <span className="mono small muted">{c.especialidad}</span>
      </div>
      {c.jefeNombre && <div className="small">Jefe: {c.jefeNombre}</div>}
      <div className="cuadrilla-stats small muted">
        {miembros.length} {miembros.length === 1 ? 'miembro' : 'miembros'} · {c._count?.rayas ?? 0} rayas
      </div>

      {miembros.length > 0 && (
        <ul className="mo-miembros">
          {miembros.map((m) => (
            <li key={m.id}>
              <div className="mo-miembro-main">
                <span>{m.trabajador?.nombre ?? m.nombre}</span>
                {m.trabajador ? (
                  <span className="muted small mono">{tarifaTexto(m.trabajador)}</span>
                ) : editable ? (
                  <select
                    className="mo-vincular"
                    value=""
                    onChange={(e) => e.target.value && onVincular(m.id, e.target.value)}
                  >
                    <option value="">Sin tarifa — vincular a…</option>
                    {disponibles.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                ) : (
                  <span className="muted small">sin tarifa</span>
                )}
              </div>
              {editable && (
                <button className="mo-x" title="Quitar de la cuadrilla" onClick={() => onQuitar(m)}>×</button>
              )}
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <div className="mo-add">
          <select className="input" value={sel} onChange={(e) => setSel(e.target.value)}>
            <option value="">Agregar trabajador…</option>
            {disponibles.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}{t.especialidad ? ` · ${t.especialidad}` : ''}</option>
            ))}
            <option value={NUEVO}>+ Dar de alta uno nuevo…</option>
          </select>
          <button className="btn small" disabled={!sel} onClick={() => { onAgregar(sel); setSel('') }}>Agregar</button>
        </div>
      )}
      {editable && (
        <button className="mo-link small" onClick={onArchivar}>Archivar cuadrilla</button>
      )}
    </div>
  )
}

function NuevaCuadrilla({ proyectoId, onClose, onSaved }) {
  const [f, setF] = useState({ nombre: '', especialidad: '', jefeNombre: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!f.nombre.trim()) return setError('Ponle nombre a la cuadrilla')
    setSaving(true)
    setError('')
    try {
      await apiFetch('/api/construccion/cuadrillas', {
        method: 'POST',
        body: {
          proyectoId,
          nombre: f.nombre.trim(),
          especialidad: f.especialidad.trim() || 'GENERAL',
          jefeNombre: f.jefeNombre.trim() || null,
        },
      })
      onSaved()
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Nueva cuadrilla" size="sm">
      <form className="mo-form" onSubmit={submit}>
        <label>
          <span className="label">Nombre</span>
          <input className="input" value={f.nombre} onChange={set('nombre')} autoFocus placeholder="Albañilería – Juan" />
        </label>
        <div className="mo-form-row">
          <label>
            <span className="label">Especialidad</span>
            <input className="input" value={f.especialidad} onChange={set('especialidad')} placeholder="Albañilería" />
          </label>
          <label>
            <span className="label">Jefe / cabo</span>
            <input className="input" value={f.jefeNombre} onChange={set('jefeNombre')} placeholder="Opcional" />
          </label>
        </div>
        {error && <div className="mo-error">{error}</div>}
        <div className="mo-actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creando…' : 'Crear'}</button>
        </div>
      </form>
    </Modal>
  )
}
