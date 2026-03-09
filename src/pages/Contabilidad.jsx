import { useState, useEffect } from 'react'
import './Shared.css'
import './Dashboard.css'
import './ProyectoDetalle.css'

const Contabilidad = () => {
  const [tabActiva, setTabActiva] = useState('ledger')
  const [movimientos, setMovimientos] = useState([])
  const [catalogoCuentas, setCatalogoCuentas] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [nuevoMovimiento, setNuevoMovimiento] = useState({
    fecha: new Date().toISOString().split('T')[0],
    tipo: 'egreso',
    categoria: 'materiales',
    subcategoria: '',
    descripcion: '',
    proyecto: '',
    monto: '',
    referencia: '',
    metodoPago: 'transferencia'
  })

  useEffect(() => {
    // Cargar catálogo de cuentas
    fetch('/api/catalogo-cuentas')
      .then(res => res.json())
      .then(data => setCatalogoCuentas(data))
      .catch(() => setCatalogoCuentas([]))

    // Cargar proyectos
    fetch('/api/proyectos')
      .then(res => res.json())
      .then(data => setProyectos(data))
      .catch(() => setProyectos([]))

    // Cargar movimientos contables
    fetch('/api/contabilidad')
      .then(res => res.json())
      .then(data => setMovimientos(data))
      .catch(() => {
        setMovimientos([
          { 
            id: 1, 
            fecha: '2024-11-01', 
            tipo: 'ingreso', 
            categoria: 'anticipo',
            subcategoria: 'Cliente',
            descripcion: 'Anticipo 40% Torre Corporativa', 
            proyecto: 'Torre Corporativa Centro',
            monto: 1000000,
            referencia: 'ING-001',
            metodoPago: 'transferencia'
          },
          { 
            id: 2, 
            fecha: '2024-11-05', 
            tipo: 'egreso', 
            categoria: 'materiales',
            subcategoria: 'Cemento',
            descripcion: 'Compra cemento portland 150 bultos', 
            proyecto: 'Torre Corporativa Centro',
            monto: 27750,
            referencia: 'EGR-045',
            metodoPago: 'transferencia'
          },
          { 
            id: 3, 
            fecha: '2024-11-08', 
            tipo: 'egreso', 
            categoria: 'nomina',
            subcategoria: 'Pago quincenal',
            descripcion: 'Nómina 1ra quincena noviembre', 
            proyecto: 'Varios',
            monto: 125000,
            referencia: 'NOM-Q22',
            metodoPago: 'transferencia'
          },
          { 
            id: 4, 
            fecha: '2024-11-12', 
            tipo: 'egreso', 
            categoria: 'equipos',
            subcategoria: 'Renta',
            descripcion: 'Renta excavadora 15 días', 
            proyecto: 'Plaza Comercial Zona Norte',
            monto: 45000,
            referencia: 'EGR-051',
            metodoPago: 'transferencia'
          },
          { 
            id: 5, 
            fecha: '2024-11-15', 
            tipo: 'ingreso', 
            categoria: 'anticipo',
            subcategoria: 'Cliente',
            descripcion: 'Anticipo 30% Plaza Comercial', 
            proyecto: 'Plaza Comercial Zona Norte',
            monto: 750000,
            referencia: 'ING-003',
            metodoPago: 'cheque'
          },
          { 
            id: 6, 
            fecha: '2024-11-18', 
            tipo: 'egreso', 
            categoria: 'servicios',
            subcategoria: 'Consultoría',
            descripcion: 'Estudio de mecánica de suelos', 
            proyecto: 'Nave Industrial Parque Tech',
            monto: 35000,
            referencia: 'EGR-058',
            metodoPago: 'transferencia'
          },
          { 
            id: 7, 
            fecha: '2024-11-20', 
            tipo: 'egreso', 
            categoria: 'materiales',
            subcategoria: 'Acero',
            descripcion: 'Varilla corrugada 3/8" - 2500 kg', 
            proyecto: 'Residencial Los Pinos',
            monto: 62500,
            referencia: 'EGR-062',
            metodoPago: 'transferencia'
          },
          { 
            id: 8, 
            fecha: '2024-11-22', 
            tipo: 'egreso', 
            categoria: 'nomina',
            subcategoria: 'Pago quincenal',
            descripcion: 'Nómina 2da quincena noviembre', 
            proyecto: 'Varios',
            monto: 125000,
            referencia: 'NOM-Q23',
            metodoPago: 'transferencia'
          }
        ])
      })
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    
    const movimiento = {
      id: movimientos.length + 1,
      ...nuevoMovimiento,
      monto: parseFloat(nuevoMovimiento.monto)
    }

    setMovimientos([...movimientos, movimiento])
    setNuevoMovimiento({
      fecha: new Date().toISOString().split('T')[0],
      tipo: 'egreso',
      categoria: 'materiales',
      subcategoria: '',
      descripcion: '',
      proyecto: '',
      monto: '',
      referencia: '',
      metodoPago: 'transferencia'
    })
    setMostrarFormulario(false)
  }

  const handleChange = (e) => {
    setNuevoMovimiento({
      ...nuevoMovimiento,
      [e.target.name]: e.target.value
    })
  }

  // Calcular totales
  const totalIngresos = movimientos.filter(m => m.tipo === 'ingreso').reduce((sum, m) => sum + m.monto, 0)
  const totalEgresos = movimientos.filter(m => m.tipo === 'egreso').reduce((sum, m) => sum + m.monto, 0)
  const balance = totalIngresos - totalEgresos

  const getTipoBadgeClass = (tipo) => {
    return tipo === 'ingreso' ? 'badge-black' : 'badge-beige'
  }

  // Ordenar por fecha descendente
  const movimientosOrdenados = [...movimientos].sort((a, b) => 
    new Date(b.fecha) - new Date(a.fecha)
  )

  const tabs = [
    { id: 'ledger', label: 'Mayor General', icon: '📖' },
    { id: 'movimientos', label: 'Movimientos', icon: '📝' },
    { id: 'balanza', label: 'Balanza', icon: '⚖️' }
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Contabilidad</h1>
          <div className="subtitle">Sistema contable y libro mayor</div>
        </div>
        {tabActiva === 'movimientos' && (
          <button 
            className="btn btn-primary"
            onClick={() => setMostrarFormulario(!mostrarFormulario)}
          >
            {mostrarFormulario ? 'Cancelar' : '+ Nuevo Movimiento'}
          </button>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-container">
        <div className="tabs-nav">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-btn ${tabActiva === tab.id ? 'active' : ''}`}
              onClick={() => setTabActiva(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {tabActiva === 'ledger' && (
          <LedgerTab cuentas={catalogoCuentas} />
        )}
        
        {tabActiva === 'movimientos' && (
          <MovimientosTab 
            movimientos={movimientos}
            proyectos={proyectos}
            mostrarFormulario={mostrarFormulario}
            setMostrarFormulario={setMostrarFormulario}
            nuevoMovimiento={nuevoMovimiento}
            setNuevoMovimiento={setNuevoMovimiento}
            handleSubmit={handleSubmit}
            handleChange={handleChange}
            setMovimientos={setMovimientos}
            totalIngresos={totalIngresos}
            totalEgresos={totalEgresos}
            balance={balance}
            movimientosOrdenados={movimientosOrdenados}
            getTipoBadgeClass={getTipoBadgeClass}
          />
        )}

        {tabActiva === 'balanza' && (
          <BalanzaTab cuentas={catalogoCuentas} />
        )}
      </div>
    </div>
  )
}

// ==================== LEDGER TAB ====================
const LedgerTab = ({ cuentas }) => {
  const [filtroTipo, setFiltroTipo] = useState('todas')
  const [busqueda, setBusqueda] = useState('')

  // Filtrar cuentas
  const cuentasFiltradas = cuentas.filter(cuenta => {
    const matchTipo = filtroTipo === 'todas' || 
      (filtroTipo === 'activo' && cuenta.codigo.startsWith('1')) ||
      (filtroTipo === 'pasivo' && cuenta.codigo.startsWith('2')) ||
      (filtroTipo === 'capital' && cuenta.codigo.startsWith('3')) ||
      (filtroTipo === 'ingresos' && cuenta.codigo.startsWith('4')) ||
      (filtroTipo === 'egresos' && cuenta.codigo.startsWith('5'))
    
    const matchBusqueda = busqueda === '' || 
      cuenta.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      cuenta.codigo.includes(busqueda)
    
    return matchTipo && matchBusqueda && cuenta.tipo === 'cuenta' // Solo mostrar cuentas, no grupos
  })

  // Calcular totales por naturaleza
  const totalDeudora = cuentasFiltradas
    .filter(c => c.naturaleza === 'deudora')
    .reduce((sum, c) => sum + (c.saldo || 0), 0)
  
  const totalAcreedora = cuentasFiltradas
    .filter(c => c.naturaleza === 'acreedora')
    .reduce((sum, c) => sum + Math.abs(c.saldo || 0), 0)

  return (
    <div className="ledger-container">
      {/* Filtros */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="form-row">
          <div className="form-group">
            <label className="label">Buscar Cuenta</label>
            <input
              type="text"
              className="input"
              placeholder="Buscar por código o nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="label">Tipo de Cuenta</label>
            <select
              className="input"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
            >
              <option value="todas">Todas las Cuentas</option>
              <option value="activo">Activo (1xxx)</option>
              <option value="pasivo">Pasivo (2xxx)</option>
              <option value="capital">Capital (3xxx)</option>
              <option value="ingresos">Ingresos (4xxx)</option>
              <option value="egresos">Costos y Gastos (5xxx)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Totales */}
      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card">
          <div className="label">Total Débitos</div>
          <div className="stat-value">${totalDeudora.toLocaleString('es-MX')}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Créditos</div>
          <div className="stat-value">${totalAcreedora.toLocaleString('es-MX')}</div>
        </div>
        <div className="stat-card stat-card-highlight">
          <div className="label">Diferencia</div>
          <div className="stat-value">
            ${(totalDeudora - totalAcreedora).toLocaleString('es-MX')}
          </div>
        </div>
      </div>

      {/* Tabla Mayor General */}
      <div className="card">
        <h3>Mayor General - Catálogo de Cuentas</h3>
        <div className="table-container" style={{ marginTop: '1rem' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre de la Cuenta</th>
                <th>Naturaleza</th>
                <th>Débito</th>
                <th>Crédito</th>
                <th>Saldo</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {cuentasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-gray)' }}>
                    No se encontraron cuentas
                  </td>
                </tr>
              ) : (
                cuentasFiltradas.map(cuenta => {
                  const saldo = cuenta.saldo || 0
                  const debito = cuenta.naturaleza === 'deudora' && saldo > 0 ? saldo : 0
                  const credito = cuenta.naturaleza === 'acreedora' && saldo !== 0 ? Math.abs(saldo) : 0
                  
                  return (
                    <tr key={cuenta.id}>
                      <td><code>{cuenta.codigo}</code></td>
                      <td>
                        <strong>{cuenta.nombre}</strong>
                        {cuenta.descripcion && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)', marginTop: '0.25rem' }}>
                            {cuenta.descripcion}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${cuenta.naturaleza === 'deudora' ? 'badge-gray' : 'badge-beige'}`}>
                          {cuenta.naturaleza === 'deudora' ? 'Deudora' : 'Acreedora'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {debito > 0 ? `$${debito.toLocaleString('es-MX')}` : '—'}
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                        {credito > 0 ? `$${credito.toLocaleString('es-MX')}` : '—'}
                      </td>
                      <td style={{ 
                        textAlign: 'right', 
                        fontFamily: 'monospace',
                        fontWeight: 'bold'
                      }}>
                        ${Math.abs(saldo).toLocaleString('es-MX')}
                      </td>
                      <td>
                        {cuenta.activa ? (
                          <span style={{ color: 'var(--color-text-light)', fontSize: '0.875rem' }}>✓ Activa</span>
                        ) : (
                          <span style={{ color: 'var(--color-gray)', fontSize: '0.875rem' }}>Inactiva</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
            <tfoot>
              <tr style={{ fontWeight: 'bold', background: 'var(--color-bg)' }}>
                <td colSpan="3">TOTALES</td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                  ${totalDeudora.toLocaleString('es-MX')}
                </td>
                <td style={{ textAlign: 'right', fontFamily: 'monospace' }}>
                  ${totalAcreedora.toLocaleString('es-MX')}
                </td>
                <td colSpan="2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

// ==================== BALANZA TAB ====================
const BalanzaTab = ({ cuentas }) => {
  // Agrupar cuentas por tipo principal
  const grupos = {
    activo: cuentas.filter(c => c.codigo.startsWith('1') && c.tipo === 'cuenta'),
    pasivo: cuentas.filter(c => c.codigo.startsWith('2') && c.tipo === 'cuenta'),
    capital: cuentas.filter(c => c.codigo.startsWith('3') && c.tipo === 'cuenta'),
    ingresos: cuentas.filter(c => c.codigo.startsWith('4') && c.tipo === 'cuenta'),
    egresos: cuentas.filter(c => c.codigo.startsWith('5') && c.tipo === 'cuenta')
  }

  const calcularTotal = (cuentasGrupo) => {
    return cuentasGrupo.reduce((sum, c) => sum + Math.abs(c.saldo || 0), 0)
  }

  const totalActivo = calcularTotal(grupos.activo)
  const totalPasivo = calcularTotal(grupos.pasivo)
  const totalCapital = calcularTotal(grupos.capital)
  const totalIngresos = calcularTotal(grupos.ingresos)
  const totalEgresos = calcularTotal(grupos.egresos)
  
  const utilidadEjercicio = totalIngresos - totalEgresos

  return (
    <div className="balanza-container">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Total Activo</div>
          <div className="stat-value">${totalActivo.toLocaleString('es-MX')}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Pasivo</div>
          <div className="stat-value">${totalPasivo.toLocaleString('es-MX')}</div>
        </div>
        <div className="stat-card">
          <div className="label">Capital Contable</div>
          <div className="stat-value">${(totalCapital + utilidadEjercicio).toLocaleString('es-MX')}</div>
        </div>
        <div className="stat-card stat-card-highlight">
          <div className="label">Utilidad del Ejercicio</div>
          <div className="stat-value">${utilidadEjercicio.toLocaleString('es-MX')}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: '1.5rem' }}>
        <h3>Balanza de Comprobación</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '1.5rem',
          marginTop: '1.5rem'
        }}>
          {/* Activo */}
          <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
            <h4 style={{ marginBottom: '1rem' }}>ACTIVO</h4>
            {grupos.activo.map(cuenta => (
              <div key={cuenta.id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '0.5rem 0',
                borderBottom: '1px solid var(--color-bg)',
                fontSize: '0.875rem'
              }}>
                <span>{cuenta.nombre}</span>
                <code>${Math.abs(cuenta.saldo || 0).toLocaleString('es-MX')}</code>
              </div>
            ))}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              padding: '0.75rem 0',
              marginTop: '0.5rem',
              fontWeight: 'bold',
              borderTop: '2px solid var(--color-black)'
            }}>
              <span>TOTAL ACTIVO</span>
              <code>${totalActivo.toLocaleString('es-MX')}</code>
            </div>
          </div>

          {/* Pasivo */}
          <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
            <h4 style={{ marginBottom: '1rem' }}>PASIVO</h4>
            {grupos.pasivo.map(cuenta => (
              <div key={cuenta.id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '0.5rem 0',
                borderBottom: '1px solid var(--color-bg)',
                fontSize: '0.875rem'
              }}>
                <span>{cuenta.nombre}</span>
                <code>${Math.abs(cuenta.saldo || 0).toLocaleString('es-MX')}</code>
              </div>
            ))}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              padding: '0.75rem 0',
              marginTop: '0.5rem',
              fontWeight: 'bold',
              borderTop: '2px solid var(--color-black)'
            }}>
              <span>TOTAL PASIVO</span>
              <code>${totalPasivo.toLocaleString('es-MX')}</code>
            </div>
          </div>

          {/* Capital */}
          <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px', background: 'var(--color-beige)' }}>
            <h4 style={{ marginBottom: '1rem' }}>CAPITAL</h4>
            {grupos.capital.map(cuenta => (
              <div key={cuenta.id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                padding: '0.5rem 0',
                borderBottom: '1px solid rgba(0,0,0,0.1)',
                fontSize: '0.875rem'
              }}>
                <span>{cuenta.nombre}</span>
                <code>${Math.abs(cuenta.saldo || 0).toLocaleString('es-MX')}</code>
              </div>
            ))}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              padding: '0.5rem 0',
              borderBottom: '1px solid rgba(0,0,0,0.1)',
              fontSize: '0.875rem',
              fontWeight: 'bold'
            }}>
              <span>Utilidad del Ejercicio</span>
              <code>${utilidadEjercicio.toLocaleString('es-MX')}</code>
            </div>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              padding: '0.75rem 0',
              marginTop: '0.5rem',
              fontWeight: 'bold',
              borderTop: '2px solid var(--color-black)'
            }}>
              <span>CAPITAL TOTAL</span>
              <code>${(totalCapital + utilidadEjercicio).toLocaleString('es-MX')}</code>
            </div>
          </div>
        </div>

        {/* Ecuación Contable */}
        <div style={{ 
          marginTop: '2rem', 
          padding: '1.5rem', 
          background: 'var(--color-bg)', 
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>
            Ecuación Contable
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
            ACTIVO = PASIVO + CAPITAL
          </div>
          <div style={{ fontSize: '1rem', marginTop: '0.5rem' }}>
            ${totalActivo.toLocaleString('es-MX')} = ${totalPasivo.toLocaleString('es-MX')} + ${(totalCapital + utilidadEjercicio).toLocaleString('es-MX')}
          </div>
          {Math.abs(totalActivo - (totalPasivo + totalCapital + utilidadEjercicio)) < 0.01 ? (
            <div style={{ marginTop: '1rem', color: 'var(--color-black)', fontWeight: 'bold' }}>
              ✓ Balanza Cuadrada
            </div>
          ) : (
            <div style={{ marginTop: '1rem', color: '#B45309', fontWeight: 'bold' }}>
              ⚠️ Descuadre: ${Math.abs(totalActivo - (totalPasivo + totalCapital + utilidadEjercicio)).toLocaleString('es-MX')}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ==================== MOVIMIENTOS TAB ====================
const MovimientosTab = ({ 
  movimientos, 
  proyectos, 
  mostrarFormulario, 
  setMostrarFormulario,
  nuevoMovimiento,
  setNuevoMovimiento,
  handleSubmit,
  handleChange,
  totalIngresos,
  totalEgresos,
  balance,
  movimientosOrdenados,
  getTipoBadgeClass
}) => {
  return (
    <div className="movimientos-container">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="label">Total Ingresos</div>
          <div className="stat-value">${totalIngresos.toLocaleString('es-MX')}</div>
        </div>
        <div className="stat-card">
          <div className="label">Total Egresos</div>
          <div className="stat-value">${totalEgresos.toLocaleString('es-MX')}</div>
        </div>
        <div className="stat-card stat-card-highlight">
          <div className="label">Balance</div>
          <div className="stat-value" style={{ color: balance < 0 ? '#000' : '#000' }}>
            ${balance.toLocaleString('es-MX')}
          </div>
        </div>
      </div>

      {mostrarFormulario && (
        <div className="card form-card">
          <h3>Registrar Movimiento Contable</h3>
          <form onSubmit={handleSubmit} className="form">
            <div className="form-row">
              <div className="form-group">
                <label className="label">Fecha</label>
                <input
                  type="date"
                  name="fecha"
                  className="input"
                  value={nuevoMovimiento.fecha}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Tipo de Movimiento</label>
                <select
                  name="tipo"
                  className="input"
                  value={nuevoMovimiento.tipo}
                  onChange={handleChange}
                  required
                >
                  <option value="ingreso">Ingreso</option>
                  <option value="egreso">Egreso</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Categoría</label>
                <select
                  name="categoria"
                  className="input"
                  value={nuevoMovimiento.categoria}
                  onChange={handleChange}
                  required
                >
                  {nuevoMovimiento.tipo === 'ingreso' ? (
                    <>
                      <option value="anticipo">Anticipo</option>
                      <option value="pago_proyecto">Pago de Proyecto</option>
                      <option value="finiquito">Finiquito</option>
                      <option value="otro_ingreso">Otro Ingreso</option>
                    </>
                  ) : (
                    <>
                      <option value="materiales">Materiales</option>
                      <option value="nomina">Nómina</option>
                      <option value="equipos">Equipos</option>
                      <option value="servicios">Servicios</option>
                      <option value="gastos_operativos">Gastos Operativos</option>
                      <option value="otro_egreso">Otro Egreso</option>
                    </>
                  )}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Subcategoría</label>
                <input
                  type="text"
                  name="subcategoria"
                  className="input"
                  value={nuevoMovimiento.subcategoria}
                  onChange={handleChange}
                  placeholder="ej: Cliente, Cemento, etc."
                />
              </div>
            </div>

            <div className="form-group">
              <label className="label">Proyecto</label>
              <select
                name="proyecto"
                className="input"
                value={nuevoMovimiento.proyecto}
                onChange={handleChange}
                required
              >
                <option value="">Seleccionar proyecto...</option>
                <option value="Gastos Generales">💼 Gastos Generales</option>
                <option value="Varios">📋 Varios Proyectos</option>
                <optgroup label="Proyectos Activos">
                  {proyectos
                    .filter(p => p.estado === 'En Progreso' || p.estado === 'Planeación')
                    .map(proyecto => (
                      <option key={proyecto.id} value={proyecto.nombre}>
                        {proyecto.nombre}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Otros Proyectos">
                  {proyectos
                    .filter(p => p.estado !== 'En Progreso' && p.estado !== 'Planeación')
                    .map(proyecto => (
                      <option key={proyecto.id} value={proyecto.nombre}>
                        {proyecto.nombre}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            <div className="form-group">
              <label className="label">Descripción</label>
              <input
                type="text"
                name="descripcion"
                className="input"
                value={nuevoMovimiento.descripcion}
                onChange={handleChange}
                placeholder="Descripción detallada del movimiento"
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="label">Monto</label>
                <input
                  type="number"
                  name="monto"
                  className="input"
                  value={nuevoMovimiento.monto}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="form-group">
                <label className="label">Método de Pago</label>
                <select
                  name="metodoPago"
                  className="input"
                  value={nuevoMovimiento.metodoPago}
                  onChange={handleChange}
                  required
                >
                  <option value="transferencia">Transferencia</option>
                  <option value="cheque">Cheque</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="label">Referencia</label>
              <input
                type="text"
                name="referencia"
                className="input"
                value={nuevoMovimiento.referencia}
                onChange={handleChange}
                placeholder="Número de referencia o folio"
                required
              />
            </div>

            <button type="submit" className="btn btn-primary">
              Registrar Movimiento
            </button>
          </form>
        </div>
      )}

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Categoría</th>
              <th>Subcategoría</th>
              <th>Proyecto</th>
              <th>Descripción</th>
              <th>Monto</th>
              <th>Método</th>
              <th>Referencia</th>
            </tr>
          </thead>
          <tbody>
            {movimientosOrdenados.map(mov => (
              <tr key={mov.id}>
                <td>{new Date(mov.fecha).toLocaleDateString('es-MX')}</td>
                <td>
                  <span className={`badge ${getTipoBadgeClass(mov.tipo)}`}>
                    {mov.tipo.charAt(0).toUpperCase() + mov.tipo.slice(1)}
                  </span>
                </td>
                <td><em>{mov.categoria}</em></td>
                <td>{mov.subcategoria}</td>
                <td><strong>{mov.proyecto}</strong></td>
                <td>{mov.descripcion}</td>
                <td style={{ 
                  color: mov.tipo === 'ingreso' ? '#000' : '#000',
                  fontWeight: 'bold' 
                }}>
                  {mov.tipo === 'ingreso' ? '+' : '-'}${mov.monto.toLocaleString('es-MX')}
                </td>
                <td><code>{mov.metodoPago}</code></td>
                <td><code>{mov.referencia}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default Contabilidad

