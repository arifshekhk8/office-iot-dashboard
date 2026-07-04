/*
 * Techathon2026-Straw_Hat — hardware node for Work Room 1 ("work1")
 * ---------------------------------------------------------------
 * ESP32 DevKitC V4. Reads 5 wall switches (active-low, internal pull-ups),
 * drives 5 relay channels (2 fans + 3 lights), samples the room current
 * tap on GPIO34 (ADC), and prints one JSON telemetry line over Serial
 * every 2 seconds — plus immediately whenever a switch changes state.
 *
 * The JSON line is shaped exactly like the backend's per-room device state:
 *   {"room":"work1","devices":[{"id":"work1-fan-1","status":"on","watts":60},...],
 *    "roomWatts":N, "sense":{...}}
 *
 * REAL INSTALL NOTE: on physical hardware this exact JSON would not go to
 * Serial — the ESP32 would join the office WiFi (WiFi.h + HTTPClient) and
 * POST it to the backend's REST API (http://<backend-host>:4000), the same
 * ingestion surface the device simulator feeds. Serial is used here because
 * the Wokwi demo must run deterministically with zero network setup.
 *
 * Wokwi stand-ins (documented in docs/HARDWARE.md):
 *   - LED + 220R on each relay's NO contact  = 220 V AC fan/light load
 *   - Potentiometer on GPIO34                = ACS712-20A current sensor tap
 */

#include <Arduino.h>

// ---------------------------------------------------------------------------
// Relay polarity.
// Wokwi's wokwi-relay-module (default "npn" transistor attr) energizes the
// coil — closing COM->NO — when IN is driven HIGH, matching a typical
// transistor-driven relay board. If your physical relay board is one of the
// common opto-isolated LOW-trigger boards, flip this to 0; nothing else in
// the sketch changes.
// ---------------------------------------------------------------------------
#define RELAY_ACTIVE_HIGH 1

#if RELAY_ACTIVE_HIGH
static const uint8_t RELAY_ON_LEVEL  = HIGH;
static const uint8_t RELAY_OFF_LEVEL = LOW;
#else
static const uint8_t RELAY_ON_LEVEL  = LOW;
static const uint8_t RELAY_OFF_LEVEL = HIGH;
#endif

static const int DEVICE_COUNT = 5;

// Order matches the backend's device list for room "work1".
static const char *DEVICE_IDS[DEVICE_COUNT] = {
  "work1-fan-1", "work1-fan-2", "work1-light-1", "work1-light-2", "work1-light-3"
};

// Rated power (fan 60 W, light 15 W) — same constants the backend uses.
static const uint16_t DEVICE_WATTS[DEVICE_COUNT] = { 60, 60, 15, 15, 15 };

// Wall switches: common terminal -> GPIO, other terminal -> GND.
// INPUT_PULLUP, so closed switch reads LOW = device ON (active-low).
// All five pins support internal pull-ups (GPIO34/35/36/39 do not, and are
// deliberately not used for switches).
static const uint8_t SWITCH_PINS[DEVICE_COUNT] = { 25, 26, 27, 32, 33 };

// Relay control inputs. 16/17/18/19/21 are free of ESP32 strapping duties
// (unlike 0/2/5/12/15), so relays cannot chatter during boot.
static const uint8_t RELAY_PINS[DEVICE_COUNT] = { 16, 17, 18, 19, 21 };

// Room current tap. In the real install: ACS712-20A in series with the
// room's load circuit, its analog out divided down to the ADC range.
// GPIO34 is input-only ADC1 — ideal for a passive analog signal.
static const uint8_t CURRENT_SENSE_PIN = 34;

// ACS712-20A modelling for the sim: full pot travel = 0..10 A RMS.
static const float SENSE_FULL_SCALE_AMPS = 10.0f;
static const float MAINS_VOLTAGE = 230.0f;

static const unsigned long TELEMETRY_INTERVAL_MS = 2000;
static const unsigned long SWITCH_SAMPLE_MS = 25;
static const uint8_t DEBOUNCE_SAMPLES = 3; // 3 x 25 ms of agreement

