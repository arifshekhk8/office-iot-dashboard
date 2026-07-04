import type { Device, RoomId, Snapshot } from '@office/shared';

/** Reads process.env inside each function, not at module load: this file is
 *  imported (via index.ts -> commands.ts) before index.ts's own dotenv
 *  config() call runs, so a top-level read here would permanently capture
 *  whatever was in process.env before .env was loaded. */
function backendUrl(): string {
  return process.env.BACKEND_URL ?? 'http://localhost:4000';
}

/** Same shape the dashboard renders — the bot is a thin client of the
 *  identical snapshot, never a second computation of "reality". */
export async function fetchSummary(): Promise<Snapshot> {
  const res = await fetch(`${backendUrl()}/api/summary`);
  if (!res.ok) throw new Error(`backend /api/summary returned ${res.status}`);
  return res.json() as Promise<Snapshot>;
}

export interface RoomSummary {
  id: RoomId;
  name: string;
  devices: Device[];
  watts: number;
}

/** Backend does the lenient name matching (resolveRoom in @office/shared) —
 *  `null` means the room name genuinely didn't match anything. */
export async function fetchRoom(roomIdOrName: string): Promise<RoomSummary | null> {
  const res = await fetch(`${backendUrl()}/api/rooms/${encodeURIComponent(roomIdOrName)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`backend /api/rooms/${roomIdOrName} returned ${res.status}`);
  return res.json() as Promise<RoomSummary>;
}
