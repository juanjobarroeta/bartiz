/**
 * PresupuestoDetalle — renders a presupuesto with the same hierarchical
 * layout as the partner's PDF: HACIENDA → ZONA → PARTIDA → conceptos.
 *
 * Route: /presupuesto/:id
 *
 * Read-only in v1. The only mutation exposed is the state transition
 * (Aprobar / Rechazar) so Juan can flip the chosen one immediately after
 * the customer meeting. Editing partidas will come later.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiFetch } from '../config/api'
import './PresupuestoDetalle.css'

const ESTADO_LABEL = {
  BORRADOR: 'Borrador',
  APROBADO: 'Aprobado',
  EN_EJECUCION: 'En ejecución',
  CERRADO: 'Cerrado',
  RECHAZADO: 'Rechazado',
}

const fmtMoney = (n) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 2,
  }).format(Number(n) || 0)

const fmtQty = (n) =>
  new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(Number(n) || 0)

/**
 * Groups flat partidas[] into a nested structure:
 *   [
 *     { zona, subtotal, grupos: [
 *       { partida, subtotal, rows: [partida...] }
 *     ]}
 *   ]
 * Preserves insertion order (partidas are already sorted server-side).
 */
function groupPartidas(partidas) {
  const totalImporte = partidas.reduce((a, p) => a + (p.importe || 0), 0) || 1
  const zonaMap = new Map()

  for (const p of partidas) {
    const zonaKey = p.zona ?? 'Sin zona'
    if (!zonaMap.has(zonaKey)) {
      zonaMap.set(zonaKey, { zona: zonaKey, subtotal: 0, porc: 0, grupos: new Map() })
    }
    const z = zonaMap.get(zonaKey)

    const partidaKey = p.partida ?? 'Sin partida'
    if (!z.grupos.has(partidaKey)) {
      z.grupos.set(partidaKey, { partida: partidaKey, subtotal: 0, porc: 0, rows: [] })
    }
    const g = z.grupos.get(partidaKey)

    g.rows.push(p)
    g.subtotal += p.importe || 0
    z.subtotal += p.importe || 0
  }

  return [...zonaMap.values()].map((z) => ({
    zona: z.zona,
    subtotal: z.subtotal,
    porc: (z.subtotal / totalImporte) * 100,
    grupos: [...z.grupos.values()].map((g) => ({
      partida: g.partida,
      subtotal: g.subtotal,
      porc: (g.subtotal / totalImporte) * 100,
      rows: g.rows.map((r) => ({
        ...r,
        porc: ((r.importe || 0) / totalImporte) * 100,
      })),
    })),
  }))
}

