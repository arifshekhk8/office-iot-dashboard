import type { Device, RoomId } from '@office/shared';
import { ROOMS } from '@office/shared';

interface DeviceStatusPanelProps {
  devices: Device[];
  onToggle: (id: string) => void;
}

const ROOM_ACCENT: Record<RoomId, string> = {
  drawing: 'border-l-violet-500/60',
  work1: 'border-l-indigo-500/60',
  work2: 'border-l-sky-500/60',
};

function DeviceIcon({ type, on }: { type: Device['type']; on: boolean }) {
  if (type === 'light') {
    return (
      <span className="relative flex h-8 w-8 items-center justify-center">
        {on && <span className="absolute h-8 w-8 rounded-full bg-amber-400/25 blur-[6px]" />}
        <svg viewBox="0 0 24 24" className="relative h-4 w-4">
          <circle
            cx="12"
            cy="12"
            r="7"
            fill={on ? '#fbbf24' : '#334155'}
            stroke={on ? '#fde68a' : '#475569'}
            strokeWidth="1.2"
          />
        </svg>
      </span>
    );
  }
  return (
    <span className="relative flex h-8 w-8 items-center justify-center">
      <svg viewBox="0 0 24 24" className="h-4.5 w-4.5">
        <g
          style={{
            transformOrigin: '12px 12px',
            animation: on ? 'spin 0.9s linear infinite' : undefined,
          }}
          opacity={on ? 1 : 0.45}
        >
          {[0, 90, 180, 270].map((angle) => (
            <path
              key={angle}
              d="M12 12 C13.8 10.4 14.6 8 14.1 5.8 C13.7 4 10.3 4 9.9 5.8 C9.4 8 10.2 10.4 12 12 Z"
              transform={`rotate(${angle} 12 12)`}
              fill={on ? '#a5b4fc' : '#64748b'}
            />
          ))}
        </g>
        <circle cx="12" cy="12" r="1.8" fill={on ? '#e0e7ff' : '#475569'} />
      </svg>
    </span>
  );
}

function formatSince(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function DeviceRow({ device, onToggle }: { device: Device; onToggle: (id: string) => void }) {
  const on = device.status === 'on';
  return (
    <button
      onClick={() => onToggle(device.id)}
      className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-white/[0.04]"
    >
      <DeviceIcon type={device.type} on={on} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-slate-200">{device.label}</span>
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 font-tech text-[10px] font-semibold tracking-wide ${
              on ? 'bg-emerald-400/15 text-emerald-300' : 'bg-slate-700/60 text-slate-500'
            }`}
          >
            {on ? 'ON' : 'OFF'}
          </span>
        </div>
        <div className="mt-0.5 font-tech text-[11px] text-slate-500">
          since {formatSince(on ? device.onSince : device.lastChanged)}
        </div>
      </div>
      <div className="shrink-0 text-right font-tech text-sm tabular-nums text-slate-300">
        {device.watts}
        <span className="ml-0.5 text-[10px] text-slate-500">W</span>
      </div>
      <div
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${on ? 'bg-emerald-500/80' : 'bg-slate-700'}`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            on ? 'translate-x-4' : 'translate-x-0.5'
          }`}
        />
      </div>
    </button>
  );
}

export default function DeviceStatusPanel({ devices, onToggle }: DeviceStatusPanelProps) {
  const byRoom = new Map<RoomId, Device[]>();
  for (const d of devices) {
    const list = byRoom.get(d.room) ?? [];
    list.push(d);
    byRoom.set(d.room, list);
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-base-800/60 p-5 shadow-xl shadow-black/20">
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-bold text-white">Device Status</h2>
        <span className="font-tech text-xs text-slate-500">{devices.length} devices · live</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {ROOMS.map((room) => {
          const roomDevices = byRoom.get(room.id) ?? [];
          const onCount = roomDevices.filter((d) => d.status === 'on').length;
          return (
            <div
              key={room.id}
              className={`rounded-xl border-l-4 bg-base-900/70 p-3 ${ROOM_ACCENT[room.id]}`}
            >
              <div className="mb-1 flex items-center justify-between px-1">
                <h3 className="font-display text-sm font-bold text-slate-200">{room.name}</h3>
                <span className="font-tech text-[11px] text-slate-500">
                  {onCount}/{roomDevices.length} on
                </span>
              </div>
              <div className="mt-1 flex flex-col gap-0.5">
                {roomDevices.map((device) => (
                  <DeviceRow key={device.id} device={device} onToggle={onToggle} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
