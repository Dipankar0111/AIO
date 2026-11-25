import { ChatMessage, DailyScheduleAIResponse, ExtractionMode, GroqModelConfig } from '../types';
import { GROQ_MODELS, GROQ_VISION_MODELS } from '../utils/constants';

interface ChatCompletionOptions {
  apiKey: string;
  model: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  responseFormat?: { type: 'json_object' | 'text' };
}

interface ChatCompletionResult {
  content: string;
  metrics: {
    latencyMs: number;
    completionTokens: number;
    promptTokens: number;
    totalTokens: number;
    tokensPerSecond: number;
  };
  detectedActions: ChatMessage['detectedActions'];
  fallbackModel?: string;
}

export function parseActionsFromContent(text: string): ChatMessage['detectedActions'] {
  const actions: NonNullable<ChatMessage['detectedActions']> = [];

  // 1. Detect ```action:save_note ... ```
  const noteRegex = /```action:save_note\s*([\s\S]*?)```/g;
  let match;
  while ((match = noteRegex.exec(text)) !== null) {
    try {
      const data = JSON.parse(match[1].trim());
      actions.push({
        type: 'save_note',
        label: `Save Note: "${data.title || 'Untitled'}"`,
        payload: data
      });
    } catch (e) {
      console.warn('Failed to parse save_note action JSON:', e);
    }
  }

  // 2. Detect ```action:add_event ... ```
  const eventRegex = /```action:add_event\s*([\s\S]*?)```/g;
  while ((match = eventRegex.exec(text)) !== null) {
    try {
      const data = JSON.parse(match[1].trim());
      actions.push({
        type: 'add_event',
        label: `Add to Calendar: "${data.title || 'Event'}" (${data.startTime || ''})`,
        payload: data
      });
    } catch (e) {
      console.warn('Failed to parse add_event action JSON:', e);
    }
  }

  // 3. Detect ```action:add_todo ... ```
  const todoRegex = /```action:add_todo\s*([\s\S]*?)```/g;
  while ((match = todoRegex.exec(text)) !== null) {
    try {
      const data = JSON.parse(match[1].trim());
      actions.push({
        type: 'add_todo',
        label: `Add To-Do: "${data.title || 'Task'}"`,
        payload: data
      });
    } catch (e) {
      console.warn('Failed to parse add_todo action JSON:', e);
    }
  }

  return actions.length > 0 ? actions : undefined;
}

/**
 * Dynamically fetch available models from Groq API
 */
export async function fetchGroqModels(apiKey: string): Promise<GroqModelConfig[]> {
  const cleanKey = apiKey ? apiKey.trim() : '';
  if (!cleanKey) return GROQ_MODELS;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        Authorization: `Bearer ${cleanKey}`
      }
    });

    if (!response.ok) return GROQ_MODELS;

    const data = await response.json();
    const fetchedIds: string[] = (data.data || []).map((m: any) => m.id);

    // Merge fetched models with preset configs
    const merged: GroqModelConfig[] = [];

    // Add preset models that exist in fetched list or are primary
    GROQ_MODELS.forEach(preset => {
      merged.push(preset);
    });

    // Add any new fetched models not in presets
    fetchedIds.forEach(id => {
      if (!merged.some(m => m.id === id) && !id.includes('whisper')) {
        merged.push({
          id,
          name: id.split('/').pop()?.replace(/-/g, ' ') || id,
          description: `Groq active model (${id})`,
          contextWindow: id.includes('32k') ? 32768 : 128000,
          badge: id.includes('vision') ? 'Vision' : 'Active',
          speedRating: id.includes('instant') || id.includes('8b') ? 'ultra-fast' : 'fast'
        });
      }
    });

    return merged;
  } catch (err) {
    console.warn('Failed to fetch dynamic Groq models, using default presets:', err);
    return GROQ_MODELS;
  }
}

/**
 * Fast connection test for Settings modal
 */
export async function testGroqConnection(apiKey: string): Promise<{
  success: boolean;
  message: string;
  modelCount?: number;
  latencyMs?: number;
}> {
  const cleanKey = apiKey ? apiKey.trim() : '';
  if (!cleanKey) {
    return { success: false, message: 'Please enter a valid Groq API key.' };
  }

  const startTime = performance.now();
  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        Authorization: `Bearer ${cleanKey}`
      }
    });

    const latencyMs = Math.round(performance.now() - startTime);

    if (response.status === 401) {
      return {
        success: false,
        message: 'Invalid API Key (401). Please check that your key starts with "gsk_".'
      };
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      return {
        success: false,
        message: errData?.error?.message || `Groq API Error (${response.status})`
      };
    }

    const data = await response.json();
    const count = (data.data || []).length;

    return {
      success: true,
      latencyMs,
      modelCount: count,
      message: `Connected successfully! (${count} active models, latency: ${latencyMs}ms)`
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Network connection failed. Verify internet access.'
    };
  }
}

