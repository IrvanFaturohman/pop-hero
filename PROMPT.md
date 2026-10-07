# PROMPT — Prototype Web "Pop Hero" (working title)

> Dokumen ini adalah brief lengkap untuk kamu (Claude Code). Baca sampai habis sebelum menulis kode.
> Tujuannya: **prototype web yang sudah terasa polish** (game feel, juice, SFX) untuk menguji apakah core loop-nya seru, sebelum dibuat di Unity.
> Kalau ada yang tidak jelas atau saling bertentangan, tulis pertanyaannya di `DESIGN_NOTES.md` dan pilih asumsi paling masuk akal, jangan berhenti total.

---

## 0. Ringkasan satu paragraf

Game mobile portrait dengan **layar terbelah**. **Bagian bawah**: pemain **menahan layar untuk meniup balon** di atas pompa. Makin besar balon, makin banyak peluru (angka di balon naik). Di sekitar balon ada **spike yang berputar**; kalau balon menyentuh spike, balon meletus dan pelurunya hilang. Saat jari **dilepas**, balon terbang ke atas melewati spike (harus pas waktunya), masuk lewat pipa, lalu meletus di belakang hero dan **mengisi amunisi hero**. **Bagian atas**: hero menembak otomatis ke gelombang musuh yang berjalan turun ke arahnya. Antar gelombang, pemain memilih 1 dari 3 kartu upgrade (roguelike). Satu run = 5 gelombang + 1 boss, sekitar 3–5 menit.

Keputusan inti pemain: **serakah atau aman** — tiup lebih lama = peluru lebih banyak, tapi balon makin besar makin gampang kena spike dan makin susah lewat celah spike saat terbang.

---

## 1. Referensi (mekanik sudah terbukti di pasar)

| Game | Publisher | Yang diambil |
|---|---|---|
| **Puff Up – Balloon puzzle game** | Voodoo (50M+ unduhan di Play) | Tahan untuk meniup balon sebesar mungkin, lepas di waktu yang pas, hindari spike/rintangan. Angka di balon. |
| **Claw Master – Roguelike Hero** | Azur Games (1M+ unduhan) | Layar terbelah: bawah = mesin capit yang mengambil senjata/resource, atas = hero bertarung lawan musuh & boss. Pilih skill roguelike tiap run. Di game kita, mesin capit diganti balon. |

**Video referensi**: kalau ada file video di folder `./references/` (mis. `puffup.mp4`, `clawmaster.mp4`):
1. Cek `ffmpeg` (`ffmpeg -version`). Kalau belum ada, install (`brew install ffmpeg` / `sudo apt install ffmpeg` / `winget install ffmpeg`) atau minta saya install.
2. Ekstrak frame: `ffmpeg -i references/<nama>.mp4 -vf "fps=2,scale=540:-1" references/frames/<nama>_%04d.png`
3. Lihat frame-frame penting (pakai tool baca gambar): awal level, saat balon ditiup, saat hampir kena spike, saat meletus, saat battle, saat pilih skill, saat boss.
4. Tulis apa yang kamu pelajari (layout, timing, animasi, feedback) di `DESIGN_NOTES.md`.

**Aturan referensi**:
- Video hanya untuk memahami **mekanik dan rasa (feel)**. **Jangan meniru aset, karakter, logo, UI, atau nama** dari game referensi. Semua visual harus orisinal.
- Kalau video bertentangan dengan dokumen ini, **dokumen ini yang menang**. Catat perbedaannya di `DESIGN_NOTES.md`.
- **Jangan menambah mekanik baru** di luar dokumen ini tanpa bertanya dulu. Ide tambahan boleh ditulis di bagian "Ide" di `DESIGN_NOTES.md`.

---

## 2. Teknologi

- **Vite + TypeScript (strict) + Phaser 3** (versi stabil 3.x terbaru).
- **Tweakpane** untuk debug panel tuning (lihat §11).
- **SFX dibuat prosedural dengan Web Audio API** (tanpa file audio). Boleh pakai library kecil `zzfx` dari npm, atau tulis synth sendiri. Lihat §9.
- **Tanpa aset gambar eksternal**: semua grafis digambar dengan kode (Phaser Graphics / generate texture saat boot). Ini supaya prototype mandiri dan mudah diubah.
- Font: **Fredoka** atau **Baloo 2** via `@fontsource/...` (dibundel lokal, bukan dari CDN).
- Perintah:
  - `npm run dev` → jalan di browser. `npm run dev -- --host` supaya bisa dites di HP lewat Wi-Fi.
  - `npm run build` → folder `dist/` statis yang bisa diupload ke itch.io / GitHub Pages / Netlify.
- Target: **60 fps stabil** di HP Android kelas menengah (Chrome) dan iPhone (Safari).

