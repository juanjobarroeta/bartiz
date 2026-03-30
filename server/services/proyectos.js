import { query } from '../db/config.js'

export const obtenerProyectos = async (limit = null) => {
  const sql = limit 
    ? 'SELECT * FROM proyectos ORDER BY id DESC LIMIT $1'
    : 'SELECT * FROM proyectos ORDER BY id DESC'
  
  const result = limit ? await query(sql, [limit]) : await query(sql)
  return result.rows.map(mapProyecto)
}

export const obtenerProyecto = async (id) => {
  const result = await query('SELECT * FROM proyectos WHERE id = $1', [id])
  return result.rows[0] ? mapProyecto(result.rows[0]) : null
}

export const crearProyecto = async (datos) => {
  const result = await query(
    `INSERT INTO proyectos (nombre, cliente, ubicacion, presupuesto, fecha_inicio, estado, progreso, responsable, avatar)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      datos.nombre,
      datos.cliente,
      datos.ubicacion,
      datos.presupuesto || 0,
      datos.fechaInicio || null,
      datos.estado || 'Cotización',
      datos.progreso || 0,
      datos.responsable || null,
      datos.avatar || null
    ]
  )
  return mapProyecto(result.rows[0])
}

export const actualizarProyecto = async (id, datos) => {
  const fields = []
  const values = []
  let paramCount = 1

  if (datos.nombre !== undefined) {
    fields.push(`nombre = $${paramCount++}`)
    values.push(datos.nombre)
  }
  if (datos.cliente !== undefined) {
    fields.push(`cliente = $${paramCount++}`)
    values.push(datos.cliente)
  }
  if (datos.ubicacion !== undefined) {
    fields.push(`ubicacion = $${paramCount++}`)
    values.push(datos.ubicacion)
  }
  if (datos.presupuesto !== undefined) {
    fields.push(`presupuesto = $${paramCount++}`)
    values.push(datos.presupuesto)
  }
  if (datos.fechaInicio !== undefined) {
    fields.push(`fecha_inicio = $${paramCount++}`)
    values.push(datos.fechaInicio)
  }
  if (datos.estado !== undefined) {
    fields.push(`estado = $${paramCount++}`)
    values.push(datos.estado)
  }
  if (datos.progreso !== undefined) {
    fields.push(`progreso = $${paramCount++}`)
    values.push(datos.progreso)
  }

  if (fields.length === 0) return obtenerProyecto(id)

  fields.push(`updated_at = CURRENT_TIMESTAMP`)
  values.push(id)

  const result = await query(
    `UPDATE proyectos SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    values
  )
  return result.rows[0] ? mapProyecto(result.rows[0]) : null
}

export const eliminarProyecto = async (id) => {
  await query('DELETE FROM proyectos WHERE id = $1', [id])
  return true
}

// Helper function to map database columns to camelCase
function mapProyecto(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    cliente: row.cliente,
    ubicacion: row.ubicacion,
    presupuesto: parseFloat(row.presupuesto) || 0,
    fechaInicio: row.fecha_inicio,
    estado: row.estado,
    progreso: row.progreso,
    responsable: row.responsable,
    avatar: row.avatar
  }
}
