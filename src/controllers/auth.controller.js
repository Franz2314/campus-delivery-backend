const bcrypt = require('bcryptjs');
const usuarioModel = require('../models/usuario.model');
const { generarToken } = require('../middleware/auth.middleware');

const UTP_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@utp\.edu\.pe$/;

const authController = {
  async registro(req, res) {
    try {
      const { nombre, email, password, rol, telefono } = req.body;

      if (!nombre || !email || !password || !rol) {
        return res.status(400).json({ error: 'Faltan campos requeridos: nombre, email, password, rol' });
      }

      const cleanEmail = email.trim().toLowerCase();
      if (!UTP_EMAIL_REGEX.test(cleanEmail)) {
        return res.status(400).json({ error: 'El correo debe ser institucional @utp.edu.pe' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
      }

      if (!['estudiante', 'repartidor', 'negocio'].includes(rol)) {
        return res.status(400).json({ error: 'Rol inválido. Debe ser: estudiante, repartidor o negocio' });
      }

      const existente = await usuarioModel.findByEmail(cleanEmail);
      if (existente) {
        return res.status(409).json({ error: 'El correo ya está registrado' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const usuario = await usuarioModel.create({
        nombre: nombre.trim(),
        email: cleanEmail,
        password: hashedPassword,
        rol,
        telefono: telefono?.trim(),
      });

      // Si el rol es negocio, crear registro en tabla negocios
      if (rol === 'negocio') {
        const { query } = require('../db/connection');
        await query(
          'INSERT INTO negocios (usuario_id, nombre) VALUES ($1, $2)',
          [usuario.id, nombre.trim()],
        );
      }

      const token = generarToken(usuario);
      res.status(201).json({
        token,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          telefono: usuario.telefono,
          rol: usuario.rol,
        },
      });
    } catch (err) {
      console.error('[auth/registro]', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Correo y contraseña requeridos' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const usuario = await usuarioModel.findByEmail(cleanEmail);
      if (!usuario) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      if (!usuario.activo) {
        return res.status(401).json({ error: 'Cuenta desactivada. Contacta al administrador.' });
      }

      const passwordValida = await bcrypt.compare(password, usuario.password);
      if (!passwordValida) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const token = generarToken(usuario);
      res.json({
        token,
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email,
          telefono: usuario.telefono,
          rol: usuario.rol,
        },
      });
    } catch (err) {
      console.error('[auth/login]', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },

  async perfil(req, res) {
    try {
      const usuario = await usuarioModel.findById(req.usuario.id);
      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }
      res.json(usuario);
    } catch (err) {
      console.error('[auth/perfil]', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  },
};

module.exports = authController;
