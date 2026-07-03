# PLAN — Office IoT Dashboard (Techathon Nationals & Rover Summit)

Smart office energy monitoring: 18 simulated devices (6 fans, 9 lights across 3
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
- [ ] **Phase 1 — Backend core (1.5h):** 18-device data model, simulator engine
      (office-hours-weighted, "forgot to turn off" scenarios), REST API,
      Socket.IO push, shared alert rules
- [ ] **Phase 2 — Web dashboard (2h):** live device status panel (grouped by
      room), live power meter (total + per-room), alerts panel — all WebSocket
      push, zero manual refresh
- [ ] **Phase 3 — Discord bot (1.5h):** `!status` / `!room <name>` / `!usage`
      against the real backend; LLM-humanized replies with template fallback
- [ ] **Phase 4 — Bonus (1h):** animated top-view office layout (glowing
      lights, spinning fans); proactive Discord alert push
- [ ] **Phase 5 — Diagram + hardware (1h):** hand-authored SVG system diagram
      (+ PNG render); Wokwi project (`diagram.json` + firmware + `wokwi.toml`)
      with pin-mapping doc
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
