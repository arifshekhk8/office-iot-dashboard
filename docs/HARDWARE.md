# Hardware: Wokwi Circuit Simulation

An importable [Wokwi](https://wokwi.com) project showing how one room of the
office would actually be wired and sensed in a physical install. Files live in
[`hardware/`](../hardware/):

| File | Purpose |
| --- | --- |
| `hardware/diagram.json` | The circuit — parts and wiring |
| `hardware/sketch.ino` | ESP32 firmware (Arduino) |
| `hardware/wokwi.toml` | Config for the Wokwi VS Code extension / wokwi-cli |

## What the circuit shows, and why one room

The simulation models **Work Room 1 (`work1`)**: 2 ceiling fans + 3 ceiling
lights, exactly the device set the backend tracks for that room. One room is
the honest unit of hardware here — every room in the office is electrically
identical (same 5 loads, same switch bank), so a single room node demonstrates
the complete design without triplicating an already-repetitive schematic.
Scaling to all 3 rooms is a deployment decision, not a design change (see
[Scaling to the full office](#scaling-to-the-full-office)).

An **ESP32 DevKitC V4** is the room controller. It:

1. reads the 5 wall switches (debounced, active-low),
2. drives the 5 relay channels that actually switch the loads,
3. samples the room's current-sensor tap on an ADC pin,
4. emits the same JSON device-state shape the backend serves
   (`{"room":"work1","devices":[...],"roomWatts":N}`) every 2 seconds and on
   every switch change.

In this Wokwi demo the JSON goes to the Serial monitor so it runs with zero
network setup. In the real install the ESP32 joins the office WiFi and POSTs
that JSON to the backend's REST API on port 4000 — the same ingestion surface
the software device-simulator feeds — so the dashboard, alert engine, and
Discord bot would light up from real hardware with no backend changes.

## Pin map

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

Pin choices are deliberate: GPIO 16/17/18/19/21 have no ESP32 strapping-pin
duties (unlike 0/2/5/12/15), so the relays cannot chatter while the board
boots; GPIO 34 is input-only with no pull-up circuitry, which makes it a
clean, side-effect-free ADC input; and the switch inputs avoid GPIO 34/35/36/39
because those pins cannot enable internal pull-ups.

## Electrical reasoning

**Why relays, never direct GPIO drive.** An ESP32 GPIO is a 3.3 V logic pin
rated for roughly 20–40 mA. The loads are 220 V AC appliances: a 60 W fan
draws ~0.27 A at mains voltage (far more at motor start), a 15 W light ~0.07 A.
That is three orders of magnitude beyond what a GPIO survives, and more
importantly it is a different voltage domain entirely — mains must never share
a conductor with logic. The GPIO therefore only energizes a relay coil
(through the relay board's driver transistor); the relay's isolated contacts
(`COM`/`NO`) do the actual 220 V switching. Coil side and contact side share
no electrical connection, so a mains fault cannot reach the microcontroller.
In a production install you would use an opto-isolated relay board (or SSRs)
for a second isolation barrier, with mains wiring in its own enclosure.

**Wall switch inputs: internal pull-ups, active-low.** Each switch connects
its GPIO to GND when closed; the ESP32's internal ~45 kΩ pull-up holds the pin
HIGH when open. So LOW = ON. This was chosen over external pull-downs
because it needs zero extra components per switch, and a switch line shorting
to ground in the wall (the most common wiring fault) reads as "switch on"
rather than applying a voltage anywhere. The firmware debounces with three
agreeing samples 25 ms apart; the sim switches also set `"bounce": "0"` so the
demo is crisp either way.

**Current sensing: where the ACS712 sits and what it means.** In the real
install an **ACS712-20A** Hall-effect sensor sits in series with the room
circuit's live wire, upstream of the relay bank — it measures the sum of
whatever loads are actually drawing current. Its output is analog: 2.5 V at
0 A, moving 100 mV per amp (so 5 A RMS reads as a 0.5 V swing). Since the
sensor runs at 5 V and the ESP32 ADC tops out at ~3.3 V, its output goes
through a divider before reaching GPIO 34. The value is the room's *measured*
power, which the backend can cross-check against the *expected* power computed
from relay states (fan 60 W, light 15 W). Disagreement is diagnostic gold: a
stalled fan, a burned-out light still "on", or a welded relay contact all show
up as measured-vs-expected mismatch.

**What each Wokwi stand-in maps to.** Wokwi cannot simulate 220 V AC loads or
an ACS712, so:

| In the Wokwi sim | In the real install |
| --- | --- |
| `wokwi-relay-module` × 5 | One channel of a 5/8-channel opto-isolated relay board (or SSR) |
| 3V3 rail on relay `COM` | 220 V AC live feed to the relay contact |
| LED + 220 Ω on relay `NO` | The fan or light itself, wired live–load–neutral |
| `wokwi-slide-switch` × 5 | Wall-plate switches, run as low-voltage signal lines to the controller |
| `wokwi-potentiometer` on GPIO 34 | ACS712-20A analog output (divided down), in series with the room circuit |

The LEDs are placed on the relays' switched side specifically so the sim
preserves the topology: control current flows GPIO→coil, load current flows
supply→`COM`→`NO`→load, and the two never touch.

## Run it (for judges)

Zero-setup path, ~60 seconds:

1. Go to **https://wokwi.com** → **New Project** → **ESP32** (pick the
   Arduino ESP32 template).
2. Open the **diagram.json** tab and replace its contents with
   `hardware/diagram.json`; open the **sketch.ino** tab and replace its
   contents with `hardware/sketch.ino`.
3. Press **Play** (the green button). Open the Serial Monitor, then slide any
   wall switch to the right: its relay clicks closed, the load LED lights,
   and a JSON telemetry line appears immediately (plus a heartbeat line every
   2 seconds). Drag the potentiometer knob to change the "measured" current in
   the `sense` field.

Alternative: with the **Wokwi for VS Code** extension, open the `hardware/`
folder — `wokwi.toml` is already set up. Build the firmware once with
arduino-cli (exact commands are in the comments at the top of `wokwi.toml`),
then run "Wokwi: Start Simulator".

Note on relay polarity: the sketch drives relays active-high, matching Wokwi's
current relay-module behavior (the part's docs page has a known inconsistency
— [wokwi-features#666](https://github.com/wokwi/wokwi-features/issues/666)).
If a future Wokwi build inverts this, flip `RELAY_ACTIVE_HIGH` to `0` at the
top of `sketch.ino`; nothing else changes.

## Scaling to the full office

Two sound options, both invisible to the backend since every node speaks the
same `POST` JSON:

- **One ESP32 per room (recommended).** Three identical ~$4 nodes, each
  flashed with the same firmware and a one-line room-id change. Rooms are
  isolated failure domains, wire runs stay short (switch and mains wiring
  stays inside each room), and adding a fourth room is copy-paste.
- **One central ESP32 + I/O expanders.** A single controller with I²C
  expanders (e.g. MCP23017: 16 GPIO per chip, so one for 15 relays plus one
  for 15 switches) and a 16-channel relay board. Cheaper by two devkits, but
  every switch line and load circuit must be home-run to one cabinet, and one
  crash takes out the whole office — the per-room option is the better
  engineering trade at this scale.

Per-room current sensing scales as one ACS712 per room on distinct ADC1 pins
(GPIO 32–39 territory) if centralized, or the same GPIO 34 tap on every
per-room node.
