/**
 * Compras por autorizar — management's purchasing queue.
 *
 * One place where Gerardo sees every requisición waiting for a decision, with
 * each supplier's price, credit condition and delivery time side by side. He
 * awards each concepto to a supplier (cheapest pre-filled), then authorizes —
 * which adjudicates the lines and flips the requisición to APROBADA so it flows
 * to tesorería for payment.
 *
 * Data: GET /solicitudes-compra?estado=PENDIENTE&withCotizaciones=1 returns the
 * partidas + cotizaciones (price/credit/delivery/award) in one shot, so the
 * whole comparison renders without per-row detail fetches.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../config/api'
import { useAuth } from '../auth/AuthContext'
import { money } from '../lib/format'
import './ComprasPorAutorizar.css'

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }) : '—'

export default function ComprasPorAutorizar() {
  const { activeCompany } = useAuth()
  const navigate = useNavigate()
  const companyId = activeCompany?.id

  const [reqs, setReqs] = useState([])
  const [loading, setLoading] = useState(true)
  // awards: { [reqId]: { [partidaId]: cotizacionId } }
  const [awards, setAwards] = useState({})
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)

  const reload = useCallback(async () => {
    if (!companyId) { setReqs([]); setLoading(false); return }
    setLoading(true)
    try {
      const data = await apiFetch(
        `/api/construccion/solicitudes-compra?companyId=${encodeURIComponent(companyId)}&estado=PENDIENTE&withCotizaciones=1`
      )
      const list = Array.isArray(data) ? data : []
      setReqs(list)
      // Seed awards from any persisted per-line winner.
      const seeded = {}
      for (const r of list) {
        const m = {}
        for (const p of r.partidas ?? []) if (p.cotizacionGanadoraId) m[p.id] = p.cotizacionGanadoraId
        seeded[r.id] = m
      }
      setAwards(seeded)
    } catch (e) {
      setError(e.message)
      setReqs([])
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => { reload() }, [reload])

  const setAward = (reqId, partidaId, cotId) =>
    setAwards((a) => {
      const cur = { ...(a[reqId] ?? {}) }
      if (cur[partidaId] === cotId) delete cur[partidaId] // toggle off
      else cur[partidaId] = cotId
      return { ...a, [reqId]: cur }
    })

  // Cheapest cotización per partida (lowest priced line). Used by "lo más barato".
  const cheapestFor = (req) => {
    const out = {}
    for (const p of req.partidas ?? []) {
      let best = null
      for (const c of req.cotizaciones ?? []) {
        const line = (c.partidas ?? []).find((l) => l.solicitudPartidaId === p.id)
        if (!line || !(line.precioUnitario > 0)) continue
        if (!best || line.precioUnitario < best.precio) best = { cotId: c.id, precio: line.precioUnitario }
      }
      if (best) out[p.id] = best.cotId
    }
    return out
  }

  const autoCheapest = (req) => setAwards((a) => ({ ...a, [req.id]: cheapestFor(req) }))
  const clearAwards = (reqId) => setAwards((a) => ({ ...a, [reqId]: {} }))

  const authorize = async (req) => {
    const map = awards[req.id] ?? {}
    const assigned = Object.keys(map).length
    const totalConcepts = (req.partidas ?? []).length
    if (assigned === 0) {
      setError('Adjudica al menos un concepto antes de autorizar.')
      return
    }
    setBusyId(req.id)
    setError(null)
    try {
      // 1) persist the per-concepto award, 2) approve → APROBADA
      await apiFetch(`/api/construccion/solicitudes-compra/${req.id}/adjudicaciones`, {
        method: 'PUT',
        body: { adjudicaciones: map },
      })
      await apiFetch(`/api/construccion/solicitudes-compra/${req.id}/aprobar`, { method: 'POST' })
      // drop it from the queue (no longer PENDIENTE)
      setReqs((rs) => rs.filter((r) => r.id !== req.id))
    } catch (e) {
      setError(`No se pudo autorizar ${req.folio}: ${e.message}`)
    } finally {
      setBusyId(null)
    }
    if (totalConcepts > assigned) {
      // non-blocking note handled in UI by the partial badge before authorizing
    }
  }

  if (loading) return <div className="ds"><div className="cpa-state">Cargando compras por autorizar…</div></div>

  return (
    <div className="ds">
      <div className="page cpa">
        <div className="cpa-intro">
          <h2>Compras por autorizar</h2>
          <p className="muted">
            Compara precio, condición de crédito y tiempo de entrega de cada proveedor,
            adjudica cada concepto y autoriza. Al autorizar pasa a tesorería para pago.
          </p>
        </div>

        {error && <div className="cpa-error">{error}</div>}

        {reqs.length === 0 ? (
          <div className="cpa-empty">
            <div className="cpa-empty-title">No hay requisiciones pendientes</div>
            <div className="muted">Cuando se envíe una requisición a autorización aparecerá aquí.</div>
          </div>
        ) : (
          reqs.map((req) => (
            <RequisicionCard
              key={req.id}
              req={req}
              award={awards[req.id] ?? {}}
              busy={busyId === req.id}
              onAward={(pid, cid) => setAward(req.id, pid, cid)}
              onAutoCheapest={() => autoCheapest(req)}
              onClear={() => clearAwards(req.id)}
              onAuthorize={() => authorize(req)}
              onOpen={() => navigate(`/requisiciones/${req.id}`)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function RequisicionCard({ req, award, busy, onAward, onAutoCheapest, onClear, onAuthorize, onOpen }) {
  const partidas = req.partidas ?? []
  const cots = req.cotizaciones ?? []
  const assigned = Object.keys(award).length
  const allAwarded = assigned === partidas.length && partidas.length > 0

  // Cheapest line per partida (for the green highlight).
  const cheapestCot = useMemo(() => {
    const out = {}
    for (const p of partidas) {
      let best = null
      for (const c of cots) {
        const l = (c.partidas ?? []).find((x) => x.solicitudPartidaId === p.id)
        if (!l || !(l.precioUnitario > 0)) continue
        if (!best || l.precioUnitario < best.precio) best = { cotId: c.id, precio: l.precioUnitario }
      }
      if (best) out[p.id] = best.cotId
    }
    return out
  }, [partidas, cots])

  // Per-supplier award summary (what each winning supplier would be paid).
  const summary = useMemo(() => {
    const bySupplier = new Map()
    for (const p of partidas) {
      const cotId = award[p.id]
      if (!cotId) continue
      const c = cots.find((x) => x.id === cotId)
      if (!c) continue
      const line = (c.partidas ?? []).find((l) => l.solicitudPartidaId === p.id)
      const imp = line?.importe ?? 0
      const cur = bySupplier.get(cotId) ?? { nombre: c.supplierNombre, credito: c.tieneCredito, dias: c.diasEntrega, total: 0, n: 0 }
      cur.total += imp
      cur.n += 1
      bySupplier.set(cotId, cur)
    }
    return [...bySupplier.values()]
  }, [partidas, cots, award])

  const grandTotal = summary.reduce((a, s) => a + s.total, 0)

  return (
    <div className="cpa-card">
      <div className="cpa-card-head">
        <div className="cpa-card-id">
          <button className="cpa-folio" onClick={onOpen} title="Abrir detalle">{req.folio}</button>
          <span className="muted small">
            {req.proyecto?.codigo ? `${req.proyecto.codigo} · ` : ''}{partidas.length} conceptos · {cots.length} proveedores · {fmtDate(req.createdAt)}
          </span>
        </div>
        <div className="cpa-card-actions">
          <button className="btn-ghost small" onClick={onAutoCheapest} disabled={busy || cots.length === 0}>Adjudicar lo más barato</button>
          {assigned > 0 && <button className="link small" onClick={onClear} disabled={busy}>Limpiar</button>}
          <button className="btn-primary small" onClick={onAuthorize} disabled={busy || assigned === 0}>
            {busy ? 'Autorizando…' : allAwarded ? 'Autorizar' : `Autorizar (${assigned}/${partidas.length})`}
          </button>
        </div>
      </div>

      {cots.length === 0 ? (
        <div className="cpa-noquotes muted">
          Sin cotizaciones aún. <button className="link small" onClick={onOpen}>Abrir para capturar precios</button>
        </div>
      ) : (
        <div className="cpa-matrix-scroll">
          <table className="cpa-matrix">
            <thead>
              <tr>
                <th className="cpa-concept">Concepto</th>
                <th className="cpa-qty">Cant.</th>
                {cots.map((c) => (
                  <th key={c.id} className="cpa-sup">
                    <div className="cpa-sup-name">{c.supplierNombre}</div>
                    <div className="cpa-sup-meta">
                      <span className={'pill ' + (c.tieneCredito ? 'pill-credito' : 'pill-contado')}>
                        {c.tieneCredito ? 'Crédito' : 'Contado'}
                      </span>
                      <span className="cpa-dias">{c.diasEntrega != null ? `${c.diasEntrega} d entrega` : 'entrega s/d'}</span>
                    </div>
                    <div className="cpa-sup-total mono">{money(c.total)}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {partidas.map((p) => (
                <tr key={p.id}>
                  <td className="cpa-concept">{p.descripcion}</td>
                  <td className="cpa-qty mono small">{p.cantidad} {p.unidad ?? ''}</td>
                  {cots.map((c) => {
                    const line = (c.partidas ?? []).find((l) => l.solicitudPartidaId === p.id)
                    const won = award[p.id] === c.id
                    const isCheapest = cheapestCot[p.id] === c.id
                    if (!line || !(line.precioUnitario > 0)) {
                      return <td key={c.id} className="cpa-cell cpa-empty-cell">—</td>
                    }
                    return (
                      <td
                        key={c.id}
                        className={'cpa-cell cpa-cell-pick' + (won ? ' won' : '') + (isCheapest && !won ? ' cheap' : '')}
                        onClick={() => !busy && onAward(p.id, c.id)}
                        title={won ? 'Adjudicado — clic para quitar' : 'Clic para adjudicar a este proveedor'}
                      >
                        <div className="cpa-pu mono">{money(line.precioUnitario)}<span className="cpa-u">/u</span></div>
                        <div className="cpa-imp muted small">{money(line.importe)}</div>
                        {won && <span className="cpa-check">✓</span>}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {summary.length > 0 && (
        <div className="cpa-summary">
          <div className="cpa-summary-title">Se autorizará a {summary.length} proveedor{summary.length > 1 ? 'es' : ''}:</div>
          <div className="cpa-summary-rows">
            {summary.map((s, i) => (
              <div className="cpa-summary-row" key={i}>
                <span className="cpa-summary-sup">{s.nombre}</span>
                <span className={'pill ' + (s.credito ? 'pill-credito' : 'pill-contado')}>{s.credito ? 'Crédito' : 'Contado'}</span>
                <span className="muted small">{s.dias != null ? `${s.dias} d` : 's/d'}</span>
                <span className="muted small">{s.n} concepto{s.n > 1 ? 's' : ''}</span>
                <span className="cpa-summary-total mono">{money(s.total)}</span>
              </div>
            ))}
          </div>
          <div className="cpa-grand">
            <span>Total adjudicado</span>
            <span className="mono">{money(grandTotal)}</span>
          </div>
          {!allAwarded && (
            <div className="cpa-partial">Faltan {partidas.length - assigned} concepto(s) por adjudicar — puedes autorizar parcialmente.</div>
          )}
        </div>
      )}
    </div>
  )
}
