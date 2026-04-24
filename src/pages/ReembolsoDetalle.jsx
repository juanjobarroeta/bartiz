/**
 * ReembolsoDetalle — the weekly package processing page.
 *
 * Header: proyecto, semana, anticipo, running totals.
 * Body: one row per Gasto (beneficiario, descripción, cant/unidad,
 *       importe, attribution badge). Inline "+" opens a mini form
 *       with 3-mode picker (directo / indirecto / misc).
 * Footer: Total gastos − anticipo = total reembolso + "Reembolsar a
 *         Rosy" button.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../config/api'
import BankTxPicker from '../components/BankTxPicker'
import FileUpload from '../components/FileUpload'
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
  const { activeCompany } = useAuth()
  const [reembolso, setReembolso] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiFetch(`/api/construccion/reembolsos/${id}`)
      setReembolso(data)
    } catch (err) {
      window.alert(err.message || 'Error al cargar reembolso')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { reload() }, [reload])

  const setAnticipo = async () => {
    const v = window.prompt('Anticipo previo aplicado ($):', String(reembolso?.anticipoAplicado ?? 0))
    if (v == null) return
    const n = parseFloat(v)
    if (Number.isNaN(n) || n < 0) { window.alert('Valor inválido'); return }
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/reembolsos/${id}`, {
        method: 'PATCH',
        body: { anticipoAplicado: n },
      })
      await reload()
    } catch (err) { window.alert(err.message) }
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
    } catch (err) { window.alert(err.message) }
    finally { setBusy(false) }
  }

  const reembolsar = () => {
    const sinAtribucion = reembolso.gastos.filter(
      g => !g.presupuestoPartidaId && !g.insumoId && !g.indirecto
    )
    if (sinAtribucion.length > 0) {
      window.alert(`Hay ${sinAtribucion.length} gasto(s) sin atribución. Completa los links primero.`)
      return
    }
    setPickerOpen(true)
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
      window.alert(err.message || 'Error al reembolsar')
    } finally {
      setBusy(false)
    }
  }

  const eliminarGasto = async (gastoId) => {
    if (!window.confirm('¿Eliminar este gasto del reembolso?')) return
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/gastos/${gastoId}`, { method: 'DELETE' })
      await reload()
    } catch (err) { window.alert(err.message) }
    finally { setBusy(false) }
  }

  if (loading) return <div className="pd-empty">Cargando…</div>
  if (!reembolso) return <div className="pd-empty">No encontrado.</div>

  const frozen = reembolso.estado === 'REEMBOLSADO'

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
            <span className="muted small">Pago desde {reembolso.bankAccount?.nombre}</span>
          </div>
        </div>
        <div className="reembolso-totals">
          <div className="row">
            <span>Total gastos</span>
            <strong>{fmtMoney(reembolso.totalGastos)}</strong>
          </div>
          <div className="row">
            <span>
              Anticipo aplicado
              {!frozen && <button type="button" className="link small" onClick={setAnticipo}>editar</button>}
            </span>
            <strong>−{fmtMoney(reembolso.anticipoAplicado)}</strong>
          </div>
          <div className="row total">
            <span>A reembolsar a Rosy</span>
            <strong>{fmtMoney(reembolso.totalReembolso)}</strong>
          </div>
        </div>
      </header>

      <div className="reembolso-body">
        <div className="reembolso-actions">
          {!frozen && (
            <>
              <button className="secondary" disabled={busy} onClick={() => setShowNew(true)}>+ Agregar gasto</button>
              {reembolso.estado === 'SUBMITTED' && (
                <button className="secondary" disabled={busy} onClick={marcarRevisado}>Marcar revisado</button>
              )}
              <button
                className="primary"
                disabled={busy || reembolso.gastos.length === 0 || reembolso.totalReembolso <= 0}
                onClick={reembolsar}
              >
                💸 Reembolsar {fmtMoney(reembolso.totalReembolso)}
              </button>
            </>
          )}
          {frozen && (
            <div className="reembolso-frozen">
              ✓ Pagado el {fmtDate(reembolso.reembolsadoAt)}. BankTx: {reembolso.bankTransaction?.referencia ?? '—'}
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

      <BankTxPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={onBankTxPicked}
        companyId={activeCompany?.id}
        bankAccountId={reembolso.bankAccountId}
        expectedAmount={reembolso.totalReembolso}
        title={`Vincular reembolso a un movimiento bancario (${fmtMoney(reembolso.totalReembolso)})`}
      />
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
    } catch (err) { window.alert(err.message) }
  }
  return (
    <button type="button" className="link small" onClick={open}>
      📎 {gasto.comprobanteName || 'Comprobante'}
    </button>
  )
}

function GastoRowInline({ gasto, frozen, onDelete }) {
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
  const [descripcion, setDesc] = useState('')
  const [importe, setImporte] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [unidad, setUnidad] = useState('')
  const [mode, setMode] = useState('directo')
  const [insumoId, setInsumoId] = useState(null)
  const [presupuestoPartidaId, setPartidaId] = useState(null)
  const [picked, setPicked] = useState(null)
  const [categoriaIndirecto, setCategoriaIndirecto] = useState('')
  const [suggestions, setSuggestions] = useState({ insumos: [], partidas: [] })
  const [comprobanteFile, setComprobanteFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const timer = useRef(null)

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
  const switchMode = (m) => {
    setMode(m)
    if (m !== 'directo') clearPick()
    if (m !== 'indirecto') setCategoriaIndirecto('')
  }

  const submit = async (e) => {
    e.preventDefault()
    const imp = parseFloat(importe)
    if (!beneficiarioNombre.trim() || !descripcion.trim() || !(imp > 0)) {
      window.alert('Completa beneficiario, descripción e importe.'); return
    }
    const isDirecto = mode === 'directo' && (insumoId || presupuestoPartidaId)
    const isIndirecto = mode === 'indirecto' && categoriaIndirecto.trim().length > 0
    if (!isDirecto && !isIndirecto) {
      window.alert('Elige insumo/partida (directo) o una categoría indirecta.'); return
    }
    const cantNum = cantidad ? parseFloat(cantidad) : null
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/reembolsos/${reembolso.id}/gastos`, {
        method: 'POST',
        body: {
          beneficiarioNombre: beneficiarioNombre.trim(),
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
      window.alert(err.message || 'Error al agregar gasto')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="new-gasto-inline" onSubmit={submit}>
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

      <div className="mode-tabs">
        <button type="button" className={mode === 'directo' ? 'active' : ''} onClick={() => switchMode('directo')}>
          🟢 Directo
        </button>
        <button type="button" className={mode === 'indirecto' ? 'active' : ''} onClick={() => switchMode('indirecto')}>
          ⚫ Indirecto
        </button>
      </div>

      {mode === 'directo' && (
        <>
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
          {picked && (
            <div className="picked">
              Vinculado: <span className="mono">{picked.codigo ?? picked.concepto?.codigo}</span>
              <button type="button" className="link small" onClick={clearPick}>quitar</button>
            </div>
          )}
        </>
      )}

      {mode === 'indirecto' && (
        <div className="cat-chips">
          {CATEGORIAS_INDIRECTO.map(c => (
            <button
              key={c.id}
              type="button"
              className={categoriaIndirecto === c.id ? 'active' : ''}
              onClick={() => setCategoriaIndirecto(c.id)}
            >
              {c.label}
            </button>
          ))}
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
