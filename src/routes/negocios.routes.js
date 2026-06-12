const { Router } = require('express');
const menuController = require('../controllers/menu.controller');

const router = Router();

router.get('/', menuController.listarNegocios);
router.get('/:id', menuController.detalleNegocio);

module.exports = router;
