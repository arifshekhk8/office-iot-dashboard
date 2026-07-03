import type { Device, DeviceStatus, RoomId } from '@office/shared';

/**
 * Storage seam: everything above this interface (simulator, API, alerts)
 * is storage-agnostic, so the in-memory map could be swapped for SQLite or
 * Postgres without touching callers. In-memory is deliberate for the demo —
 * fewer moving parts on judging day.
 */
export interface DeviceRepository {
  all(): Device[];
  get(id: string): Device | undefined;
  byRoom(room: RoomId): Device[];
  setStatus(id: string, status: DeviceStatus, at: Date): Device | undefined;
}

export class InMemoryDeviceRepository implements DeviceRepository {
  private devices = new Map<string, Device>();

  constructor(seed: Device[]) {
    for (const d of seed) this.devices.set(d.id, d);
  }

  all(): Device[] {
    return [...this.devices.values()];
  }

  get(id: string): Device | undefined {
    return this.devices.get(id);
  }

  byRoom(room: RoomId): Device[] {
    return this.all().filter((d) => d.room === room);
  }

  setStatus(id: string, status: DeviceStatus, at: Date): Device | undefined {
    const device = this.devices.get(id);
    if (!device || device.status === status) return device;
    device.status = status;
    device.watts = status === 'on' ? device.ratedWatts : 0;
    device.lastChanged = at.toISOString();
    device.onSince = status === 'on' ? at.toISOString() : null;
    return device;
  }
}