/**
 * Send standard or fallback chat completion
 */
export async function sendChatCompletion({
  apiKey,
  model,
  messages,
  temperature = 0.7,
  maxTokens = 2048,
  topP = 1,
  responseFormat
}: ChatCompletionOptions): Promise<ChatCompletionResult> {
  const cleanKey = apiKey ? apiKey.trim() : '';

  // If no API key provided, generate a simulated response in Demo Mode
  if (!cleanKey) {
    return generateDemoChatResponse(messages, model);
  }

  // Fallback candidate chain if primary model encounters 404/400
  const candidateModels = [
    model,
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant'
  ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

  let lastError: Error | null = null;

  for (const modelToTry of candidateModels) {
    const startTime = performance.now();
    try {
      const payload: any = {
        model: modelToTry,
        messages,
        temperature,
        max_tokens: maxTokens,
        top_p: topP
      };

      if (responseFormat) {
        payload.response_format = responseFormat;
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanKey}`
        },
        body: JSON.stringify(payload)
      });

      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);

      if (response.ok) {
        const data = await response.json();
        const choice = data.choices?.[0];
        const content = choice?.message?.content || '';

        const promptTokens =
          data.usage?.prompt_tokens || Math.round(messages.map(m => m.content).join(' ').length / 4);
        const completionTokens = data.usage?.completion_tokens || Math.round(content.length / 4);
        const totalTokens = data.usage?.total_tokens || promptTokens + completionTokens;
        const durationSec = latencyMs / 1000;
        const tokensPerSecond = durationSec > 0 ? Math.round(completionTokens / durationSec) : 0;

        const detectedActions = parseActionsFromContent(content);

        return {
          content,
          metrics: {
            latencyMs,
            completionTokens,
            promptTokens,
            totalTokens,
            tokensPerSecond
          },
          detectedActions,
          fallbackModel: modelToTry !== model ? modelToTry : undefined
        };
      }

      const errorData = await response.json().catch(() => ({}));
      const errorMsg = errorData?.error?.message || response.statusText;

      // Model unavailable or deprecated: try fallback
      if (
        response.status === 404 ||
        (response.status === 400 &&
          (errorMsg.toLowerCase().includes('model') ||
            errorMsg.toLowerCase().includes('decommissioned') ||
            errorMsg.toLowerCase().includes('not supported') ||
            errorMsg.toLowerCase().includes('does not exist')))
      ) {
        console.warn(`Groq Model "${modelToTry}" unavailable (${response.status}: ${errorMsg}), attempting fallback...`);
        lastError = new Error(errorMsg);
        continue;
      }

      if (response.status === 401) {
        throw new Error(
          'Invalid Groq API Key (401). Please verify your key in Settings (get a free key at console.groq.com).'
        );
      }
      if (response.status === 429) {
        throw new Error(
          'Groq Rate Limit exceeded (429). Please wait a few seconds or try switching to Llama 3.1 8B Instant.'
        );
      }
      throw new Error(`Groq API Error (${response.status}): ${errorMsg}`);
    } catch (err: any) {
      if (err.message?.includes('401') || err.message?.includes('429')) {
        throw err;
      }
      lastError = err;
    }
  }

  throw lastError || new Error('All model attempts failed.');
}

/**
 * Real-time SSE Streaming Chat Completion
 */
export async function streamChatCompletion({
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
    fallbackModel?: string;
  }) => void;
  onError: (error: Error) => void;
}): Promise<void> {
  const cleanKey = apiKey ? apiKey.trim() : '';

  if (!cleanKey) {
    try {
      const demo = await generateDemoChatResponse(messages, model);
      onDelta(demo.content, demo.content);
      onFinish({
        content: demo.content,
        metrics: demo.metrics,
        detectedActions: demo.detectedActions
      });
      return;
    } catch (e: any) {
      onError(e);
      return;
    }
  }

  const candidateModels = [
    model,
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'llama-3.3-70b-versatile',
    'llama-3.1-8b-instant'
  ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

  let lastError: Error | null = null;

  for (const modelToTry of candidateModels) {
    const startTime = performance.now();
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanKey}`
        },
        body: JSON.stringify({
          model: modelToTry,
          messages,
          temperature,
          max_tokens: maxTokens,
          top_p: topP,
          ...(stopSequences && stopSequences.length > 0 ? { stop: stopSequences.slice(0, 4) } : {}),
          stream: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData?.error?.message || response.statusText;

        if (
          response.status === 404 ||
          (response.status === 400 &&
            (errorMsg.toLowerCase().includes('model') ||
              errorMsg.toLowerCase().includes('decommissioned') ||
              errorMsg.toLowerCase().includes('not supported') ||
              errorMsg.toLowerCase().includes('does not exist')))
        ) {
          console.warn(`Groq streaming model ${modelToTry} unavailable (${response.status}), retrying with fallback...`);
          lastError = new Error(errorMsg);
          continue;
        }

        if (response.status === 401) {
          throw new Error('Invalid Groq API Key (401). Please verify your key in Settings.');
        }
        if (response.status === 429) {
          throw new Error('Groq Rate Limit exceeded (429). Please wait a few seconds before retrying.');
        }

        throw new Error(`Groq API Error (${response.status}): ${errorMsg}`);
      }

      if (!response.body) {
        // Fallback to non-streaming if body is not accessible
        const nonStream = await sendChatCompletion({
          apiKey: cleanKey,
          model: modelToTry,
          messages,
          temperature,
          maxTokens,
          topP
        });
        onDelta(nonStream.content, nonStream.content);
        onFinish({
          content: nonStream.content,
          metrics: nonStream.metrics,
          detectedActions: nonStream.detectedActions,
          fallbackModel: modelToTry !== model ? modelToTry : nonStream.fallbackModel
        });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulated = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(':')) continue;

          if (trimmed === 'data: [DONE]') {
            break;
          }

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const delta = data.choices?.[0]?.delta?.content || '';
              if (delta) {
                accumulated += delta;
                onDelta(accumulated, delta);
              }
            } catch (e) {
              // Ignore partial JSON parse errors
            }
          }
        }
      }

      const latencyMs = Math.round(performance.now() - startTime);
      const completionTokens = Math.round(accumulated.length / 4);
      const durationSec = latencyMs / 1000;
      const tokensPerSecond = durationSec > 0 ? Math.round(completionTokens / durationSec) : 0;
      const detectedActions = parseActionsFromContent(accumulated);

      onFinish({
        content: accumulated,
        metrics: {
          latencyMs,
          tokensPerSecond,
          totalTokens: completionTokens
        },
        detectedActions,
        fallbackModel: modelToTry !== model ? modelToTry : undefined
      });
      return;
    } catch (err: any) {
      if (err.message?.includes('401') || err.message?.includes('429')) {
        onError(err);
        return;
      }
      lastError = err;
    }
  }

  onError(lastError || new Error('All Groq inference attempts failed.'));
}

