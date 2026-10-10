# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Pop Hero is a portrait mobile web prototype (Phaser 3 + TypeScript + Vite) that combines a **Puff Up**-style balloon room (bottom half) with a **Claw Master**-style turn-based horizontal battle (top half). Balloons blown in the room become bullets for the hero. It is live at https://irvanfaturohman.github.io/pop-hero/ (repo `IrvanFaturohman/pop-hero`).

Design sources, in priority order:
1. **Reference videos** in `references/` (frames extracted to `references/frames/`, gitignored): `clawmaster.mov`, `puffup.mov`, and `clawmaster_yt.mp4`, a full 22-minute Claw Master walkthrough whose run flow, card system and meta the game now follows (frame-by-frame findings in `DESIGN_NOTES.md` §0c; timestamped contact sheets in `references/frames/yt_sheets/`). When they disagree with the written brief, follow the videos for both gameplay and art (art drawn from scratch, never copied). Flag brief-vs-video differences to the user rather than silently picking the brief.
2. `DESIGN_NOTES.md` §0b (current design summary), §0c (video analysis), §0a/§0 (decisions from playtests that override the brief), plus open questions.
3. `PROMPT.md`, the original brief. Parts of it are outdated (pump/pipe, spinners, vertical real-time battle).

`CHANGELOG.md` has one entry per milestone or playtest round (`M<n>` / `M<n>.<m>`, newest first).

Language: reply to the user in Indonesian. `README.md`, `DESIGN_NOTES.md` and `CHANGELOG.md` are written in Indonesian. Code identifiers and comments are in English (the brief requires this), and so are commit messages. In-game UI text is English and lives in `src/strings.ts`.

## Commands

```bash
npm run layerlab                         # copy Layer Lab art from the Unity project into public/assets/layerlab/ (gitignored)
npm run dev                              # Vite dev server on :5173 (HMR)
npm test                                 # Vitest, tests/**/*.test.ts
npx vitest run tests/waves.test.ts       # one test file
npx vitest run -t "pattern w1"           # tests matching a name
npm run typecheck                        # tsc --noEmit (tsconfig covers src + tests)
npm run build                            # typecheck + vite build -> dist/ (relative base './')
npx vite preview --host --port 5173      # serve dist/ on the LAN for phone testing
npm run deploy                           # test + build, then publish dist/ to the gh-pages branch
npm run shot                             # 390x844 screenshot + console dump (needs a running server)
node scripts/playtest.mjs [url]          # scripted hold/release playtest (needs the dev server)
```

- The user playtests on their phone over LAN. Use the `build` + `vite preview --host` path for that: dev mode ships about 20 MB and is slow on a phone. After a change, rebuild and restart the preview server so they only need to refresh.
- `scripts/deploy.sh` force-pushes a fresh one-commit history to `gh-pages`. That is expected; it never touches `main`. GitHub Actions is not used because the gh token lacks the `workflow` scope.
- `shot.mjs` and `playtest.mjs` use `playwright-core` with the locally installed Google Chrome (`channel: 'chrome'`) and write into `screenshots/` (gitignored). `playtest.mjs` reads `window.__pop`, which only exists in dev builds.

## Architecture

**Pure logic vs. presentation.** `src/logic/` never imports Phaser. It is deterministic for a given seed (`Rng`, seeded from `config.debug.seed`), runs at a fixed 60 Hz, and is unit-tested directly. The brief keeps this split so the logic can later be ported to Unity. `view/` (procedural drawing), `juice/` (shake, hitstop, slow-mo, particles, floating text), `audio/` (procedural Web Audio) and `scenes/` are the only places that touch Phaser or the DOM.

**Event queues.** The three logic systems, `BalloonRoom` (`logic/room.ts`), `Battle` (`logic/battle.ts`) and `TurnRunner` (`logic/turns.ts`), each advance in `step(dt)` and push typed events into their `.events` array. `GameScene.step()` drains them every fixed step and is where the systems are wired together: room `arrive` calls `battle.deliver()`, turn `waveIntro`/`bossIntro` swap the spike pattern and balloon type pool, `cards` opens the upgrade picker, and so on. Visual and audio reactions live in `scenes/feedback.ts` (room), `scenes/battleFeedback.ts` (battle) and `scenes/gameUi.ts` (overlays/HUD). To add gameplay, emit a new event from logic and react to it in the scene layer. Do not call into views from logic.

**Turn flow.** `TurnRunner` is a phase machine: `blow -> unlock -> burst` (or `failed`) `-> collect -> shoot -> enemy -> blow`, with `clear -> cards` between waves. A run is the 10 waves of `stage1`; bosses are part of a wave (`WaveDef.boss`: Rat King elite at wave 5, Digger Mole at wave 10), and clearing the last wave is victory. The header comment in `logic/turns.ts` is the authoritative description. While the Mole lives, every `blow` phase digs its claw (`logic/claw.ts`) into the balloon room; the room treats it as a spike for balloons being blown and as a solid obstacle for released balloons and bouncing spikes.

