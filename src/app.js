require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const menuRoutes = require('./routes/menu.routes');
const pedidosRoutes = require('./routes/pedidos.routes');
const negociosRoutes = require('./routes/negocios.routes');
const puntosRoutes = require('./routes/puntos.routes');
const menusRoutes = require('./routes/menus.routes');

const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware global
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir web client (SPA)
const publicPath = path.join(__dirname, '..', 'public');
if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  // SPA fallback: todas las rutas no-API sirven index.html
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

// Logging de requests
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api', menuRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/negocios', negociosRoutes);
app.use('/api/puntos', puntosRoutes);
app.use('/api', menusRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('[error]', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`\n  🚀 Campus Delivery API corriendo en http://localhost:${PORT}`);
  console.log(`  📋 Documentación de endpoints en /api/health\n`);
});

module.exports = app;
