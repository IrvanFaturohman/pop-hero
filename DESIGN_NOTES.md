# DESIGN NOTES — Pop Hero (prototype)

## 0b. Ringkasan desain sekarang (2026-10-08)

Satu giliran: tiup ≤3 balon di ruang Puff Up (duri hanya berbahaya saat meniup) → balon mendorong rantai, nilainya masuk ke gembok → gembok terpenuhi = rantai putus, balon lolos & pecah jadi peluru → hero menembak (Claw Master) → semua musuh menyerang → giliran berikutnya. Antar gelombang: kartu upgrade. Gelombang 2+: balon spesial. Setelah gelombang 5: boss.

Ruang balon terbuka di atas (tanpa tembok atas, seperti referensi): rantai dipasang di atas dinding samping dan jadi satu-satunya penahan balon.

Peluru: sisa peluru terbawa antar giliran dalam satu wave (seperti Claw Master). Saat wave selesai, sisanya ditukar jadi HP (4 peluru = 1 HP) dan peluru kembali ke 0, jadi tidak menumpuk antar wave dan gagal gembok tetap terasa.

Angka utama (semua di `config.ts` / `levels.ts`): gembok 30/40/50/55/60, boss 65; musuh per giliran 4/5/6/8/8; duri 200–230 px/s; HP hero 150; musuh HP 12/6/50 (boss 600), damage per serangan 4/3/8 (slam 15); 3 balon per giliran.

**Pertanyaan terbuka**:
1. ~~Duri terlalu gampang?~~ Kamu: "lebih cepat aja" → duri ~1.5× lebih cepat (M5.1). Catatan: bot uji bereaksi tiap frame (lepas begitu duri dekat) jadi tetap jarang meletus; perlu dirasakan langsung di HP. Kalau masih gampang, opsi berikutnya: lebih banyak bola, bola lebih besar, atau duri yang mengejar.
2. Kartu *Rapid Fire* diganti *Critical Shot* (dari daftar ability Claw Master) karena kecepatan volley tidak berarti di sistem giliran. Oke?
3. Es di versi giliran = musuh beku melewatkan 1 serangan (brief: lambat 30% selama 2 detik). Oke, atau terlalu kuat?

## 0a. Aturan utama: referensi > brief (2026-10-08, kamu)

Kalau brief dan video berbeda, **ikuti video** (gameplay dan art). Akibatnya:
- Battle **horizontal & bergantian** seperti Claw Master (brief: vertikal real-time). Detail alur di CHANGELOG M2.1 dan `src/logic/turns.ts`.
- Art mengikuti gaya referensi (hutan toska, jalan tanah, prajurit, hewan musuh; ruang abu-abu-cyan, balon pink, duri merah), tapi digambar sendiri, tidak menyalin aset/karakter.
- Angka per giliran (bukan per detik): langkah musuh (Grunt 120 px, Runner 200, Tank 80), damage per serangan (8 / 6 / 16), musuh masuk per giliran (`perTurn` di `levels.ts`), hero menembakkan semua peluru dalam satu volley (8–30 tembakan/s).

## 0. Perubahan desain dari playtest (2026-10-08, permintaan kamu)

Perubahan ini **menggantikan** bagian brief yang bertentangan (§4.1 pompa & pipa, §4.5 spinner/orbiter, §5.1 tabel pola, §8.1 juice pipa):

1. **Balon muncul & membesar di tempat jari menekan** (di dalam ruang balon), bukan di pompa. Pompa dihapus. **Selama ditahan, balon bisa digeser** mengikuti jari (sedikit halus, `balloon.dragFollow`), terdorong dari dinding saat membesar. Tap di arena atas tidak meniup balon.
3. **Tidak ada pipa.** Saat dilepas balon terbang **lurus ke atas**, lalu **pecah begitu menyentuh langit-langit ruang**. Amunisinya keluar sebagai **peluru** yang melesat ke atas (kipas) lalu melengkung masuk ke angka amunisi hero. Bunyi `tube_fwoop` dihapus karena tidak ada pipa lagi.
2. **Spike = bola berduri yang memantul-mantul di dinding ruang** (gerak lurus, pantulan sempurna), bukan spinner berputar. Kode spinner/orbiter tetap ada sebagai jenis pola opsional, tapi semua gelombang sekarang pakai bola pantul.

