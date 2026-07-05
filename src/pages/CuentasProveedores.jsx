/**
 * Cuentas de proveedores — estado de cuenta por proveedor (Fase B de la
 * cuenta corriente).
 *
 * Por proveedor: cargos (adjudicaciones autorizadas), abonos (pagos),
 * saldo abierto y anticipo disponible. Expandir un proveedor muestra el
 * detalle (adjudicaciones con su aplicado/saldo y pagos con su disponible)
 * y permite APLICAR un anticipo a las adjudicaciones abiertas (FIFO).
 *
 * Compuesto client-side de GET /adjudicaciones (todas) + GET /pagos-proveedor;
 * la única escritura es POST /pagos-proveedor/:id/aplicar.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../config/api'
import { useAuth } from '../auth/AuthContext'
import Modal from '../components/Modal'
import '../components/Modal.css'
import { money } from '../lib/format'
import './CuentasProveedores.css'

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const keyOf = (supplierId, nombre) => supplierId || `nombre:${(nombre || '').toLowerCase()}`

export default function CuentasProveedores() {
  const navigate = useNavigate()
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id

  const [adjs, setAdjs] = useState([])
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(null) // supplier key expandido
  const [aplicando, setAplicando] = useState(null) // pago con disponible > 0

  const reload = useCallback(async () => {
    if (!companyId) { setLoading(false); return }
    setLoading(true)
    try {
      const [a, p] = await Promise.all([
        apiFetch(`/api/construccion/adjudicaciones?companyId=${encodeURIComponent(companyId)}`).catch(() => []),
        apiFetch(`/api/construccion/pagos-proveedor?companyId=${encodeURIComponent(companyId)}`).catch(() => []),
      ])
      setAdjs(Array.isArray(a) ? a : [])
      setPagos(Array.isArray(p) ? p : [])
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => { reload() }, [reload])

  // Agrupar por proveedor (supplierId o nombre para texto libre).
  const cuentas = useMemo(() => {
    const m = new Map()
    const get = (sid, nombre) => {
      const k = keyOf(sid, nombre)
      if (!m.has(k)) m.set(k, { key: k, supplierId: sid ?? null, nombre: nombre ?? '—', adjs: [], pagos: [] })
      return m.get(k)
    }
    for (const a of adjs) get(a.supplierId, a.supplierNombre).adjs.push(a)
    for (const p of pagos) get(p.supplierId, p.supplierNombre).pagos.push(p)
    const out = [...m.values()].map((c) => {
      const cargos = c.adjs.reduce((s, a) => s + (Number(a.total) || 0), 0)
      const abonos = c.pagos.reduce((s, p) => s + (Number(p.monto) || 0), 0)
      const saldoAbierto = c.adjs.reduce((s, a) => s + (Number(a.saldo) || 0), 0)
      const anticipo = c.pagos.reduce((s, p) => s + (Number(p.disponible) || 0), 0)
      return { ...c, cargos, abonos, saldoAbierto, anticipo }
    })
    return out.sort((a, b) => b.saldoAbierto - a.saldoAbierto)
  }, [adjs, pagos])

  if (!companyId) return <div className="ds"><div className="page"><div className="card"><div className="empty" style={{ padding: 56 }}>Selecciona una empresa.</div></div></div></div>

  return (
    <div className="ds">
      <div className="page cprov">
        {loading ? (
          <div className="card"><div className="empty">Cargando cuentas…</div></div>
        ) : cuentas.length === 0 ? (
          <div className="card"><div className="empty">Sin movimientos aún. Autoriza compras o registra pagos para ver las cuentas.</div></div>
        ) : (
          cuentas.map((c) => (
            <div key={c.key} className="card cprov-card">
              <button type="button" className="cprov-head" onClick={() => setOpen(open === c.key ? null : c.key)}>
                <div className="cprov-name">
                  {c.nombre}
                  {!c.supplierId && <span className="pill" style={{ marginLeft: 8 }}>texto libre</span>}
                </div>
                <div className="cprov-stats">
                  <span>Cargos <b>{money(c.cargos)}</b></span>
                  <span>Abonos <b>{money(c.abonos)}</b></span>
                  <span className={c.saldoAbierto > 0.01 ? 'neg' : ''}>Saldo <b>{money(c.saldoAbierto)}</b></span>
                  {c.anticipo > 0.01 && <span className="pos">Anticipo <b>{money(c.anticipo)}</b></span>}
                </div>
              </button>

              {open === c.key && (
                <div className="cprov-detail">
                  <div className="cprov-col">
                    <h4>Cargos — compras adjudicadas</h4>
                    {c.adjs.length === 0 ? <div className="muted small">Sin adjudicaciones.</div> : (
                      <table className="ptable compact">
                        <thead><tr><th>Folio</th><th className="r">Total</th><th className="r">Aplicado</th><th className="r">Saldo</th><th>Estado</th></tr></thead>
                        <tbody>
                          {c.adjs.map((a) => (
                            <tr key={a.id} className="clickable" onClick={() => a.solicitudId && navigate(`/requisiciones/${a.solicitudId}`)}>
                              <td className="mono small">{a.folio || '—'}</td>
                              <td className="r num">{money(a.total)}</td>
                              <td className="r num">{money(a.aplicado ?? 0)}</td>
                              <td className="r num">{money(a.saldo ?? 0)}</td>
                              <td><span className={'pill ' + (a.estado === 'POR_PAGAR' ? 'warn' : a.estado === 'PARCIAL' ? '' : 'brand')}>{a.estado === 'POR_PAGAR' ? 'Por pagar' : a.estado === 'PARCIAL' ? 'Parcial' : a.estado === 'CONCILIADA' ? 'Conciliada' : 'Pagada'}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  <div className="cprov-col">
                    <h4>Abonos — pagos registrados</h4>
                    {c.pagos.length === 0 ? <div className="muted small">Sin pagos registrados.</div> : (
                      <table className="ptable compact">
                        <thead><tr><th>Fecha</th><th>Ref.</th><th className="r">Monto</th><th className="r">Disponible</th><th></th></tr></thead>
                        <tbody>
                          {c.pagos.map((p) => (
                            <tr key={p.id}>
                              <td className="small">{fmtDate(p.fecha)}</td>
                              <td className="mono small">{p.referencia || '—'}</td>
                              <td className="r num">{money(p.monto)}</td>
                              <td className="r num">{p.disponible > 0.01 ? <b>{money(p.disponible)}</b> : <span className="muted">—</span>}</td>
                              <td className="r">
                                {p.disponible > 0.01 && c.adjs.some((a) => (a.saldo ?? 0) > 0.01) && (
                                  <button className="link small" onClick={() => setAplicando({ pago: p, cuenta: c })}>Aplicar anticipo</button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <Modal open={!!aplicando} onClose={() => setAplicando(null)} title="Aplicar anticipo" size="sm">
        {aplicando && (
          <AplicarAnticipoModal
            pago={aplicando.pago}
            cuenta={aplicando.cuenta}
            onClose={() => setAplicando(null)}
            onDone={() => { setAplicando(null); reload() }}
          />
        )}
      </Modal>
    </div>
  )
}

// Distribuye el disponible de un pago (anticipo) FIFO entre las adjudicaciones
// abiertas del proveedor y confirma con POST /pagos-proveedor/:id/aplicar.
function AplicarAnticipoModal({ pago, cuenta, onClose, onDone }) {
  const abiertas = useMemo(
    () => cuenta.adjs.filter((a) => (a.saldo ?? 0) > 0.01)
      .sort((a, b) => new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0)),
    [cuenta.adjs]
  )
  const [incluidas, setIncluidas] = useState(() => new Set(abiertas.map((a) => a.id)))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const distribucion = useMemo(() => {
    let restante = pago.disponible
    const out = []
    for (const a of abiertas) {
      if (!incluidas.has(a.id) || restante <= 0.005) { out.push({ adj: a, aplicar: 0 }); continue }
      const aplicar = Math.min(a.saldo, restante)
      out.push({ adj: a, aplicar })
      restante -= aplicar
    }
    return { out, sobra: Math.max(0, restante) }
  }, [abiertas, incluidas, pago.disponible])

  const toggle = (id) => setIncluidas((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const submit = async () => {
    const aplicaciones = distribucion.out.filter((d) => d.aplicar > 0.005)
      .map((d) => ({ adjudicacionId: d.adj.id, monto: Math.round(d.aplicar * 100) / 100 }))
    if (aplicaciones.length === 0) { setError('Selecciona al menos una adjudicación.'); return }
    setBusy(true); setError(null)
    try {
      await apiFetch(`/api/construccion/pagos-proveedor/${pago.id}/aplicar`, {
        method: 'POST',
        body: { aplicaciones },
      })
      onDone?.()
    } catch (e) {
      setError(e.message || 'No se pudo aplicar')
      setBusy(false)
    }
  }

  return (
    <div className="ds">
      <p className="muted small" style={{ marginTop: 0 }}>
        Anticipo disponible de <b>{money(pago.disponible)}</b> ({cuenta.nombre}
        {pago.referencia ? ` · ref ${pago.referencia}` : ''}). Se aplica FIFO a las compras abiertas:
      </p>
      <div className="cxp-aplic-list">
        {distribucion.out.map(({ adj, aplicar }) => (
          <label key={adj.id} className={'cxp-aplic-item' + (incluidas.has(adj.id) ? '' : ' off')}>
            <input type="checkbox" checked={incluidas.has(adj.id)} onChange={() => toggle(adj.id)} />
            <span className="mono small">{adj.folio || '—'}</span>
            <span className="muted small">saldo {money(adj.saldo)}</span>
            <span className="num" style={{ marginLeft: 'auto', fontWeight: 700 }}>
              {aplicar > 0.005 ? `aplica ${money(aplicar)}` : '—'}
            </span>
          </label>
        ))}
      </div>
      {distribucion.sobra > 0.005 && (
        <div className="muted small" style={{ marginTop: 8 }}>
          Quedarán {money(distribucion.sobra)} como anticipo.
        </div>
      )}
      {error && <div className="cxp-pay-error" style={{ marginTop: 8 }}>{error}</div>}
      <div className="modal-actions" style={{ marginTop: 14 }}>
        <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancelar</button>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>
          {busy ? 'Aplicando…' : 'Aplicar'}
        </button>
      </div>
    </div>
  )
}
