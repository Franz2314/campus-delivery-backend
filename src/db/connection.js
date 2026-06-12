const { Pool, types } = require('pg');
require('dotenv').config();

// PostgreSQL devuelve NUMERIC/DECIMAL como string; lo convertimos a número
types.setTypeParser(1700, parseFloat);

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'campus_delivery',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

if (process.env.DB_SSL === 'true') {
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[db] Error inesperado en el pool de conexiones', err);
});

async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'production') {
    console.log('[db] query', { text: text.substring(0, 80), duration, rows: result.rowCount });
  }
  return result;
}

async function getClient() {
  const client = await pool.connect();
  return client;
}

module.exports = { pool, query, getClient };
