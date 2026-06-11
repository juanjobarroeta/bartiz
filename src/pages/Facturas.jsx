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

// ── Sample fallback (with backend-style suggestions) ─────────────────────────
const SAMPLE = {
  RECIBIDA: [
    { id: 'c1', uuid: 'A1B2C3D4-1111', serie: 'A', folio: '1288', tipo: 'RECIBIDA', tipoComprobante: 'I', emisorRfc: 'RYS010101AB1', emisorNombre: 'Cementos RYSCO', fecha: '2026-06-03', subtotal: 86207, iva: 13793, total: 100000, estadoSat: 'VIGENTE', matchEstado: 'SUGERIDA', supplier: { razonSocial: 'Cementos RYSCO' }, suggestion: { tipo: 'SOLICITUD', targetId: 'sol_288', label: 'REQ-0288 · Platino 2br', monto: 100000, score: 0.94 } },
    { id: 'c2', uuid: 'A1B2C3D4-2222', serie: 'A', folio: '9043', tipo: 'RECIBIDA', tipoComprobante: 'I', emisorRfc: 'ACE020202CD2', emisorNombre: 'Aceros del Centro S.A.', fecha: '2026-06-05', subtotal: 107328, iva: 17172, total: 124500, estadoSat: 'VIGENTE', matchEstado: 'SUGERIDA', supplier: { razonSocial: 'Aceros del Centro S.A.' }, suggestion: { tipo: 'SOLICITUD', targetId: 'sol_291', label: 'REQ-0291 · Platino 2br', monto: 124500, score: 0.88 } },
    { id: 'c3', uuid: 'A1B2C3D4-3333', serie: '', folio: '551', tipo: 'RECIBIDA', tipoComprobante: 'I', emisorRfc: 'XAXX010101000', emisorNombre: 'Ferretería La Obra', fecha: '2026-06-06', subtotal: 17112, iva: 2738, total: 19850, estadoSat: 'VIGENTE', matchEstado: 'SIN_VINCULAR', supplier: { razonSocial: 'Ferretería La Obra' }, suggestion: null },
    { id: 'c4', uuid: 'A1B2C3D4-4444', serie: 'B', folio: '77', tipo: 'RECIBIDA', tipoComprobante: 'I', emisorRfc: 'GAS960101AAA', emisorNombre: 'Gasolinera Periférico', fecha: '2026-06-02', subtotal: 1724, iva: 276, total: 2000, estadoSat: 'VIGENTE', matchEstado: 'IGNORADA', supplier: null, suggestion: null },
    { id: 'c5', uuid: 'A1B2C3D4-5555', serie: 'A', folio: '1280', tipo: 'RECIBIDA', tipoComprobante: 'I', emisorRfc: 'ARR050505EE5', emisorNombre: 'Arrendadora de Equipo MX', fecha: '2026-05-28', subtotal: 55172, iva: 8828, total: 64000, estadoSat: 'VIGENTE', matchEstado: 'VINCULADA', supplier: { razonSocial: 'Arrendadora de Equipo MX' }, suggestion: null, link: { tipo: 'SOLICITUD', targetId: 'sol_280', label: 'REQ-0280 · Platino 2br' } },
  ],
  EMITIDA: [
    { id: 'e1', uuid: 'Z9Y8X7W6-1111', serie: 'F', folio: '204', tipo: 'EMITIDA', tipoComprobante: 'I', receptorRfc: 'CLI120120XYZ', receptorNombre: 'Inmobiliaria Platino', fecha: '2026-06-01', subtotal: 94267, iva: 15083, total: 109350, estadoSat: 'VIGENTE', matchEstado: 'SUGERIDA', suggestion: { tipo: 'ESTIMACION', targetId: 'est_1', label: 'EST. 1 · Platino 2br', monto: 109350, score: 0.97 } },
    { id: 'e2', uuid: 'Z9Y8X7W6-2222', serie: 'F', folio: '205', tipo: 'EMITIDA', tipoComprobante: 'P', receptorRfc: 'CLI120120XYZ', receptorNombre: 'Inmobiliaria Platino', fecha: '2026-06-08', subtotal: 0, iva: 0, total: 109350, estadoSat: 'VIGENTE', matchEstado: 'SIN_VINCULAR', suggestion: null },
  ],
}

export default function Facturas() {
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id

  const [tab, setTab] = useState('RECIBIDA')
  const [filter, setFilter] = useState('porvincular')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [usingSample, setUsingSample] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [manual, setManual] = useState(null) // cfdi being manually linked

  const reload = useCallback(async () => {
    setLoading(true)
    if (!companyId) {
      setRows(SAMPLE[tab]); setUsingSample(true); setLoading(false); return
    }
    try {
      const data = await apiFetch(`/api/construccion/cfdis?companyId=${encodeURIComponent(companyId)}&tipo=${tab}`)
      if (Array.isArray(data) && data.length) { setRows(data); setUsingSample(false) }
      else if (Array.isArray(data)) { setRows([]); setUsingSample(false) }
      else { setRows(SAMPLE[tab]); setUsingSample(true) }
    } catch {
      setRows(SAMPLE[tab]); setUsingSample(true)
    } finally {
      setLoading(false)
    }
  }, [companyId, tab])

  useEffect(() => { reload() }, [reload])

  // Optimistic link/ignore. Falls through to a local update if the endpoint
  // isn't there yet (sample mode), so the UX is demoable today.
  const applyLocal = (id, patch) =>
    setRows((arr) => arr.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const vincular = async (cfdi, candidate) => {
    setBusyId(cfdi.id)
    try {
      await apiFetch(`/api/construccion/cfdis/${cfdi.id}/vincular`, {
        method: 'POST',
        body: { tipo: candidate.tipo, targetId: candidate.targetId },
      })
    } catch { /* sample mode: optimistic only */ }
    applyLocal(cfdi.id, { matchEstado: 'VINCULADA', link: { tipo: candidate.tipo, targetId: candidate.targetId, label: candidate.label }, suggestion: null })
    setBusyId(null)
    setManual(null)
  }

  const ignorar = async (cfdi) => {
    setBusyId(cfdi.id)
    try {
      await apiFetch(`/api/construccion/cfdis/${cfdi.id}/ignorar`, { method: 'POST' })
    } catch { /* optimistic */ }
    applyLocal(cfdi.id, { matchEstado: 'IGNORADA', suggestion: null })
    setBusyId(null)
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

        {usingSample && (
          <p className="fac-note">
            Mostrando CFDIs de muestra con sugerencias de ejemplo. Se llenará con las facturas
            descargadas en contabilidad-os y las sugerencias del backend en cuanto el endpoint
            <span className="mono"> /cfdis</span> esté disponible.
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
      } catch {
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
