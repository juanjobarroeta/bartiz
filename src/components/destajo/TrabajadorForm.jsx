/**
 * Alta / edición de un trabajador de obra: cómo se le paga (por día o por
 * hora) y cuánto. `onSaved(trabajador)` recibe lo que devolvió el backend.
 */

import { useState } from 'react'
import Modal from '../Modal'
import { apiFetch } from '../../config/api'
import { errMsg } from '../../lib/destajo'

const ESPECIALIDADES = ['Albañil', 'Ayudante', 'Oficial', 'Fierrero', 'Carpintero', 'Plomero', 'Electricista', 'Pintor', 'Herrero', 'Yesero']

export default function TrabajadorForm({ open, onClose, companyId, trabajador, onSaved }) {
  const editando = !!trabajador?.id
  const [f, setF] = useState(() => ({
    nombre: trabajador?.nombre ?? '',
    telefono: trabajador?.telefono ?? '',
    especialidad: trabajador?.especialidad ?? '',
    tipoPago: trabajador?.tipoPago ?? 'DIA',
    tarifa: trabajador?.tarifa != null ? String(trabajador.tarifa) : '',
    horasJornada: trabajador?.horasJornada != null ? String(trabajador.horasJornada) : '8',
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const tarifa = Number(f.tarifa)
    const horasJornada = Number(f.horasJornada) || 8
    if (!f.nombre.trim()) return setError('Escribe el nombre')
    if (!(tarifa > 0)) return setError('La tarifa debe ser mayor a 0')
    setSaving(true)
    setError('')
    const body = {
      nombre: f.nombre.trim(),
      telefono: f.telefono.trim() || undefined,
      especialidad: f.especialidad.trim() || undefined,
      tipoPago: f.tipoPago,
      tarifa,
      horasJornada,
    }
    try {
      const saved = editando
        ? await apiFetch(`/api/construccion/trabajadores/${trabajador.id}`, { method: 'PUT', body })
        : await apiFetch('/api/construccion/trabajadores', { method: 'POST', body: { ...body, companyId } })
      onSaved?.(saved)
      onClose?.()
    } catch (err) {
      setError(errMsg(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editando ? 'Editar trabajador' : 'Nuevo trabajador'} size="sm">
      <form className="mo-form" onSubmit={submit}>
        <label>
          <span className="label">Nombre</span>
          <input className="input" value={f.nombre} onChange={set('nombre')} autoFocus placeholder="Nombre completo" />
        </label>
        <div className="mo-form-row">
          <label>
            <span className="label">Especialidad</span>
            <input className="input" list="mo-especialidades" value={f.especialidad} onChange={set('especialidad')} placeholder="Albañil, ayudante…" />
            <datalist id="mo-especialidades">
              {ESPECIALIDADES.map((e) => <option key={e} value={e} />)}
            </datalist>
          </label>
          <label>
            <span className="label">Teléfono</span>
            <input className="input" type="tel" value={f.telefono} onChange={set('telefono')} placeholder="Opcional" />
          </label>
        </div>
        <div className="mo-form-row">
          <label>
            <span className="label">Se le paga por</span>
            <div className="mo-seg">
              {[['DIA', 'Día'], ['HORA', 'Hora']].map(([v, l]) => (
                <button type="button" key={v} className={f.tipoPago === v ? 'active' : ''} onClick={() => setF((p) => ({ ...p, tipoPago: v }))}>
                  {l}
                </button>
              ))}
            </div>
          </label>
          <label>
            <span className="label">{f.tipoPago === 'HORA' ? 'Tarifa por hora' : 'Jornal (por día)'}</span>
            <input className="input" type="number" inputMode="decimal" min="0" step="0.01" value={f.tarifa} onChange={set('tarifa')} placeholder="$" />
          </label>
        </div>
        <label>
          <span className="label">Horas de una jornada</span>
          <input className="input" type="number" inputMode="decimal" min="1" max="24" step="0.5" value={f.horasJornada} onChange={set('horasJornada')} />
          <span className="muted small">
            {f.tipoPago === 'DIA'
              ? 'Medio día = la mitad del jornal. Las horas extra se pagan al doble.'
              : 'Sirve para marcar «vino» de un toque. Las horas extra se pagan al doble.'}
          </span>
        </label>
        {error && <div className="mo-error">{error}</div>}
        <div className="mo-actions">
          <button type="button" className="btn" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : editando ? 'Guardar' : 'Dar de alta'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