static bool deviceOn[DEVICE_COUNT];
static uint8_t debounceCount[DEVICE_COUNT];
static unsigned long lastTelemetryAt = 0;
static unsigned long lastSampleAt = 0;

static bool readSwitch(int i) {
  return digitalRead(SWITCH_PINS[i]) == LOW; // active-low
}

static void applyRelay(int i) {
  digitalWrite(RELAY_PINS[i], deviceOn[i] ? RELAY_ON_LEVEL : RELAY_OFF_LEVEL);
}

static void printTelemetry() {
  int roomWatts = 0;
  for (int i = 0; i < DEVICE_COUNT; i++) {
    if (deviceOn[i]) roomWatts += DEVICE_WATTS[i];
  }

  int adcRaw = analogRead(CURRENT_SENSE_PIN); // 0..4095
  float sensedAmps = (adcRaw / 4095.0f) * SENSE_FULL_SCALE_AMPS;
  float sensedWatts = sensedAmps * MAINS_VOLTAGE;

  Serial.print("{\"room\":\"work1\",\"devices\":[");
  for (int i = 0; i < DEVICE_COUNT; i++) {
    if (i > 0) Serial.print(",");
    Serial.print("{\"id\":\"");
    Serial.print(DEVICE_IDS[i]);
    Serial.print("\",\"status\":\"");
    Serial.print(deviceOn[i] ? "on" : "off");
    Serial.print("\",\"watts\":");
    Serial.print(deviceOn[i] ? DEVICE_WATTS[i] : 0);
    Serial.print("}");
  }
  Serial.print("],\"roomWatts\":");
  Serial.print(roomWatts);

  // Raw current-sensor tap (extra keys; backend consumers ignore unknowns).
  // In the real install the backend cross-checks sensedWatts against
  // roomWatts to catch stalled fans, wiring faults, or a stuck relay.
  Serial.print(",\"sense\":{\"adcRaw\":");
  Serial.print(adcRaw);
  Serial.print(",\"amps\":");
  Serial.print(sensedAmps, 2);
  Serial.print(",\"approxWatts\":");
  Serial.print(sensedWatts, 0);
  Serial.println("}}");
}

void setup() {
  Serial.begin(115200);

  for (int i = 0; i < DEVICE_COUNT; i++) {
    pinMode(SWITCH_PINS[i], INPUT_PULLUP);
    pinMode(RELAY_PINS[i], OUTPUT);
    digitalWrite(RELAY_PINS[i], RELAY_OFF_LEVEL); // safe state before sync
  }
  pinMode(CURRENT_SENSE_PIN, INPUT);

  delay(50); // let pull-ups settle before the first read

  // Sync relays to the current wall-switch positions at boot.
  for (int i = 0; i < DEVICE_COUNT; i++) {
    deviceOn[i] = readSwitch(i);
    debounceCount[i] = 0;
    applyRelay(i);
  }

  Serial.println("// work1 hardware node up — slide a wall switch to toggle its load");
  printTelemetry();
  lastTelemetryAt = millis();
}

void loop() {
  unsigned long now = millis();

  // Debounced switch polling. On a confirmed change: drive the relay and
  // push a telemetry line immediately (mirrors the backend's
  // push-on-every-change semantics, not just the 2 s heartbeat).
  if (now - lastSampleAt >= SWITCH_SAMPLE_MS) {
    lastSampleAt = now;
    bool changed = false;

    for (int i = 0; i < DEVICE_COUNT; i++) {
      bool raw = readSwitch(i);
      if (raw != deviceOn[i]) {
        if (++debounceCount[i] >= DEBOUNCE_SAMPLES) {
          deviceOn[i] = raw;
          debounceCount[i] = 0;
          applyRelay(i);
          changed = true;
        }
      } else {
        debounceCount[i] = 0;
      }
    }

    if (changed) {
      printTelemetry();
      lastTelemetryAt = now;
    }
  }

  // 2-second telemetry heartbeat.
  if (now - lastTelemetryAt >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryAt = now;
    printTelemetry();
  }
}