### Struktur kode (usahakan, supaya gampang di-port ke Unity nanti)
```
src/
  main.ts                 // boot Phaser, scale, scenes
  config.ts               // SEMUA angka tuning (lihat §10). Tidak ada magic number di file lain.
  levels.ts               // definisi gelombang, pola spike, boss
  upgrades.ts             // daftar kartu upgrade
  strings.ts              // semua teks UI (default bahasa Inggris)
  logic/                  // logika murni, TANPA objek Phaser: balloon, spinner, collision, battle, waves, rng
  scenes/                 // Boot, Title, Game, UpgradePick, Result
  view/                   // gambar balon, spike, hero, musuh, pipa, HUD
  juice/                  // screenShake (trauma), hitstop, timeScale, particles, floatingText, tweens helper
  audio/                  // sfx.ts (semua bunyi), music.ts (opsional)
  debug/                  // tweakpane panel, overlay hitbox, telemetry
```
- Logika berjalan di **fixed timestep 60 Hz** (akumulator), render mengikuti frame. Ini penting supaya hitstop/slow-mo tidak merusak fisika dan hasil tuning konsisten.
- RNG pakai **seed** (tampilkan seed di debug panel) supaya run bisa diulang saat debugging.
- Tidak ada file > ~400 baris. Nama variabel/komentar kode: bahasa Inggris.

---

## 3. Layar & layout

- Resolusi logika **720 × 1280** (9:16), `Scale.FIT`, letterbox dengan warna latar. Cap `devicePixelRatio` di 2.
- Pembagian (koordinat logika, y ke bawah):

```
y=0    ┌──────────────────────────────┐
       │ HUD: progress gelombang, HP  │
       │                              │
       │   ARENA BATTLE (atas)        │  musuh muncul dari atas,
       │   musuh ↓ ↓ ↓                │  jalan turun ke hero
       │ - - - - garis pertahanan - - │  y≈470
       │            HERO              │  (360, 540) + angka amunisi
y=600  ├────────────┤PIPA├────────────┤  pipa vertikal di tengah (x=360)
y=640  │                              │
       │   RUANG BALON (bawah)        │  spike berputar
       │      ✶ spinner ✶             │
       │           ( 23 )  ← balon    │
       │            ═╩═   ← pompa     │  nozzle di (360, 1200)
y=1280 └──────────────────────────────┘
```

- Aliran visual selalu **ke atas**: balon naik → pipa → hero → peluru naik ke musuh. Ini harus terasa jelas.
- **Input**: tahan di **mana saja di layar** (bukan hanya area bawah) = meniup. Lepas = kirim balon. Satu jari saja.
- Matikan perilaku browser yang mengganggu: `touch-action: none`, `user-select: none`, `-webkit-touch-callout: none`, cegah pinch-zoom, cegah context menu long-press, cegah scroll/bounce. Tambah meta viewport yang benar dan safe-area inset.
- `pointercancel` / tab disembunyikan / window blur → **auto pause**, balon yang sedang ditiup **tidak** dilepas.

---

## 4. Mekanik bawah: balon

### 4.1 Siklus balon
1. **Spawn**: balon kecil muncul dari pompa (tween `easeOutBack` 250 ms, bunyi "plop"). Selama animasi spawn, kalau jari sudah ditahan, peniupan langsung mulai begitu spawn selesai (input buffering).
2. **Tiup** (jari ditahan): variabel udara `air` naik dari 0 ke 1 dengan kecepatan `inflateRate` (default 0.45/detik → penuh ±2.2 detik).
   - Radius: `r = lerp(rMin, rMax, curve(air))`, default `rMin=22`, `rMax=150`, `curve` linear (bisa diganti di config).
   - Balon menempel di nozzle dan tumbuh **ke atas**: pusat balon `y = nozzleY - r`.
   - **Peluru**: `ammo = floor(1 + (ammoMax-1) * air^ammoExp)`, default `ammoMax=40`, `ammoExp=1.5` (cembung: makin serakah makin menguntungkan). Angka ditampilkan di tengah balon.
   - **Tier** berdasarkan ammo: T1 < 10, T2 ≥ 10, T3 ≥ 20, T4 ≥ 30. Naik tier = feedback besar (§8.1). Warna dasar balon ditentukan oleh **jenis balon** (§4.4); tier ditunjukkan lewat badge angka, ketebalan outline glow (tidak ada → putih → emas → pelangi), dan bunyi.
3. **Overinflate**: kalau `air` mencapai 1 dan jari masih ditahan → fase **tegang** 0.5 detik (getaran makin kencang, bunyi derit, kulit makin transparan), lalu **meletus sendiri**. Ini memberi batas atas untuk keserakahan selain spike.
4. **Lepas** (jari diangkat): balon lepas dari nozzle dan **naik**:
   - kecepatan awal 300 px/s, percepatan ke atas 1400 px/s², maksimum 900 px/s;
   - dikali faktor ukuran `lerp(1.15, 0.8, air)` (balon besar lebih lambat → lebih lama terekspos spike);
   - goyang horizontal kecil (sinus, amplitudo 6 px);
   - tetap bisa meletus kalau menyentuh spike selama terbang.
