/**
 * Proveedores — supplier directory for the active company.
 *
 * Same Supplier table contabilidad-os uses for SPEI matching, surfaced from
 * bartiz so Gerardo and Katia can manage proveedores without bouncing to the
 * accounting product. Reskinned onto the DECOLSA design system, plus two
 * additions: supplier credit terms (¿da crédito? cuántos días) and a CSV
 * bulk-import.
 *
 * Each row shows credit terms + # cotizaciones, # OCs, # bank txs. Click →
 * detail with full history.
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../config/api'
import Modal from '../components/Modal'
import { alertDialog } from '../components/Dialog'
import '../components/Modal.css'
import './ProveedoresBartiz.css'

// Credit terms are construcción-owned operational data, kept OFF the fiscal
// core Supplier model. The API exposes them as `supplier.terms` and accepts
// writes at PUT /api/construccion/suppliers/:id/terms. We read a flattened
// fallback too, so the UI still works if terms are inlined on the supplier.
export function readTerms(s) {
  const t = s?.terms ?? s ?? {}
  return {
    tieneCredito: t.tieneCredito ?? (t.diasCredito > 0 || null),
    diasCredito: t.diasCredito ?? null,
    limiteCredito: t.limiteCredito ?? null,
  }
}

export async function saveTerms(supplierId, { tieneCredito, diasCredito, limiteCredito }) {
  return apiFetch(`/api/construccion/suppliers/${supplierId}/terms`, {
    method: 'PUT',
    body: {
      tieneCredito: !!tieneCredito,
      diasCredito: tieneCredito ? Number(diasCredito) || 0 : 0,
      limiteCredito: tieneCredito && limiteCredito ? Number(limiteCredito) : null,
    },
  })
}

// Credit-terms chip shared by the list + detail. `diasCredito > 0` → crédito;
// explicit `tieneCredito === false` → contado; otherwise unknown (—).
export function CreditChip({ supplier }) {
  const t = readTerms(supplier)
  if (t.diasCredito > 0) return <span className="prov-credit has">Crédito · {t.diasCredito} días</span>
  if (t.tieneCredito === false) return <span className="prov-credit cash">Contado</span>
  return <span className="prov-credit none">—</span>
}

export default function ProveedoresBartiz() {
  const navigate = useNavigate()
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [newOpen, setNewOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const reload = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ companyId })
      if (q.trim().length >= 2) params.set('q', q.trim())
      const data = await apiFetch(`/api/construccion/suppliers?${params.toString()}`)
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [companyId, q])

  useEffect(() => {
    const t = setTimeout(() => reload(), 200)
    return () => clearTimeout(t)
  }, [reload])

  if (!companyId) return <div className="prov-page"><div className="pd-empty">Selecciona una empresa.</div></div>

  return (
    <div className="prov-page">
      <header>
        <h1>Proveedores</h1>
        <p className="muted small">
          Catálogo de proveedores de la empresa: condiciones de crédito,
          datos bancarios e historial de cotizaciones, órdenes de compra y
          movimientos. Mismo padrón que usa contabilidad-os para conciliar SPEIs.
        </p>
      </header>

      <div className="toolbar">
        <input
          type="search"
          placeholder="Buscar por nombre o RFC…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="search"
        />
        <div className="toolbar-actions">
          <button className="btn btn-ghost" onClick={() => setImportOpen(true)}>Importar CSV</button>
          <button className="primary" onClick={() => setNewOpen(true)}>+ Nuevo proveedor</button>
        </div>
      </div>

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="Nuevo proveedor">
        <NewProveedorForm
          companyId={companyId}
          onClose={() => setNewOpen(false)}
          onCreated={(s) => { setNewOpen(false); navigate(`/proveedores-bartiz/${s.id}`) }}
        />
      </Modal>

      <Modal open={importOpen} onClose={() => setImportOpen(false)} title="Importar proveedores (CSV)" size="md">
        <ImportProveedoresForm
          companyId={companyId}
          onClose={() => setImportOpen(false)}
          onDone={() => reload()}
        />
      </Modal>

      {loading ? (
        <div className="pd-empty">Cargando…</div>
      ) : rows.length === 0 ? (
        <div className="pd-empty">
          {q.trim()
            ? 'Sin resultados para esa búsqueda.'
            : 'Aún no hay proveedores. Crea el primero, importa un CSV, o aparecerán automáticamente al cotizar requisiciones.'}
        </div>
      ) : (
        <table className="prov-table">
          <thead>
            <tr>
              <th>Razón social</th>
              <th>RFC</th>
              <th>Crédito</th>
              <th>Email</th>
              <th style={{ textAlign: 'right' }}>Cotizaciones</th>
              <th style={{ textAlign: 'right' }}>OCs</th>
              <th style={{ textAlign: 'right' }}>Mov. banco</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr
                key={s.id}
                className="clickable"
                onClick={() => navigate(`/proveedores-bartiz/${s.id}`)}
              >
                <td>
                  <strong>{s.razonSocial}</strong>
                  {s.regimenFiscal && <div className="muted small">Régimen {s.regimenFiscal}</div>}
                </td>
                <td className="mono small">{s.rfc}</td>
                <td><CreditChip supplier={s} /></td>
                <td className="small muted">{s.email ?? '—'}</td>
                <td style={{ textAlign: 'right' }} className="num">{s._count?.cotizaciones ?? 0}</td>
                <td style={{ textAlign: 'right' }} className="num">{s._count?.solicitudesCompra ?? 0}</td>
                <td style={{ textAlign: 'right' }} className="num">{s._count?.bankTransactions ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Nuevo proveedor inline form (also used by SupplierPicker) ────────────────
export function NewProveedorForm({ companyId, defaultName = '', onClose, onCreated }) {
  const [razonSocial, setRazonSocial] = useState(defaultName)
  const [rfc, setRfc] = useState('')
  const [regimen, setRegimen] = useState('')
  const [email, setEmail] = useState('')
  // Bank info — all optional.
  const [clabe, setClabe] = useState('')
  const [banco, setBanco] = useState('')
  const [cuentaBancaria, setCuentaBancaria] = useState('')
  const [titularCuenta, setTitularCuenta] = useState('')
  // Credit terms — operational attribute on the construcción supplier.
  const [tieneCredito, setTieneCredito] = useState(false)
  const [diasCredito, setDiasCredito] = useState('30')
  const [limiteCredito, setLimiteCredito] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!razonSocial.trim() || !rfc.trim()) {
      alertDialog({ message: 'Razón social y RFC son requeridos.' })
      return
    }
    if (clabe.trim() && !/^\d{18}$/.test(clabe.trim())) {
      alertDialog({ message: 'La CLABE debe tener exactamente 18 dígitos.' })
      return
    }
    setBusy(true)
    try {
      // Create the fiscal-core supplier (no credit fields), then save the
      // construcción-owned credit terms against it.
      const created = await apiFetch('/api/construccion/suppliers', {
        method: 'POST',
        body: {
          companyId,
          rfc: rfc.trim().toUpperCase(),
          razonSocial: razonSocial.trim(),
          regimenFiscal: regimen.trim() || null,
          email: email.trim() || null,
          clabe: clabe.trim() || null,
          banco: banco.trim() || null,
          cuentaBancaria: cuentaBancaria.trim() || null,
          titularCuenta: titularCuenta.trim() || null,
        },
      })
      if (created?.id && (tieneCredito || Number(diasCredito) > 0)) {
        try {
          await saveTerms(created.id, { tieneCredito, diasCredito, limiteCredito })
        } catch (termsErr) {
          console.error('No se pudieron guardar las condiciones de crédito:', termsErr)
        }
      }
      onCreated?.(created)
    } catch (err) {
      if (err.status === 409 && err.data?.existing) {
        if (window.confirm(`Ya existe "${err.data.existing.razonSocial}" con RFC ${err.data.existing.rfc}. ¿Usar ese registro?`)) {
          onCreated?.(err.data.existing)
          return
        }
      }
      alertDialog({ message: err.message || 'Error al crear proveedor' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="ds prov-form">
      <label>
        <span>Razón social</span>
        <input value={razonSocial} onChange={(e) => setRazonSocial(e.target.value)} placeholder="RYSCO S.A. de C.V." />
      </label>
      <label>
        <span>RFC</span>
        <input
          value={rfc}
          onChange={(e) => setRfc(e.target.value.toUpperCase())}
          placeholder="XAXX010101000"
          maxLength={13}
          style={{ fontFamily: 'var(--font-mono)' }}
        />
      </label>
      <fieldset className="prov-credit-fs">
        <legend>Condiciones de crédito</legend>
        <label className="prov-credit-toggle" style={{ flexDirection: 'row' }}>
          <input type="checkbox" checked={tieneCredito} onChange={(e) => setTieneCredito(e.target.checked)} />
          <span>Este proveedor nos da crédito</span>
        </label>
        {tieneCredito && (
          <div className="row">
            <label>
              <span>Días de crédito</span>
              <input
                type="number" min="0" max="365" value={diasCredito}
                onChange={(e) => setDiasCredito(e.target.value)} placeholder="30"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </label>
            <label>
              <span>Límite de crédito (opcional)</span>
              <input
                type="number" min="0" step="0.01" value={limiteCredito}
                onChange={(e) => setLimiteCredito(e.target.value)} placeholder="0.00"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
            </label>
          </div>
        )}
      </fieldset>

      <div className="row">
        <label>
          <span>Régimen fiscal (opcional)</span>
          <input value={regimen} onChange={(e) => setRegimen(e.target.value)} placeholder="601, 612…" />
        </label>
        <label>
          <span>Email (opcional)</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contacto@proveedor.mx" />
        </label>
      </div>

      <fieldset className="prov-bank">
        <legend>Datos bancarios para SPEI (opcional)</legend>
        <label>
          <span>CLABE (18 dígitos)</span>
          <input
            value={clabe}
            onChange={(e) => setClabe(e.target.value.replace(/\D/g, '').slice(0, 18))}
            placeholder="012345678901234567"
            maxLength={18}
            inputMode="numeric"
            style={{ fontFamily: 'var(--font-mono)' }}
          />
        </label>
        <div className="row">
          <label>
            <span>Banco</span>
            <input value={banco} onChange={(e) => setBanco(e.target.value)} placeholder="BBVA, Banorte, Santander…" />
          </label>
          <label>
            <span>Cuenta (opcional)</span>
            <input
              value={cuentaBancaria}
              onChange={(e) => setCuentaBancaria(e.target.value)}
              placeholder="No. de cuenta interno"
            />
          </label>
        </div>
        <label>
          <span>Titular de la cuenta (si difiere del proveedor)</span>
          <input
            value={titularCuenta}
            onChange={(e) => setTitularCuenta(e.target.value)}
            placeholder="Nombre del titular"
          />
        </label>
      </fieldset>

      <div className="modal-actions">
        <button type="button" onClick={onClose}>Cancelar</button>
        <button type="submit" className="primary" disabled={busy}>{busy ? 'Creando…' : 'Crear proveedor'}</button>
      </div>
    </form>
  )
}

// ── CSV bulk import ──────────────────────────────────────────────────────────
// Parses a CSV (header row required) client-side and POSTs each row through
// the existing supplier-create endpoint. Existing RFCs (409) are skipped, not
// errored. No backend changes needed.
const COLUMN_ALIASES = {
  razonsocial: 'razonSocial', razon: 'razonSocial', razon_social: 'razonSocial', nombre: 'razonSocial', proveedor: 'razonSocial',
  rfc: 'rfc',
  regimenfiscal: 'regimenFiscal', regimen: 'regimenFiscal',
  email: 'email', correo: 'email',
  clabe: 'clabe',
  banco: 'banco',
  cuenta: 'cuentaBancaria', cuentabancaria: 'cuentaBancaria',
  titular: 'titularCuenta', titularcuenta: 'titularCuenta',
  diascredito: 'diasCredito', credito: 'diasCredito', dias: 'diasCredito',
}

function parseCsvLine(line) {
  const out = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++ } else inQ = false
      } else cur += ch
    } else if (ch === '"') inQ = true
    else if (ch === ',') { out.push(cur); cur = '' }
    else cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim())
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) return { rows: [], error: 'El CSV necesita una fila de encabezados y al menos un proveedor.' }
  const headers = parseCsvLine(lines[0]).map((h) => COLUMN_ALIASES[h.toLowerCase().replace(/\s+/g, '')] || null)
  if (!headers.includes('razonSocial') || !headers.includes('rfc')) {
    return { rows: [], error: 'Encabezados requeridos: al menos "razonSocial" (o nombre) y "rfc".' }
  }
  const rows = []
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i])
    const rec = {}
    headers.forEach((key, idx) => { if (key) rec[key] = cells[idx] ?? '' })
    if (!rec.razonSocial?.trim() || !rec.rfc?.trim()) continue
    rows.push(rec)
  }
  return { rows, error: null }
}

function ImportProveedoresForm({ companyId, onClose, onDone }) {
  const [text, setText] = useState('')
  const [parsed, setParsed] = useState(null) // { rows, error }
  const [running, setRunning] = useState(false)
  const [log, setLog] = useState([]) // { name, status: ok|skip|err, msg }

  const onFile = (f) => {
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => { const t = String(reader.result ?? ''); setText(t); setParsed(parseCsv(t)) }
    reader.readAsText(f)
  }

  const doParse = () => setParsed(parseCsv(text))

  const run = async () => {
    if (!parsed?.rows?.length) return
    setRunning(true)
    const results = []
    for (const r of parsed.rows) {
      const dias = parseInt(r.diasCredito, 10)
      const tieneCredito = Number.isFinite(dias) && dias > 0
      try {
        const created = await apiFetch('/api/construccion/suppliers', {
          method: 'POST',
          body: {
            companyId,
            rfc: r.rfc.trim().toUpperCase(),
            razonSocial: r.razonSocial.trim(),
            regimenFiscal: r.regimenFiscal?.trim() || null,
            email: r.email?.trim() || null,
            clabe: r.clabe?.replace(/\D/g, '').slice(0, 18) || null,
            banco: r.banco?.trim() || null,
            cuentaBancaria: r.cuentaBancaria?.trim() || null,
            titularCuenta: r.titularCuenta?.trim() || null,
          },
        })
        if (created?.id && tieneCredito) {
          try { await saveTerms(created.id, { tieneCredito, diasCredito: dias }) } catch { /* terms optional */ }
        }
        results.push({ name: r.razonSocial, status: 'ok', msg: 'creado' })
      } catch (err) {
        if (err.status === 409) results.push({ name: r.razonSocial, status: 'skip', msg: 'ya existe' })
        else results.push({ name: r.razonSocial, status: 'err', msg: err.message || 'error' })
      }
      setLog([...results])
    }
    setRunning(false)
    onDone?.()
  }

  const counts = log.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {})

  return (
    <div className="ds prov-import">
      <p>
        Sube o pega un CSV con una fila de encabezados. Los RFC que ya existen se omiten
        automáticamente. Columnas reconocidas:
      </p>
      <div className="cols">razonSocial, rfc, regimenFiscal, email, clabe, banco, cuenta, titular, diasCredito</div>

      <input type="file" accept=".csv,.txt" onChange={(e) => onFile(e.target.files?.[0])} />
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setParsed(null) }}
        placeholder={'razonSocial,rfc,diasCredito\nRYSCO S.A. de C.V.,RYS010101AB1,30\nAceros del Centro,ACE020202CD2,0'}
      />

      {parsed?.error && <div className="error-banner" style={{ margin: 0 }}>{parsed.error}</div>}
      {parsed && !parsed.error && (
        <div className="muted small">{parsed.rows.length} proveedor(es) listos para importar.</div>
      )}

      {log.length > 0 && (
        <div className="prov-import-result">
          <div className="prov-import-summary">
            <span className="s ok">{counts.ok || 0} creados</span>
            <span className="s skip">{counts.skip || 0} omitidos</span>
            <span className="s err">{counts.err || 0} con error</span>
          </div>
          <div className="prov-import-log">
            {log.map((r, i) => (
              <div key={i} className={'row ' + r.status}>
                <span className="st">{r.status === 'ok' ? '✓' : r.status === 'skip' ? '–' : '✕'}</span>
                <span>{r.name}</span>
                <span className="muted" style={{ marginLeft: 'auto' }}>{r.msg}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="prov-modal-actions">
        <button type="button" className="btn btn-ghost" onClick={onClose}>Cerrar</button>
        {!parsed || parsed.error ? (
          <button type="button" className="btn btn-primary" onClick={doParse} disabled={!text.trim()}>Revisar</button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={run} disabled={running || !parsed.rows.length}>
            {running ? 'Importando…' : `Importar ${parsed.rows.length}`}
          </button>
        )}
      </div>
    </div>
  )
}
