/**
 * DECOLSA mobile PWA shell — ported from the design handoff
 * (`mobile-app.jsx`). Bottom tab bar, the approval/conciliation bottom
 * sheet, and in-session approval state. Built for an owner/director acting
 * on the go: approving budgets/estimates and reviewing cash.
 *
 * Mounted by Layout in place of the desktop shell on phone viewports. The
 * iPhone bezel + scaling wrapper from the prototype are review-only and are
 * intentionally NOT shipped — this fills the device viewport directly.
 *
 * Data: the project list + contracted total come from the live
 * `/api/construccion/proyectos` endpoint (with the sample portfolio as a
 * fallback); the remaining figures use the documented sample block. The
 * approval/conciliation flow is optimistic in-session state — wire it to
 * real contabilidad-os mutations when those land.
 */

import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { apiFetch } from '../config/api'
import { Icon } from '../components/ds/Icon'
import { money } from '../lib/format'
import { DATA, BADGE_COLORS } from './sampleData'
import { MInicio, MProyectos, MProjectDetail, MTesoreria, MPendientes, MMas } from './screens'
import './mobile.css'

const TABS = [
  { id: 'inicio', label: 'Inicio', icon: 'dashboard' },
  { id: 'proyectos', label: 'Proyectos', icon: 'projects' },
  { id: 'pendientes', label: 'Pendientes', icon: 'check' },
  { id: 'tesoreria', label: 'Tesorería', icon: 'tesoreria' },
  { id: 'mas', label: 'Más', icon: 'moreH' },
]

const ESTADO_META = {
  PLANEACION: { cls: 'plan', label: 'Planeación' },
  EN_EJECUCION: { cls: 'active', label: 'En obra' },
  SUSPENDIDO: { cls: 'risk', label: 'Suspendido' },
  TERMINADO: { cls: 'active', label: 'Terminado' },
  CANCELADO: { cls: 'risk', label: 'Cancelado' },
}

// Map a live proyecto record to the mobile project-row shape.
function toRow(p, i) {
  const meta = ESTADO_META[p.estado] ?? { cls: 'plan', label: p.estado ?? '—' }
  return {
    id: p.id,
    code: p.codigo,
    name: p.nombre,
    short: (p.nombre?.[0] ?? '·').toUpperCase(),
    color: BADGE_COLORS[i % BADGE_COLORS.length],
    location: p.ubicacion || '',
    status: meta.cls,
    statusLabel: meta.label,
    contratado: Number(p.montoContratado) || 0,
    avance: Number(p.avancePct) || 0,
    plan: 0,
    porCobrar: 0,
    estimaciones: p._count?.estimaciones ?? 0,
    presupuestos: p._count?.presupuestos ?? 0,
  }
}

function ApprovalSheet({ sheet, onClose, onCommit }) {
  const [phase, setPhase] = useState('confirm')
  useEffect(() => {
    setPhase('confirm')
  }, [sheet && sheet.id, sheet && sheet.type])
  if (!sheet) {
    return (
      <div className="m-sheet-scrim">
        <div className="m-sheet" />
      </div>
    )
  }

  const isConciliar = sheet.type === 'conciliar'
  const commit = () => {
    onCommit(sheet)
    setPhase('success')
  }

  const titles = {
    pre: ['Aprobar presupuesto', 'El cliente eligió este presupuesto como contrato.'],
    est: ['Aprobar estimación', 'Se marcará como aprobada y lista para facturar.'],
    conciliar: ['Conciliar movimiento', 'Vincula este movimiento bancario a una requisición.'],
    'pre-review': ['Revisar presupuesto', 'Detalle antes de aprobar.'],
    'est-review': ['Revisar estimación', 'Detalle antes de aprobar.'],
  }
  const [title, sub] = titles[sheet.type] || ['', '']

  return (
    <div className="m-sheet-scrim open" onClick={onClose}>
      <div className="m-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        {phase === 'confirm' && (
          <>
            <h3>{title}</h3>
            <div className="sub">{sub}</div>
            <div className="m-sheet-sum">
              <div className="row"><span className="l">Concepto</span><span className="v" style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 13.5 }}>{sheet.name}</span></div>
              <div className="row"><span className="l">{isConciliar ? 'Monto' : 'Importe'}</span><span className="v" style={{ color: isConciliar && sheet.amount < 0 ? 'var(--neg)' : 'var(--ink)' }}>{isConciliar && sheet.amount < 0 ? '−' : ''}{money(Math.abs(sheet.amount))}</span></div>
              {isConciliar
                ? <div className="row"><span className="l">Vincular a</span><span className="v" style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 13.5, color: 'var(--info)' }}>Requisición #REQ-0291</span></div>
                : <div className="row"><span className="l">Estado nuevo</span><span className="v" style={{ color: 'var(--pos)', fontFamily: 'var(--font-ui)', fontWeight: 700, fontSize: 13.5 }}>Aprobada</span></div>}
            </div>
            <div className="m-sheet-actions">
              <button className="m-btn m-btn-ghost" onClick={onClose}>Cancelar</button>
              <button className={'m-btn ' + (isConciliar ? 'm-btn-primary' : 'm-btn-approve')} onClick={commit}>
                <Icon name="check" />{isConciliar ? 'Conciliar' : 'Aprobar'}
              </button>
            </div>
          </>
        )}
        {phase === 'success' && (
          <div className="m-sheet-success">
            <div className="check"><Icon name="check" /></div>
            <h3>{isConciliar ? 'Movimiento conciliado' : 'Aprobado'}</h3>
            <div className="sub" style={{ marginBottom: 18 }}>{sheet.name}</div>
            <button className="m-btn m-btn-primary" style={{ width: '100%' }} onClick={onClose}>Listo</button>
          </div>
        )}
      </div>
    </div>
  )
}

