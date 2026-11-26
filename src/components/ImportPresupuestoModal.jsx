import { useMemo, useState } from 'react'
import { apiFetch } from '../config/api'
import { componerPresupuestos } from '../lib/componerPresupuestos'
import Modal from './Modal'
import { confirmDialog } from './Dialog'
import './ImportPresupuestoModal.css'

const moneda = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
const fmtMoney = (n) => n == null ? '—' : moneda.format(n)
const esCantidad = (valor) =>
  String(valor).trim() !== '' && Number.isSafeInteger(Number(valor)) && Number(valor) >= 0
const formatos = [
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/pdf',
]

function ResumenPresupuesto({ scan }) {
  return (
    <>
      <div className="imp-stats">
        <div>
          <span className="muted small">Capítulos</span>
          <strong>{scan.totals.branchCount}</strong>
        </div>
        <div>
          <span className="muted small">Conceptos</span>
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
          <span className="muted small">Costo directo del proyecto</span>
          <strong>{fmtMoney(scan.totals.sumLeafImporte)}</strong>
        </div>
      </div>

      {scan.caratula?.subtotal != null && (
        <div className="imp-banner info small">
          Subtotal de carátula {fmtMoney(scan.caratula.subtotal)}
          {scan.caratula.utilidad != null && <> · utilidad {fmtMoney(scan.caratula.utilidad)}</>}
          {scan.caratula.total != null && <> · total {fmtMoney(scan.caratula.total)}</>}
        </div>
      )}
      {/* Capítulos preview */}
      <details open className="imp-details">
        <summary>Capítulos detectados ({scan.branches.filter(b => b.nivel === 1).length})</summary>
        <table className="imp-table">
          <thead>
            <tr>
              <th style={{ width: 60 }}>Código</th>
              <th>Descripción</th>
              <th style={{ textAlign: 'right' }}>Importe</th>
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
            ⚠ {scan.warnings.length} advertencia(s) del presupuesto
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
    </>
  )
}

export default function ImportPresupuestoModal({ open, ...props }) {
  return open ? <Importador {...props} /> : null
}

