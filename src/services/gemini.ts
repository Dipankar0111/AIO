import { GroqModelConfig } from '../types';
import { parseActionsFromContent } from './groq';

export const GEMINI_FALLBACK_MODELS: GroqModelConfig[] = [
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Fast multimodal Gemini model with 1M context window.',
    contextWindow: 1048576,
    badge: 'Gemini 1M',
    speedRating: 'ultra-fast',
    provider: 'gemini'
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Deep reasoning Gemini model with 1M+ token context.',
    contextWindow: 1048576,
    badge: 'Gemini Pro',
    speedRating: 'balanced',
    provider: 'gemini'
  }
];

export async function testGeminiConnection(apiKey: string): Promise<{
  success: boolean;
  message: string;
  modelCount?: number;
  latencyMs?: number;
}> {
  const cleanKey = apiKey ? apiKey.trim() : '';
  if (!cleanKey) {
    return { success: false, message: 'Please enter a valid Google Gemini API key.' };
  }

  const startTime = performance.now();
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`
    );
    const latencyMs = Math.round(performance.now() - startTime);

    if (response.status === 400 || response.status === 403) {
      return {
        success: false,
        message: 'Invalid Gemini API Key. Please check your key in Google AI Studio.'
      };
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errData?.error?.message || `HTTP ${response.status} error`
      };
    }

    const data = await response.json();
    const models = (data.models || []).filter((m: any) =>
      Array.isArray(m.supportedGenerationMethods) &&
      m.supportedGenerationMethods.includes('generateContent')
    );

    return {
      success: true,
      message: `Connected to Gemini (${models.length} models, ${latencyMs}ms)`,
      modelCount: models.length,
      latencyMs
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Network error while connecting to Gemini API.'
    };
  }
}

export async function fetchGeminiModels(apiKey: string): Promise<GroqModelConfig[]> {
  const cleanKey = apiKey ? apiKey.trim() : '';
  if (!cleanKey) return [];

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(cleanKey)}`
    );
    if (!response.ok) return GEMINI_FALLBACK_MODELS;

    const data = await response.json();
    const list: GroqModelConfig[] = (data.models || [])
      .filter((m: any) =>
        Array.isArray(m.supportedGenerationMethods) &&
        m.supportedGenerationMethods.includes('generateContent') &&
        typeof m.name === 'string' &&
        m.name.includes('gemini')
      )
      .slice(0, 12)
      .map((m: any) => {
        const id = m.name.replace(/^models\//, '');
        return {
          id,
          name: m.displayName || id,
          description: m.description || `Google Gemini model (${id})`,
          contextWindow: m.inputTokenLimit || 1048576,
          badge: id.includes('pro') ? 'Gemini Pro' : 'Gemini',
          speedRating: id.includes('flash') ? 'ultra-fast' : 'balanced',
          provider: 'gemini' as const
        };
      });

    return list.length > 0 ? list : GEMINI_FALLBACK_MODELS;
  } catch {
    return GEMINI_FALLBACK_MODELS;
  }
}

export async function streamGeminiChatCompletion({
  apiKey,
  model,
  messages,
  temperature = 0.7,
  maxTokens = 2048,
  topP = 1,
  stopSequences = [],
  onDelta,
  onFinish,
  onError
}: {
  apiKey: string;
  model: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
  onDelta: (accumulated: string, chunk: string) => void;
  onFinish: (result: {
    content: string;
    metrics: { latencyMs: number; tokensPerSecond: number; totalTokens: number };
    detectedActions?: any;
  }) => void;
  onError: (error: Error) => void;
}): Promise<void> {
  const cleanKey = apiKey.trim();
  const startTime = performance.now();

  const systemMessages = messages.filter(m => m.role === 'system').map(m => m.content).join('\n\n');
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  const body: Record<string, any> = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
      topP,
      ...(stopSequences.length > 0 ? { stopSequences: stopSequences.slice(0, 4) } : {})
    }
  };

  if (systemMessages) {
    body.systemInstruction = { parts: [{ text: systemMessages }] };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(cleanKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok || !response.body) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `Gemini HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let accumulated = '';
    let buffer = '';
    let totalTokens = 0;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const jsonStr = trimmed.slice(5).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;
        try {
          const parsed = JSON.parse(jsonStr);
          const chunk = parsed?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('') || '';
          if (chunk) {
            accumulated += chunk;
            onDelta(accumulated, chunk);
          }
          if (parsed?.usageMetadata?.totalTokenCount) {
            totalTokens = parsed.usageMetadata.totalTokenCount;
          }
        } catch {
          // Ignore partial SSE chunk
        }
      }
    }

    const latencyMs = Math.max(1, Math.round(performance.now() - startTime));
    const estTokens = totalTokens || Math.max(1, Math.ceil(accumulated.length / 4));
    const tokensPerSecond = Math.round((estTokens / (latencyMs / 1000)) * 10) / 10;

    onFinish({
      content: accumulated,
      metrics: { latencyMs, tokensPerSecond, totalTokens: estTokens },
      detectedActions: parseActionsFromContent(accumulated)
    });
  } catch (err: any) {
    onError(err instanceof Error ? err : new Error(err?.message || 'Gemini inference failed'));
  }
}
