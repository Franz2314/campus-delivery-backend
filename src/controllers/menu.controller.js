const productoModel = require('../models/producto.model');
const pedidoModel = require('../models/pedido.model');

const menuController = {
  async listarProductos(req, res) {
    try {
      const { categoria, negocio_id, disponible } = req.query;
      const filtros = {};
      if (categoria) filtros.categoria = categoria;
      if (negocio_id) filtros.negocio_id = negocio_id;
      if (disponible !== undefined) filtros.disponible = disponible === 'true';

      const productos = await productoModel.findAll(filtros);
      res.json(productos);
    } catch (err) {
      console.error('[menu/listarProductos]', err);
      res.status(500).json({ error: 'Error al listar productos' });
    }
  },

  async detalleProducto(req, res) {
    try {
      const producto = await productoModel.findById(req.params.id);
      if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }
      res.json(producto);
    } catch (err) {
      console.error('[menu/detalleProducto]', err);
      res.status(500).json({ error: 'Error al obtener producto' });
    }
  },

  async crearProducto(req, res) {
    try {
      const negocio = await pedidoModel.findNegocioByUsuarioId(req.usuario.id);
      if (!negocio) {
        return res.status(400).json({ error: 'El usuario no tiene un negocio registrado' });
      }

      const { nombre, descripcion, precio, imagen_url, categoria, disponible } = req.body;

      if (!nombre || nombre.trim().length < 2) {
        return res.status(400).json({ error: 'Nombre requerido (mín. 2 caracteres)' });
      }
      if (!precio || parseFloat(precio) <= 0) {
        return res.status(400).json({ error: 'Precio debe ser mayor a 0' });
      }

      const producto = await productoModel.create({
        nombre: nombre.trim(),
        descripcion: descripcion?.trim(),
        precio: parseFloat(precio),
        imagen_url,
        categoria: categoria || 'Snacks',
        disponible: disponible !== undefined ? disponible : true,
        negocio_id: negocio.id,
      });

      res.status(201).json(producto);
    } catch (err) {
      console.error('[menu/crearProducto]', err);
      res.status(500).json({ error: 'Error al crear producto' });
    }
  },

  async actualizarProducto(req, res) {
    try {
      const producto = await productoModel.findById(req.params.id);
      if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      const negocio = await pedidoModel.findNegocioByUsuarioId(req.usuario.id);
      if (!negocio || String(producto.negocio_id) !== String(negocio.id)) {
        return res.status(403).json({ error: 'No tienes permisos para editar este producto' });
      }

      const camposPermitidos = ['nombre', 'descripcion', 'precio', 'imagen_url', 'categoria', 'disponible'];
      const updates = {};
      for (const key of camposPermitidos) {
        if (req.body[key] !== undefined) {
          updates[key] = key === 'precio' ? parseFloat(req.body[key]) : req.body[key];
        }
      }

      if (updates.nombre && updates.nombre.trim().length < 2) {
        return res.status(400).json({ error: 'Nombre debe tener al menos 2 caracteres' });
      }

      const actualizado = await productoModel.update(req.params.id, updates);
      res.json(actualizado);
    } catch (err) {
      console.error('[menu/actualizarProducto]', err);
      res.status(500).json({ error: 'Error al actualizar producto' });
    }
  },

  async eliminarProducto(req, res) {
    try {
      const producto = await productoModel.findById(req.params.id);
      if (!producto) {
        return res.status(404).json({ error: 'Producto no encontrado' });
      }

      const negocio = await pedidoModel.findNegocioByUsuarioId(req.usuario.id);
      if (!negocio || String(producto.negocio_id) !== String(negocio.id)) {
        return res.status(403).json({ error: 'No tienes permisos para eliminar este producto' });
      }

      await productoModel.remove(req.params.id);
      res.json({ message: 'Producto eliminado correctamente' });
    } catch (err) {
      console.error('[menu/eliminarProducto]', err);
      res.status(500).json({ error: 'Error al eliminar producto' });
    }
  },

  async listarNegocios(req, res) {
    try {
      const { query } = require('../db/connection');
      const result = await query(
        'SELECT id, nombre, descripcion, imagen_url, activo FROM negocios WHERE activo = true ORDER BY nombre ASC',
      );
      res.json(result.rows);
    } catch (err) {
      console.error('[menu/listarNegocios]', err);
      res.status(500).json({ error: 'Error al listar negocios' });
    }
  },

  async detalleNegocio(req, res) {
    try {
      const { query } = require('../db/connection');
      const result = await query(
        `SELECT n.*, json_agg(json_build_object(
          'id', p.id, 'nombre', p.nombre, 'precio', p.precio,
          'categoria', p.categoria, 'disponible', p.disponible, 'descripcion', p.descripcion
        ) ORDER BY p.nombre) AS productos
        FROM negocios n
        LEFT JOIN productos p ON p.negocio_id = n.id AND p.disponible = true
        WHERE n.id = $1
        GROUP BY n.id`,
        [req.params.id],
      );
      if (!result.rows[0]) {
        return res.status(404).json({ error: 'Negocio no encontrado' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error('[menu/detalleNegocio]', err);
      res.status(500).json({ error: 'Error al obtener negocio' });
    }
  },

  async listarPabellones(req, res) {
    try {
      const { query } = require('../db/connection');
      const result = await query('SELECT id, nombre, codigo, descripcion FROM pabellones ORDER BY nombre ASC');
      res.json(result.rows);
    } catch (err) {
      console.error('[menu/listarPabellones]', err);
      res.status(500).json({ error: 'Error al listar pabellones' });
    }
  },

  async crearResena(req, res) {
    try {
      const { pedido_id, calificacion, comentario } = req.body;

      if (!pedido_id || !calificacion) {
        return res.status(400).json({ error: 'pedido_id y calificacion son requeridos' });
      }
      if (calificacion < 1 || calificacion > 5) {
        return res.status(400).json({ error: 'Calificación debe ser entre 1 y 5' });
      }

      const { query } = require('../db/connection');

      const pedido = await query('SELECT estado FROM pedidos WHERE id = $1', [pedido_id]);
      if (!pedido.rows[0]) {
        return res.status(404).json({ error: 'Pedido no encontrado' });
      }
      if (pedido.rows[0].estado !== 'entregado') {
        return res.status(400).json({ error: 'Solo puedes calificar pedidos entregados' });
      }

      const result = await query(
        `INSERT INTO resenas (pedido_id, estudiante_id, calificacion, comentario)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (pedido_id, estudiante_id)
         DO UPDATE SET calificacion = EXCLUDED.calificacion, comentario = EXCLUDED.comentario
         RETURNING *`,
        [pedido_id, req.usuario.id, calificacion, comentario || null],
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('[menu/crearResena]', err);
      res.status(500).json({ error: 'Error al crear reseña' });
    }
  },

  async verResena(req, res) {
    try {
      const { query } = require('../db/connection');
      const result = await query(
        'SELECT * FROM resenas WHERE pedido_id = $1',
        [req.params.id],
      );
      res.json(result.rows[0] || null);
    } catch (err) {
      console.error('[menu/verResena]', err);
      res.status(500).json({ error: 'Error al obtener reseña' });
    }
  },
};

module.exports = menuController;