Akibatnya:
- **Validator** sekarang merata-rata 9 titik tap × 24 fase (jendela 12 s, karena bola pantul tidak pernah berulang persis). Validator tidak menggeser balon, jadi angkanya lebih pesimis lagi daripada permainan sungguhan.
- **Batas "balon kecil aman" diturunkan** dari 90%/70% ke **60%/40%**. Dengan bola pantul dan rilis "buta", balon kecil pun bisa tertabrak bola yang lewat, jadi kurva aman→bahaya lebih landai daripada spinner. Pemain sungguhan yang memilih tempat dan waktu rilis akan jauh lebih selamat daripada angka ini.
- **Pola baru** (jumlah bola × kecepatan px/s; % selamat di air 0.3/0.5/0.7/0.9):

| Pola | Bola | % selamat |
|---|---|---|
| Gelombang 1 | 2 × 130 | 76/65/56/48 |
| Gelombang 2 | 3 × 110 | 68/62/49/38 |
| Gelombang 3 | 3 × 140 | 64/52/43/31 |
| Gelombang 4 | 4 × 140 | 53/42/30/17 |
| Gelombang 5 | 5 × 150 | 47/33/19/12 |
| Boss fase 1 | 3 × 140 | 64/52/43/31 |
| Boss fase 2 | 5 × 162 (130 × 1.25) | 44/31/19/10 |

- Bagian di bawah ini yang menyebut nozzle, spinner, atau tabel lama ditulis sebelum perubahan ini (riwayat).

4. **Pengali tinggi** (menutup celah "tiup mepet langit-langit = aman"): peluru × (1 → 2) sesuai seberapa jauh balon akan terbang; dihitung relatif terhadap ruang yang bisa dipakai ukuran balon itu, dikunci saat dilepas, tampil live sebagai "×1.6" di bawah balon. Balon baru kebal 0.15 s (`balloon.spawnGrace`) supaya tap tepat di atas bola tidak terasa curang.
5. **HP musuh ×2** dari brief (lihat CHANGELOG M2): pengali menggandakan suplai amunisi; dengan HP brief bot playtest menyelesaikan semua gelombang tanpa satu musuh pun sampai ke garis.

**Pertanyaan terkait**: (a) Balon yang ditap tepat di atas bola langsung meletus (kecuali 2 balon tutorial). Oke, atau mau diberi jeda kebal singkat? (b) Balon yang ditiup/digeser dekat langit-langit langsung pecah begitu dilepas (jalur terbang hampir nol = paling aman). Mau dibatasi, atau biarkan sebagai strategi?

## 1. Core loop (10 baris)

1. Tahan jari di mana saja → balon di pompa mengembang, angka amunisi di balon naik (cembung: makin besar makin untung).
2. Balon besar = lebih banyak peluru, tapi lebih lebar (lebih gampang kena spike) dan naik lebih lambat (lebih lama terekspos).
3. Spike berputar dari **samping** jalur, jadi ujungnya mendekat-menjauh → ada "jendela aman" yang harus dibaca.
4. Lepas jari = balon naik; momen lepas adalah keputusan timing utama (menunggu celah lengan spike).
5. Nyaris kena (CLOSE!) dan lepas di ≥ 0.9 (PERFECT!) memberi bonus kecil → keberanian dihadiahi.
6. Terlalu serakah → overinflate (meletus sendiri) atau kena spike → amunisi balon itu hilang, jeda 0.8 s.
7. Balon yang selamat masuk pipa, meletus di belakang hero, token amunisi terbang ke angka amunisi hero.
8. Hero menembak otomatis selama ada amunisi; tanpa amunisi, musuh mendekat (M2).
9. Antar gelombang pilih 1 dari 3 kartu (M3) yang mengubah rumus balon/battle.
10. Ketegangan inti: **serakah vs aman**, dibayar dengan timing, bukan keberuntungan.

## 2. Yang saya pelajari dari video referensi

Frame diekstrak ke `references/frames/` (2 fps, 540 px).

**Puff Up (Voodoo)**
- Angka di tengah balon besar dan tebal, skala mengikuti radius. Kulit balon jelas makin **terang/pucat** saat membesar (ungu pekat → pink muda) — sinyal visual "menipis" yang kuat. Sudah ditiru lewat overlay putih + alpha.
- Spike = bintang merah kecil berduri dengan **jejak gerak**; sangat terbaca karena merah di atas latar abu-abu. Di game kita latarnya ungu tua → spike hitam + outline putih + ujung merah, kontrasnya kuat.
- Balon tumbuh sampai hampir memenuhi lebar kolom → ruang untuk serakah memang besar.
- Koin terbang melengkung ke penghitung di HUD, ada "+N" melayang. Ada teks pujian ("awesome") saat rilis bagus.
- Tutorial cukup satu pill di bawah: ikon tangan + "Hold down to puff up balloons!", hilang begitu pemain mulai.

