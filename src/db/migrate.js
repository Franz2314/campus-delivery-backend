const fs = require('fs');
const path = require('path');
const { pool } = require('./connection');

async function migrate() {
  console.log('[migrate] Iniciando migraciones...');
  try {
    const sqlPath = path.join(__dirname, 'migrations', '001_init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    await pool.query(sql);
    console.log('[migrate] Migración 001_init.sql ejecutada correctamente.');
  } catch (err) {
    console.error('[migrate] Error ejecutando migración:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
