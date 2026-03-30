-- Tabla de Proyectos
CREATE TABLE IF NOT EXISTS proyectos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  cliente VARCHAR(255) NOT NULL,
  ubicacion VARCHAR(255),
  presupuesto DECIMAL(15, 2),
  fecha_inicio DATE,
  estado VARCHAR(50) DEFAULT 'Cotización',
  progreso INTEGER DEFAULT 0,
  responsable VARCHAR(255),
  avatar VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Presupuestos de Proyecto
CREATE TABLE IF NOT EXISTS presupuestos_proyecto (
  id SERIAL PRIMARY KEY,
  proyecto_id INTEGER REFERENCES proyectos(id) ON DELETE CASCADE,
  proyecto_nombre VARCHAR(255) NOT NULL,
  estado VARCHAR(50) DEFAULT 'activo',
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(proyecto_id)
);

-- Tabla de Fases
CREATE TABLE IF NOT EXISTS fases (
  id SERIAL PRIMARY KEY,
  presupuesto_id INTEGER REFERENCES presupuestos_proyecto(id) ON DELETE CASCADE,
  fase_id VARCHAR(50) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Items de Presupuesto (COSTOS INTERNOS SOLAMENTE)
CREATE TABLE IF NOT EXISTS items_presupuesto (
  id SERIAL PRIMARY KEY,
  fase_id INTEGER REFERENCES fases(id) ON DELETE CASCADE,
  articulo_id INTEGER,
  articulo_nombre TEXT NOT NULL,
  articulo_codigo VARCHAR(100),
  articulo_unidad VARCHAR(50),
  cantidad_presupuestada DECIMAL(15, 4) DEFAULT 0,
  costo_unitario DECIMAL(15, 2) DEFAULT 0,
  cantidad_solicitada DECIMAL(15, 4) DEFAULT 0,
  cantidad_recibida DECIMAL(15, 4) DEFAULT 0,
  monto_pagado DECIMAL(15, 2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar proyecto de ejemplo solo si no existe ningún proyecto
INSERT INTO proyectos (id, nombre, cliente, ubicacion, presupuesto, fecha_inicio, estado, progreso, responsable, avatar)
SELECT 1, 'Proyecto de Prueba', 'Cliente Demo', 'Ciudad de México', 1000000, '2026-03-01', 'En Progreso', 25, 'Juan Pérez', 'JP'
WHERE NOT EXISTS (SELECT 1 FROM proyectos WHERE id = 1);

-- Tabla de Cotizaciones (Customer Quotes)
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

CREATE INDEX IF NOT EXISTS idx_cotizaciones_proyecto ON cotizaciones(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_cotizaciones_presupuesto ON cotizaciones(presupuesto_id);
CREATE INDEX IF NOT EXISTS idx_items_cotizacion ON items_cotizacion(cotizacion_id);
