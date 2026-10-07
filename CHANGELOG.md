# CHANGELOG

## M5.2 — Sisa peluru jadi HP + balancing — 2026-10-08

- **Sisa peluru**: tetap terbawa antar giliran dalam satu wave (seperti Claw Master), tapi **saat wave selesai semua sisa peluru mengalir ke bar HP** (4 peluru = 1 HP, `config.leftover`), lalu peluru mulai lagi dari 0. Animasi: titik peluru melompat dari angka peluru ke bar HP, angka turun, lalu "+N HP" (atau "FULL HP"). Sebelumnya simpanan tidak pernah di-reset dan bisa menumpuk sampai ~90, sehingga gagal gembok hampir tidak berasa.
- **Balancing** (dari data bot: peluru masuk vs HP musuh di layar tiap giliran): musuh per giliran wave 3 5→6 dan wave 4 7→8 (dulu surplus); gembok wave 4 60→55, wave 5 70→60, boss 80→65 (tanpa simpanan & dengan duri lebih cepat, bot gagal gembok 60+ berturut-turut lalu kalah).
- Telemetry: `leftoverPerWave` dan `hpFromLeftover` di COPY STATS.
- Unit test baru: sisa peluru → HP (batas HP maks, pool kosong).

## M5.1 — Playtest: kartu, duri, ruang terbuka — 2026-10-08

- **Fix: kartu upgrade tidak bisa ditekan.** Area sentuh kartu tergeser (hanya pojok kiri atas kartu yang aktif, tombol PICK mati). Sekarang seluruh kartu + tombol PICK bisa ditekan (dicek dengan mouse dan touch).
- **Duri ~1.5× lebih cepat**: gelombang 1–5 = 200/180/210/220/230 px/s, boss 210 / 200×1.25. Validator tetap lolos (angka di `levels.ts`).
- **Ruang balon tanpa tembok atas** (seperti referensi): dinding cyan berbentuk U, rantai emas dipasang di baut di atas dinding samping dan jadi "tutup" ruang. Balon yang terkumpul mendorong rantai ke atas keluar ruang, lalu lolos ke atas saat putus. Layout: `ropeY` 724 → 664, `roomOpenTop` baru 648, `roomInnerTop` (batas atas rantai melengkung & balon yang dipegang) 604.
- Teks tutorial "FILL THE LOCK!" pindah ke bawah balon yang terkumpul supaya angkanya tetap terbaca.

## M5 — Telemetry, README, rilis — 2026-10-08

- Statistik per run (brief §12) di layar hasil + `console.log` JSON + **COPY STATS**: durasi, gelombang tercapai, menang/kalah + penyebab, giliran, balon ditiup/terkumpul/meletus (saat ditiup / kepenuhan), rata-rata ukuran saat dilepas + histogram 10 bucket, CLOSE!/PERFECT!, gembok terbuka/gagal, damage diterima, urutan upgrade.
- Panel debug: grup baru (hero & musuh, giliran/gembok/rantai, efek, kamera), tombol *Go to boss*.
- README: cara main, tes di HP, tuning, deploy ke itch.io.

## M4 — Layar & polish — 2026-10-08

- **Title**: logo, balon warna-warni melayang, "HOLD TO PLAY" (tahan sampai lingkaran penuh; sekaligus membuka audio).
- **Pause**: RESUME, RESTART, toggle SOUND / MUSIC / HAPTICS / REDUCED MOTION (tersimpan di perangkat). Semua tombol hanya bereaksi kalau ditekan *dan* dilepas di tombol itu.
- **Result**: STAGE CLEAR / DEFEATED + statistik + PLAY AGAIN / COPY STATS.
- **Tutorial run pertama**: tangan "HOLD" → "RELEASE!", panah "AVOID" ke duri pertama yang mendekat, "FILL THE LOCK!" di gembok; selesai setelah rantai pertama putus.
- **Musik prosedural** 100 BPM (default mati, toggle di pause).

## M3 — Roguelike & boss — 2026-10-08

