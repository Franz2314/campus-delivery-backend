const { Router } = require('express');
const puntosController = require('../controllers/puntos.controller');
const { autenticar } = require('../middleware/auth.middleware');
const { permitir } = require('../middleware/roles.middleware');

const router = Router();

router.get('/saldo', autenticar, permitir('estudiante'), puntosController.getSaldo);
router.get('/historial', autenticar, permitir('estudiante'), puntosController.getHistorial);
router.get('/recompensas', autenticar, permitir('estudiante'), puntosController.getRecompensas);
router.post('/canjear', autenticar, permitir('estudiante'), puntosController.canjear);
router.get('/canjes', autenticar, permitir('estudiante'), puntosController.getMisCanjes);

module.exports = router;
