import type { PowerSummary, RoomId } from '@office/shared';
import { ROOMS } from '@office/shared';
import { ROOM_HEX } from '../lib/theme';

interface PowerMeterProps {
  power: PowerSummary;
  energyTodayKwh: number;
}

const ROOM_MAX_WATTS = 2 * 60 + 3 * 15; // 2 fans + 3 lights, all on
const TOTAL_MAX_WATTS = ROOM_MAX_WATTS * 3;

export default function PowerMeter({ power, energyTodayKwh }: PowerMeterProps) {
  const totalPct = Math.min(100, (power.totalWatts / TOTAL_MAX_WATTS) * 100);

  return (
    <section className="rounded-2xl border border-white/10 bg-base-800/60 p-5 shadow-xl shadow-black/20">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-bold text-white">Power Consumption</h2>
        <span className="font-tech text-xs text-slate-500">live</span>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-end gap-2">
          <span className="font-display text-5xl font-black tabular-nums text-amber-300">
            {power.totalWatts}
          </span>
          <span className="mb-1.5 font-tech text-lg text-amber-400/70">W</span>
          <span className="relative ml-1 mb-2.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-900">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-[width] duration-700 ease-out"
            style={{ width: `${totalPct}%` }}
          />
        </div>
        <span className="font-tech text-[11px] text-slate-500">
          {energyTodayKwh.toFixed(2)} kWh consumed today
        </span>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        {ROOMS.map((room) => {
          const watts = power.byRoom[room.id as RoomId];
          const pct = Math.min(100, (watts / ROOM_MAX_WATTS) * 100);
          const color = ROOM_HEX[room.id as RoomId];
          return (
            <div key={room.id}>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">{room.name}</span>
                <span className="font-tech text-xs tabular-nums text-slate-400">{watts} W</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-base-900">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