export function getVisionExtractionPrompt(mode: ExtractionMode, customPrompt?: string): string {
  const titleRule = `Line 1 MUST be a concise, specific, meaningful Markdown H1 title (\`# [Descriptive Title]\`) that names the actual topic or subject written in the image (never use generic names like "Screenshot", "Image", or "Extracted Note").`;

  if (mode === 'custom' && customPrompt?.trim()) {
    return `${customPrompt.trim()}

Format the output cleanly in Markdown. ${titleRule} Do not include conversational filler.`;
  }

  switch (mode) {
    case 'summary':
      return `Analyze the provided image in detail. Extract the main points, core insights, bulleted key takeaways, and a structured executive summary.
${titleRule}
Follow with:
### Main Points
### Key Takeaways
### Executive Summary
Format cleanly in Markdown with bold key phrases and bullet lists.`;

    case 'verbatim':
      return `Transcribe all visible text from this image verbatim.
Faithfully preserve headings, bullet lists, tables, code blocks, handwritten notes, and structural layout exactly as shown.
${titleRule}
Do not omit details or add conversational commentary.`;

    case 'study':
      return `Transform the content of this image into high-yield, structured study notes.
${titleRule}
Include:
1. Core Concept Definitions & Terminology
2. Key Principles, Mental Models, or Theorems
3. Formulas, Process Flows, or Diagrams described in structured text
4. Quick Review / Flashcard Self-Test Questions & Answers`;

    case 'action-items':
      return `Inspect this image for tasks, decisions, follow-ups, and action items.
Extract actionable tasks, deadlines, and owners as a Markdown checklist using checkboxes (- [ ] Task).
${titleRule}
Group them into logical priority buckets:
### High Priority
- [ ] Action item...
### In Progress / Upcoming
- [ ] Action item...`;

    default:
      return `Analyze this image and extract the main points as structured notes in clean Markdown. ${titleRule}`;
  }
}

