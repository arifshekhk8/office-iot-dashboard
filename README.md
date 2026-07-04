# Techathon2026-Straw_Hat — Smart Office Energy Monitoring

**Team Straw Hat** · Techathon Nationals & Rover Summit 2026 (IUT Robotics Society) — Preliminary Round Submission

## Overview

Offices lose energy the same way, every time: a light left on in an empty room, a fan running long after the last person has gone home. This project is a real-time energy monitoring system for a simulated 3-room office — 15 devices (6 fans, 9 lights) — built around a single principle: **one backend is the sole source of truth**, and every surface the user touches is a thin, read-only view of it.

The system ships two such surfaces from one live feed:

- A **web dashboard** that updates instantly over WebSockets — no polling, no manual refresh.
- A **Discord bot** that answers natural-language commands and proactively posts alerts to a channel the moment the backend detects one.

Both are powered by the same REST API and Socket.IO hub, so the numbers a user sees on the dashboard and the numbers the bot reports can never drift apart.

```
[Device Simulator] → [Backend API + Socket.IO] → [Web Dashboard]
                                                 → [Discord Bot] → Users
```

![Dashboard overview: office map, power meter, and a live alert](docs/screenshots/dashboard-overview.png)

## What It Does

- **Live Device Status** — all 15 devices, grouped by room, each with an on/off state, live wattage, and a toggle switch.
- **Live Power Consumption Meter** — total office wattage in real time, cumulative kWh for the day, and a per-room breakdown.
- **Active Alerts** — flags devices left on outside 9 AM–5 PM office hours, and rooms where every device has run continuously for over two hours. The rule lives in exactly one place (`packages/shared`) and is evaluated only by the backend; the dashboard and bot both render its output.
- **Animated Office Map** — a top-down floor plan where lights glow and fans spin to match live state, and clicking a device sends a real API call.
- **Discord Bot** — `!status`, `!room <name>`, and `!usage` commands, with replies optionally humanized by an LLM (numbers always come from the backend; the bot never invents its own).
- **Simulated Office Day** — a clock that runs 60× real time by default, so a few minutes of wall-clock time walks through a full office day, including after-hours and early-morning conditions, without waiting on the real clock.

![All 15 devices grouped by room](docs/screenshots/dashboard-devices.png)

## Architecture

One backend owns device state, the alert engine, and the energy accumulator. It exposes that state two ways: a REST API for on-demand reads and actions, and a Socket.IO hub that pushes updates the instant something changes. The dashboard and the bot are both downstream consumers of that single feed — neither computes its own version of reality.

Full diagram, with push vs. pull paths distinguished: [`docs/diagrams/system-diagram.svg`](docs/diagrams/system-diagram.svg)

| Layer | Technology | Role |
| --- | --- | --- |
| Backend | Node.js, TypeScript, Express, Socket.IO | Single source of truth: device store, alert engine, energy accumulator, REST + WebSocket APIs |
| Dashboard | React, Vite, TypeScript, Tailwind CSS | Live-rendered view of the backend's state, zero client-side computation |
| Bot | discord.js, TypeScript | Command-driven and proactive Discord interface, backed by the same API |
| Shared | TypeScript | Device catalog, types, and alert rules used by every surface |
| Hardware | ESP32, Wokwi | Circuit design proving the software's ingestion API accepts real sensor data unchanged |

## Getting Started

Requires **Node.js 20+** and npm.

```bash
npm install
cp .env.example .env
npm run dev:backend    # REST + Socket.IO on :4000 — start this first
npm run dev:dashboard  # Vite dev server on :5173
npm run dev:bot        # Discord bot — needs DISCORD_BOT_TOKEN in .env, see below
```

Open **http://localhost:5173** for the dashboard. The backend seeds all 15 devices off and starts the simulated office day at 09:00 (office hours open), so a fresh start shows a clean "no active alerts" state. `SIM_START_TIME` and `SIM_TIME_SCALE` in `.env.example` control the starting time and clock speed.

### Discord Bot Credentials

The bot builds and runs without any keys configured, but three values unlock its full behavior:

