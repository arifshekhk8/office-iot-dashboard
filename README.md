# Office IoT Dashboard

Smart office energy monitoring for a 3-room office that runs on Discord.
15 simulated devices (6 fans + 9 lights, 5 per room) feed **one backend**,
which powers a **live web dashboard** and a **Discord bot** — both thin
clients of the same source of truth.

> Techathon Nationals & Rover Summit (IUT Robotics Society) — preliminary
> round submission.

```
[Device Simulator] -> [Backend API + Socket.IO] -> [Web Dashboard]
                                                -> [Discord Bot] -> users
```

## Status

🚧 Under active construction — see `PLAN.md` for the build plan and `STATE.md`
for the live progress snapshot.

## Quick start

*(Full instructions land here as each piece ships.)*

```bash
npm install
cp .env.example .env   # fill in Discord + Anthropic keys (see .env.example)
npm run dev:backend    # REST + WebSocket on :4000
npm run dev:dashboard  # Vite dev server on :5173
npm run dev:bot        # Discord bot (needs DISCORD_BOT_TOKEN)
```

## Repo layout

```
apps/backend/     Express + Socket.IO + device simulator (source of truth)
apps/dashboard/   React + Vite live dashboard
apps/bot/         discord.js bot (!status, !room, !usage, proactive alerts)
packages/shared/  Types + alert rules shared by every surface
docs/             Diagrams, hardware design, demo script, original problem PDF
hardware/         Wokwi circuit simulation (ESP32 + relays + current sense)
```

## Documentation

- System diagram: `docs/diagrams/system-diagram.svg`
- Hardware / circuit design: `docs/HARDWARE.md` + `hardware/`
- Demo video: *(link pending)*
- Original problem statement: `docs/original-problem-statement.pdf`