function Importador({ onClose, proyectoId, onImported, scanPath, onConfirmImport }) {
  const [archivos, setArchivos] = useState([])
  const [stage, setStage] = useState('pick')
  const [busy, setBusy] = useState(false)
  const [leyendo, setLeyendo] = useState('')
  const [error, setError] = useState('')
  const [importResult, setImportResult] = useState(null)
  const [viviendasEditadas, setViviendasEditadas] = useState(null)
  const [aplicaIva, setAplicaIva] = useState(false)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFinPlan, setFechaFinPlan] = useState('')

  const modelos = useMemo(() => archivos
    .filter(a => esCantidad(a.cantidad) && Number(a.cantidad) > 0)
    .map(a => ({ nombre: a.blob.name, scan: a.scan, cantidad: Number(a.cantidad) })), [archivos])

  const { scan, problema } = useMemo(() => {
    if (stage !== 'preview') return {}
    if (archivos.some(a => !esCantidad(a.cantidad))) {
      return { problema: 'Usa un número entero de cero en adelante para cada archivo.' }
    }
    if (!modelos.length) return { problema: 'Incluye al menos una unidad en el proyecto.' }
    try {
      return { scan: componerPresupuestos(modelos) }
    } catch (err) {
      return { problema: err.message }
    }
  }, [stage, archivos, modelos])

  const copias = modelos.reduce((total, modelo) => total + modelo.cantidad, 0)
  const viviendas = viviendasEditadas ?? (copias > 1 ? String(copias) : '')
  const configInvalida = viviendas !== '' && (!esCantidad(viviendas) || Number(viviendas) <= 0)
  const yaImportado = archivos.some(a => a.scan?.alreadyHasPresupuesto)
  const close = () => {
    if (busy) return
    if (importResult) onImported?.(importResult)
    onClose?.()
  }

  const agregar = (lista) => {
    if (busy) return
    const nuevos = Array.from(lista)
    const invalido = nuevos.find(f => !/\.(xls|xlsx|pdf)$/i.test(f.name) && !formatos.includes(f.type))
    if (invalido) {
      setError(`Elige un archivo .xls, .xlsx o .pdf. No se pudo agregar ${invalido.name}.`)
      return
    }
    setError('')
    setArchivos(actuales => {
      const resultado = [...actuales]
      for (const blob of nuevos) {
        const id = JSON.stringify([blob.name, blob.size, blob.lastModified])
        if (!resultado.some(a => a.id === id)) resultado.push({ id, blob, cantidad: '1', scan: null })
      }
      return resultado
    })
  }

  const actualizar = (id, cambios) => {
    setArchivos(actuales => actuales.map(a => a.id === id ? { ...a, ...cambios } : a))
  }

  const doScan = async () => {
    if (!archivos.length || busy) return
    setBusy(true)
    setError('')
    let nombre
    try {
      for (const archivo of archivos) {
        if (archivo.scan) continue
        nombre = archivo.blob.name
        setLeyendo(nombre)
        const fd = new FormData()
        fd.append('file', archivo.blob)
        const result = await apiFetch(scanPath ?? `/api/construccion/proyectos/${proyectoId}/presupuesto/scan`, {
          method: 'POST', body: fd,
        })
        actualizar(archivo.id, { scan: result })
      }
      setStage('preview')
    } catch (err) {
      setError(`No se pudo leer ${nombre}. ${err.message}`)
    } finally {
      setLeyendo('')
      setBusy(false)
    }
  }

  const doImport = async () => {
    if (!scan || busy || yaImportado || configInvalida) return
    setError('')
    setBusy(true)
    try {
      const ok = await confirmDialog({
        title: onConfirmImport ? 'Crear proyecto con presupuesto' : 'Confirmar importación',
        message: `Se incluirán ${copias} unidad(es) de ${modelos.length} archivo(s) por un costo directo de ${fmtMoney(scan.totals.sumLeafImporte)}. ¿Continuar?`,
        okLabel: onConfirmImport ? 'Crear proyecto' : 'Importar presupuesto',
      })
      if (!ok) return
      setStage('importing')
      const duracionMs = fechaInicio && fechaFinPlan ? new Date(fechaFinPlan) - new Date(fechaInicio) : 0
      const { caratula, formato, branches, leaves, insumos, warnings, totals } = scan
      const payload = {
        parsed: { caratula, formato, branches, leaves, insumos, warnings, totals },
        filename: scan.filename ?? modelos[0].nombre,
        viviendasObjetivo: viviendas ? Number(viviendas) : null,
        aplicaIva,
        weekCount: duracionMs > 0 ? Math.ceil(duracionMs / (1000 * 60 * 60 * 24 * 7)) : null,
        fechaInicio: fechaInicio ? new Date(fechaInicio).toISOString() : null,
        fechaFinPlan: fechaFinPlan ? new Date(fechaFinPlan).toISOString() : null,
        confirmed: true,
      }
      const result = onConfirmImport
        ? await onConfirmImport(payload)
        : await apiFetch(`/api/construccion/proyectos/${proyectoId}/presupuesto/import`, {
            method: 'POST', body: payload,
          })
      setImportResult(result)
      setStage('done')
    } catch (err) {
      setError(err.message || 'No se pudo importar el presupuesto.')
      setStage('preview')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open onClose={close} title={onConfirmImport ? 'Crear proyecto con presupuesto' : 'Importar presupuesto'} size="lg">
      {error && <div role="alert" className="imp-banner danger">{error}</div>}
      {stage === 'pick' && (
        <div className="imp-pick">
          <p className="muted small">
            Selecciona un presupuesto por modelo. Después de leer los archivos podrás indicar cuántas unidades de cada modelo incluye el proyecto.
          </p>
          <details className="imp-details">
            <summary>Formatos compatibles</summary>
            <p className="small imp-formatos">
              Excel con hoja PRESUPUESTO, Matrices o LISTA DE CONCEPTOS. También puedes cargar un PDF de Presupuesto por Actividades.
            </p>
          </details>
          <label
            className="imp-drop"
            onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('dragover') }}
            onDragLeave={e => e.currentTarget.classList.remove('dragover')}
            onDrop={e => {
              e.preventDefault()
              e.currentTarget.classList.remove('dragover')
              agregar(e.dataTransfer.files)
            }}
          >
            <input
              className="imp-picker"
              type="file" multiple disabled={busy}
              accept={['.xls', '.xlsx', '.pdf', ...formatos].join(',')}
              onChange={e => { agregar(e.target.files); e.target.value = '' }}
            />
            Arrastra los presupuestos aquí o selecciona archivos Excel o PDF.
          </label>
          {archivos.map(a => (
            <div className="imp-file" key={a.id}>
              <strong>{a.blob.name}</strong>
              <button type="button" disabled={busy} aria-label={`Quitar ${a.blob.name}`} onClick={() => {
                setArchivos(actuales => actuales.filter(f => f.id !== a.id))
                setError('')
              }}>Quitar</button>
            </div>
          ))}
          {leyendo && <p role="status">Leyendo {leyendo}…</p>}
          <div className="modal-actions">
            <button onClick={close} disabled={busy}>Cancelar</button>
            <button className="primary" onClick={doScan} disabled={!archivos.length || busy}>
              Analizar {archivos.length === 1 ? 'archivo' : 'archivos'}
            </button>
          </div>
        </div>
      )}

      {stage === 'preview' && (
        <div className="imp-preview">
          <p>Indica cuántas unidades de cada presupuesto se incluirán. Usa cero para excluir un archivo.</p>
          <div className="imp-modelos">
            <table className="imp-table">
              <thead><tr><th>Presupuesto</th><th>Costo por unidad</th><th>Unidades</th><th>Importe</th></tr></thead>
              <tbody>{archivos.map(({ id, blob, cantidad, scan: lectura }) => (
                <tr key={id}>
                  <td>
                    {blob.name}
                    {lectura.caratula?.titulo && lectura.caratula.titulo !== blob.name && (
                      <div className="muted small">{lectura.caratula.titulo}</div>
                    )}
                  </td>
                  <td>{fmtMoney(lectura.totals.sumLeafImporte)}</td>
                  <td><input type="number" min="0" step="1" value={cantidad} disabled={busy}
                    aria-label={`Unidades de ${blob.name}`}
                    onChange={e => { actualizar(id, { cantidad: e.target.value }); setError('') }}
                  /></td>
                  <td>{fmtMoney(esCantidad(cantidad) ? lectura.totals.sumLeafImporte * Number(cantidad) : null)}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          {yaImportado && <div role="alert" className="imp-banner danger">Este proyecto ya tiene un presupuesto cargado.</div>}
          {problema && <div role="alert" className="imp-banner danger">{problema}</div>}
          {scan && <ResumenPresupuesto scan={scan} />}

          {/* Datos del proyecto — alimentan el flujo de estimaciones */}
          <fieldset className="imp-fieldset">
            <legend>Configuración del proyecto</legend>
            <p className="muted small" style={{ margin: '0 0 0.6rem' }}>
              Estos campos se usan para calcular avance por vivienda y la curva
              esperada del cliente. Ajusta el número de viviendas si un archivo cubre varias.
            </p>
            <div className="imp-grid">
              <label>
                <span>Viviendas totales</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={viviendas}
                  onChange={(e) => setViviendasEditadas(e.target.value)}
                  placeholder="p. ej., 48"
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
          {configInvalida && <div role="alert" className="imp-banner danger">Ingresa un número entero positivo de viviendas.</div>}
          <div className="modal-actions">
            <button disabled={busy} onClick={() => { setError(''); setStage('pick') }}>Cambiar archivos</button>
            <button className="primary" onClick={doImport} disabled={!scan || busy || yaImportado || configInvalida}>
              {onConfirmImport ? 'Crear proyecto con presupuesto' : 'Confirmar e importar'}
            </button>
          </div>
        </div>
      )}

      {stage === 'importing' && <p role="status" className="imp-importing">Guardando el presupuesto del proyecto…</p>}

      {stage === 'done' && importResult && (
        <div className="imp-done">
          <div className="imp-banner success">{onConfirmImport ? 'Proyecto creado con presupuesto' : 'Presupuesto importado'}</div>
          <ul className="imp-result">
            <li><strong>{importResult.branchCount}</strong> capítulos</li>
            <li><strong>{importResult.leafCount}</strong> conceptos</li>
            <li><strong>{importResult.conceptosCreated}</strong> conceptos nuevos en catálogo</li>
            <li><strong>{importResult.insumosCreated}</strong> insumos procesados</li>
            <li>Costo directo: <strong>{fmtMoney(importResult.total)}</strong></li>
          </ul>
          <div className="modal-actions"><button className="primary" onClick={close}>Listo</button></div>
        </div>
      )}
    </Modal>
  )
}
