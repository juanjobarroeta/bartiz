import { useEffect, useState } from 'react'
import './Dashboard.css'
import { apiFetch } from '../config/api'
import { useAuth } from '../auth/AuthContext'

// Simple Sparkline component
const Sparkline = ({ data, color = 'var(--color-primary)', trend = 'up' }) => {
  // Ensure we have at least 2 data points to avoid division by zero
  if (!data || data.length < 2) {
    return (
      <svg width={120} height={40} className="sparkline">
        <line x1="0" y1="20" x2="120" y2="20" stroke={color} strokeWidth="2" opacity="0.3" />
      </svg>
    )
  }

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const width = 120
  const height = 40
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * height
    return `${x},${y}`
  }).join(' ')

  return (
    <svg width={width} height={height} className="sparkline">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  )
}

// Bar Chart component
const BarChart = ({ data }) => {
  const maxValue = Math.max(...data.map(d => d.dev + d.sales))
  const days = ['Sab', 'Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie']
  
  return (
    <div className="bar-chart">
      <div className="bar-chart-grid">
        {[16, 8, 4, 2, 0].map(label => (
          <div key={label} className="grid-line">
            <span className="grid-label">{label}h</span>
          </div>
        ))}
      </div>
      <div className="bar-chart-bars">
        {data.map((item, index) => (
          <div key={index} className="bar-group">
            <div className="bar-stack">
              <div 
                className="bar bar-dev" 
                style={{ height: `${(item.dev / 16) * 100}%` }}
              />
              <div 
                className="bar bar-sales" 
                style={{ height: `${(item.sales / 16) * 100}%` }}
              />
            </div>
            <span className={`bar-label ${index === 3 ? 'active' : ''}`}>{days[index]}</span>
          </div>
        ))}
      </div>
      <div className="chart-legend">
        <span className="legend-item"><span className="legend-dot dev"></span> Obra: 12h 25min</span>
        <span className="legend-item"><span className="legend-dot sales"></span> Oficina: 9h 12min</span>
      </div>
    </div>
  )
}

// Donut Chart component
const DonutChart = ({ planned, earned }) => {
  const total = planned
  const percentage = Math.round((earned / planned) * 100)
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="donut-chart">
      <svg width="160" height="160" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="#E5E7EB"
          strokeWidth="10"
        />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="none"
          stroke="var(--color-secondary)"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
        <circle
          cx="50"
          cy="50"
          r="35"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="8"
          strokeDasharray={circumference * 0.78}
          strokeDashoffset={circumference * 0.78 * 0.1}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="donut-center">
        <span className="donut-value">{percentage}%</span>
        <span className="donut-label">Rendimiento</span>
      </div>
    </div>
  )
}