5. **Masuk pipa** (y < 660): balon "dipencet" masuk pipa (scaleX ~0.55), pipa menggembung mengikuti posisi balon.
6. **Tiba di arena atas**: balon keluar di belakang hero, meletus (letusan "baik"), dan amunisi mengalir ke hero (§8.1).
7. **Balon berikutnya** spawn `0.35 s` setelah dilepas (boleh meniup balon baru sementara balon sebelumnya masih terbang), atau `0.8 s` setelah balon meletus kena spike/overinflate.

### 4.2 Meletus (gagal)
- Kena spike (saat tumbuh atau terbang) atau overinflate → balon hancur, **ammo balon itu hilang**, muncul teks merah `-23` yang jatuh, jeda 0.8 s sebelum balon baru.
- Tutorial: **2 balon pertama di run pertama tidak bisa meletus** (spike menembus dengan efek "nyaris" saja).

### 4.3 Bonus kecil (memberi hadiah untuk keberanian)
- **CLOSE!**: kalau tepi balon lewat dalam jarak < 10 px dari spike tanpa kena (saat tumbuh atau terbang) → teks "CLOSE!", +10% ammo (maks sekali per balon), bunyi swish + chime.
- **PERFECT!**: dilepas dengan `air ≥ 0.9` dan sampai di atas dengan selamat → teks "PERFECT!", +10% ammo.

### 4.4 Jenis balon (muncul mulai gelombang 2)
Antrean **2 balon berikutnya** terlihat kecil di samping pompa. Bobot muncul ada di config.

| Jenis | Warna | Efek saat sampai di hero |
|---|---|---|
| Normal | pink `#FF5DA2` | Peluru biasa sejumlah ammo |
| Fire | oranye `#FF7A1A` | Peluru membakar: 1 damage/detik selama 3 detik |
| Ice | cyan `#5BE7FF` | Peluru memperlambat musuh 30% selama 2 detik |
| Bomb | gelap `#3B3B4F` + sumbu merah | Bukan peluru: hero melempar 1 bom ke kerumunan musuh terpadat, damage area (radius 90 px) = `ammo × 1.5` |
| Heal | hijau `#3DDC84` | Bukan peluru: hero sembuh `ammo × 0.8` HP |

Jenis baru diperkenalkan dengan label kecil "NEW!" saat pertama muncul.

### 4.5 Spike (rintangan berputar)
Semua spike didefinisikan di `levels.ts`. Dua tipe utama:
- **Spinner**: poros di titik `(px, py)`, `n` lengan (1–4), panjang lengan `L`, kecepatan sudut `ω` (derajat/detik, boleh negatif). Lengan berupa batang berduri (kapsul, tebal 10 px) dengan **bola berduri** di ujung (radius 18 px). Seluruh lengan + bola mematikan; hub di poros juga.
- **Orbiter**: bola berduri yang mengorbit pusat `(cx, cy)` dengan radius `R` (boleh elips: `Rx`, `Ry`) dan kecepatan `ω`.
- Opsional per spike: `speedWave` (kecepatan berosilasi antara ω_min–ω_max dengan periode T) untuk "ritme" di gelombang akhir.

Aturan penempatan (penting, kalau dilanggar game jadi tidak adil atau tidak ada timing):
- Poros spinner / pusat orbit **tidak boleh sama dengan pusat balon**. Kalau sama, jarak spike ke balon konstan → tidak ada timing. Poros diletakkan di **samping** area tumbuh balon supaya ujung lengan **mendekat dan menjauh secara berkala** → muncul "jendela aman" untuk tumbuh lebih besar dan untuk lepas.
- **Hub (poros) spinner tidak boleh berada di jalur naik balon.** Jalur naik = kolom `x = 360 ± rMax`. Jadi poros diletakkan di `x ≤ 180` atau `x ≥ 540` (atau menempel di dinding), dan lengannya menyapu masuk ke jalur tengah. Hub tetap mematikan (radius 20 px).
- Balon ukuran `rMin` **tidak pernah** boleh kena spike apa pun di posisi mana pun.

**Validator pola spike** (wajib dibuat, jalankan sebagai unit test dan tombol di debug panel): untuk tiap pola, simulasikan (tanpa render) melepas balon di `air ∈ {0.3, 0.5, 0.7, 0.9}` × 24 fase putaran spike (rata dalam satu periode), lalu hitung persentase balon yang selamat sampai pipa (spike tetap bergerak selama balon ditiup, jadi fase saat mulai meniup juga ikut diperhitungkan). Syarat lolos default: `air 0.3` selamat ≥ 90% untuk gelombang 1–3 dan ≥ 70% setelahnya (orbiter yang melintas di jalur tengah memang menuntut timing untuk semua ukuran), `air 0.9` selamat 5–50% (susah tapi mungkin), dan persentase turun seiring ukuran. Tampilkan hasilnya sebagai tabel/heatmap kecil di debug panel. Kalau pola tidak lolos, ubah panjang lengan/kecepatan/posisi sampai lolos, dan catat perubahannya.

**Collision**: lingkaran (balon) vs kapsul (lengan) dan lingkaran vs lingkaran (bola). Hitbox balon = `0.92 × radius visual` (sedikit memaafkan supaya terasa adil). Debug overlay bisa menampilkan hitbox (§11).

