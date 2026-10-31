const Database = require('better-sqlite3');
const path = require('node:path');

const db = new Database(path.join(__dirname, 'data.sqlite'));
db.pragma('foreign_keys = ON');
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, nim TEXT UNIQUE, name TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('mahasiswa','dosen','admin'))
  );
  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL,
    device_id TEXT NOT NULL, UNIQUE(user_id, device_id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY, code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL, lecturer_id INTEGER NOT NULL,
    FOREIGN KEY(lecturer_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY, class_id INTEGER NOT NULL,
    student_id INTEGER NOT NULL, value TEXT NOT NULL,
    final INTEGER NOT NULL DEFAULT 0,
    UNIQUE(class_id, student_id),
    FOREIGN KEY(class_id) REFERENCES classes(id),
    FOREIGN KEY(student_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS refresh_tokens (
    token TEXT PRIMARY KEY, user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY, at TEXT NOT NULL, subject TEXT NOT NULL,
    endpoint TEXT NOT NULL, device TEXT, result TEXT NOT NULL, reason TEXT NOT NULL
  );
`);

if (db.prepare('SELECT COUNT(*) AS count FROM users').get().count === 0) {
  const seed = db.transaction(() => {
    const user = db.prepare('INSERT INTO users (id,nim,name,username,password,role) VALUES (?,?,?,?,?,?)');
    user.run(1, null, 'Administrator', 'admin', 'admin123', 'admin');
    user.run(2, null, 'Dr. Sari', 'dosen1', 'dosen123', 'dosen');
    user.run(3, null, 'Dr. Budi', 'dosen2', 'dosen123', 'dosen');
    user.run(4, '247006111024', 'Ristin Iman Andini', 'mhs1', 'mhs123', 'mahasiswa');
    user.run(5, '237001002', 'Bagas Pratama', 'mhs2', 'mhs123', 'mahasiswa');
    user.run(6, '237001003', 'Citra Lestari', 'mhs3', 'mhs123', 'mahasiswa');
    const device = db.prepare('INSERT INTO devices (user_id,device_id) VALUES (?,?)');
    for (const [id, value] of [[1,'device-admin'],[2,'device-dosen1'],[3,'device-dosen2'],[4,'device-mhs1'],[5,'device-mhs2'],[6,'device-mhs3']]) device.run(id, value);
    const cls = db.prepare('INSERT INTO classes (id,code,name,lecturer_id) VALUES (?,?,?,?)');
    cls.run(1, 'IF401', 'Keamanan Informasi', 2);
    cls.run(2, 'IF402', 'Pemrograman Web', 3);
    const grade = db.prepare('INSERT INTO grades (class_id,student_id,value,final) VALUES (?,?,?,?)');
    grade.run(1, 4, 'A', 0); grade.run(1, 5, 'B+', 0); grade.run(2, 6, 'A-', 1);
  });
  seed();
}

module.exports = db;
