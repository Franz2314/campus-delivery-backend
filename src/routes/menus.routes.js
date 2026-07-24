const { Router } = require('express');
const menuModel = require('../models/menu.model');
const pedidoModel = require('../models/pedido.model');
const { autenticar } = require('../middleware/auth.middleware');
const { permitir } = require('../middleware/roles.middleware');

const router = Router();

// Público
router.get('/menus', async (req, res) => {
  try {
    const { negocio_id, disponible } = req.query;
    const filtros = {};
    if (negocio_id) filtros.negocio_id = negocio_id;
    if (disponible !== undefined) filtros.disponible = disponible === 'true';
    const menus = await menuModel.findAll(filtros);
    res.json(menus);
  } catch (err) {
    console.error('[menus/listar]', err);
    res.status(500).json({ error: 'Error al listar menús' });
  }
});

router.get('/menus/:id', async (req, res) => {
  try {
    const menu = await menuModel.findById(req.params.id);
    if (!menu) return res.status(404).json({ error: 'Menú no encontrado' });
    res.json(menu);
  } catch (err) {
    console.error('[menus/detalle]', err);
    res.status(500).json({ error: 'Error al obtener menú' });
  }
});

// Negocio: CRUD de menús
router.post('/menus', autenticar, permitir('negocio'), async (req, res) => {
  try {
    const negocio = await pedidoModel.findNegocioByUsuarioId(req.usuario.id);
    if (!negocio) return res.status(400).json({ error: 'No tienes un negocio registrado' });

    const { nombre, descripcion, precio, imagen_url, disponible } = req.body;
    if (!nombre || nombre.trim().length < 2) {
      return res.status(400).json({ error: 'Nombre requerido (mín. 2 caracteres)' });
    }
    if (!precio || parseFloat(precio) <= 0) {
      return res.status(400).json({ error: 'Precio debe ser mayor a 0' });
    }

    const menu = await menuModel.create({
      negocio_id: negocio.id,
      nombre: nombre.trim(),
      descripcion: descripcion?.trim(),
      precio: parseFloat(precio),
      imagen_url,
      disponible,
    });
    res.status(201).json(menu);
  } catch (err) {
    console.error('[menus/crear]', err);
    res.status(500).json({ error: 'Error al crear menú' });
  }
});

router.put('/menus/:id', autenticar, permitir('negocio'), async (req, res) => {
  try {
    const menu = await menuModel.findById(req.params.id);
    if (!menu) return res.status(404).json({ error: 'Menú no encontrado' });

    const negocio = await pedidoModel.findNegocioByUsuarioId(req.usuario.id);
    if (!negocio || String(menu.negocio_id) !== String(negocio.id)) {
      return res.status(403).json({ error: 'No tienes permisos para editar este menú' });
    }

    const campos = ['nombre', 'descripcion', 'precio', 'imagen_url', 'disponible'];
    const updates = {};
    for (const key of campos) {
      if (req.body[key] !== undefined) {
        updates[key] = key === 'precio' ? parseFloat(req.body[key]) : req.body[key];
      }
    }
    if (updates.nombre && updates.nombre.trim().length < 2) {
      return res.status(400).json({ error: 'Nombre debe tener al menos 2 caracteres' });
    }

    const actualizado = await menuModel.update(req.params.id, updates);
    res.json(actualizado);
  } catch (err) {
    console.error('[menus/actualizar]', err);
    res.status(500).json({ error: 'Error al actualizar menú' });
  }
});

router.delete('/menus/:id', autenticar, permitir('negocio'), async (req, res) => {
  try {
    const menu = await menuModel.findById(req.params.id);
    if (!menu) return res.status(404).json({ error: 'Menú no encontrado' });

    const negocio = await pedidoModel.findNegocioByUsuarioId(req.usuario.id);
    if (!negocio || String(menu.negocio_id) !== String(negocio.id)) {
      return res.status(403).json({ error: 'No tienes permisos para eliminar este menú' });
    }

    await menuModel.remove(req.params.id);
    res.json({ message: 'Menú eliminado correctamente' });
  } catch (err) {
    console.error('[menus/eliminar]', err);
    res.status(500).json({ error: 'Error al eliminar menú' });
  }
});

// Negocio: CRUD de items del menú
router.post('/menus/:id/items', autenticar, permitir('negocio'), async (req, res) => {
  try {
    const menu = await menuModel.findById(req.params.id);
    if (!menu) return res.status(404).json({ error: 'Menú no encontrado' });

    const negocio = await pedidoModel.findNegocioByUsuarioId(req.usuario.id);
    if (!negocio || String(menu.negocio_id) !== String(negocio.id)) {
      return res.status(403).json({ error: 'No tienes permisos' });
    }

    const { tipo, nombre, descripcion } = req.body;
    if (!tipo || !nombre) {
      return res.status(400).json({ error: 'tipo y nombre son requeridos' });
    }
    const tiposValidos = ['entrada', 'sopa', 'plato_fuerte', 'postre', 'bebida'];
    if (!tiposValidos.includes(tipo)) {
      return res.status(400).json({ error: `tipo debe ser: ${tiposValidos.join(', ')}` });
    }

    const item = await menuModel.addItem({ menu_id: req.params.id, tipo, nombre, descripcion });
    res.status(201).json(item);
  } catch (err) {
    console.error('[menus/addItem]', err);
    res.status(500).json({ error: 'Error al agregar item' });
  }
});

router.put('/menu-items/:id', autenticar, permitir('negocio'), async (req, res) => {
  try {
    const { query } = require('../db/connection');
    const itemResult = await query(
      `SELECT mi.*, m.negocio_id FROM menu_items mi JOIN menus m ON m.id = mi.menu_id WHERE mi.id = $1`,
      [req.params.id],
    );
    if (!itemResult.rows[0]) return res.status(404).json({ error: 'Item no encontrado' });

    const negocio = await pedidoModel.findNegocioByUsuarioId(req.usuario.id);
    if (!negocio || String(itemResult.rows[0].negocio_id) !== String(negocio.id)) {
      return res.status(403).json({ error: 'No tienes permisos' });
    }

    const campos = ['tipo', 'nombre', 'descripcion'];
    const updates = {};
    for (const key of campos) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const actualizado = await menuModel.updateItem(req.params.id, updates);
    res.json(actualizado);
  } catch (err) {
    console.error('[menus/updateItem]', err);
    res.status(500).json({ error: 'Error al actualizar item' });
  }
});

router.delete('/menu-items/:id', autenticar, permitir('negocio'), async (req, res) => {
  try {
    const { query } = require('../db/connection');
    const itemResult = await query(
      `SELECT mi.*, m.negocio_id FROM menu_items mi JOIN menus m ON m.id = mi.menu_id WHERE mi.id = $1`,
      [req.params.id],
    );
    if (!itemResult.rows[0]) return res.status(404).json({ error: 'Item no encontrado' });

    const negocio = await pedidoModel.findNegocioByUsuarioId(req.usuario.id);
    if (!negocio || String(itemResult.rows[0].negocio_id) !== String(negocio.id)) {
      return res.status(403).json({ error: 'No tienes permisos' });
    }

    await menuModel.removeItem(req.params.id);
    res.json({ message: 'Item eliminado correctamente' });
  } catch (err) {
    console.error('[menus/deleteItem]', err);
    res.status(500).json({ error: 'Error al eliminar item' });
  }
});

module.exports = router;
