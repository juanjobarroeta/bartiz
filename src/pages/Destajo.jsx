/**
 * Mano de obra — la nómina de obra (casi toda fuera de la nómina fiscal),
 * cargada a cada proyecto.
 *
 *   • Asistencia   — el residente pasa lista por cuadrilla y día (horas y
 *                    extra) y genera la raya de la semana.
 *   • Rayas        — borrador (destajo + anticipos) → Contabilidad autoriza
 *                    → Tesorería registra el pago. Lo autorizado y pagado
 *                    entra al costo de la obra.
 *   • Cuadrillas   — quién trabaja en cada obra.
 *   • Trabajadores — registro con su jornal (por día) o tarifa por hora.
 *
 * Parte del módulo CONSTRUCCION. Quién la ve lo deciden el rol y la matriz
 * de permisos; qué botones ve cada rol, lib/destajo (el backend lo valida).
 */

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../config/api'
import { puedeCapturar } from '../lib/destajo'
import AsistenciaTab from '../components/destajo/AsistenciaTab'
import RayasTab from '../components/destajo/RayasTab'
import CuadrillasTab from '../components/destajo/CuadrillasTab'
import TrabajadoresTab from '../components/destajo/TrabajadoresTab'
import './Destajo.css'

const TABS = [
  ['asistencia', 'Asistencia'],
  ['rayas', 'Rayas'],
  ['cuadrillas', 'Cuadrillas'],
  ['trabajadores', 'Trabajadores'],
]

export default function Destajo() {
  const { activeCompany, rol } = useAuth()
  const companyId = activeCompany?.id
  const habilitado = activeCompany?.modulos?.includes('CONSTRUCCION')
  const captura = puedeCapturar(rol)

  const [tab, setTab] = useState(captura ? 'asistencia' : 'rayas')
  const [proyectos, setProyectos] = useState([])
  const [proyectoId, setProyectoId] = useState('')
  const [loading, setLoading] = useState(true)
  const [abrirRaya, setAbrirRaya] = useState(null)

  useEffect(() => {
    let alive = true
    if (!companyId || !habilitado) { setLoading(false); return }
    setLoading(true)
    apiFetch(`/api/construccion/proyectos?companyId=${encodeURIComponent(companyId)}`)
      .then((d) => {
        if (!alive) return
        const list = Array.isArray(d) ? d : []
        setProyectos(list)
        setProyectoId((prev) => (list.some((p) => p.id === prev) ? prev : list[0]?.id ?? ''))
      })
      .catch(() => { if (alive) setProyectos([]) })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [companyId, habilitado])

  const verRaya = useCallback((id) => {
    setAbrirRaya(id)
    setTab('rayas')
  }, [])
  const rayaAbierta = useCallback(() => setAbrirRaya(null), [])

  if (!companyId) return <div className="pd-empty">Selecciona una empresa.</div>
  if (!habilitado) {
    return (
      <div className="destajo-page">
        <header>
          <h1>Mano de obra</h1>
          <p className="muted small">
            Esta empresa no tiene el módulo de construcción habilitado para tu
            usuario — pídele al admin que te dé acceso.
          </p>
        </header>
        <div className="pd-empty">Módulo no habilitado.</div>
      </div>
    )
  }

  return (
    <div className="destajo-page">
      <header>
        <h1>Mano de obra</h1>
        <p className="muted small">
          Lista diaria por cuadrilla → raya semanal (jornales + destajo − anticipos) →
          Contabilidad autoriza → Tesorería paga. Todo queda cargado al costo de la obra.
        </p>
      </header>

      <div className="toolbar">
        <div className="filters mo-tabs">
          {TABS.map(([k, l]) => (
            <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="pd-empty">Cargando…</div>
      ) : tab === 'asistencia' ? (
        <AsistenciaTab
          proyectos={proyectos}
          proyectoId={proyectoId}
          setProyectoId={setProyectoId}
          editable={captura}
          onRayaGenerada={verRaya}
        />
      ) : tab === 'rayas' ? (
        <RayasTab proyectos={proyectos} rol={rol} abrirRayaId={abrirRaya} onAbierta={rayaAbierta} />
      ) : tab === 'cuadrillas' ? (
        <CuadrillasTab
          companyId={companyId}
          proyectos={proyectos}
          proyectoId={proyectoId}
          setProyectoId={setProyectoId}
          editable={captura}
        />
      ) : (
        <TrabajadoresTab companyId={companyId} editable={captura} />
      )}
    </div>
  )
}
