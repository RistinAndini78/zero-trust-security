require('dotenv').config();
const express = require('express');
const db = require('../db');
const { serviceAuth } = require('./shared');
const app = express();
app.use(express.json());
app.use(serviceAuth);

app.get('/nilai', (req, res) => {
  if (req.identity.role !== 'service') return res.status(403).json({ error: 'endpoint hanya untuk token service' });
  res.json(db.prepare('SELECT g.id,c.code AS class_code,c.name AS class_name,u.nim,u.name AS student,g.value,g.final FROM grades g JOIN classes c ON c.id=g.class_id JOIN users u ON u.id=g.student_id').all());
});

app.put('/nilai/:id', (req, res) => {
  const grade = db.prepare('SELECT * FROM grades WHERE id=?').get(req.params.id);
  if (!grade) return res.status(404).json({ error: 'nilai tidak ditemukan' });
  const value = String(req.body.value || '').trim();
  if (!value) return res.status(400).json({ error: 'value wajib diisi' });
  db.prepare('UPDATE grades SET value=? WHERE id=?').run(value, grade.id);
  res.json({ message: 'nilai diperbarui', id: grade.id, value });
});

app.post('/kelas/:id/finalisasi', async (req, res) => {
  if (req.identity.role !== 'dosen') return res.status(403).json({ error: 'hanya dosen yang dapat finalisasi' });
  const klass = db.prepare('SELECT * FROM classes WHERE id=?').get(req.params.id);
  if (!klass) return res.status(404).json({ error: 'kelas tidak ditemukan' });
  db.prepare('UPDATE grades SET final=1 WHERE class_id=?').run(klass.id);

  const tokenResponse = await fetch('http://localhost:3000/auth/service', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: process.env.SERVICE_CLIENT_ID || 'nilai-service',
      clientSecret: process.env.SERVICE_CLIENT_SECRET || 'development-service-secret'
    })
  });
  if (!tokenResponse.ok) return res.status(502).json({ error: 'Service Nilai gagal memperoleh token service' });
  const { accessToken } = await tokenResponse.json();
  const response = await fetch('http://localhost:3000/transkrip/sinkron', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ classId: klass.id })
  });
  if (!response.ok) return res.status(502).json({ error: 'sinkronisasi transkrip gagal' });
  res.json({ message: 'kelas difinalisasi dan transkrip disinkronkan' });
});

app.listen(process.env.NILAI_PORT || 3001, () => console.log('Service Nilai berjalan di port 3001'));
