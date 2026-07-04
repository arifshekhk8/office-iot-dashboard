import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { createServer } from 'node:http';
import cors from 'cors';
import express from 'express';
import { Server } from 'socket.io';
import type { Snapshot } from '@office/shared';
import {
  OFFICE_END_HOUR,
  OFFICE_START_HOUR,
  buildDeviceCatalog,
  evaluateAlerts,
  summarizePower,
} from '@office/shared';
import { createApi } from './api';
import { AlertTracker } from './alertTracker';
import { SimClock } from './clock';
import { Simulator } from './simulator';
import { InMemoryDeviceRepository } from './store';

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

const PORT = Number(process.env.PORT ?? 4000);
const clock = new SimClock(process.env.SIM_START_TIME ?? '09:00', Number(process.env.SIM_TIME_SCALE ?? 60));

const store = new InMemoryDeviceRepository(buildDeviceCatalog(clock.now().toISOString()));
const tracker = new AlertTracker();

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

/**
 * Single source of truth, consumed identically over REST and Socket.IO.
 * Read-only: alert state advances only in `broadcast()` (tick cadence), so
 * REST reads between ticks can never swallow an `alert:new` edge.
 */
function buildSnapshot(): Snapshot {
  const devices = store.all();
  return {
    simTime: clock.now().toISOString(),
    timeScale: clock.scale,
    officeHours: { startHour: OFFICE_START_HOUR, endHour: OFFICE_END_HOUR },
    devices,
    power: summarizePower(devices),
    energyTodayKwh: simulator.energyTodayKwh,
    alerts: tracker.list(),
  };
}

/** Push state to every client (dashboard + bot) after each sim tick or
 *  manual change, with edge-triggered alert events for the bot's proactive
 *  channel pushes. */
function broadcast(): void {
  const { added, cleared } = tracker.update(evaluateAlerts(store.all(), clock.now()));
  io.emit('snapshot', buildSnapshot());
  for (const alert of added) io.emit('alert:new', alert);
  for (const alert of cleared) io.emit('alert:cleared', alert);
}

const simulator = new Simulator(store, clock, broadcast);

app.use(createApi({ store, clock, simulator, buildSnapshot }));

io.on('connection', (socket) => {
  socket.emit('snapshot', buildSnapshot());
});

httpServer.listen(PORT, () => {
  const simNow = clock.now();
  console.log(`[backend] listening on http://localhost:${PORT}`);
  console.log(`[backend] sim clock: ${simNow.toLocaleTimeString()} running at ${clock.scale}x`);
  simulator.start();
});
