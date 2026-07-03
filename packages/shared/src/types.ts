export type RoomId = 'drawing' | 'work1' | 'work2';
export type DeviceType = 'fan' | 'light';
export type DeviceStatus = 'on' | 'off';

export interface Room {
  id: RoomId;
  name: string;
}

export interface Device {
  id: string;
  room: RoomId;
  type: DeviceType;
  label: string;
  status: DeviceStatus;
  /** Current draw in watts: ratedWatts while on, 0 while off. */
  watts: number;
  ratedWatts: number;
  /** Sim-clock ISO timestamp of the last on/off transition. */
  lastChanged: string;
  /** Sim-clock ISO timestamp the device was last switched on; null while off. */
  onSince: string | null;
}

export type AlertType = 'after-hours' | 'room-all-on';

export interface Alert {
  /** Stable identity (`after-hours:work1-fan-2`, `room-all-on:work1`) so
   *  clients can diff/animate and the bot can notify exactly once. */
  id: string;
  type: AlertType;
  room: RoomId;
  deviceId?: string;
  message: string;
  /** Sim-clock ISO timestamp the condition began. */
  since: string;
}

export interface PowerSummary {
  totalWatts: number;
  byRoom: Record<RoomId, number>;
}

/** Full state pushed to every client over Socket.IO and served at /api/summary. */
export interface Snapshot {
  simTime: string;
  timeScale: number;
  officeHours: { startHour: number; endHour: number };
  devices: Device[];
  power: PowerSummary;
  energyTodayKwh: number;
  alerts: Alert[];
}
