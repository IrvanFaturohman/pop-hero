# DESIGN NOTES — Pop Hero (prototype)

## 0c. Analisis video Claw Master dari YouTube (2026-10-09)

Sumber: youtube.com/watch?v=AxqvqGEy6BU (22 menit, 3 run: kalah di gelombang 5, kalah di boss, menang). File lokal `references/clawmaster_yt.mp4`, 1 frame/detik di `references/frames/yt/`, lembar kontak bertanda waktu di `references/frames/yt_sheets/` (semua di-gitignore). Yang diikuti adalah mekanik dan alurnya; karakter dan art tetap digambar sendiri.

**Satu run = 1 chapter ("Enchanted Forest"), 10 gelombang.**
- Progress bar di atas layar: satu node per gelombang (hijau ✓ selesai, oranye = gelombang elite ke-5, merah tengkorak = boss ke-10). Muncul sebentar saat pergantian gelombang.
- Musuh satu gelombang masuk sekaligus sebagai kelompok kecil. Isi gelombang di run 2: 1) 1 tikus · 2) 3 tikus · 3) 2 tikus + 1 babi hutan · 4) 3 babi · 5) tikus raksasa (mini-boss) + 4–5 tikus · 6) 2 babi + 1 lebah · 7) 4 tikus + beruang · 8) tikus + babi + lebah (~7) · 9) 2 babi + tikus · 10) banner "BOSS incoming!!" → cacing berduri + tikus.
- Setelah **setiap** gelombang (termasuk gelombang 9, tepat sebelum boss): "Select a new ability".
- Akhir run: DEFEAT atau VICTORY + hadiah koin (x90 saat kalah di gelombang 5, x350 saat menang). Durasi: ~5 menit (kalah gel. 5), ~10 menit (kalah di boss), ~6 menit (menang).

**Satu giliran.**
1. Mesin capit di bawah berisi tumpukan bola. Tahan & geser = capit bergerak kiri-kanan (ada kolom bayangan di bawahnya), lepas = capit turun, menjepit beberapa bola, lalu naik.
2. Bola dilempar melengkung ke hero; bintang terbang ke HUD. Kamera zoom ke arena, mesin tersembunyi.
3. Hero menembakkan semua peluru (angka di bawah bar HP turun), angka damage muncul di atas musuh, musuh berkedip putih.
4. Musuh yang sudah dekat menyerang hero, yang lain maju. Kembali ke mesin capit.
- Tumpukan makin tipis tiap giliran; saat tinggal sedikit muncul **"BONUS"** dan tumpukan diisi ulang dengan kilau emas.
- Sisa peluru tetap tersimpan antar gelombang (Pop Hero sekarang juga begitu, M7; dulu sisa peluru jadi HP).

**Isi tumpukan.** Bola putih = peluru; oranye = api; ungu = bom; kepingan salju cyan = es; hati merah = heal; **bintang kuning** = mata uang kartu; **bintang merah** = mata uang langka. Run pertama hanya putih + oranye + bintang; run berikutnya lebih beragam.

**Kartu kemampuan.**
- 3 kartu per pilihan. Tiap kemampuan punya **3 level** (3 permata di kartu); mengambil kartu yang sama menaikkan level.
- Harga: level 1 **Free**, level 2 = 1 bintang kuning, level 3 = 3 bintang kuning. Tombol abu-abu kalau bintang tidak cukup.
- Kemampuan yang sudah level 3 bisa muncul sebagai **kartu merah (evolusi)** seharga 1 bintang merah, mis. Crit Chance → "Large Bullets trigger Execution".
- Kemampuan yang dimiliki tampil sebagai ikon kecil berpermata di kiri atas, di bawah penghitung bintang.
- Daftar (angka level 1 → 3 sejauh terbaca): Multishot (+1 peluru, tembakan ekstra 30% damage), Attack Damage (+15%), Bounce (memantul 1×/30% → 2×/50%), Lifesteal (pulih 3% HP tiap musuh mati), Claw Size (+7% → +10%), Crit Chance (+5% → +7% → +15%), Crit Damage (+20% → +50%), Health Boost (HP maks +20%), Knockback (dorong musuh kecil, 10% force).

**Boss.** Gelombang 5: tikus raksasa bersama tikus kecil. Gelombang 10: cacing berduri; badannya **menjulur masuk ke mesin capit** dari samping (posisinya pindah tiap giliran) dan menghalangi capit. Bola es membekukan boss (berwarna cyan).