- **Kartu upgrade** antar gelombang ("SELECT A NEW ABILITY", gaya referensi): 3 kartu acak berbobot kelangkaan (common/rare/epic), masuk bertahap, melayang, glow per kelangkaan; yang dipilih terbang ke hero. 11 kartu (brief; *Rapid Fire* → *Critical Shot* dari referensi karena volley giliran).
- **Balon spesial** mulai gelombang 2 (emblem di balon, antrean terlihat di ikon jatah): api (peluru membakar 1/giliran selama 3 giliran), es (musuh beku, lewat 1 serangan), bom (dilempar ke kerumunan terpadat, damage area ×1.5), heal (×0.8 HP).
- **Boss Rat King** setelah gelombang 5: jatuh dari atas, bar HP besar, slam tiap 2 giliran musuh (peringatan lingkaran merah di bawah hero saat giliranmu), panggil 3 tikus tiap 3 giliran, fase 2 di HP 50% (slam tiap giliran + pola duri boss2 + ENRAGED!), mati = hitstop + slow-mo + ledakan besar + confetti.
- **Balon warna-warni** (6 warna; oranye/cyan/hijau/gelap disisakan untuk balon spesial).


## M2.5 — Fisika balon & rantai yang putus — 2026-10-08

- **Rantai emas fisik** (verlet, 31 simpul, ujung terpaku di dinding, sedikit kendur): balon yang naik **mendorong rantai sampai melengkung**; gembok tergantung di tengah rantai dan ikut bergerak.
- **Fisika balon baru**: balon yang dilepas punya kecepatan + gaya apung, saling tabrak dengan massa ~ ukuran (bukan dorongan kaku), mendorong rantai; balon yang sedang ditiup mendorong yang lain.
- Saat menempel, nilai balon **mengalir ke gembok** (percikan emas). Makin dekat ke angka gembok, rantai menyala dan bergetar.
- Angka terpenuhi → **rantai putus di tengah** (kilatan, mata rantai berhamburan, bunyi "klang"), kedua potongan **jatuh terayun**, balon **lolos terbang ke atas** melewati arena dan pecah di atas hero → peluru.
- Balon transparan saat ditiup, jadi padat setelah dilepas (seperti referensi).


## M2.4 — Gembok & balon kebal (seperti Puff Up) — 2026-10-08

- **Gembok berangka** di tali tiap giliran (gelombang 1–5: 30/40/50/60/70) + 3 ikon balon. Tiap balon yang sampai di atas mengurangi angka gembok; kalau total melebihi angka itu, **gembok terbuka** → semua balon pecah → hero menembak. Jatah balon habis dan gembok masih terkunci → "LOCKED!", balon kempes, giliran tanpa peluru.
- **Balon yang sudah dilepas kebal duri**; bola berduri **terpental/terdorong** oleh balon yang terbang dan kumpulan balon di atas. Duri hanya berbahaya saat balon masih ditiup.
- Balon **tidak mengecil** lagi: berkumpul di atas dalam ukuran penuh, saling dorong; balon yang sedang ditiup terdorong keluar dari kumpulan.
- **Pengali tinggi (×1–×2) dihapus** (alasannya, terbang dari bawah lebih berisiko, sudah tidak berlaku).
- Bunyi baru: lock_tick, unlock, locked, deflate. Validator sekarang hanya menghitung risiko saat meniup.
- Bot "pemain lumayan" sampai gelombang 5 (0 balon meletus dari 52; tekanan utama sekarang dari angka gembok).


## M2.3 — Banyak balon & banyak peluru (untuk CPI) — 2026-10-08

- **3 balon per giliran** (gaya Puff Up): balon yang dilepas naik dan **menggantung di tali emas** di atas ruang dengan nilai pelurunya (pengali tinggi sudah dihitung). Setelah balon ke-3, semua pecah berurutan cepat.
- **Bola peluru terlihat di dalam balon** (gaya Claw Master): makin ditiup makin banyak bola berdesakan; saat pecah, bola-bola mengalir ke hero (sampai 50 per balon).
- Volley hero sampai 45 tembakan/detik; kapasitas peluru di layar 200.
- **Musuh gerombolan**: 4 lajur (posisi selang-seling), gelombang 12–36 musuh, 4–8 masuk per giliran; serangan musuh dipercepat untuk gerombolan besar.
- Bola berduri tidak masuk area tali. Label giliran "HOLD TO BLOW · n LEFT" di bawah ruang.
- Keseimbangan: HP hero 150. Bot "pemain lumayan" (pilih tempat aman, lepas saat duri dekat) kalah di gelombang 4 (giliran ke-13).


## M2.2 — Musuh langsung menyerang — 2026-10-08

