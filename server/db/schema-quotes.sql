-- Tabla de Cotizaciones (Quotes)
CREATE TABLE IF NOT EXISTS cotizaciones (
  id SERIAL PRIMARY KEY,
  proyecto_id INTEGER REFERENCES proyectos(id) ON DELETE CASCADE,
  presupuesto_id INTEGER REFERENCES presupuestos_proyecto(id) ON DELETE CASCADE,
  nombre_cotizacion VARCHAR(255) NOT NULL,
  cliente_nombre VARCHAR(255),
  tipo_cliente VARCHAR(50) DEFAULT 'privado',
  margen_global DECIMAL(5, 2) DEFAULT 20.00,
  estado VARCHAR(50) DEFAULT 'borrador',
  validez_dias INTEGER DEFAULT 30,
  incluir_iva BOOLEAN DEFAULT true,
  notas TEXT,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_vencimiento DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Items de Cotización
CREATE TABLE IF NOT EXISTS items_cotizacion (
  id SERIAL PRIMARY KEY,
  cotizacion_id INTEGER REFERENCES cotizaciones(id) ON DELETE CASCADE,
  item_presupuesto_id INTEGER REFERENCES items_presupuesto(id),
  articulo_nombre TEXT NOT NULL,
  articulo_codigo VARCHAR(100),
  unidad VARCHAR(50),
  cantidad DECIMAL(15, 4) NOT NULL,
  costo_unitario DECIMAL(15, 2) NOT NULL,
  precio_venta_unitario DECIMAL(15, 2) NOT NULL,
  margen_item DECIMAL(15, 2),
  margen_porcentaje DECIMAL(5, 2),
  subtotal_costo DECIMAL(15, 2),
  subtotal_venta DECIMAL(15, 2),
  fase_nombre VARCHAR(100),
  notas TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_cotizaciones_proyecto ON cotizaciones(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_presupuesto ON cotizaciones(presupuesto_id);
CREATE INDEX IF NOT EXISTS idx_items_cotizacion ON items_cotizacion(cotizacion_id);
