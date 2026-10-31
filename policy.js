const db = require('./db');
const { deviceRegistered } = require('./auth');

function accessWindow() {
  const start = process.env.ACCESS_START || '07:00';
  const end = process.env.ACCESS_END || '21:00';
  const now = new Date();
  const current = now.getHours() * 60 + now.getMinutes();
  const parse = (value) => { const [h, m] = value.split(':').map(Number); return h * 60 + m; };
  return current >= parse(start) && current < parse(end);
}

function userFromPayload(payload) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(Number(payload.sub));
}

function authorize(method, pathname, payload, device) {
  if (!payload) return { allow: false, reason: 'access token tidak valid atau tidak ada' };
  if (payload.role === 'service') return { allow: false, reason: 'token service hanya untuk panggilan internal' };
  const user = userFromPayload(payload);
  if (!user || !device || !deviceRegistered(user.id, device)) return { allow: false, reason: 'device belum terdaftar untuk user' };
  if (method === 'GET' && pathname === '/nilai') return { allow: false, reason: 'endpoint nilai hanya untuk Service Nilai' };
  if (method === 'PUT' && pathname.startsWith('/nilai/')) {
    const id = Number(pathname.split('/').pop());
    const grade = db.prepare('SELECT g.*, c.lecturer_id FROM grades g JOIN classes c ON c.id=g.class_id WHERE g.id=?').get(id);
    if (!grade) return { allow: false, reason: 'nilai tidak ditemukan' };
    if (user.role === 'mahasiswa') return grade.student_id === user.id ? { allow: true } : { allow: false, reason: 'mahasiswa hanya boleh mengubah nilainya sendiri' };
    if (user.role === 'dosen' && grade.lecturer_id === user.id && !grade.final && accessWindow()) return { allow: true };
    return { allow: false, reason: 'dosen bukan pengampu, nilai final, atau di luar jam akses' };
  }
  if (method === 'POST' && pathname.startsWith('/kelas/') && pathname.endsWith('/finalisasi')) {
    const classId = Number(pathname.split('/')[2]);
    const klass = db.prepare('SELECT * FROM classes WHERE id=?').get(classId);
    if (user.role === 'dosen' && klass && klass.lecturer_id === user.id && accessWindow()) return { allow: true };
    return { allow: false, reason: 'hanya dosen pengampu pada jam akses yang dapat finalisasi' };
  }
  if (method === 'GET' && pathname.startsWith('/transkrip/')) {
    const nim = pathname.split('/').pop();
    if (user.role === 'admin') return { allow: true };
    return user.role === 'mahasiswa' && user.nim === nim ? { allow: true } : { allow: false, reason: 'mahasiswa hanya boleh melihat transkrip sendiri' };
  }
  return { allow: false, reason: 'kebijakan tidak mengizinkan endpoint ini' };
}
module.exports = { authorize, accessWindow };
