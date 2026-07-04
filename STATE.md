# State
Last updated: 2026-07-04T07:45:00+06:00
Hours remaining at last update: 10.3 (deadline 18:00 Asia/Dhaka today)

## Current phase
Phase 6 — full verification pass, about to start. All build phases (0-5)
are complete and pushed.

## Done
- Phase 0: public repo, planning docs, stack finalized
- Phase 1: backend core — 15-device model, simulator, REST + Socket.IO,
  alert engine. Verified live.
- Phase 2 + Phase 4's map bonus: full dashboard (device panel, power meter,
  alerts panel, animated office map). Verified live in-browser, full toggle
  round-trip confirmed, console clean.
- Phase 3 + Phase 4's proactive-alert bonus: Discord bot (`!status`,
  `!room <name>`, `!usage`, proactive alert push). All three commands
  verified directly against the live backend (correct data, correct math,
  lenient room-name matching, graceful error messages). Humanization via
  claude-haiku-4-5 with deterministic-template fallback — verified the
  fallback path works (no ANTHROPIC_API_KEY in this environment). Cannot
  verify live Discord connectivity without a bot token (human checkpoint).
- Phase 5: Wokwi hardware sim + hand-authored system diagram. Both verified.
- Full monorepo typechecks clean (`npm run typecheck`).
- All commits pushed; `git log` is the durable backup.

## In progress
- About to run the Phase 6 verification checklist: cold-start all three
  processes from README instructions only, walk the rubric line by line.

## Next up
1. Phase 6: cold-start verification (kill everything, restart fresh from
   documented commands only, walk every rubric line item live)
2. Phase 7: finalize README (screenshots, run instructions), write
   `docs/DEMO_SCRIPT.md`
3. Hand off remaining human checkpoints (see below)

## Blocked / needs human
- **Discord bot token + Anthropic API key** — bot code is complete,
  typechecked, and functionally verified against the backend, but cannot
  actually connect to Discord or call the real LLM without these. Steps to
  get them (from the original build brief, Section 6.4):
  1. Discord bot token: https://discord.com/developers/applications → New
     Application → *Bot* tab → Reset Token → copy it. Also enable **Message
     Content Intent** under Privileged Gateway Intents. Then *OAuth2 → URL
     Generator* → scope `bot` → permissions `Send Messages`, `Read Message
     History`, `View Channel` → open the generated URL, invite to a test
     server.
  2. Anthropic API key: https://console.anthropic.com → API Keys → Create
     Key. (Optional — bot works fine without it, just uses template replies.)
  3. Paste both into a `.env` file (copied from `.env.example`) — never into
     chat, never committed.
- **Wokwi import confirmation** — `docs/HARDWARE.md` has 3-step judge
  instructions; someone needs to actually open wokwi.com and confirm the
  circuit renders (no browser-automation tool available for this).
- **Demo video recording** — `docs/DEMO_SCRIPT.md` not yet written (Phase 7).

## Known issues
- (none currently — backend was restarted fresh for testing; sim clock is
  clean)
