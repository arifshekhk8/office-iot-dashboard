# PLAN — Office IoT Dashboard (Techathon Nationals & Rover Summit)

Smart office energy monitoring: 15 simulated devices (6 fans, 9 lights across 3
rooms) → one backend → live web dashboard + Discord bot.

## Architecture decision record

**Stack: single TypeScript monorepo (npm workspaces).**

| Piece | Choice | Why |
|---|---|---|
| Monorepo | npm workspaces | Already installed, zero config, enough for 4 packages |
| Backend | Node + TypeScript, Express, Socket.IO | Express is boring-reliable; Socket.IO gives auto-reconnect out of the box, which matters when judges run a live demo |
| Store | In-memory behind a `DeviceRepository` interface | Simplicity favors demo reliability; interface means SQLite/Postgres could be swapped in without touching callers |
| Simulator | Interval-driven module inside the backend | One process = one source of truth; weighted randomness models office hours + deliberate "forgot to turn off" scenarios |
| Dashboard | React + Vite + TypeScript + Tailwind, socket.io-client | Fast to build, fast HMR, clean styling for the 10% UX line item |
| Bot | discord.js v14 (TypeScript) | Shares types with backend via `packages/shared`; talks to backend over REST + Socket.IO (never computes its own reality) |
| Bot phrasing | Anthropic API (`claude-haiku-4-5`), deterministic template fallback | LLM only rephrases backend-computed numbers; if the key is missing or the call fails, a clean template answers instead — bot never goes silent |
| Alerts | Pure functions in `packages/shared`, evaluated ONLY by the backend | Dashboard and bot both consume the backend's computed alert list — the rule exists in exactly one place |

**Data flow (non-negotiable):**

```
[Device Simulator] -> [Backend API + Socket.IO hub] -> [Web Dashboard]
                                                    -> [Discord Bot] -> users
```

## Rubric priority (build order when time-constrained; cut from the bottom)

1. Working web dashboard with real-time data — 20%
2. Clear, correct system diagram — 15%
3. Sensible circuit schematic (Wokwi) — 15%
4. Quality of demo & dummy data simulation — 15%
5. Well-structured, documented codebase + commits — 15%
6. Working Discord bot on real simulated data — 10%
7. Dashboard visuals and UX quality — 10%

## Phases

- [x] **Phase 0 — Setup (30m):** public repo, planning docs, stack finalized
- [x] **Phase 1 — Backend core (1.5h):** 15-device data model, simulator engine
      (office-hours-weighted, "forgot to turn off" scenarios), REST API,
      Socket.IO push, shared alert rules
