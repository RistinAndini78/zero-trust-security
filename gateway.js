require('dotenv').config();
const express = require('express');
const { credentials, signAccess, signService, verifyToken, deviceRegistered, createRefresh, refreshUser, revokeRefresh, validServiceCredentials } = require('./auth');
const audit = require('./audit');
const { authorize } = require('./policy');
const { GATEWAY_SECRET } = require('./services/shared');
const app = express();
app.use(express.json());
const targets = { nilai: 'http://localhost:3001', transkrip: 'http://localhost:3002' };

function bearer(req) {
  const value = req.get('Authorization') || '';
  if (!value.startsWith('Bearer ')) return null;
  try { return verifyToken(value.slice(7)); } catch { return null; }
}
app.post('/auth/login', (req, res) => {
  const device = req.get('X-Device-ID');
  const user = credentials(req.body.username, req.body.password);
  if (!user || !device || !deviceRegistered(user.id, device)) {
    audit(user ? String(user.id) : 'anonymous', req.path, device, 'deny', 'kredensial atau device tidak valid');
    return res.status(401).json({ error: 'kredensial atau device tidak valid' });
  }
  const accessToken = signAccess(user); const refreshToken = createRefresh(user.id);
  audit(String(user.id), req.path, device, 'allow', 'login berhasil');
  res.json({ accessToken, refreshToken, expiresIn: '10m', user: { username: user.username, role: user.role, nim: user.nim } });
});
app.post('/auth/refresh', (req, res) => {
  const user = refreshUser(req.body.refreshToken);
  if (!user) return res.status(401).json({ error: 'refresh token tidak valid, kedaluwarsa, atau sudah dicabut' });
  res.json({ accessToken: signAccess(user), expiresIn: '10m' });
});
app.post('/auth/logout', (req, res) => {
  if (!revokeRefresh(req.body.refreshToken)) return res.status(404).json({ error: 'refresh token tidak ditemukan' });
  res.json({ message: 'logout berhasil' });
});
app.post('/auth/service', (req, res) => {
  if (!validServiceCredentials(req.body.clientId, req.body.clientSecret)) return res.status(401).json({ error: 'client ID atau secret salah' });
  res.json({ accessToken: signService(), expiresIn: '5m' });
});

app.use(async (req, res) => {
  const payload = bearer(req);
  const isServiceAuth = payload && payload.role === 'service';
  const targetName = req.path.startsWith('/nilai') || req.path.startsWith('/kelas') ? 'nilai' : req.path.startsWith('/transkrip') ? 'transkrip' : null;
  if (!targetName) return res.status(404).json({ error: 'endpoint tidak ditemukan' });
  if (req.path === '/transkrip/sinkron' && !isServiceAuth) {
    audit(payload?.sub, req.path, req.get('X-Device-ID'), 'deny', 'sinkronisasi hanya untuk token service');
    return res.status(403).json({ error: 'sinkronisasi hanya untuk token service' });
  }
  const decision = isServiceAuth ? { allow: true, reason: 'token service valid' } : authorize(req.method, req.path, payload, req.get('X-Device-ID'));
  audit(payload?.sub, req.path, req.get('X-Device-ID'), decision.allow ? 'allow' : 'deny', decision.reason || 'policy mengizinkan');
  if (!decision.allow) return res.status(403).json({ error: decision.reason });
  const upstream = await fetch(`${targets[targetName]}${req.path}`, {
    method: req.method,
    headers: { 'Content-Type': 'application/json', Authorization: req.get('Authorization') || '', 'X-Gateway-Secret': GATEWAY_SECRET },
    body: ['GET','HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body || {})
  });
  const body = await upstream.text();
  res.status(upstream.status).type(upstream.headers.get('content-type') || 'application/json').send(body);
});
app.listen(process.env.PORT || 3000, () => console.log('API Gateway berjalan di port 3000'));