Visual spike: badan gelap `#2A2A35`, outline putih 3 px, ujung duri merah `#FF3B3B`, sedikit bayangan. Harus **sangat kontras** dan mudah dibaca.

---

## 5. Mekanik atas: battle

- **Hero** di `(360, 540)`. HP 100. Menembak **otomatis** selama amunisi > 0: 8 tembakan/detik, kecepatan peluru 1400 px/s, damage 1. Target = musuh yang paling dekat ke garis pertahanan (paling berbahaya). Kalau tidak ada musuh, hero tidak menembak dan amunisi disimpan (tanpa batas maksimum). Amunisi ditampilkan besar di samping hero.
- **Musuh** muncul dari atas (y≈40) di posisi x acak dalam lajur, berjalan turun. Kalau sampai **garis pertahanan** (y≈470), berhenti dan menyerang hero (damage per detik).

| Musuh | HP | Kecepatan | Damage/detik di garis | Catatan |
|---|---|---|---|---|
| Grunt | 6 | 45 px/s | 5 | dasar |
| Runner | 3 | 90 px/s | 4 | cepat, kecil |
| Tank | 25 | 25 px/s | 10 | besar, knockback lebih kecil |
| Boss | 300 | 15 px/s, berhenti di y≈300 | — | lihat bawah |

- **Boss**: muncul setelah gelombang 5. Intro dramatis (§8.5). Setiap 5 detik melakukan **slam**: telegraf 1 detik (lingkaran merah berkedip di hero), lalu 15 damage ke hero + shake besar. Setiap 12 detik memanggil 3 Grunt. Di HP ≤ 50% masuk fase 2: slam tiap 3.5 detik, dan pola spike di bawah berubah (lihat `levels.ts`).
- **Kalah**: HP hero 0. **Menang**: boss mati → layar "STAGE CLEAR".

### 5.1 Gelombang (Stage 1)
| Gelombang | Musuh | Pola spike di ruang balon |
|---|---|---|
| 1 | 8 Grunt dalam 16 detik | 1 spinner, 2 lengan, poros (150, 860), L=130, ω=60°/s |
| 2 | 10 Grunt + 4 Runner | 1 spinner, 2 lengan, poros (150, 860), L=135, ω=80°/s |
| 3 | 8 Grunt + 6 Runner + 1 Tank | 2 spinner berlawanan arah: poros (150, 860) & (570, 860), 2 lengan, L=130, ω=±70°/s |
| 4 | 10 Grunt + 6 Runner + 3 Tank | spinner gelombang 1 (ω=70°/s) + 1 orbiter elips: pusat (360, 930), Rx=210, Ry=80, ω=60°/s |
| 5 | campuran 2× gelombang 3 | 1 spinner 3 lengan, poros (570, 860), L=125, `speedWave` 30–130°/s, periode 3 detik |
| Boss | Boss + panggilan Grunt | Fase 1: pola gelombang 3. Fase 2: pola gelombang 3 ×1.25 lebih cepat + orbiter pusat (360, 900), Rx=200, Ry=70, ω=75°/s |

Ide di balik angka ini: panjang lengan menentukan **ukuran balon minimum yang terancam**. Ujung spinner di poros x=150 dengan L=130 hanya menjangkau x≈300, jadi balon kecil selalu lewat aman, sedangkan balon besar (yang melebar ke x<300) harus menunggu celah. Makin serakah = makin perlu timing.

Angka ini sudah dicek dengan simulasi kasar (hitbox 0.92, kecepatan naik seperti §4.1, 60 fase rilis). Persentase balon yang selamat menurut ukuran `air` 0.3 / 0.5 / 0.7 / 0.9:

| Pola | 0.3 | 0.5 | 0.7 | 0.9 |
|---|---|---|---|---|
| Gelombang 1 | 100% | 60% | 40% | 27% |
| Gelombang 2 | 100% | 55% | 33% | 12% |
| Gelombang 3 | 100% | 63% | 40% | 18% |
| Gelombang 4 | 77% | 35% | 20% | 5% |
| Gelombang 5 | 100% | 53% | 40% | 13% |
| Boss fase 2 | 75% | 38% | 17% | 5% |

Ini **titik awal**. Validator di implementasimu (§4.5) harus memberi hasil yang mirip; kalau beda jauh, cek dulu apakah ada bug di collision/rumus sebelum mengubah angka. Semua harus bisa diubah dari config/debug panel. Pola spike berganti dengan transisi (spike lama mengecil hilang, spike baru muncul berputar dengan `easeOutBack`), dan **tidak pernah berganti saat balon sedang ditiup** — tunggu balon itu selesai.

### 5.2 Kartu upgrade (antar gelombang)
Setelah gelombang bersih: slow-mo singkat, banner "WAVE CLEAR", lalu 3 kartu acak (tanpa duplikat dalam satu tawaran). Pilih 1. Kelangkaan: common / rare / epic (bobot di config).

