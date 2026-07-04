import Anthropic from '@anthropic-ai/sdk';

const apiKey = process.env.ANTHROPIC_API_KEY;
const client = apiKey ? new Anthropic({ apiKey }) : null;

// Haiku 4.5 doesn't support `thinking`/`output_config.effort` (they error on
// this tier) — a plain messages.create call is the correct shape here.
const MODEL = 'claude-haiku-4-5';

/**
 * Turns backend-computed data into a friendly Discord reply. The LLM only
 * rephrases — `template` is already 100% correct and is exactly what ships
 * if the API key is missing, the call errors, or the model refuses; the bot
 * must never go silent or crash mid-demo over a phrasing call.
 */
export async function humanize(dataSummary: string, template: string): Promise<string> {
  if (!client) return template;
  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      system:
        'You rephrase office IoT status data into a short, friendly Discord message for a boss checking on the office. ' +
        'Use ONLY the numbers and facts given to you in the user message — never invent, estimate, or round differently. ' +
        'No markdown headers or bullet lists, 1-4 sentences, conversational tone, no robotic data dumps.',
      messages: [{ role: 'user', content: dataSummary }],
    });
    const text = response.content.find((block): block is Anthropic.TextBlock => block.type === 'text')?.text;
    return text?.trim() || template;
  } catch (err) {
    console.error('[bot] LLM humanization failed, using template fallback:', err);
    return template;
  }
}
