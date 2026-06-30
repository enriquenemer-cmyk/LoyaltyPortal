export async function generateImage(prompt: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY no configurada');
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'dall-e-3', prompt, n: 1, size: '1024x1024', quality: 'standard' }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenAI image error ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.data?.[0]?.url ?? '';
}

export async function generateText(prompt: string, opts?: { maxTokens?: number; temperature?: number }): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY no configurada');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: opts?.maxTokens ?? 200,
      temperature: opts?.temperature ?? 0.8,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenAI error ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

// ── Tool-calling chat completions ───────────────────────────────────────────

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
};

export type ToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
};

export type ToolDefinition = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
};

export type ChatCompletionResult = {
  message: {
    role: 'assistant';
    content: string | null;
    tool_calls?: ToolCall[];
  };
};

/**
 * Calls the OpenAI chat completions endpoint with tool-calling enabled.
 * Returns the raw assistant message (which may include tool_calls for the
 * caller to execute and feed back in a follow-up call).
 */
export async function generateWithTools(
  messages: ChatMessage[],
  tools: ToolDefinition[],
  opts?: { maxTokens?: number; temperature?: number }
): Promise<ChatCompletionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY no configurada');
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      tools,
      tool_choice: 'auto',
      max_tokens: opts?.maxTokens ?? 500,
      temperature: opts?.temperature ?? 0.3,
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OpenAI error ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = await res.json();
  const message = data.choices?.[0]?.message ?? { role: 'assistant', content: '' };
  return { message };
}
