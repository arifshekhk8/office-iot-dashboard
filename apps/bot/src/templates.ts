import type { Alert, Device, Room, Snapshot } from '@office/shared';
import { ROOMS } from '@office/shared';

/**
 * Deterministic, always-correct phrasing built straight from backend data.
 * Used two ways: as the guaranteed reply when the LLM is unavailable, and as
 * the factual input the LLM is asked to rephrase — so the model is never the
 * source of a number, only of the sentence around it. Every number here
 * comes straight from the snapshot/devices argument; nothing is invented,
 * hardcoded, or randomized — only the sentence shape is hand-authored.
 */

/** "a, b, and c" — natural list joining instead of a comma dump. */
function joinNatural(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

function describeRoom(room: Room, devices: Device[]): string {
  const inRoom = devices.filter((d) => d.room === room.id);
  const fansOn = inRoom.filter((d) => d.type === 'fan' && d.status === 'on').length;
  const lightsOn = inRoom.filter((d) => d.type === 'light' && d.status === 'on').length;
  if (fansOn === 0 && lightsOn === 0) return `${room.name} is quiet 😴`;
  const bits: string[] = [];
  if (fansOn > 0) bits.push(`${fansOn} 🌀 fan${fansOn > 1 ? 's' : ''}`);
  if (lightsOn > 0) bits.push(`${lightsOn} 💡 light${lightsOn > 1 ? 's' : ''}`);
  return `${room.name} has ${joinNatural(bits)} on`;
}

export function buildStatusTemplate(snapshot: Snapshot): string {
  const anyDeviceOn = snapshot.devices.some((d) => d.status === 'on');
  const roomsSummary = anyDeviceOn
    ? joinNatural(ROOMS.map((room) => describeRoom(room, snapshot.devices)))
    : 'the whole office is quiet 😴, everything is off';

  const alertCount = snapshot.alerts.length;
  const alertNote =
    alertCount > 0
      ? `⚠️ Heads up — ${alertCount} alert${alertCount > 1 ? 's are' : ' is'} active right now.`
      : '✅ No alerts right now, all good.';

  return `🏢 Right now, ${roomsSummary} — pulling ${snapshot.power.totalWatts}W total. ${alertNote}`;
}

export function buildRoomTemplate(roomName: string, devices: Device[]): string {
  const lines = devices.map((d) => {
    const icon = d.type === 'fan' ? '🌀' : '💡';
    return d.status === 'on' ? `${icon} ${d.label} is on (${d.watts}W)` : `${icon} ${d.label} is off`;
  });
  const totalWatts = devices.reduce((sum, d) => sum + d.watts, 0);
  return `📍 In ${roomName} right now: ${joinNatural(lines)}. That's ${totalWatts}W total in this room.`;
}

export function buildUsageTemplate(snapshot: Snapshot): string {
  return `⚡ Right now the office is using ${snapshot.power.totalWatts}W across all 3 rooms. So far today, that's added up to about ${snapshot.energyTodayKwh.toFixed(2)} kWh. 🔋`;
}

export function buildAlertTemplate(alert: Alert): string {
  return `🔔 Just a heads up — ${alert.message}.`;
}

export function buildAlertBatchTemplate(alerts: Alert[]): string {
  const lines = alerts.map((a) => `• ${a.message}`);
  return `🔔 Heads up — ${alerts.length} thing${alerts.length > 1 ? 's need' : ' needs'} a look:\n${lines.join('\n')}`;
}
