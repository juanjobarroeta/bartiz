/**
 * Usuarios — gestión de acceso al satélite de construcción (sólo admin).
 *
 * Contra /api/construccion/usuarios (contabilidad-os): alta de usuarios
 * encajonados al módulo CONSTRUCCION con su rol (ADMIN / TESORERIA /
 * RESIDENTE), cambio de rol, reset de contraseña y baja de acceso. Los
 * roles restringidos nunca llegan aquí: la ruta ni aparece en su nav y el
 * backend la rechaza.
 */

import { useCallback, useEffect, useState } from 'react'
import './Usuarios.css'
import { apiFetch } from '../config/api'
import { useAuth } from '../auth/AuthContext'
import { PAGINAS, paginasDelRol } from '../auth/roles'

const ROLES = [
  {
    value: 'ADMIN',
    label: 'Admin',
    desc: 'Acceso completo a todos los módulos.',
  },
  {
    value: 'TESORERIA',
    label: 'Tesorería',
    desc: 'Sólo la cola de pagos que admin mandó a tesorería.',
  },
  {
    value: 'RESIDENTE',
    label: 'Residente',
    desc: 'Genera requisiciones; ve presupuestos, precios unitarios y caja chica (sin editar).',
  },
  {
    value: 'CONTABILIDAD',
    label: 'Contabilidad',
    desc: 'Proveedores completos, compras por autorizar, cuentas por pagar y presupuestos (lectura).',
  },
]

const ROL_LABEL = Object.fromEntries(ROLES.map((r) => [r.value, r.label]))

/**
 * Páginas VISIBLES efectivas de una fila: su lista guardada (o todas las de
 * su rol si está vacía), recortada al alcance del rol. La matriz sólo
 * recorta: una página fuera del alcance del rol no se puede prender aquí —
 * para eso se cambia el rol (el backend igual rechazaría la operación).
 */
const visiblesDe = (row) => {
  const alcance = paginasDelRol(row.construccionRol)
  const base = row.paginas?.length ? row.paginas : alcance
  return new Set(base.filter((k) => alcance.includes(k)))
}

const EMPTY_FORM = { name: '', email: '', password: '', construccionRol: 'RESIDENTE' }

