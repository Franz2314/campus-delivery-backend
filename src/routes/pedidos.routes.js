const { Router } = require('express');
const pedidosController = require('../controllers/pedidos.controller');
const { autenticar } = require('../middleware/auth.middleware');
const { permitir } = require('../middleware/roles.middleware');

const router = Router();

router.post('/', autenticar, permitir('estudiante'), pedidosController.crear);
router.get('/', autenticar, pedidosController.listar);
router.get('/:id', autenticar, pedidosController.detalle);
router.put('/:id/estado', autenticar, permitir('negocio', 'repartidor'), pedidosController.actualizarEstado);
router.put('/:id/cancelar', autenticar, permitir('estudiante'), pedidosController.cancelar);

module.exports = router;
