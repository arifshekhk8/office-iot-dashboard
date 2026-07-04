import type { ConnectionState } from '../lib/useSnapshot';

interface HeaderProps {
  connection: ConnectionState;
  simTime: string | null;
  timeScale: number | null;
}

const STATUS_COPY: Record<ConnectionState, string> = {
  connected: 'Live',
  connecting: 'Connecting…',
  disconnected: 'Reconnecting…',
};

const STATUS_DOT: Record<ConnectionState, string> = {
  connected: 'bg-emerald-400',
  connecting: 'bg-amber-400',
  disconnected: 'bg-rose-500',
};

export default function Header({ connection, simTime, timeScale }: HeaderProps) {
  const clock = simTime
    ? new Date(simTime).toLocaleString([], {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '—';

  return (
    <header className="sticky top-0 z-10 border-b border-white/10 bg-base-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <div>
          <h1 className="font-display text-xl font-extrabold tracking-tight text-white">
            OFFICE <span className="text-amber-300">IOT</span> CONTROL
          </h1>
          <p className="text-xs text-slate-500">3 rooms · 15 devices · one backend, no duplicated truth</p>
        </div>

        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="font-tech text-sm tabular-nums text-slate-200">{clock}</div>
            <div className="font-tech text-[10.5px] text-slate-500">
              office clock{timeScale ? ` · ${timeScale}×` : ''}
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-base-900/70 px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              {connection === 'connected' && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              )}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${STATUS_DOT[connection]}`} />
            </span>
            <span className="text-xs font-medium text-slate-300">{STATUS_COPY[connection]}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
