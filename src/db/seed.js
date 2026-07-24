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
        `INSERT INTO negocios (id, usuario_id, nombre, descripcion, imagen_url)
         VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING id`,
        [negocioUserId, 'Doña Pepa', 'Comida casera para estudiantes',
        'https://campus-delivery-backend-avyi.onrender.com/images/dona-pepa.jpg'],
      );
      negocioId = newNeg[0].id;
    } else {
      negocioId = existingNeg[0].id;
    }

    // Productos
    const productos = [
      { nombre: 'Café con leche', imagen_url: 'https://campus-delivery-backend-avyi.onrender.com/images/cafe.jpg', precio: 5.00, categoria: 'Bebidas' },
      { nombre: 'Sánguche de pollo', imagen_url: 'https://campus-delivery-backend-avyi.onrender.com/images/sanguche.jpg', precio: 8.50, categoria: 'Snacks' },
      { nombre: 'Lomo saltado', imagen_url: 'https://campus-delivery-backend-avyi.onrender.com/images/lomo.jpg', precio: 14.00, categoria: 'Almuerzos' },
      { nombre: 'Tequeños (6 und)', imagen_url: 'https://campus-delivery-backend-avyi.onrender.com/images/tequenos.jpg', precio: 7.00, categoria: 'Snacks' },
      { nombre: 'Chicha morada', imagen_url: 'https://campus-delivery-backend-avyi.onrender.com/images/chicha.jpg', precio: 4.00, categoria: 'Bebidas' },
      { nombre: 'Alfajor de maicena', imagen_url: 'https://campus-delivery-backend-avyi.onrender.com/images/alfajor.jpg', precio: 3.50, categoria: 'Postres' },
    ];
    // Limpiar y re-insertar productos de prueba
    await client.query(`DELETE FROM productos WHERE negocio_id = $1`, [negocioId]);
    for (const p of productos) {
      await client.query(
        `INSERT INTO productos (id, negocio_id, nombre, imagen_url, precio, categoria, disponible)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true)`,
        [negocioId, p.nombre, p.imagen_url, p.precio, p.categoria],
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

    // Menús del día
    const img = (name) => `https://campus-delivery-backend-avyi.onrender.com/images/${name}`;
    const menus = [
      {
        nombre: 'Menú Universitario',
        descripcion: 'Sopa, plato fuerte y bebida — ideal para el día a día',
        precio: 11.00,
        imagen_url: img('dona-pepa.jpg'),
        items: [
          { tipo: 'sopa', nombre: 'Sopa de casa', imagen_url: img('caldo_gallina.jpg') },
          { tipo: 'plato_fuerte', nombre: 'Pollo saltado con arroz', imagen_url: img('arroz_pollo.jpg') },
          { tipo: 'bebida', nombre: 'Chicha morada', imagen_url: img('chicha.jpg') },
        ],
      },
      {
        nombre: 'Ejecutivo 1',
        descripcion: 'Entrada a elección (sopa u ocopa), plato fuerte, postre y bebida',
        precio: 13.00,
        imagen_url: img('dona-pepa.jpg'),
        items: [
          { tipo: 'entrada', nombre: 'Sopa o Ocopa', imagen_url: img('ocopa.jpg') },
          { tipo: 'plato_fuerte', nombre: 'Arroz con pollo', imagen_url: img('arroz_pollo.jpg') },
          { tipo: 'postre', nombre: 'Mazamorra morada' },
          { tipo: 'bebida', nombre: 'Limonada' },
        ],
      },
      {
        nombre: 'Ejecutivo 2',
        descripcion: 'Entrada a elección (sopa u ocopa), plato fuerte, postre y bebida',
        precio: 13.00,
        imagen_url: img('dona-pepa.jpg'),
        items: [
          { tipo: 'entrada', nombre: 'Sopa u Ocopa', imagen_url: img('ocopa.jpg') },
          { tipo: 'plato_fuerte', nombre: 'Escabeche de pollo con arroz', imagen_url: img('escabeche.jpg') },
          { tipo: 'postre', nombre: 'Arroz con leche' },
          { tipo: 'bebida', nombre: 'Maracuyá' },
        ],
      },
    ];
    for (const m of menus) {
      const { rows: menuRows } = await client.query(
        `INSERT INTO menus (id, negocio_id, nombre, descripcion, precio, imagen_url)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [negocioId, m.nombre, m.descripcion, m.precio, m.imagen_url],
      );
      if (menuRows.length > 0) {
        for (const item of m.items) {
          await client.query(
            `INSERT INTO menu_items (id, menu_id, tipo, nombre, imagen_url)
             VALUES (gen_random_uuid(), $1, $2, $3, $4)`,
            [menuRows[0].id, item.tipo, item.nombre, item.imagen_url || null],
          );
        }
      }
    }

    await client.query('COMMIT');
    console.log('[seed] Datos de prueba insertados correctamente.');
    console.log('  Mateo tiene 150 puntos de prueba');
    console.log('  3 menús del día creados para Doña Pepa');
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
