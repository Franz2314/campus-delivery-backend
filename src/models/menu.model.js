const { query } = require('../db/connection');

const menuModel = {
  async findAll(filtros = {}) {
    let sql = `SELECT m.* FROM menus m WHERE 1=1`;
    const params = [];
    let idx = 1;

    if (filtros.negocio_id) {
      sql += ` AND m.negocio_id = $${idx++}`;
      params.push(filtros.negocio_id);
    }
    if (filtros.disponible !== undefined) {
      sql += ` AND m.disponible = $${idx++}`;
      params.push(filtros.disponible);
    }

    sql += ' ORDER BY m.nombre ASC';
    const result = await query(sql, params);

    const menus = result.rows;
    for (const menu of menus) {
      const items = await query(
        'SELECT id, tipo, nombre, descripcion, imagen_url FROM menu_items WHERE menu_id = $1 ORDER BY tipo',
        [menu.id],
      );
      menu.items = items.rows;
    }
    return menus;
  },

  async findById(id) {
    const result = await query('SELECT * FROM menus WHERE id = $1', [id]);
    if (!result.rows[0]) return null;
    const menu = result.rows[0];
    const items = await query(
      'SELECT id, tipo, nombre, descripcion, imagen_url FROM menu_items WHERE menu_id = $1 ORDER BY tipo',
      [id],
    );
    menu.items = items.rows;
    return menu;
  },

  async create({ negocio_id, nombre, descripcion, precio, imagen_url, disponible }) {
    const result = await query(
      `INSERT INTO menus (negocio_id, nombre, descripcion, precio, imagen_url, disponible)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [negocio_id, nombre, descripcion || null, precio, imagen_url || null, disponible ?? true],
    );
    return result.rows[0];
  },

  async update(id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return null;
    const setClauses = keys.map((k, i) => `${k} = $${i + 2}`);
    const values = keys.map((k) => fields[k]);
    const result = await query(
      `UPDATE menus SET ${setClauses.join(', ')}, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    return result.rows[0];
  },

  async remove(id) {
    const result = await query('DELETE FROM menus WHERE id = $1 RETURNING id', [id]);
    return result.rows[0] || null;
  },

  async findByNegocio(negocioId) {
    const result = await query(
      'SELECT * FROM menus WHERE negocio_id = $1 ORDER BY nombre ASC',
      [negocioId],
    );
    const menus = result.rows;
    for (const menu of menus) {
      const items = await query(
        'SELECT id, tipo, nombre, descripcion, imagen_url FROM menu_items WHERE menu_id = $1 ORDER BY tipo',
        [menu.id],
      );
      menu.items = items.rows;
    }
    return menus;
  },

  async addItem({ menu_id, tipo, nombre, descripcion }) {
    const result = await query(
      `INSERT INTO menu_items (menu_id, tipo, nombre, descripcion)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [menu_id, tipo, nombre, descripcion || null],
    );
    return result.rows[0];
  },

  async updateItem(id, fields) {
    const keys = Object.keys(fields);
    if (keys.length === 0) return null;
    const setClauses = keys.map((k, i) => `${k} = $${i + 2}`);
    const values = keys.map((k) => fields[k]);
    const result = await query(
      `UPDATE menu_items SET ${setClauses.join(', ')}
       WHERE id = $1 RETURNING *`,
      [id, ...values],
    );
    return result.rows[0];
  },

  async removeItem(id) {
    const result = await query('DELETE FROM menu_items WHERE id = $1 RETURNING id', [id]);
    return result.rows[0] || null;
  },
};

module.exports = menuModel;