| Kartu | Kelangkaan | Efek |
|---|---|---|
| Sharp Bullets | common | +1 damage peluru |
| Rapid Fire | common | +25% kecepatan tembak |
| Big Lungs | common | +20% kecepatan tiup |
| Near-Miss Pro | common | CLOSE! memberi +5 ammo tambahan |
| Vampire Air | common | sembuh 1 HP per 10 ammo yang sampai |
| Thick Rubber | rare | tiap balon kebal 1× sentuhan spike (tampil sebagai lapisan pelindung yang pecah) |
| Greedy | rare | +25% ammo untuk balon tier 3 ke atas |
| Slow Gears | rare | semua spike 15% lebih lambat |
| Pierce | rare | peluru menembus 1 musuh |
| Max Pressure | rare | rMax +10% (ammo maksimal ikut naik) |
| Twin Shot | epic | tiap 1 ammo menembakkan 2 peluru |

Kartu bisa ditumpuk kecuali yang ditandai unik di `upgrades.ts`.

---

## 6. Alur layar

1. **Title**: judul, balon idle bergoyang, tulisan "HOLD TO PLAY". Tahan layar = mulai (sekalian membuka AudioContext).
2. **Game**: seperti di atas. Tombol pause kecil di pojok kanan atas.
3. **Upgrade Pick**: overlay di atas game (game di-pause).
4. **Pause**: Resume, Restart, toggle Sound / Haptics / Reduced Motion.
5. **Result** (menang/kalah): gelombang tercapai, statistik run (§12), tombol "PLAY AGAIN" dan "COPY STATS".

**Tutorial (FTUE)** di 30 detik pertama, tanpa teks panjang:
- Ikon tangan animasi menekan → "HOLD" di dekat balon.
- Saat ammo ≥ 10 → ikon tangan diangkat → "RELEASE!".
- Saat spike pertama muncul (gelombang 1) → panah kecil ke spike + "AVOID".
- Tutorial hanya muncul di run pertama (simpan flag di `localStorage`, dibungkus try/catch).

---

## 7. Arah visual

- Gaya: **kartun bulat, warna cerah dan vibrant**, outline tebal gelap (3–4 px), bayangan lembut, semua sudut membulat. Mudah dibaca di layar kecil.
- **Tema sementara (placeholder)**: hero = karakter bulat lucu membawa blaster; musuh = blob/slime warna-warni dengan mata besar. Tema harus mudah diganti nanti (gambar terpisah per entitas di `view/`).
- Palet (taruh di config sebagai token):
  - Arena atas: langit gradien `#8FD3FF → #D9F1FF`, tanah `#7BD389`, garis pertahanan putus-putus putih 40% alpha.
  - Ruang balon: ungu tua `#2E1F66` dengan pola grid halus, dinding dengan sudut membulat.
  - Pipa: logam terang `#C9D3E6` dengan highlight.
  - Bahaya: `#FF3B3B`. Emas/hadiah: `#FFD23F`.
- Balon: gradien radial (terang di kiri atas), **highlight spekular elips** yang ikut membesar, simpul di bawah, tali yang melambai saat terbang. Makin besar, kulit makin terang/transparan (terlihat "menipis").
- Angka ammo: font tebal membulat, putih dengan outline gelap, ukuran mengikuti radius balon.
- Animasi idle: hero naik-turun 2 px (1.2 Hz), musuh bergoyang ±4°, awan latar bergerak pelan, pompa berdenyut pelan.

---

## 8. Game feel & juice (bagian paling penting)

Prinsip: **setiap aksi pemain mendapat respons di frame yang sama**, dan setiap kejadian penting punya kombinasi **visual + bunyi + gerak kamera/haptic**. Semua intensitas bisa diatur dari debug panel (§11) dan ada toggle **Reduced Motion** (shake ×0.3, flash dimatikan).

### 8.0 Sistem dasar yang harus dibuat dulu
- **Screen shake berbasis trauma**: `offset = maxOffset × trauma²` (maxOffset 18 px, rotasi maks 2°), noise halus (bukan random per frame), trauma turun 1.6/detik, dibatasi 1.
- **Hitstop**: membekukan logika game N ms (UI tetap jalan).
- **Time scale** (slow-mo) dengan tween masuk/keluar.
- **Spring** untuk squash & stretch (kekakuan & redaman bisa diatur).
- **Particle pool** (tanpa alokasi di loop), **floating text** (angka damage, CLOSE!, -23), **flash** (sprite putih sesaat).
- Helper easing: `easeOutBack`, `easeOutElastic`, `easeOutQuad`, `easeInOutSine`.

