import { query } from '../db/config.js'

export const obtenerPresupuestos = async () => {
  const result = await query(`
    SELECT 
      pp.*,
      json_agg(
        json_build_object(
          'id', f.fase_id,
          'nombre', f.nombre,
          'items', (
            SELECT json_agg(
              json_build_object(
                'id', ip.id,
                'articuloId', ip.articulo_id,
                'articuloNombre', ip.articulo_nombre,
                'articuloCodigo', ip.articulo_codigo,
                'articuloUnidad', ip.articulo_unidad,
                'unidad', ip.articulo_unidad,
                'cantidadPresupuestada', ip.cantidad_presupuestada,
                'costoUnitario', ip.costo_unitario,
                'subtotalCosto', ip.cantidad_presupuestada * ip.costo_unitario,
                'cantidadSolicitada', ip.cantidad_solicitada,
                'cantidadRecibida', ip.cantidad_recibida,
                'cantidadPagada', ip.cantidad_recibida,
                'montoPagado', ip.monto_pagado,
                'gastoReal', ip.monto_pagado
              )
            )
            FROM items_presupuesto ip
            WHERE ip.fase_id = f.id
          )
        )
      ) FILTER (WHERE f.id IS NOT NULL) as fases
    FROM presupuestos_proyecto pp
    LEFT JOIN fases f ON f.presupuesto_id = pp.id
    GROUP BY pp.id
    ORDER BY pp.id DESC
  `)
  
  return result.rows.map(mapPresupuesto)
}

export const obtenerPresupuesto = async (id) => {
  const result = await query(`
    SELECT 
      pp.*,
      json_agg(
        json_build_object(
          'id', f.fase_id,
          'nombre', f.nombre,
          'items', COALESCE((
            SELECT json_agg(
              json_build_object(
                'id', ip.id,
                'articuloId', ip.articulo_id,
                'articuloNombre', ip.articulo_nombre,
                'articuloCodigo', ip.articulo_codigo,
                'articuloUnidad', ip.articulo_unidad,
                'unidad', ip.articulo_unidad,
                'cantidadPresupuestada', ip.cantidad_presupuestada,
                'costoUnitario', ip.costo_unitario,
                'subtotalCosto', ip.cantidad_presupuestada * ip.costo_unitario,
                'cantidadSolicitada', ip.cantidad_solicitada,
                'cantidadRecibida', ip.cantidad_recibida,
                'cantidadPagada', ip.cantidad_recibida,
                'montoPagado', ip.monto_pagado,
                'gastoReal', ip.monto_pagado
              )
            )
            FROM items_presupuesto ip
            WHERE ip.fase_id = f.id
          ), '[]'::json)
        )
      ) FILTER (WHERE f.id IS NOT NULL) as fases
    FROM presupuestos_proyecto pp
    LEFT JOIN fases f ON f.presupuesto_id = pp.id
    WHERE pp.id = $1
    GROUP BY pp.id
  `, [id])
  
  return result.rows[0] ? mapPresupuesto(result.rows[0]) : null
}

export const obtenerPresupuestoPorProyecto = async (proyectoId) => {
  const result = await query(`
    SELECT 
      pp.*,
      json_agg(
        json_build_object(
          'id', f.fase_id,
          'nombre', f.nombre,
          'items', COALESCE((
            SELECT json_agg(
              json_build_object(
                'id', ip.id,
                'articuloId', ip.articulo_id,
                'articuloNombre', ip.articulo_nombre,
                'articuloCodigo', ip.articulo_codigo,
                'articuloUnidad', ip.articulo_unidad,
                'unidad', ip.articulo_unidad,
                'cantidadPresupuestada', ip.cantidad_presupuestada,
                'costoUnitario', ip.costo_unitario,
                'subtotalCosto', ip.cantidad_presupuestada * ip.costo_unitario,
                'cantidadSolicitada', ip.cantidad_solicitada,
                'cantidadRecibida', ip.cantidad_recibida,
                'cantidadPagada', ip.cantidad_recibida,
                'montoPagado', ip.monto_pagado,
                'gastoReal', ip.monto_pagado
              )
            )
            FROM items_presupuesto ip
            WHERE ip.fase_id = f.id
          ), '[]'::json)
        )
      ) FILTER (WHERE f.id IS NOT NULL) as fases
    FROM presupuestos_proyecto pp
    LEFT JOIN fases f ON f.presupuesto_id = pp.id
    WHERE pp.proyecto_id = $1
    GROUP BY pp.id
  `, [proyectoId])
  
  return result.rows[0] ? mapPresupuesto(result.rows[0]) : null
}

