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
                <GastoRow key={g.id} gasto={g} onChange={reload} />
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

// ── Individual gasto row ─────────────────────────────────────────────────────
function GastoRow({ gasto, onChange }) {
  const [busy, setBusy] = useState(false)

  const pagar = async () => {
    if (!window.confirm(`Pagar ${fmtMoney(gasto.importe)} a ${gasto.beneficiarioNombre}?`)) return
    setBusy(true)
    try {
      const fecha = window.prompt('Fecha del pago (YYYY-MM-DD):', new Date().toISOString().slice(0, 10))
      const referencia = window.prompt('Referencia SPEI (opcional):') || null
      await apiFetch(`/api/construccion/gastos/${gasto.id}/aprobar-pagar`, {
        method: 'POST',
        body: {
          fecha: fecha ? new Date(fecha + 'T12:00:00').toISOString() : undefined,
          referencia: referencia?.trim() || null,
        },
      })
      onChange?.()
    } catch (err) {
      window.alert(err.message || 'Error al pagar')
    } finally {
      setBusy(false)
    }
  }

  const rechazar = async () => {
    if (!window.confirm('¿Rechazar este gasto?')) return
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/gastos/${gasto.id}`, {
        method: 'PATCH',
        body: { estado: 'RECHAZADO' },
      })
      onChange?.()
    } catch (err) {
      window.alert(err.message)
    } finally {
      setBusy(false)
    }
  }

  const eliminar = async () => {
    if (!window.confirm('¿Eliminar?')) return
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/gastos/${gasto.id}`, { method: 'DELETE' })
      onChange?.()
    } catch (err) {
      window.alert(err.message)
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
              Insumo: <span className="mono">{gasto.insumo.codigo}</span> {gasto.insumo.descripcion.slice(0, 40)}
            </span>
          )}
          {gasto.presupuestoPartida && (
            <span>
              Partida: <span className="mono">{gasto.presupuestoPartida.codigo || gasto.presupuestoPartida.concepto?.codigo}</span>
            </span>
          )}
        </div>
      )}
      <div className="gasto-meta small muted">
        {fmtDateTime(gasto.createdAt)} · {gasto.bankAccount?.banco} {gasto.bankAccount?.nombre}
        {gasto.estado === 'PAGADO' && ` · pagado ${fmtDateTime(gasto.pagadoAt)}`}
      </div>

      {gasto.estado === 'PENDIENTE' && (
        <div className="gasto-actions">
          <button className="primary small" disabled={busy} onClick={pagar}>✓ Aprobar y pagar</button>
          <button className="secondary small" disabled={busy} onClick={rechazar}>rechazar</button>
          <button className="link small danger" disabled={busy} onClick={eliminar}>eliminar</button>
        </div>
      )}
      {gasto.comprobanteUrl && (
        <a href={gasto.comprobanteUrl} target="_blank" rel="noreferrer" className="link small">📎 Comprobante</a>
      )}
    </li>
  )
}

// ── New gasto form with live suggest ──────────────────────────────────────────
function NewGastoForm({ companyId, proyectos, bankAccounts, onCreated }) {
  const [proyectoId, setProyectoId] = useState('')
  const [bankAccountId, setBankAccountId] = useState('')
  const [beneficiarioNombre, setBeneficiario] = useState('')
  const [descripcion, setDesc] = useState('')
  const [importe, setImporte] = useState('')
  const [comprobanteUrl, setComprobante] = useState('')
  const [presupuestoPartidaId, setPartidaId] = useState(null)
  const [insumoId, setInsumoId] = useState(null)
  const [picked, setPicked] = useState(null)
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

  const submit = async (e) => {
    e.preventDefault()
    if (!proyectoId || !bankAccountId || !beneficiarioNombre || !descripcion) {
      window.alert('Completa beneficiario, descripción, proyecto y cuenta.')
      return
    }
    const imp = parseFloat(importe)
    if (!(imp > 0)) { window.alert('Importe inválido'); return }
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
          presupuestoPartidaId,
          insumoId,
          comprobanteUrl: comprobanteUrl?.trim() || null,
        },
      })
      setBeneficiario('')
      setDesc('')
      setImporte('')
      setComprobante('')
      clearPick()
      onCreated?.()
    } catch (err) {
      window.alert(err.message || 'Error al crear gasto')
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

      {/* Suggestions */}
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

      <label>
        <span>URL del comprobante (WhatsApp foto)</span>
        <input value={comprobanteUrl} onChange={(e) => setComprobante(e.target.value)} placeholder="https://…" />
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
