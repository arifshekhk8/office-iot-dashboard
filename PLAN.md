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
- [ ] **Phase 3 — Discord bot (1.5h):** `!status` / `!room <name>` / `!usage`
      against the real backend; LLM-humanized replies with template fallback
- [ ] **Phase 4 — Bonus remainder (30m):** proactive Discord alert push
      (animated office map already done in Phase 2)
- [x] **Phase 5 — Diagram + hardware (1h):** hand-authored SVG system diagram
      (+ PNG render); Wokwi project (`diagram.json` + firmware + `wokwi.toml`)
      with pin-mapping doc. All Wokwi part ids and pin names cross-checked
      against live GitHub projects before committing.
- [ ] **Phase 6 — Full verification (1.5h):** cold-start from README only,
      walk the rubric live, fix properly, re-run the whole checklist until one
      pass is clean
- [ ] **Phase 7 — Polish + handoff (1h):** README finalized, demo script,
      human checkpoints flagged
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
