/**
 * Helper to call standard OpenAI-compatible endpoints including Groq, Ollama, etc.
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: object;
  };
}

export interface GroqResponse {
  content: string | null;
  tool_calls?: ToolCall[];
}

/** Parse "Please try again in Xs" from Groq 429 error body */
function parseRetryAfterMs(body: string): number {
  const match = body.match(/try again in\s+([\d.]+)s/i);
  if (match?.[1]) return Math.ceil(parseFloat(match[1]) * 1000) + 300;
  return 5000;
}

/**
 * Recovery: when the model generates the legacy <function=name{...}></function> format,
 * parse it manually so we don't fail the entire request.
 */
function recoverFromFailedGeneration(errorBody: string): GroqResponse | null {
  try {
    const parsed = JSON.parse(errorBody) as {
      error?: { failed_generation?: string };
    };
    const raw = parsed?.error?.failed_generation;
    if (!raw) return null;

    // Match: <function=NAME{...json...}</function> or <function=NAME{...json...}>
    const pattern = /<function=([a-zA-Z_]+)(\{[\s\S]*?\})<\/function>|<function=([a-zA-Z_]+)(\{[\s\S]*?\})>/;
    const match = raw.match(pattern);
    if (!match) return null;

    const name = match[1] ?? match[3];
    const argsRaw = match[2] ?? match[4];
    if (!name || !argsRaw) return null;

    // Validate JSON
    JSON.parse(argsRaw);

    const syntheticToolCall: ToolCall = {
      id: `recovered_${Date.now()}`,
      type: "function",
      function: { name, arguments: argsRaw },
    };

    return { content: null, tool_calls: [syntheticToolCall] };
  } catch {
    return null;
  }
}

async function callGroqOnce(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  tools?: ToolDefinition[],
): Promise<{ ok: true; data: GroqResponse } | { ok: false; status: number; body: string }> {
  const payload: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.3, // lower = more precise tool call formatting
    max_tokens: 4096,
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
    payload.tool_choice = "auto";
  }

  const normalizedBaseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const endpoint = normalizedBaseUrl.endsWith("/chat/completions") ? normalizedBaseUrl : `${normalizedBaseUrl}/chat/completions`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    return { ok: false, status: response.status, body: text };
  }

  const data = await response.json() as {
    choices: Array<{
      message: { content: string | null; tool_calls?: ToolCall[] };
    }>;
  };

  const message = data.choices[0]?.message;
  return {
    ok: true,
    data: { content: message?.content ?? null, tool_calls: message?.tool_calls },
  };
}

/**
 * Sends a message to Groq with:
 * - Retry with backoff on 429 (rate limit)
 * - Recovery parser on 400 tool_use_failed (extracts malformed function call)
 * - Model fallback when recovery fails
 */
export async function sendGroqAgentMessage(
  baseUrl: string,
  apiKey: string,
  modelId: string,
  messages: ChatMessage[],
  tools?: ToolDefinition[],
): Promise<GroqResponse> {
  const MAX_RETRIES = 2;

  let attempt = 0;
  while (attempt < MAX_RETRIES) {
    attempt++;
    const result = await callGroqOnce(baseUrl, apiKey, modelId, messages, tools);

    if (result.ok) {
      if (!result.data.content && !result.data.tool_calls) {
         // Workaround when models give completely empty payload
         return { content: null };
      }
      return result.data;
    }

    // Rate limit → wait then retry
    if (result.status === 429) {
      if (attempt < MAX_RETRIES) {
        const waitMs = parseRetryAfterMs(result.body);
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }
      break; 
    }

    // Malformed tool call → try to recover
    if (result.status === 400 && result.body.includes("tool_use_failed")) {
      const recovered = recoverFromFailedGeneration(result.body);
      if (recovered) return recovered; // ✅ recovered successfully
      break; 
    }

    // Other non-retryable error
    if (result.status === 400 || result.status === 401 || result.status === 404) {
      throw new Error(`API error ${result.status}: ${result.body}`);
    }

    throw new Error(`API error ${result.status}: ${result.body}`);
  }

  throw new Error(

    "SiriusAI não conseguiu responder agora. Aguarde alguns segundos e tente novamente.",
  );
}
