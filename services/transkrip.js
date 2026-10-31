require('dotenv').config();
const express = require('express');
const db = require('../db');
const { serviceAuth } = require('./shared');
const app = express();
app.use(express.json());
app.use(serviceAuth);
app.get('/transkrip/:nim', (req, res) => {
  const student = db.prepare('SELECT id,nim,name FROM users WHERE nim=? AND role=\'mahasiswa\'').get(req.params.nim);
  if (!student) return res.status(404).json({ error: 'mahasiswa tidak ditemukan' });
  const grades = db.prepare('SELECT c.code,c.name,g.value,g.final FROM grades g JOIN classes c ON c.id=g.class_id WHERE g.student_id=? AND g.final=1').all(student.id);
  res.json({ student, grades });
});
app.post('/transkrip/sinkron', (req, res) => {
  if (req.identity.role !== 'service') return res.status(403).json({ error: 'hanya token service' });
  res.json({ message: 'data transkrip tersinkron', classId: req.body.classId });
});
app.listen(process.env.TRANSKRIP_PORT || 3002, () => console.log('Service Transkrip berjalan di port 3002'));