const Usuarios = () => {
  const { activeCompany, user: me } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState(null)
  // Reset de contraseña por fila
  const [resetFor, setResetFor] = useState(null) // memberId
  const [resetPwd, setResetPwd] = useState('')
  // Edición de nombre por fila
  const [nombreFor, setNombreFor] = useState(null) // memberId
  const [nombreVal, setNombreVal] = useState('')

  const cid = activeCompany?.id

  const load = useCallback(async () => {
    if (!cid) return
    setLoading(true)
    setError(null)
    try {
      const data = await apiFetch(`/api/construccion/usuarios?companyId=${encodeURIComponent(cid)}`)
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los usuarios.')
    } finally {
      setLoading(false)
    }
  }, [cid])

  useEffect(() => { load() }, [load])

  const crear = async (e) => {
    e.preventDefault()
    setFormError(null)
    setBusy(true)
    try {
      await apiFetch('/api/construccion/usuarios', {
        method: 'POST',
        body: { companyId: cid, ...form },
      })
      setCreating(false)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      setFormError(err.message || 'No se pudo crear el usuario.')
    } finally {
      setBusy(false)
    }
  }

  const cambiarRol = async (row, construccionRol) => {
    try {
      // Cambiar de rol resetea la matriz de páginas ([] = todas las del rol):
      // arrastrar recortes del rol anterior daría visibilidades inexplicables.
      await apiFetch(`/api/construccion/usuarios/${row.memberId}?companyId=${encodeURIComponent(cid)}`, {
        method: 'PATCH',
        body: { construccionRol, paginas: [] },
      })
      load()
    } catch (err) {
      window.alert(err.message || 'No se pudo cambiar el rol.')
    }
  }

  const togglePagina = async (row, key) => {
    const alcance = paginasDelRol(row.construccionRol)
    if (!alcance.includes(key)) return
    const esAdminRow = !row.construccionRol || row.construccionRol === 'ADMIN'
    if (esAdminRow && key === 'usuarios') return // un admin nunca pierde Usuarios
    const vis = visiblesDe(row)
    if (vis.has(key)) vis.delete(key)
    else vis.add(key)
    if (vis.size === 0) { window.alert('Debe quedar al menos una página visible.'); return }
    // Todas prendidas = sin restricción ([]): así un rol nuevo no arrastra lista.
    const lista = alcance.every((k) => vis.has(k)) ? [] : [...vis]
    setRows((rs) => rs.map((r) => (r.memberId === row.memberId ? { ...r, paginas: lista } : r)))
    try {
      await apiFetch(`/api/construccion/usuarios/${row.memberId}?companyId=${encodeURIComponent(cid)}`, {
        method: 'PATCH',
        body: { paginas: lista },
      })
    } catch (err) {
      window.alert(err.message || 'No se pudo guardar el cambio.')
      load()
    }
  }

  const resetear = async (e) => {
    e.preventDefault()
    if (resetPwd.length < 8) { window.alert('Mínimo 8 caracteres.'); return }
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/usuarios/${resetFor}?companyId=${encodeURIComponent(cid)}`, {
        method: 'PATCH',
        body: { newPassword: resetPwd },
      })
      setResetFor(null)
      setResetPwd('')
      window.alert('✓ Contraseña actualizada.')
    } catch (err) {
      window.alert(err.message || 'No se pudo cambiar la contraseña.')
    } finally {
      setBusy(false)
    }
  }

  const renombrar = async (e) => {
    e.preventDefault()
    const name = nombreVal.trim()
    if (!name) return
    setBusy(true)
    try {
      await apiFetch(`/api/construccion/usuarios/${nombreFor}?companyId=${encodeURIComponent(cid)}`, {
        method: 'PATCH',
        body: { name },
      })
      setNombreFor(null)
      setNombreVal('')
      load()
    } catch (err) {
      window.alert(err.message || 'No se pudo cambiar el nombre.')
    } finally {
      setBusy(false)
    }
  }

  const quitar = async (row) => {
    if (!window.confirm(`¿Quitar el acceso de ${row.name || row.email} a ${activeCompany?.razonSocial}?`)) return
    try {
      await apiFetch(`/api/construccion/usuarios/${row.memberId}?companyId=${encodeURIComponent(cid)}`, {
        method: 'DELETE',
      })
      load()
    } catch (err) {
      window.alert(err.message || 'No se pudo quitar el acceso.')
    }
  }

  // Filas que este panel puede administrar: no OWNER, no uno mismo.
  const editable = (row) => row.role !== 'OWNER' && row.userId !== me?.id

  return (
    <div className="ds">
      <div className="page">
        <div className="usr-head">
          <div>
            <h1 className="usr-title">Usuarios</h1>
            <span className="hint">Acceso al sistema de obra · {activeCompany?.razonSocial}</span>
          </div>
          <button className="usr-add" onClick={() => { setCreating(true); setFormError(null) }}>
            + Usuario
          </button>
        </div>

        <div className="card">
          {loading ? (
            <div className="usr-empty">Cargando usuarios…</div>
          ) : error ? (
            <div className="usr-empty">{error}</div>
          ) : (
            <>
            <div className="scroll-x">
              <table className="ptable usr-table usr-matrix">
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    {PAGINAS.map((p) => (
                      <th key={p.key} className="usr-pag-th"><span>{p.label}</span></th>
                    ))}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const alcance = paginasDelRol(row.construccionRol)
                    const vis = visiblesDe(row)
                    const esAdminRow = !row.construccionRol || row.construccionRol === 'ADMIN'
                    const puedeEditar = editable(row)
                    return (
                    <tr key={row.memberId}>
                      <td>
                        <div className="usr-name">{row.name || '—'}{row.userId === me?.id && <span className="usr-you"> (tú)</span>}</div>
                        <div className="usr-mail">{row.email}</div>
                      </td>
                      <td>
                        {puedeEditar ? (
                          <select
                            className="usr-rol"
                            value={row.construccionRol ?? 'ADMIN'}
                            onChange={(e) => cambiarRol(row, e.target.value)}
                          >
                            {ROLES.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="usr-rol-fixed">
                            {row.role === 'OWNER' ? 'Propietario' : ROL_LABEL[row.construccionRol] ?? 'Admin'}
                          </span>
                        )}
                      </td>
                      {PAGINAS.map((p) => {
                        const enAlcance = alcance.includes(p.key)
                        const fija = esAdminRow && p.key === 'usuarios'
                        if (!enAlcance) {
                          return (
                            <td key={p.key} className="usr-pag c" title={`Fuera del alcance del rol ${ROL_LABEL[row.construccionRol] ?? 'Admin'} — cámbiale el rol para dársela`}>
                              <span className="usr-pag-na">—</span>
                            </td>
                          )
                        }
                        return (
                          <td key={p.key} className="usr-pag c">
                            <input
                              type="checkbox"
                              checked={vis.has(p.key)}
                              disabled={!puedeEditar || fija}
                              title={fija ? 'Un admin siempre conserva Usuarios' : `${p.label}: ${vis.has(p.key) ? 'visible' : 'oculta'}`}
                              onChange={() => togglePagina(row, p.key)}
                            />
                          </td>
                        )
                      })}
                      <td className="r">
                        {puedeEditar && (
                          <div className="usr-actions">
                            <button className="usr-link" onClick={() => { setNombreFor(row.memberId); setNombreVal(row.name || '') }}>
                              nombre
                            </button>
                            <button className="usr-link" onClick={() => { setResetFor(row.memberId); setResetPwd('') }}>
                              contraseña
                            </button>
                            <button className="usr-link danger" onClick={() => quitar(row)}>
                              quitar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="usr-matrix-help">
              ✓ página visible para ese usuario · casilla vacía = oculta ·
              «—» = fuera del alcance de su rol (cámbiale el rol para dársela).
              El rol sigue mandando sobre lo que puede <strong>hacer</strong>
              (autorizar, pagar, editar); la matriz sólo recorta lo que
              <strong> ve</strong>.
            </p>
            </>
          )}
        </div>

        <p className="usr-roles-help">
          {ROLES.map((r) => (
            <span key={r.value}><strong>{r.label}</strong> — {r.desc} </span>
          ))}
        </p>

        {creating && (
          <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setCreating(false) }}>
            <div className="modal-content usr-modal">
              <h3>Nuevo usuario</h3>
              <form onSubmit={crear}>
                <label>
                  Nombre
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </label>
                <label>
                  Correo
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </label>
                <label>
                  Contraseña inicial
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    minLength={8}
                    required
                    autoComplete="new-password"
                  />
                </label>
                <label>
                  Rol
                  <select
                    value={form.construccionRol}
                    onChange={(e) => setForm({ ...form, construccionRol: e.target.value })}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </label>
                <p className="usr-rol-desc">
                  {ROLES.find((r) => r.value === form.construccionRol)?.desc}
                </p>
                {formError && <p className="usr-error">{formError}</p>}
                <div className="usr-modal-actions">
                  <button type="button" className="usr-ghost" onClick={() => setCreating(false)} disabled={busy}>
                    Cancelar
                  </button>
                  <button type="submit" className="usr-primary" disabled={busy}>
                    {busy ? 'Creando…' : 'Crear usuario'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {nombreFor && (
          <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setNombreFor(null) }}>
            <div className="modal-content usr-modal">
              <h3>Editar nombre</h3>
              <form onSubmit={renombrar}>
                <label>
                  Nombre para {rows.find((r) => r.memberId === nombreFor)?.email}
                  <input
                    value={nombreVal}
                    onChange={(e) => setNombreVal(e.target.value)}
                    maxLength={120}
                    required
                    autoFocus
                  />
                </label>
                <div className="usr-modal-actions">
                  <button type="button" className="usr-ghost" onClick={() => setNombreFor(null)} disabled={busy}>
                    Cancelar
                  </button>
                  <button type="submit" className="usr-primary" disabled={busy}>
                    {busy ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {resetFor && (
          <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setResetFor(null) }}>
            <div className="modal-content usr-modal">
              <h3>Nueva contraseña</h3>
              <form onSubmit={resetear}>
                <label>
                  Contraseña nueva para {rows.find((r) => r.memberId === resetFor)?.email}
                  <input
                    type="password"
                    value={resetPwd}
                    onChange={(e) => setResetPwd(e.target.value)}
                    minLength={8}
                    required
                    autoComplete="new-password"
                  />
                </label>
                <div className="usr-modal-actions">
                  <button type="button" className="usr-ghost" onClick={() => setResetFor(null)} disabled={busy}>
                    Cancelar
                  </button>
                  <button type="submit" className="usr-primary" disabled={busy}>
                    {busy ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Usuarios
