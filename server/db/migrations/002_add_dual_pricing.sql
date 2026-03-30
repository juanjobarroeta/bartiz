-- Add dual pricing columns to items_presupuesto
ALTER TABLE items_presupuesto 
ADD COLUMN IF NOT EXISTS costo_unitario DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS precio_venta_unitario DECIMAL(15, 2) DEFAULT 0;

-- For existing items, copy precio_unitario to both columns if they're null
UPDATE items_presupuesto 
SET costo_unitario = precio_unitario 
WHERE costo_unitario IS NULL OR costo_unitario = 0;

UPDATE items_presupuesto 
SET precio_venta_unitario = precio_unitario 
WHERE precio_venta_unitario IS NULL OR precio_venta_unitario = 0;
