/**
 * ReembolsoDetalle — período de caja chica processing page.
 *
 * Header: proyecto, semana, anticipo, running totals.
 * Body: one row per Gasto (beneficiario, descripción, cant/unidad,
 *       importe, attribution badge). Inline "+" opens a mini form
 *       with 3-mode picker (directo / indirecto).
 * Footer: Total gastos − anticipo = saldo del período + "Marcar
 *         reembolsado" button (which optionally links to a real
 *         BankTransaction or just records the closure off-books).
 *
 * Generic — no hardcoded responsable. The titular of the linked
 * BankAccount (if set) is shown as the responsable de la caja.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../config/api'
import BankTxPicker from '../components/BankTxPicker'
import FileUpload from '../components/FileUpload'
import { confirmDialog, promptDialog, alertDialog } from '../components/Dialog'
import '../components/BankTxPicker.css'
import '../components/FileUpload.css'
import './Reembolsos.css'

const fmtMoney = (n) =>
  n == null ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(Number(n) || 0)

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

const CATEGORIAS_INDIRECTO = [
  { id: 'GASOLINA',          label: 'Gasolina' },
  { id: 'VIATICOS',          label: 'Viáticos' },
  { id: 'ALIMENTOS',         label: 'Alimentos' },
  { id: 'FLETE_TRANSPORTE',  label: 'Flete / transporte' },
  { id: 'HERRAMIENTA_MENOR', label: 'Herramienta menor' },
  { id: 'EQUIPO_SEGURIDAD',  label: 'Equipo de seguridad' },
  { id: 'RENTA_EQUIPO',      label: 'Renta de equipo' },
  { id: 'NOMINA',            label: 'Nómina' },
  { id: 'OTROS',             label: 'Otros' },
]

export default function ReembolsoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeCompany, user, rol } = useAuth()
  const [reembolso, setReembolso] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [showNew, setShowNew] = useState(false)
  // Gasto al que se le busca CFDI (modal de conciliación de caja chica)
  const [cfdiFor, setCfdiFor] = useState(null)
  const [pickerOpen, setPickerOpen] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch(`/api/construccion/reembolsos/${id}`)
      setReembolso(data)
    } catch (err) {
      alertDialog({ message: err.message || 'Error al cargar reembolso' })
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { reload() }, [reload])

  const setAnticipo = async () => {
    const v = await promptDialog({
      title: 'Anticipo previo aplicado',
      label: 'Monto en pesos',
      type: 'number',
      defaultValue: String(reembolso?.anticipoAplicado ?? 0),
      validate: (s) => {
        const n = parseFloat(s)
        return (!Number.isNaN(n) && n >= 0) || 'Captura un número >= 0'
      },
    })
    if (v == null) return
    const n = parseFloat(v)
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/reembolsos/${id}`, {
        method: 'PATCH',
        body: { anticipoAplicado: n },
      })
      await reload()
    } catch (err) { alertDialog({ message: err.message }) }
    finally { setBusy(false) }
  }

  const marcarRevisado = async () => {
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/reembolsos/${id}`, {
        method: 'PATCH',
        body: { estado: 'REVISADO' },
      })
      await reload()
    } catch (err) { alertDialog({ message: err.message }) }
    finally { setBusy(false) }
  }

  const sinAtribucionGuard = () => {
    const sinAtribucion = reembolso.gastos.filter(
      g => !g.presupuestoPartidaId && !g.insumoId && !g.indirecto
    )
    if (sinAtribucion.length > 0) {
      alertDialog({ title: 'Atribución pendiente', message: `Hay ${sinAtribucion.length} gasto(s) sin atribución. Completa los links primero.` })
      return false
    }
    return true
  }

  const reembolsar = () => {
    if (!sinAtribucionGuard()) return
    setPickerOpen(true)
  }

  const cerrarOffBooks = async () => {
    if (!sinAtribucionGuard()) return
    if (!(await confirmDialog({
      title: 'Cerrar período sin movimiento bancario',
      message: 'Marca el período como REEMBOLSADO sin registrar movimiento en el banco. Úsalo cuando el reembolso al responsable se hace fuera del sistema (efectivo, off-books). ¿Continuar?',
      okLabel: 'Cerrar off-books',
    }))) return
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/reembolsos/${id}/reembolsar`, {
        method: 'POST',
        body: { offBooks: true },
      })
      await reload()
    } catch (err) {
      alertDialog({ message: err.message || 'Error al cerrar' })
    } finally {
      setBusy(false)
    }
  }

  const onBankTxPicked = async (tx) => {
    setPickerOpen(false)
    setBusy(true)
    try {
      const body = tx.newTx
        ? {
            fecha: new Date(tx.fecha + 'T12:00:00').toISOString(),
            referencia: tx.referencia,
          }
        : { bankTransactionId: tx.id }
      await apiFetch(`/api/construccion/reembolsos/${id}/reembolsar`, {
        method: 'POST',
        body,
      })
      await reload()
    } catch (err) {
      alertDialog({ message: err.message || 'Error al cerrar' })
    } finally {
      setBusy(false)
    }
  }

  const eliminarGasto = async (gastoId) => {
    if (!(await confirmDialog({ title: 'Eliminar gasto', message: '¿Eliminar este gasto del reembolso?', destructive: true, okLabel: 'Eliminar' }))) return
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/gastos/${gastoId}`, { method: 'DELETE' })
      await reload()
    } catch (err) { alertDialog({ message: err.message }) }
    finally { setBusy(false) }
  }

  if (loading) return <div className="pd-empty">Cargando…</div>
  if (!reembolso) return <div className="pd-empty">No encontrado.</div>

  const frozen = reembolso.estado === 'REEMBOLSADO'
  // Cada caja tiene dueño: sólo él (y los admins) editan/agregan gastos; las
  // decisiones (revisar, cerrar) son de admin. El backend hace cumplir ambos.
  const esAdmin = !rol || rol === 'ADMIN'
  const esDueno = !!reembolso.creadaPorId && reembolso.creadaPorId === user?.id
  const puedeEditar = esAdmin || esDueno

  return (
    <div className="reembolso-detalle">
      <button className="pd-back" onClick={() => navigate('/reembolsos')}>← Reembolsos</button>

      <header className="reembolso-head">
        <div>
          <div className="muted small">{reembolso.proyecto?.codigo} · {reembolso.proyecto?.nombre}</div>
          <h1>Semana {fmtDate(reembolso.semanaInicio)} — {fmtDate(reembolso.semanaFin)}</h1>
          <div>
            <span className={`badge estado-${reembolso.estado.toLowerCase()}`}>{reembolso.estado}</span>
            {' '}
            <span className="muted small">
              Caja: {reembolso.bankAccount?.nombre}
              {(reembolso.creadaPorNombre || reembolso.bankAccount?.titular) && (
                <> · responsable: <strong>{reembolso.creadaPorNombre ?? reembolso.bankAccount?.titular}</strong></>
              )}
            </span>
          </div>
        </div>
        <div className="reembolso-totals">
          <div className="row">
            <span>Total gastos</span>
            <strong>{fmtMoney(reembolso.totalGastos)}</strong>
          </div>
          <div className="row">
            <span>
              Anticipo previo
              {!frozen && puedeEditar && <button type="button" className="link small" onClick={setAnticipo}>editar</button>}
            </span>
            <strong>−{fmtMoney(reembolso.anticipoAplicado)}</strong>
          </div>
          <div className="row total">
            <span>Saldo del período</span>
            <strong>{fmtMoney(reembolso.totalReembolso)}</strong>
          </div>
        </div>
      </header>

      <div className="reembolso-body">
        <div className="reembolso-actions">
          {!frozen && (
            <>
              {puedeEditar && (
                <button className="secondary" disabled={busy} onClick={() => setShowNew(true)}>+ Agregar gasto</button>
              )}
              {!puedeEditar && (
                <span className="muted small">
                  Caja de {reembolso.creadaPorNombre ?? 'otro usuario'} — sólo su responsable o un admin la editan.
                </span>
              )}
              {esAdmin && reembolso.estado === 'SUBMITTED' && (
                <button className="secondary" disabled={busy} onClick={marcarRevisado}>Marcar revisado</button>
              )}
              {esAdmin && (
                <>
                  <button
                    className="primary"
                    disabled={busy || reembolso.gastos.length === 0 || reembolso.totalReembolso <= 0}
                    onClick={reembolsar}
                    title="Cierra el período y vincula un movimiento bancario (preferido si el reembolso pasa por una cuenta del banco)."
                  >
                    ✓ Cerrar con movimiento banco
                  </button>
                  <button
                    className="secondary"
                    disabled={busy || reembolso.gastos.length === 0}
                    onClick={cerrarOffBooks}
                    title="Cierra el período sin crear movimiento bancario. Úsalo cuando el reembolso se maneja fuera del sistema."
                  >
                    Cerrar off-books
                  </button>
                </>
              )}
            </>
          )}
          {frozen && (
            <div className="reembolso-frozen">
              ✓ Cerrado el {fmtDate(reembolso.reembolsadoAt)}.
              {reembolso.bankTransaction
                ? (
                    <> Mov. banco: {reembolso.bankTransaction.referencia ?? `${reembolso.bankTransaction.id.slice(0, 8)}…`}</>
                  )
                : (
                    <> <span className="muted small">(reembolso off-books, sin movimiento bancario)</span></>
                  )
              }
            </div>
          )}
        </div>

        {reembolso.gastos.length === 0 ? (
          <div className="pd-empty" style={{ marginTop: '1rem' }}>
            Sin gastos. Agrega la primera línea desde el botón arriba.
          </div>
        ) : (
          <table className="reembolso-gastos">
            <thead>
              <tr>
                <th style={{ width: 100 }}>Fecha</th>
                <th>Beneficiario / descripción</th>
                <th>Atribución</th>
                <th style={{ textAlign: 'right', width: 80 }}>Cant.</th>
                <th style={{ textAlign: 'right', width: 110 }}>Importe</th>
                {!frozen && <th style={{ width: 50 }}></th>}
              </tr>
            </thead>
            <tbody>
              {reembolso.gastos.map(g => (
                <GastoRowInline
                  key={g.id}
                  gasto={g}
                  frozen={frozen}
                  puedeEditar={puedeEditar}
                  onCfdi={() => setCfdiFor(g)}
                  onDelete={() => eliminarGasto(g.id)}
                />
              ))}
            </tbody>
          </table>
        )}

        {showNew && !frozen && (
          <NewGastoInline
            reembolso={reembolso}
            companyId={activeCompany?.id}
            onClose={() => setShowNew(false)}
            onCreated={() => { setShowNew(false); reload() }}
          />
        )}
      </div>

      {cfdiFor && (
        <CfdiMatchModal
          gasto={cfdiFor}
          onClose={() => setCfdiFor(null)}
          onLinked={() => { setCfdiFor(null); reload() }}
        />
      )}

      <BankTxPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={onBankTxPicked}
        companyId={activeCompany?.id}
        // Período anclado a la caja (efectivo): el SPEI de reembolso sale de
        // una cuenta bancaria real, así que el picker busca en TODAS las
        // cuentas. Con cuenta bancaria explícita (reembolsos semanales) se
        // mantiene el filtro.
        bankAccountId={reembolso.bankAccount?.tipo === 'CAJA' ? undefined : reembolso.bankAccountId}
        expectedAmount={reembolso.totalReembolso}
        title={`Cerrar período — vincular movimiento bancario (${fmtMoney(reembolso.totalReembolso)})`}
      />
    </div>
  )
}

/**
 * Modal de conciliación: CFDIs recibidos que probablemente amparan este
 * gasto (por RFC del proveedor etiquetado, monto y fecha). Elegir uno lo
 * vincula (targetTipo GASTO) y el gasto queda respaldado por factura —
 * deducible. Las sugerencias vienen de gastos/[id]/cfdi-candidatos.
 */
