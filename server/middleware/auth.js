const jwt = require('jsonwebtoken');

const getAuthToken = (req) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice(7);
};

const requireAuth = (req, res, next) => {
  const token = getAuthToken(req);

  if (!token) {
    res.status(401).json({ message: 'Missing authorization token.' });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'clinic-dev-secret');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

const requireRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    res.status(403).json({ message: 'You are not allowed to perform this action.' });
    return;
  }

  next();
};

module.exports = {
  requireAuth,
  requireRoles,
};
