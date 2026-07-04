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