- [x] **Phase 2 — Web dashboard (2h):** live device status panel (grouped by
      room), live power meter (total + per-room), alerts panel — all WebSocket
      push, zero manual refresh. Animated office map (Phase 4's bonus) landed
      here too since it's the dashboard's hero section — verified live in
      browser, full toggle round-trip confirmed working.
- [x] **Phase 3 — Discord bot (1.5h):** `!status` / `!room <name>` / `!usage`
      against the real backend; LLM-humanized replies with template fallback.
      Verified all 3 commands directly against the live backend (no Discord
      token yet — human checkpoint). Proactive alert push (Phase 4's other
      bonus item) built in the same pass since it shares the Socket.IO client.
- [x] **Phase 4 — Bonus (both items done):** animated office map (Phase 2) +
      proactive Discord alert push (Phase 3) — both built, both verified as
      far as possible without human-provided credentials.
- [x] **Phase 5 — Diagram + hardware (1h):** hand-authored SVG system diagram
      (+ PNG render); Wokwi project (`diagram.json` + firmware + `wokwi.toml`)
      with pin-mapping doc. All Wokwi part ids and pin names cross-checked
      against live GitHub projects before committing.
- [x] **Phase 6 — Full verification (1.5h):** killed every dev process
      (found and cleaned up duplicate zombie backends from earlier restarts
      in the process), cold-started backend/dashboard/bot from README
      commands only, walked the rubric live: power math verified by hand,
      both alert rules triggered live via the demo-scenario endpoints and
      confirmed correct, toggle round-trip re-verified, bot commands
      re-verified against a fresh backend, secrets-in-history check clean,
      commit authorship confirmed (no AI co-author trailers, matching the
      brief's explicit override of the default convention).
- [x] **Phase 7 — Polish + handoff (1h):** README rewritten with real
      instructions/screenshots/architecture notes, `docs/DEMO_SCRIPT.md`
      written around the demo-scenario endpoints, human checkpoints
      documented in STATE.md.
- [ ] **Buffer:** regressions, stretch polish, human records video

## Decisions log

- 2026-07-04 02:20 — npm workspaces over pnpm (pnpm not installed; npm 11 is fine at this scale).
- 2026-07-04 02:20 — Socket.IO over raw `ws` for automatic reconnection during a live judged demo.
- 2026-07-04 02:20 — Simulator tick every 5s so state changes are visible within one breath during the demo.
- 2026-07-04 02:20 — Simulated clock runs alongside real clock: the API exposes the sim's "office time" so alert conditions (outside 9–5, >2h all-on) can be demonstrated live instead of waiting for wall-clock evening.
- 2026-07-04 02:50 — Device count is **15**, not 18. The problem statement says both "5 devices per room, 15 devices total" and later "all 18 devices"; the room composition it fixes (2 fans + 3 lights × 3 rooms = 15, and its own "6 fans, 9 lights") makes 15 the only consistent reading. Going with 15.
- 2026-07-04 07:18 — A background workflow building the Wokwi hardware sim, the system diagram, and the OfficeMap component hit a session limit mid-run and never returned final summaries. The hardware and OfficeMap *files* it wrote were still on disk and turned out to be high quality — verified them independently (Wokwi part ids/pins cross-checked against real GitHub projects; OfficeMap fixed under strict typecheck) rather than redoing the work from scratch. The system diagram genuinely wasn't written (empty dir) and was built fresh.
- 2026-07-04 07:35 — Room accent color for Work Room 2 changed from emerald to sky blue in the dashboard: emerald is already the semantic "on / live / push" color elsewhere (device ON badge, connection dot, legend), so reusing it as a room color would read as two different signals sharing one color.
- 2026-07-04 07:40 — Dropped TS project references (`tsc -b`) in the dashboard in favor of a single `tsc --noEmit` — project references buy incremental-build speed that a 4-package hackathon repo doesn't need, and `-b` mode's composite-project rules were fighting the vite.config.ts node context for no real benefit.
- 2026-07-04 07:50 — During Phase 6 cold-start, found 3 duplicate zombie backend processes left over from earlier `pkill`/port-kill attempts (npm's wrapper spawns a nested process tree that a single port-kill doesn't fully reach, and `tsx watch`'s supervisor outlives its child exiting). Hard-killed everything by matching the project's absolute path and verified zero processes + free ports before restarting, rather than trusting the first kill attempt.
- 2026-07-04 14:33 — Found and fixed a real bug while wiring up the human's real Discord token: both `apps/backend/src/index.ts` and `apps/bot/src/index.ts` used bare `import 'dotenv/config'`, which resolves `.env` relative to `process.cwd()`. `npm run dev --workspace <app>` sets cwd to that app's own directory, not the repo root (confirmed with `npm exec --workspace apps/bot -c 'pwd'`) — so the root `.env` was never actually being read by either app. Invisible for the backend, since every var it reads (`PORT`, `SIM_TIME_SCALE`, `SIM_START_TIME`) has a fallback identical to `.env.example`'s shipped values; only became observable once a real `DISCORD_BOT_TOKEN` (no sensible default) was added and the bot still reported it missing. Fixed both entry points to load `dotenv` with an explicit `path` resolved from `import.meta.url`, anchored to the source file's own location rather than the invoking cwd. Verified live: bot now logs in and connects its alert feed on a clean restart.
- 2026-07-04 14:55 — Live-testing the bot's proactive alerts with a real Discord server surfaced two more things worth fixing:
  1. Every proactive alert was posted as its own Discord message, so a burst of devices crossing after-hours in the same tick looked like spam. Fixed on the bot side only (`apps/bot/src/index.ts`): a 6-second hold window batches whatever `alert:new` events land together into one message (`buildAlertBatchTemplate` in `apps/bot/src/templates.ts`), falling back to the existing single-alert template + LLM humanize path when exactly one alert lands alone. The backend's per-device event granularity and the dashboard's per-alert animation are untouched — this is purely how the bot renders its own Discord posts.
  2. `SIM_START_TIME` defaulted to `08:30`, 30 minutes before the 9:00 office-hours boundary. The simulator's own "morning arrivals" occupancy curve legitimately turns some devices on during that window (realistic — people do arrive before 9), but the after-hours alert rule (correctly, per spec: "outside 9:00–17:00") flags anything on outside that window — so every fresh restart showed a handful of confusing "alert" messages for early risers, self-clearing once sim time crossed 9:00. Reproduced live: `!status` reported "10 active alerts" ~60 seconds after a clean restart. The alert rule itself is correct per the problem statement and wasn't touched; changed the default `SIM_START_TIME` to `09:00` (office-hours open) instead, in `apps/backend/src/index.ts`, `.env.example`, and README — removing the only window where a spec-correct alert could look like a false positive on boot. Verified live via the real Discord channel: fresh restart → `!status` → "No active alerts."
- 2026-07-04 15:11 — Attempted the Wokwi human checkpoint directly via Claude-in-Chrome browser automation rather than leaving it purely to the human (browser automation turned out to be available in this session, correcting the original brief's assumption that it wasn't). Clipboard-based paste (`navigator.clipboard.writeText`) hung silently with no user gesture to authorize it; worked around by calling Monaco's own `editor.getModels()` / `model.setValue()` directly (a real, public Monaco API, not a hack) to load `hardware/diagram.json` and `hardware/sketch.ino` into a fresh wokwi.com ESP32 project. Result: circuit rendered correctly (all parts/wiring matched the source), the sketch compiled successfully on Wokwi's real build server, and the simulation ran continuously with correct pin states (5x input pull-up for the wall switches, matching outputs for the relays) and visible relay indicator lights. Did not manage to locate the Serial Monitor panel in the UI to see the literal JSON telemetry text — noting that gap honestly rather than claiming full coverage — but build success + a running simulation is already substantially stronger confirmation than "it renders," which is as far as the original brief expected this checkpoint to go without a human.
- 2026-07-04 15:40 — Human flagged that the bot's fallback phrasing didn't actually satisfy the brief's "humanized and friendly — boss hates robotic data dumps" requirement, after choosing not to add an `ANTHROPIC_API_KEY` (no-cost decision). Correct call: the templates in `apps/bot/src/templates.ts` read as formatted data with periods ("Drawing Room: 2 fans ON, 3 lights ON... Total power draw: 285W.") not something a person would say. Rewrote all five templates (status, room, usage, single alert, alert batch) into natural sentences — proper "a, b, and c" list grammar via a small `joinNatural` helper, room summaries phrased as "X has 2 fans and 3 lights on" / "X is quiet", alerts phrased as "Just a heads up —" / "Heads up — N things need a look" — while keeping every number sourced directly from the real snapshot/device arguments; only the sentence shape changed, nothing hardcoded or randomized. This is now the primary experience (LLM humanize layer still exists as an optional upgrade on top, unused since no key is set). Verified live against the real Discord bot: all three commands read conversationally now.
- 2026-07-04 16:02 — Added restrained emoji to the same templates (one anchor per message type, device-type icons, a ✅/⚠️ indicator on the alert line) per human request, and in doing so found a real operational bug: every "bot-only restart" this session used `pkill -9 -f "IUT_AI_Agentic_Hackathon/apps/bot"` to avoid disturbing the backend — but `tsx watch`'s process args are just `watch src/index.ts` with no path in them at all (the app directory only shows up in the process's cwd, which `pkill -f`'s command-line pattern match never sees). That pattern has therefore matched nothing all session; each "restart" silently started a new bot instance on top of the still-running old one instead of replacing it. Caught it because two live bot instances (same Discord token) both answered every command, so every reply appeared twice. Fixed by identifying each process's real app via `lsof -p <pid> | grep cwd` (the same technique used earlier in Phase 6 for the zombie-backend cleanup) and killing the exact stale PIDs. Going forward, restart-and-verify with an explicit cwd check rather than a path-based pkill pattern, since the latter can silently no-op.
- 2026-07-04 16:13 — Human asked how judges would test the API themselves. Added `docs/postman_collection.json` — a Postman v2.1 collection covering every route in `apps/backend/src/api.ts` (health, summary, devices, rooms, alerts, toggle, all 4 demo scenarios), using a collection-level `baseUrl` variable so it works against `localhost:4000` with zero setup beyond importing. Verified every single request in the collection with a matching live `curl` call against the running backend (all 13 returned 200) before treating it as done, rather than trusting the JSON shape alone. Linked from README's Demo controls section and Documentation list.
- 2026-07-04 16:38 — Human deviated from the brief's recommended stack (deviation explicitly permitted "with logged reason"): chose to use an LLM API key they already had instead of Anthropic. Logging the chain of events since it took three passes to land correctly:
  1. Human said "grok api" and pasted a key under `ANTHROPIC_API_KEY`; the Anthropic client rejected it (wrong provider). Rewrote `apps/bot/src/humanize.ts` to call xAI's Grok API directly (OpenAI-compatible chat-completions shape, plain `fetch`, no new dependency), renamed the env var to `GROK_API_KEY`.
  2. That also failed auth. The key's `gsk_` prefix is the distinctive, well-known format for **Groq** (groq.com, the inference platform) — a different company from **xAI's Grok** model, an extremely easy mix-up given the near-identical names. Re-pointed the same fetch-based client at `https://api.groq.com/openai/v1/chat/completions`, renamed the env var again to `GROQ_API_KEY`, and confirmed the exact available model list for this key via `GET /v1/models` (landed on `llama-3.3-70b-versatile`, configurable via `GROQ_MODEL`) rather than guessing a model name blind.
  3. Still returned only the plain template. Root cause: `humanize.ts` read `process.env.GROQ_API_KEY` at its own module top level, but it's imported (via `index.ts` -> `commands.ts`) *before* `index.ts`'s own `dotenv config()` call runs — ES module imports fully evaluate before the importing file's subsequent code, so the top-level read permanently captured `undefined` regardless of what `.env` held. The exact same latent bug existed in `apps/bot/src/backend.ts`'s `BACKEND_URL` read, invisible only because its fallback default happened to match `.env`'s value (same masking pattern as the `SIM_START_TIME` bug on 2026-07-04 14:55). Fixed both by moving the `process.env` reads inside the functions that use them (lazy, evaluated per-call) instead of at module load time.
  4. Along the way, re-discovered the same duplicate-process failure mode from 16:02 in a new form: `kill -9` on a `tsx watch` supervisor does not cascade to its already-spawned child (SIGKILL gives no chance for the supervisor's own cleanup/respawn-tracking to run), so an earlier bot restart left an orphaned child from *before* the Groq fix still fully alive and answering commands with stale code, causing duplicate + stale-template replies simultaneously. Fixed by killing both supervisor and child PIDs (verified by cwd) together. Removed the now-unused `@anthropic-ai/sdk` dependency entirely (`npm install` after removing it from `apps/bot/package.json` — 7 packages dropped from the lockfile).
  Verified live end-to-end afterward: `!status` and `!usage` both returned genuinely LLM-phrased prose ("Hey boss, just a quick update on the office...") distinct from the template's wording, with precise, non-rounded numbers matching real backend state — not the deterministic fallback text.
