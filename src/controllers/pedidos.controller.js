const pedidoModel = require('../models/pedido.model');
const productoModel = require('../models/producto.model');
const menuModel = require('../models/menu.model');

const pedidosController = {
  async crear(req, res) {
    try {
      const { pabellon_id, piso, hora_programada, items, comprobante_url } = req.body;

      if (!pabellon_id || !hora_programada || !items || items.length === 0) {
        return res.status(400).json({ error: 'Faltan datos: pabellon_id, hora_programada, items' });
      }

      let total = 0;
      const detalles = [];
      let negocioId = null;
      for (const item of items) {
        let producto = await productoModel.findById(item.producto_id);
        let esMenu = false;
        if (!producto) {
          producto = await menuModel.findById(item.producto_id);
          if (!producto) {
            return res.status(404).json({ error: `Producto ${item.producto_id} no encontrado` });
          }
          esMenu = true;
        }
        if (!esMenu && !producto.disponible) {
          return res.status(400).json({ error: `Producto "${producto.nombre}" no está disponible` });
        }
        const subtotal = parseFloat(producto.precio) * item.cantidad;
        total += subtotal;
        detalles.push({
          producto_id: producto.id,
          nombre: producto.nombre,
          precio_unitario: producto.precio,
          cantidad: item.cantidad,
          subtotal,
        });
        if (!negocioId) negocioId = producto.negocio_id;
      }

      const pedido = await pedidoModel.create({
        estudiante_id: req.usuario.id,
        negocio_id: negocioId,
        pabellon_id,
        piso: piso || 1,
        hora_programada,
        total,
        comprobante_url,
      });

      await pedidoModel.addDetalle(pedido.id, detalles);

      const pedidoCompleto = await pedidoModel.findById(pedido.id);
      const pedidoDetalles = await pedidoModel.findDetalles(pedido.id);

      res.status(201).json({ ...pedidoCompleto, detalles: pedidoDetalles });
    } catch (err) {
      console.error('[pedidos/crear]', err);
      res.status(500).json({ error: 'Error al crear pedido' });
    }
  },

  async listar(req, res) {
    try {
      const pedidos = await pedidoModel.findByUsuario(req.usuario.id, req.usuario.rol);
      const result = [];
      for (const p of pedidos) {
        const detalles = await pedidoModel.findDetalles(p.id);
        result.push({ ...p, detalles });
      }
      res.json(result);
    } catch (err) {
      console.error('[pedidos/listar]', err);
      res.status(500).json({ error: 'Error al listar pedidos' });
    }
  },

  async detalle(req, res) {
    try {
      const pedido = await pedidoModel.findById(req.params.id);
      if (!pedido) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }
      const detalles = await pedidoModel.findDetalles(pedido.id);
      res.json({ ...pedido, detalles });
    } catch (err) {
      console.error('[pedidos/detalle]', err);
      res.status(500).json({ error: 'Error al obtener pedido' });
    }
  },

  async actualizarEstado(req, res) {
    try {
      const { id } = req.params;
      const { estado } = req.body;

      const estadosValidos = ['confirmado', 'en_preparacion', 'en_camino', 'entregado'];
      if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ error: `Estado inválido. Válidos: ${estadosValidos.join(', ')}` });
      }

      const pedido = await pedidoModel.findById(id);
      if (!pedido) return res.status(404).json({ error: 'Pedido no encontrado' });

      if (pedido.estado === 'cancelado' || pedido.estado === 'entregado' || pedido.estado === 'rechazado') {
        return res.status(400).json({ error: `No se puede cambiar estado: pedido ${pedido.estado}` });
      }

      if (req.usuario.rol === 'negocio') {
        if (!['confirmado', 'en_preparacion'].includes(estado)) {
          return res.status(403).json({ error: 'El negocio solo puede confirmar o preparar pedidos' });
        }
        if (estado === 'confirmado') {
          await pedidoModel.verificarComprobante(id);
        }
      } else if (req.usuario.rol === 'repartidor') {
        if (!['en_camino', 'entregado'].includes(estado)) {
          return res.status(403).json({ error: 'El repartidor solo puede marcar en_camino o entregado' });
        }
      }

      const repartidorId = req.usuario.rol === 'repartidor' && estado === 'en_camino' ? req.usuario.id : undefined;

      const actualizado = await pedidoModel.updateEstado(id, estado, repartidorId);

      // Si se entregó, dar puntos al estudiante (1 punto por cada S/10)
      if (estado === 'entregado' && pedido.estudiante_id) {
        const puntos = Math.floor(parseFloat(pedido.total) / 10);
        if (puntos > 0) {
          await pedidoModel.darPuntos(
            pedido.estudiante_id,
            puntos,
            `Compra en ${pedido.negocio_nombre || 'Doña Pepa'}`,
            id,
          );
        }
      }

      const detalles = await pedidoModel.findDetalles(id);
      res.json({ ...actualizado, detalles });
    } catch (err) {
      console.error('[pedidos/actualizarEstado]', err);
      res.status(500).json({ error: 'Error al actualizar estado' });
    }
  },

  async cancelar(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;
      const pedido = await pedidoModel.findById(id);

      if (!pedido) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }

      const esEstudiante = String(pedido.estudiante_id) === String(req.usuario.id);
      const esNegocio = req.usuario.rol === 'negocio';
      const esRepartidor = req.usuario.rol === 'repartidor';

      if (!esEstudiante && !esNegocio && !esRepartidor) {
        return res.status(403).json({ error: 'No tienes permisos para cancelar este pedido' });
      }

      if (pedido.estado !== 'pendiente' && pedido.estado !== 'confirmado') {
        return res.status(400).json({
          error: 'Solo se cancelan pedidos pendientes o confirmados.',
        });
      }

      const cancelado = await pedidoModel.cancelar(id, motivo || null);
      const detalles = await pedidoModel.findDetalles(id);
      res.json({ ...cancelado, detalles });
    } catch (err) {
      console.error('[pedidos/cancelar]', err);
      res.status(500).json({ error: 'Error al cancelar pedido' });
    }
  },

  async rechazarComprobante(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;
      const pedido = await pedidoModel.findById(id);

      if (!pedido) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }

      if (req.usuario.rol !== 'negocio' && req.usuario.rol !== 'repartidor') {
        return res.status(403).json({ error: 'Solo negocio o repartidor pueden rechazar comprobantes' });
      }

      if (pedido.estado !== 'pendiente') {
        return res.status(400).json({ error: 'Solo se rechazan comprobantes de pedidos pendientes' });
      }

      const rechazado = await pedidoModel.rechazar(id, motivo || 'Comprobante inválido');
      const detalles = await pedidoModel.findDetalles(id);
      res.json({ ...rechazado, detalles });
    } catch (err) {
      console.error('[pedidos/rechazarComprobante]', err);
      res.status(500).json({ error: 'Error al rechazar comprobante' });
    }
  },
};

module.exports = pedidosController;
