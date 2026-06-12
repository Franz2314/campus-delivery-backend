const { query } = require('../db/connection');

const productoModel = {
  async findAll(filtros = {}) {
    let sql = `SELECT p.*, n.nombre AS negocio_nombre
               FROM productos p
               JOIN negocios n ON n.id = p.negocio_id
               WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (filtros.categoria) {
      sql += ` AND p.categoria = $${idx++}`;
      params.push(filtros.categoria);
    }
    if (filtros.negocio_id) {
      sql += ` AND p.negocio_id = $${idx++}`;
      params.push(filtros.negocio_id);
    }
    if (filtros.disponible !== undefined) {
      sql += ` AND p.disponible = $${idx++}`;
      params.push(filtros.disponible);
    }

    sql += ' ORDER BY p.nombre ASC';
    const result = await query(sql, params);
    return result.rows;
  },

  async findById(id) {
    const result = await query(
      `SELECT p.*, n.nombre AS negocio_nombre
       FROM productos p
       JOIN negocios n ON n.id = p.negocio_id
       WHERE p.id = $1`,
      [id],
    );
    return result.rows[0] || null;
  },

  async create({ nombre, descripcion, precio, imagen_url, categoria, disponible, negocio_id }) {
    const result = await query(
      `INSERT INTO productos (negocio_id, nombre, descripcion, precio, imagen_url, categoria, disponible)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [negocio_id, nombre, descripcion || null, precio, imagen_url || null, categoria, disponible ?? true],
    );
    return result.rows[0];
  },

  async update(id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return null;
    const setClauses = keys.map((k, i) => `${k} = $${i + 2}`);
    const values = keys.map((k) => fields[k]);
    const result = await query(
      `UPDATE productos SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    return result.rows[0];
  },

  async remove(id) {
    const result = await query('DELETE FROM productos WHERE id = $1 RETURNING id', [id]);
    return result.rows[0] || null;
  },

  async findByNegocio(negocioId) {
    const result = await query(
      'SELECT * FROM productos WHERE negocio_id = $1 ORDER BY nombre ASC',
      [negocioId],
    );
    return result.rows;
  },
};

module.exports = productoModel;
