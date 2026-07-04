import type { Alert } from '@office/shared';

interface AlertsPanelProps {
  alerts: Alert[];
  justArrived: Set<string>;
  /** Current sim-clock ISO time, so "since" can be shown relative ("23m ago"). */
  nowIso: string;
}

const TYPE_LABEL: Record<Alert['type'], string> = {
  'after-hours': 'AFTER HOURS',
  'room-all-on': 'ALL ON > 2H',
};

function timeAgo(iso: string, nowIso: string): string {
  const ms = new Date(nowIso).getTime() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m ago`;
}

export default function AlertsPanel({ alerts, justArrived, nowIso }: AlertsPanelProps) {
  return (
    <section className="rounded-2xl border border-white/10 bg-base-800/60 p-5 shadow-xl shadow-black/20">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-bold text-white">Active Alerts</h2>
        <span
          className={`rounded-full px-2 py-0.5 font-tech text-xs font-semibold ${
            alerts.length > 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/15 text-emerald-300'
          }`}
        >
          {alerts.length}
        </span>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-10 text-center">
          <span className="font-display text-sm font-bold text-emerald-300">All clear</span>
          <span className="mt-1 text-xs text-slate-500">No devices left on after hours or running unattended.</span>
        </div>
      ) : (
        <ul className="flex max-h-[420px] flex-col gap-2 overflow-y-auto scrollbar-thin pr-1">
          {alerts.map((alert) => {
            const isNew = justArrived.has(alert.id);
            return (
              <li
                key={alert.id}
                className={`rounded-xl border px-3 py-2.5 transition-colors ${
                  isNew
                    ? 'animate-slide-in border-rose-400/60 bg-rose-500/10'
                    : 'border-rose-500/20 bg-rose-500/[0.04]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded bg-rose-500/20 px-1.5 py-0.5 font-tech text-[10px] font-bold tracking-wide text-rose-300">
                    {TYPE_LABEL[alert.type]}
                  </span>
                  <span className="shrink-0 font-tech text-[10.5px] text-slate-500">{timeAgo(alert.since, nowIso)}</span>
                </div>
                <p className="mt-1.5 text-[13px] leading-snug text-slate-200">{alert.message}</p>
                <p className="mt-0.5 font-tech text-[10px] text-slate-600">
                  since {new Date(alert.since).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