**Claw Master (Azur)**
- Layar terbelah: atas strip battle, bawah mesin. Aliran resource **selalu ke atas** (bola dilempar melengkung dari mesin ke hero) — ini yang membuat dua bagian terasa satu sistem.
- Saat mesin bawah idle, kamera **zoom ke battle** (panel bawah mengecil). Menarik, tapi tidak ada di dokumen → masuk "Ide".
- Pilih skill: overlay gelap, 3 kartu tinggi (ikon, nama, deskripsi singkat, tombol). Battle di-pause.
- Musuh berkedip putih saat kena, angka damage kecil, mati jadi "poof" putih. HP hero berupa bar kecil di bawah hero.

**Perbedaan video vs dokumen (dokumen yang menang)**
- Claw Master battle-nya horizontal (hero kiri, musuh dari kanan); dokumen: musuh jalan **turun** ke hero. Ikut dokumen.
- Puff Up spike bergerak lurus/memantul; dokumen: spinner & orbiter berputar. Ikut dokumen.
- Puff Up balon tidak terbang lewat pipa; dokumen: pompa di bawah → naik → pipa → hero. Ikut dokumen.
- Tidak ada aset, nama, logo, atau UI yang ditiru; semua grafis digambar dengan kode.

## 3. Asumsi & interpretasi (dipilih yang paling masuk akal)

1. **rMin tidak pernah kena** diartikan: balon rMin yang **diam di nozzle** tidak pernah kena spike apa pun pada fase apa pun (ada unit test). Balon rMin yang *terbang* tetap bisa kena orbiter yang melintasi jalur tengah — dokumen sendiri menyebut orbiter menuntut timing untuk semua ukuran.
2. **CLOSE!** diukur dari **tepi visual** balon ke permukaan hitbox spike (< 10 px), dan baru diberikan saat balon **keluar** dari zona itu tanpa meletus (jadi "nyaris" harus benar-benar selamat). Maks 1× per balon. Bonus = `ceil(10% × ammo)`, minimal +1.
3. **PERFECT!** dihitung dari ammo dasar, diberikan saat tiba. Tier dihitung dari angka yang tampil (termasuk bonus CLOSE!).
4. **Setelah meletus saat jari masih ditahan**, balon berikutnya tidak langsung ditiup — jari harus diangkat dulu (`spawn.requireFreshPressAfterPop`, bisa dimatikan). Alasan: setelah overinflate pemain pasti masih menahan; kalau balon berikutnya langsung ikut ditiup terasa kehilangan kontrol. Input buffering saat cooldown/spawn tetap jalan sesuai dokumen.
5. **Amunisi masuk ke hero per token** (saat tiap token mendarat, timing deterministik di logika), bukan sekaligus. Jadi angka tidak pernah menunjukkan amunisi yang belum terlihat sampai, dan hero baru menembak saat token pertama tiba.
6. **Ganti pola spike** menunggu: tidak ada balon yang sedang ditiup **dan** tidak ada balon terbang yang masih di ruang bawah (supaya spike yang sedang muncul tidak bisa mengenai balon yang sudah dilepas). Spawn balon berikutnya ditahan sebentar kalau perlu.
7. **Balon tutorial** (2 pertama di run pertama) juga kebal overinflate. Spike yang menembus memberi efek "WHEW!" + bunyi near-miss, tanpa bonus. Di M1 flag tutorial disimpan begitu 2 balon itu terpakai (M4: setelah run pertama selesai).
8. **Arah wave 5** tidak disebut → searah jarum jam (ω positif).
9. **Boss fase 2**: `speedMult 1.25` berlaku untuk semua spike di pola itu, jadi orbiter ditulis ω=60 → efektif 75°/s. Lalu diturunkan (lihat §4).
10. **Hitbox spike**: bola berduri digambar inti r=15, duri sampai r=25, hitbox r=18 (tengah duri). Lengan 10 px (hitbox), duri merah kecil di lengan hanya visual.
11. **Pipa** pendek (y 586–674) sesuai layout. Balon besar dipencet lebih dari 0.55 (lebar maks 1.6× lebar pipa, `balloon.pipeMaxBulge`), kalau tidak pipa berubah jadi kotak. Balon meletus saat pusatnya lewat y=566 (tepat di belakang hero).
12. **Hold di mana saja**, kecuali pojok kiri atas 100×100 (hotspot debug 3× tap) dan tombol pause. Di desktop, **Space** = tahan.
13. **Resolusi render** = ukuran CSS × min(DPR, 2); logika tetap 720×1280 lewat zoom kamera.
14. **Arena M1**: hero menembak target latihan dengan amunisi yang sampai, supaya aliran "balon → amunisi → peluru ke atas" sudah terasa. Diganti musuh di M2.
15. **Validator**: "satu periode" = **periode gabungan** semua spike di pola (kelipatan terkecil, maks 12×), bukan periode spike terlama. Pola dengan orbiter + spinner baru benar-benar berulang setelah 14–18 s; sampling 24 fase hanya di periode orbiter (4.8–6 s) tidak menutup semua kombinasi fase.

