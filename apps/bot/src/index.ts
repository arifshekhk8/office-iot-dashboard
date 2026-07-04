import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { io } from 'socket.io-client';
import type { Alert } from '@office/shared';
import { handleRoom, handleStatus, handleUsage } from './commands';
import { humanize } from './humanize';
import { buildAlertBatchTemplate, buildAlertTemplate } from './templates';

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:4000';
const ALERT_CHANNEL_ID = process.env.DISCORD_ALERT_CHANNEL_ID;
const PREFIX = '!';

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('[bot] DISCORD_BOT_TOKEN is not set — copy .env.example to .env and fill it in. Exiting.');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.on('error', (err) => console.error('[bot] discord client error:', err));

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const [rawCommand, ...rest] = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = rawCommand?.toLowerCase();
  const argument = rest.join(' ');

  try {
    if (command === 'status') {
      await message.channel.send(await handleStatus());
    } else if (command === 'room') {
      await message.channel.send(await handleRoom(argument));
    } else if (command === 'usage') {
      await message.channel.send(await handleUsage());
    }
  } catch (err) {
    console.error(`[bot] command "!${command}" failed:`, err);
    await message.channel.send("Sorry, I couldn't reach the office backend just now — try again in a moment.");
  }
});

/** Proactive alerts: mirrors the dashboard's Alerts Panel exactly — same
 *  backend, same alert engine, no duplicated logic. Fires the instant the
 *  backend detects a new condition, not on a poll.
 *
 *  Alerts that land within the same short window (e.g. several devices
 *  crossing after-hours in the same tick) are held and sent as one
 *  consolidated message instead of one Discord message per device. */
function connectAlertFeed(): void {
  const socket = io(BACKEND_URL, { reconnection: true, reconnectionDelay: 1000 });

  socket.on('connect', () => console.log(`[bot] alert feed connected to ${BACKEND_URL}`));
  socket.on('connect_error', (err) => console.error('[bot] alert feed connection error:', err.message));

  const BATCH_WINDOW_MS = 6000;
  let pending: Alert[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  async function flush(): Promise<void> {
    const batch = pending;
    pending = [];
    flushTimer = null;
    if (batch.length === 0 || !ALERT_CHANNEL_ID) return;

    try {
      const channel = await client.channels.fetch(ALERT_CHANNEL_ID);
      if (!channel || !channel.isTextBased() || !('send' in channel)) return;

      if (batch.length === 1) {
        const alert = batch[0];
        if (!alert) return;
        const template = buildAlertTemplate(alert);
        const text = await humanize(template, template);
        await channel.send(text);
      } else {
        await channel.send(buildAlertBatchTemplate(batch));
      }
    } catch (err) {
      console.error('[bot] failed to post proactive alert(s):', err);
    }
  }

  socket.on('alert:new', (alert: Alert) => {
    if (!ALERT_CHANNEL_ID) return;
    pending.push(alert);
    if (!flushTimer) flushTimer = setTimeout(flush, BATCH_WINDOW_MS);
  });
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`[bot] logged in as ${readyClient.user.tag}`);
  if (ALERT_CHANNEL_ID) connectAlertFeed();
  else console.warn('[bot] DISCORD_ALERT_CHANNEL_ID not set — proactive alerts disabled');
});

client.login(token);
