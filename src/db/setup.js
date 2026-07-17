const { execSync } = require('child_process');
const path = require('path');

async function setup() {
  console.log('=== Campus Delivery DB Setup ===\n');
  try {
    console.log('[1/2] Ejecutando migraciones...');
    execSync('node src/db/migrate.js', { stdio: 'inherit', cwd: path.join(__dirname, '..', '..') });

    console.log('\n[2/2] Insertando datos de prueba...');
    execSync('node src/db/seed.js', { stdio: 'inherit', cwd: path.join(__dirname, '..', '..') });

    console.log('\n=== Setup completado exitosamente ===');
  } catch (err) {
    console.error('\n=== Error en setup ===', err.message);
    process.exit(1);
  }
}

setup();