export function getDocumentExtractionPrompt(
  mode: ExtractionMode,
  filename: string,
  customPrompt?: string
): string {
  const titleRule = `Line 1 MUST be a concise, specific, meaningful Markdown H1 title (\`# [Descriptive Title]\`) based directly on the subject/topic written inside the document (never use the raw filename "${filename}" unless it already describes the exact topic, and never use generic titles like "Document" or "Notes").`;

  if (mode === 'custom' && customPrompt?.trim()) {
    return `${customPrompt.trim()}

Format the output cleanly in Markdown. ${titleRule} Do not include conversational filler.`;
  }

  switch (mode) {
    case 'summary':
      return `Read the provided document carefully and extract all main points, core arguments, important facts, and actionable takeaways into clean, well-structured Markdown notes.
${titleRule}
Follow with:
### Main Points
### Key Takeaways
### Summary
Use concise bullet points with **bold lead-ins**.`;

    case 'verbatim':
      return `Clean up and format the provided document content into structured Markdown while faithfully preserving its original details, headings, lists, and data.
${titleRule}`;

    case 'study':
      return `Transform the provided document into high-yield, structured study notes.
${titleRule}
Include:
### Core Concepts & Definitions
### Key Principles & Explanations
### Quick Review Questions & Answers`;

    case 'action-items':
      return `Extract all tasks, action items, deadlines, and follow-ups from the provided document as a Markdown checklist (- [ ] Task).
${titleRule}
Group them under:
### High Priority
### Upcoming / Follow-Up`;

    default:
      return `Extract the main points from this document into clean Markdown notes. ${titleRule}`;
  }
}

function isVisionCandidateModelId(id: string): boolean {
  const lower = id.toLowerCase();
  if (
    lower.includes('whisper') ||
    lower.includes('tts') ||
    lower.includes('guard') ||
    lower.includes('prompt-guard') ||
    lower.includes('11b')
  ) {
    return false;
  }
  return (
    lower.includes('vision') ||
    lower.includes('scout') ||
    lower.includes('maverick') ||
    lower.includes('llama-4') ||
    lower.includes('qwen') ||
    lower.includes('pixtral') ||
    lower.includes('llava') ||
    lower.includes('gemma-3') ||
    lower.includes('vl')
  );
}

/**
 * Dynamically fetch available vision models from Groq API
 */
export async function fetchGroqVisionModels(apiKey: string): Promise<GroqModelConfig[]> {
  const cleanKey = apiKey ? apiKey.trim() : '';
  if (!cleanKey) return GROQ_VISION_MODELS;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/models', {
      headers: {
        Authorization: `Bearer ${cleanKey}`
      }
    });

    if (!response.ok) return GROQ_VISION_MODELS;

    const data = await response.json();
    const fetchedIds: string[] = (data.data || []).map((m: any) => m.id);

    // Prioritize preset models that actually exist on this Groq account
    const activePresets = GROQ_VISION_MODELS.filter(p => fetchedIds.includes(p.id));
    const merged: GroqModelConfig[] = activePresets.length > 0 ? [...activePresets] : [...GROQ_VISION_MODELS];

    fetchedIds.forEach(id => {
      if (isVisionCandidateModelId(id) && !merged.some(m => m.id === id)) {
        merged.push({
          id,
          name: id.split('/').pop()?.replace(/-/g, ' ') || id,
          description: `Active Groq multimodal model (${id})`,
          contextWindow: 128000,
          isVision: true,
          badge: 'Active',
          speedRating: 'fast'
        });
      }
    });

    return merged;
  } catch (err) {
    console.warn('Failed to fetch dynamic Groq vision models, using defaults:', err);
    return GROQ_VISION_MODELS;
  }
}

