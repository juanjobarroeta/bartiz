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

-- Tabla de Items de Presupuesto
CREATE TABLE IF NOT EXISTS items_presupuesto (
  id SERIAL PRIMARY KEY,
  fase_id INTEGER REFERENCES fases(id) ON DELETE CASCADE,
  articulo_id INTEGER,
  articulo_nombre TEXT NOT NULL,
  articulo_codigo VARCHAR(100),
  articulo_unidad VARCHAR(50),
  cantidad_presupuestada DECIMAL(15, 4) DEFAULT 0,
  precio_unitario DECIMAL(15, 2) DEFAULT 0,
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
