# Hardware Design

This document describes the physical sensing and control layer behind the dashboard: how a real office room would be wired, sensed, and connected to the same backend the software simulator feeds today. An importable [Wokwi](https://wokwi.com) circuit simulation accompanies this design; its files live in [`hardware/`](../hardware/):

| File | Purpose |
| --- | --- |
| `hardware/diagram.json` | The circuit — parts and wiring |
| `hardware/sketch.ino` | ESP32 firmware (Arduino) |
| `hardware/wokwi.toml` | Configuration for the Wokwi VS Code extension / wokwi-cli |

A rendered wiring diagram is available at [`docs/diagrams/hardware-diagram.svg`](diagrams/hardware-diagram.svg).

## Scope: One Room, Fully Representative

The simulation models **Work Room 1** (`work1`): 2 ceiling fans and 3 ceiling lights — exactly the device set the backend tracks for that room. Every room in the office is electrically identical (same 5 loads, same switch bank), so a single room node demonstrates the complete design without repeating an already-repetitive schematic three times. Scaling to all 3 rooms is a deployment decision, not a design change — see [Scaling to the Full Office](#scaling-to-the-full-office).

An **ESP32 DevKitC V4** serves as the room controller. It:

1. Reads the 5 wall switches (debounced, active-low).
2. Drives the 5 relay channels that switch the loads.
3. Samples the room's current-sensor tap on an ADC pin.
4. Emits the same JSON device-state shape the backend already serves — `{"room":"work1","devices":[...],"roomWatts":N}` — every 2 seconds and on every switch change.

In the Wokwi simulation this JSON is written to the Serial monitor, so it runs with zero network setup. In a physical install, the ESP32 joins the office WiFi and POSTs that same JSON to the backend's REST API on port 4000 — the identical ingestion surface the software device simulator already uses — so the dashboard, alert engine, and Discord bot would come alive from real hardware with no backend changes required.

## Pin Map

| ESP32 GPIO | Direction | Connected to | Physical device |
| --- | --- | --- | --- |
| GPIO 16 | out | Relay ch 1 `IN` | `work1-fan-1` (60 W ceiling fan) |
| GPIO 17 | out | Relay ch 2 `IN` | `work1-fan-2` (60 W ceiling fan) |
| GPIO 18 | out | Relay ch 3 `IN` | `work1-light-1` (15 W ceiling light) |
| GPIO 19 | out | Relay ch 4 `IN` | `work1-light-2` (15 W ceiling light) |
| GPIO 21 | out | Relay ch 5 `IN` | `work1-light-3` (15 W ceiling light) |
| GPIO 25 | in, pull-up | Wall switch 1 (common) | switch for `work1-fan-1` |
| GPIO 26 | in, pull-up | Wall switch 2 (common) | switch for `work1-fan-2` |
| GPIO 27 | in, pull-up | Wall switch 3 (common) | switch for `work1-light-1` |
| GPIO 32 | in, pull-up | Wall switch 4 (common) | switch for `work1-light-2` |
| GPIO 33 | in, pull-up | Wall switch 5 (common) | switch for `work1-light-3` |
| GPIO 34 | in, ADC1_CH6 | Current-sense analog out | ACS712-20A on the room circuit |
| 5V | — | Relay board `VCC` (coil supply) | relay board power |
| 3V3 | — | Relay `COM` rail (sim only) + pot `VCC` | stands in for the 220 V live feed |
| GND.1–3 | — | Relay `GND`, switch returns, LED cathodes, pot `GND` | common ground |

Pin selection is deliberate: GPIO 16/17/18/19/21 carry no ESP32 strapping-pin duties (unlike 0/2/5/12/15), so the relays cannot chatter during boot. GPIO 34 is input-only with no pull-up circuitry, making it a clean, side-effect-free ADC input. The switch inputs avoid GPIO 34/35/36/39 because those pins cannot enable internal pull-ups.

## Electrical Design Rationale

**Relays, never direct GPIO drive.** An ESP32 GPIO is a 3.3 V logic pin rated for roughly 20–40 mA. The loads are 220 V AC appliances: a 60 W fan draws approximately 0.27 A at mains voltage (more during motor start), and a 15 W light draws roughly 0.07 A — three orders of magnitude beyond what a GPIO can survive, and a different voltage domain entirely, since mains must never share a conductor with logic. The GPIO therefore only energizes a relay coil through the relay board's driver transistor; the relay's isolated contacts (`COM`/`NO`) perform the actual 220 V switching. Coil side and contact side share no electrical connection, so a mains fault cannot reach the microcontroller. A production install would add an opto-isolated relay board (or solid-state relays) as a second isolation barrier, with mains wiring kept in its own enclosure.

**Wall switch inputs: internal pull-ups, active-low.** Each switch connects its GPIO to ground when closed; the ESP32's internal ~45 kΩ pull-up holds the pin high when open, so LOW reads as ON. This design was chosen over external pull-downs because it requires zero extra components per switch, and because a switch line shorting to ground in the wall — the most common wiring fault — reads as "switch on" rather than applying a voltage anywhere. The firmware debounces with three agreeing samples 25 ms apart; the simulated switches also set `"bounce": "0"` so the demo reads cleanly.

**Current sensing: placement and purpose.** In the physical install, an **ACS712-20A** Hall-effect sensor sits in series with the room circuit's live wire, upstream of the relay bank, measuring the sum of whatever loads are actually drawing current. Its output is analog: 2.5 V at 0 A, moving 100 mV per amp (so 5 A RMS reads as a 0.5 V swing). Since the sensor runs at 5 V and the ESP32 ADC tops out at approximately 3.3 V, its output passes through a voltage divider before reaching GPIO 34. This measured value can be cross-checked against the *expected* power computed from relay states (60 W per fan, 15 W per light); a disagreement is diagnostically valuable — a stalled fan, a light that reports "on" but has burned out, or a welded relay contact would each surface as a measured-vs-expected mismatch.

**Wokwi stand-ins and their real-world equivalents.** Wokwi cannot simulate 220 V AC loads or an ACS712, so the simulation substitutes:

| In the Wokwi simulation | In the physical install |
| --- | --- |
| `wokwi-relay-module` × 5 | One channel of a 5- or 8-channel opto-isolated relay board (or SSR) |
| 3V3 rail on relay `COM` | 220 V AC live feed to the relay contact |
| LED + 220 Ω on relay `NO` | The fan or light itself, wired live–load–neutral |
| `wokwi-slide-switch` × 5 | Wall-plate switches, run as low-voltage signal lines to the controller |
| `wokwi-potentiometer` on GPIO 34 | ACS712-20A analog output (divided down), in series with the room circuit |

The LEDs sit on the relays' switched side specifically so the simulation preserves the real topology: control current flows GPIO → coil, load current flows supply → `COM` → `NO` → load, and the two paths never touch.

## Running the Simulation

Zero-setup path, approximately 60 seconds:

1. Go to **https://wokwi.com** → **New Project** → **ESP32** (the Arduino ESP32 template).
2. Open the **diagram.json** tab and replace its contents with `hardware/diagram.json`; open the **sketch.ino** tab and replace its contents with `hardware/sketch.ino`.
3. Press **Play**. Open the Serial Monitor, then slide any wall switch: its relay clicks closed, the load LED lights, and a JSON telemetry line appears immediately, alongside a heartbeat line every 2 seconds. Dragging the potentiometer knob changes the simulated "measured" current in the `sense` field.

Alternative: with the **Wokwi for VS Code** extension, open the `hardware/` folder — `wokwi.toml` is already configured. Build the firmware once with arduino-cli (commands are documented at the top of `wokwi.toml`), then run "Wokwi: Start Simulator".

Note on relay polarity: the firmware drives relays active-high, matching Wokwi's current relay-module behavior (the part's documentation has a known inconsistency — [wokwi-features#666](https://github.com/wokwi/wokwi-features/issues/666)). If a future Wokwi release inverts this, flip `RELAY_ACTIVE_HIGH` to `0` at the top of `sketch.ino`; nothing else changes.

## Scaling to the Full Office

Two sound options, both invisible to the backend since every node speaks the same `POST` JSON:

- **One ESP32 per room (recommended).** Three identical, roughly $4 nodes, each flashed with the same firmware and a one-line room-id change. Rooms become isolated failure domains, wire runs stay short since switch and mains wiring remain inside each room, and adding a fourth room is a copy-paste operation.
- **One central ESP32 with I/O expanders.** A single controller with I²C expanders (e.g., MCP23017: 16 GPIO per chip — one for 15 relays, one for 15 switches) and a 16-channel relay board. Cheaper by two devkits, but every switch line and load circuit must be home-run to one cabinet, and a single failure takes down the whole office — the per-room option is the stronger engineering trade at this scale.

Per-room current sensing scales as one ACS712 per room on distinct ADC1 pins (GPIO 32–39 territory) if centralized, or the same GPIO 34 tap replicated on every per-room node.
