import type { Alert, Device, RoomId } from './types';
import { ROOM_NAMES, ROOMS } from './catalog';

export const OFFICE_START_HOUR = 9;
export const OFFICE_END_HOUR = 17;
export const ALL_ON_THRESHOLD_MS = 2 * 60 * 60 * 1000;

export function isWithinOfficeHours(simNow: Date): boolean {
  const h = simNow.getHours();
  return h >= OFFICE_START_HOUR && h < OFFICE_END_HOUR;
}

/** The most recent moment office hours ended, at or before `simNow`.
 *  Used so an "after hours" alert starts at 17:00, not at 14:00 when the
 *  device was originally (legitimately) switched on. */
function lastOfficeEndBefore(simNow: Date): Date {
  const boundary = new Date(simNow);
  boundary.setHours(OFFICE_END_HOUR, 0, 0, 0);
  if (boundary.getTime() > simNow.getTime()) boundary.setDate(boundary.getDate() - 1);
  return boundary;
}

/**
 * The office's two alert rules, defined once and evaluated ONLY by the
 * backend. The dashboard's alert panel and the bot's proactive pushes both
 * consume the backend's computed list — neither re-implements this.
 *
 * Rule 1 (after-hours): any device ON outside 9:00–17:00.
 * Rule 2 (room-all-on): every device in a room continuously ON for > 2h.
 *
 * Pure function of (devices, simNow), so `since` is deterministic and stable
 * across repeated evaluations.
 */
export function evaluateAlerts(devices: Device[], simNow: Date): Alert[] {
  const alerts: Alert[] = [];
  const now = simNow.getTime();

  if (!isWithinOfficeHours(simNow)) {
    const boundary = lastOfficeEndBefore(simNow).getTime();
    for (const d of devices) {
      if (d.status !== 'on' || !d.onSince) continue;
      const since = Math.max(new Date(d.onSince).getTime(), boundary);
      alerts.push({
        id: `after-hours:${d.id}`,
        type: 'after-hours',
        room: d.room,
        deviceId: d.id,
        message: `${d.label} in ${ROOM_NAMES[d.room]} is on outside office hours (9:00–17:00)`,
        since: new Date(since).toISOString(),
      });
    }
  }

  const byRoom = new Map<RoomId, Device[]>();
  for (const d of devices) {
    const list = byRoom.get(d.room) ?? [];
    list.push(d);
    byRoom.set(d.room, list);
  }
  for (const room of ROOMS) {
    const list = byRoom.get(room.id) ?? [];
    if (list.length === 0 || !list.every((d) => d.status === 'on' && d.onSince)) continue;
    const allOnSince = Math.max(...list.map((d) => new Date(d.onSince as string).getTime()));
    if (now - allOnSince > ALL_ON_THRESHOLD_MS) {
      alerts.push({
        id: `room-all-on:${room.id}`,
        type: 'room-all-on',
        room: room.id,
        message: `All ${list.length} devices in ${room.name} have been running continuously for over 2 hours`,
        since: new Date(allOnSince + ALL_ON_THRESHOLD_MS).toISOString(),
      });
    }
  }

  return alerts;
}
