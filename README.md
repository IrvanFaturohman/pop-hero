# Pop Hero (prototype)

Prototype web untuk menguji core loop "tiup balon → peluru hero", gabungan gaya **Puff Up** (ruang balon) dan **Claw Master** (battle bergiliran). Brief awal: `PROMPT.md` (beberapa bagian sudah diganti oleh keputusan playtest, lihat `DESIGN_NOTES.md` §0a/§0). Riwayat: `CHANGELOG.md`.

**Main sekarang:** https://irvanfaturohman.github.io/pop-hero/ (HP atau desktop, portrait)

## Cara main

1. **Giliranmu (ruang balon, bawah)**: tekan & tahan di ruang abu-abu → balon muncul di jarimu dan membesar (angka = peluru). Geser untuk menghindari bola berduri; **kena duri saat ditiup = meletus**. Lepas → balon terbang (sudah kebal duri) dan mendorong **rantai emas**.
2. **Gembok**: angka di gembok = total yang harus dicapai balon-balonmu giliran ini (3 balon). Tercapai → **rantai putus**, balon lolos ke atas, pecah jadi bola peluru untuk hero. Jatah habis & gembok masih terkunci → giliran tanpa peluru.
3. **Hero menembak** semua peluru (FIRE!), lalu **giliran musuh**: semua musuh menyerang hero, musuh baru masuk. Kalau musuh di layar habis, sisa peluru disimpan untuk giliran berikutnya.
4. Gelombang bersih → **sisa peluru jadi HP** (4 peluru = 1 HP, peluru kembali ke 0) → pilih **1 dari 3 kartu upgrade**. Mulai gelombang 2 ada **balon spesial**: api (membakar), es (membekukan, musuh lewat 1 serangan), bom (ledakan area), heal (pulihkan HP).
5. 5 gelombang + **boss Rat King** (slam ditandai lingkaran merah di bawah hero, memanggil tikus, fase 2 di HP 50%).

Desktop: klik-tahan mouse, atau **Space** (posisi mouse = tempat balon).

## Menjalankan

```bash
npm install
npm run dev            # http://localhost:5173 (HMR, untuk ngoding)
npm run build          # folder dist/ statis
npx vite preview --host --port 5173   # sajikan dist/ ke jaringan (paling cepat di HP)
```

**Tes di HP**: jalankan `npm run build` lalu `npx vite preview --host --port 5173`, buka alamat `Network:` (mis. `http://192.168.1.20:5173`) dari Chrome Android / Safari iOS di Wi-Fi yang sama. Mode dev (`npm run dev -- --host`) juga bisa, tapi mengirim ~20 MB (lambat di HP). Kalau halaman gagal dimuat, pesan error tampil di layar. iOS layar penuh: Share → Add to Home Screen.

## Tuning

- Panel debug: tombol **D**, atau **tap pojok kiri atas 3×** di HP.
- Semua angka di `src/config.ts` (balon, fisika, rantai, giliran, musuh, boss, juice, audio, palet) dan pola duri di `src/levels.ts` bisa diubah live.
- Cheat: god mode, amunisi tak terbatas, balon tidak meletus, duri mati, **Skip wave**, **Go to boss**, time scale 0.1–2×, overlay hitbox.
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
npm test                    # unit test (Vitest): collision, rumus ammo/tier, gelombang, rantai/balon, validator duri
npm run typecheck
npm run shot                # screenshot 390x844 + cek console (butuh server & Google Chrome)
node scripts/playtest.mjs   # playtest otomatis singkat (butuh dev server)
```

## Struktur kode

- `src/logic/` — aturan murni tanpa Phaser (balon, fisika balon & rantai, duri, battle, senjata, boss, giliran, gelombang, validator, telemetry). Fixed timestep 60 Hz, RNG ber-seed.
- `src/view/` — semua gambar (dibuat dengan kode, tanpa aset eksternal).
- `src/juice/` — shake, hitstop, slow-mo, spring, partikel, teks melayang, flash.
- `src/audio/` — SFX & musik prosedural (Web Audio).
- `src/scenes/` — Boot, Title, Game (+ GameUi, feedback). `src/debug/` — panel Tweakpane.
