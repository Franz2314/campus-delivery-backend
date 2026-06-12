const { Pool, types } = require('pg');
require('dotenv').config();

types.setTypeParser(1700, parseFloat);

const poolConfig = {};

if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
  poolConfig.ssl = { rejectUnauthorized: false };
} else {
  poolConfig.host = process.env.DB_HOST || 'aws-1-us-west-2.pooler.supabase.com';
  poolConfig.port = parseInt(process.env.DB_PORT || '6543', 10);
  poolConfig.database = process.env.DB_NAME || 'postgres';
  poolConfig.user = process.env.DB_USER || 'postgres.gqqcynlogidtqvnfbtbp';
  poolConfig.password = process.env.DB_PASSWORD || 'Migatamia345';
  poolConfig.ssl = { rejectUnauthorized: false };
}

poolConfig.max = 20;
poolConfig.idleTimeoutMillis = 30000;
poolConfig.connectionTimeoutMillis = 10000;

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
