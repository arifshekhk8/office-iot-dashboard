# State
Last updated: 2026-07-04T14:18:00+06:00
Hours remaining at last update: ~3.7 (deadline 18:00 Asia/Dhaka today)

## Current phase
COMPLETE (build side) — and the Discord bot is now fully live with real
credentials. Everything in Section 5's phase plan is done, committed, and
pushed. Human completed checkpoint 1 (Discord token) live in this session;
doing so surfaced and let us fix a real bug (see Known issues). Two human
checkpoints remain (Wokwi import click-through, demo video) — neither blocks
the build, and the repo is judge-ready as-is right now.

## Done
- Phase 0: public repo (github.com/arifshekhk8/office-iot-dashboard), planning
  docs, stack finalized.
- Phase 1: backend core — 15-device model, simulator (office-hours curve,
  scripted "forgot to turn off" scenarios, demo scenario endpoints), REST API,
  Socket.IO push, alert engine in `packages/shared`.
- Phase 2 + Phase 4's map bonus: full dashboard (device panel, power meter,
  alerts panel, animated office map) — dark control-room theme.
- Phase 3 + Phase 4's proactive-alert bonus: Discord bot (`!status`,
  `!room <name>`, `!usage`, proactive alert push), LLM humanization with
  template fallback.
- Phase 5: Wokwi hardware sim (Work Room 1 node) + hand-authored system
  diagram SVG/PNG. All Wokwi part ids/pins cross-checked against real GitHub
  projects before committing.
- Phase 6: full cold-start verification pass. Killed every dev process
  (found and cleaned up 3 duplicate zombie backends left over from earlier
  restarts), restarted backend/dashboard/bot from README-documented commands
  only, and walked the rubric live:
  - Power math checked by hand (90+45+150=285W matched the hero number
    exactly at one sample point).
  - Both alert rules (after-hours; room-all-on->2h) triggered live via the
    `/api/demo/scenario` endpoints and confirmed correct, timestamped, and
    visible in the Alerts Panel — reproducing the exact "forgot to turn off"
    scenario from the original problem statement.
  - Dashboard->backend toggle round-trip re-verified (click -> POST -> sim
    mutation -> Socket.IO broadcast -> UI update).
  - All 3 bot commands re-verified against a freshly restarted backend,
    including lenient room-name matching and graceful error messages.
  - Bot's missing-token path verified to fail fast with a clear message
    (not a hang or a crash loop).
  - `git log --all --full-history -- .env` clean (never committed); `.env`
    correctly gitignored.
  - Commit authorship confirmed as the human's own git identity with no
    AI co-author trailers anywhere in history (the brief explicitly
    overrides the default convention here — checked and correct).
- Phase 7: README fully rewritten (was still the Phase-0 placeholder) with
  real prerequisites, credential setup steps, demo-scenario commands,
  architecture notes, and two screenshots captured live during Phase 6.
  `docs/DEMO_SCRIPT.md` written as a literal <=3-minute shot list built
  around the same demo-scenario endpoints.
- Full monorepo typechecks clean (`npm run typecheck`) at every phase.
- All 9 commits pushed; `git log` is the durable backup, not this file.
- Backend + dashboard + bot are all currently running live at localhost:4000 /
  localhost:5173, and the bot is logged into Discord for real (real token,
  real alert channel configured) — confirmed via its own startup log
  (`[bot] logged in as ...`, `[bot] alert feed connected to ...`).

## In progress
- Nothing — clean stopping point, all build work complete.

## Next up
Nothing build-related. Only the two human checkpoints below remain.

## Blocked / needs human
1. **Wokwi import confirmation** — `docs/HARDWARE.md` has 3-step judge
   instructions (open wokwi.com -> New Project -> ESP32 -> paste
   diagram.json + sketch.ino -> Play). No browser-automation tool available
   for this from here; someone needs to actually click through it once to
   confirm it renders as expected.
2. **Demo video recording** — `docs/DEMO_SCRIPT.md` is written and ready;
   someone needs to actually record following it (any screen recorder,
   <=3 min per the rubric).

(Discord bot token checkpoint is DONE — human obtained a real token, enabled
Message Content Intent, invited the bot, and set an alert channel ID, all in
this session. ANTHROPIC_API_KEY is still optional/unset; bot correctly runs
on the deterministic template fallback without it.)

## Known issues
- None currently open. Previously: a real bug was found and fixed this
  session — `apps/backend/src/index.ts` and `apps/bot/src/index.ts` both
  loaded `.env` via bare `import 'dotenv/config'`, which resolves relative to
  `process.cwd()`. Since `npm run dev --workspace <app>` sets cwd to that
  app's own directory (confirmed with `npm exec --workspace apps/bot -c
  'pwd'`), the repo-root `.env` was never actually being read by either app.
  Masked for the backend because its env vars all have defaults identical to
  `.env.example`; surfaced the moment a real `DISCORD_BOT_TOKEN` (no sensible
  default) was added. Fixed both to load `dotenv` with an explicit path
  resolved from `import.meta.url`. Verified live: bot now logs in
  successfully. See PLAN.md decisions log (2026-07-04 14:33) for full detail.
- `docs/screenshots/` and both `docs/diagrams/system-diagram.{svg,png}`
  reflect the actual current dashboard/architecture, not an earlier draft.
