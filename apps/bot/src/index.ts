import 'dotenv/config';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import { io } from 'socket.io-client';
import type { Alert } from '@office/shared';
import { handleRoom, handleStatus, handleUsage } from './commands';
import { humanize } from './humanize';
import { buildAlertTemplate } from './templates';

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
 *  backend detects a new condition, not on a poll. */
function connectAlertFeed(): void {
  const socket = io(BACKEND_URL, { reconnection: true, reconnectionDelay: 1000 });

  socket.on('connect', () => console.log(`[bot] alert feed connected to ${BACKEND_URL}`));
  socket.on('connect_error', (err) => console.error('[bot] alert feed connection error:', err.message));

  socket.on('alert:new', async (alert: Alert) => {
    if (!ALERT_CHANNEL_ID) return;
    try {
      const channel = await client.channels.fetch(ALERT_CHANNEL_ID);
      if (!channel || !channel.isTextBased() || !('send' in channel)) return;
      const template = buildAlertTemplate(alert);
      const text = await humanize(template, template);
      await channel.send(text);
    } catch (err) {
      console.error('[bot] failed to post proactive alert:', err);
    }
  });
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`[bot] logged in as ${readyClient.user.tag}`);
  if (ALERT_CHANNEL_ID) connectAlertFeed();
  else console.warn('[bot] DISCORD_ALERT_CHANNEL_ID not set — proactive alerts disabled');
});

client.login(token);
