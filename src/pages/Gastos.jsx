/**
 * Gastos — rediseño al flujo tipo requisiciones.
 *
 * Gastos que NO nacen de una requisición de obra: pueden ser generales de la
 * empresa (sin obra, ligados a un proveedor) o de obra sin partida (indirectos
 * con categoría). Cada gasto trae su comprobante (nota o factura, con foto) y
 * sigue el mismo flujo de autorización que las requisiciones:
 *
 *   capturar (PENDIENTE) → autorizar (admin) → cola de Pagos → tesorería paga
 *
 * La captura vive en GastoFormModal (compartida con Caja chica).
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import './Gastos.css'
import { apiFetch } from '../config/api'
import { useAuth } from '../auth/AuthContext'
import { money } from '../lib/format'
import GastoFormModal from '../components/GastoFormModal'
import { confirmDialog, alertDialog } from '../components/Dialog'

const ESTADOS = [
  { id: 'PENDIENTE', label: 'Por autorizar' },
  { id: 'APROBADO', label: 'Autorizados' },
  { id: 'PAGADO', label: 'Pagados' },
  { id: 'RECHAZADO', label: 'Rechazados' },
  { id: 'TODOS', label: 'Todos' },
]

const ESTADO_CHIP = {
  PENDIENTE: { cls: 'plan', label: 'Por autorizar' },
  APROBADO: { cls: 'active', label: 'Autorizado' },
  PAGADO: { cls: 'active', label: 'Pagado' },
  RECHAZADO: { cls: 'risk', label: 'Rechazado' },
}

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }) : '—'

// Abre el comprobante con el bearer (un <a href> directo no lo llevaría).
async function abrirComprobante(gasto) {
  if (gasto.comprobanteUrl) { window.open(gasto.comprobanteUrl, '_blank'); return }
  try {
    const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || ''
    const token = localStorage.getItem('cadmin.token')
    const res = await fetch(`${base}/api/construccion/gastos/${gasto.id}/comprobante`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) throw new Error('No se pudo abrir el comprobante')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  } catch (err) {
    alertDialog({ message: err.message || 'Error' })
  }
}

export default function Gastos() {
  const { activeCompany, rol } = useAuth()
  const companyId = activeCompany?.id
  const esAdmin = !rol || rol === 'ADMIN'

  const [gastos, setGastos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('PENDIENTE')
  const [soloCaja, setSoloCaja] = useState(false)
  const [capturando, setCapturando] = useState(false)
  const [actioningId, setActioningId] = useState(null)

  const load = useCallback(async () => {
    if (!companyId) return
    setLoading(true)
    try {
      const data = await apiFetch(`/api/construccion/gastos?companyId=${encodeURIComponent(companyId)}`)
      setGastos(Array.isArray(data) ? data : [])
    } catch {
      setGastos([])
    } finally {
      setLoading(false)
    }
  }, [companyId])

  useEffect(() => { load() }, [load])

  const counts = useMemo(() => {
    const c = { TODOS: gastos.length }
    for (const g of gastos) c[g.estado] = (c[g.estado] || 0) + 1
    return c
  }, [gastos])

  const rows = useMemo(
    () =>
      gastos
        .filter((g) => (filtro === 'TODOS' ? true : g.estado === filtro))
        .filter((g) => (soloCaja ? g.caja : true)),
    [gastos, filtro, soloCaja]
  )

  const totalFiltrado = useMemo(() => rows.reduce((s, g) => s + (g.importe || 0), 0), [rows])

  const autorizar = async (g) => {
    setActioningId(g.id)
    try {
      await apiFetch(`/api/construccion/gastos/${g.id}/aprobar`, { method: 'POST' })
      load()
    } catch (err) {
      alertDialog({ message: err.message || 'No se pudo autorizar.' })
    } finally {
      setActioningId(null)
    }
  }

  const rechazar = async (g) => {
    const ok = await confirmDialog({
      message: `¿Rechazar el gasto de ${money(g.importe)} (${g.beneficiarioNombre})?`,
    })
    if (!ok) return
    setActioningId(g.id)
    try {
      await apiFetch(`/api/construccion/gastos/${g.id}`, {
        method: 'PATCH',
        body: { estado: 'RECHAZADO' },
      })
      load()
    } catch (err) {
      alertDialog({ message: err.message || 'No se pudo rechazar.' })
    } finally {
      setActioningId(null)
    }
  }

  return (
    <div className="ds">
      <div className="page">
        <div className="gx-head">
          <div>
            <h1 className="gx-title">Gastos</h1>
            <span className="hint">
              Generales y de obra sin requisición · se autorizan y pagan como las compras
            </span>
          </div>
          <button className="gx-add" onClick={() => setCapturando(true)}>+ Gasto</button>
        </div>

        <div className="gx-filters">
          {ESTADOS.map((e) => (
            <button
              key={e.id}
              className={`gx-chip${filtro === e.id ? ' active' : ''}`}
              onClick={() => setFiltro(e.id)}
            >
              {e.label}
              {counts[e.id] > 0 && <span className="gx-chip-n">{counts[e.id]}</span>}
            </button>
          ))}
          <div className="spacer" />
          <label className="gx-caja-toggle">
            <input type="checkbox" checked={soloCaja} onChange={(e) => setSoloCaja(e.target.checked)} />
            Sólo caja chica
          </label>
        </div>

        <div className="card">
          {loading ? (
            <div className="gx-empty">Cargando gastos…</div>
          ) : rows.length === 0 ? (
            <div className="gx-empty">
              {filtro === 'PENDIENTE'
                ? 'No hay gastos por autorizar. Captura uno con «+ Gasto».'
                : 'Sin gastos en este filtro.'}
            </div>
          ) : (
            <div className="scroll-x">
              <table className="ptable gx-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Proveedor / beneficiario</th>
                    <th>Descripción</th>
                    <th>Comprobante</th>
                    <th className="r">Importe</th>
                    <th>Estado</th>
                    {esAdmin && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((g) => {
                    const chip = ESTADO_CHIP[g.estado] ?? { cls: 'plan', label: g.estado }
                    const tieneArchivo = g.comprobanteName || g.comprobanteUrl
                    return (
                      <tr key={g.id}>
                        <td className="gx-date">{fmtDate(g.createdAt)}</td>
                        <td>
                          <div className="gx-benef">{g.supplier?.razonSocial || g.beneficiarioNombre}</div>
                          <div className="gx-scope">
                            {g.proyecto ? `${g.proyecto.codigo} · ${g.proyecto.nombre}` : 'Gasto general'}
                            {g.caja ? ' · caja chica' : ''}
                          </div>
                        </td>
                        <td className="gx-desc">
                          {g.descripcion}
                          {g.categoriaIndirecto && (
                            <span className="gx-cat"> · {g.categoriaIndirecto.toLowerCase().replace(/_/g, ' ')}</span>
                          )}
                        </td>
                        <td>
                          {tieneArchivo ? (
                            <button className="gx-comp" onClick={() => abrirComprobante(g)}>
                              {g.comprobanteTipo === 'FACTURA' ? '📄 Factura' : '🧾 Nota'}
                            </button>
                          ) : (
                            <span className="gx-comp-none">
                              {g.comprobanteTipo === 'FACTURA' ? 'factura' : 'nota'} sin foto
                            </span>
                          )}
                        </td>
                        <td className="r"><span className="money big num">{money(g.importe)}</span></td>
                        <td>
                          <span className={'status ' + chip.cls}>
                            <span className="sdot" />
                            {chip.label}
                          </span>
                        </td>
                        {esAdmin && (
                          <td className="r">
                            {g.estado === 'PENDIENTE' && (
                              <div className="gx-actions">
                                <button
                                  className="gx-ok"
                                  disabled={actioningId === g.id}
                                  onClick={() => autorizar(g)}
                                >
                                  Autorizar
                                </button>
                                <button
                                  className="gx-no"
                                  disabled={actioningId === g.id}
                                  onClick={() => rechazar(g)}
                                >
                                  Rechazar
                                </button>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {rows.length > 0 && (
            <div className="gx-foot">
              {rows.length} gasto{rows.length === 1 ? '' : 's'} · total {money(totalFiltrado)}
            </div>
          )}
        </div>

        {capturando && (
          <GastoFormModal onClose={() => setCapturando(false)} onSaved={load} />
        )}
      </div>
    </div>
  )
}
