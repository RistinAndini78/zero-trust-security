const jwt = require('jsonwebtoken');
const crypto = require('node:crypto');
const db = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'development-jwt-secret';
const SERVICE_CLIENT_ID = process.env.SERVICE_CLIENT_ID || 'nilai-service';
const SERVICE_CLIENT_SECRET = process.env.SERVICE_CLIENT_SECRET || 'development-service-secret';

function signAccess(user) {
  return jwt.sign({ sub: String(user.id), role: user.role, username: user.username, nim: user.nim || undefined }, JWT_SECRET, { expiresIn: '10m' });
}
function signService() {
  return jwt.sign({ sub: SERVICE_CLIENT_ID, role: 'service' }, JWT_SECRET, { expiresIn: '5m' });
}
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}
function credentials(username, password) {
  return db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
}
function deviceRegistered(userId, deviceId) {
  return Boolean(db.prepare('SELECT 1 FROM devices WHERE user_id = ? AND device_id = ?').get(userId, deviceId));
}
function createRefresh(userId) {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO refresh_tokens (token,user_id,expires_at) VALUES (?,?,?)').run(token, userId, Date.now() + 86400000);
  return token;
}
function refreshUser(token) {
  const row = db.prepare('SELECT * FROM refresh_tokens WHERE token = ? AND revoked = 0 AND expires_at > ?').get(token, Date.now());
  return row && db.prepare('SELECT * FROM users WHERE id = ?').get(row.user_id);
}
function revokeRefresh(token) {
  return db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE token = ?').run(token).changes > 0;
}
function validServiceCredentials(id, secret) {
  return id === SERVICE_CLIENT_ID && secret === SERVICE_CLIENT_SECRET;
}
module.exports = { JWT_SECRET, signAccess, signService, verifyToken, credentials, deviceRegistered, createRefresh, refreshUser, revokeRefresh, validServiceCredentials };
