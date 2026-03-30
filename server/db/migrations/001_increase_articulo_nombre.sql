-- Migration to increase articulo_nombre size
ALTER TABLE items_presupuesto 
ALTER COLUMN articulo_nombre TYPE TEXT;
