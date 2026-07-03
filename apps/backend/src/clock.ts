/**
 * Simulated office clock. Runs at `scale`× real time (SIM_TIME_SCALE=60 means
 * one real minute is one office hour) so a 3-minute demo can cross 9 AM,
 * lunch, 5 PM and the after-hours window instead of waiting for wall-clock
 * evening. Every timestamp in the system (lastChanged, onSince, alert.since,
 * kWh-today) lives on this clock.
 */
export class SimClock {
  private realAnchor: number;
  private simAnchor: number;

  constructor(startHHMM: string, public readonly scale: number) {
    const match = /^(\d{1,2}):(\d{2})$/.exec(startHHMM.trim());
    const start = new Date();
    if (match) {
      start.setHours(Number(match[1]), Number(match[2]), 0, 0);
    }
    this.simAnchor = start.getTime();
    this.realAnchor = Date.now();
  }

  now(): Date {
    return new Date(this.simAnchor + (Date.now() - this.realAnchor) * this.scale);
  }

  /** Jump the sim clock forward by `ms` simulated milliseconds (demo control). */
  advance(ms: number): void {
    if (ms > 0) this.simAnchor += ms;
  }

  /** Jump forward to the next occurrence of HH:MM on the sim clock. */
  advanceTo(hhmm: string): boolean {
    const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim());
    if (!match) return false;
    const now = this.now();
    const target = new Date(now);
    target.setHours(Number(match[1]), Number(match[2]), 0, 0);
    if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
    this.advance(target.getTime() - now.getTime());
    return true;
  }
}
