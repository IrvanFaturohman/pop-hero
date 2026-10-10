# Pop Hero (prototype)

Prototype web untuk menguji core loop "tiup balon → peluru hero", gabungan gaya **Puff Up** (ruang balon) dan **Claw Master** (battle bergiliran, alur run & progresi). Brief awal: `PROMPT.md` (banyak bagian sudah diganti; desain sekarang di `DESIGN_NOTES.md` §0b, analisis video referensi di §0c). Riwayat: `CHANGELOG.md`.

**Main sekarang:** https://irvanfaturohman.github.io/pop-hero/ (HP atau desktop, portrait)

## Cara main

1. **Giliranmu (ruang balon, bawah)**: tekan & tahan di ruang abu-abu → balon muncul di jarimu dan membesar (bola di dalamnya = peluru). Geser untuk menghindari bola berduri; **kena duri = meletus**, saat ditiup maupun saat terbang. Lepas → balon terbang lurus ke atas (lewati power-up untuk mengambilnya) dan mendorong **rantai emas**; balon yang sudah di rantai aman.
2. **Gembok**: angka di gembok = total yang harus dicapai balon-balonmu giliran ini (balon sebanyak yang perlu; balon yang meletus hanya membuang waktu). Tercapai → **rantai putus**, balon lolos ke atas, pecah jadi bola peluru untuk hero.
3. **Hero menembak** semua peluru (FIRE!), lalu **giliran musuh**: semua musuh menyerang hero, musuh baru masuk. Kalau musuh di layar habis, sisa peluru disimpan untuk giliran berikutnya.
4. Gelombang bersih → **sisa peluru terbawa ke gelombang berikutnya** → pilih **1 dari 3 kartu kemampuan**. Tiap kemampuan punya 3 level: level 1 gratis, level 2 = 1★, level 3 = 3★. Setelah level 3 bisa muncul kartu **evolusi merah** (bayar ★ merah). Bintang didapat dari **power-up bintang** (emas = ★, putih = ★ merah). Power-up melayang di ruang balon; balon yang terbang melewatinya membawa 1 peluru spesial: api (membakar), es (membekukan, musuh lewat 1 serangan), bom (ledakan area), heal (pulihkan HP).
5. **10 gelombang**: elite **Beast King** di gelombang 5, boss **Claw King** di gelombang 10. Si Claw King menjulurkan cakar ke ruang balon tiap giliran (balon yang ditiup meletus kalau kena).
6. Selesai run → **koin** → di **Home**, tab **UPGRADES** (terbuka setelah run pertama) membeli Damage / Health / Armor permanen. Pause → HOME untuk keluar run (tanpa hadiah).

Desktop: klik-tahan mouse, atau **Space** (posisi mouse = tempat balon).

## Menjalankan

```bash
npm install
npm run layerlab       # salin art Layer Lab dari project Unity (lihat di bawah)
npm run dev            # http://localhost:5173 (HMR, untuk ngoding)
npm run build          # folder dist/ statis
npx vite preview --host --port 5173   # sajikan dist/ ke jaringan (paling cepat di HP)
```

**Tes di HP**: jalankan `npm run build` lalu `npx vite preview --host --port 5173`, buka alamat `Network:` (mis. `http://192.168.1.20:5173`) dari Chrome Android / Safari iOS di Wi-Fi yang sama. Mode dev (`npm run dev -- --host`) juga bisa, tapi mengirim ~20 MB (lambat di HP). Kalau halaman gagal dimuat, pesan error tampil di layar. iOS layar penuh: Share → Add to Home Screen.

## Art Layer Lab

Karakter, musuh, dan UI memakai paket Layer Lab (2D Minimal-CharacterMaker, GUI Pro-MinimalGame) dari project Unity `pop-hero-unity`. `npm run layerlab` merakit tiap karakter dari part CharacterMaker (resepnya di `scripts/layerlab-chars.mjs`), menyalin PNG yang dipakai ke `public/assets/layerlab/`, dan menulis `manifest.json` (posisi part dari prefab Unity, border 9-slice dari file `.meta`). Folder itu **di-gitignore**: aset berbayar tidak boleh ada mentah di repo publik, tapi tetap ikut di build/deploy. Lokasi default `../pop-hero-unity/Assets/StorePackages/Layer Lab`; bisa diganti dengan argumen atau `LAYERLAB_DIR`. Tanpa folder itu game tetap jalan dengan art prosedural lama.

## Tuning

- Panel debug: tombol **D**, atau **tap pojok kiri atas 3×** di HP.
- Semua angka di `src/config.ts` (balon, fisika, rantai, giliran, musuh, boss, juice, audio, palet) dan pola duri di `src/levels.ts` bisa diubah live.
- Cheat: god mode, amunisi tak terbatas, balon tidak meletus, duri mati, **Skip wave**, **Go to elite / Go to boss**, **+3★ +1★ merah**, time scale 0.1–2×, overlay hitbox.
- Reset progres meta (koin, upgrade): hapus `pophero.meta` di localStorage (DevTools → Application).
- *Run validator* → heatmap % balon selamat per pola duri. *Config JSON → Copy / Paste / Reset* untuk menyimpan hasil tuning.

## Playtest & telemetry

Di akhir run: layar hasil (gelombang, waktu, balon ditiup/terkumpul/meletus, rata-rata ukuran, CLOSE!/PERFECT!, gembok terbuka/gagal, damage, penyebab kalah, upgrade; di JSON juga sisa peluru per wave + HP dari sisa peluru). **COPY STATS** menyalin JSON-nya; JSON yang sama juga di-`console.log`.

## Deploy ke itch.io

1. `npm run build` → folder `dist/` (path relatif, bisa di subfolder).
2. Zip **isi** folder `dist/` (index.html harus di root zip).
3. itch.io → *Create new project* → Kind: **HTML** → upload zip → centang *This file will be played in the browser*.
4. Viewport: 720×1280 (atau centang *Mobile friendly* + orientasi portrait), aktifkan *Fullscreen button*.

**GitHub Pages**: `npm run deploy` menjalankan test, build, lalu mem-push isi `dist/` ke branch `gh-pages` (Pages menyajikan branch itu). Jalankan lagi setiap ada perubahan.

Netlify: unggah isi `dist/` apa adanya.

## Perintah lain

```bash
npm test                    # unit test (Vitest): collision, rumus ammo/tier, gelombang, rantai/balon, validator duri, kartu, meta, cakar boss
npm run typecheck
npm run shot                # screenshot 390x844 + cek console (butuh server & Google Chrome)
node scripts/playtest.mjs   # playtest otomatis singkat (butuh dev server)
```

## Struktur kode

- `src/logic/` — aturan murni tanpa Phaser (balon, fisika balon & rantai, duri, cakar boss, battle, senjata, boss, giliran, gelombang, meta/koin, validator, telemetry). Fixed timestep 60 Hz, RNG ber-seed.
- `src/abilities.ts` — kartu kemampuan (level, harga bintang, evolusi). `src/levels.ts` — 10 gelombang + pola duri.
- `src/view/` — semua gambar (dibuat dengan kode, tanpa aset eksternal).
- `src/juice/` — shake, hitstop, slow-mo, spring, partikel, teks melayang, flash.
- `src/audio/` — SFX & musik prosedural (Web Audio).
- `src/scenes/` — Boot, Title, Home, Game (+ GameUi, feedback). `src/debug/` — panel Tweakpane.
