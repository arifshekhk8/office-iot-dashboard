# State
Last updated: 2026-07-04T16:13:00+06:00
Hours remaining at last update: ~1.8 (deadline 18:00 Asia/Dhaka today)

## Current phase
COMPLETE (build side) — Discord bot fully live with real credentials, two
more real bugs found + fixed via live testing in the human's actual Discord
server, and the Wokwi hardware checkpoint self-verified via browser
automation (build succeeded, simulation ran). Only the demo video recording
remains, and that one is genuinely human-only (no screen-recording tool
available in this session).

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
  real alert channel configured) — confirmed via its own startup log AND
  live in the human's real Discord server via browser automation: `!status`
  returned "Total power draw: 360W. No active alerts." on a fresh restart.
- Proactive alerts now batch: alerts landing within a 6s window post as one
  consolidated Discord message instead of one message per device (bot-side
  only; backend/dashboard event granularity untouched).
- `SIM_START_TIME` default changed 08:30 -> 09:00 (office-hours open) so a
  fresh restart never shows a false-looking after-hours alert for a device
  that legitimately turned on during the pre-9am morning ramp-up. See
  PLAN.md decisions log (2026-07-04 14:55) for full detail on both fixes.
- Wokwi hardware checkpoint self-verified via Claude-in-Chrome: opened a
  fresh ESP32 project on wokwi.com, loaded `hardware/diagram.json` +
  `hardware/sketch.ino` via Monaco's own `setValue()` API (clipboard paste
  hung without a user gesture to authorize it), pressed Play. Result: circuit
  rendered exactly matching the source, the sketch compiled successfully on
  Wokwi's real build server, and the simulation ran continuously with
  correct pin states (5x pull-up inputs for the switches, matching relay
  outputs) and visible relay indicator lights. Did not manage to locate the
  Serial Monitor panel to see the literal JSON telemetry text — noting that
  honestly rather than overclaiming — but build success + a running
  simulation is well beyond "confirm it renders," which is as far as the
  original brief expected this checkpoint to go.
- Bot's fallback phrasing rewritten to genuinely satisfy "humanized and
  friendly — boss hates robotic data dumps." Human chose not to add an
  ANTHROPIC_API_KEY (no-cost decision) and correctly flagged that the old
  templates read as formatted data, not something a person would say. All
  five templates in `apps/bot/src/templates.ts` rewritten into natural
  sentences with proper list grammar; every number still sourced directly
  from live snapshot/device data, nothing hardcoded. Verified live: `!status`
  now reads "Right now, Drawing Room has 1 fan and 2 lights on... — pulling
  300W total. No alerts right now, all good." — confirmed against real data
  for all 3 commands.
- Added restrained friendly emoji to the same templates (🏢/📍/⚡/🔔 anchors,
  🌀/💡 device icons, ✅/⚠️ alert indicator). Doing so surfaced a real
  operational bug: every "bot-only restart" this session used a
  `pkill -f ".../apps/bot"` pattern that never actually matched anything
  (tsx watch's process args don't contain the app path — only its cwd does),
  so each "restart" silently left the old bot instance running alongside the
  new one. Two live bot instances with the same Discord token meant every
  command got answered twice. Found and fixed by checking each PID's real
  app via `lsof -p <pid> | grep cwd` and killing the exact stale PIDs —
  confirmed live afterward: exactly one reply per command again. See PLAN.md
  2026-07-04 16:02 for full detail.
- Added `docs/postman_collection.json` so judges can test the REST API by
  clicking instead of typing curl — every route in `api.ts` covered (health,
  summary, devices, rooms, alerts, toggle, all 4 demo scenarios), one
  `baseUrl` variable, zero setup beyond importing. Verified every request in
  it with a matching live curl call first (all 13 returned 200). Linked from
  README. See PLAN.md 2026-07-04 16:13.
- Backend + dashboard + bot are currently running live and process-clean:
  exactly one instance each, confirmed via `lsof cwd` on every tsx process.

## In progress
- Nothing — clean stopping point, all build work complete.

## Next up
Nothing build-related. Only the demo video recording remains.

## Blocked / needs human
1. **Demo video recording** — `docs/DEMO_SCRIPT.md` is written and ready;
   someone needs to actually record following it (any screen recorder,
   <=3 min per the rubric). This one stays human — no screen-recording tool
   available in this session.

(Discord bot token checkpoint is DONE — human obtained a real token, enabled
Message Content Intent, invited the bot, and set an alert channel ID, all in
this session. ANTHROPIC_API_KEY is still optional/unset; bot correctly runs
on the deterministic template fallback without it. Wokwi checkpoint is DONE
per above — if you want to see it with your own eyes / watch the Serial
Monitor yourself, the project is easy to reopen: wokwi.com -> New Project ->
ESP32 -> paste the two files per docs/HARDWARE.md, exactly as documented.)

## Known issues
- None currently open. Previously (this session, all fixed and verified live):
  1. Proactive alerts posted one Discord message per device; now batched into
     one message per 6s window (bot-side only). See PLAN.md 2026-07-04 14:55.
  2. `SIM_START_TIME` defaulted to 08:30, 30min before the 9:00 alert-rule
     boundary, so legitimate early-arrival devices looked like false alerts
     for the first ~30s after every restart. Default changed to 09:00. Same
     PLAN.md entry has full detail.
  3. `apps/backend/src/index.ts` and `apps/bot/src/index.ts` both
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
