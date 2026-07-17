ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS codigo_recogida VARCHAR(6);

CREATE INDEX IF NOT EXISTS idx_pedidos_codigo_recogida ON pedidos(codigo_recogida);