- Musuh tidak lagi berjalan mendekat: mereka masuk ke **barisan di depan hero** (3 lajur) dan **semuanya menyerang tiap giliran musuh** (lari ke hero, pukul, kembali). Yang di belakang maju mengisi barisan yang kosong.
- Keseimbangan: HP hero 120 (brief 100), damage per serangan Grunt 4 / Runner 3 / Tank 8, gelombang 1 masuk 2 musuh per giliran. Bot (meletuskan 50–67% balon) kalah di gelombang 3.


## M2.1 — Battle gaya Claw Master + art sesuai referensi — 2026-10-08

Keputusan kamu: **referensi lebih benar daripada brief**, gameplay dan art mengikuti video.
- **Battle horizontal**: hero di kiri menghadap kanan, musuh masuk dari kanan.
- **Bergantian per giliran**: kamu tiup **1 balon** (battle diam) → peluru masuk ke hero → hero menembakkan semuanya (**FIRE!**) → **ENEMY TURN**: musuh maju satu langkah, yang sudah dekat menyerang, musuh baru masuk → giliran kamu lagi. Balon meletus = 0 peluru, musuh tetap maju.
- Kamera zoom ke battle saat menembak/giliran musuh, kembali saat giliran kamu (seperti referensi). Ruang balon digelapkan saat bukan giliran kamu, label giliran di layar.
- **Art**: hutan toska + jalan tanah + tanah coklat (Claw Master), prajurit chibi dengan senapan, musuh tikus / kelinci / babi hutan; ruang balon abu-abu berdinding cyan, balon ungu-pink, bintang duri merah dengan jejak putih (Puff Up). Semua digambar dengan kode sendiri (gaya mengikuti referensi, bukan salinan aset).
- HP bar + jumlah peluru di bawah hero (seperti referensi); HUD atas tinggal progres gelombang.
- Gelombang dibuat per-giliran (2–5 musuh masuk tiap giliran). Bot playtest (meletuskan ~45% balon) kalah di gelombang 3.


## M2 — Battle — 2026-10-08

- **Musuh**: Grunt (ungu), Runner (oranye, cepat), Tank (toska, berhelm) muncul di bukit, jalan turun, berhenti di garis pertahanan lalu menyerang hero (tanda "!" + gerakan menyerang).
- **Hero** menembak otomatis ke musuh terdekat dengan garis pertahanan, peluru membidik ke depan gerak musuh. Tanpa musuh tidak menembak, amunisi disimpan.
- **Gelombang 1–5** sesuai brief (jadwal spawn deterministik dengan seed), banner "WAVE n", "WAVE CLEAR" + slow-mo, pola spike berganti tiap gelombang.
- **HP hero** + bar HP di atas (potongan putih menyusul, bergetar saat kena), vignette merah berdenyut + detak jantung saat HP < 30%.
- **Menang/kalah**: "STAGE CLEAR" (sementara, boss di M3) / "DEFEATED", tap untuk main lagi.
- Juice §8.2–8.3: hero berkedip merah + trauma + vibrate saat diserang; musuh flash putih, squash, knockback, angka damage, bar HP kecil; mati = gumpalan warna + koin memantul (+ hitstop untuk Tank).
- Bunyi baru: enemy_die, hero_hurt, enemy_attack, heartbeat, wave_clear, lose, win_fanfare.
- **Pengali tinggi** (keputusan playtest): balon dilepas dari dasar ruang = ×2 peluru, mepet langit-langit = ×1; tampil live di bawah balon. Balon baru kebal 0.15 s.
- **HP musuh digandakan** dari brief (Grunt 12, Runner 6, Tank 50) karena pengali ×1–×2 menggandakan suplai amunisi; dengan HP brief tidak ada musuh yang sampai ke garis. Bot playtest (pemain buruk, >50% balon meletus) sekarang kalah di gelombang 4.
- Debug: tombol *Skip wave*, *Restart run*. Tes baru: jadwal spawn deterministik.

**Belum**: kartu upgrade, jenis balon, boss (M3); title/result/tutorial/pause menu lengkap (M4); telemetry (M5).

## M1.2 — Playtest kedua — 2026-10-08

- Balon yang sedang ditiup **bisa digeser** mengikuti jari (tetap di dalam dinding, condong sedikit ke arah geser).
- **Pipa dihapus.** Balon terbang **lurus ke atas** dan **pecah saat menyentuh langit-langit** ruang. Amunisinya keluar jadi **peluru** yang melesat ke atas lalu masuk ke angka amunisi hero.
- Hero sekarang berdiri di rumput (ada bayangan), bukan di atas pipa.

