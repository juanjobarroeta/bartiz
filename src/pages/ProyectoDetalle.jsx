/**
 * ProyectoDetalle — wired to contabilidad-os.
 *
 * GET /api/construccion/proyectos/:id returns the proyecto with customer,
 * presupuestos, estimaciones, and last 20 solicitudes de compra. Module-
 * gated behind CONSTRUCCION. Tenant check uses the proyecto's own companyId.
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../config/api'
import './ProyectoDetalle.css'

const ESTADO_LABEL = {
  PLANEACION: 'Planeación',
  EN_EJECUCION: 'En ejecución',
  SUSPENDIDO: 'Suspendido',
  TERMINADO: 'Terminado',
  CANCELADO: 'Cancelado',
}

const TIPO_LABEL = {
  GOBIERNO: 'Gobierno',
  PRIVADO: 'Privado',
  MIXTO: 'Mixto',
}

const PRESUPUESTO_ESTADO = {
  BORRADOR: 'Borrador',
  APROBADO: 'Aprobado',
  EN_EJECUCION: 'En ejecución',
  CERRADO: 'Cerrado',
}

const ESTIMACION_ESTADO = {
  BORRADOR: 'Borrador',
  APROBADA: 'Aprobada',
  TIMBRADA: 'Timbrada',
  PAGADA: 'Pagada',
  CANCELADA: 'Cancelada',
}

const SOLICITUD_ESTADO = {
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  PAGADA: 'Pagada',
  CANCELADA: 'Cancelada',
}

const fmtMoney = (n) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        maximumFractionDigits: 0,
      }).format(Number(n))

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—'

export default function ProyectoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeCompany } = useAuth()

  const [proyecto, setProyecto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch(`/api/construccion/proyectos/${encodeURIComponent(id)}`)
      setProyecto(data)
    } catch (err) {
      setError(err.message || 'Error al cargar el proyecto')
      setProyecto(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    cargar()
  }, [cargar])

  if (loading) {
    return (
      <div className="pd-page">
        <div className="pd-state">Cargando proyecto…</div>
      </div>
    )
  }

  if (error || !proyecto) {
    return (
      <div className="pd-page">
        <button className="pd-back" onClick={() => navigate('/proyectos')}>
          ← Proyectos
        </button>
        <div className="pd-state pd-error">
          {error ?? 'Proyecto no encontrado'}
        </div>
      </div>
    )
  }

  const solicitudesTotal = (proyecto.solicitudesCompra ?? []).reduce(
    (acc, s) => acc + (Number(s.total) || 0),
    0
  )
  const estimacionesTotal = (proyecto.estimaciones ?? []).reduce(
    (acc, e) => acc + (Number(e.total) || 0),
    0
  )

  return (
    <div className="pd-page">
      <button className="pd-back" onClick={() => navigate('/proyectos')}>
        ← Proyectos
      </button>

      <header className="pd-header">
        <div>
          <div className="pd-codigo">{proyecto.codigo}</div>
          <h1>{proyecto.nombre}</h1>
          <div className="pd-meta">
            <span className={`badge estado-${proyecto.estado?.toLowerCase()}`}>
              {ESTADO_LABEL[proyecto.estado] ?? proyecto.estado}
            </span>
            <span className="badge">{TIPO_LABEL[proyecto.tipo] ?? proyecto.tipo}</span>
            {proyecto.ubicacion && <span className="pd-meta-item">📍 {proyecto.ubicacion}</span>}
          </div>
        </div>
      </header>

      <div className="pd-kpis">
        <div className="pd-kpi">
          <div className="pd-kpi-label">Contratado</div>
          <div className="pd-kpi-value">{fmtMoney(proyecto.montoContratado)}</div>
        </div>
        <div className="pd-kpi">
          <div className="pd-kpi-label">Facturado (estimaciones)</div>
          <div className="pd-kpi-value">{fmtMoney(estimacionesTotal)}</div>
        </div>
        <div className="pd-kpi">
          <div className="pd-kpi-label">Comprometido (solicitudes)</div>
          <div className="pd-kpi-value">{fmtMoney(solicitudesTotal)}</div>
        </div>
        <div className="pd-kpi">
          <div className="pd-kpi-label">Anticipo</div>
          <div className="pd-kpi-value">
            {proyecto.anticipoMonto != null
              ? fmtMoney(proyecto.anticipoMonto)
              : '—'}
          </div>
          {proyecto.anticipoMonto != null && proyecto.anticipoAmortizado > 0 && (
            <div className="pd-kpi-sub">
              Amortizado: {fmtMoney(proyecto.anticipoAmortizado)}
            </div>
          )}
        </div>
        <div className="pd-kpi">
          <div className="pd-kpi-label">Inicio → Fin plan</div>
          <div className="pd-kpi-value small">
            {fmtDate(proyecto.fechaInicio)} → {fmtDate(proyecto.fechaFinPlan)}
          </div>
        </div>
      </div>

      {/* Anticipo registration (only if not already recorded) */}
      {proyecto.anticipoMonto == null && (
        <AnticipoForm
          proyecto={proyecto}
          companyId={activeCompany?.id}
          onRegistered={cargar}
        />
      )}

      {/* Control Financiero — profit visibility */}
      <ControlFinanciero proyecto={proyecto} />

      <div className="pd-grid">
        <section className="pd-card">
          <h2>Cliente / Contrato</h2>
          <dl className="pd-dl">
            <dt>Cliente</dt>
            <dd>
              {proyecto.customer
                ? `${proyecto.customer.razonSocial} (${proyecto.customer.rfc})`
                : '—'}
            </dd>
            <dt>Dependencia</dt>
            <dd>{proyecto.dependenciaCliente ?? '—'}</dd>
            <dt>Nº contrato</dt>
            <dd>{proyecto.numeroContrato ?? '—'}</dd>
            <dt>Nº licitación</dt>
            <dd>{proyecto.numeroLicitacion ?? '—'}</dd>
            <dt>Modalidad</dt>
            <dd>{proyecto.modalidadContrato ?? '—'}</dd>
            <dt>Anticipo</dt>
            <dd>{proyecto.anticipoPorc != null ? `${proyecto.anticipoPorc}%` : '—'}</dd>
            <dt>Retención</dt>
            <dd>{proyecto.retencionPorc != null ? `${proyecto.retencionPorc}%` : '—'}</dd>
          </dl>
        </section>

        <section className="pd-card">
          <h2>Presupuestos ({proyecto.presupuestos?.length ?? 0})</h2>
          {proyecto.presupuestos?.length ? (
            <ul className="pd-list">
              {proyecto.presupuestos.map((p) => (
                <li
                  key={p.id}
                  className="pd-list-clickable"
                  onClick={() => navigate(`/presupuesto/${p.id}`)}
                >
                  <div>
                    <strong>{p.nombre ?? `Presupuesto v${p.version}`}</strong>
                    <span className="muted"> · v{p.version} · {p._count?.partidas ?? 0} partidas</span>
                  </div>
                  <div className="pd-list-right">
                    <span className={`badge estado-${p.estado?.toLowerCase()}`}>
                      {PRESUPUESTO_ESTADO[p.estado] ?? p.estado}
                    </span>
                    <span className="mono">{fmtMoney(p.montoTotal)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="pd-empty">
              Aún no hay presupuestos para este proyecto.
            </div>
          )}
        </section>

        <section className="pd-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Estimaciones ({proyecto.estimaciones?.length ?? 0})</h2>
            <button className="link" style={{ fontSize: '0.85rem' }} onClick={() => navigate(`/estimaciones/${proyecto.id}`)}>
              Ver todas →
            </button>
          </div>
          {proyecto.estimaciones?.length ? (
            <table className="pd-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Período</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Subtotal</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th>CFDI</th>
                </tr>
              </thead>
              <tbody>
                {proyecto.estimaciones.map((e) => (
                  <tr key={e.id}>
                    <td>{e.numero}</td>
                    <td className="small">
                      {fmtDate(e.periodoInicio)} → {fmtDate(e.periodoFin)}
                    </td>
                    <td>
                      <span className="badge">
                        {ESTIMACION_ESTADO[e.estado] ?? e.estado}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{fmtMoney(e.subtotal)}</td>
                    <td style={{ textAlign: 'right' }}>{fmtMoney(e.total)}</td>
                    <td>{e.invoiceId ? '✓ Timbrada' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="pd-empty">
              Aún no hay estimaciones para este proyecto.
            </div>
          )}
        </section>

        <section className="pd-card pd-wide">
          <h2>Solicitudes de compra (últimas 20)</h2>
          {proyecto.solicitudesCompra?.length ? (
            <table className="pd-table">
              <thead>
                <tr>
                  <th>Folio</th>
                  <th>Proveedor</th>
                  <th>Fecha</th>
                  <th>Estado</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {proyecto.solicitudesCompra.map((s) => (
                  <tr key={s.id}>
                    <td className="mono">{s.folio}</td>
                    <td>{s.supplier?.razonSocial ?? '—'}</td>
                    <td className="small">{fmtDate(s.createdAt)}</td>
                    <td>
                      <span className={`badge solicitud-${s.estado?.toLowerCase()}`}>
                        {SOLICITUD_ESTADO[s.estado] ?? s.estado}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>{fmtMoney(s.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="pd-empty">
              No hay solicitudes de compra ligadas a este proyecto todavía.
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

// ── Control Financiero ──────────────────────────────────────────────────────

function ControlFinanciero({ proyecto }) {
  // Find the approved presupuesto (or first EN_EJECUCION one)
  const pres = (proyecto.presupuestos ?? []).find(
    (p) => p.estado === 'APROBADO' || p.estado === 'EN_EJECUCION'
  )

  if (!pres || !pres.partidas?.length) {
    return null // no approved presupuesto yet — nothing to show
  }

  // Compute costs from APU data
  let totalCD = 0
  let totalPU = 0
  const byPartida = new Map() // partida string → { presupuestado, costoDirecto }

  for (const part of pres.partidas) {
    const cd = part.concepto?.apuActual?.costoDirecto ?? 0
    const costoPart = part.cantidad * cd
    totalCD += costoPart
    totalPU += part.importe

    const key = part.partida ?? 'Sin partida'
    if (!byPartida.has(key)) {
      byPartida.set(key, { zona: part.zona, partida: key, presupuestado: 0, costoDirecto: 0 })
    }
    const entry = byPartida.get(key)
    entry.presupuestado += part.importe
    entry.costoDirecto += costoPart
  }

  const indirectos = totalCD * 0.10
  const subtotal1 = totalCD + indirectos
  const utilidadPresupuestada = subtotal1 * 0.10
  const margenPresupuestado = totalPU > 0 ? ((totalPU - totalCD) / totalPU) * 100 : 0

  // Actual spend from paid solicitudes
  const solicitudesPagadas = (proyecto.solicitudesCompra ?? [])
    .filter((s) => s.estado === 'PAGADA')
    .reduce((acc, s) => acc + (Number(s.total) || 0), 0)

  // Actual revenue from timbrada estimaciones
  const estimacionesTimbradas = (proyecto.estimaciones ?? [])
    .filter((e) => e.estado === 'TIMBRADA' || e.estado === 'PAGADA')
    .reduce((acc, e) => acc + (Number(e.subtotal) || 0), 0)

  const anticipoRecibido = proyecto.anticipoMonto ?? 0
  const anticipoAmortizado = proyecto.anticipoAmortizado ?? 0
  const porFacturar = totalPU - estimacionesTimbradas

  const utilidadReal = estimacionesTimbradas + anticipoRecibido - solicitudesPagadas
  const margenReal = (estimacionesTimbradas + anticipoRecibido) > 0
    ? (utilidadReal / (estimacionesTimbradas + anticipoRecibido)) * 100
    : 0

  const partidaRows = [...byPartida.values()].sort((a, b) =>
    (a.zona ?? '').localeCompare(b.zona ?? '') || a.partida.localeCompare(b.partida)
  )

  return (
    <section className="pd-financiero">
      <h2>Control Financiero</h2>
      <div className="pd-fin-grid">
        <div className="pd-fin-card">
          <h3>Ingresos</h3>
          <dl>
            <dt>Monto contratado</dt>
            <dd>{fmtMoney(proyecto.montoContratado)}</dd>
            <dt>Anticipo recibido</dt>
            <dd>{fmtMoney(anticipoRecibido)}</dd>
            <dt>Estimaciones timbradas</dt>
            <dd>{fmtMoney(estimacionesTimbradas)}</dd>
            <dt>Por facturar</dt>
            <dd className="muted">{fmtMoney(porFacturar)}</dd>
          </dl>
        </div>

        <div className="pd-fin-card">
          <h3>Costos</h3>
          <dl>
            <dt>Costo directo presupuestado</dt>
            <dd>{fmtMoney(totalCD)}</dd>
            <dt>Indirectos (10%)</dt>
            <dd>{fmtMoney(indirectos)}</dd>
            <dt>Compras ejecutadas</dt>
            <dd>{solicitudesPagadas > 0 ? fmtMoney(solicitudesPagadas) : '—'}</dd>
          </dl>
        </div>

        <div className="pd-fin-card pd-fin-margin">
          <h3>Margen</h3>
          <dl>
            <dt>Utilidad presupuestada</dt>
            <dd><strong>{fmtMoney(utilidadPresupuestada)}</strong></dd>
            <dt>Margen presupuestado</dt>
            <dd><strong>{margenPresupuestado.toFixed(1)}%</strong></dd>
            {solicitudesPagadas > 0 && (
              <>
                <dt>Utilidad real (a la fecha)</dt>
                <dd>{fmtMoney(utilidadReal)}</dd>
                <dt>Margen real</dt>
                <dd>{margenReal.toFixed(1)}%</dd>
              </>
            )}
          </dl>
        </div>
      </div>

      <details className="pd-fin-partidas">
        <summary>Desglose por partida ({partidaRows.length})</summary>
        <table className="pd-table">
          <thead>
            <tr>
              <th>Partida</th>
              <th style={{ textAlign: 'right' }}>Presupuestado (PU)</th>
              <th style={{ textAlign: 'right' }}>Costo directo</th>
              <th style={{ textAlign: 'right' }}>Margen</th>
            </tr>
          </thead>
          <tbody>
            {partidaRows.map((r) => {
              const margen = r.presupuestado > 0
                ? ((r.presupuestado - r.costoDirecto) / r.presupuestado) * 100
                : 0
              return (
                <tr key={r.partida}>
                  <td>
                    <span className="muted" style={{ fontSize: '0.72rem' }}>{r.zona} → </span>
                    {r.partida}
                  </td>
                  <td style={{ textAlign: 'right' }}>{fmtMoney(r.presupuestado)}</td>
                  <td style={{ textAlign: 'right' }}>{fmtMoney(r.costoDirecto)}</td>
                  <td style={{ textAlign: 'right' }}>{margen.toFixed(1)}%</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td><strong>Total</strong></td>
              <td style={{ textAlign: 'right' }}><strong>{fmtMoney(totalPU)}</strong></td>
              <td style={{ textAlign: 'right' }}><strong>{fmtMoney(totalCD)}</strong></td>
              <td style={{ textAlign: 'right' }}><strong>{margenPresupuestado.toFixed(1)}%</strong></td>
            </tr>
          </tfoot>
        </table>
      </details>
    </section>
  )
}

// ── Anticipo form (inline in ProyectoDetalle) ───────────────────────────────

function AnticipoForm({ proyecto, companyId, onRegistered }) {
  const [open, setOpen] = useState(false)
  const [bankAccounts, setBankAccounts] = useState([])
  const [form, setForm] = useState({
    bankAccountId: '',
    monto: proyecto.montoContratado
      ? (proyecto.montoContratado * (proyecto.anticipoPorc || 30) / 100).toFixed(2)
      : '',
    referencia: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || !companyId) return
    apiFetch(`/api/construccion/bank-accounts?companyId=${companyId}`)
      .then((data) => {
        setBankAccounts(Array.isArray(data) ? data : [])
        if (data.length === 1) setForm((f) => ({ ...f, bankAccountId: data[0].id }))
      })
      .catch(() => setBankAccounts([]))
  }, [open, companyId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.bankAccountId || !form.monto) return
    setBusy(true)
    setError(null)
    try {
      await apiFetch(`/api/construccion/proyectos/${proyecto.id}/anticipo`, {
        method: 'POST',
        body: {
          bankAccountId: form.bankAccountId,
          monto: parseFloat(form.monto),
          referencia: form.referencia || undefined,
        },
      })
      setOpen(false)
      onRegistered?.()
    } catch (err) {
      setError(err.message || 'Error al registrar anticipo')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <div className="pd-anticipo-prompt">
        <button className="primary" onClick={() => setOpen(true)}>
          💰 Registrar anticipo recibido
        </button>
        <span className="muted">
          {proyecto.anticipoPorc
            ? `${proyecto.anticipoPorc}% del monto contratado`
            : 'El cliente ya depositó el anticipo'}
        </span>
      </div>
    )
  }

  return (
    <form className="pd-anticipo-form" onSubmit={handleSubmit}>
      <h3>Registrar anticipo</h3>
      {error && <div className="pd-error">{error}</div>}
      <div className="pd-anticipo-fields">
        <label>
          Cuenta bancaria
          <select
            required
            value={form.bankAccountId}
            onChange={(e) => setForm({ ...form, bankAccountId: e.target.value })}
          >
            <option value="">Seleccionar…</option>
            {bankAccounts.map((b) => (
              <option key={b.id} value={b.id}>
                {b.banco} — {b.nombre} ({b.numeroCuenta})
              </option>
            ))}
          </select>
          {bankAccounts.length === 0 && (
            <span className="muted" style={{ fontSize: '0.78rem' }}>
              No hay cuentas bancarias registradas. Crea una en contabilidad-os primero.
            </span>
          )}
        </label>
        <label>
          Monto recibido (sin IVA)
          <input
            type="number"
            min="0"
            step="0.01"
            required
            value={form.monto}
            onChange={(e) => setForm({ ...form, monto: e.target.value })}
          />
        </label>
        <label>
          Referencia bancaria
          <input
            value={form.referencia}
            onChange={(e) => setForm({ ...form, referencia: e.target.value })}
            placeholder="Nº de transferencia (opcional)"
          />
        </label>
      </div>
      <div className="pd-anticipo-actions">
        <button type="button" onClick={() => setOpen(false)}>
          Cancelar
        </button>
        <button type="submit" className="primary" disabled={busy}>
          {busy ? 'Registrando…' : 'Registrar anticipo'}
        </button>
      </div>
    </form>
  )
}