export async function analyzeImageWithGroq({
  apiKey,
  imageBase64,
  mode,
  customPrompt,
  model = 'meta-llama/llama-4-scout-17b-16e-instruct'
}: {
  apiKey: string;
  imageBase64: string;
  mode: ExtractionMode;
  customPrompt?: string;
  model?: string;
}): Promise<{
  content: string;
  latencyMs: number;
  tokensPerSecond?: number;
  modelUsed?: string;
  fallbackModel?: string;
}> {
  const cleanKey = apiKey ? apiKey.trim() : '';

  if (!cleanKey) {
    return generateDemoVisionResponse(mode, customPrompt);
  }

  // Ordered candidate models with active vision/multimodal defaults
  const candidateModels = [
    model,
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'meta-llama/llama-4-maverick-17b-128e-instruct',
    'qwen/qwen3.8-27b'
  ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

  const promptText = getVisionExtractionPrompt(mode, customPrompt);
  const startTime = performance.now();
  let lastError: Error | null = null;
  let dynamicModelsFetched = false;
  let discoveredAccountModels: string[] = [];

  for (let i = 0; i < candidateModels.length; i++) {
    const modelToTry = candidateModels[i];
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${cleanKey}`
        },
        body: JSON.stringify({
          model: modelToTry,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: promptText
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: imageBase64
                  }
                }
              ]
            }
          ],
          temperature: 0.2,
          max_tokens: 3000
        })
      });

      const endTime = performance.now();
      const latencyMs = Math.round(endTime - startTime);

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        const completionTokens = data.usage?.completion_tokens || Math.round(content.length / 4);
        const tokensPerSecond = latencyMs > 0 ? Math.round(completionTokens / (latencyMs / 1000)) : 0;

        return {
          content,
          latencyMs,
          tokensPerSecond,
          modelUsed: modelToTry,
          fallbackModel: modelToTry !== model ? modelToTry : undefined
        };
      }

      const errJson = await response.json().catch(() => ({}));
      const errorMsg = errJson?.error?.message || response.statusText;

      // Check if model not found, decommissioned, lacks image support, or invalid
      if (
        response.status === 404 ||
        (response.status === 400 &&
          (errorMsg.toLowerCase().includes('model') ||
            errorMsg.toLowerCase().includes('decommissioned') ||
            errorMsg.toLowerCase().includes('not supported') ||
            errorMsg.toLowerCase().includes('does not exist') ||
            errorMsg.toLowerCase().includes('image_url') ||
            errorMsg.toLowerCase().includes('multimodal')))
      ) {
        console.warn(`Groq Vision model ${modelToTry} unavailable (${response.status}: ${errorMsg}), attempting fallback...`);
        lastError = new Error(errorMsg);

        // Lazy-fetch active vision models from the user's Groq account
        if (!dynamicModelsFetched) {
          dynamicModelsFetched = true;
          try {
            const modelsRes = await fetch('https://api.groq.com/openai/v1/models', {
              headers: { Authorization: `Bearer ${cleanKey}` }
            });
            if (modelsRes.ok) {
              const modelsData = await modelsRes.json();
              const activeIds: string[] = (modelsData.data || []).map((m: any) => m.id);
              discoveredAccountModels = activeIds;
              activeIds
                .filter(id => isVisionCandidateModelId(id))
                .forEach(vId => {
                  if (!candidateModels.includes(vId)) candidateModels.push(vId);
                });
            }
          } catch {
            // Ignore discovery error
          }
        }
        continue;
      }

      if (response.status === 401) {
        throw new Error(
          'Invalid Groq API Key (401). Please verify your key in Settings (get a free key at console.groq.com).'
        );
      }

      if (response.status === 429) {
        throw new Error(
          'Groq Rate Limit exceeded (429). Please wait a few seconds before retrying.'
        );
      }

      throw new Error(`Groq Vision API Error (${response.status}): ${errorMsg}`);
    } catch (err: any) {
      if (err.message?.includes('401') || err.message?.includes('429')) {
        throw err;
      }
      lastError = err;
      console.warn(`Vision model ${modelToTry} failed:`, err);
    }
  }

  if (discoveredAccountModels.length > 0) {
    throw new Error(
      `${lastError?.message || 'No vision model succeeded.'} Active models on your Groq key: ${discoveredAccountModels.slice(0, 8).join(', ')}. You can enter a custom vision model ID in the Vision Model dropdown, or upload a PDF/text file.`
    );
  }

  if (lastError) throw lastError;
  throw new Error('All Groq Vision candidate models failed to process image.');
}

/**
 * Extract main points and structured notes from a PDF or text/document file using Groq.
 */
export async function analyzeDocumentWithGroq({
  apiKey,
  textContent,
  filename,
  mode,
  customPrompt,
  model = 'llama-3.3-70b-versatile'
}: {
  apiKey: string;
  textContent: string;
  filename: string;
  mode: ExtractionMode;
  customPrompt?: string;
  model?: string;
}): Promise<{
  content: string;
  latencyMs: number;
  tokensPerSecond?: number;
  modelUsed?: string;
  fallbackModel?: string;
}> {
  const cleanKey = apiKey ? apiKey.trim() : '';

  if (!cleanKey) {
    const startTime = performance.now();
    await new Promise(resolve => setTimeout(resolve, 600));
    const snippet = textContent.trim().slice(0, 400);
    return {
      content: `# ${filename.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ')}

### Main Points (Demo Preview)
- Extracted **${textContent.length} characters** from \`${filename}\`.
- Configure your Groq API Key in **Settings** to synthesize full AI notes and an intelligent title from this document.

### Content Excerpt
> ${snippet || 'No text content detected.'}`,
      latencyMs: Math.round(performance.now() - startTime),
      tokensPerSecond: 140,
      modelUsed: 'Demo Simulator'
    };
  }

  const promptInstruction = getDocumentExtractionPrompt(mode, filename, customPrompt);
  const result = await sendChatCompletion({
    apiKey: cleanKey,
    model,
    messages: [
      {
        role: 'system',
        content:
          'You are an expert research assistant and note-taker. Extract the main points into clear, structured Markdown notes with an accurate, content-based H1 title on line 1.'
      },
      {
        role: 'user',
        content: `${promptInstruction}\n\n---\nDocument Filename: ${filename}\n\nDocument Content:\n${textContent}`
      }
    ],
    temperature: 0.2,
    maxTokens: 3000
  });

  return {
    content: result.content,
    latencyMs: result.metrics.latencyMs,
    tokensPerSecond: result.metrics.tokensPerSecond,
    modelUsed: result.fallbackModel || model,
    fallbackModel: result.fallbackModel
  };
}

