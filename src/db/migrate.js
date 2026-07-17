const fs = require('fs');
const path = require('path');
const { pool } = require('./connection');

async function migrate() {
  console.log('[migrate] Iniciando migraciones...');
  try {
    const migrations = ['001_init.sql', '002_mejoras.sql', '003_codigo_recogida.sql'];
    for (const file of migrations) {
      const sqlPath = path.join(__dirname, 'migrations', file);
      if (fs.existsSync(sqlPath)) {
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await pool.query(sql);
        console.log(`[migrate] Migración ${file} ejecutada correctamente.`);
      } else {
        console.log(`[migrate] ${file} no encontrada, saltando.`);
      }
    }
  } catch (err) {
    console.error('[migrate] Error ejecutando migración:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
