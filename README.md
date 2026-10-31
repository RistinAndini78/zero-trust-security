# Sistem Nilai - Zero Trust

Implementasi tugas praktikum Zero Trust dengan API Gateway sebagai Policy Enforcement Point.

## Menjalankan

```powershell
npm install
Copy-Item .env.example .env
npm start
```

Gateway ada di `http://localhost:3000`, Service Nilai di port 3001, dan Service Transkrip di port 3002. Service harus tetap dijalankan melalui gateway; request langsung akan ditolak oleh `X-Gateway-Secret`.

## Akun seed

| Username | Password | Role | Device ID |
|---|---|---|---|
| admin | admin123 | admin | device-admin |
| dosen1 | dosen123 | dosen, pengampu IF401 | device-dosen1 |
| dosen2 | dosen123 | dosen, pengampu IF402 | device-dosen2 |
| mhs1 | mhs123 | mahasiswa, NIM 247006111024, Ristin Iman Andini | device-mhs1 |
| mhs2 | mhs123 | mahasiswa, NIM 237001002 | device-mhs2 |
| mhs3 | mhs123 | mahasiswa, NIM 237001003 | device-mhs3 |

## Contoh curl

Login dan simpan token:

```powershell
$login = Invoke-RestMethod -Method Post http://localhost:3000/auth/login `
  -Headers @{'X-Device-ID'='device-dosen1'} `
  -ContentType 'application/json' -Body '{"username":"dosen1","password":"dosen123"}'
$h = @{ Authorization = "Bearer $($login.accessToken)"; 'X-Device-ID' = 'device-dosen1' }
Invoke-RestMethod -Method Put http://localhost:3000/nilai/1 -Headers $h `
  -ContentType 'application/json' -Body '{"value":"A"}'
Invoke-RestMethod -Method Post http://localhost:3000/kelas/1/finalisasi -Headers $h
```

Untuk transkrip, login sebagai mahasiswa lalu panggil `GET /transkrip/237001003`. Admin dapat melihat NIM mana pun. `GET /nilai` hanya dapat dipanggil setelah memperoleh token service dari `POST /auth/service` dengan client ID `nilai-service` dan secret dari `.env`.

Audit keputusan akses tersimpan di tabel `audit_logs` pada `data.sqlite`. Jam perubahan/finalisasi dapat didemokan dengan mengubah `ACCESS_START` dan `ACCESS_END` di `.env`.

## Pengujian dan audit

Jalankan pengujian otomatis:

```powershell
npm test
```

Tampilkan audit log terbaru:

```powershell
node -e "const db=require('./db'); console.table(db.prepare('SELECT at,subject,endpoint,device,result,reason FROM audit_logs ORDER BY id DESC LIMIT 20').all())"
```

## Alur video demo 6-9 menit

1. Tunjukkan arsitektur tiga proses dan file `gateway.js`, `policy.js`, serta `services/shared.js`.
2. Login `mhs1` memakai `device-mhs1`, lalu panggil transkrip melalui gateway.
3. Ulangi dengan device salah dan tunjukkan respons `401`.
4. Coba transkrip NIM mahasiswa lain dan tunjukkan respons `403`.
5. Login `dosen1`, ubah nilai kelas IF401, lalu finalisasi. Tunjukkan pesan sinkronisasi transkrip.
6. Coba akses langsung `http://localhost:3001/nilai` tanpa gateway dan tunjukkan respons `403`.
7. Minta token melalui `/auth/service`, panggil `GET /nilai`, lalu jelaskan role `service`.
8. Jalankan query audit log dan jelaskan catatan allow/deny, endpoint, device, serta alasan.

Panduan lengkap demonstrasi menggunakan Postman tersedia di
[DEMO-POSTMAN.md](./DEMO-POSTMAN.md), termasuk environment, header, body,
expected response, dan teks narasi video.
