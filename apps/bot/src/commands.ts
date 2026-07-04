import type { Device } from '@office/shared';
import { fetchRoom, fetchSummary } from './backend';
import { humanize } from './humanize';
import { buildRoomTemplate, buildStatusTemplate, buildUsageTemplate } from './templates';

export async function handleStatus(): Promise<string> {
  const snapshot = await fetchSummary();
  const template = buildStatusTemplate(snapshot);
  return humanize(template, template);
}

export async function handleRoom(argument: string): Promise<string> {
  if (!argument.trim()) {
    return 'Usage: `!room <name>` — try `drawing`, `work1`, or `work2`.';
  }
  const room = await fetchRoom(argument);
  if (!room) {
    return `I don't know a room called "${argument}". Try \`drawing\`, \`work1\`, or \`work2\`.`;
  }
  const template = buildRoomTemplate(room.name, room.devices as Device[]);
  return humanize(template, template);
}

export async function handleUsage(): Promise<string> {
  const snapshot = await fetchSummary();
  const template = buildUsageTemplate(snapshot);
  return humanize(template, template);
}
