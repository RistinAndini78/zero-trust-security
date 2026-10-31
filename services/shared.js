const { verifyToken } = require('../auth');
const GATEWAY_SECRET = process.env.GATEWAY_SECRET || 'development-gateway-secret';

function serviceAuth(req, res, next) {
  if (req.get('X-Gateway-Secret') !== GATEWAY_SECRET) return res.status(403).json({ error: 'request harus melalui gateway' });
  const header = req.get('Authorization') || '';
  if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'token wajib ada' });
  try {
    req.identity = verifyToken(header.slice(7));
    next();
  } catch {
    return res.status(401).json({ error: 'token tidak valid atau kedaluwarsa' });
  }
}
module.exports = { serviceAuth, GATEWAY_SECRET };