### 8.1 Balon
| Momen | Visual | Bunyi | Lainnya |
|---|---|---|---|
| Mulai tiup | pompa tertekan (squash 0.9), embusan udara kecil dari nozzle | `inflate_start` | — |
| Selama tiup | balon bergoyang lembut (spring, dirangsang tiap tick ammo), pompa berdenyut tiap 0.1 s | `inflate_loop`, pitch naik mengikuti `air` | — |
| Ammo +1 | angka "punch" scale 1.25 → 1 (120 ms) | `ammo_tick`, pitch naik tiap angka | — |
| Naik tier | flash putih 80 ms, cincin partikel meledak keluar, glow outline berubah, badge berganti | `tier_up` (makin tinggi tier, makin tinggi nadanya) | vibrate 15 ms |
| Dekat spike (< 40 px) | tepi balon menyala merah sesuai kedekatan, vignette merah tipis di area bawah | `danger_tick` makin cepat saat makin dekat | — |
| Hampir penuh (air > 0.85) | getaran (jitter 0 → 4 px), kulit makin transparan | `strain` (derit karet) | — |
| Lepas | squash (scaleX 1.2, scaleY 0.75) → stretch vertikal (0.85, 1.2) → normal dengan `easeOutElastic` 300 ms, tali mencambuk, jejak bayangan 3–5 lingkaran memudar | `release_boing` + `whoosh` | — |
| Lewat pipa | pipa menggembung di posisi balon, balon terpencet (scaleX 0.55) | `tube_fwoop` saat keluar | — |
| CLOSE! | teks "CLOSE!" kuning melompat, garis "swoosh" di sisi spike | `near_miss` | — |
| Tiba di atas | balon meletus: gelombang kejut (cincin melebar, 250 ms), 12–20 serpihan karet berwarna balon (gravitasi + putar), 20 confetti, token amunisi (maks 20 token visual) terbang melengkung (bezier) ke angka amunisi hero dengan jeda 15 ms antar token | `arrival_pop`, lalu `ammo_collect` per token dengan pitch naik | trauma +0.25 |
| Angka amunisi hero | punch scale + angka berputar naik (roll-up) | — | — |
| Kena spike | **hitstop 90 ms**, flash putih layar 60 ms, balon pecah jadi 16–24 serpihan, teks merah `-N` jatuh, spike yang mengenai bergoyang sedikit | `spike_pop` (letusan + "pfff" kempis) | trauma +0.5, vibrate 40 ms |
| Overinflate | seperti kena spike tapi lebih besar + lingkaran kejut | `overinflate_pop` | trauma +0.6 |
| Balon baru | muncul dari pompa `easeOutBack` 250 ms | `plop` | — |

### 8.2 Hero & tembakan
- Tembak: hero mundur 4 px (recoil 60 ms), kilatan moncong (bintang kecil 50 ms), peluru berbentuk kapsul dengan jejak pendek. `shoot` dengan pitch acak ±8%, **maksimal 4 suara tembak bersamaan** (voice limiting) supaya tidak berisik.
- Amunisi habis: angka berkedip merah, hero berhenti dengan animasi "klik" kosong + bunyi `empty_click` (sekali saja, jangan berulang).
- Hero terkena serangan: hero berkedip merah, HP bar bergetar, potongan HP putih yang menyusul turun setelah 400 ms, trauma +0.3, `hero_hurt`, vibrate 25 ms.
- HP < 30%: vignette merah berdenyut + `heartbeat` pelan.

### 8.3 Musuh
- Kena peluru: flash putih 60 ms, squash 0.9, knockback 6 px (Tank 2 px), percikan 6 partikel, angka damage melayang naik 40 px lalu pudar 500 ms dengan geser x acak. `hit`.
- Efek status: Fire = partikel api kecil + tint oranye; Ice = tint biru + kristal kecil + gerak melambat.
- Mati: membesar 1.2 → pecah jadi 10 gumpalan warna musuh + koin kecil memantul (visual saja), `enemy_die` pitch acak, trauma +0.08 (Tank +0.2 dan hitstop 25 ms).
- Sampai garis pertahanan: tanda seru merah kecil di atas musuh, animasi menyerang (maju-mundur).

### 8.4 Gelombang & kartu
- Gelombang bersih: slow-mo 0.5× selama 0.3 s, banner "WAVE CLEAR" masuk `easeOutBack`, `wave_clear` (arpeggio naik).
- Kartu masuk bertahap (jeda 80 ms), melayang idle, rarity punya glow (common putih, rare biru, epic ungu + kilau). Ditekan: scale 0.95. Dipilih: kartu lain jatuh keluar layar, kartu terpilih terbang ke hero + kilau, `card_select`.
- Progress bar gelombang di atas: terisi halus, titik gelombang menyala saat selesai.

### 8.5 Boss
- Intro: layar meredup, banner "BOSS" dengan getar, boss jatuh dari atas → mendarat (trauma +0.6), `boss_roar`.
- HP bar boss besar di atas dengan potongan putih yang menyusul.
- Telegraf slam: lingkaran merah berkedip makin cepat di hero selama 1 detik; slam: trauma +0.7, `boss_slam`.
- Fase 2: boss berkedip merah, teriak, spike di bawah berubah dengan efek gemuruh.
- Mati: **hitstop 250 ms**, slow-mo 0.3× selama 0.8 s, ledakan besar, confetti banyak, `win_fanfare`.