**Run vs. meta state.** Per run, `GameScene` owns the `AbilitySet` (card levels/evolutions) and the star `Wallet`; star balloons arriving add stars, and every card pick recomputes the hero numbers with `heroMods()` -> `Battle.setMods()` (plus `room.mods.ammoMult`). Between runs, `logic/meta.ts` holds coins and the permanent Damage/Health/Armor levels (persisted by `storage.ts`); `heroBase(meta)` seeds `new Battle(rng, base)`, so max HP is dynamic (`battle.maxHp`, never `config.hero.hp`).

**Time.** `GameScene.update()` runs an accumulator: `TimeControl` (`juice/time.ts`) scales real dt for hitstop and slow-mo, logic advances only in `FIXED_DT` steps (capped by `MAX_STEPS_PER_FRAME`), and rendering interpolates with the leftover alpha. Never advance gameplay state from render code or from Phaser tweens.

**Tuning data.**
- `src/config.ts` holds every tuning number (layout, balloon, physics, chain, turns, enemies, boss, juice, audio, palette); other files should not have magic numbers. It must stay a plain mutable object: the Tweakpane debug panel (`debug/panel.ts`) edits it live, and `debug/tuning.ts` merges JSON copy/paste/reset into it in place. Read values at use time instead of copying them into module-level constants.
- `src/levels.ts`: stage 1's 10 waves (enemies, lock number, spike pattern, balloon types, optional boss), spike patterns. `src/abilities.ts`: the 9 three-level abilities, evolutions, star prices and the offer roll (always at least one affordable card when possible).
- Damage numbers use the reference scale: bullets deal 10, hero HP is 300, enemy HP is in the hundreds. Percentage cards (Attack +15%, Multishot extras at 30%) rely on that granularity.
- `tests/validator.test.ts` runs the spike-pattern validator (`logic/validator.ts`) on every pattern in `levels.ts`. Changing spike counts or speeds can make it fail, and that failure is a real balance signal.

**Rendering.** The logical canvas is 720x1280, y pointing down, with all positions in `config.layout`. `main.ts` sizes the render buffer to the CSS size x DPR (capped at 2), and the camera zoom maps that back to logical space. Characters, monsters and UI use the Layer Lab packs from the Unity project (`scripts/layerlab-sync.mjs` copies them and writes `manifest.json`: part layouts from the prefabs, 9-slice borders from the `.meta` files). `view/layerlab.ts` loads them in Boot, `view/rig.ts` builds a character from its separate parts and animates it in code (the packs ship no animation clips), `view/gui.ts` has the UI blocks (9-slice buttons, panels, ribbons, bars, icons). Everything else (balloons, spikes, room, arena, effects) is still generated at boot (`view/textures*.ts`), and every Layer Lab view falls back to the procedural art when the files are missing. Sounds are synthesized (`audio/synth.ts`). The Fredoka font is bundled via `@fontsource`. `view/ninesliceFix.ts` patches a Phaser 3.90 NineSlice batching bug (slices on a batch boundary lose most of their triangles).

**Lifecycle.** `scenes/services.ts` holds page-level singletons (input controller, debug panel) that survive `scene.restart()`. Scenes run Boot -> Title -> Home -> Game -> (result, CONTINUE) -> Home; the pause menu's HOME leaves a run without rewards. `storage.ts` stores the tutorial flag, pause-menu settings and the meta state (`pophero.meta`) in `localStorage`.

**Debug.** Open the panel with **D**, or tap the top-left corner 3x on a phone. It has cheats (god mode, infinite ammo, no pop, spikes off, skip wave, go to elite / boss, +stars, time scale), a hitbox overlay, and a validator heatmap. In dev builds `window.__pop` exposes `{ room, battle, waves, turns, abilities, wallet, scene, config }` (`turns.goWave(i)` jumps to any wave). For balance work, a headless bot over the pure logic (blow balloons, pick cards, many seeds) is far faster than browser playtests; keep such sims outside the repo. At the end of a run, stats are `console.log`ged as JSON and can be copied from the result screen (COPY STATS, `logic/telemetry.ts`).

## Conventions

- Keep each file under about 400 lines (brief requirement). Split by responsibility instead of growing `GameScene.ts`, which already delegates to `gameUi`, `feedback` and `battleFeedback`.
- When gameplay or numbers change, add a `CHANGELOG.md` entry (Indonesian) and update `DESIGN_NOTES.md` §0b if the current design summary changes.
- Characters and UI come from Layer Lab (user decision, 2026-10-10). Its raw files stay out of git (`public/assets/layerlab/` is gitignored: paid asset, public repo). Other art is drawn in code (`view/textures*.ts`).

## Working rules

The user's general rules, imported from `.claude/context/`. The project-specific notes above take precedence. Milestone numbers (`M8.1`) appear only in `CHANGELOG.md` headings, never in commit messages (`GIT.md` bans planning jargon there).

@.claude/context/COMMUNICATION.md
@.claude/context/CODING.md
@.claude/context/CONTEXT.md
@.claude/context/MEMORY.md
@.claude/context/GIT.md
@.claude/context/GITHUB.md
@.claude/context/SECURITY.md
@.claude/context/GRAPHIFY.md