export default function PresupuestoDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [presupuesto, setPresupuesto] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actioning, setActioning] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch(`/api/construccion/presupuestos/${encodeURIComponent(id)}`)
      setPresupuesto(data)
    } catch (err) {
      setError(err.message || 'Error al cargar presupuesto')
      setPresupuesto(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    cargar()
  }, [cargar])

  const transitionState = async (nuevoEstado) => {
    if (!presupuesto) return
    const confirmMsg = {
      APROBADO: '¿Marcar este presupuesto como APROBADO? El cliente lo está eligiendo.',
      RECHAZADO: '¿Marcar este presupuesto como RECHAZADO? El cliente eligió la otra opción.',
    }[nuevoEstado]
    if (confirmMsg && !window.confirm(confirmMsg)) return

    setActioning(true)
    try {
      const updated = await apiFetch(`/api/construccion/presupuestos/${presupuesto.id}`, {
        method: 'PATCH',
        body: { estado: nuevoEstado },
      })
      setPresupuesto((p) => (p ? { ...p, estado: updated.estado } : p))
    } catch (err) {
      window.alert(err.message || 'Error en la transición')
    } finally {
      setActioning(false)
    }
  }

  const grouped = useMemo(
    () => (presupuesto ? groupPartidas(presupuesto.partidas) : []),
    [presupuesto]
  )

  if (loading) {
    return (
      <div className="pres-page">
        <div className="pres-state">Cargando presupuesto…</div>
      </div>
    )
  }

  if (error || !presupuesto) {
    return (
      <div className="pres-page">
        <button className="pres-back" onClick={() => navigate(-1)}>
          ← Regresar
        </button>
        <div className="pres-state pres-error">{error ?? 'Presupuesto no encontrado'}</div>
      </div>
    )
  }

  const subtotal = presupuesto.montoTotal
  const iva = subtotal * 0.16
  const total = subtotal + iva

  return (
    <div className="pres-page">
      <button className="pres-back" onClick={() => navigate(`/proyectos/${presupuesto.proyecto.id}`)}>
        ← {presupuesto.proyecto.codigo} — {presupuesto.proyecto.nombre}
      </button>

      <header className="pres-header">
        <div>
          <div className="pres-tag">Presupuesto v{presupuesto.version}</div>
          <h1>{presupuesto.nombre ?? `Presupuesto ${presupuesto.version}`}</h1>
          <div className="pres-meta">
            <span className={`pres-estado estado-${presupuesto.estado.toLowerCase()}`}>
              {ESTADO_LABEL[presupuesto.estado] ?? presupuesto.estado}
            </span>
            <span className="muted">
              {presupuesto.partidas.length} partidas · creado{' '}
              {new Date(presupuesto.createdAt).toLocaleDateString('es-MX')}
            </span>
          </div>
        </div>
        <div className="pres-totals-card">
          <div className="row">
            <span>Subtotal</span>
            <strong>{fmtMoney(subtotal)}</strong>
          </div>
          <div className="row">
            <span>IVA 16%</span>
            <strong>{fmtMoney(iva)}</strong>
          </div>
          <div className="row total">
            <span>Total</span>
            <strong>{fmtMoney(total)}</strong>
          </div>
        </div>
      </header>

      {presupuesto.estado === 'BORRADOR' && (
        <div className="pres-actions">
          <button
            className="primary"
            disabled={actioning}
            onClick={() => transitionState('APROBADO')}
          >
            ✓ Aprobar (cliente eligió este)
          </button>
          <button
            className="danger"
            disabled={actioning}
            onClick={() => transitionState('RECHAZADO')}
          >
            ✕ Rechazar (cliente eligió el otro)
          </button>
        </div>
      )}

      {grouped.map((z) => (
        <section key={z.zona} className="pres-zona">
          <h2 className="pres-zona-head">
            <span>{z.zona}</span>
            <span className="pres-zona-total">
              {fmtMoney(z.subtotal)} <span className="muted">({z.porc.toFixed(2)}%)</span>
            </span>
          </h2>

          {z.grupos.map((g) => (
            <div key={g.partida} className="pres-grupo">
              <div className="pres-grupo-head">
                <span className="mono">{g.partida}</span>
                <span className="mono">
                  {fmtMoney(g.subtotal)} · {g.porc.toFixed(2)}%
                </span>
              </div>

              <table className="pres-table">
                <colgroup>
                  <col style={{ width: '9%' }} />
                  <col />
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '6%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Concepto</th>
                    <th>Unidad</th>
                    <th style={{ textAlign: 'right' }}>Cantidad</th>
                    <th style={{ textAlign: 'right' }}>P. Unitario</th>
                    <th style={{ textAlign: 'right' }}>Importe</th>
                    <th style={{ textAlign: 'right' }}>%</th>
                  </tr>
                </thead>
                <tbody>
                  {g.rows.map((p) => (
                    <tr key={p.id}>
                      <td className="mono">{p.concepto?.codigo ?? '—'}</td>
                      <td className="desc">{p.concepto?.descripcion ?? '—'}</td>
                      <td>{p.concepto?.unidad ?? '—'}</td>
                      <td style={{ textAlign: 'right' }}>{fmtQty(p.cantidad)}</td>
                      <td style={{ textAlign: 'right' }}>{fmtMoney(p.precioUnitario)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <strong>{fmtMoney(p.importe)}</strong>
                      </td>
                      <td style={{ textAlign: 'right' }}>{p.porc.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </section>
      ))}

      <footer className="pres-footer">
        <div className="pres-footer-card">
          <div className="row">
            <span>Total del presupuesto sin IVA</span>
            <strong>{fmtMoney(subtotal)}</strong>
          </div>
          <div className="row">
            <span>IVA 16%</span>
            <strong>{fmtMoney(iva)}</strong>
          </div>
          <div className="row total">
            <span>Total del presupuesto</span>
            <strong>{fmtMoney(total)}</strong>
          </div>
        </div>
      </footer>
    </div>
  )
}
