import { createOpenAI } from "@ai-sdk/openai";

type ChatMessage = { role?: string; [key: string]: unknown };

function normalizeKimiRequestBody(body: string): string {
  const payload = JSON.parse(body) as {
    messages?: ChatMessage[];
    parallel_tool_calls?: unknown;
    reasoning_effort?: unknown;
    verbosity?: unknown;
    prompt_cache_key?: unknown;
    prompt_cache_retention?: unknown;
    safety_identifier?: unknown;
    service_tier?: unknown;
    store?: unknown;
    prediction?: unknown;
    max_completion_tokens?: unknown;
  };

  if (Array.isArray(payload.messages)) {
    payload.messages = payload.messages.map((message) =>
      message.role === "developer" ? { ...message, role: "system" } : message
    );
  }

  // Kimi rejects several OpenAI-only fields the AI SDK may include.
  delete payload.parallel_tool_calls;
  delete payload.reasoning_effort;
  delete payload.verbosity;
  delete payload.prompt_cache_key;
  delete payload.prompt_cache_retention;
  delete payload.safety_identifier;
  delete payload.service_tier;
  delete payload.store;
  delete payload.prediction;
  delete payload.max_completion_tokens;

  return JSON.stringify(payload);
}

const kimi = createOpenAI({
  name: "kimi",
  baseURL: "https://api.moonshot.ai/v1",
  apiKey: process.env.KIMI_API_KEY,
  fetch: async (input, init) => {
    if (!init?.body || typeof init.body !== "string") {
      return fetch(input, init);
    }

    return fetch(input, {
      ...init,
      body: normalizeKimiRequestBody(init.body),
    });
  },
});

export const kimiChatModel = kimi.chat(process.env.KIMI_MODEL ?? "kimi-k2.5");
