# Demo Script (≤ 3 minutes)

A literal shot list. Any screen recorder works (QuickTime's "New Screen
Recording", OBS, etc.) — keep it under 3 minutes per the rubric.

## Before you hit record

1. Start all three processes (see `README.md` Quick Start):
   `npm run dev:backend`, `npm run dev:dashboard`, `npm run dev:bot`.
2. Open the dashboard at `http://localhost:5173`.
3. Open Discord to the server the bot is invited to, in a second window or
   a picture-in-picture layout.
4. Optionally run this once, a minute or so before recording, so a room is
   already interestingly "forgotten" by the time you start (see below for
   exactly what it does):
   ```bash
   curl -X POST localhost:4000/api/demo/scenario -H 'content-type: application/json' \
     -d '{"name":"forget","room":"work2"}'
   ```

## Shot list

**0:00–0:30 — Dashboard live**
Show the full dashboard: the animated office map at the top (point out a
light glowing, a fan spinning), then scroll to the Power Consumption meter
and the Active Alerts panel. One sentence on architecture: *"One backend is
the single source of truth — this dashboard and the Discord bot are both
just reading the same live feed."*

**0:30–1:30 — Live update, no refresh**
Click a device on the office map (or in the Device Status list) to toggle
it. Narrate: *"That's a real API call — watch the power meter and the map
update instantly, no refresh."* Then run the clock-jump scenario live on
screen to show the after-hours alert fire in real time:
```bash
curl -X POST localhost:4000/api/demo/scenario -H 'content-type: application/json' \
  -d '{"name":"jump","time":"17:30"}'
```
Point at the Active Alerts panel as the new alert (or alerts) appear,
timestamped, within a couple of seconds.

**1:30–2:30 — Discord bot**
Switch to Discord. Run, in order:
- `!status` — natural-language summary of all 3 rooms
- `!room work2` (or whichever room you forgot) — that room's detail
- `!usage` — current wattage + kWh today
If the alert channel is configured, point out the proactive alert message
that already posted itself when the after-hours condition tripped — no
command needed for that one.

**2:30–3:00 — Recap**
Cut to `docs/diagrams/system-diagram.svg` (or the rendered PNG) for
10–15 seconds: trace the arrows — simulator into the backend, backend
pushing to the dashboard over Socket.IO, the bot pulling on-demand for
commands and receiving pushed alerts — while saying one sentence on why
that single-backend shape matters: *"Neither the dashboard nor the bot ever
computes its own version of reality — they just render the same feed."*
