const pedidoModel = require('../models/pedido.model');
const productoModel = require('../models/producto.model');

const pedidosController = {
  async crear(req, res) {
    try {
      const { pabellon_id, hora_programada, items, comprobante_url } = req.body;

      if (!pabellon_id || !hora_programada || !items || items.length === 0) {
        return res.status(400).json({ error: 'Faltan datos: pabellon_id, hora_programada, items' });
      }

      // Validar productos y calcular total
      let total = 0;
      const detalles = [];
      for (const item of items) {
        const producto = await productoModel.findById(item.producto_id);
        if (!producto) {
          return res.status(404).json({ error: `Producto ${item.producto_id} no encontrado` });
        }
        if (!producto.disponible) {
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
      }

      // Determinar negocio_id del primer producto (todos deben ser del mismo negocio)
      const primerProducto = await productoModel.findById(items[0].producto_id);
      const negocioId = primerProducto.negocio_id;

      const pedido = await pedidoModel.create({
        estudiante_id: req.usuario.id,
        negocio_id: negocioId,
        pabellon_id,
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

      // Adjuntar detalles a cada pedido
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
      if (!pedido) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }

      if (pedido.estado === 'cancelado' || pedido.estado === 'entregado') {
        return res.status(400).json({ error: `No se puede cambiar estado: pedido ${pedido.estado}` });
      }

      // Validar permisos según rol
      if (req.usuario.rol === 'negocio') {
        if (!['confirmado', 'en_preparacion'].includes(estado)) {
          return res.status(403).json({ error: 'El negocio solo puede confirmar o preparar pedidos' });
        }
      } else if (req.usuario.rol === 'repartidor') {
        if (!['en_camino', 'entregado'].includes(estado)) {
          return res.status(403).json({ error: 'El repartidor solo puede marcar en_camino o entregado' });
        }
      }

      const repartidorId = req.usuario.rol === 'repartidor' && estado === 'en_camino' ? req.usuario.id : undefined;

      const actualizado = await pedidoModel.updateEstado(id, estado, repartidorId);
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
      const pedido = await pedidoModel.findById(id);

      if (!pedido) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }

      if (String(pedido.estudiante_id) !== String(req.usuario.id)) {
        return res.status(403).json({ error: 'Solo el estudiante que creó el pedido puede cancelarlo' });
      }

      const cancelado = await pedidoModel.cancelar(id);
      if (!cancelado) {
        return res.status(400).json({
          error: 'No se puede cancelar el pedido. Solo se cancelan pedidos pendientes o confirmados.',
        });
      }

      const detalles = await pedidoModel.findDetalles(id);
      res.json({ ...cancelado, detalles });
    } catch (err) {
      console.error('[pedidos/cancelar]', err);
      res.status(500).json({ error: 'Error al cancelar pedido' });
    }
  },
};

module.exports = pedidosController;