// Secondary modules surfaced in "Más" — these route out to the desktop
// layout (with the drawer) on mobile until they have their own mobile screens.
const MAS_MODULES = [
  ['requisiciones', 'Requisiciones', '/requisiciones'],
  ['catalog', 'Catálogo de conceptos', '/catalogo'],
  ['proveedores', 'Proveedores', '/proveedores-bartiz'],
  ['gastos', 'Gastos', '/gastos'],
  ['cajachica', 'Caja Chica', '/caja-chica'],
  ['destajo', 'Destajo', '/destajo'],
  ['reportes', 'Reportes', '/reportes'],
]

// Initial tab from the entry route (deep links to /proyectos, /tesoreria).
function tabForPath(pathname) {
  if (pathname.startsWith('/tesoreria')) return 'tesoreria'
  if (pathname.startsWith('/proyectos')) return 'proyectos'
  return 'inicio'
}

export default function MobileApp() {
  const { user, activeCompany, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [tab, setTab] = useState(() => tabForPath(location.pathname))
  const [project, setProject] = useState(null)
  const [sheet, setSheet] = useState(null)
  const [approved, setApproved] = useState({})
  const [conciliated, setConciliated] = useState({})

  const [liveProjects, setLiveProjects] = useState(null)
  const [cfdiResumen, setCfdiResumen] = useState(null)

  useEffect(() => {
    if (!activeCompany?.id) return
    apiFetch(`/api/construccion/proyectos?companyId=${encodeURIComponent(activeCompany.id)}`)
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setLiveProjects(list.length ? list.map(toRow) : null)
      })
      .catch((err) => {
        console.error('Error loading mobile projects:', err)
        setLiveProjects(null)
      })
  }, [activeCompany?.id])

  useEffect(() => {
    if (!activeCompany?.id) return
    apiFetch(`/api/construccion/cfdis/resumen?companyId=${encodeURIComponent(activeCompany.id)}`)
      .then((d) => { if (d && typeof d.porVincular === 'number') setCfdiResumen(d) })
      .catch(() => {})
  }, [activeCompany?.id])

  const projects = liveProjects ?? DATA.projects

  const totals = useMemo(() => {
    if (!liveProjects) return DATA.totals
    const contratado = liveProjects.reduce((s, p) => s + (p.contratado || 0), 0)
    const activos = liveProjects.filter((p) => p.contratado > 0).length
    return { ...DATA.totals, contratado, activos }
  }, [liveProjects])

  const go = (t) => {
    setProject(null)
    setTab(t)
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }
  const openProject = (p) => setProject(p)
  const closeSheet = () => setSheet(null)
  const commit = (s) => {
    if (s.type === 'conciliar') setConciliated((c) => ({ ...c, [s.id]: true }))
    else setApproved((a) => ({ ...a, [s.id]: true }))
  }

  const pendCount =
    ['pre-platino', 'pre-tp01', 'est-2'].filter((id) => !approved[id]).length +
    (cfdiResumen?.porVincular ?? 0)
  const greetName = (user?.name || '').split(' ')[0] || undefined

  let screen
  if (project) {
    screen = <MProjectDetail project={project} back={() => setProject(null)} openSheet={setSheet} approved={approved} />
  } else if (tab === 'inicio') {
    screen = <MInicio projects={projects} totals={totals} banks={DATA.banks} saldoTotal={DATA.saldoTotal} go={go} openProject={openProject} openSheet={setSheet} approved={approved} greetName={greetName} />
  } else if (tab === 'proyectos') {
    screen = <MProyectos projects={projects} openProject={openProject} />
  } else if (tab === 'pendientes') {
    screen = <MPendientes openSheet={setSheet} approved={approved} go={go} cfdiResumen={cfdiResumen} navigate={navigate} />
  } else if (tab === 'tesoreria') {
    screen = <MTesoreria banks={DATA.banks} saldoTotal={DATA.saldoTotal} openSheet={setSheet} conciliated={conciliated} />
  } else {
    screen = (
      <MMas
        company={activeCompany}
        user={user}
        modules={MAS_MODULES}
        onOpenModule={(route) => navigate(route)}
        onLogout={logout}
      />
    )
  }

  return (
    <div className="ds m-app">
      {screen}

      {!project && (
        <nav className="m-tabbar">
          {TABS.map((tb) => (
            <button key={tb.id} className={'m-tab' + (tab === tb.id ? ' active' : '')} onClick={() => go(tb.id)}>
              <Icon name={tb.icon} />
              <span className="tl">{tb.label}</span>
              {tb.id === 'pendientes' && pendCount > 0 && <span className="tbadge">{pendCount}</span>}
            </button>
          ))}
        </nav>
      )}

      <ApprovalSheet sheet={sheet} onClose={closeSheet} onCommit={commit} />
    </div>
  )
}