**Meta (di luar run).**
- Home: chapter "1 Enchanted Forest", tombol START (biaya 5 energi, energi 25/25), ikon Chapter Rewards & Patrol, navigasi bawah Battle + Upgrades (tab lain terkunci).
- Setelah run pertama: popup "NEW FEATURE! UNLOCKED UPGRADES" dan tangan tutorial ke tab Upgrades.
- Upgrades: pangkat hero "Apprentice 1" dengan bar ke "Apprentice 2" (hadiah di 10 dan 20), 3 stat permanen DAMAGE +5, HEALTH +10, ARMOR +1, masing-masing 10 koin.

**Beda dengan Pop Hero sekarang.**

| Aspek | Video | Pop Hero sekarang |
|---|---|---|
| Panjang run | 10 gelombang, elite di 5, boss di 10 | 5 gelombang + boss |
| Musuh | kelompok kecil per gelombang (1–8), masuk sekaligus | 12–36 per gelombang, masuk 4–8 per giliran |
| Jenis musuh | tikus, babi hutan, lebah (terbang), beruang, tikus raksasa, cacing | grunt, runner, tank, Rat King |
| Progress | bar node di atas | banner "WAVE n" |
| Kartu | 9 kemampuan × 3 level, harga bintang, kartu evolusi | 11 kartu berkelangkaan, tanpa level/harga |
| Mata uang run | bintang kuning & merah dari tumpukan | tidak ada |
| Meta | koin, upgrade permanen, pangkat hero, chapter, energi | tidak ada |
| Boss | badan cacing masuk ke mesin capit | Rat King: slam + panggil tikus |
| Sumber peluru | mesin capit | ruang balon (Puff Up) |

## 0b. Ringkasan desain sekarang (2026-10-09, mengikuti video §0c)

**Alur besar**: Title → **Home** (koin, chapter "1 WHISPER WOODS", START, tab UPGRADES) → run 10 gelombang → layar VICTORY/DEFEAT + koin → Home. Koin membeli upgrade permanen (Damage +1, Health +15, Armor +1 per level); tiap 10 level pangkat hero naik ("APPRENTICE n") dan dapat +100 koin. Tab UPGRADES terbuka setelah run pertama (popup "NEW FEATURE!"). Tidak ada energi (keputusanmu).

**Satu giliran**: tiup balon di ruang Puff Up **sebanyak yang perlu** (tanpa batas 3 balon, keputusanmu 2026-10-09), arahkan ke power-up, hindari duri saat meniup dan saat terbang → balon mendorong rantai, nilainya masuk ke gembok → gembok terpenuhi = rantai putus, balon pecah jadi peluru → hero menembak → semua musuh menyerang. Tidak ada giliran gagal lagi: balon yang meletus hanya membuang waktu (dan power-up yang dibawanya). Sumber peluru tetap balon (keputusanmu), bukan capit.

**Satu run = 10 gelombang kecil** yang masuk sekaligus (seperti video): 1 tikus · 3 tikus · 2 tikus + babi · 3 babi · **elite Rat King** + 4 tikus · 2 babi + kelelawar · 4 tikus + beruang · 3 tikus + 2 babi + 2 kelelawar · 2 tikus + 2 babi + beruang + kelinci · **boss Digger Mole** + 3 tikus. Progress bar node di atas (hijau ✓, oranye = elite, tengkorak merah = boss). Kartu kemampuan setelah tiap gelombang kecuali yang terakhir.

**Kartu kemampuan** (9 × 3 level): Multishot, Attack Damage, Bounce, Lifesteal, Balloon Power (pengganti "Claw Size"), Crit Chance, Crit Damage, Health Boost, Knockback. Level 1 gratis, level 2 = 1★, level 3 = 3★. Setelah level 3 bisa muncul **kartu evolusi merah** (1 ★ merah): Crit Chance → Execution (dari video), Bounce → Ricochet, Health Boost → Second Wind. Minimal satu kartu selalu bisa dibeli; kalau tidak ada, muncul SKIP. Kemampuan yang dimiliki tampil sebagai ikon berpermata di kiri atas.

**Power-up (M7, 2026-10-10)**: tiap giliran 2 power-up melayang di ruang balon (kebal duri). Arahkan balon: balon yang dilepas dan terbang melewatinya membawanya, maks 1 per balon. **1 power-up = 1 peluru spesial**, bukan mengubah semua peluru: api (burn), es (beku), bom (300 damage area), heal (+60 HP), bintang (+1★), bintang merah (+1★ merah, mulai gelombang 4). Ukuran balon menentukan jumlah peluru biasa, power-up menentukan efek. Terlihat di dalam balon (ikon + bola besar berwarna), terbang ke hero sebagai token besar, lalu menunggu di slot di samping angka amunisi; ditembak paling dulu.

