/**
 * Facturas (CFDI) — inbox + operational matching.
 *
 * CFDIs are downloaded automatically into contabilidad-os; this surfaces them
 * in bartiz and links each one to the requisición / gasto / estimación it
 * belongs to. The match SUGGESTIONS are computed in the backend (see
 * BACKEND-CFDI.md) — the frontend confirms them one-tap or lets the user pick
 * manually. Recibidas (proveedores / AP) + Emitidas (clientes / AR).
 *
 * Data: live GET /api/construccion/cfdis when available; documented sample
 * (with embedded suggestions) otherwise so the screen renders today.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { apiFetch } from '../config/api'
import { useAuth } from '../auth/AuthContext'
import Modal from '../components/Modal'
import '../components/Modal.css'
import { Icon } from '../components/ds/Icon'
import { money } from '../lib/format'
import { alertDialog } from '../components/Dialog'
import './Facturas.css'

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const shortUuid = (u) => (u ? `…${String(u).slice(-8)}` : '—')

const TIPO_COMPROBANTE = { I: 'Ingreso', E: 'Egreso', P: 'Pago', N: 'Nómina', T: 'Traslado' }
const TARGET_LABEL = { SOLICITUD: 'Requisición', GASTO: 'Gasto', ESTIMACION: 'Estimación', BANK_TX: 'Movimiento' }

const FILTERS = [
  ['porvincular', 'Por vincular', (m) => m === 'SIN_VINCULAR' || m === 'SUGERIDA'],
  ['vinculadas', 'Vinculadas', (m) => m === 'VINCULADA' || m === 'PAGADA'],
  ['ignoradas', 'Ignoradas', (m) => m === 'IGNORADA'],
  ['todas', 'Todas', () => true],
]

export default function Facturas() {
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id

  const [tab, setTab] = useState('RECIBIDA')
  const [filter, setFilter] = useState('porvincular')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [manual, setManual] = useState(null) // cfdi being manually linked

  const reload = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    if (!companyId) {
      setRows([]); setLoading(false); return
    }
    try {
      const data = await apiFetch(`/api/construccion/cfdis?companyId=${encodeURIComponent(companyId)}&tipo=${tab}`)
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      // Nunca facturas de ejemplo: sus botones disparaban peticiones reales.
      setRows([]); setLoadError(err.message || 'No se pudieron cargar las facturas.')
    } finally {
      setLoading(false)
    }
  }, [companyId, tab])

  useEffect(() => { reload() }, [reload])

  // El renglón sólo cambia de estado cuando el backend confirma; si falla se
  // avisa y queda como estaba (antes se marcaba hecho aunque fallara).
  const applyLocal = (id, patch) =>
    setRows((arr) => arr.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const vincular = async (cfdi, candidate) => {
    setBusyId(cfdi.id)
    try {
      await apiFetch(`/api/construccion/cfdis/${cfdi.id}/vincular`, {
        method: 'POST',
        body: { tipo: candidate.tipo, targetId: candidate.targetId },
      })
      applyLocal(cfdi.id, { matchEstado: 'VINCULADA', link: { tipo: candidate.tipo, targetId: candidate.targetId, label: candidate.label }, suggestion: null })
      setManual(null)
    } catch (err) {
      alertDialog({ title: 'No se pudo vincular', message: err.message || 'Error al vincular la factura.' })
    } finally {
      setBusyId(null)
    }
  }

  const ignorar = async (cfdi) => {
    setBusyId(cfdi.id)
    try {
      await apiFetch(`/api/construccion/cfdis/${cfdi.id}/ignorar`, { method: 'POST' })
      applyLocal(cfdi.id, { matchEstado: 'IGNORADA', suggestion: null })
    } catch (err) {
      alertDialog({ title: 'No se pudo ignorar', message: err.message || 'Error al ignorar la factura.' })
    } finally {
      setBusyId(null)
    }
  }

  const filterFn = FILTERS.find((f) => f[0] === filter)?.[2] ?? (() => true)
  const visible = rows.filter((r) => filterFn(r.matchEstado))

  const summary = useMemo(() => {
    const porVincular = rows.filter((r) => r.matchEstado === 'SIN_VINCULAR' || r.matchEstado === 'SUGERIDA').length
    const sugeridas = rows.filter((r) => r.matchEstado === 'SUGERIDA').length
    const totalVigente = rows.filter((r) => r.estadoSat === 'VIGENTE').reduce((a, r) => a + (r.total || 0), 0)
    return { porVincular, sugeridas, totalVigente }
  }, [rows])

  const isRecibida = tab === 'RECIBIDA'

  return (
    <div className="ds">
      <div className="page fac">
        {/* tabs + summary */}
        <div className="page-toolbar">
          <div className="fac-tabs">
            <button className={tab === 'RECIBIDA' ? 'active' : ''} onClick={() => setTab('RECIBIDA')}>Recibidas</button>
            <button className={tab === 'EMITIDA' ? 'active' : ''} onClick={() => setTab('EMITIDA')}>Emitidas</button>
          </div>
          <div className="spacer" />
          <div className="fac-summary">
            <span><b>{summary.porVincular}</b> por vincular</span>
            <span className="sep">·</span>
            <span><b>{summary.sugeridas}</b> sugeridas</span>
            <span className="sep">·</span>
            <span>{money(summary.totalVigente)} vigente</span>
          </div>
        </div>

        {/* filter chips */}
        <div className="fac-chips">
          {FILTERS.map(([key, label]) => (
            <button key={key} className={'m-chip-like' + (filter === key ? ' active' : '')} onClick={() => setFilter(key)}>
              {label}
            </button>
          ))}
        </div>

        <div className="card" style={{ marginTop: 'var(--gap)' }}>
          <div className="card-head">
            <h3>{isRecibida ? 'Facturas recibidas' : 'Facturas emitidas'}</h3>
            <span className="hint">{isRecibida ? 'Proveedores · vincula a requisición / gasto' : 'Clientes · vincula a estimación'}</span>
          </div>

          {loading ? (
            <div className="empty">Cargando…</div>
          ) : visible.length === 0 ? (
            <div className="empty">Nada en este filtro.</div>
          ) : (
            <div className="scroll-x">
              <table className="ptable fac-table">
                <thead>
                  <tr>
                    <th>{isRecibida ? 'Emisor' : 'Receptor'}</th>
                    <th>CFDI</th>
                    <th>Fecha</th>
                    <th className="r">Total</th>
                    <th>SAT</th>
                    <th>Conciliación</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((c) => {
                    const who = isRecibida
                      ? { name: c.emisorNombre, rfc: c.emisorRfc }
                      : { name: c.receptorNombre, rfc: c.receptorRfc }
                    return (
                      <tr key={c.id} style={{ cursor: 'default' }}>
                        <td>
                          <div className="proj-name">{who.name || '—'}</div>
                          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{who.rfc}</div>
                        </td>
                        <td>
                          <div className="mono" style={{ fontSize: 12 }}>{c.serie ? `${c.serie}-` : ''}{c.folio || '—'}</div>
                          <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{shortUuid(c.uuid)} · {TIPO_COMPROBANTE[c.tipoComprobante] ?? c.tipoComprobante}</div>
                        </td>
                        <td className="small" style={{ color: 'var(--ink-2)' }}>{fmtDate(c.fecha)}</td>
                        <td className="r"><span className="money big">{money(c.total)}</span></td>
                        <td>
                          {c.estadoSat === 'CANCELADO'
                            ? <span className="status risk"><span className="sdot" />Cancelado</span>
                            : <span className="status active"><span className="sdot" />Vigente</span>}
                        </td>
                        <td>
                          <MatchCell
                            cfdi={c}
                            busy={busyId === c.id}
                            onConfirm={() => vincular(c, c.suggestion)}
                            onManual={() => setManual(c)}
                            onIgnore={() => ignorar(c)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {loadError && (
          <p className="fac-note" role="alert" style={{ color: 'var(--neg)' }}>
            No se pudieron cargar las facturas: {loadError}{' '}
            <button type="button" className="link" onClick={reload}>Reintentar</button>
          </p>
        )}
      </div>

      <Modal open={!!manual} onClose={() => setManual(null)} title="Vincular factura manualmente" size="md">
        {manual && (
          <ManualLink cfdi={manual} companyId={companyId} onPick={(cand) => vincular(manual, cand)} onClose={() => setManual(null)} />
        )}
      </Modal>
    </div>
  )
}

function MatchCell({ cfdi, busy, onConfirm, onManual, onIgnore }) {
  const m = cfdi.matchEstado
  if (m === 'VINCULADA' || m === 'PAGADA') {
    return (
      <div className="fac-linked">
        <span className="status active"><span className="sdot" />{m === 'PAGADA' ? 'Pagada' : 'Vinculada'}</span>
        {cfdi.link?.label && <span className="fac-link-label mono">{cfdi.link.label}</span>}
      </div>
    )
  }
  if (m === 'IGNORADA') return <span className="status" style={{ background: 'var(--surface-sunk)', color: 'var(--ink-3)' }}><span className="sdot" style={{ background: 'var(--ink-3)' }} />Ignorada</span>

  // SIN_VINCULAR / SUGERIDA
  return (
    <div className="fac-match">
      {cfdi.suggestion ? (
        <div className="fac-suggestion">
          <div className="fac-sug-text">
            <span className="pill brand">{Math.round((cfdi.suggestion.score ?? 0) * 100)}%</span>
            <span className="fac-sug-label">{TARGET_LABEL[cfdi.suggestion.tipo] ?? cfdi.suggestion.tipo}: <b>{cfdi.suggestion.label}</b></span>
          </div>
          <div className="fac-actions">
            <button className="btn btn-primary fac-btn" disabled={busy} onClick={onConfirm}><Icon name="check" />Vincular</button>
            <button className="btn btn-ghost fac-btn" disabled={busy} onClick={onManual}>Otra</button>
            <button className="link-btn" disabled={busy} onClick={onIgnore}>Ignorar</button>
          </div>
        </div>
      ) : (
        <div className="fac-actions">
          <span className="pill warn">Sin sugerencia</span>
          <button className="btn btn-ghost fac-btn" disabled={busy} onClick={onManual}><Icon name="link" />Buscar</button>
          <button className="link-btn" disabled={busy} onClick={onIgnore}>Ignorar</button>
        </div>
      )}
    </div>
  )
}

// Manual candidate picker — pulls ranked candidates from the backend; falls
// back to the embedded suggestion (sample mode).
function ManualLink({ cfdi, companyId, onPick, onClose }) {
  const [cands, setCands] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const data = await apiFetch(`/api/construccion/cfdis/${cfdi.id}/candidatos?companyId=${encodeURIComponent(companyId ?? '')}`)
        if (alive) setCands(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('candidatos cfdi:', err)
        if (alive) setCands(cfdi.suggestion ? [cfdi.suggestion] : [])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => { alive = false }
  }, [cfdi, companyId])

  return (
    <div className="ds fac-manual">
      <div className="fac-manual-head">
        <div className="proj-name">{cfdi.emisorNombre || cfdi.receptorNombre}</div>
        <div className="money big">{money(cfdi.total)}</div>
      </div>
      {loading ? (
        <div className="empty">Buscando candidatos…</div>
      ) : !cands || cands.length === 0 ? (
        <div className="empty">Sin candidatos. Conecta el endpoint de candidatos o vincula desde la requisición.</div>
      ) : (
        <div className="fac-cands">
          {cands.map((cand, i) => (
            <button key={i} className="fac-cand" onClick={() => onPick(cand)}>
              <div>
                <div className="fac-cand-label">{TARGET_LABEL[cand.tipo] ?? cand.tipo}: <b>{cand.label}</b></div>
                {cand.monto != null && <div className="mono" style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{money(cand.monto)}{cand.fecha ? ` · ${fmtDate(cand.fecha)}` : ''}</div>}
              </div>
              {cand.score != null && <span className="pill brand">{Math.round(cand.score * 100)}%</span>}
            </button>
          ))}
        </div>
      )}
      <div className="prov-modal-actions" style={{ marginTop: 14 }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  )
}
