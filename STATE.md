# State
Last updated: 2026-07-04T08:00:00+06:00
Hours remaining at last update: ~10 (deadline 18:00 Asia/Dhaka today)

## Current phase
COMPLETE (build side). Everything in Section 5's phase plan is done, committed,
and pushed. What remains is entirely the three human checkpoints below — none
of them block the build itself, and the repo is judge-ready as-is right now.

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
- Backend + dashboard are currently running live (started fresh during
  Phase 6) at localhost:4000 / localhost:5173 if you want to look right now.

## In progress
- Nothing — clean stopping point, all build work complete.

## Next up
Nothing build-related. Only the three human checkpoints below remain.

## Blocked / needs human
1. **Discord bot token + Anthropic API key** (see README's "Discord bot
   credentials" section for the exact 3 steps). Bot code is complete,
   typechecked, and functionally verified against the backend, but cannot
   connect to a real Discord server or call the real LLM without these.
   Everything works without the Anthropic key too (template fallback) —
   only the Discord token is actually required for the bot to run at all.
2. **Wokwi import confirmation** — `docs/HARDWARE.md` has 3-step judge
   instructions (open wokwi.com -> New Project -> ESP32 -> paste
   diagram.json + sketch.ino -> Play). No browser-automation tool available
   for this from here; someone needs to actually click through it once to
   confirm it renders as expected.
3. **Demo video recording** — `docs/DEMO_SCRIPT.md` is written and ready;
   someone needs to actually record following it (any screen recorder,
   <=3 min per the rubric).

## Known issues
- None. `docs/screenshots/` and both `docs/diagrams/system-diagram.{svg,png}`
  reflect the actual current dashboard/architecture, not an earlier draft.
