const bcrypt = require('bcryptjs');
const { pool } = require('./connection');

async function seed() {
  console.log('[seed] Insertando datos de prueba...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const passHash = await bcrypt.hash('123456', 10);

    // Pabellones (A-E con max 8 pisos, E con 7, F con 5)
    const pabs = [
      { nombre: 'Pabellón A', codigo: 'PA', max_pisos: 8 },
      { nombre: 'Pabellón B', codigo: 'PB', max_pisos: 8 },
      { nombre: 'Pabellón C', codigo: 'PC', max_pisos: 8 },
      { nombre: 'Pabellón D', codigo: 'PD', max_pisos: 8 },
      { nombre: 'Pabellón E', codigo: 'PE', max_pisos: 7 },
      { nombre: 'Pabellón F', codigo: 'PF', max_pisos: 5 },
    ];
    for (const p of pabs) {
      await client.query(
        `INSERT INTO pabellones (id, nombre, codigo, max_pisos)
         VALUES (gen_random_uuid(), $1, $2, $3)
         ON CONFLICT (codigo) DO UPDATE SET max_pisos = $3`,
        [p.nombre, p.codigo, p.max_pisos],
      );
    }

    // Usuarios — upsert y recuperar ID
    const usuarios = [
      { nombre: 'Mateo Pérez', email: 'mateo@utp.edu.pe', telefono: '999111000', rol: 'estudiante' },
      { nombre: 'Doña Pepa', email: 'dona@utp.edu.pe', telefono: '999222111', rol: 'negocio' },
      { nombre: 'Carlos Ruiz', email: 'carlos@utp.edu.pe', telefono: '999333222', rol: 'repartidor' },
    ];
    const userIds = {};
    for (const u of usuarios) {
      await client.query(
        `INSERT INTO usuarios (id, nombre, email, password, telefono, rol)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET nombre = EXCLUDED.nombre, telefono = EXCLUDED.telefono`,
        [u.nombre, u.email, passHash, u.telefono, u.rol],
      );
      const { rows } = await client.query(
        `SELECT id FROM usuarios WHERE email = $1`,
        [u.email],
      );
      userIds[u.rol] = rows[0].id;
      console.log(`  ${u.rol}: ${u.email} / 123456 (id=${rows[0].id})`);
    }

    const estudianteId = userIds['estudiante'];
    const negocioUserId = userIds['negocio'];

    // Negocio
    const { rows: existingNeg } = await client.query(
      `SELECT id FROM negocios WHERE usuario_id = $1`,
      [negocioUserId],
    );
    let negocioId;
    if (existingNeg.length === 0) {
      const { rows: newNeg } = await client.query(
        `INSERT INTO negocios (id, usuario_id, nombre, descripcion)
         VALUES (gen_random_uuid(), $1, $2, $3) RETURNING id`,
        [negocioUserId, 'Doña Pepa', 'Comida casera para estudiantes'],
      );
      negocioId = newNeg[0].id;
    } else {
      negocioId = existingNeg[0].id;
    }

    // Productos
    const productos = [
      { nombre: 'Café con leche', precio: 5.00, categoria: 'Bebidas' },
      { nombre: 'Sánguche de pollo', precio: 8.50, categoria: 'Snacks' },
      { nombre: 'Lomo saltado', precio: 14.00, categoria: 'Almuerzos' },
      { nombre: 'Tequeños (6 und)', precio: 7.00, categoria: 'Snacks' },
      { nombre: 'Chicha morada', precio: 4.00, categoria: 'Bebidas' },
      { nombre: 'Alfajor de maicena', precio: 3.50, categoria: 'Postres' },
    ];
    // Limpiar y re-insertar productos de prueba
    await client.query(`DELETE FROM productos WHERE negocio_id = $1`, [negocioId]);
    for (const p of productos) {
      await client.query(
        `INSERT INTO productos (id, negocio_id, nombre, precio, categoria, disponible)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, true)`,
        [negocioId, p.nombre, p.precio, p.categoria],
      );
    }

    // Puntos iniciales para Mateo
    await client.query(
      `INSERT INTO puntos (id, estudiante_id, saldo)
       VALUES (gen_random_uuid(), $1, 150)
       ON CONFLICT (estudiante_id) DO UPDATE SET saldo = 150`,
      [estudianteId],
    );

    // Recompensas
    const recompensas = [
      { nombre: 'Chicha morada gratis', descripcion: 'Canjea 100 puntos por una chicha morada', puntos: 100 },
      { nombre: 'Maracuyá gratis', descripcion: 'Canjea 100 puntos por un maracuyá refrescante', puntos: 100 },
    ];
    for (const r of recompensas) {
      await client.query(
        `INSERT INTO recompensas (id, nombre, descripcion, puntos_requeridos)
         VALUES (gen_random_uuid(), $1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [r.nombre, r.descripcion, r.puntos],
      );
    }

    await client.query('COMMIT');
    console.log('[seed] Datos de prueba insertados correctamente.');
    console.log('  Mateo tiene 150 puntos de prueba');
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
