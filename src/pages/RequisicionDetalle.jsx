/**
 * RequisicionDetalle — multi-vendor matrix UI.
 *
 * Header: folio, proyecto, estado, total, supplier ganador.
 * Matrix: rows = partidas, cols = cotizaciones (1 col per vendor).
 *   Each cell shows precio + importe per line for that vendor.
 *   Row footer highlights the best price + the difference vs the
 *   selected cotización.
 * Tools:
 *   • "+ Nueva cotización" modal — vendor name + per-line PUs.
 *   • Per-cotización "Elegir como ganadora" button → atomic seleccionar.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../config/api'
import Modal from '../components/Modal'
import FileUpload from '../components/FileUpload'
import SupplierPicker from '../components/SupplierPicker'
import { confirmDialog, alertDialog } from '../components/Dialog'
import { useAuth } from '../auth/AuthContext'
import '../components/Modal.css'
import '../components/FileUpload.css'
import '../components/SupplierPicker.css'
import './Requisiciones.css'

const fmtMoney = (n) =>
  n == null ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(Number(n) || 0)

export default function RequisicionDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [newCotOpen, setNewCotOpen] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/construccion/solicitudes-compra/${id}`)
      setData(res)
    } catch (err) {
      alertDialog({ message: err.message || 'Error al cargar' })
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { reload() }, [reload])

  // Per partida, find the cheapest cotización + the selected one
  const matrix = useMemo(() => {
    if (!data) return null
    const cots = data.cotizaciones ?? []
    return data.partidas.map((p) => {
      const lines = cots.map((c) => {
        const ln = c.partidas.find((cp) => cp.solicitudPartidaId === p.id)
        return { cotizacionId: c.id, line: ln, supplierNombre: c.supplierNombre, isSelected: c.isSelected }
      })
      const priced = lines.filter((l) => l.line)
      const cheapest =
        priced.length > 0
          ? priced.reduce((a, b) => (b.line.precioUnitario < a.line.precioUnitario ? b : a))
          : null
      return { partida: p, lines, cheapest }
    })
  }, [data])

  const selectCot = async (cotId) => {
    if (!(await confirmDialog({ title: 'Elegir cotización ganadora', message: 'Se actualizarán precios y proveedor en la requisición. ¿Continuar?', okLabel: 'Sí, elegir' }))) return
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/solicitudes-compra/${id}/cotizaciones/${cotId}/seleccionar`, { method: 'POST' })
      await reload()
    } catch (err) {
      alertDialog({ message: err.message || 'Error' })
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="pd-empty">Cargando…</div>
  if (!data) return <div className="pd-empty">No encontrado.</div>

  return (
    <div className="req-detalle">
      <button className="pd-back" onClick={() => navigate('/requisiciones')}>← Requisiciones</button>

      <header className="req-head">
        <div>
          <div className="muted small">
            OBRA: {data.proyecto?.codigo ?? 'Sin proyecto'}
            {data.proyecto?.nombre && <> · {data.proyecto.nombre}</>}
          </div>
          <h1>Solicitud N° {data.folio}</h1>
          <div className="req-meta">
            <span className={`badge estado-${data.estado.toLowerCase()}`}>{data.estado}</span>
            <span className="muted small">
              Solicitada: {data.createdAt ? new Date(data.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
            </span>
            <span className="muted small">
              Entrega:{' '}
              {data.fechaEntrega ? (
                new Date(data.fechaEntrega).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })
              ) : (
                <span className="muted">— sin definir —</span>
              )}
            </span>
            <span className="muted small">
              Forma de pago:{' '}
              <strong>
                {data.formaPago === 'CREDITO' ? 'Crédito' : data.formaPago === 'CONTADO' ? 'Contado' : '—'}
              </strong>
            </span>
            {data.supplier && (
              <span className="muted small">
                Ganador: <strong>{data.supplier.razonSocial}</strong>
              </span>
            )}
          </div>
        </div>
        <div className="req-totals">
          <div className="row">
            <span>Total actual</span>
            <strong>{fmtMoney(data.total)}</strong>
          </div>
          <div className="row">
            <span>Cotizaciones</span>
            <strong>{(data.cotizaciones ?? []).length}</strong>
          </div>
        </div>
      </header>

      <div className="req-actions">
        <button className="secondary" onClick={() => setNewCotOpen(true)}>+ Agregar cotización</button>
      </div>

      {/* Movimiento bancario vinculado */}
      <BankLinkPanel data={data} reload={reload} />


      <Modal open={newCotOpen} onClose={() => setNewCotOpen(false)} title="Nueva cotización" size="lg">
        <NewCotizacionForm
          requisicion={data}
          onClose={() => setNewCotOpen(false)}
          onCreated={() => { setNewCotOpen(false); reload() }}
        />
      </Modal>

      {/* Matrix */}
      {(data.cotizaciones ?? []).length === 0 ? (
        <div className="pd-empty">
          Aún no hay cotizaciones. Agrega la primera con el botón arriba.
        </div>
      ) : (
        <div className="matrix-scroll">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Unidad</th>
                <th style={{ textAlign: 'right' }}>Cant.</th>
                {data.cotizaciones.map((c) => (
                  <th key={c.id} className={c.isSelected ? 'cot-selected' : ''}>
                    <div className="cot-head">
                      <strong>{c.supplierNombre}</strong>
                      <button
                        type="button"
                        className={c.isSelected ? 'link small selected' : 'link small'}
                        onClick={() => !c.isSelected && selectCot(c.id)}
                        disabled={busy || c.isSelected}
                      >
                        {c.isSelected ? '✓ ganadora' : 'elegir'}
                      </button>
                    </div>
                    <div className="muted small">Total {fmtMoney(c.total)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map(({ partida, lines, cheapest }) => (
                <tr key={partida.id}>
                  <td>
                    <div>{partida.descripcion}</div>
                    {partida.insumo && (
                      <div className="muted small">
                        Insumo: <span className="mono">{partida.insumo.codigo}</span>
                      </div>
                    )}
                  </td>
                  <td className="small mono">{partida.unidad ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>{partida.cantidad}</td>
                  {lines.map(({ cotizacionId, line, isSelected }) => {
                    const isCheapest = cheapest && cheapest.cotizacionId === cotizacionId
                    return (
                      <td
                        key={cotizacionId}
                        className={`${isSelected ? 'cot-selected' : ''} ${isCheapest ? 'cheapest' : ''}`}
                      >
                        {line ? (
                          <>
                            <div className="mono">{fmtMoney(line.precioUnitario)}/u</div>
                            <div className="muted small">= {fmtMoney(line.importe)}</div>
                          </>
                        ) : (
                          <span className="muted small">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {/* Footer totals */}
              <tr className="totals-row">
                <td colSpan={3}><strong>Total cotización</strong></td>
                {data.cotizaciones.map((c) => (
                  <td key={c.id} className={c.isSelected ? 'cot-selected' : ''}>
                    <strong>{fmtMoney(c.total)}</strong>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Bank-link panel ─────────────────────────────────────────────────────────
// Two states:
//   1. Already paid (has bankTransaction) → show fecha + cuenta + monto.
//   2. APROBADA + no BT yet → "Vincular movimiento" button opens picker
//      with candidates from /bt-candidates (matched by amount + date).
function BankLinkPanel({ data, reload }) {
  const [open, setOpen] = useState(false)

  if (data.bankTransaction) {
    const bt = data.bankTransaction
    return (
      <div className="bank-link-panel paid">
        <div>
          <span className="muted small">Pagada con SPEI</span>
          <div>
            <strong>{fmtMoney(Math.abs(bt.monto))}</strong>
            {' · '}
            <span className="muted small">
              {new Date(bt.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
            </span>
            {' · '}
            <span className="small">{bt.bankAccount?.banco} {bt.bankAccount?.nombre}</span>
          </div>
          {bt.referencia && <div className="muted small mono">Ref: {bt.referencia}</div>}
        </div>
      </div>
    )
  }

  if (data.estado !== 'APROBADA') return null

  return (
    <>
      <div className="bank-link-panel">
        <div>
          <span className="muted small">
            Esta requisición está aprobada pero aún no tiene un movimiento bancario asignado.
          </span>
        </div>
        <button className="secondary" onClick={() => setOpen(true)}>
          Vincular movimiento bancario
        </button>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} title="Vincular movimiento bancario" size="lg">
        <BankLinkPicker
          solicitudId={data.id}
          onClose={() => setOpen(false)}
          onLinked={() => { setOpen(false); reload() }}
        />
      </Modal>
    </>
  )
}

function BankLinkPicker({ solicitudId, onClose, onLinked }) {
  const [loading, setLoading] = useState(true)
  const [candidates, setCandidates] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    apiFetch(`/api/construccion/solicitudes-compra/${solicitudId}/bt-candidates`)
      .then((r) => { if (alive) setCandidates(r.candidates ?? []) })
      .catch((err) => alertDialog({ message: err.message || 'Error al cargar candidatos' }))
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [solicitudId])

  const link = async (btId) => {
    if (!(await confirmDialog({
      title: 'Vincular movimiento',
      message: 'Esto marcará la requisición como PAGADA y conciliará el movimiento. ¿Continuar?',
      okLabel: 'Sí, vincular',
    }))) return
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/solicitudes-compra/${solicitudId}/vincular-bt`, {
        method: 'POST',
        body: { bankTransactionId: btId },
      })
      onLinked?.()
    } catch (err) {
      alertDialog({ message: err.message || 'Error al vincular' })
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="pd-empty">Cargando candidatos…</div>
  if (candidates.length === 0) {
    return (
      <div>
        <div className="pd-empty">
          No se encontraron movimientos bancarios sin conciliar que coincidan en
          monto (±15%) y fecha (±10 días). Sube el estado de cuenta o usa
          "Pagar" para generar el movimiento.
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>Cerrar</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <p className="muted small">
        Movimientos bancarios candidatos según monto y fecha. Selecciona el SPEI
        que pagó esta requisición.
      </p>
      <table className="prov-table compact">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Cuenta</th>
            <th>Descripción</th>
            <th style={{ textAlign: 'right' }}>Monto</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((c) => (
            <tr key={c.id}>
              <td className="small muted">
                {new Date(c.fecha).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
              </td>
              <td className="small">{c.bankAccount?.banco} {c.bankAccount?.nombre}</td>
              <td className="small">
                {c.descripcion?.slice(0, 80)}
                {c.referencia && <div className="muted small mono">Ref: {c.referencia}</div>}
              </td>
              <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#dc2626' }}>
                {fmtMoney(c.monto)}
              </td>
              <td>
                <button className="link small" disabled={busy} onClick={() => link(c.id)}>
                  Vincular
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="modal-actions">
        <button onClick={onClose}>Cancelar</button>
      </div>
    </div>
  )
}

// ── New cotización form ─────────────────────────────────────────────────────
function NewCotizacionForm({ requisicion, onClose, onCreated }) {
  const { activeCompany } = useAuth()
  // Supplier flow has two modes: picked from catalog (preferred — gets a
  // real Supplier row + RFC + history aggregation) OR a quick free-text
  // fallback when the proveedor is one-off and not worth promoting.
  const [supplier, setSupplier] = useState(null)
  const [freeTextName, setFreeTextName] = useState('')
  const [useFreeText, setUseFreeText] = useState(false)
  const [fechaCotizacion, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [vigenciaHasta, setVigencia] = useState('')
  const [notas, setNotas] = useState('')
  const [archivo, setArchivo] = useState(null)
  // Per-line PUs keyed by partidaId
  const [pus, setPus] = useState(() => {
    const o = {}
    for (const p of requisicion.partidas) o[p.id] = ''
    return o
  })
  const [busy, setBusy] = useState(false)

  const totalPreview = useMemo(() => {
    return requisicion.partidas.reduce((sum, p) => {
      const pu = parseFloat(pus[p.id]) || 0
      return sum + pu * p.cantidad
    }, 0)
  }, [pus, requisicion.partidas])

  const submit = async (e) => {
    e.preventDefault()
    const finalSupplierNombre = useFreeText
      ? freeTextName.trim()
      : supplier?.razonSocial?.trim() ?? ''
    if (!finalSupplierNombre) { alertDialog({ message: 'Elige un proveedor del catálogo o escribe un nombre.' }); return }
    const lineas = requisicion.partidas
      .filter((p) => parseFloat(pus[p.id]) >= 0)
      .map((p) => ({
        solicitudPartidaId: p.id,
        precioUnitario: parseFloat(pus[p.id]) || 0,
      }))
      .filter((l) => l.precioUnitario > 0)
    if (lineas.length === 0) {
      alertDialog({ message: 'Captura al menos un precio.' }); return
    }
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/solicitudes-compra/${requisicion.id}/cotizaciones`, {
        method: 'POST',
        body: {
          // Send both: id when we have a Supplier row, plus the
          // razonSocial as a fallback / display text. Backend stores
          // both columns.
          supplierId: useFreeText ? null : supplier?.id ?? null,
          supplierNombre: finalSupplierNombre,
          fechaCotizacion: new Date(fechaCotizacion + 'T12:00:00').toISOString(),
          vigenciaHasta: vigenciaHasta ? new Date(vigenciaHasta + 'T12:00:00').toISOString() : null,
          notas: notas.trim() || null,
          archivoData: archivo?.data ?? null,
          archivoMime: archivo?.mime ?? null,
          archivoName: archivo?.name ?? null,
          lineas,
        },
      })
      onCreated?.()
    } catch (err) {
      alertDialog({ message: err.message || 'Error al guardar cotización' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="req-form">
      <label className="stack">
        <span>Proveedor</span>
        {useFreeText ? (
          <div className="row" style={{ alignItems: 'center', gap: '0.4rem' }}>
            <input
              value={freeTextName}
              onChange={(e) => setFreeTextName(e.target.value)}
              placeholder="Nombre libre (no se guarda al catálogo)"
              style={{ flex: 1, padding: '0.4rem 0.55rem', border: '1px solid #cbd5e1', borderRadius: 5, fontSize: '0.9rem' }}
            />
            <button type="button" className="link small" onClick={() => { setUseFreeText(false); setFreeTextName('') }}>
              elegir del catálogo
            </button>
          </div>
        ) : (
          <>
            <SupplierPicker
              value={supplier}
              onChange={setSupplier}
              companyId={activeCompany?.id}
              placeholder="Buscar proveedor por nombre o RFC…"
            />
            {!supplier && (
              <button
                type="button"
                className="link small"
                style={{ alignSelf: 'flex-start', marginTop: 4 }}
                onClick={() => setUseFreeText(true)}
              >
                ¿Cotización de un solo uso? Usar nombre libre →
              </button>
            )}
          </>
        )}
      </label>

      <div className="row">
        <label>
          <span>Fecha</span>
          <input type="date" value={fechaCotizacion} onChange={(e) => setFecha(e.target.value)} required />
        </label>
        <label>
          <span>Vigencia</span>
          <input type="date" value={vigenciaHasta} onChange={(e) => setVigencia(e.target.value)} />
        </label>
      </div>

      <div className="lines">
        <div className="lines-head">
          <span>Concepto</span>
          <span style={{ width: 70 }}>Unidad</span>
          <span style={{ width: 80 }}>Cantidad</span>
          <span style={{ width: 100 }}>P. Unitario</span>
          <span style={{ width: 100, textAlign: 'right' }}>Importe</span>
        </div>
        {requisicion.partidas.map((p) => {
          const pu = parseFloat(pus[p.id]) || 0
          return (
            <div key={p.id} className="line-row">
              <span>{p.descripcion}</span>
              <span className="mono small" style={{ width: 70 }}>{p.unidad ?? '—'}</span>
              <span style={{ width: 80 }}>{p.cantidad}</span>
              <input
                type="number"
                step="0.01"
                value={pus[p.id]}
                onChange={(e) => setPus((o) => ({ ...o, [p.id]: e.target.value }))}
                placeholder="0.00"
                style={{ width: 100 }}
              />
              <span style={{ width: 100, textAlign: 'right' }}>{fmtMoney(pu * p.cantidad)}</span>
            </div>
          )
        })}
        <div className="line-row">
          <strong style={{ flex: 1, textAlign: 'right', paddingRight: '0.5rem' }}>Total cotización</strong>
          <strong style={{ width: 100, textAlign: 'right' }}>{fmtMoney(totalPreview)}</strong>
        </div>
      </div>

      <label className="stack">
        <span>Cotización (PDF / foto, opcional)</span>
        <FileUpload value={archivo} onChange={setArchivo} />
      </label>

      <label className="stack">
        <span>Notas (opcional)</span>
        <input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="entrega, condiciones de pago…" />
      </label>

      <div className="modal-actions">
        <button type="button" onClick={onClose}>Cancelar</button>
        <button type="submit" className="primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cotización'}</button>
      </div>
    </form>
  )
}
