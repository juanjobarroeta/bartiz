/**
 * Registro de trabajadores de obra de la empresa: tarifa por día u hora.
 * Es el catálogo del que salen los miembros de cada cuadrilla.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../../config/api'
import { confirmDialog, alertDialog } from '../Dialog'
import TrabajadorForm from './TrabajadorForm'
import { errMsg, tarifaTexto } from '../../lib/destajo'

export default function TrabajadoresTab({ companyId, editable }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [verInactivos, setVerInactivos] = useState(false)
  const [q, setQ] = useState('')
  const [form, setForm] = useState(null) // null | {} | trabajador

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const d = await apiFetch(`/api/construccion/trabajadores?companyId=${encodeURIComponent(companyId)}&todos=1`)
      setRows(Array.isArray(d) ? d : [])
    } catch (e) {
      alertDialog({ title: 'No se pudieron cargar los trabajadores', message: errMsg(e) })
    } finally {
      setLoading(false)
    }
  }, [companyId])
  useEffect(() => { reload() }, [reload])

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase()
    return rows
      .filter((r) => verInactivos || r.isActive)
      .filter((r) => !t || r.nombre.toLowerCase().includes(t) || (r.especialidad ?? '').toLowerCase().includes(t))
  }, [rows, verInactivos, q])

  const toggleActivo = async (r) => {
    if (r.isActive) {
      const ok = await confirmDialog({
        title: 'Dar de baja',
        message: `${r.nombre} ya no aparecerá para capturar asistencia. Su historial y rayas se conservan.`,
        okLabel: 'Dar de baja',
      })
      if (!ok) return
    }
    try {
      if (r.isActive) await apiFetch(`/api/construccion/trabajadores/${r.id}`, { method: 'DELETE' })
      else await apiFetch(`/api/construccion/trabajadores/${r.id}`, { method: 'PUT', body: { isActive: true } })
      reload()
    } catch (e) {
      alertDialog({ title: 'No se pudo actualizar', message: errMsg(e) })
    }
  }

  const inactivos = rows.filter((r) => !r.isActive).length

  return (
    <div className="mo-section">
      <div className="mo-bar">
        <input className="input mo-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar trabajador…" />
        {inactivos > 0 && (
          <label className="mo-check small">
            <input type="checkbox" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} />
            Ver dados de baja ({inactivos})
          </label>
        )}
        {editable && (
          <button className="btn btn-primary" onClick={() => setForm({})}>+ Trabajador</button>
        )}
      </div>

      {loading ? (
        <div className="pd-empty">Cargando…</div>
      ) : visibles.length === 0 ? (
        <div className="pd-empty">
          {rows.length === 0
            ? 'Aún no hay trabajadores. Da de alta a cada persona con su jornal (por día) o su tarifa por hora; luego súmalos a una cuadrilla para pasar lista.'
            : 'Sin resultados.'}
        </div>
      ) : (
        <div className="mo-list">
          {visibles.map((r) => (
            <div key={r.id} className={`mo-row${r.isActive ? '' : ' inactivo'}`}>
              <div className="mo-row-main">
                <strong>{r.nombre}</strong>
                <span className="muted small">
                  {[r.especialidad, r.telefono].filter(Boolean).join(' · ') || '—'}
                </span>
              </div>
              <div className="mo-row-side">
                <span className="mono">{tarifaTexto(r)}</span>
                <span className="muted small">jornada {Number(r.horasJornada)} h</span>
              </div>
              {editable && (
                <div className="mo-row-actions">
                  {r.isActive && <button className="btn small" onClick={() => setForm(r)}>Editar</button>}
                  <button className="btn small" onClick={() => toggleActivo(r)}>
                    {r.isActive ? 'Baja' : 'Reactivar'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {form && (
        <TrabajadorForm
          open
          companyId={companyId}
          trabajador={form.id ? form : null}
          onClose={() => setForm(null)}
          onSaved={reload}
        />
      )}
    </div>
  )
}
