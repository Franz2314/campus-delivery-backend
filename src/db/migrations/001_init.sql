-- Campus Delivery - Migración inicial
-- Crea todas las tablas del sistema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USUARIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  telefono VARCHAR(20),
  rol VARCHAR(20) NOT NULL CHECK (rol IN ('estudiante', 'repartidor', 'negocio')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- NEGOCIOS
-- ============================================================
CREATE TABLE IF NOT EXISTS negocios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  imagen_url TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PABELLONES
-- ============================================================
CREATE TABLE IF NOT EXISTS pabellones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(100) NOT NULL,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PRODUCTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  negocio_id UUID NOT NULL REFERENCES negocios(id) ON DELETE CASCADE,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10, 2) NOT NULL CHECK (precio > 0),
  imagen_url TEXT,
  categoria VARCHAR(50) NOT NULL DEFAULT 'Snacks',
  disponible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- PEDIDOS
-- ============================================================
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estudiante_id UUID NOT NULL REFERENCES usuarios(id),
  negocio_id UUID NOT NULL REFERENCES negocios(id),
  repartidor_id UUID REFERENCES usuarios(id),
  pabellon_id UUID NOT NULL REFERENCES pabellones(id),
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','confirmado','en_preparacion','en_camino','entregado','cancelado')),
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  hora_programada TIMESTAMPTZ NOT NULL,
  comprobante_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DETALLE_PEDIDOS
-- ============================================================
CREATE TABLE IF NOT EXISTS detalle_pedidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id),
  nombre VARCHAR(150) NOT NULL,
  precio_unitario DECIMAL(10, 2) NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  subtotal DECIMAL(10, 2) NOT NULL
);

-- ============================================================
-- RESENAS
-- ============================================================
CREATE TABLE IF NOT EXISTS resenas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  estudiante_id UUID NOT NULL REFERENCES usuarios(id),
  calificacion INTEGER NOT NULL CHECK (calificacion >= 1 AND calificacion <= 5),
  comentario TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pedido_id, estudiante_id)
);

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_productos_negocio ON productos(negocio_id);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
CREATE INDEX IF NOT EXISTS idx_productos_disponible ON productos(disponible);
CREATE INDEX IF NOT EXISTS idx_pedidos_estudiante ON pedidos(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_repartidor ON pedidos(repartidor_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_negocio ON pedidos(negocio_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_detalle_pedido ON detalle_pedidos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_resenas_pedido ON resenas(pedido_id);