### 8.6 UI
- Semua tombol: tekan = scale 0.92, lepas = overshoot kecil, `ui_tap`.
- Angka (skor, ammo, HP) selalu animasi count up/down, tidak pernah lompat.
- Teks UI minimal dan besar. Jangan pernah menutupi balon atau spike dengan UI.

### 8.7 Haptics
`navigator.vibrate` jika tersedia (Android). iOS Safari tidak mendukung — abaikan tanpa error. Ada toggle di pause.

---

## 9. SFX (prosedural, Web Audio)

Buat modul `audio/sfx.ts` berisi satu fungsi per bunyi. Ketentuan umum:
- `AudioContext` dibuka (resume) pada sentuhan pertama.
- Rantai: tiap bunyi → gain bunyi (tabel volume di config) → master gain → `DynamicsCompressorNode` → output. Tidak boleh clipping.
- Variasi pitch acak kecil (±5%) untuk bunyi yang sering diputar.
- Voice limiting per jenis bunyi.
- Toggle mute + slider master volume (pause & debug panel).

| Nama | Resep awal (boleh diperbaiki selama hasilnya mirip) |
|---|---|
| `inflate_start` | noise pendek bandpass 600 Hz, 80 ms |
| `inflate_loop` | noise bandpass yang frekuensinya naik 800 → 1600 Hz mengikuti `air`, volume rendah, + sesekali "decit" karet (sine 1.2–2 kHz, 30 ms) |
| `ammo_tick` | sine 600 Hz + 20 Hz × ammo, 40 ms, decay cepat |
| `tier_up` | dua nada triangle (mis. C6 + G6), 180 ms; tier lebih tinggi = transpose naik |
| `danger_tick` | klik pendek 2 kHz, interval makin pendek saat makin dekat spike |
| `strain` | sawtooth 90 Hz dengan vibrato 12 Hz, lowpass, volume naik saat air > 0.85 |
| `release_boing` | sine glide 300 → 700 Hz, 120 ms, sedikit vibrato |
| `whoosh` | white noise bandpass sweep 400 → 2500 Hz, 250 ms |
| `tube_fwoop` | sine 200 → 120 Hz + noise, 150 ms |
| `arrival_pop` | noise burst 60 ms (highpass 1 kHz) + thump sine 120 → 60 Hz, 100 ms |
| `ammo_collect` | blip sine sangat pendek, pitch naik per token |
| `spike_pop` | noise burst keras + crackle, lalu "pfff": noise lowpass sweep 1500 → 200 Hz selama 400 ms |
| `overinflate_pop` | `spike_pop` lebih keras + boom rendah 50 Hz |
| `near_miss` | swish pendek + chime tinggi |
| `plop` | sine 250 → 400 Hz, 60 ms |
| `shoot` | square 900 → 400 Hz, 40 ms, volume rendah |
| `empty_click` | klik kering 15 ms |
| `hit` | noise klik 20 ms + sine 200 Hz |
| `enemy_die` | "blup" sine 500 → 1200 Hz 80 ms + koin (dua nada) |
| `hero_hurt` | square 150 → 80 Hz, 150 ms, sedikit distorsi |
| `heartbeat` | dua thump sine 60 Hz |
| `boss_roar` | sawtooth 80 Hz + LFO, lowpass, 1.2 s |
| `boss_slam` | boom besar (noise lowpass + sine 45 Hz) |
| `wave_clear` | arpeggio triangle C-E-G-C naik |
| `card_appear` / `card_select` | whoosh kecil / whoosh + chime |
| `ui_tap` | klik lembut |
| `lose` | tiga nada turun |
| `win_fanfare` | arpeggio + akor panjang |

**Musik** (prioritas rendah, kerjakan terakhir): loop prosedural sederhana 100 BPM yang ceria, volume rendah, toggle terpisah.

---

## 10. Config tuning (`config.ts`)

Semua angka di dokumen ini masuk ke `config.ts` dengan nama jelas dan komentar satuan, dikelompokkan:
`balloon` (rMin, rMax, inflateRate, curve, ammoMax, ammoExp, tierThresholds, overinflateTime, hitboxScale, riseSpeed…), `spawn` (cooldownAfterRelease, cooldownAfterPop, typeWeights), `bonus` (nearMissDistance, nearMissBonus, perfectThreshold, perfectBonus), `hero`, `enemies`, `boss`, `waves` (di `levels.ts`), `upgrades` (di `upgrades.ts`), `juice` (shake, hitstop, slow-mo, partikel, durasi tween), `audio` (volume per bunyi), `palette`.

Debug panel (§11) membaca dan menulis objek config ini secara langsung (live), plus tombol **"Copy config JSON"** dan **"Paste config JSON"** supaya hasil tuning bisa disimpan.

---

## 11. Debug panel & alat tuning

- Toggle: tombol `D` di keyboard, atau ketuk pojok kiri atas 3× di HP.
- Isi (Tweakpane, dikelompokkan sesuai §10): semua angka balon, spike, battle, juice, audio.
- **Cheat**: god mode, amunisi tak terbatas, skip gelombang, langsung boss, spike mati, balon tidak bisa meletus.
- **Time scale** slider 0.1×–2×.
- **Overlay hitbox** (lingkaran balon, kapsul lengan spike, garis pertahanan).
- Info: FPS, jumlah partikel aktif, seed RNG, gelombang saat ini.

