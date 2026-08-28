/**
 * GastoFormModal — captura de un gasto en el flujo nuevo (tipo requisiciones):
 * proveedor (o beneficiario libre), obra OPCIONAL (sin obra = gasto general),
 * categoría, tipo de comprobante (nota o factura) y foto/PDF del comprobante.
 *
 * Lo usan la página Gastos y Caja chica (con `presetCaja` — captura de campo
 * del residente). El gasto nace PENDIENTE y sigue el flujo de autorización:
 * admin lo aprueba → cae en Pagos → tesorería lo paga.
 */

import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../config/api'
import { useAuth } from '../auth/AuthContext'
import FileUpload from './FileUpload'
import './FileUpload.css'
import './GastoFormModal.css'

export const CATEGORIAS = [
  'GASOLINA',
  'VIATICOS',
  'FLETE',
  'HERRAMIENTA_MENOR',
  'EQUIPO_SEGURIDAD',
  'RENTA_EQUIPO',
  'ALIMENTOS',
  'PAPELERIA',
  'SERVICIOS',
  'OTRO',
]

const catLabel = (c) => c.charAt(0) + c.slice(1).toLowerCase().replace(/_/g, ' ')

export default function GastoFormModal({ onClose, onSaved, presetCaja = false }) {
  const { activeCompany } = useAuth()
  const companyId = activeCompany?.id

  const [suppliers, setSuppliers] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [form, setForm] = useState({
    supplierId: '',
    beneficiario: '',
    descripcion: '',
    importe: '',
    proyectoId: '',
    categoria: presetCaja ? 'OTRO' : '',
    comprobanteTipo: 'NOTA',
    notas: '',
    cantidad: '',
    unidad: '',
  })
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  // Autocompletado desde el catálogo (mismo sugerir que requisiciones/caja):
  // al escribir la descripción se ofrecen insumos (y partidas si hay obra);
  // elegir un insumo lo vincula al gasto y rellena la unidad.
  const [sugerencias, setSugerencias] = useState({ insumos: [], partidas: [] })
  const [insumoPick, setInsumoPick] = useState(null) // { id, codigo, descripcion, unidad }
  const sugTimer = useRef(null)

  useEffect(() => {
    if (sugTimer.current) clearTimeout(sugTimer.current)
    const q = form.descripcion.trim()
    if (q.length < 2 || !companyId || insumoPick) {
      setSugerencias({ insumos: [], partidas: [] })
      return
    }
    sugTimer.current = setTimeout(() => {
      const proy = form.proyectoId ? `&proyectoId=${encodeURIComponent(form.proyectoId)}` : ''
      apiFetch(`/api/construccion/gastos/sugerir?companyId=${encodeURIComponent(companyId)}${proy}&q=${encodeURIComponent(q)}`)
        .then((d) => setSugerencias(d && typeof d === 'object' ? d : { insumos: [], partidas: [] }))
        .catch(() => {})
    }, 250)
    return () => clearTimeout(sugTimer.current)
  }, [form.descripcion, form.proyectoId, companyId, insumoPick])

  const pickInsumo = (i) => {
    setInsumoPick(i)
    setSugerencias({ insumos: [], partidas: [] })
    setForm((f) => ({
      ...f,
      descripcion: i.descripcion,
      unidad: f.unidad || i.unidad || '',
    }))
  }

  useEffect(() => {
    if (!companyId) return
    const cid = encodeURIComponent(companyId)
    apiFetch(`/api/construccion/suppliers?companyId=${cid}`)
      .then((d) => setSuppliers(Array.isArray(d) ? d : []))
      .catch(() => {})
    apiFetch(`/api/construccion/proyectos?companyId=${cid}`)
      .then((d) => setProyectos(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [companyId])

  const supplier = suppliers.find((s) => s.id === form.supplierId) || null

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    const beneficiario = supplier?.razonSocial || form.beneficiario.trim()
    if (!beneficiario) { setError('Elige un proveedor o escribe a quién se le pagó.'); return }
    if (!form.categoria && !form.proyectoId) { setError('Elige una categoría para el gasto.'); return }
    setBusy(true)
    try {
      await apiFetch('/api/construccion/gastos', {
        method: 'POST',
        body: {
          companyId,
          proyectoId: form.proyectoId || null,
          supplierId: form.supplierId || null,
          beneficiarioNombre: beneficiario,
          descripcion: form.descripcion.trim(),
          importe: Number(form.importe),
          cantidad: form.cantidad ? Number(form.cantidad) : null,
          unidad: form.unidad.trim() || null,
          // Con insumo del catálogo elegido, el gasto es DIRECTO (se atribuye
          // al insumo). Si no: gasto de obra = indirecto con categoría;
          // gasto general se atribuye por proveedor/categoría.
          insumoId: insumoPick?.id ?? null,
          indirecto: !insumoPick && !!form.proyectoId,
          categoriaIndirecto: form.categoria || null,
          comprobanteTipo: form.comprobanteTipo,
          comprobanteData: file?.data ?? null,
          comprobanteMime: file?.mime ?? null,
          comprobanteName: file?.name ?? null,
          caja: presetCaja,
          notas: form.notas.trim() || null,
        },
      })
      onSaved?.()
      onClose()
    } catch (err) {
      setError(err.message || 'No se pudo registrar el gasto.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-content gf-modal">
        <h3>{presetCaja ? 'Gasto de caja chica' : 'Nuevo gasto'}</h3>
        <form onSubmit={submit}>
          <label>
            Proveedor
            <select
              value={form.supplierId}
              onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
            >
              <option value="">— Sin proveedor (beneficiario libre)</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.razonSocial}</option>
              ))}
            </select>
          </label>
          {!form.supplierId && (
            <label>
              ¿A quién se le pagó?
              <input
                value={form.beneficiario}
                onChange={(e) => setForm({ ...form, beneficiario: e.target.value })}
                placeholder="Nombre del beneficiario"
              />
            </label>
          )}
          <label>
            Descripción
            <input
              value={form.descripcion}
              onChange={(e) => { setInsumoPick(null); setForm({ ...form, descripcion: e.target.value }) }}
              placeholder="¿Qué se compró / pagó? (busca en el catálogo)"
              required
              maxLength={500}
            />
          </label>
          {insumoPick && (
            <div className="gf-insumo-pick">
              🟢 <span className="mono">{insumoPick.codigo}</span> {insumoPick.descripcion}
              {insumoPick.unidad ? ` · ${insumoPick.unidad}` : ''}
              <button type="button" className="link small" onClick={() => setInsumoPick(null)}>quitar</button>
            </div>
          )}
          {!insumoPick && sugerencias.insumos?.length > 0 && (
            <div className="gf-sugerencias">
              {sugerencias.insumos.slice(0, 6).map((i) => (
                <button key={i.id} type="button" className="gf-sug" onClick={() => pickInsumo(i)}>
                  <span className="mono">{i.codigo}</span> {i.descripcion}
                  {i.unidad ? <span className="muted"> · {i.unidad}</span> : null}
                  {i.costoActual != null ? <span className="muted"> · ${Number(i.costoActual).toFixed(2)}</span> : null}
                </button>
              ))}
            </div>
          )}
          <div className="gf-row">
            <label>
              Cantidad
              <input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={form.cantidad}
                onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
                placeholder="opcional"
              />
            </label>
            <label>
              Unidad
              <input
                value={form.unidad}
                onChange={(e) => setForm({ ...form, unidad: e.target.value })}
                placeholder="pza, m3, kg…"
                maxLength={20}
              />
            </label>
          </div>
          <div className="gf-row">
            <label>
              Importe (MXN)
              <input
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                value={form.importe}
                onChange={(e) => setForm({ ...form, importe: e.target.value })}
                required
              />
            </label>
            <label>
              Categoría
              <select
                value={form.categoria}
                onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              >
                <option value="">— Elegir</option>
                {CATEGORIAS.map((c) => (
                  <option key={c} value={c}>{catLabel(c)}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Obra
            <select
              value={form.proyectoId}
              onChange={(e) => setForm({ ...form, proyectoId: e.target.value })}
            >
              <option value="">Gasto general (sin obra)</option>
              {proyectos.map((p) => (
                <option key={p.id} value={p.id}>{p.codigo} — {p.nombre}</option>
              ))}
            </select>
          </label>

          <div className="gf-comprobante">
            <span className="gf-label">Comprobante</span>
            <div className="gf-tipo">
              {['NOTA', 'FACTURA'].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`gf-tipo-btn${form.comprobanteTipo === t ? ' active' : ''}`}
                  onClick={() => setForm({ ...form, comprobanteTipo: t })}
                >
                  {t === 'NOTA' ? '🧾 Nota' : '📄 Factura'}
                </button>
              ))}
            </div>
            <FileUpload
              value={file}
              onChange={setFile}
              label={form.comprobanteTipo === 'NOTA' ? '📎 Foto de la nota' : '📎 Foto o PDF de la factura'}
            />
          </div>

          <label>
            Notas
            <input
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              placeholder="Opcional"
              maxLength={1000}
            />
          </label>

          {error && <p className="gf-error">{error}</p>}
          <div className="gf-actions">
            <button type="button" className="gf-ghost" onClick={onClose} disabled={busy}>Cancelar</button>
            <button type="submit" className="gf-primary" disabled={busy}>
              {busy ? 'Guardando…' : 'Registrar gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