export const crearPresupuesto = async (datos) => {
  const result = await query(
    `INSERT INTO presupuestos_proyecto (proyecto_id, proyecto_nombre, estado)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [datos.proyectoId, datos.proyectoNombre, datos.estado || 'activo']
  )
  
  const presupuesto = result.rows[0]
  return {
    ...mapPresupuesto(presupuesto),
    fases: []
  }
}

export const actualizarPresupuesto = async (id, datos) => {
  // If fases are provided, update them
  if (datos.fases) {
    // Delete existing fases and create new ones
    await query('DELETE FROM fases WHERE presupuesto_id = $1', [id])
    
    for (const fase of datos.fases) {
      const faseResult = await query(
        `INSERT INTO fases (presupuesto_id, fase_id, nombre)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [id, fase.id, fase.nombre]
      )
      
      const faseDbId = faseResult.rows[0].id
      
      // Insert items if they exist
      if (fase.items && fase.items.length > 0) {
        for (const item of fase.items) {
          await query(
            `INSERT INTO items_presupuesto 
             (fase_id, articulo_id, articulo_nombre, articulo_codigo, articulo_unidad, 
              cantidad_presupuestada, precio_unitario, cantidad_solicitada, cantidad_recibida, monto_pagado)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              faseDbId,
              item.articuloId || null,
              item.articuloNombre,
              item.articuloCodigo || null,
              item.articuloUnidad || 'pza',
              item.cantidadPresupuestada || 0,
              item.precioUnitario || 0,
              item.cantidadSolicitada || 0,
              item.cantidadRecibida || 0,
              item.montoPagado || 0
            ]
          )
        }
      }
    }
  }
  
  // Update timestamp
  await query('UPDATE presupuestos_proyecto SET fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = $1', [id])
  
  return obtenerPresupuesto(id)
}

export const agregarItemAFase = async (presupuestoId, faseId, item) => {
  try {
    // Get the database fase ID from fase_id
    const faseResult = await query(
      'SELECT id FROM fases WHERE presupuesto_id = $1 AND fase_id = $2',
      [presupuestoId, faseId]
    )
    
    if (faseResult.rows.length === 0) {
      return { error: 'Fase no encontrada' }
    }
    
    const faseDbId = faseResult.rows[0].id
    
    await query(
      `INSERT INTO items_presupuesto 
       (fase_id, articulo_id, articulo_nombre, articulo_codigo, articulo_unidad, 
        cantidad_presupuestada, costo_unitario)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        faseDbId,
        item.articuloId,
        item.articuloNombre,
        item.articuloCodigo || null,
        item.unidad || 'pza',
        item.cantidadPresupuestada || 0,
        item.costoUnitario || item.precioUnitarioEstimado || 0
      ]
    )
    
    return obtenerPresupuesto(presupuestoId)
  } catch (error) {
    console.error('Error adding item to fase:', error)
    throw error
  }
}

