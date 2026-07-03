import type { Device, DeviceType, PowerSummary, Room, RoomId } from './types';

export const ROOMS: Room[] = [
  { id: 'drawing', name: 'Drawing Room' },
  { id: 'work1', name: 'Work Room 1' },
  { id: 'work2', name: 'Work Room 2' },
];

export const ROOM_NAMES: Record<RoomId, string> = {
  drawing: 'Drawing Room',
  work1: 'Work Room 1',
  work2: 'Work Room 2',
};

export const RATED_WATTS: Record<DeviceType, number> = { fan: 60, light: 15 };

const DEVICES_PER_ROOM: ReadonlyArray<{ type: DeviceType; count: number }> = [
  { type: 'fan', count: 2 },
  { type: 'light', count: 3 },
];

/** The fixed 18-device office: 3 rooms × (2 fans + 3 lights), all starting off. */
export function buildDeviceCatalog(initialTimestamp: string): Device[] {
  const devices: Device[] = [];
  for (const room of ROOMS) {
    for (const { type, count } of DEVICES_PER_ROOM) {
      for (let i = 1; i <= count; i++) {
        devices.push({
          id: `${room.id}-${type}-${i}`,
          room: room.id,
          type,
          label: `${type === 'fan' ? 'Fan' : 'Light'} ${i}`,
          status: 'off',
          watts: 0,
          ratedWatts: RATED_WATTS[type],
          lastChanged: initialTimestamp,
          onSince: null,
        });
      }
    }
  }
  return devices;
}

/** Power is always derived from device state so it can never drift out of sync. */
export function summarizePower(devices: Device[]): PowerSummary {
  const byRoom: Record<RoomId, number> = { drawing: 0, work1: 0, work2: 0 };
  let totalWatts = 0;
  for (const d of devices) {
    byRoom[d.room] += d.watts;
    totalWatts += d.watts;
  }
  return { totalWatts, byRoom };
}

/** Lenient room-name matching shared by the REST API and the bot's `!room` command. */
export function resolveRoom(input: string): RoomId | null {
  const key = input.trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (key === 'drawing' || key === 'drawingroom' || key === 'waiting' || key === 'waitingroom') return 'drawing';
  if (key === 'work1' || key === 'workroom1' || key === 'work_room1' || key === 'room1' || key === 'w1') return 'work1';
  if (key === 'work2' || key === 'workroom2' || key === 'room2' || key === 'w2') return 'work2';
  return null;
}