**Bahaya terbang**: duri meletuskan balon yang sedang terbang; balon yang sudah tergabung di bawah rantai aman dan padat (duri memantul, kilau perisai cyan). Cakar Digger Mole memantulkan balon terbang dan tidak meletuskan balon yang tergabung.

**Bintang**: hanya dari power-up bintang. Bintang hanya berlaku dalam satu run.

**Art (M8, 2026-10-10)**: karakter, monster, dan UI dari paket Layer Lab (lihat CHANGELOG M8); elite = Slime King, boss = Magma King. Nama kode tetap `ratking` / `mole`. Belum dibahas: cakar boss di ruang balon masih gambar lama (cakar tikus tanah) dan kurang cocok dengan slime.

**Boss Digger Mole** (sekarang tampil sebagai Magma King; desain lama: tikus tanah berhelm tambang): tiap giliranmu ia menggali cakar dari dinding kiri/kanan ruang balon di ketinggian acak (bergantian sisi). Balon yang sedang ditiup meletus kalau kena cakar; balon yang dilepas memantul di sekitarnya; duri juga memantul. Slam tiap 2 giliran musuh (fase 2: tiap giliran, cakar lebih panjang), panggil 2 tikus tiap 3 giliran. Rat King di gelombang 5 sama seperti dulu (slam + panggil tikus + fase 2).

**Tembakan & peluru** (diukur dari video, M6.2; tempo diturunkan ke 2,0–2,4/detik di M8.1 karena terasa terlalu cepat): hero menembak satu per satu; balon penuh = 10 peluru; satu giliran ~10–18 peluru (video 9–15).

**Sisa peluru**: terbawa ke gelombang berikutnya seperti di video (keputusanmu 2026-10-10, menggantikan sisa peluru → HP). Di akhir run hilang. Sumber HP sekarang hanya power-up heal, Lifesteal, Health Boost, dan Second Wind.

**Angka utama** (`config.ts` / `levels.ts`): skala seperti video, peluru 30 damage, HP hero 300. Gembok 7/8/9/10/11/11/12/12/13/13. HP musuh: tikus 210, kelinci 120, babi 520, kelelawar 270, beruang 1240, Rat King 2100, Digger Mole 5200. Damage per serangan 16/12/30/18/46, slam 56/72. Koin: 22 per gelombang + 130 kalau menang (≈90 kalau kalah di gelombang 5, 350 kalau menang, mirip video).

**Simulasi bot** (20 seed, bot meniup 0.55–0.8 dan menghindari duri tanpa menggeser balon, tanpa batas balon): tanpa upgrade permanen menang 25% (kalah di gelombang 5–9, mirip run pertama di video); dengan 5 level upgrade 60%; dengan 11 level 90%. Satu run 3–9 menit, elite dan boss masing-masing ~6–7 giliran. Tanpa batas balon, ruang balon tidak punya kondisi gagal; tekanannya tinggal waktu, bintang yang hilang kalau balon bintang meletus, dan sisa peluru (balon besar = lebih banyak sisa = lebih banyak HP di akhir gelombang).

**Pertanyaan terbuka**:
1. Evolusi: di video hanya terlihat satu (Crit Chance → Execution). Ricochet dan Second Wind tambahan saya supaya bintang merah berguna. Oke, atau mau evolusi lain?
2. Knockback: battle kita tidak punya jarak (musuh menyerang tiap giliran), jadi Knockback = peluang musuh kecil kehilangan 1 serangan (10/20/30%). Oke?
3. Kartu balon lama (Thick Rubber, Slow Gears, Near-Miss Pro, Greedy, Big Lungs, Pierce, Twin Shot) dihapus supaya daftar sama dengan video. Mau ada yang dikembalikan?
4. "BONUS" isi ulang tumpukan di video tidak punya padanan di balon, jadi dilewati.
5. ~~Rapid Fire / Critical Shot~~ dan ~~es~~: tetap seperti sebelumnya (Crit Chance dari video; es = musuh lewat 1 serangan).
6. Power-up: kapan dan berapa yang muncul (sekarang 2 per giliran, sisa diganti tiap giliran), dan variasi gerak (diam / melayang / berpindah) belum diputuskan.
7. Visual gembok/rantai masih versi lama; mau dibuat lebih "menahan beban" (rantai menegang, gembok goyang makin dekat 0)?

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
