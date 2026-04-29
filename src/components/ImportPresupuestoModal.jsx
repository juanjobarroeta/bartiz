/**
 * ImportPresupuestoModal — Excel scanner for Gerardo's master presupuesto.
 *
 * Flow:
 *   1. Drop / pick a .xls or .xlsx file
 *   2. POST /scan → returns parsed tree + warnings (no DB write)
 *   3. Render preview: total, capítulos, depth, warnings
 *   4. On confirm → POST /import with the same parsed payload
 *   5. On success, calls onImported() so the page can reload
 *
 * The scan response is cached in component state; if the user edits the
 * file before importing, they have to scan again. Server re-validates the
 * payload shape on /import so a tampered client can't write garbage.
 */

import { useRef, useState } from 'react'
import { apiFetch } from '../config/api'
import Modal from './Modal'
import { alertDialog, confirmDialog } from './Dialog'
import './ImportPresupuestoModal.css'

const fmtMoney = (n) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        maximumFractionDigits: 2,
      }).format(Number(n) || 0)

export default function ImportPresupuestoModal({
  open,
  onClose,
  proyectoId,
  onImported,
}) {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null) // { name, blob }
  const [scan, setScan] = useState(null) // PresupuestoParseResult + extras
  const [busy, setBusy] = useState(false)
  const [stage, setStage] = useState('pick') // pick | preview | importing | done
  const [importResult, setImportResult] = useState(null)

  // Decolsa workflow extras — captured at import time, persisted on Proyecto.
  const [viviendasObjetivo, setViviendasObjetivo] = useState('')
  const [aplicaIva, setAplicaIva] = useState(false) // vivienda no causa IVA
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFinPlan, setFechaFinPlan] = useState('')

  const reset = () => {
    setFile(null)
    setScan(null)
    setStage('pick')
    setImportResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const close = () => {
    reset()
    onClose?.()
  }

  const onPick = (f) => {
    if (!f) return
    if (
      !/\.(xls|xlsx)$/i.test(f.name) &&
      f.type !== 'application/vnd.ms-excel' &&
      f.type !== 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) {
      alertDialog({ message: 'Sólo se aceptan archivos .xls o .xlsx.' })
      return
    }
    setFile({ name: f.name, blob: f })
  }

  const doScan = async () => {
    if (!file) return
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('file', file.blob)
      const result = await apiFetch(
        `/api/construccion/proyectos/${proyectoId}/presupuesto/scan`,
        { method: 'POST', body: fd }
      )
      setScan(result)
      setStage('preview')
    } catch (err) {
      alertDialog({
        message: err.message || 'No se pudo leer el archivo. Verifica que sea el template correcto.',
      })
    } finally {
      setBusy(false)
    }
  }

  const doImport = async () => {
    if (!scan) return
    if (scan.alreadyHasPresupuesto) {
      alertDialog({
        message:
          'Este proyecto ya tiene un presupuesto cargado. Archívalo antes de importar otro.',
      })
      return
    }
    const ok = await confirmDialog({
      title: 'Confirmar importación',
      message: `Se crearán ${scan.totals.branchCount} capítulos y ${scan.totals.leafCount} conceptos por un total de ${fmtMoney(scan.totals.sumLeafImporte)}. ¿Continuar?`,
      okLabel: 'Sí, importar',
    })
    if (!ok) return

    setStage('importing')
    setBusy(true)
    try {
      // Trim what we send back: the server doesn't need warnings (already
      // computed) or rowIndex past the validation step, but stripping is
      // optional. We send the whole thing for parity with the scan response
      // shape — it's ~50KB.
      // Compute weekCount from fechas if both provided. Round up to whole weeks.
      let weekCount = null
      if (fechaInicio && fechaFinPlan) {
        const ms = new Date(fechaFinPlan).getTime() - new Date(fechaInicio).getTime()
        if (ms > 0) weekCount = Math.ceil(ms / (1000 * 60 * 60 * 24 * 7))
      }
      const payload = {
        parsed: {
          caratula: scan.caratula,
          branches: scan.branches,
          leaves: scan.leaves,
          insumos: scan.insumos,
          warnings: scan.warnings,
          totals: scan.totals,
        },
        filename: scan.filename ?? file?.name ?? null,
        viviendasObjetivo: viviendasObjetivo ? parseInt(viviendasObjetivo, 10) : null,
        aplicaIva,
        weekCount,
        fechaInicio: fechaInicio ? new Date(fechaInicio).toISOString() : null,
        fechaFinPlan: fechaFinPlan ? new Date(fechaFinPlan).toISOString() : null,
        confirmed: true,
      }
      const result = await apiFetch(
        `/api/construccion/proyectos/${proyectoId}/presupuesto/import`,
        { method: 'POST', body: payload }
      )
      setImportResult(result)
      setStage('done')
    } catch (err) {
      alertDialog({ message: err.message || 'Error al importar' })
      setStage('preview')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title="Importar presupuesto desde Excel" size="lg">
      {stage === 'pick' && (
        <div className="imp-pick">
          <p className="muted small" style={{ marginTop: 0 }}>
            Sube el archivo Excel del presupuesto (template Gerardo: hoja{' '}
            <strong>PRESUPUESTO</strong> con capítulos numerados{' '}
            <span className="mono">1.1.3.5.1</span>). El sistema detecta el árbol,
            lee los insumos y crea el presupuesto maestro del proyecto.
          </p>
          <label
            className="imp-drop"
            onDragOver={(e) => {
              e.preventDefault()
              e.currentTarget.classList.add('dragover')
            }}
            onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
            onDrop={(e) => {
              e.preventDefault()
              e.currentTarget.classList.remove('dragover')
              onPick(e.dataTransfer.files?.[0])
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(e) => onPick(e.target.files?.[0])}
              hidden
            />
            {file ? (
              <div className="imp-file">
                <strong>📄 {file.name}</strong>
                <button
                  type="button"
                  className="link small"
                  onClick={(e) => { e.preventDefault(); reset() }}
                >
                  cambiar
                </button>
              </div>
            ) : (
              <span className="muted">
                Arrastra el archivo aquí o haz clic para seleccionarlo.
              </span>
            )}
          </label>
          <div className="modal-actions">
            <button onClick={close}>Cancelar</button>
            <button className="primary" onClick={doScan} disabled={!file || busy}>
              {busy ? 'Leyendo…' : 'Analizar archivo'}
            </button>
          </div>
        </div>
      )}

      {stage === 'preview' && scan && (
        <div className="imp-preview">
          {scan.alreadyHasPresupuesto && (
            <div className="imp-banner danger">
              ⚠ Este proyecto ya tiene un presupuesto cargado. Archívalo primero
              antes de importar otro.
            </div>
          )}

          <h3 style={{ marginTop: 0 }}>{scan.caratula?.titulo ?? file?.name}</h3>

          <div className="imp-stats">
            <div>
              <span className="muted small">Capítulos</span>
              <strong>{scan.totals.branchCount}</strong>
            </div>
            <div>
              <span className="muted small">Conceptos (leaves)</span>
              <strong>{scan.totals.leafCount}</strong>
            </div>
            <div>
              <span className="muted small">Profundidad máx.</span>
              <strong>{scan.totals.maxDepth}</strong>
            </div>
            <div>
              <span className="muted small">Insumos</span>
              <strong>{scan.insumos?.length ?? 0}</strong>
            </div>
            <div className="imp-stats-total">
              <span className="muted small">Costo directo (Σ leaves)</span>
              <strong>{fmtMoney(scan.totals.sumLeafImporte)}</strong>
            </div>
          </div>

          {scan.caratula?.subtotal != null && (
            <div className="imp-banner info small">
              CARÁTULA dice: subtotal {fmtMoney(scan.caratula.subtotal)}
              {scan.caratula.utilidad != null && <> · utilidad {fmtMoney(scan.caratula.utilidad)}</>}
              {scan.caratula.total != null && <> · total {fmtMoney(scan.caratula.total)}</>}
            </div>
          )}

          {/* Datos del proyecto — alimentan el flujo de estimaciones */}
          <fieldset className="imp-fieldset">
            <legend>Configuración del proyecto</legend>
            <p className="muted small" style={{ margin: '0 0 0.6rem' }}>
              Estos campos se usan para calcular avance por vivienda y la curva
              esperada del cliente. Editables después en el proyecto.
            </p>
            <div className="imp-grid">
              <label>
                <span>Viviendas totales</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={viviendasObjetivo}
                  onChange={(e) => setViviendasObjetivo(e.target.value)}
                  placeholder="48 (2 torres × 24)"
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


          {/* Capítulos preview */}
          <details open className="imp-details">
            <summary>Capítulos detectados ({scan.branches.filter(b => b.nivel === 1).length})</summary>
            <table className="imp-table">
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Código</th>
                  <th>Descripción</th>
                  <th style={{ textAlign: 'right' }}>Importe (rollup)</th>
                </tr>
              </thead>
              <tbody>
                {scan.branches.filter(b => b.nivel === 1).map((b) => (
                  <tr key={b.codigo}>
                    <td className="mono">{b.codigo}</td>
                    <td>{b.descripcion}</td>
                    <td style={{ textAlign: 'right' }}>{fmtMoney(b.importeReportado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>

          {/* Warnings */}
          {scan.warnings?.length > 0 && (
            <details className="imp-details warnings">
              <summary>
                ⚠ {scan.warnings.length} advertencia(s) — el archivo es importable
                pero revisa estos puntos
              </summary>
              <ul className="imp-warnings">
                {scan.warnings.slice(0, 50).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
                {scan.warnings.length > 50 && (
                  <li className="muted">…y {scan.warnings.length - 50} más</li>
                )}
              </ul>
            </details>
          )}

          <div className="modal-actions">
            <button onClick={() => { reset(); setStage('pick') }}>Cambiar archivo</button>
            <button
              className="primary"
              onClick={doImport}
              disabled={busy || scan.alreadyHasPresupuesto}
            >
              Confirmar e importar
            </button>
          </div>
        </div>
      )}

      {stage === 'importing' && (
        <div className="imp-importing">
          <p>Importando presupuesto… esto puede tardar 20–40 segundos para presupuestos grandes.</p>
        </div>
      )}

      {stage === 'done' && importResult && (
        <div className="imp-done">
          <div className="imp-banner success">
            ✓ Presupuesto importado
          </div>
          <ul className="imp-result">
            <li><strong>{importResult.branchCount}</strong> capítulos creados</li>
            <li><strong>{importResult.leafCount}</strong> conceptos (leaves)</li>
            <li><strong>{importResult.conceptosCreated}</strong> conceptos nuevos en catálogo</li>
            <li><strong>{importResult.insumosCreated}</strong> insumos nuevos en catálogo</li>
            <li>Costo directo: <strong>{fmtMoney(importResult.total)}</strong></li>
          </ul>
          <div className="modal-actions">
            <button
              className="primary"
              onClick={() => {
                onImported?.()
                close()
              }}
            >
              Listo
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
