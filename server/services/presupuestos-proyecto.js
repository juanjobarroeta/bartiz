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
                'cantidadPresupuestada', ip.cantidad_presupuestada,
                'precioUnitario', ip.precio_unitario,
                'cantidadSolicitada', ip.cantidad_solicitada,
                'cantidadRecibida', ip.cantidad_recibida,
                'montoPagado', ip.monto_pagado
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
                'cantidadPresupuestada', ip.cantidad_presupuestada,
                'precioUnitario', ip.precio_unitario,
                'cantidadSolicitada', ip.cantidad_solicitada,
                'cantidadRecibida', ip.cantidad_recibida,
                'montoPagado', ip.monto_pagado
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
                'cantidadPresupuestada', ip.cantidad_presupuestada,
                'precioUnitario', ip.precio_unitario,
                'cantidadSolicitada', ip.cantidad_solicitada,
                'cantidadRecibida', ip.cantidad_recibida,
                'montoPagado', ip.monto_pagado
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

function mapPresupuesto(row) {
  return {
    id: row.id,
    proyectoId: row.proyecto_id,
    proyectoNombre: row.proyecto_nombre,
    estado: row.estado,
    fechaCreacion: row.fecha_creacion,
    fechaActualizacion: row.fecha_actualizacion ? new Date(row.fecha_actualizacion).toLocaleDateString('es-MX') : null,
    fases: row.fases || [],
    resumen: {
      totalPresupuestado: 0,
      totalGastoReal: 0,
      totalPagado: 0
    }
  }
}
