-- Mejoras: puntos, pabellon F, pisos, cancelacion con motivo

-- Agregar pabellón F
INSERT INTO pabellones (nombre, codigo) VALUES ('Pabellón F', 'PF') ON CONFLICT DO NOTHING;

-- Agregar max_pisos a pabellones
ALTER TABLE pabellones ADD COLUMN IF NOT EXISTS max_pisos INTEGER DEFAULT 8;
UPDATE pabellones SET max_pisos = 7 WHERE codigo = 'PE';
UPDATE pabellones SET max_pisos = 5 WHERE codigo = 'PF';

-- Agregar piso a pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS piso INTEGER DEFAULT 1;

-- Agregar motivo_cancelacion a pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS motivo_cancelacion TEXT;

-- Agregar comprobante_verificado a pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS comprobante_verificado BOOLEAN DEFAULT false;
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS comprobante_rechazado BOOLEAN DEFAULT false;

-- Ampliar CHECK de estado para incluir 'rechazado'
ALTER TABLE pedidos DROP CONSTRAINT IF EXISTS pedidos_estado_check;
ALTER TABLE pedidos ADD CONSTRAINT pedidos_estado_check
  CHECK (estado IN ('pendiente','confirmado','en_preparacion','en_camino','entregado','cancelado','rechazado'));

-- ============================================================
-- PUNTOS (fidelización)
-- ============================================================
CREATE TABLE IF NOT EXISTS puntos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estudiante_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  saldo INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(estudiante_id)
);

-- Historial de puntos ganados/gastados
CREATE TABLE IF NOT EXISTS puntos_historial (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estudiante_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ganado', 'canjeado')),
  cantidad INTEGER NOT NULL,
  concepto VARCHAR(255),
  pedido_id UUID REFERENCES pedidos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RECOMPENSAS / CANJES
-- ============================================================
CREATE TABLE IF NOT EXISTS recompensas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  imagen_url TEXT,
  puntos_requeridos INTEGER NOT NULL CHECK (puntos_requeridos > 0),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS canjes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estudiante_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  recompensa_id UUID NOT NULL REFERENCES recompensas(id),
  puntos_gastados INTEGER NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'entregado', 'cancelado')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RESTRUCTURAR COMPROBANTE_URL para aceptar base64
-- ============================================================
-- Ya existe como TEXT, es suficiente para almacenar data URIs

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_puntos_estudiante ON puntos(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_puntos_historial_estudiante ON puntos_historial(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_canjes_estudiante ON canjes(estudiante_id);