function CfdiMatchModal({ gasto, onClose, onLinked }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    apiFetch(`/api/construccion/gastos/${gasto.id}/cfdi-candidatos`)
      .then(setData)
      .catch((e) => setError(e.message || 'No se pudieron cargar sugerencias'))
  }, [gasto.id])

  const vincular = async (c) => {
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/cfdis/${c.id}/vincular`, {
        method: 'POST',
        body: { tipo: 'GASTO', targetId: gasto.id },
      })
      onLinked?.()
    } catch (err) {
      alertDialog({ message: err.message || 'No se pudo vincular el CFDI' })
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-content" style={{ maxWidth: 560 }}>
        <h3>CFDI para: {gasto.beneficiarioNombre} · {fmtMoney(gasto.importe)}</h3>
        {error ? (
          <p className="muted small">{error}</p>
        ) : !data ? (
          <p className="muted small">Buscando facturas que cuadren…</p>
        ) : data.candidatos.length === 0 ? (
          <p className="muted small">
            No hay CFDIs recibidos que cuadren (±45 días, sin vincular).
            {!gasto.supplierId && ' Etiqueta el proveedor del gasto para buscar por su RFC.'}
          </p>
        ) : (
          <div className="cfdi-cands">
            {data.candidatos.map((c) => (
              <div key={c.id} className="cfdi-cand">
                <div>
                  <strong>{c.emisorNombre ?? c.emisorRfc ?? 'Emisor desconocido'}</strong>
                  <div className="muted small">
                    {new Date(c.fecha).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                    {' · '}{fmtMoney(c.total)}
                    {c.razones.length > 0 && <> · {c.razones.join(' · ')}</>}
                  </div>
                </div>
                <button type="button" className="secondary" disabled={busy} onClick={() => vincular(c)}>
                  Vincular
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button type="button" className="secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

function ReembolsoComprobanteLink({ gasto }) {
  const open = async () => {
    if (gasto.comprobanteUrl && !gasto.comprobanteName) {
      window.open(gasto.comprobanteUrl, '_blank'); return
    }
    try {
      const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || ''
      const token = localStorage.getItem('cadmin.token')
      const res = await fetch(
        `${base}/api/construccion/gastos/${gasto.id}/comprobante?type=gasto`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error('No se pudo abrir')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (err) { alertDialog({ message: err.message }) }
  }
  return (
    <button type="button" className="link small" onClick={open}>
      📎 {gasto.comprobanteName || 'Comprobante'}
    </button>
  )
}

function GastoRowInline({ gasto, frozen, puedeEditar, onCfdi, onDelete }) {
  const puReal = gasto.cantidad ? gasto.importe / gasto.cantidad : null
  const puCatalogo = gasto.insumo?.costoActual ?? null
  const variancePct = puReal && puCatalogo ? ((puReal - puCatalogo) / puCatalogo) * 100 : null

  return (
    <tr className={gasto.estado === 'RECHAZADO' ? 'rechazado' : ''}>
      <td className="small muted">{fmtDate(gasto.createdAt)}</td>
      <td>
        <strong>{gasto.beneficiarioNombre}</strong>
        <div className="small muted">{gasto.descripcion}</div>
        {(gasto.comprobanteName || gasto.comprobanteUrl) && (
          <div className="small" style={{ marginTop: '0.2rem' }}>
            <ReembolsoComprobanteLink gasto={gasto} />
          </div>
        )}
        <div className="small" style={{ marginTop: '0.2rem' }}>
          {gasto.cfdiVinculado ? (
            <span style={{ color: '#15803d' }} title={gasto.cfdiVinculado.uuid ?? ''}>
              📄 CFDI ✓ {gasto.cfdiVinculado.emisor ?? ''} · {fmtMoney(gasto.cfdiVinculado.total)}
            </span>
          ) : (
            puedeEditar && !frozen && (
              <button type="button" className="link small" onClick={onCfdi}>
                Buscar CFDI…
              </button>
            )
          )}
        </div>
      </td>
      <td className="small">
        {gasto.insumo ? (
          <>
            🟢 <span className="mono">{gasto.insumo.codigo}</span> {gasto.insumo.descripcion.slice(0, 30)}
            {variancePct != null && (
              <div style={{ color: Math.abs(variancePct) > 10 ? '#dc2626' : '#64748b', fontSize: '0.7rem' }}>
                PU real ${puReal.toFixed(2)} vs catálogo ${puCatalogo.toFixed(2)} ({variancePct > 0 ? '+' : ''}{variancePct.toFixed(0)}%)
              </div>
            )}
          </>
        ) : gasto.presupuestoPartida ? (
          <>🟢 <span className="mono">{gasto.presupuestoPartida.codigo ?? gasto.presupuestoPartida.concepto?.codigo}</span></>
        ) : gasto.indirecto ? (
          <>⚫ <span className="mono">{gasto.categoriaIndirecto || '(sin categoría)'}</span></>
        ) : (
          <span style={{ color: '#dc2626' }}>⚠ Sin atribución</span>
        )}
      </td>
      <td style={{ textAlign: 'right' }} className="small">
        {gasto.cantidad != null ? `${gasto.cantidad.toFixed(2)} ${gasto.unidad ?? ''}` : '—'}
      </td>
      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        <strong>{fmtMoney(gasto.importe)}</strong>
      </td>
      {!frozen && (
        <td>
          <button className="link small danger" onClick={onDelete}>×</button>
        </td>
      )}
    </tr>
  )
}

function NewGastoInline({ reembolso, companyId, onClose, onCreated }) {
  const [beneficiarioNombre, setBeneficiario] = useState('')
  // Proveedor etiquetado (opcional): rellena beneficiario y habilita las
  // sugerencias de CFDI por RFC al conciliar.
  const [suppliers, setSuppliers] = useState([])
  const [supplierId, setSupplierId] = useState('')
  const [descripcion, setDesc] = useState('')
  const [importe, setImporte] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [unidad, setUnidad] = useState('')
  const [insumoId, setInsumoId] = useState(null)
  const [presupuestoPartidaId, setPartidaId] = useState(null)
  const [picked, setPicked] = useState(null)
  const [categoriaIndirecto, setCategoriaIndirecto] = useState('')
  const [suggestions, setSuggestions] = useState({ insumos: [], partidas: [] })
  const [comprobanteFile, setComprobanteFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const timer = useRef(null)

  useEffect(() => {
    if (!companyId) return
    apiFetch(`/api/construccion/suppliers?companyId=${encodeURIComponent(companyId)}`)
      .then((d) => setSuppliers(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [companyId])

  const pickSupplier = (id) => {
    setSupplierId(id)
    const s = suppliers.find((x) => x.id === id)
    if (s && !beneficiarioNombre.trim()) setBeneficiario(s.razonSocial)
  }

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    const q = descripcion.trim()
    if (q.length < 2 || !companyId) {
      setSuggestions({ insumos: [], partidas: [] })
      return
    }
    timer.current = setTimeout(() => {
      apiFetch(
        `/api/construccion/gastos/sugerir?companyId=${encodeURIComponent(companyId)}&proyectoId=${encodeURIComponent(reembolso.proyectoId)}&q=${encodeURIComponent(q)}`
      ).then(setSuggestions).catch(() => {})
    }, 250)
    return () => clearTimeout(timer.current)
  }, [descripcion, companyId, reembolso.proyectoId])

  const pickInsumo = (i) => {
    setInsumoId(i.id)
    setPartidaId(null)
    setPicked({ tipo: 'insumo', ...i })
    // Auto-fill unidad from the insumo so cantidad makes sense
    if (!unidad && i.unidad) setUnidad(i.unidad)
  }
  const pickPartida = (p) => {
    setPartidaId(p.id)
    setInsumoId(null)
    setPicked({ tipo: 'partida', ...p })
  }
  const clearPick = () => { setInsumoId(null); setPartidaId(null); setPicked(null) }

  const submit = async (e) => {
    e.preventDefault()
    const imp = parseFloat(importe)
    if (!beneficiarioNombre.trim() || !descripcion.trim() || !(imp > 0)) {
      alertDialog({ message: 'Completa beneficiario, descripción e importe.' }); return
    }
    // Sin botones de modo: con insumo/partida elegido del catálogo el gasto
    // es DIRECTO; si no, es indirecto y pide su categoría.
    const isDirecto = !!(insumoId || presupuestoPartidaId)
    const isIndirecto = !isDirecto && categoriaIndirecto.trim().length > 0
    if (!isDirecto && !isIndirecto) {
      alertDialog({ message: 'Elige un insumo/partida del catálogo, o una categoría para el gasto.' }); return
    }
    const cantNum = cantidad ? parseFloat(cantidad) : null
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/reembolsos/${reembolso.id}/gastos`, {
        method: 'POST',
        body: {
          beneficiarioNombre: beneficiarioNombre.trim(),
          supplierId: supplierId || null,
          descripcion: descripcion.trim(),
          importe: imp,
          cantidad: cantNum && cantNum > 0 ? cantNum : null,
          unidad: unidad?.trim() || null,
          insumoId: isDirecto ? insumoId : null,
          presupuestoPartidaId: isDirecto ? presupuestoPartidaId : null,
          indirecto: isIndirecto,
          categoriaIndirecto: isIndirecto ? categoriaIndirecto.trim() : null,
          comprobanteData: comprobanteFile?.data ?? null,
          comprobanteMime: comprobanteFile?.mime ?? null,
          comprobanteName: comprobanteFile?.name ?? null,
        },
      })
      onCreated?.()
    } catch (err) {
      alertDialog({ message: err.message || 'Error al agregar gasto' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="new-gasto-inline" onSubmit={submit}>
      <label>
        <span>Proveedor (opcional — habilita sugerir su CFDI)</span>
        <select value={supplierId} onChange={(e) => pickSupplier(e.target.value)}>
          <option value="">— Sin proveedor</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.razonSocial}</option>
          ))}
        </select>
      </label>
      <div className="row">
        <label>
          <span>Beneficiario</span>
          <input value={beneficiarioNombre} onChange={(e) => setBeneficiario(e.target.value)} placeholder="Lesly, Jose Luis…" />
        </label>
        <label>
          <span>Importe $</span>
          <input type="number" step="0.01" value={importe} onChange={(e) => setImporte(e.target.value)} placeholder="0.00" />
        </label>
      </div>
      <label>
        <span>Descripción</span>
        <input value={descripcion} onChange={(e) => setDesc(e.target.value)} placeholder="impermeabilizante sika, gasolina, viáticos…" />
      </label>
      <div className="row">
        <label>
          <span>Cantidad</span>
          <input type="number" step="0.01" value={cantidad} onChange={(e) => setCantidad(e.target.value)} placeholder="opcional" />
        </label>
        <label>
          <span>Unidad</span>
          <input value={unidad} onChange={(e) => setUnidad(e.target.value)} placeholder="cubeta, m3, kg…" />
        </label>
      </div>

      {/* Sin botones Directo/Indirecto: elegir del catálogo = directo;
          sin elección, las categorías de abajo lo clasifican solas. */}
      {(suggestions.insumos.length > 0 || suggestions.partidas.length > 0) && !picked && (
        <div className="suggest-box">
          {suggestions.insumos.slice(0, 4).map(i => (
            <button type="button" key={i.id} className="suggest-item" onClick={() => pickInsumo(i)}>
              <span className="mono">{i.codigo}</span> {i.descripcion.slice(0, 40)}
              <span className="muted small"> · {i.unidad} · ${i.costoActual?.toFixed(2)}/u</span>
            </button>
          ))}
          {suggestions.partidas.slice(0, 3).map(p => (
            <button type="button" key={p.id} className="suggest-item" onClick={() => pickPartida(p)}>
              <span className="mono">{p.codigo ?? p.concepto?.codigo}</span> {p.concepto?.descripcion?.slice(0, 30)}
              <span className="muted small"> · queda {fmtMoney(p.queda)}</span>
            </button>
          ))}
        </div>
      )}
      {picked ? (
        <div className="picked">
          Vinculado al catálogo: <span className="mono">{picked.codigo ?? picked.concepto?.codigo}</span>
          <button type="button" className="link small" onClick={clearPick}>quitar</button>
        </div>
      ) : (
        <div>
          <span className="muted small">Categoría (si no viene del catálogo):</span>
          <div className="cat-chips" style={{ marginTop: 4 }}>
            {CATEGORIAS_INDIRECTO.map(c => (
              <button
                key={c.id}
                type="button"
                className={categoriaIndirecto === c.id ? 'active' : ''}
                onClick={() => setCategoriaIndirecto(categoriaIndirecto === c.id ? '' : c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="stack">
        <span>Comprobante (foto/PDF, opcional)</span>
        <FileUpload value={comprobanteFile} onChange={setComprobanteFile} />
      </label>

      <div className="row">
        <button type="submit" className="primary small" disabled={busy}>+ Agregar</button>
        <button type="button" className="secondary small" disabled={busy} onClick={onClose}>cancelar</button>
      </div>
    </form>
  )
}
