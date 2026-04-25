/**
 * Gastos page — Katia's "WhatsApp → validate → pay" command center.
 *
 * Three columns:
 *   1. Pending queue (PENDIENTE gastos, newest first, click → approve+pay)
 *   2. New gasto form (beneficiario, importe, descripción, partida/insumo
 *      auto-suggest as she types)
 *   3. Caja chica panel (balance + quick filter for caja-flagged gastos)
 *
 * Rosy doesn't log in; Katia runs the whole surface.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../config/api'
import BankTxPicker from '../components/BankTxPicker'
import FileUpload from '../components/FileUpload'
import { confirmDialog, alertDialog } from '../components/Dialog'
import '../components/BankTxPicker.css'
import '../components/FileUpload.css'
import './Gastos.css'

const fmtMoney = (n) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        maximumFractionDigits: 0,
      }).format(Number(n) || 0)

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export default function Gastos() {
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id

  const [proyectos, setProyectos] = useState([])
  const [bankAccounts, setBankAccounts] = useState([])
  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('PENDIENTE') // PENDIENTE | PAGADO | ALL | CAJA

  const reload = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const [proys, accts, list] = await Promise.all([
        apiFetch(`/api/construccion/proyectos?companyId=${encodeURIComponent(companyId)}`),
        apiFetch(`/api/construccion/bank-accounts?companyId=${encodeURIComponent(companyId)}`).catch(() => []),
        apiFetch(`/api/construccion/gastos?companyId=${encodeURIComponent(companyId)}`),
      ])
      setProyectos(Array.isArray(proys) ? proys : [])
      setBankAccounts(Array.isArray(accts) ? accts : [])
      setGastos(Array.isArray(list) ? list : [])
    } catch (err) {
      console.error('Error loading gastos:', err)
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => { reload() }, [reload])

  const filtered = useMemo(() => {
    switch (filter) {
      case 'PENDIENTE': return gastos.filter(g => g.estado === 'PENDIENTE')
      case 'PAGADO':    return gastos.filter(g => g.estado === 'PAGADO')
      case 'CAJA':      return gastos.filter(g => g.caja)
      default:          return gastos
    }
  }, [gastos, filter])

  // Caja chica: use the first BankAccount with tipo=CAJA, sum its credits - debits
  const cajaAccount = useMemo(
    () => bankAccounts.find(a => a.tipo === 'CAJA'),
    [bankAccounts]
  )
  const [cajaBalance, setCajaBalance] = useState(null)

  useEffect(() => {
    if (!cajaAccount) { setCajaBalance(null); return }
    apiFetch(`/api/construccion/bank-accounts/${cajaAccount.id}/balance`)
      .then(r => setCajaBalance(r?.balance ?? null))
      .catch(() => setCajaBalance(null))
  }, [cajaAccount?.id, gastos.length])

  if (!companyId) {
    return <div className="pd-empty">Selecciona una empresa en el switcher.</div>
  }

  return (
    <div className="gastos-page">
      <header className="gastos-header">
        <h1>Gastos</h1>
        <p className="muted small">
          Solicitudes de pago que vienen por WhatsApp. Valida, confirma partida/insumo, paga en un click.
        </p>
      </header>

      <div className="gastos-grid">
        {/* ── Left: pending queue ───────────────────────────────────────── */}
        <section className="gastos-col gastos-list">
          <div className="gastos-col-head">
            <h2>Cola</h2>
            <div className="gastos-filters">
              {['PENDIENTE', 'PAGADO', 'CAJA', 'ALL'].map(f => (
                <button
                  key={f}
                  className={filter === f ? 'active' : ''}
                  onClick={() => setFilter(f)}
                >
                  {f === 'ALL' ? 'Todo' : f === 'CAJA' ? 'Caja chica' : f}
                  {f === 'PENDIENTE' && <span className="badge">{gastos.filter(g => g.estado === 'PENDIENTE').length}</span>}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="pd-empty">Cargando…</div>
          ) : filtered.length === 0 ? (
            <div className="pd-empty">Nada por aquí.</div>
          ) : (
            <ul className="gastos-items">
              {filtered.map(g => (
                <GastoRow key={g.id} gasto={g} onChange={reload} companyId={companyId} />
              ))}
            </ul>
          )}
        </section>

        {/* ── Center: new gasto form ──────────────────────────────────────── */}
        <section className="gastos-col gastos-new">
          <div className="gastos-col-head">
            <h2>Nuevo gasto</h2>
          </div>
          <NewGastoForm
            companyId={companyId}
            proyectos={proyectos}
            bankAccounts={bankAccounts}
            onCreated={reload}
          />
        </section>

        {/* ── Right: caja chica ───────────────────────────────────────────── */}
        <section className="gastos-col gastos-caja">
          <div className="gastos-col-head">
            <h2>Caja chica</h2>
          </div>
          {!cajaAccount ? (
            <div className="pd-empty">
              No hay cuenta <strong>CAJA</strong> configurada. Crea un BankAccount
              con tipo=CAJA y titular=Rosy desde contabilidad-os o el script seed.
            </div>
          ) : (
            <div className="gastos-caja-panel">
              <div className="gastos-caja-titular">
                <span className="muted small">Titular</span>
                <strong>{cajaAccount.titular ?? '—'}</strong>
              </div>
              <div className="gastos-caja-balance">
                <span className="muted small">Saldo</span>
                <strong style={{ color: cajaBalance != null && cajaBalance < 1000 ? '#dc2626' : '#0f172a' }}>
                  {cajaBalance != null ? fmtMoney(cajaBalance) : '…'}
                </strong>
              </div>
              <div className="muted small" style={{ marginTop: '0.6rem' }}>
                Recarga semanal ingresada desde Tesorería como CREDITO en esta cuenta.
                Todos los gastos con el toggle "sale de caja chica" son DEBITO aquí.
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// Opens the comprobante in a new tab. For file-stored comprobantes we
// fetch the bytes with the bearer token, convert to a blob URL, and
// open it — direct <a href> wouldn't carry the auth header. For legacy
// URL-only comprobantes we just open the URL.
function ComprobanteLink({ gasto }) {
  const open = async (type = 'gasto') => {
    if (gasto.comprobanteUrl && type === 'gasto') {
      window.open(gasto.comprobanteUrl, '_blank')
      return
    }
    try {
      const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || ''
      const token = localStorage.getItem('cadmin.token')
      const res = await fetch(
        `${base}/api/construccion/gastos/${gasto.id}/comprobante?type=${type}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) throw new Error('No se pudo abrir el comprobante')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (err) {
      alertDialog({ message: err.message || 'Error' })
    }
  }
  return (
    <button type="button" className="link small" onClick={() => open('gasto')}>
      📎 {gasto.comprobanteName || 'Comprobante'}
    </button>
  )
}

// ── Individual gasto row ─────────────────────────────────────────────────────
function GastoRow({ gasto, onChange, companyId }) {
  const [busy, setBusy] = useState(false)
  const [attributing, setAttributing] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const hasAttribution =
    !!gasto.presupuestoPartidaId || !!gasto.insumoId || gasto.indirecto === true

  const markIndirecto = async (categoria) => {
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/gastos/${gasto.id}`, {
        method: 'PATCH',
        body: { indirecto: true, categoriaIndirecto: categoria },
      })
      setAttributing(false)
      onChange?.()
    } catch (err) {
      alertDialog({ message: err.message || 'Error al vincular' })
    } finally {
      setBusy(false)
    }
  }

  const pagar = () => {
    if (!hasAttribution) {
      alertDialog({
        title: 'Atribución requerida',
        message:
          'Este gasto no tiene atribución. Vincúlalo a un insumo/partida o márcalo como indirecto antes de aprobar.',
      })
      setAttributing(true)
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
      await apiFetch(`/api/construccion/gastos/${gasto.id}/aprobar-pagar`, {
        method: 'POST',
        body,
      })
      onChange?.()
    } catch (err) {
      alertDialog({ message: err.message || 'Error al pagar' })
    } finally {
      setBusy(false)
    }
  }

  const rechazar = async () => {
    if (!(await confirmDialog({ title: 'Rechazar gasto', message: '¿Rechazar este gasto?', destructive: true, okLabel: 'Rechazar' }))) return
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/gastos/${gasto.id}`, {
        method: 'PATCH',
        body: { estado: 'RECHAZADO' },
      })
      onChange?.()
    } catch (err) {
      alertDialog({ message: err.message })
    } finally {
      setBusy(false)
    }
  }

  const eliminar = async () => {
    if (!(await confirmDialog({ title: 'Eliminar gasto', message: '¿Eliminar este gasto?', destructive: true, okLabel: 'Eliminar' }))) return
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/gastos/${gasto.id}`, { method: 'DELETE' })
      onChange?.()
    } catch (err) {
      alertDialog({ message: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className={`gasto-item estado-${gasto.estado.toLowerCase()}`}>
      <div className="gasto-row-main">
        <div>
          <strong>{gasto.beneficiarioNombre}</strong>
          <span className="muted small"> · {gasto.proyecto?.codigo}</span>
          {gasto.caja && <span className="pill caja"> CAJA</span>}
        </div>
        <strong className="importe">{fmtMoney(gasto.importe)}</strong>
      </div>
      <div className="muted small">{gasto.descripcion}</div>
      {(gasto.presupuestoPartida || gasto.insumo) && (
        <div className="small gasto-link">
          {gasto.insumo && (
            <span>
              🟢 Insumo: <span className="mono">{gasto.insumo.codigo}</span> {gasto.insumo.descripcion.slice(0, 40)}
            </span>
          )}
          {gasto.presupuestoPartida && (
            <span>
              🟢 Partida: <span className="mono">{gasto.presupuestoPartida.codigo || gasto.presupuestoPartida.concepto?.codigo}</span>
            </span>
          )}
        </div>
      )}
      {gasto.indirecto && (
        <div className="small gasto-link">
          ⚫ Indirecto: <span className="mono">{gasto.categoriaIndirecto || 'SIN CATEGORÍA'}</span>
        </div>
      )}
      {!gasto.presupuestoPartida && !gasto.insumo && !gasto.indirecto && (
        <div className="small gasto-link" style={{ color: '#dc2626' }}>
          ⚠ Sin atribución — no se puede aprobar hasta vincularlo.
        </div>
      )}
      <div className="gasto-meta small muted">
        {fmtDateTime(gasto.createdAt)} · {gasto.bankAccount?.banco} {gasto.bankAccount?.nombre}
        {gasto.estado === 'PAGADO' && ` · pagado ${fmtDateTime(gasto.pagadoAt)}`}
      </div>

      {gasto.estado === 'PENDIENTE' && !hasAttribution && attributing && (
        <div className="indirecto-picker small" style={{ marginTop: '0.5rem' }}>
          <div className="suggest-title">Marcar como indirecto — elige categoría:</div>
          <div className="cat-chips">
            {CATEGORIAS_INDIRECTO.map(c => (
              <button
                key={c.id}
                type="button"
                disabled={busy}
                onClick={() => markIndirecto(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <button type="button" className="link small" onClick={() => setAttributing(false)}>cancelar</button>
        </div>
      )}

      {gasto.estado === 'PENDIENTE' && (
        <div className="gasto-actions">
          <button className="primary small" disabled={busy} onClick={pagar}>✓ Aprobar y pagar</button>
          {!hasAttribution && !attributing && (
            <button className="secondary small" disabled={busy} onClick={() => setAttributing(true)}>
              ⚫ Marcar indirecto
            </button>
          )}
          <button className="secondary small" disabled={busy} onClick={rechazar}>rechazar</button>
          <button className="link small danger" disabled={busy} onClick={eliminar}>eliminar</button>
        </div>
      )}
      {(gasto.comprobanteUrl || gasto.comprobanteName) && (
        <ComprobanteLink gasto={gasto} />
      )}

      <BankTxPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={onBankTxPicked}
        companyId={companyId}
        bankAccountId={gasto.bankAccount?.id}
        expectedAmount={gasto.importe}
        title={`Pagar ${fmtMoney(gasto.importe)} a ${gasto.beneficiarioNombre}`}
      />
    </li>
  )
}

// Preset list of common indirect categories. Rosy's GASTOS SEMANA 1 analysis
// surfaced these as the real buckets field spending falls into when it
// can't be attributed to a specific insumo/partida. Free-text input below
// the buttons lets Katia add new ones (LIMPIEZA, TELEFONIA, etc).
const CATEGORIAS_INDIRECTO = [
  { id: 'GASOLINA',          label: 'Gasolina' },
  { id: 'VIATICOS',          label: 'Viáticos' },
  { id: 'ALIMENTOS',         label: 'Alimentos' },
  { id: 'FLETE_TRANSPORTE',  label: 'Flete / transporte' },
  { id: 'HERRAMIENTA_MENOR', label: 'Herramienta menor' },
  { id: 'EQUIPO_SEGURIDAD',  label: 'Equipo de seguridad' },
  { id: 'RENTA_EQUIPO',      label: 'Renta de equipo (andamios…)' },
  { id: 'PAPELERIA',         label: 'Papelería / oficina' },
  { id: 'OTROS',             label: 'Otros' },
]

// ── New gasto form with live suggest + 3-mode picker ─────────────────────────
function NewGastoForm({ companyId, proyectos, bankAccounts, onCreated }) {
  const [proyectoId, setProyectoId] = useState('')
  const [bankAccountId, setBankAccountId] = useState('')
  const [beneficiarioNombre, setBeneficiario] = useState('')
  const [descripcion, setDesc] = useState('')
  const [importe, setImporte] = useState('')
  const [comprobanteFile, setComprobanteFile] = useState(null) // { data, mime, name }

  // One of three attribution modes must be set before approval.
  // Default 'directo' — if user types and picks a suggestion, it stays here.
  // 'indirecto' flips to the categoría picker. 'nuevo' opens a mini create
  // form (v2 — for now it's a stub that sets indirecto OTROS with a reminder).
  const [mode, setMode] = useState('directo')
  const [presupuestoPartidaId, setPartidaId] = useState(null)
  const [insumoId, setInsumoId] = useState(null)
  const [picked, setPicked] = useState(null)
  const [categoriaIndirecto, setCategoriaIndirecto] = useState('')
  const [suggestions, setSuggestions] = useState({ insumos: [], partidas: [] })
  const [busy, setBusy] = useState(false)
  const timer = useRef(null)

  // Default project & account when loaded
  useEffect(() => {
    if (proyectos.length && !proyectoId) setProyectoId(proyectos[0].id)
  }, [proyectos, proyectoId])
  useEffect(() => {
    if (bankAccounts.length && !bankAccountId) {
      const main = bankAccounts.find(a => a.tipo === 'CHEQUES') ?? bankAccounts[0]
      setBankAccountId(main.id)
    }
  }, [bankAccounts, bankAccountId])

  // Live suggest as user types descripción
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    const q = descripcion.trim()
    if (q.length < 2 || !proyectoId) {
      setSuggestions({ insumos: [], partidas: [] })
      return
    }
    timer.current = setTimeout(() => {
      apiFetch(
        `/api/construccion/gastos/sugerir?companyId=${encodeURIComponent(companyId)}&proyectoId=${encodeURIComponent(proyectoId)}&q=${encodeURIComponent(q)}`
      ).then(setSuggestions).catch(() => {})
    }, 300)
    return () => clearTimeout(timer.current)
  }, [descripcion, proyectoId, companyId])

  const pickInsumo = (i) => {
    setInsumoId(i.id)
    setPartidaId(null)
    setPicked({ tipo: 'insumo', ...i })
  }
  const pickPartida = (p) => {
    setPartidaId(p.id)
    setInsumoId(null)
    setPicked({ tipo: 'partida', ...p })
  }
  const clearPick = () => {
    setInsumoId(null)
    setPartidaId(null)
    setPicked(null)
  }
  const switchMode = (m) => {
    setMode(m)
    // Clearing prior state keeps invariants: only one attribution can stick
    if (m !== 'directo') clearPick()
    if (m !== 'indirecto') setCategoriaIndirecto('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!proyectoId || !bankAccountId || !beneficiarioNombre || !descripcion) {
      alertDialog({ message: 'Completa beneficiario, descripción, proyecto y cuenta.' })
      return
    }
    const imp = parseFloat(importe)
    if (!(imp > 0)) { alertDialog({ message: 'Importe inválido' }); return }

    // Enforce: exactly one of directo / indirecto / nuevo must have a value.
    const isDirecto = mode === 'directo' && (presupuestoPartidaId || insumoId)
    const isIndirecto = mode === 'indirecto' && categoriaIndirecto.trim().length > 0
    if (!isDirecto && !isIndirecto) {
      alertDialog({
        title: 'Atribución requerida',
        message:
          'Vincula el gasto a un insumo/partida, o márcalo como indirecto con una categoría. No se puede aprobar sin atribución.',
      })
      return
    }

    setBusy(true)
    try {
      await apiFetch('/api/construccion/gastos', {
        method: 'POST',
        body: {
          proyectoId,
          bankAccountId,
          beneficiarioNombre: beneficiarioNombre.trim(),
          descripcion: descripcion.trim(),
          importe: imp,
          presupuestoPartidaId: isDirecto ? presupuestoPartidaId : null,
          insumoId: isDirecto ? insumoId : null,
          indirecto: isIndirecto,
          categoriaIndirecto: isIndirecto ? categoriaIndirecto.trim() : null,
          // Either an uploaded file (base64) or nothing. URL path deprecated.
          comprobanteData: comprobanteFile?.data ?? null,
          comprobanteMime: comprobanteFile?.mime ?? null,
          comprobanteName: comprobanteFile?.name ?? null,
        },
      })
      setBeneficiario('')
      setDesc('')
      setImporte('')
      setComprobanteFile(null)
      clearPick()
      setCategoriaIndirecto('')
      setMode('directo')
      onCreated?.()
    } catch (err) {
      alertDialog({ message: err.message || 'Error al crear gasto' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="gasto-form" onSubmit={submit}>
      <label>
        <span>Proyecto</span>
        <select value={proyectoId} onChange={(e) => { setProyectoId(e.target.value); clearPick() }}>
          {proyectos.map(p => <option key={p.id} value={p.id}>{p.codigo} {p.nombre}</option>)}
        </select>
      </label>

      <label>
        <span>Beneficiario</span>
        <input value={beneficiarioNombre} onChange={(e) => setBeneficiario(e.target.value)} placeholder="Lesly Flores, Jose Luis…" />
      </label>

      <label>
        <span>Importe</span>
        <input type="number" step="0.01" value={importe} onChange={(e) => setImporte(e.target.value)} placeholder="0.00" />
      </label>

      <label>
        <span>Descripción</span>
        <input value={descripcion} onChange={(e) => setDesc(e.target.value)} placeholder="varilla arena, sellador, PSP…" />
      </label>

      {/* 3-mode attribution picker. Every gasto MUST fall into exactly one
          of these before it can be approved (backend enforces it too). */}
      <div className="mode-tabs" role="tablist">
        <button
          type="button"
          className={mode === 'directo' ? 'active' : ''}
          onClick={() => switchMode('directo')}
        >
          🟢 Directo (insumo/partida)
        </button>
        <button
          type="button"
          className={mode === 'indirecto' ? 'active' : ''}
          onClick={() => switchMode('indirecto')}
        >
          ⚫ Indirecto (overhead)
        </button>
      </div>

      {/* Mode 1: Directo — auto-suggest from descripcion */}
      {mode === 'directo' && (
        <>
          {(suggestions.insumos.length > 0 || suggestions.partidas.length > 0) && !picked && (
            <div className="suggest-box">
              {suggestions.insumos.length > 0 && (
                <div>
                  <div className="suggest-title">Insumos sugeridos</div>
                  {suggestions.insumos.slice(0, 5).map(i => (
                    <button type="button" key={i.id} className="suggest-item" onClick={() => pickInsumo(i)}>
                      <span className="mono">{i.codigo}</span> {i.descripcion.slice(0, 50)}
                      <span className="muted small"> · {i.unidad} · ${i.costoActual?.toFixed(2) ?? '—'}/u</span>
                    </button>
                  ))}
                </div>
              )}
              {suggestions.partidas.length > 0 && (
                <div>
                  <div className="suggest-title">Partidas del presupuesto</div>
                  {suggestions.partidas.slice(0, 5).map(p => (
                    <button type="button" key={p.id} className="suggest-item" onClick={() => pickPartida(p)}>
                      <span className="mono">{p.codigo ?? p.concepto?.codigo}</span> {p.concepto?.descripcion?.slice(0, 40)}
                      <span className="muted small"> · queda {fmtMoney(p.queda)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {picked && (
            <div className="picked">
              <span className="small">Vinculado: </span>
              {picked.tipo === 'insumo' ? (
                <><span className="mono">{picked.codigo}</span> {picked.descripcion?.slice(0, 40)}</>
              ) : (
                <><span className="mono">{picked.codigo ?? picked.concepto?.codigo}</span> {picked.concepto?.descripcion?.slice(0, 40)} <span className="muted small">· queda {fmtMoney(picked.queda)}</span></>
              )}
              <button type="button" className="link small" onClick={clearPick}>quitar</button>
            </div>
          )}
          {!picked && descripcion.trim().length >= 2 &&
            suggestions.insumos.length === 0 &&
            suggestions.partidas.length === 0 && (
              <div className="muted small suggest-empty">
                Sin coincidencias en el catálogo. Marca como <button type="button" className="link small" onClick={() => switchMode('indirecto')}>indirecto</button> si es overhead, o pide a Juan crear un insumo nuevo.
              </div>
            )}
        </>
      )}

      {/* Mode 2: Indirecto — pick a categoría */}
      {mode === 'indirecto' && (
        <div className="indirecto-picker">
          <div className="suggest-title">Categoría del gasto indirecto</div>
          <div className="cat-chips">
            {CATEGORIAS_INDIRECTO.map(c => (
              <button
                type="button"
                key={c.id}
                className={categoriaIndirecto === c.id ? 'active' : ''}
                onClick={() => setCategoriaIndirecto(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
          <input
            className="cat-other"
            value={CATEGORIAS_INDIRECTO.some(c => c.id === categoriaIndirecto) ? '' : categoriaIndirecto}
            onChange={(e) => setCategoriaIndirecto(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
            placeholder="…o escribe una nueva (ej. LIMPIEZA)"
          />
        </div>
      )}

      <label>
        <span>Pagado desde</span>
        <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
          {bankAccounts.map(a => (
            <option key={a.id} value={a.id}>
              {a.banco} {a.nombre} {a.tipo === 'CAJA' ? '(Caja chica)' : a.tipo === 'TARJETA_DEPARTAMENTAL' ? `(TD ${a.titular ?? ''})` : ''}
            </option>
          ))}
        </select>
      </label>

      <label className="stack">
        <span>Comprobante (foto / PDF)</span>
        <FileUpload value={comprobanteFile} onChange={setComprobanteFile} />
      </label>

      <button type="submit" className="primary" disabled={busy}>
        {busy ? 'Guardando…' : '+ Crear (queda PENDIENTE)'}
      </button>
      <div className="muted small">
        Una vez creado, se aprueba y paga con un click desde la cola.
      </div>
    </form>
  )
}