export const actualizarItemPresupuesto = async (presupuestoId, faseId, itemId, datos) => {
  try {
    const fields = []
    const values = []
    let paramCount = 1

    if (datos.cantidadPresupuestada !== undefined) {
      fields.push(`cantidad_presupuestada = $${paramCount++}`)
      values.push(datos.cantidadPresupuestada)
    }
    if (datos.costoUnitario !== undefined) {
      fields.push(`costo_unitario = $${paramCount++}`)
      values.push(datos.costoUnitario)
    }
    if (datos.cantidadSolicitada !== undefined) {
      fields.push(`cantidad_solicitada = $${paramCount++}`)
      values.push(datos.cantidadSolicitada)
    }
    if (datos.cantidadRecibida !== undefined) {
      fields.push(`cantidad_recibida = $${paramCount++}`)
      values.push(datos.cantidadRecibida)
    }
    if (datos.montoPagado !== undefined) {
      fields.push(`monto_pagado = $${paramCount++}`)
      values.push(datos.montoPagado)
    }

    if (fields.length === 0) return obtenerPresupuesto(presupuestoId)

    fields.push(`updated_at = CURRENT_TIMESTAMP`)
    values.push(itemId)

    await query(
      `UPDATE items_presupuesto SET ${fields.join(', ')} WHERE id = $${paramCount}`,
      values
    )
    
    return obtenerPresupuesto(presupuestoId)
  } catch (error) {
    console.error('Error updating item:', error)
    throw error
  }
}

export const eliminarItemPresupuesto = async (presupuestoId, faseId, itemId) => {
  try {
    await query('DELETE FROM items_presupuesto WHERE id = $1', [itemId])
    return obtenerPresupuesto(presupuestoId)
  } catch (error) {
    console.error('Error deleting item:', error)
    throw error
  }
}

export const obtenerItemsPendientes = async (presupuestoId, faseId = null) => {
  try {
    const sql = faseId
      ? `SELECT ip.*, f.fase_id, f.nombre as fase_nombre
         FROM items_presupuesto ip
         JOIN fases f ON ip.fase_id = f.id
         WHERE f.presupuesto_id = $1 AND f.fase_id = $2
         AND (ip.cantidad_presupuestada - ip.cantidad_solicitada) > 0`
      : `SELECT ip.*, f.fase_id, f.nombre as fase_nombre
         FROM items_presupuesto ip
         JOIN fases f ON ip.fase_id = f.id
         WHERE f.presupuesto_id = $1
         AND (ip.cantidad_presupuestada - ip.cantidad_solicitada) > 0`
    
    const params = faseId ? [presupuestoId, faseId] : [presupuestoId]
    const result = await query(sql, params)
    
    return result.rows.map(row => ({
      id: row.id,
      articuloId: row.articulo_id,
      articuloNombre: row.articulo_nombre,
      articuloCodigo: row.articulo_codigo,
      unidad: row.articulo_unidad,
      cantidadPresupuestada: parseFloat(row.cantidad_presupuestada),
      cantidadSolicitada: parseFloat(row.cantidad_solicitada),
      cantidadPendiente: parseFloat(row.cantidad_presupuestada) - parseFloat(row.cantidad_solicitada),
      precioUnitarioEstimado: parseFloat(row.precio_unitario),
      faseId: row.fase_id,
      faseNombre: row.fase_nombre
    }))
  } catch (error) {
    console.error('Error getting pending items:', error)
    return []
  }
}

function mapPresupuesto(row) {
  const fases = (row.fases || []).map(fase => ({
    ...fase,
    items: fase.items || []
  }))
  
  // Calculate cost totals only
  let totalCosto = 0
  let totalPagado = 0
  
  fases.forEach(fase => {
    fase.items.forEach(item => {
      const cantidad = parseFloat(item.cantidadPresupuestada) || 0
      const costo = parseFloat(item.costoUnitario) || 0
      const pagado = parseFloat(item.montoPagado) || 0
      
      totalCosto += cantidad * costo
      totalPagado += pagado
    })
  })
  
  return {
    id: row.id,
    proyectoId: row.proyecto_id,
    proyectoNombre: row.proyecto_nombre,
    estado: row.estado,
    fechaCreacion: row.fecha_creacion,
    fechaActualizacion: row.fecha_actualizacion ? new Date(row.fecha_actualizacion).toLocaleDateString('es-MX') : null,
    fases: fases,
    resumen: {
      totalCosto,
      totalPagado,
      totalPresupuestado: totalCosto
    }
  }
}
