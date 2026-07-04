# State
Last updated: 2026-07-04T07:45:00+06:00
Hours remaining at last update: 10.25 (deadline 18:00 Asia/Dhaka today)

## Current phase
Phase 3 — Discord bot, about to start.

## Done
- Phase 0: public repo (github.com/arifshekhk8/office-iot-dashboard), planning
  docs, stack finalized
- Phase 1: backend core — 15-device model, simulator (office-hours curve,
  scripted "forgot to turn off" scenarios, demo scenario endpoints), REST API,
  Socket.IO push, alert engine in `packages/shared`. Verified live: snapshot
  push, manual toggle, and both alert rules firing via a 30s socket test.
- Phase 2 + Phase 4's animated-map bonus: full dashboard (device panel, power
  meter, alerts panel, animated office map) — dark control-room theme,
  Archivo/IBM Plex fonts. Verified live in-browser via Claude in Chrome:
  toggled a device from the UI, watched it round-trip through the real REST
  endpoint and Socket.IO push, confirmed the after-hours alert fired
  correctly. Console is clean.
- Phase 5: Wokwi hardware sim (Work Room 1 node: ESP32 + 5 relays + 5 wall
  switches + current-sense stand-in) and hand-authored system diagram SVG/PNG.
  Both verified — Wokwi part ids/pins cross-checked against real GitHub
  projects; diagram rendered and visually reviewed.
- All commits pushed; `git log` is the durable backup, not this file.

## In progress
- Nothing mid-file right now — clean stopping point.

## Next up
1. Phase 3: scaffold `apps/bot` (discord.js), implement `!status` / `!room
   <name>` / `!usage` against the backend's REST API, Anthropic
   claude-haiku-4-5 phrasing with a deterministic template fallback.
2. This is the human-checkpoint moment: bot needs `DISCORD_BOT_TOKEN` +
   `ANTHROPIC_API_KEY` in `.env` before it can actually run against a real
   Discord server. Build and typecheck everything possible first, then stop
   and hand off the credential steps (already spec'd in the original brief,
   Section 6.4) rather than blocking all other work on it.
3. Phase 4 remainder: proactive alert push once the bot exists.
4. Phase 6: full cold-start verification pass (kill everything, restart from
   README instructions only, walk the rubric line by line).
5. Phase 7: finalize README, write `docs/DEMO_SCRIPT.md`.

## Blocked / needs human
- Discord bot token + Anthropic API key — needed to actually run the bot
  against a live server. Bot code will be built and typechecked without them;
  wiring instructions will be handed off explicitly when that point is
  reached (see original brief Section 6.4 for the exact steps to give).
- Wokwi import confirmation (docs/HARDWARE.md has the 3-step judge
  instructions; someone needs to actually open wokwi.com and confirm it
  renders, since no browser-automation tool can do that click).
- Demo video recording (docs/DEMO_SCRIPT.md not yet written — comes in
  Phase 7).

## Known issues
- Backend process has been running continuously since ~02:33 with
  SIM_TIME_SCALE=60; sim clock has drifted many sim-days ahead and produced
  a messy long-run state (fine for dev, not for the final demo). Plan to
  kill and restart both backend and dashboard fresh during the Phase 6
  verification pass so the sim clock starts clean at SIM_START_TIME.