1. **`DISCORD_BOT_TOKEN`** (required to connect): [Discord Developer Portal](https://discord.com/developers/applications) → New Application → **Bot** tab → Reset Token. Under **Privileged Gateway Intents**, enable **Message Content Intent**. Then under **OAuth2 → URL Generator**, select scope `bot` and permissions `Send Messages`, `Read Message History`, `View Channel`, and use the generated URL to invite the bot to a server.
2. **`GROQ_API_KEY`** (optional): [console.groq.com](https://console.groq.com) → API Keys → Create Key. Note: Groq is the inference platform, distinct from xAI's Grok model. Without this key, the bot replies with clean, template-based prose rather than LLM-phrased text — it never goes silent either way.
3. **`DISCORD_ALERT_CHANNEL_ID`** (optional): right-click a channel in Discord (Developer Mode enabled) → Copy Channel ID. Enables proactive alert posts; omitted, the bot simply skips that feature.

All three belong in `.env`, which is git-ignored and never committed.

### Demo Controls

The simulator runs continuously on its own, but a live demo shouldn't depend on chance. Three scenario endpoints trigger every alert path on demand:

```bash
# Force a room to look "forgotten" — all 5 devices on, ignoring the normal cycle
curl -X POST localhost:4000/api/demo/scenario -H 'content-type: application/json' \
  -d '{"name":"forget","room":"work2"}'

# Jump the simulated office clock forward (HH:MM, 24h)
curl -X POST localhost:4000/api/demo/scenario -H 'content-type: application/json' \
  -d '{"name":"jump","time":"17:30"}'

# All devices on / all devices off
curl -X POST localhost:4000/api/demo/scenario -H 'content-type: application/json' -d '{"name":"all-on"}'
curl -X POST localhost:4000/api/demo/scenario -H 'content-type: application/json' -d '{"name":"all-off"}'
```

Running `forget` followed by `jump` reproduces the exact scenario from the problem statement — a room still fully powered well after hours — and trips both alert rules (after-hours, and all-on-for-over-2-hours) simultaneously.

### API Testing

[`docs/postman_collection.json`](docs/postman_collection.json) contains every endpoint — health, devices, rooms, alerts, toggle, and the demo scenarios above — pre-configured against `http://localhost:4000`. Import it into Postman (File → Import) to exercise the API without writing curl commands.

## Repository Layout

```
apps/backend/     Express + Socket.IO + device simulator — the single source of truth
apps/dashboard/   React + Vite + Tailwind live dashboard
apps/bot/         discord.js bot (!status, !room, !usage, proactive alerts)
packages/shared/  Types + alert rules shared by every surface — evaluated once, in the backend
docs/             Diagrams, hardware design, demo materials, original problem statement
hardware/         Wokwi circuit simulation (ESP32 + relays + current sense)
```

## Documentation

- System architecture diagram: [`docs/diagrams/system-diagram.svg`](docs/diagrams/system-diagram.svg)
- Hardware architecture diagram: [`docs/diagrams/hardware-diagram.svg`](docs/diagrams/hardware-diagram.svg)
- Hardware / circuit design: [`docs/HARDWARE.md`](docs/HARDWARE.md) and [`hardware/`](hardware/) — an importable Wokwi project (ESP32, 5 relays, wall switches, current-sense stand-in) with a full pin-mapping table
- API reference: [`docs/postman_collection.json`](docs/postman_collection.json)
- Original problem statement: [`docs/original-problem-statement.pdf`](docs/original-problem-statement.pdf)

## Design Principles

- **One backend, one truth.** The dashboard and bot never compute their own view of device state, power totals, or alerts — both read the backend's `Snapshot`, either via REST (`/api/summary`) or pushed over Socket.IO (`snapshot`).
- **Alert rules exist in exactly one place** (`packages/shared/src/alerts.ts`), evaluated only by the backend. The dashboard's Alerts Panel and the bot's proactive push both consume the backend's computed list.
- **The bot never invents numbers.** Every reply is built from a deterministic template first; an optional LLM call only rephrases that template into more natural prose, and any failure — a missing key, an API error — falls back to the template untouched.
- **Simulated clock, not wall clock.** `SIM_TIME_SCALE` (default 60×) compresses a full office day, including evenings and early mornings, into a few minutes of real time, so both alert rules are demonstrable without waiting on the actual clock.
- **Hardware-ready by design.** The ESP32 node in `hardware/` emits the same JSON shape the software simulator does, so real sensors can feed the same backend with no API changes.
