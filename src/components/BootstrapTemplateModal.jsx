/**
 * BootstrapTemplateModal — used when a proyecto has its master Presupuesto
 * already imported but no EstimacionTemplate yet (legacy projects from
 * before the Run 2A bootstrap shipped, OR projects where Gerardo wants to
 * reset the template).
 *
 * Captures viviendasObjetivo + aplicaIva + fechaInicio/Fin (same fields
 * the import wizard collects) and POSTs to /estimacion-template with
 * action="bootstrap". Server wipes the existing template (cascading to
 * partidas + curvas) and rebuilds using the 1-15-rolled / ≥16-open rule.
 */

import { useEffect, useState } from 'react'
import { apiFetch } from '../config/api'
import Modal from './Modal'
import { alertDialog, confirmDialog } from './Dialog'
import './ImportPresupuestoModal.css'

export default function BootstrapTemplateModal({
  open,
  onClose,
  proyectoId,
  proyecto,
  onDone,
}) {
  const [viviendasObjetivo, setViviendasObjetivo] = useState('')
  const [aplicaIva, setAplicaIva] = useState(false)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFinPlan, setFechaFinPlan] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setViviendasObjetivo(proyecto?.viviendasObjetivo ?? '')
    setAplicaIva(proyecto?.aplicaIva ?? false)
    setFechaInicio(proyecto?.fechaInicio ? proyecto.fechaInicio.slice(0, 10) : '')
    setFechaFinPlan(proyecto?.fechaFinPlan ? proyecto.fechaFinPlan.slice(0, 10) : '')
  }, [open, proyecto])

  const submit = async () => {
    if (!viviendasObjetivo || parseInt(viviendasObjetivo, 10) <= 0) {
      alertDialog({ message: 'Ingresa el número total de viviendas (debe ser > 0).' })
      return
    }
    const ok = await confirmDialog({
      title: 'Crear plantilla de estimaciones',
      message:
        'Esto creará la plantilla con la regla por defecto: capítulos 1–15 rolled (1 fila por capítulo), capítulos ≥16 abiertos a sub-capítulo. Si ya existía una plantilla, se reemplaza. ¿Continuar?',
      okLabel: 'Sí, crear',
    })
    if (!ok) return

    let weekCount = null
    if (fechaInicio && fechaFinPlan) {
      const ms = new Date(fechaFinPlan).getTime() - new Date(fechaInicio).getTime()
      if (ms > 0) weekCount = Math.ceil(ms / (1000 * 60 * 60 * 24 * 7))
    }

    setBusy(true)
    try {
      await apiFetch(`/api/construccion/proyectos/${proyectoId}/estimacion-template`, {
        method: 'POST',
        body: {
          action: 'bootstrap',
          viviendasObjetivo: parseInt(viviendasObjetivo, 10),
          aplicaIva,
          weekCount,
          fechaInicio: fechaInicio ? new Date(fechaInicio).toISOString() : null,
          fechaFinPlan: fechaFinPlan ? new Date(fechaFinPlan).toISOString() : null,
        },
      })
      onDone?.()
      onClose?.()
    } catch (err) {
      alertDialog({ message: err.message || 'Error al crear plantilla' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Configurar estimaciones del proyecto" size="md">
      <p className="muted small" style={{ marginTop: 0 }}>
        Para empezar a registrar estimaciones por avance de viviendas
        necesitamos algunos datos del proyecto. Estos campos quedan en el
        proyecto y son editables después.
      </p>
      <fieldset className="imp-fieldset">
        <legend>Configuración</legend>
        <div className="imp-grid">
          <label>
            <span>Viviendas totales</span>
            <input
              type="number"
              min="1"
              step="1"
              value={viviendasObjetivo}
              onChange={(e) => setViviendasObjetivo(e.target.value)}
              placeholder="48"
            />
          </label>
          <label className="imp-check">
            <input
              type="checkbox"
              checked={aplicaIva}
              onChange={(e) => setAplicaIva(e.target.checked)}
            />
            <span>Aplica IVA (vivienda no causa IVA)</span>
          </label>
          <label>
            <span>Fecha de inicio de obra</span>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </label>
          <label>
            <span>Fecha planeada de término</span>
            <input
              type="date"
              value={fechaFinPlan}
              onChange={(e) => setFechaFinPlan(e.target.value)}
            />
          </label>
        </div>
      </fieldset>
      <div className="modal-actions">
        <button onClick={onClose}>Cancelar</button>
        <button className="primary" onClick={submit} disabled={busy}>
          {busy ? 'Creando…' : 'Crear plantilla'}
        </button>
      </div>
    </Modal>
  )
}
