function permitir(...roles) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Autenticación requerida' });
    }
    if (!roles.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: `Acción no permitida para rol '${req.usuario.rol}'. Requiere: ${roles.join(', ')}`,
      });
    }
    next();
  };
}

module.exports = { permitir };
