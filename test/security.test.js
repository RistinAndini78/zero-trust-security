const test = require('node:test');
const assert = require('node:assert/strict');

process.env.ACCESS_START = '00:00';
process.env.ACCESS_END = '23:59';
const { signAccess, verifyToken, deviceRegistered, createRefresh, refreshUser, revokeRefresh } = require('../auth');
const { authorize } = require('../policy');
const db = require('../db');

test('access token memuat subject dan role', () => {
  const token = signAccess({ id: 4, role: 'mahasiswa', username: 'mhs1', nim: '247006111024' });
  const payload = verifyToken(token);
  assert.equal(payload.sub, '4');
  assert.equal(payload.role, 'mahasiswa');
});

test('device hanya valid untuk user yang terdaftar', () => {
  assert.equal(deviceRegistered(4, 'device-mhs1'), true);
  assert.equal(deviceRegistered(4, 'device-mhs2'), false);
});

test('policy menolak mahasiswa melihat transkrip mahasiswa lain', () => {
  const decision = authorize('GET', '/transkrip/237001002', { sub: '4', role: 'mahasiswa' }, 'device-mhs1');
  assert.equal(decision.allow, false);
});

test('refresh token dapat dicabut', () => {
  const token = createRefresh(4);
  assert.equal(refreshUser(token).id, 4);
  assert.equal(revokeRefresh(token), true);
  assert.equal(refreshUser(token), undefined);
});

test('database memiliki seed minimal sesuai tugas', () => {
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='admin'").get().n >= 1, true);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='dosen'").get().n >= 2, true);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM users WHERE role='mahasiswa'").get().n >= 3, true);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM classes').get().n >= 2, true);
});
