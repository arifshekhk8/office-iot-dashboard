import type { Device, RoomId } from '@office/shared';
import { ROOMS, summarizePower } from '@office/shared';
import type { SimClock } from './clock';
import type { DeviceRepository } from './store';

const TICK_MS = 5_000;
/** How long a manual toggle (dashboard click / demo scenario) pins a device
 *  before the simulator may touch it again — otherwise the sim could flip a
 *  judge's toggle back one tick later. */
const MANUAL_HOLD_SIM_MS = 45 * 60_000;
const FLIP_CHANCE = 0.35;

export type ScenarioName = 'all-on' | 'all-off' | 'forget' | 'jump';

/**
 * Drives the 18 devices through a believable office day on the sim clock:
 * a morning ramp-up from ~8 AM, busy office hours with a lunch dip, an
 * evening wind-down — plus the two scripted misbehaviors the alert rules
 * exist for: a "busy room" that keeps everything on long enough to trip the
 * 2-hour rule, and a nightly chance that whoever leaves last forgets a room
 * entirely (the cleaner shuts it off around 21:00).
 */
export class Simulator {
  private timer: NodeJS.Timeout | null = null;
  private lastSimTick: Date;
  private energyWhToday = 0;
  private simDayKey: string;
  /** deviceId -> sim epoch ms until which the simulator must not touch it */
  private holds = new Map<string, number>();
  private busyRoom: RoomId;
  private forgottenRoom: RoomId | null = null;
  private wasAfterFive = false;

  constructor(
    private store: DeviceRepository,
    private clock: SimClock,
    private onTick: () => void,
  ) {
    const now = clock.now();
    this.lastSimTick = now;
    this.simDayKey = dayKey(now);
    this.busyRoom = pickRoom();
    this.wasAfterFive = now.getHours() >= 17;
  }

  start(): void {
    if (this.timer) return;
    this.tick();
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  get energyTodayKwh(): number {
    return Math.round(this.energyWhToday) / 1000;
  }

  /** Dashboard click / API toggle: flip and pin so the sim respects it. */
  manualToggle(id: string): Device | undefined {
    const device = this.store.get(id);
    if (!device) return undefined;
    const now = this.clock.now();
    const next = device.status === 'on' ? 'off' : 'on';
    const updated = this.store.setStatus(id, next, now);
    this.holds.set(id, now.getTime() + MANUAL_HOLD_SIM_MS);
    this.onTick();
    return updated;
  }

  applyScenario(name: ScenarioName, opts: { room?: RoomId; time?: string } = {}): string {
    const now = this.clock.now();
    switch (name) {
      case 'all-on':
      case 'all-off': {
        const status = name === 'all-on' ? 'on' : 'off';
        for (const d of this.store.all()) {
          this.store.setStatus(d.id, status, now);
          this.holds.set(d.id, now.getTime() + MANUAL_HOLD_SIM_MS);
        }
        if (name === 'all-off') this.forgottenRoom = null;
        this.onTick();
        return `all devices ${status}`;
      }
      case 'forget': {
        const room = opts.room ?? this.busyRoom;
        for (const d of this.store.byRoom(room)) {
          this.store.setStatus(d.id, 'on', now);
          this.holds.delete(d.id);
        }
        this.forgottenRoom = room;
        this.onTick();
        return `${room} left fully on ("forgot to turn off")`;
      }
      case 'jump': {
        const target = opts.time ?? '17:30';
        if (!this.clock.advanceTo(target)) return 'invalid time, expected HH:MM';
        this.tick();
        return `sim clock jumped to ${target}`;
      }
    }
  }

  private tick(): void {
    const simNow = this.clock.now();

    // Energy first: integrate the wattage that was flowing across the elapsed
    // sim interval, before this tick mutates anything.
    const deltaHours = (simNow.getTime() - this.lastSimTick.getTime()) / 3_600_000;
    if (deltaHours > 0) {
      this.energyWhToday += summarizePower(this.store.all()).totalWatts * deltaHours;
    }
    this.lastSimTick = simNow;

    // Sim-midnight rollover: new day, fresh kWh counter, new habits.
    if (dayKey(simNow) !== this.simDayKey) {
      this.simDayKey = dayKey(simNow);
      this.energyWhToday = 0;
      this.busyRoom = pickRoom();
      this.forgottenRoom = null;
    }

    // Crossing 17:00: sometimes the last person out forgets a whole room.
    const afterFive = simNow.getHours() >= 17;
    if (afterFive && !this.wasAfterFive && this.forgottenRoom === null && Math.random() < 0.65) {
      this.forgottenRoom = this.busyRoom;
    }
    this.wasAfterFive = afterFive;

    // The cleaner does a pass at ~21:00 and shuts the forgotten room down.
    if (this.forgottenRoom && hourOf(simNow) >= 21) {
      for (const d of this.store.byRoom(this.forgottenRoom)) {
        this.store.setStatus(d.id, 'off', simNow);
      }
      this.forgottenRoom = null;
    }

    const nowMs = simNow.getTime();
    for (const d of this.store.all()) {
      const heldUntil = this.holds.get(d.id);
      if (heldUntil !== undefined) {
        if (nowMs < heldUntil) continue;
        this.holds.delete(d.id);
      }
      // A forgotten room's devices stay exactly as they were left.
      if (this.forgottenRoom === d.room && !isWithinNine2Five(simNow)) continue;

      const pOn = this.targetOnProbability(d, simNow);
      const wantOn = Math.random() < pOn;
      const isOn = d.status === 'on';
      if (wantOn !== isOn && Math.random() < FLIP_CHANCE) {
        this.store.setStatus(d.id, wantOn ? 'on' : 'off', simNow);
      }
    }

    this.onTick();
  }

  /** Steady-state probability that a device should be on right now. */
  private targetOnProbability(d: Device, simNow: Date): number {
    const h = hourOf(simNow);
    // The day's busy room runs everything flat-out through the afternoon —
    // this is what trips the "all on for > 2h" rule during a daytime demo.
    if (d.room === this.busyRoom && h >= 13.5 && h < 17) return 0.995;

    const occ = occupancy(h) * (d.room === 'drawing' ? 0.65 : 1);
    return occ * (d.type === 'light' ? 0.92 : 0.72);
  }
}

/** Office occupancy curve over the day, 0..1. */
function occupancy(h: number): number {
  if (h < 7.5) return 0.02; // night guard walkthrough at most
  if (h < 9) return 0.1 + ((h - 7.5) / 1.5) * 0.8; // morning arrivals
  if (h < 13) return 0.95;
  if (h < 14) return 0.65; // lunch dip
  if (h < 17) return 0.95;
  if (h < 18.5) return Math.max(0.05, 0.6 - ((h - 17) / 1.5) * 0.55); // heading home
  return 0.03;
}

function hourOf(d: Date): number {
  return d.getHours() + d.getMinutes() / 60;
}

function isWithinNine2Five(d: Date): boolean {
  const h = d.getHours();
  return h >= 9 && h < 17;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function pickRoom(): RoomId {
  const ids = ROOMS.map((r) => r.id);
  return ids[Math.floor(Math.random() * ids.length)] ?? 'work1';
}
