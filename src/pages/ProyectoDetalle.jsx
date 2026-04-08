/**
 * ProyectoDetalle — wired to contabilidad-os.
 *
 * GET /api/construccion/proyectos/:id returns the proyecto with customer,
 * presupuestos, estimaciones, and last 20 solicitudes de compra. Module-
 * gated behind CONSTRUCCION. Tenant check uses the proyecto's own companyId.
 */

import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
          <div className="pd-kpi-label">Inicio → Fin plan</div>
          <div className="pd-kpi-value small">
            {fmtDate(proyecto.fechaInicio)} → {fmtDate(proyecto.fechaFinPlan)}
          </div>
        </div>
      </div>

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
          <h2>Estimaciones ({proyecto.estimaciones?.length ?? 0})</h2>
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