---

## 12. Telemetry playtest

Catat per run dan tampilkan di layar Result + `console.log` JSON + tombol "COPY STATS":
- durasi run, gelombang tercapai, menang/kalah, penyebab kalah;
- jumlah balon ditiup / sampai di atas / meletus kena spike (saat tumbuh vs saat terbang) / meletus overinflate;
- rata-rata `air` saat dilepas + histogram 10 bucket;
- jumlah CLOSE! dan PERFECT!;
- total damage diterima, upgrade yang dipilih (urutan).

Target awal untuk tuning (tulis di `DESIGN_NOTES.md` dan bandingkan dengan hasil playtest):
- rata-rata `air` saat dilepas ≈ 0.6–0.7;
- 20–30% balon meletus untuk pemain rata-rata;
- run pertama pemain baru biasanya kalah di gelombang 4–5 atau boss;
- satu run 3–5 menit.

---

## 13. Performa & kualitas

- 60 fps stabil; object pooling untuk peluru, partikel, floating text, token amunisi.
- Tidak ada alokasi objek baru di dalam loop update kalau bisa dihindari.
- Tidak ada error/warning di console.
- Unit test kecil (Vitest) untuk: collision lingkaran–kapsul, rumus ammo/tier, spawn gelombang deterministik dengan seed, dan **validator pola spike** (§4.5) untuk semua pola di `levels.ts`.
- Setelah tiap milestone: jalankan dev server, buka di browser (kalau ada Playwright, ambil screenshot portrait 390×844 dan cek console), perbaiki error, lalu tulis ringkasan singkat di `CHANGELOG.md`.

---

## 14. Urutan kerja (milestone)

**M0 — Pahami & siapkan**
- Baca dokumen ini, lihat video referensi (kalau ada) sesuai §1.
- Tulis `DESIGN_NOTES.md`: pemahamanmu tentang core loop dalam 10 baris, hal yang kamu pelajari dari video, asumsi, pertanyaan.
- Scaffold project (Vite + TS + Phaser), `config.ts`, fixed timestep, sistem juice dasar (§8.0), debug panel kosong.

**M1 — Ruang balon (fokus FEEL)**
- Tiup / lepas / naik / pipa / meletus, spinner & orbiter, collision, overinflate, CLOSE!, PERFECT!, angka ammo, tier.
- Semua juice & SFX di §8.1 untuk balon.
- Arena atas sementara: cukup target dummy yang menerima amunisi.
- **BERHENTI di sini dan minta saya mencoba di HP.** Jangan lanjut sebelum saya bilang feel-nya oke. Ini bagian terpenting.

**M2 — Battle**
- Hero, tembak otomatis, musuh (Grunt/Runner/Tank), garis pertahanan, HP, gelombang 1–5, transisi pola spike, juice §8.2–8.3.

**M3 — Roguelike & boss**
- Kartu upgrade, jenis balon, boss 2 fase, juice §8.4–8.5.

**M4 — Layar & polish**
- Title, pause, result, tutorial FTUE, semua SFX §9, haptics, reduced motion, UI juice §8.6.

**M5 — Tuning tools & rilis**
- Debug panel lengkap, telemetry, build `dist/`, README (cara main, cara tes di HP, cara tuning, cara deploy ke itch.io).
- Musik (opsional).

Setelah tiap milestone (selain M1 yang wajib berhenti), beri ringkasan singkat: apa yang selesai, apa yang perlu saya cek, apa yang belum.

---

## 15. Definisi selesai (checklist)

- [ ] Satu jari: tahan = tiup, lepas = kirim. Responsif tanpa delay terasa.
- [ ] Pemain langsung paham dalam 5 detik tanpa membaca teks panjang.
- [ ] Ada momen "nyaris" yang bikin deg-degan (spike lewat tipis, balon hampir penuh).
- [ ] Meletus terasa sakit tapi adil (hitbox memaafkan, bukan karena glitch).
- [ ] Amunisi yang sampai ke hero terasa memuaskan (token terbang, angka naik, bunyi).
- [ ] Battle terbaca: jelas musuh mana yang berbahaya, kapan hero kehabisan peluru.
- [ ] Semua bunyi di §9 ada dan tidak berisik saat ramai.
- [ ] 60 fps di HP, tanpa error console, jalan di Chrome Android dan Safari iOS.
- [ ] Semua angka bisa dituning live dari debug panel dan diekspor sebagai JSON.
- [ ] `npm run build` menghasilkan `dist/` yang bisa diupload.

## 16. Di luar cakupan (jangan dikerjakan dulu)

Meta progression (toko, gacha, level akun), monetisasi/iklan, backend/login, lebih dari 1 stage (tapi struktur `levels.ts` harus siap untuk stage tambahan), lokalisasi selain file `strings.ts`.
