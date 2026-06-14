const { query } = require('../db/connection');

const puntosModel = {
  async getSaldo(estudianteId) {
    const result = await query('SELECT saldo FROM puntos WHERE estudiante_id = $1', [estudianteId]);
    return result.rows[0]?.saldo || 0;
  },

  async getHistorial(estudianteId) {
    const result = await query(
      'SELECT * FROM puntos_historial WHERE estudiante_id = $1 ORDER BY created_at DESC LIMIT 50',
      [estudianteId],
    );
    return result.rows;
  },

  async getRecompensas() {
    const result = await query('SELECT * FROM recompensas WHERE activo = true ORDER BY puntos_requeridos ASC');
    return result.rows;
  },

  async canjear(estudianteId, recompensaId) {
    const recompensa = await query('SELECT * FROM recompensas WHERE id = $1 AND activo = true', [recompensaId]);
    if (!recompensa.rows[0]) throw new Error('Recompensa no encontrada');
    const puntosRequeridos = recompensa.rows[0].puntos_requeridos;

    const saldo = await this.getSaldo(estudianteId);
    if (saldo < puntosRequeridos) throw new Error('Puntos insuficientes');

    const canje = await query(
      `INSERT INTO canjes (estudiante_id, recompensa_id, puntos_gastados)
       VALUES ($1, $2, $3) RETURNING *`,
      [estudianteId, recompensaId, puntosRequeridos],
    );

    await query(
      `UPDATE puntos SET saldo = saldo - $1, updated_at = NOW() WHERE estudiante_id = $2`,
      [puntosRequeridos, estudianteId],
    );

    await query(
      `INSERT INTO puntos_historial (estudiante_id, tipo, cantidad, concepto)
       VALUES ($1, 'canjeado', $2, $3)`,
      [estudianteId, puntosRequeridos, `Canje: ${recompensa.rows[0].nombre}`],
    );

    return canje.rows[0];
  },

  async getMisCanjes(estudianteId) {
    const result = await query(
      `SELECT c.*, r.nombre, r.descripcion, r.imagen_url
       FROM canjes c
       JOIN recompensas r ON r.id = c.recompensa_id
       WHERE c.estudiante_id = $1
       ORDER BY c.created_at DESC`,
      [estudianteId],
    );
    return result.rows;
  },
};

module.exports = puntosModel;