const Dashboard = () => {
  const { activeCompany } = useAuth()
  const [stats, setStats] = useState({
    moneySpent: 0,
    projectStatus: 0,
    completedProjects: 0
  })

  const [proyectos, setProyectos] = useState([])

  // Generate sparkline data from actual stats (empty when no data)
  const sparklineData1 = stats.moneySpent > 0 ? [20, 35, 28, 45, 38, 52, 48, 60, 55, 70] : [0]
  const sparklineData2 = stats.projectStatus > 0 ? [60, 55, 65, 50, 58, 45, 52, 40, 48, 35] : [0]
  const sparklineData3 = stats.completedProjects > 0 ? [15, 25, 20, 35, 30, 45, 40, 55, 50, 65] : [0]

  const barChartData = [
    { dev: 0, sales: 0 },
    { dev: 0, sales: 0 },
    { dev: 0, sales: 0 },
    { dev: 0, sales: 0 },
    { dev: 0, sales: 0 },
    { dev: 0, sales: 0 },
    { dev: 0, sales: 0 }
  ]

  useEffect(() => {
    // No company selected yet (fresh login / switcher hasn't hydrated) —
    // skip the fetch instead of 401-ing against an empty companyId.
    if (!activeCompany?.id) {
      setProyectos([])
      setStats({ moneySpent: 0, projectStatus: 0, completedProjects: 0 })
      return
    }

    // Load projects (the top 4 most recent) via the construccion API. The
    // legacy /api/stats + /api/proyectos endpoints never existed on
    // contabilidad-os — we derive dashboard stats from the proyectos list.
    apiFetch(
      `/api/construccion/proyectos?companyId=${encodeURIComponent(activeCompany.id)}`
    )
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setProyectos(list.slice(0, 4))

        // Derive stats client-side: total gastado (montoContratado sum),
        // progreso promedio (avg avance) and # proyectos CERRADOS.
        const totalGastado = list.reduce(
          (a, p) => a + (Number(p.montoContratado) || 0),
          0
        )
        const concretos = list.filter((p) => typeof p.avancePct === 'number')
        const progresoPromedio =
          concretos.length > 0
            ? concretos.reduce((a, p) => a + (p.avancePct || 0), 0) /
              concretos.length
            : 0
        const completados = list.filter((p) => p.estado === 'CERRADO').length

        setStats({
          moneySpent: totalGastado,
          projectStatus: Math.round(progresoPromedio),
          completedProjects: completados,
        })
      })
      .catch((err) => console.error('Error loading dashboard:', err))
  }, [activeCompany?.id])

  const getStatusClass = (estado) => {
    switch(estado) {
      case 'Progreso': return 'status-progress'
      case 'Pendiente': return 'status-pending'
      default: return 'status-default'
    }
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="header-actions">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Buscar" className="search-input" />
            <span className="search-shortcut">⌘K</span>
          </div>
          <button className="header-btn icon-btn">💬</button>
          <button className="header-btn icon-btn">🔔</button>
          <div className="user-avatar">JB</div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="dashboard-toolbar">
        <div className="date-selector">
          <span className="date-icon">📅</span>
          <span>10 Junio 2024 - 30 Junio 2024</span>
        </div>
        <div className="toolbar-actions">
          <button className="btn btn-outline">🔗 Link Público</button>
          <button className="btn btn-primary">↗ Compartir</button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Left Column - Stats Cards */}
        <div className="stats-column">
          <div className="stat-card-new">
            <div className="stat-header">
              <span className="stat-title">Dinero Gastado</span>
            </div>
            <div className="stat-body">
              <div className="stat-main">
                <span className="stat-value">${stats.moneySpent.toLocaleString()}</span>
                <span className="stat-change positive">↑ 18%</span>
              </div>
              <Sparkline data={sparklineData1} color="var(--color-secondary)" />
            </div>
            <div className="stat-footer">Data por 6 Junio 2024</div>
          </div>

          <div className="stat-card-new">
            <div className="stat-header">
              <span className="stat-title">Estado General del Proyecto</span>
            </div>
            <div className="stat-body">
              <div className="stat-main">
                <span className="stat-value">{stats.projectStatus}%</span>
                <span className="stat-change negative">↓ 18%</span>
              </div>
              <Sparkline data={sparklineData2} color="#EF4444" />
            </div>
            <div className="stat-footer">Data por 6 Junio 2024</div>
          </div>

          <div className="stat-card-new">
            <div className="stat-header">
              <span className="stat-title">Proyectos Completados</span>
            </div>
            <div className="stat-body">
              <div className="stat-main">
                <span className="stat-value">{stats.completedProjects}</span>
                <span className="stat-change positive">↑ 18%</span>
              </div>
              <Sparkline data={sparklineData3} color="var(--color-secondary)" />
            </div>
            <div className="stat-footer">Data por 6 Junio 2024</div>
          </div>
        </div>

        {/* Right Column - Work Hours Chart */}
        <div className="chart-card">
          <div className="chart-header">
            <h3>Total Horas Trabajadas</h3>
            <div className="chart-controls">
              <select className="chart-select">
                <option>Mensual</option>
                <option>Semanal</option>
              </select>
              <button className="chart-menu">⋮</button>
            </div>
          </div>
          <BarChart data={barChartData} />
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="dashboard-bottom-grid">
        {/* Projects Table */}
        <div className="projects-card">
          <div className="card-header">
            <h3>Total proyectos</h3>
            <div className="card-controls">
              <button className="sort-btn">☰ Ordenar</button>
              <button className="chart-menu">⋮</button>
            </div>
          </div>
          <table className="projects-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Ubicación</th>
                <th>Responsable</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {proyectos.map(proyecto => (
                <tr key={proyecto.id}>
                  <td>
                    <div className="project-name-cell">
                      <div className="project-icon" style={{ background: proyecto.id % 2 === 0 ? '#EF4444' : 'var(--color-secondary)' }}>
                        {proyecto.nombre[0]}
                      </div>
                      <span>{proyecto.nombre}</span>
                    </div>
                  </td>
                  <td>{proyecto.ubicacion}</td>
                  <td>
                    <div className="owner-cell">
                      <div className="owner-avatar">{proyecto.avatar}</div>
                      <span>{proyecto.responsable}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(proyecto.estado)}`}>
                      {proyecto.estado}
                    </span>
                  </td>
                  <td>
                    <button className="action-btn">⋮</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Performance Donut */}
        <div className="performance-card">
          <div className="card-header">
            <h3>Rendimiento del Proyecto</h3>
            <button className="chart-menu">⋮</button>
          </div>
          <div className="performance-content">
            <DonutChart planned={72940.50} earned={64765.50} />
            <div className="performance-legend">
              <div className="legend-row">
                <span className="legend-color blue"></span>
                <span className="legend-text">Valor Planeado</span>
                <span className="legend-value">$72,940.50</span>
              </div>
              <div className="legend-row">
                <span className="legend-color orange"></span>
                <span className="legend-text">Valor Ganado</span>
                <span className="legend-value">$64,765.50</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
