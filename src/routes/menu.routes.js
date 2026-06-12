const { Router } = require('express');
const menuController = require('../controllers/menu.controller');
const { autenticar } = require('../middleware/auth.middleware');
const { permitir } = require('../middleware/roles.middleware');

const router = Router();

router.get('/productos', menuController.listarProductos);
router.get('/productos/:id', menuController.detalleProducto);
router.post('/productos', autenticar, permitir('negocio'), menuController.crearProducto);
router.put('/productos/:id', autenticar, permitir('negocio'), menuController.actualizarProducto);
router.delete('/productos/:id', autenticar, permitir('negocio'), menuController.eliminarProducto);

router.get('/negocios', menuController.listarNegocios);
router.get('/negocios/:id', menuController.detalleNegocio);

router.get('/pabellones', menuController.listarPabellones);

router.post('/resenas', autenticar, permitir('estudiante'), menuController.crearResena);
router.get('/resenas/pedido/:id', menuController.verResena);

module.exports = router;
