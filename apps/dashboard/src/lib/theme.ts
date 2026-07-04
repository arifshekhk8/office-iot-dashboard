import type { RoomId } from '@office/shared';

/** One room-color mapping shared by every panel, kept distinct from the
 *  semantic colors used elsewhere (emerald = live/on, amber = energy,
 *  rose = alert) so nothing reads as ambiguous when they sit side by side. */
export const ROOM_HEX: Record<RoomId, string> = {
  drawing: '#a78bfa',
  work1: '#818cf8',
  work2: '#38bdf8',
};
