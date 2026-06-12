const { Router } = require('express');
const authController = require('../controllers/auth.controller');
const { autenticar } = require('../middleware/auth.middleware');

const router = Router();

router.post('/registro', authController.registro);
router.post('/login', authController.login);
router.get('/perfil', autenticar, authController.perfil);

module.exports = router;
