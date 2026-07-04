import type { Alert, Device, Snapshot } from '@office/shared';
import { ROOMS } from '@office/shared';

/**
 * Deterministic, always-correct phrasing built straight from backend data.
 * Used two ways: as the guaranteed reply when the LLM is unavailable, and as
 * the factual input the LLM is asked to rephrase — so the model is never the
 * source of a number, only of the sentence around it.
 */

export function buildStatusTemplate(snapshot: Snapshot): string {
  const perRoom = ROOMS.map((room) => {
    const devices = snapshot.devices.filter((d) => d.room === room.id);
    const fansOn = devices.filter((d) => d.type === 'fan' && d.status === 'on').length;
    const lightsOn = devices.filter((d) => d.type === 'light' && d.status === 'on').length;
    if (fansOn === 0 && lightsOn === 0) return `${room.name}: all off`;
    const bits: string[] = [];
    if (fansOn > 0) bits.push(`${fansOn} fan${fansOn > 1 ? 's' : ''} ON`);
    if (lightsOn > 0) bits.push(`${lightsOn} light${lightsOn > 1 ? 's' : ''} ON`);
    return `${room.name}: ${bits.join(', ')}`;
  });
  const alertNote =
    snapshot.alerts.length > 0
      ? ` ${snapshot.alerts.length} active alert${snapshot.alerts.length > 1 ? 's' : ''}.`
      : ' No active alerts.';
  return `${perRoom.join('. ')}. Total power draw: ${snapshot.power.totalWatts}W.${alertNote}`;
}

export function buildRoomTemplate(roomName: string, devices: Device[]): string {
  const lines = devices.map((d) => `${d.label} ${d.status.toUpperCase()}${d.status === 'on' ? ` (${d.watts}W)` : ''}`);
  const totalWatts = devices.reduce((sum, d) => sum + d.watts, 0);
  return `${roomName}: ${lines.join(', ')}. Total: ${totalWatts}W.`;
}

export function buildUsageTemplate(snapshot: Snapshot): string {
  return `Current total power draw: ${snapshot.power.totalWatts}W across all 3 rooms. Estimated energy used today: ${snapshot.energyTodayKwh.toFixed(2)} kWh.`;
}

export function buildAlertTemplate(alert: Alert): string {
  return `Alert: ${alert.message}`;
}

export function buildAlertBatchTemplate(alerts: Alert[]): string {
  const lines = alerts.map((a) => `• ${a.message}`);
  return `${alerts.length} new alerts:\n${lines.join('\n')}`;
}