## 4. Perubahan angka

| Pola | Dokumen | Sekarang | Alasan |
|---|---|---|---|
| Boss fase 2 orbiter | 75°/s efektif | **67.5°/s** (ω 54 × 1.25) | air 0.9 hanya 4% selamat (1 dari 24 fase; dengan 240 fase 5%, tepat di batas) → tidak lolos syarat ≥ 5% dengan stabil. Dengan 67.5°/s: 8% (240 fase: 9%). |

Tidak ada pola lain yang diubah.

**Hasil validator** (24 fase, hitbox 0.92, sway 6 px saat terbang). Dokumen dalam kurung:

| Pola | air 0.3 | 0.5 | 0.7 | 0.9 |
|---|---|---|---|---|
| Gelombang 1 | 100% (100) | 63% (60) | 42% (40) | 21% (27) |
| Gelombang 2 | 92% (100) | 54% (55) | 33% (33) | 17% (12) |
| Gelombang 3 | 100% (100) | 54% (63) | 33% (40) | 17% (18) |
| Gelombang 4 | 88% (77) | 42% (35) | 21% (20) | 8% (5) |
| Gelombang 5 | 100% (100) | 63% (53) | 38% (40) | 21% (13) |
| Boss fase 1 | 100% | 54% | 33% | 17% |
| Boss fase 2 | 75% (75) | 38% (38) | 25% (17) | 8% (5) |

Gelombang 2 air 0.3 = 92% (bukan 100%): L=135 → jangkauan bola sampai x≈303, balon 0.3 yang bergoyang ±6 px saat naik bisa tersentuh. Masih lolos syarat ≥ 90%.

## 5. Pertanyaan untuk kamu

1. **Risiko saat meniup di gelombang 1–3 hampir nol.** Spinner di x=150, L=130 tidak bisa menjangkau balon yang menempel di nozzle sampai air ≈ 1.0; bahayanya hanya saat terbang. Saat meniup, lengan hanya lewat dekat (glow merah, CLOSE!). Ini cocok dengan tabel §5.1, tapi kalau kamu mau ada ancaman saat meniup juga, poros perlu turun (y ≈ 960–1000) atau lengan lebih panjang.
2. Boss fase 2 orbiter 67.5°/s (bukan 75°/s) — oke?
3. Tap super cepat **saat animasi spawn** (tekan + lepas sebelum balon siap) sekarang diabaikan. Mau diubah jadi meluncurkan balon kecil?
4. Jendela PERFECT: air 0.9 di ~2.0 s, overinflate di ~2.2 s + 0.5 s tegang → jendela ≈ 0.7 s. Terasa terlalu longgar/ketat?
5. Target latihan di arena M1 (hero menembak amunisi) — oke sebagai stand-in sampai M2?

## 6. Ide (belum dikerjakan, perlu persetujuan)

- Kamera zoom ke battle saat ruang balon idle (seperti Claw Master).
- Teks pujian bertingkat saat rilis bagus ("NICE / GREAT / AWESOME") selain PERFECT!.
- Garis jangkauan samar untuk spinner (busur tipis) supaya pemain baru lebih cepat membaca bahaya.
- Haptic tick halus per ammo di Android (mungkin terlalu ramai).

## 7. Target tuning (bandingkan dengan playtest)

- Rata-rata `air` saat dilepas ≈ 0.6–0.7.
- 20–30% balon meletus untuk pemain rata-rata.
- Run pertama pemain baru biasanya kalah di gelombang 4–5 atau boss.
- Satu run 3–5 menit.

Telemetry lengkap (layar Result + COPY STATS) dibuat di M5; data dasarnya sudah dikumpulkan di `BalloonRoom.stats`.
