/**
 * Turns backend-computed data into a friendly Discord reply. The LLM only
 * rephrases — `template` is already 100% correct and is exactly what ships
 * if the API key is missing, the call errors, or the model refuses; the bot
 * must never go silent or crash mid-demo over a phrasing call.
 *
 * Groq's API is OpenAI-compatible (same chat-completions request/response
 * shape), so a plain fetch call covers it without adding an SDK dependency.
 *
 * Reads process.env inside the function, not at module load: this file is
 * imported (transitively, via index.ts -> commands.ts) before index.ts's own
 * dotenv config() call runs, so a top-level `process.env.GROQ_API_KEY` read
 * here would permanently capture undefined regardless of what's in .env.
 */
export async function humanize(dataSummary: string, template: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  const model = process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile';
  if (!apiKey) return template;
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        messages: [
          {
            role: 'system',
            content:
              'You rephrase office IoT status data into a short, friendly Discord message for a boss checking on the office. ' +
              'Use ONLY the numbers and facts given to you in the user message — never invent, estimate, or round differently. ' +
              'No markdown headers or bullet lists, 1-4 sentences, conversational tone, no robotic data dumps.',
          },
          { role: 'user', content: dataSummary },
        ],
      }),
    });
    if (!response.ok) throw new Error(`Groq API ${response.status}: ${await response.text()}`);
    const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content;
    return text?.trim() || template;
  } catch (err) {
    console.error('[bot] LLM humanization failed, using template fallback:', err);
    return template;
  }
}
