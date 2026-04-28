/**
 * ProveedorBartizDetalle — supplier detail page.
 *
 * Three sections:
 *   1. Header with stats: cotizaciones submitted, ganadas, total
 *      cotizado, total spent (PAGADA OCs).
 *   2. Cotización history — every cotización this supplier has
 *      submitted, with win/loss badge and link to its requisición.
 *   3. SolicitudCompra OCs + recent BankTransactions side by side.
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../config/api'
import Modal from '../components/Modal'
import { alertDialog } from '../components/Dialog'
import '../components/Modal.css'
import './ProveedoresBartiz.css'

const fmtMoney = (n) =>
  n == null ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(n) || 0)
const fmtMoneyDec = (n) =>
  n == null ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 2 }).format(Number(n) || 0)
const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'

export default function ProveedorBartizDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bankOpen, setBankOpen] = useState(false)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const r = await apiFetch(`/api/construccion/suppliers/${id}`)
      setData(r)
    } catch (err) {
      alertDialog({ message: err.message || 'Error al cargar' })
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { reload() }, [reload])

  if (loading) return <div className="pd-empty">Cargando…</div>
  if (!data) return <div className="pd-empty">No encontrado.</div>

  const winRate =
    data.cotizaciones.length > 0
      ? Math.round((data.stats.wonCount / data.cotizaciones.length) * 100)
      : 0

  return (
    <div className="prov-detalle">
      <button className="pd-back" onClick={() => navigate('/proveedores-bartiz')}>← Proveedores</button>

      <header className="prov-head">
        <div>
          <h1>{data.razonSocial}</h1>
          <div className="muted small">
            <span className="mono">{data.rfc}</span>
            {data.regimenFiscal && <> · Régimen {data.regimenFiscal}</>}
            {data.email && <> · {data.email}</>}
          </div>
        </div>
        <div className="prov-stats">
          <div className="stat">
            <span className="muted small">Cotizaciones</span>
            <strong>{data.cotizaciones.length}</strong>
          </div>
          <div className="stat">
            <span className="muted small">Ganadas</span>
            <strong style={{ color: data.stats.wonCount > 0 ? '#16a34a' : '#64748b' }}>
              {data.stats.wonCount} <span className="muted small">({winRate}%)</span>
            </strong>
          </div>
          <div className="stat">
            <span className="muted small">Total cotizado</span>
            <strong>{fmtMoney(data.stats.totalQuoted)}</strong>
          </div>
          <div className="stat">
            <span className="muted small">Total pagado</span>
            <strong>{fmtMoney(data.stats.totalSpent)}</strong>
          </div>
        </div>
      </header>

      {/* Datos bancarios para SPEI */}
      <section className="prov-section">
        <div className="prov-section-head">
          <h2>Datos bancarios</h2>
          <button className="link" onClick={() => setBankOpen(true)}>
            {data.clabe || data.banco || data.cuentaBancaria ? 'Editar' : '+ Agregar'}
          </button>
        </div>
        {data.clabe || data.banco || data.cuentaBancaria || data.titularCuenta ? (
          <div className="prov-bank-display">
            {data.clabe && (
              <div>
                <span className="muted small">CLABE</span>
                <strong className="mono">{data.clabe}</strong>
              </div>
            )}
            {data.banco && (
              <div>
                <span className="muted small">Banco</span>
                <strong>{data.banco}</strong>
              </div>
            )}
            {data.cuentaBancaria && (
              <div>
                <span className="muted small">Cuenta</span>
                <strong className="mono">{data.cuentaBancaria}</strong>
              </div>
            )}
            {data.titularCuenta && (
              <div>
                <span className="muted small">Titular</span>
                <strong>{data.titularCuenta}</strong>
              </div>
            )}
          </div>
        ) : (
          <div className="pd-empty small">
            Sin datos bancarios capturados. Agrégalos para tenerlos a la mano al
            programar SPEIs.
          </div>
        )}
      </section>

      <Modal open={bankOpen} onClose={() => setBankOpen(false)} title="Datos bancarios">
        <BankInfoForm
          supplier={data}
          onClose={() => setBankOpen(false)}
          onSaved={() => { setBankOpen(false); reload() }}
        />
      </Modal>

      {/* Cotizaciones history */}
      <section className="prov-section">
        <h2>Cotizaciones ({data.cotizaciones.length})</h2>
        {data.cotizaciones.length === 0 ? (
          <div className="pd-empty">Aún no ha cotizado ninguna requisición.</div>
        ) : (
          <table className="prov-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Requisición</th>
                <th>Proyecto</th>
                <th style={{ textAlign: 'right' }}>Líneas</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {data.cotizaciones.map((c) => (
                <tr
                  key={c.id}
                  className="clickable"
                  onClick={() => navigate(`/requisiciones/${c.solicitudId}`)}
                >
                  <td className="small muted">{fmtDate(c.fechaCotizacion)}</td>
                  <td className="mono small">{c.solicitud?.folio ?? '—'}</td>
                  <td className="small">{c.solicitud?.proyecto?.codigo ?? '—'}</td>
                  <td style={{ textAlign: 'right' }}>{c.partidas?.length ?? 0}</td>
                  <td style={{ textAlign: 'right' }}>{fmtMoneyDec(c.total)}</td>
                  <td>
                    {c.isSelected ? (
                      <span className="badge ganadora">✓ ganadora</span>
                    ) : c.solicitud?.supplierId ? (
                      <span className="badge perdida">perdida</span>
                    ) : (
                      <span className="badge muted">pendiente</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <div className="prov-bottom">
        {/* OCs */}
        <section className="prov-section">
          <h2>Órdenes de compra ({data.solicitudesCompra.length})</h2>
          {data.solicitudesCompra.length === 0 ? (
            <div className="pd-empty">Sin OCs.</div>
          ) : (
            <table className="prov-table compact">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Proyecto</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {data.solicitudesCompra.map((s) => (
                  <tr
                    key={s.id}
                    className="clickable"
                    onClick={() => navigate(`/requisiciones/${s.id}`)}
                  >
                    <td className="mono small">{s.folio}</td>
                    <td className="small">{s.proyecto?.codigo ?? '—'}</td>
                    <td>
                      <span className={`badge estado-${s.estado.toLowerCase()}`}>{s.estado}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{fmtMoneyDec(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Bank transactions */}
        <section className="prov-section">
          <h2>Movimientos bancarios ({data.bankTransactions.length})</h2>
          {data.bankTransactions.length === 0 ? (
            <div className="pd-empty">Sin movimientos.</div>
          ) : (
            <table className="prov-table compact">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Cuenta</th>
                  <th>Descripción / Ref</th>
                  <th style={{ textAlign: 'right' }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {data.bankTransactions.map((t) => (
                  <tr key={t.id}>
                    <td className="small muted">{fmtDate(t.fecha)}</td>
                    <td className="small">{t.bankAccount?.banco} {t.bankAccount?.nombre}</td>
                    <td className="small">
                      {t.descripcion?.slice(0, 60)}
                      {t.referencia && <div className="muted small mono">{t.referencia}</div>}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        color: t.monto > 0 ? '#16a34a' : '#dc2626',
                      }}
                    >
                      {fmtMoneyDec(t.monto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}

// ── Bank info edit form ──────────────────────────────────────────────────────
function BankInfoForm({ supplier, onClose, onSaved }) {
  const [clabe, setClabe] = useState(supplier.clabe ?? '')
  const [banco, setBanco] = useState(supplier.banco ?? '')
  const [cuentaBancaria, setCuentaBancaria] = useState(supplier.cuentaBancaria ?? '')
  const [titularCuenta, setTitularCuenta] = useState(supplier.titularCuenta ?? '')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (clabe.trim() && !/^\d{18}$/.test(clabe.trim())) {
      alertDialog({ message: 'La CLABE debe tener exactamente 18 dígitos.' })
      return
    }
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/suppliers/${supplier.id}`, {
        method: 'PUT',
        body: {
          clabe: clabe.trim() || null,
          banco: banco.trim() || null,
          cuentaBancaria: cuentaBancaria.trim() || null,
          titularCuenta: titularCuenta.trim() || null,
        },
      })
      onSaved?.()
    } catch (err) {
      alertDialog({ message: err.message || 'Error al guardar' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="prov-form">
      <label>
        <span>CLABE (18 dígitos)</span>
        <input
          value={clabe}
          onChange={(e) => setClabe(e.target.value.replace(/\D/g, '').slice(0, 18))}
          placeholder="012345678901234567"
          maxLength={18}
          inputMode="numeric"
          style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}
        />
      </label>
      <div className="row">
        <label>
          <span>Banco</span>
          <input value={banco} onChange={(e) => setBanco(e.target.value)} placeholder="BBVA, Banorte…" />
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
      <div className="modal-actions">
        <button type="button" onClick={onClose}>Cancelar</button>
        <button type="submit" className="primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  )
}
