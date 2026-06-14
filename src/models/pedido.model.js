const { query } = require('../db/connection');

const pedidoModel = {
  async create({ estudiante_id, negocio_id, pabellon_id, piso, hora_programada, total, comprobante_url }) {
    const result = await query(
      `INSERT INTO pedidos (estudiante_id, negocio_id, pabellon_id, piso, hora_programada, total, comprobante_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [estudiante_id, negocio_id, pabellon_id, piso || 1, hora_programada, total, comprobante_url || null],
    );
    return result.rows[0];
  },

  async addDetalle(pedidoId, items) {
    if (items.length === 0) return;
    const values = [];
    const params = [];
    let idx = 1;
    for (const item of items) {
      const subtotal = parseFloat(item.precio_unitario) * item.cantidad;
      values.push(
        `($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4}, $${idx + 5}, $${idx + 6})`,
      );
      params.push(
        require('uuid').v4(),
        pedidoId,
        item.producto_id,
        item.nombre,
        item.precio_unitario,
        item.cantidad,
        subtotal,
      );
      idx += 7;
    }
    await query(
      `INSERT INTO detalle_pedidos (id, pedido_id, producto_id, nombre, precio_unitario, cantidad, subtotal)
       VALUES ${values.join(', ')}`,
      params,
    );
  },

  async findById(id) {
    const result = await query(
      `SELECT p.*,
              n.nombre AS negocio_nombre,
              pb.nombre AS pabellon_nombre,
              pb.max_pisos,
              u.nombre AS estudiante_nombre,
              u.email AS estudiante_email
       FROM pedidos p
       JOIN negocios n ON n.id = p.negocio_id
       JOIN pabellones pb ON pb.id = p.pabellon_id
       LEFT JOIN usuarios u ON u.id = p.estudiante_id
       WHERE p.id = $1`,
      [id],
    );
    return result.rows[0] || null;
  },

  async findDetalles(pedidoId) {
    const result = await query(
      'SELECT * FROM detalle_pedidos WHERE pedido_id = $1 ORDER BY nombre ASC',
      [pedidoId],
    );
    return result.rows;
  },

  async findByUsuario(usuarioId, rol) {
    let sql = `
      SELECT p.*, n.nombre AS negocio_nombre, pb.nombre AS pabellon_nombre, pb.max_pisos
      FROM pedidos p
      JOIN negocios n ON n.id = p.negocio_id
      JOIN pabellones pb ON pb.id = p.pabellon_id
      WHERE 1=1`;
    const params = [];

    if (rol === 'estudiante') {
      sql += ' AND p.estudiante_id = $1';
      params.push(usuarioId);
    } else if (rol === 'negocio') {
      sql += ' AND n.usuario_id = $1';
      params.push(usuarioId);
    } else if (rol === 'repartidor') {
      sql += ' AND (p.repartidor_id = $1 OR (p.repartidor_id IS NULL AND p.estado = $2))';
      params.push(usuarioId, 'confirmado');
    }

    sql += ' ORDER BY p.created_at DESC';
    const result = await query(sql, params);
    return result.rows;
  },

  async updateEstado(id, estado, repartidorId) {
    let sql = 'UPDATE pedidos SET estado = $2, updated_at = NOW()';
    const params = [id, estado];
    let idx = 3;

    if (repartidorId !== undefined) {
      sql += `, repartidor_id = $${idx++}`;
      params.push(repartidorId);
    }

    sql += ` WHERE id = $1 RETURNING *`;
    const result = await query(sql, params);
    return result.rows[0] || null;
  },

  async cancelar(id, motivo) {
    const params = [id];
    let sql = `UPDATE pedidos SET estado = 'cancelado', updated_at = NOW()`;
    if (motivo) {
      sql += `, motivo_cancelacion = $2`;
      params.push(motivo);
    }
    sql += ` WHERE id = $1 AND estado IN ('pendiente', 'confirmado') RETURNING *`;
    const result = await query(sql, params);
    return result.rows[0] || null;
  },

  async rechazar(id, motivo) {
    const result = await query(
      `UPDATE pedidos SET estado = 'rechazado', comprobante_rechazado = true, motivo_cancelacion = $2, updated_at = NOW()
       WHERE id = $1 AND estado = 'pendiente' RETURNING *`,
      [id, motivo],
    );
    return result.rows[0] || null;
  },

  async verificarComprobante(id) {
    const result = await query(
      `UPDATE pedidos SET comprobante_verificado = true, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id],
    );
    return result.rows[0] || null;
  },

  async findNegocioByUsuarioId(usuarioId) {
    const result = await query('SELECT * FROM negocios WHERE usuario_id = $1', [usuarioId]);
    return result.rows[0] || null;
  },

  async darPuntos(estudianteId, cantidad, concepto, pedidoId) {
    const puntos = await query(
      `INSERT INTO puntos (estudiante_id, saldo) VALUES ($1, $2)
       ON CONFLICT (estudiante_id) DO UPDATE SET saldo = puntos.saldo + $2, updated_at = NOW()
       RETURNING *`,
      [estudianteId, cantidad],
    );
    await query(
      `INSERT INTO puntos_historial (estudiante_id, tipo, cantidad, concepto, pedido_id)
       VALUES ($1, 'ganado', $2, $3, $4)`,
      [estudianteId, cantidad, concepto, pedidoId],
    );
    return puntos.rows[0];
  },
};

module.exports = pedidoModel;