## M1.1 — Hasil playtest pertama — 2026-10-08

- **Balon muncul di tempat tap** dan membesar di situ (dulu di pompa). Pompa dihapus. Balon terdorong dari dinding saat membesar, lalu terbang melengkung ke pipa saat dilepas.
- **Spike jadi bola berduri yang memantul di dinding** (dulu spinner berputar), dengan jejak gerak dan goyang saat memantul.
- Pola gelombang 1–5 + boss diganti bola pantul, dituning ulang dengan validator (sekarang rata-rata 9 titik tap). Batas "balon kecil aman" diturunkan, alasannya di `DESIGN_NOTES.md` §0.
- Halaman menampilkan "Loading…" dan pesan error di layar kalau gagal dimuat. Untuk tes di HP sekarang dipakai versi build (1.6 MB, sebelumnya 20 MB di mode dev).

## M1 — Ruang balon (fokus feel) — 2026-10-08

**Selesai**
- Siklus balon lengkap: spawn (easeOutBack 250 ms + input buffering) → tiup → tier → overinflate (0.5 s tegang) → lepas → naik (faktor ukuran, sway) → pipa (balon dipencet, pipa menggembung) → tiba & meletus di belakang hero → token amunisi.
- Spinner & orbiter (+ `speedWave`), collision lingkaran vs kapsul/lingkaran, hitbox 0.92.
- CLOSE! (+10%, maks 1×/balon), PERFECT! (air ≥ 0.9, +10%), 2 balon tutorial yang tidak bisa meletus.
- Semua juice §8.1: squash pompa, embusan udara, wobble spring per tick, punch angka, flash + cincin partikel saat naik tier, glow tier (putih/emas/pelangi) + badge, glow merah + vignette + danger tick saat dekat spike, jitter & kulit menipis saat hampir penuh, squash-stretch-elastic + tali mencambuk + jejak saat lepas, hitstop 90 ms + flash layar + serpihan + teks `-N` jatuh + spike bergoyang saat kena, overinflate lebih besar + gelombang kejut, shockwave + serpihan + confetti + token bezier saat tiba.
- Semua SFX §9 untuk balon (prosedural Web Audio, compressor, voice limiting, variasi pitch) + shoot/hit/empty_click/ui_tap.
- Arena sementara: hero placeholder menembak target latihan (8 tembakan/s) dengan amunisi yang sampai; counter amunisi roll-up, berkedip merah saat habis.
- Transisi pola spike (mengecil/muncul berputar), tidak pernah saat balon ditiup.
- Auto-pause saat pointercancel / tab disembunyikan / blur, balon yang ditiup tidak dilepas; resume perlu tap baru.
- Debug panel (D atau tap pojok kiri atas 3×): FPS, partikel, seed, cheat (balon tidak meletus, spike mati, ammo tak terbatas), time scale 0.1–2×, overlay hitbox, semua angka balon/spike/juice/audio live, editor pola spike, validator + heatmap, copy/paste/reset config JSON.

**Diubah dari dokumen**: orbiter boss fase 2 67.5°/s (bukan 75) supaya lolos validator. Detail di `DESIGN_NOTES.md`.

**Dicek**: `npm test` 17 tes lolos (collision, ammo/tier, aturan penempatan spike, validator semua pola); `npm run build` OK; playtest otomatis di viewport 390×844: tanpa error/warning console, 60 fps (headless Chrome).

**Perlu kamu cek di HP**: feel tiup/lepas, kejelasan bahaya spike, kepuasan meletus & token, volume bunyi, jendela PERFECT.

**Belum**: musuh/gelombang (M2), kartu & jenis balon & boss (M3), layar title/result/tutorial ikon tangan/pause menu lengkap (M4), telemetry layar Result (M5), musik.

## M0 — Persiapan — 2026-10-08

- Frame video referensi diekstrak, catatan di `DESIGN_NOTES.md`.
- Vite + TypeScript strict + Phaser 3.90 + Tweakpane 4; font Fredoka dibundel lokal.
- `config.ts` (semua angka tuning), `levels.ts`, `strings.ts`.
- Fixed timestep 60 Hz (akumulator) + interpolasi render; RNG ber-seed.
- Sistem juice dasar: trauma shake (noise halus), hitstop, slow-mo, spring, particle pool, floating text, flash, easing.
