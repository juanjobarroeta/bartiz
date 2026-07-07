/**
 * Tesorería — bank accounts + recent movements, rebuilt on the DECOLSA
 * design system (`.ds`).
 *
 * Two-pane layout (left: accounts grouped by tipo with balances + 30-day
 * flow; right: movements of the selected account with status chips +
 * entity-link descriptors). The live data flow is unchanged — accounts and
 * transactions come from contabilidad-os, and bank-statement import (CSV /
 * PDF text) reuses the same backend dedup + auto-categorize helper.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../config/api'
import Modal from '../components/Modal'
import { alertDialog } from '../components/Dialog'
import { Icon } from '../components/ds/Icon'
import '../components/Modal.css'
import './TesoreriaBartiz.css'

const fmtMoney = (n) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        maximumFractionDigits: 2,
      }).format(Number(n) || 0)
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }) : '—'

const TIPO_LABEL = {
  CHEQUES: 'Cuentas operativas',
  TARJETA_DEPARTAMENTAL: 'Tarjetas departamentales',
  CAJA: 'Caja chica',
}

// Movement status → design-system chip tone + label.
const STATUS_META = {
  MATCHED: { cls: 'active', label: 'Conciliado' },
  UNMATCHED: { cls: 'risk', label: 'Sin conciliar' },
  IGNORED: { cls: 'plan', label: 'Ignorado' },
}

const FILTERS = [
  ['ALL', 'Todos'],
  ['UNMATCHED', 'Sin conciliar'],
  ['MATCHED', 'Conciliados'],
  ['IGNORED', 'Ignorados'],
]

export default function TesoreriaBartiz() {
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id

  const [accounts, setAccounts] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [txs, setTxs] = useState([])
  const [txLoading, setTxLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [uploadOpen, setUploadOpen] = useState(false)
  // Movimiento en proceso de conciliación manual (abre el modal de candidatos).
  const [conciliando, setConciliando] = useState(null)
  const [autoBusy, setAutoBusy] = useState(false)

  // Load accounts with balances baked in
  useEffect(() => {
    if (!companyId) return
    setLoading(true)
    apiFetch(`/api/construccion/bank-accounts?companyId=${encodeURIComponent(companyId)}&withBalances=true`)
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setAccounts(list)
        if (list.length > 0 && !selected) setSelected(list[0].id)
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [companyId]) // eslint-disable-line

  // Load txs for the selected account
  const reloadTxs = useCallback(async () => {
    if (!selected || !companyId) return
    setTxLoading(true)
    try {
      const params = new URLSearchParams({ companyId, bankAccountId: selected, limit: '100' })
      params.set('onlyDebitos', 'false')
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      const data = await apiFetch(`/api/construccion/bank-transactions?${params.toString()}`)
      setTxs(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
    } finally {
      setTxLoading(false)
    }
  }, [selected, companyId, statusFilter])

  useEffect(() => {
    reloadTxs()
  }, [reloadTxs])

  // Corre el auto-conciliador fiscal (solo empates de alta confianza) para
  // todas las cuentas de la empresa.
  const autoConciliar = async () => {
    setAutoBusy(true)
    try {
      const r = await apiFetch('/api/construccion/bank-transactions/auto-conciliar', {
        method: 'POST',
        body: { companyId },
      })
      await reloadTxs()
      alertDialog({
        title: 'Auto-conciliación',
        message: r.matched > 0
          ? `${r.matched} movimiento${r.matched === 1 ? '' : 's'} conciliado${r.matched === 1 ? '' : 's'} automáticamente (de ${r.total} sin conciliar).`
          : `Sin empates automáticos de alta confianza (${r.total} movimientos sin conciliar). Concílialos manualmente con el botón Conciliar.`,
      })
    } catch (e) {
      alertDialog({ message: e.message || 'No se pudo correr la auto-conciliación' })
    } finally {
      setAutoBusy(false)
    }
  }

  const desconciliar = async (tx) => {
    try {
      await apiFetch(`/api/construccion/bank-transactions/${tx.id}/desconciliar`, { method: 'POST' })
      reloadTxs()
    } catch (e) {
      alertDialog({ message: e.message || 'No se pudo desconciliar' })
    }
  }

  const grouped = useMemo(() => {
    const m = new Map()
    for (const a of accounts) {
      const k = a.tipo ?? 'OTROS'
      if (!m.has(k)) m.set(k, [])
      m.get(k).push(a)
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [accounts])

  if (!companyId) {
    return (
      <div className="ds">
        <div className="page">
          <div className="card">
            <div className="empty" style={{ padding: 56 }}>Selecciona una empresa.</div>
          </div>
        </div>
      </div>
    )
  }

  const totalGlobal = accounts.reduce((a, x) => a + (x.balance ?? 0), 0)
  const selectedAcc = accounts.find((a) => a.id === selected)

  return (
    <div className="ds">
      <div className="page">
        {loading ? (
          <div className="card">
            <div className="state-card">Cargando…</div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="card">
            <div className="empty" style={{ padding: 56 }}>
              No hay cuentas configuradas. Agrégalas desde contabilidad-os → Bancos.
            </div>
          </div>
        ) : (
          <div className="grid-main teso-grid">
            {/* Left: accounts */}
            <div className="col">
              <div className="card">
                <div className="saldo-hero">
                  <div className="lbl">Saldo total</div>
                  <div className="v">{fmtMoney(totalGlobal)}</div>
                </div>
                {grouped.map(([tipo, list]) => {
                  const grpTotal = list.reduce((a, x) => a + (x.balance ?? 0), 0)
                  return (
                    <div key={tipo}>
                      <div className="teso-group-head">
                        <span>{TIPO_LABEL[tipo] ?? tipo}</span>
                        <span className="num">{fmtMoney(grpTotal)}</span>
                      </div>
                      {list.map((a) => (
                        <button
                          key={a.id}
                          className={'teso-acc' + (selected === a.id ? ' active' : '')}
                          onClick={() => setSelected(a.id)}
                        >
                          <div className="bank-ic">
                            <Icon name="bank" />
                          </div>
                          <div className="teso-acc-main">
                            <div className="bank-name">
                              {a.banco}{' '}
                              <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>{a.nombre}</span>
                            </div>
                            <div className="bank-meta">
                              {a.numeroCuenta ? `··${String(a.numeroCuenta).slice(-4)} · ` : ''}
                              {a.transactionCount ?? 0} mov.
                            </div>
                            {a.titular && <div className="bank-meta">Titular: {a.titular}</div>}
                          </div>
                          <div className="bank-amt">
                            <div className={'v' + (a.balance < 0 ? ' neg' : '')}>{fmtMoney(a.balance)}</div>
                            <div className={'d teso-flow ' + (a.flow30d >= 0 ? 'up' : 'down')}>
                              {a.flow30d >= 0 ? '↑' : '↓'} {fmtMoney(Math.abs(a.flow30d ?? 0))} · 30d
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right: transactions */}
            <div className="col">
              {selectedAcc ? (
                <div className="card">
                  <div className="card-head">
                    <div>
                      <h3>
                        {selectedAcc.banco}{' '}
                        <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>{selectedAcc.nombre}</span>
                      </h3>
                      <div className="bank-meta">
                        {selectedAcc.tipo} · cuenta {selectedAcc.numeroCuenta}
                      </div>
                    </div>
                    <div className="spacer" />
                    <button className="btn btn-ghost" onClick={autoConciliar} disabled={autoBusy} title="Empata automáticamente movimientos con CFDIs (solo coincidencias de alta confianza)">
                      <Icon name="shuffle" />
                      {autoBusy ? 'Conciliando…' : 'Auto-conciliar'}
                    </button>
                    <button className="btn btn-dark" onClick={() => setUploadOpen(true)}>
                      <Icon name="external" style={{ transform: 'rotate(-90deg)' }} />
                      Importar movimientos
                    </button>
                  </div>

                  <div className="card-pad" style={{ borderBottom: '1px solid var(--line)' }}>
                    <div className="seg">
                      {FILTERS.map(([f, label]) => (
                        <button
                          key={f}
                          className={statusFilter === f ? 'active' : ''}
                          onClick={() => setStatusFilter(f)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Modal
                    open={!!conciliando}
                    onClose={() => setConciliando(null)}
                    title="Conciliar movimiento con CFDI"
                    size="md"
                  >
                    {conciliando && (
                      <ConciliarModal
                        tx={conciliando}
                        onClose={() => setConciliando(null)}
                        onDone={() => { setConciliando(null); reloadTxs() }}
                      />
                    )}
                  </Modal>

                  <Modal
                    open={uploadOpen}
                    onClose={() => setUploadOpen(false)}
                    title={`Importar movimientos a ${selectedAcc.banco} ${selectedAcc.nombre}`}
                    size="md"
                  >
                    <ImportForm
                      bankAccountId={selectedAcc.id}
                      onClose={() => setUploadOpen(false)}
                      onImported={() => {
                        setUploadOpen(false)
                        reloadTxs()
                      }}
                    />
                  </Modal>

                  {txLoading ? (
                    <div className="state-card">Cargando movimientos…</div>
                  ) : txs.length === 0 ? (
                    <div className="empty">Sin movimientos en este filtro.</div>
                  ) : (
                    <div className="scroll-x">
                      <table className="ptable">
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Descripción</th>
                            <th>Status</th>
                            <th>Vinculado a</th>
                            <th className="r">Monto</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {txs.map((t) => {
                            const meta = STATUS_META[t.status] ?? STATUS_META.UNMATCHED
                            const linkedTo = t.gastoPagado
                              ? `Gasto · ${t.gastoPagado.beneficiarioNombre} · ${fmtMoney(t.gastoPagado.importe)}`
                              : t.reembolsoPagado
                              ? `Reembolso semanal ${fmtDate(t.reembolsoPagado.semanaInicio)}–${fmtDate(t.reembolsoPagado.semanaFin)}`
                              : t.rayaPagada
                              ? `Raya ${t.rayaPagada.id.slice(0, 8)}`
                              : t.invoice
                              ? `CFDI ${[t.invoice.serie, t.invoice.folio].filter(Boolean).join('-') || (t.invoice.uuid ? t.invoice.uuid.slice(0, 8) + '…' : '')} · ${fmtMoney(t.invoice.total)}`
                              : null
                            const positive = t.tipo === 'CREDITO' || (t.monto ?? 0) >= 0
                            return (
                              <tr key={t.id} style={{ cursor: 'default' }}>
                                <td className="mono" style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
                                  {fmtDate(t.fecha)}
                                </td>
                                <td>
                                  <div className="proj-name" style={{ fontSize: 13.5 }}>
                                    {t.descripcion?.slice(0, 60) || '—'}
                                  </div>
                                  {t.referencia && (
                                    <div className="bank-meta">Ref: {t.referencia}</div>
                                  )}
                                </td>
                                <td>
                                  <span className={'status ' + meta.cls}>
                                    <span className="sdot" />
                                    {meta.label}
                                  </span>
                                  {t.source === 'MANUAL' && (
                                    <span
                                      className="pill"
                                      style={{ marginLeft: 6, fontSize: 10.5 }}
                                      title="Creado por flujo de pago, no por importación de CSV. Reimporta el estado de cuenta para que esta línea coincida con el banco real."
                                    >
                                      manual
                                    </span>
                                  )}
                                </td>
                                <td style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                                  {linkedTo ?? <span className="money muted">—</span>}
                                </td>
                                <td className="r">
                                  <span
                                    className="money big"
                                    style={{ color: positive ? 'var(--pos)' : 'var(--neg)' }}
                                  >
                                    {fmtMoney(t.monto)}
                                  </span>
                                </td>
                                <td className="r" style={{ whiteSpace: 'nowrap' }}>
                                  {t.status === 'UNMATCHED' && (
                                    <button className="btn btn-ghost btn-sm" onClick={() => setConciliando(t)}>
                                      Conciliar
                                    </button>
                                  )}
                                  {t.status === 'MATCHED' && t.invoice && (
                                    <button
                                      className="link small danger"
                                      onClick={() => desconciliar(t)}
                                      title="Deshacer el empate con este CFDI"
                                    >
                                      desconciliar
                                    </button>
                                  )}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="card">
                  <div className="empty">Selecciona una cuenta a la izquierda.</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── ConciliarModal ───────────────────────────────────────────────────────────
// Candidatos CFDI para un movimiento sin conciliar, rankeados por el mismo
// scoring del auto-conciliador fiscal (monto/fecha/RFC). Elegir uno confirma
// el empate (status MATCHED + invoiceId) — la conciliación real.
function ConciliarModal({ tx, onClose, onDone }) {
  const [loading, setLoading] = useState(true)
  const [candidates, setCandidates] = useState([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    apiFetch(`/api/construccion/bank-transactions/${tx.id}/cfdi-candidatos`)
      .then((r) => { if (alive) setCandidates(r.candidates ?? []) })
      .catch((e) => alertDialog({ message: e.message || 'Error al cargar candidatos' }))
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [tx.id])

  const conciliar = async (inv) => {
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/bank-transactions/${tx.id}/conciliar`, {
        method: 'POST',
        body: { invoiceId: inv.id },
      })
      onDone?.()
    } catch (e) {
      alertDialog({ message: e.message || 'No se pudo conciliar' })
      setBusy(false)
    }
  }

  const confianza = (score) => (score >= 130 ? 'alta' : score >= 70 ? 'media' : 'baja')

  return (
    <div className="ds">
      <div className="conc-tx">
        <div>
          <div className="proj-name">{tx.descripcion?.slice(0, 70) || '—'}</div>
          <div className="bank-meta">{fmtDate(tx.fecha)}{tx.referencia ? ` · Ref: ${tx.referencia}` : ''}</div>
        </div>
        <span className="money big" style={{ color: (tx.monto ?? 0) >= 0 ? 'var(--pos)' : 'var(--neg)' }}>
          {fmtMoney(tx.monto)}
        </span>
      </div>

      {loading ? (
        <div className="empty">Buscando CFDIs candidatos…</div>
      ) : candidates.length === 0 ? (
        <div className="empty">
          Sin CFDIs candidatos (±30 días, ±5% del monto). Verifica que el CFDI
          esté descargado del SAT en contabilidad-os.
        </div>
      ) : (
        <div className="scroll-x">
          <table className="ptable">
            <thead>
              <tr>
                <th>CFDI</th>
                <th>Emisor/Receptor</th>
                <th>Fecha</th>
                <th className="r">Total</th>
                <th>Confianza</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.id} style={{ cursor: 'default' }}>
                  <td>
                    <div className="mono" style={{ fontSize: 12.5 }}>
                      {[c.serie, c.folio].filter(Boolean).join('-') || (c.uuid ? c.uuid.slice(0, 8) + '…' : '—')}
                    </div>
                    <div className="bank-meta">
                      {c.metodoPago}{c.alreadyMatched ? ` · pagada parcial (resta ${fmtMoney(c.remainingBalance)})` : ''}
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>
                    {c.nombre ?? '—'}
                    {c.rfc && <div className="bank-meta mono">{c.rfc}</div>}
                  </td>
                  <td className="mono" style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{fmtDate(c.fecha)}</td>
                  <td className="r"><span className="money">{fmtMoney(c.total)}</span></td>
                  <td>
                    <span className={'pill ' + (confianza(c.score) === 'alta' ? 'brand' : confianza(c.score) === 'media' ? 'warn' : '')}>
                      {confianza(c.score)}
                    </span>
                  </td>
                  <td className="r">
                    <button className="btn btn-dark btn-sm" disabled={busy} onClick={() => conciliar(c)}>
                      Conciliar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="modal-actions" style={{ marginTop: 12 }}>
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cerrar</button>
      </div>
    </div>
  )
}

// ── ImportForm ───────────────────────────────────────────────────────────────
// Reads a CSV / PDF text file via FileReader and POSTs the raw text +
// filename to /api/construccion/bank-accounts/[id]/upload. Server parses
// + dedupes + auto-categorizes. Re-importing the same file is safe.
function ImportForm({ bankAccountId, onClose, onImported }) {
  const inputRef = useRef(null)
  const [file, setFile] = useState(null) // { name, content }
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)

  const onPick = (f) => {
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => setFile({ name: f.name, content: String(reader.result ?? '') })
    reader.onerror = () => alertDialog({ message: 'No se pudo leer el archivo.' })
    reader.readAsText(f)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!file) return
    setBusy(true)
    setResult(null)
    try {
      const r = await apiFetch(`/api/construccion/bank-accounts/${bankAccountId}/upload`, {
        method: 'POST',
        body: { fileContent: file.content, filename: file.name },
      })
      setResult(r)
      if (r.ok && r.imported > 0) {
        setTimeout(() => onImported?.(), 1500)
      }
    } catch (err) {
      alertDialog({ message: err.message || 'Error al importar' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="ds teso-import-form">
      <p className="bank-meta" style={{ marginTop: 0, fontFamily: 'var(--font-ui)', lineHeight: 1.5 }}>
        Sube el estado de cuenta del banco (CSV o PDF convertido a texto). Los movimientos
        que ya existen se ignoran automáticamente; solo se agregan los nuevos. El sistema
        reconoce comisiones bancarias, pagos al SAT y traspasos internos como
        <em> Ignorados</em> para que tu bandeja "Sin conciliar" se mantenga limpia.
      </p>

      {!file ? (
        <button type="button" className="btn btn-ghost" onClick={() => inputRef.current?.click()}>
          <Icon name="file" />
          Elegir archivo (.csv / .txt)
        </button>
      ) : (
        <div className="teso-file-chip">
          <span>
            <Icon name="file" style={{ width: 15, height: 15, verticalAlign: '-2px' }} /> {file.name}
          </span>
          <button
            type="button"
            className="teso-link"
            onClick={() => {
              setFile(null)
              setResult(null)
              if (inputRef.current) inputRef.current.value = ''
            }}
          >
            quitar
          </button>
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.txt,.tsv"
        style={{ display: 'none' }}
        onChange={(e) => onPick(e.target.files?.[0])}
      />

      {result && (
        <div className={result.ok ? 'teso-import-ok' : 'error-banner'}>
          {result.ok ? (
            <>
              <strong>{result.message}</strong>
              {result.detectedBank && (
                <div className="bank-meta">Formato detectado: {result.detectedBank}</div>
              )}
              {(result.warnings ?? []).slice(0, 3).map((w, i) => (
                <div key={i} className="bank-meta">⚠ {w}</div>
              ))}
            </>
          ) : (
            <strong>{result.error || result.message}</strong>
          )}
        </div>
      )}

      <div className="teso-modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>
          Cerrar
        </button>
        <button type="submit" className="btn btn-primary" disabled={!file || busy}>
          {busy ? 'Importando…' : 'Importar'}
        </button>
      </div>
    </form>
  )
}
