const { query } = require('../db/connection');

const usuarioModel = {
  async findByEmail(email) {
    const result = await query('SELECT * FROM usuarios WHERE email = $1', [email]);
    return result.rows[0] || null;
  },

  async findById(id) {
    const result = await query(
      `SELECT id, nombre, email, telefono, rol, activo, created_at
       FROM usuarios WHERE id = $1`,
      [id],
    );
    return result.rows[0] || null;
  },

  async create({ nombre, email, password, rol, telefono }) {
    const result = await query(
      `INSERT INTO usuarios (nombre, email, password, rol, telefono)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, nombre, email, telefono, rol, activo, created_at`,
      [nombre, email, password, rol, telefono || null],
    );
    return result.rows[0];
  },

  async update(id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return null;
    const setClauses = keys.map((k, i) => `${k} = $${i + 2}`);
    const values = keys.map((k) => fields[k]);
    const result = await query(
      `UPDATE usuarios SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE id = $1
       RETURNING id, nombre, email, telefono, rol, activo`,
      [id, ...values],
    );
    return result.rows[0];
  },
};

module.exports = usuarioModel;
