import AlertsPanel from './components/AlertsPanel';
import DeviceStatusPanel from './components/DeviceStatusPanel';
import Header from './components/Header';
import OfficeMap from './components/OfficeMap';
import PowerMeter from './components/PowerMeter';
import { useSnapshot } from './lib/useSnapshot';

export default function App() {
  const { snapshot, connection, justArrived, toggleDevice } = useSnapshot();

  return (
    <div className="min-h-screen">
      <Header connection={connection} simTime={snapshot?.simTime ?? null} timeScale={snapshot?.timeScale ?? null} />

      <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6">
        {!snapshot ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-base-800/60 py-24">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400" />
            </span>
            <p className="mt-4 font-display text-sm font-bold text-slate-300">Connecting to backend…</p>
            <p className="mt-1 text-xs text-slate-500">Waiting for the first snapshot over Socket.IO</p>
          </div>
        ) : (
          <>
            <section className="rounded-2xl border border-white/10 bg-base-800/60 p-5 shadow-xl shadow-black/20">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-display text-lg font-bold text-white">Office Floor Plan</h2>
                <span className="font-tech text-xs text-slate-500">click a device to toggle it</span>
              </div>
              <OfficeMap devices={snapshot.devices} onToggle={toggleDevice} />
            </section>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <PowerMeter power={snapshot.power} energyTodayKwh={snapshot.energyTodayKwh} />
              <AlertsPanel alerts={snapshot.alerts} justArrived={justArrived} nowIso={snapshot.simTime} />
            </div>

            <DeviceStatusPanel devices={snapshot.devices} onToggle={toggleDevice} />
          </>
        )}
      </main>

      <footer className="mx-auto max-w-7xl px-6 pb-8 pt-2 text-center font-tech text-[11px] text-slate-600">
        one backend · one truth · dashboard &amp; Discord bot both read the same snapshot
      </footer>
    </div>
  );
}