export async function generateScheduleWithGroq({
  apiKey,
  date,
  wakeTime,
  sleepTime,
  rawDetails,
  todos,
  model = 'llama-3.3-70b-versatile'
}: {
  apiKey: string;
  date: string;
  wakeTime: string;
  sleepTime: string;
  rawDetails: string;
  todos: Array<{ title: string; priority: string; duration?: number }>;
  model?: string;
}): Promise<DailyScheduleAIResponse> {
  const cleanKey = apiKey ? apiKey.trim() : '';

  if (!cleanKey) {
    return generateDemoScheduleResponse(date, wakeTime, sleepTime, rawDetails, todos);
  }

  const prompt = `You are a world-class productivity architect.
Target Date: ${date}
Waking Hours: ${wakeTime} to ${sleepTime}

User Brain-Dump & Constraints:
${rawDetails || 'Standard productive workday with deep work, exercise, and balanced breaks.'}

Existing/Desired Tasks:
${todos.length > 0 ? todos.map(t => `- [${t.priority.toUpperCase()}] ${t.title} (${t.duration || 30} mins)`).join('\n') : 'No predefined tasks provided.'}

Your task is to generate a comprehensive, synchronized daily plan in strict JSON.
Return a valid JSON object matching this exact schema:
{
  "schedule": [
    {
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "title": "Block Title",
      "category": "work" | "study" | "health" | "routine" | "meeting" | "deep-work" | "other",
      "notes": "Brief actionable context or focus goals",
      "color": "#10b981" | "#3b82f6" | "#8b5cf6" | "#f59e0b" | "#ec4899"
    }
  ],
  "todos": [
    {
      "title": "Actionable task title",
      "priority": "high" | "medium" | "low",
      "estimatedMinutes": 45
    }
  ],
  "dailySummaryNote": {
    "title": "Daily Blueprint: ${date}",
    "content": "# Daily Blueprint & Game Plan (${date})\\n\\n### Core Objective\\n...\\n\\n### Strategic Time Blocks\\n...\\n\\n### Key Rules & Energy Management\\n...",
    "tags": ["schedule", "blueprint", "daily-plan"]
  }
}

Ensure all times are in 24-hour HH:MM format (e.g. "09:00", "14:30"). Order time blocks chronologically with no overlapping intervals. Provide adequate buffers for lunch and mental reset. Return ONLY valid JSON with no conversational preamble.`;

  try {
    const result = await sendChatCompletion({
      apiKey: cleanKey,
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an executive daily schedule generator that returns ONLY valid JSON conforming to the requested schema.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      maxTokens: 3000,
      responseFormat: { type: 'json_object' }
    });

    // Clean JSON string if wrapped in markdown code fence
    let rawJson = result.content.trim();
    if (rawJson.startsWith('```json')) {
      rawJson = rawJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (rawJson.startsWith('```')) {
      rawJson = rawJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed: DailyScheduleAIResponse = JSON.parse(rawJson);
    return parsed;
  } catch (error: any) {
    console.error('Error generating schedule with Groq:', error);
    if (error.message?.includes('401') || error.message?.includes('429')) {
      throw error;
    }
    // Fallback to high quality template only if JSON parsing failed
    return generateDemoScheduleResponse(date, wakeTime, sleepTime, rawDetails, todos);
  }
}

// ==========================================
// High-Fidelity Demo Generators (No-Key Mode)
// ==========================================

async function generateDemoChatResponse(
  messages: Array<{ role: string; content: string }>,
  model: string
): Promise<ChatCompletionResult> {
  await new Promise(r => setTimeout(r, 650)); // simulate ultra-fast Groq LPU latency

  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content.toLowerCase() || '';

  let content = '';

  if (lastUserMsg.includes('note') || lastUserMsg.includes('save')) {
    content = `I've synthesized your request into a structured note.

### Architecture Summary
- **Unified State**: Notepad, Calendar, and To-Dos share a real-time reactive store.
- **Groq Acceleration**: Sub-100ms inference on Llama 3 models.
- **Bi-directional Sync**: Instant execution of schedule blocks and to-dos.

\`\`\`action:save_note
{
  "title": "Groq Architectural Strategy",
  "content": "### Key Decisions\\n- Groq LPUs enable near-instantaneous streaming\\n- Shared state across all workspaces\\n- Zero external database required for client-side privacy",
  "tags": ["groq", "architecture", "strategy"]
}
\`\`\`

You can click the button below or use **Save to Notepad** to file this instantly!`;
  } else if (lastUserMsg.includes('meeting') || lastUserMsg.includes('calendar') || lastUserMsg.includes('schedule')) {
    content = `I've prepared a calendar event for you based on your prompt:

\`\`\`action:add_event
{
  "title": "Strategy & Technical Alignment",
  "date": "${new Date().toISOString().split('T')[0]}",
  "startTime": "15:30",
  "endTime": "16:30",
  "category": "meeting",
  "notes": "Review Llama 3.3 benchmarks and interactive playground components."
}
\`\`\`

Click **Add to Calendar** to schedule this immediately into your persistent timeline.`;
  } else if (lastUserMsg.includes('todo') || lastUserMsg.includes('task')) {
    content = `Here is the prioritized task you requested:

\`\`\`action:add_todo
{
  "title": "Benchmark Llama 3.3 70B token generation speed",
  "priority": "high",
  "dueDate": "${new Date().toISOString().split('T')[0]}"
}
\`\`\`

Use the quick action pill below to add it directly to your To-Do checklist.`;
  } else {
    content = `### Groq LPU High-Speed Inference Playground

You are currently running in **Demo Mode**. To tap directly into live Groq cloud inference with sub-second speeds (over **300+ tokens/sec**), paste your free API key in the top right **Settings** gear!

#### What You Can Do in This Workspace:
1. **Interactive Prompt Engineering**: Tweak Temperature, Top-P, and test system prompt presets with models like **Llama 3.3 70B**, **DeepSeek R1**, or **Mixtral**.
2. **One-Click Archiving**: Save any response directly into your **Shared Notepad** via the action button below.
3. **Structured Assistant Actions**: Ask the assistant to *"schedule a sprint review"* or *"save a note about quantum computing"*, and notice the interactive action cards generated.

\`\`\`typescript
// Example Groq Client Integration
const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": \`Bearer \${GROQ_API_KEY}\`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "${model}",
    messages: [{ role: "user", content: "Synthesize high-velocity architectures" }]
  })
});
\`\`\`

How can I assist your workflow today?`;
  }

  const detectedActions = parseActionsFromContent(content);

  return {
    content,
    metrics: {
      latencyMs: 142,
      completionTokens: 218,
      promptTokens: 48,
      totalTokens: 266,
      tokensPerSecond: 385
    },
    detectedActions
  };
}

async function generateDemoVisionResponse(mode: ExtractionMode, customPrompt?: string) {
  await new Promise(r => setTimeout(r, 850));

  let content = '';

  if (mode === 'summary') {
    content = `# Visual Synthesis & Key Highlights

### Core Subject Overview
The analyzed visual contains an architectural schematic detailing multi-workspace synchronization and low-latency LPU pipelines.

### Key Takeaways
- **Ultra-low latency inference**: Response generation accelerated via specialized Groq tensor streaming.
- **Unified Store**: Synchronized reactivity between the chat playground, Snap-to-Notes studio, and the daily time-blocking engine.
- **Zero Data Loss**: Real-time hydration and local persistence across browser sessions.

### Executive Recommendation
Prioritize high-impact morning time blocks for generative deep work, followed by structured task execution in the afternoon.`;
  } else if (mode === 'verbatim') {
    content = `# Verbatim OCR Transcription

\`\`\`text
GROQ NEXUS SPECIFICATION v1.0
------------------------------------------------
1. COMPONENT ARCHITECTURE
   - Playground: Chat & Prompt Experimentation Arena
   - Snap-to-Notes: Vision Processing (Llama 4 Vision)
   - Daily Scheduler: Structured Time-Blocking Engine
2. CENTRAL STATE ENGINE
   - localStorage keys: notes, calendar_events, todos
   - Event emitter & context synchronization
3. PERFORMANCE TARGETS
   - Token throughput: > 350 tokens/sec
   - UI Latency: < 16ms render loop (60fps)
\`\`\``;
  } else if (mode === 'study') {
    content = `# High-Yield Study Notes & Concepts

### 1. Groq Tensor Streaming Processor (TSP)
- **Definition**: A deterministic chip architecture designed specifically for AI inference, avoiding traditional cache hierarchies to deliver linear execution speed.
- **Key Advantage**: Eliminates memory bandwidth bottlenecks common in GPUs.

### 2. Time-Blocking Methodology
- **Concept**: Dividing the day into dedicated blocks of time, where each block is dedicated to accomplishing a specific task or group of tasks.
- **Cal Newport Rule**: Shallow work vs. Deep work separation to prevent cognitive context switching.

### Review Questions
- *Q1: How does deterministic execution improve token generation speed?*
- *Q2: What is the optimal duration for a single deep-work focus block? (Answer: 90 minutes)*`;
  } else if (mode === 'action-items') {
    content = `# Action Items & Extracted Tasks

### Priority 1: Immediate Tasks
- [ ] Connect Groq API key in Settings modal
- [ ] Test image upload with whiteboard diagram
- [ ] Schedule deep work block for afternoon sprint

### Priority 2: Follow-ups
- [ ] Review daily schedule time blocks in Calendar drawer
- [ ] Export playground conversation to Markdown note
- [ ] Share meeting takeaways with development team`;
  } else {
    content = `# Tailored Analysis
${customPrompt ? `*Custom Instruction: ${customPrompt}*\n\n` : ''}
The uploaded visual was analyzed according to your instructions. Key patterns, structural elements, and actionable insights have been extracted and prepared for your persistent Notepad.`;
  }

  return {
    content,
    latencyMs: 210,
    tokensPerSecond: 280
  };
}

function generateDemoScheduleResponse(
  date: string,
  wakeTime: string,
  sleepTime: string,
  rawDetails: string,
  todos: Array<{ title: string; priority: string; duration?: number }>
): DailyScheduleAIResponse {
  const wakeHour = parseInt(wakeTime.split(':')[0], 10) || 7;
  const formatTime = (h: number, m: number = 0) =>
    `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

  return {
    schedule: [
      {
        startTime: formatTime(wakeHour, 0),
        endTime: formatTime(wakeHour, 45),
        title: 'Morning Calibration & Routine',
        category: 'routine',
        notes: 'Hydration, light movement, review daily top 3 targets',
        color: '#10b981'
      },
      {
        startTime: formatTime(wakeHour + 1, 0),
        endTime: formatTime(wakeHour + 2, 30),
        title: 'Deep Work Block 1: High Cognitive Focus',
        category: 'deep-work',
        notes: rawDetails ? `Focus on: ${rawDetails.slice(0, 80)}...` : 'Deep architectural work and coding without distractions.',
        color: '#3b82f6'
      },
      {
        startTime: formatTime(wakeHour + 2, 45),
        endTime: formatTime(wakeHour + 4, 0),
        title: 'Deep Work Block 2: Implementation & Reviews',
        category: 'work',
        notes: 'Iterate on core features, tests, and documentation.',
        color: '#8b5cf6'
      },
      {
        startTime: formatTime(wakeHour + 4, 0),
        endTime: formatTime(wakeHour + 5, 0),
        title: 'Nutrition & Mind Reset (Lunch Walk)',
        category: 'health',
        notes: 'Screen-free walk and nourishing meal.',
        color: '#f59e0b'
      },
      {
        startTime: formatTime(wakeHour + 5, 15),
        endTime: formatTime(wakeHour + 6, 45),
        title: 'Execution Block: Task Clearing & Comms',
        category: 'work',
        notes: 'Clear high-priority to-do items and sync with collaborators.',
        color: '#3b82f6'
      },
      {
        startTime: formatTime(wakeHour + 7, 0),
        endTime: formatTime(wakeHour + 8, 0),
        title: 'Physical Training & Mobility',
        category: 'health',
        notes: 'Strength training, cardio, or athletic recovery.',
        color: '#ec4899'
      },
      {
        startTime: formatTime(wakeHour + 8, 30),
        endTime: formatTime(wakeHour + 9, 30),
        title: 'Daily Shutdown & Evening Wind-Down',
        category: 'routine',
        notes: 'Reflect on wins, prep workspace for tomorrow, screen dimming.',
        color: '#10b981'
      }
    ],
    todos: [
      ...(todos.length > 0
        ? todos.map(t => ({
            title: t.title,
            priority: (t.priority as any) || 'medium',
            estimatedMinutes: t.duration || 30
          }))
        : [
            { title: 'Tackle primary deep-work objective', priority: 'high' as const, estimatedMinutes: 60 },
            { title: 'Review Groq Nexus generated schedule blocks', priority: 'medium' as const, estimatedMinutes: 15 },
            { title: 'Log insights and new ideas into Shared Notepad', priority: 'low' as const, estimatedMinutes: 20 }
          ])
    ],
    dailySummaryNote: {
      title: `Daily Blueprint: ${date}`,
      content: `# Daily Blueprint & Execution Plan (${date})

> **Daily Theme**: High-Velocity Focus & Strategic Execution
> **Target Hours**: ${wakeTime} - ${sleepTime}

### Strategic Objectives
1. Protect the morning **Deep Work Block** from interruption.
2. Complete scheduled priority tasks before midday.
3. Maintain physical energy with dedicated recovery buffers.

### User Notes & Directives
${rawDetails || 'Balanced execution day with scheduled deep-work sprints and active breaks.'}

### Schedule Snapshot
- **${formatTime(wakeHour, 0)} - ${formatTime(wakeHour, 45)}**: Morning Calibration & Routine
- **${formatTime(wakeHour + 1, 0)} - ${formatTime(wakeHour + 2, 30)}**: Deep Work Block 1
- **${formatTime(wakeHour + 2, 45)} - ${formatTime(wakeHour + 4, 0)}**: Deep Work Block 2
- **${formatTime(wakeHour + 5, 15)} - ${formatTime(wakeHour + 6, 45)}**: Execution & Task Clearing
- **${formatTime(wakeHour + 7, 0)} - ${formatTime(wakeHour + 8, 0)}**: Physical Training & Mobility

*Generated automatically by Groq Nexus Workspace Scheduler.*`,
      tags: ['blueprint', 'schedule', 'daily-plan']
    }
  };
}
