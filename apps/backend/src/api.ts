import { Router } from 'express';
import type { RoomId, Snapshot } from '@office/shared';
import { ROOM_NAMES, ROOMS, resolveRoom, summarizePower } from '@office/shared';
import type { SimClock } from './clock';
import type { DeviceRepository } from './store';
import type { ScenarioName, Simulator } from './simulator';

interface ApiContext {
  store: DeviceRepository;
  clock: SimClock;
  simulator: Simulator;
  buildSnapshot: () => Snapshot;
}

export function createApi({ store, clock, simulator, buildSnapshot }: ApiContext): Router {
  const router = Router();

  router.get('/api/health', (_req, res) => {
    res.json({ ok: true, simTime: clock.now().toISOString(), timeScale: clock.scale });
  });

  /** Everything a client needs in one shot — same shape as the Socket.IO
   *  `snapshot` event, so REST consumers (the bot) and WebSocket consumers
   *  (the dashboard) see the identical truth. */
  router.get('/api/summary', (_req, res) => {
    res.json(buildSnapshot());
  });

  router.get('/api/devices', (_req, res) => {
    res.json(store.all());
  });

  router.get('/api/devices/:id', (req, res) => {
    const device = store.get(req.params.id);
    if (!device) return res.status(404).json({ error: `unknown device: ${req.params.id}` });
    res.json(device);
  });

  router.get('/api/rooms', (_req, res) => {
    res.json(
      ROOMS.map((room) => {
        const devices = store.byRoom(room.id);
        return { ...room, devices, watts: summarizePower(devices).totalWatts };
      }),
    );
  });

  router.get('/api/rooms/:roomId', (req, res) => {
    const roomId = resolveRoom(req.params.roomId);
    if (!roomId) {
      return res.status(404).json({
        error: `unknown room: ${req.params.roomId}`,
        knownRooms: ROOMS.map((r) => r.id),
      });
    }
    const devices = store.byRoom(roomId);
    res.json({ id: roomId, name: ROOM_NAMES[roomId], devices, watts: summarizePower(devices).totalWatts });
  });

  router.get('/api/alerts', (_req, res) => {
    res.json(buildSnapshot().alerts);
  });

  router.post('/api/devices/:id/toggle', (req, res) => {
    const device = simulator.manualToggle(req.params.id);
    if (!device) return res.status(404).json({ error: `unknown device: ${req.params.id}` });
    res.json(device);
  });

  /** Demo controls: `{"name":"forget","room":"work1"}`, `{"name":"jump","time":"17:30"}`,
   *  `{"name":"all-on"}`, `{"name":"all-off"}`. Lets a presenter reliably
   *  trigger every alert path live instead of waiting for the sim to roll dice. */
  router.post('/api/demo/scenario', (req, res) => {
    const { name, room, time } = (req.body ?? {}) as { name?: string; room?: string; time?: string };
    const valid: ScenarioName[] = ['all-on', 'all-off', 'forget', 'jump'];
    if (!name || !valid.includes(name as ScenarioName)) {
      return res.status(400).json({ error: `scenario must be one of: ${valid.join(', ')}` });
    }
    let roomId: RoomId | undefined;
    if (room !== undefined) {
      const resolved = resolveRoom(room);
      if (!resolved) return res.status(400).json({ error: `unknown room: ${room}` });
      roomId = resolved;
    }
    const result = simulator.applyScenario(name as ScenarioName, { room: roomId, time });
    res.json({ ok: true, result, simTime: clock.now().toISOString() });
  });

  return router;
}
