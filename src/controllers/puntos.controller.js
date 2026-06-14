const puntosModel = require('../models/puntos.model');

const puntosController = {
  async getSaldo(req, res) {
    try {
      const saldo = await puntosModel.getSaldo(req.usuario.id);
      res.json({ saldo });
    } catch (err) {
      console.error('[puntos/saldo]', err);
      res.status(500).json({ error: 'Error al obtener saldo' });
    }
  },

  async getHistorial(req, res) {
    try {
      const historial = await puntosModel.getHistorial(req.usuario.id);
      res.json(historial);
    } catch (err) {
      console.error('[puntos/historial]', err);
      res.status(500).json({ error: 'Error al obtener historial' });
    }
  },

  async getRecompensas(req, res) {
    try {
      const recompensas = await puntosModel.getRecompensas();
      res.json(recompensas);
    } catch (err) {
      console.error('[puntos/recompensas]', err);
      res.status(500).json({ error: 'Error al obtener recompensas' });
    }
  },

  async canjear(req, res) {
    try {
      const { recompensa_id } = req.body;
      if (!recompensa_id) {
        return res.status(400).json({ error: 'recompensa_id requerido' });
      }
      const canje = await puntosModel.canjear(req.usuario.id, recompensa_id);
      res.status(201).json(canje);
    } catch (err) {
      console.error('[puntos/canjear]', err);
      if (err.message === 'Puntos insuficientes' || err.message === 'Recompensa no encontrada') {
        return res.status(400).json({ error: err.message });
      }
      res.status(500).json({ error: 'Error al canjear puntos' });
    }
  },

  async getMisCanjes(req, res) {
    try {
      const canjes = await puntosModel.getMisCanjes(req.usuario.id);
      res.json(canjes);
    } catch (err) {
      console.error('[puntos/canjes]', err);
      res.status(500).json({ error: 'Error al obtener canjes' });
    }
  },
};

module.exports = puntosController;
