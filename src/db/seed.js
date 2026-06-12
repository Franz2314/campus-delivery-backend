const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('./connection');

async function seed() {
  console.log('[seed] Insertando datos de prueba...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const passHash = await bcrypt.hash('123456', 10);

    // Pabellones
    const pabs = [
      { id: uuidv4(), nombre: 'Pabellón A', codigo: 'PA' },
      { id: uuidv4(), nombre: 'Pabellón B', codigo: 'PB' },
      { id: uuidv4(), nombre: 'Pabellón C', codigo: 'PC' },
      { id: uuidv4(), nombre: 'Pabellón D', codigo: 'PD' },
      { id: uuidv4(), nombre: 'Pabellón E', codigo: 'PE' },
    ];
    for (const p of pabs) {
      await client.query(
        `INSERT INTO pabellones (id, nombre, codigo) VALUES ($1, $2, $3) ON CONFLICT (codigo) DO NOTHING`,
        [p.id, p.nombre, p.codigo],
      );
    }

    // Usuarios
    const estudianteId = uuidv4();
    const negocioId = uuidv4();
    const repartidorId = uuidv4();

    await client.query(
      `INSERT INTO usuarios (id, nombre, email, password, telefono, rol) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (email) DO NOTHING`,
      [estudianteId, 'Mateo Pérez', 'mateo@utp.edu.pe', passHash, '999111000', 'estudiante'],
    );
    await client.query(
      `INSERT INTO usuarios (id, nombre, email, password, telefono, rol) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (email) DO NOTHING`,
      [negocioId, 'Doña Pepa', 'dona@utp.edu.pe', passHash, '999222111', 'negocio'],
    );
    await client.query(
      `INSERT INTO usuarios (id, nombre, email, password, telefono, rol) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (email) DO NOTHING`,
      [repartidorId, 'Carlos Ruiz', 'carlos@utp.edu.pe', passHash, '999333222', 'repartidor'],
    );

    // Negocio
    const negocioRecordId = uuidv4();
    await client.query(
      `INSERT INTO negocios (id, usuario_id, nombre, descripcion) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING`,
      [negocioRecordId, negocioId, 'Doña Pepa', 'Comida casera para estudiantes'],
    );

    // Productos
    const productos = [
      { nombre: 'Café con leche', precio: 5.00, categoria: 'Bebidas' },
      { nombre: 'Sánguche de pollo', precio: 8.50, categoria: 'Snacks' },
      { nombre: 'Lomo saltado', precio: 14.00, categoria: 'Almuerzos' },
      { nombre: 'Tequeños (6 und)', precio: 7.00, categoria: 'Snacks' },
      { nombre: 'Chicha morada', precio: 4.00, categoria: 'Bebidas' },
      { nombre: 'Alfajor de maicena', precio: 3.50, categoria: 'Postres' },
    ];
    for (const p of productos) {
      const pid = uuidv4();
      await client.query(
        `INSERT INTO productos (id, negocio_id, nombre, precio, categoria, disponible) VALUES ($1,$2,$3,$4,$5,true) ON CONFLICT DO NOTHING`,
        [pid, negocioRecordId, p.nombre, p.precio, p.categoria],
      );
    }

    await client.query('COMMIT');
    console.log('[seed] Datos de prueba insertados correctamente.');
    console.log('  Estudiante: mateo@utp.edu.pe / 123456');
    console.log('  Negocio:    dona@utp.edu.pe / 123456');
    console.log('  Repartidor: carlos@utp.edu.pe / 123456');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[seed] Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
