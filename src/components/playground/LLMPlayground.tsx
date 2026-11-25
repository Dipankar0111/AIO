import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { ChatMessage, GroqModelConfig } from '../../types';
import { GROQ_MODELS, SYSTEM_PROMPT_PRESETS } from '../../utils/constants';
import { streamChatCompletion, fetchGroqModels } from '../../services/groq';
import { fetchGeminiModels, streamGeminiChatCompletion, GEMINI_FALLBACK_MODELS } from '../../services/gemini';
import { triggerConfetti } from '../../utils/confetti';
import { ChatMessageItem } from './ChatMessageItem';
import {
  Send,
  Trash2,
  Download,
  Sliders,
  ChevronDown,
  ChevronUp,
  Zap,
  Paperclip,
  X,
  Key,
  Sparkles,
  Layers,
  Terminal,
  Plus,
  CheckCircle2
} from 'lucide-react';

const CONTEXT_BUDGET_OPTIONS: Array<{ label: string; value: number | 'max' }> = [
  { label: '4k', value: 4096 },
  { label: '8k', value: 8192 },
  { label: '16k', value: 16384 },
  { label: '32k', value: 32768 },
  { label: '64k', value: 65536 },
  { label: 'Max', value: 'max' }
];

const estimateTokens = (text: string): number => Math.ceil((text || '').length / 4);

function analyzePromptHeuristics(prompt: string, systemPrompt: string) {
  const lines = prompt.split('\n').map(l => l.trim()).filter(Boolean);
  const exemplars: string[] = [];

  lines.forEach(line => {
    if (
      /^(example\s*\d*|input|output|q|a|user|assistant)\s*[:\-]/i.test(line) ||
      /^\d+[\.\)]\s+.+(->|=>|:).+/.test(line) ||
      /.+\s*(->|=>)\s*.+/.test(line)
    ) {
      exemplars.push(line.slice(0, 72));
    }
  });

  const exampleCount = exemplars.length;
  const paradigm: 'Zero-Shot' | 'One-Shot' | 'Few-Shot' =
    exampleCount >= 2 ? 'Few-Shot' : exampleCount === 1 ? 'One-Shot' : 'Zero-Shot';

  const hasDelimiters =
    /```|"""|---|<[a-zA-Z0-9_-]+>|\[[A-Z0-9_ ]+\]/.test(prompt);
  const hasTargetFormat =
    /(json|markdown|table|bullet|list|step|format|output|return|summarize|explain|write|create|build|fix|code)/i.test(
      prompt
    );

  const pips = {
    persona: systemPrompt.trim().length > 0,
    delimiters: hasDelimiters,
    demonstrations: exampleCount > 0,
    targetTask: prompt.trim().length > 0 && hasTargetFormat
  };

  const pipCount = Object.values(pips).filter(Boolean).length;
  return { paradigm, exemplars, pips, pipCount };
}

export const LLMPlayground: React.FC = () => {
  const {
    user,
    apiKey,
    geminiApiKey,
    addNote,
    showToast,
    setIsNotepadDrawerOpen,
    setActiveTab,
    setIsSettingsModalOpen,
    isConfigured
  } = useApp();

  const userFirstName =
    (user?.user_metadata?.full_name as string | undefined)?.trim().split(/\s+/)[0] ||
    user?.email?.split('@')[0] ||
    'Creator';

  // Model & Inference Parameters
  const [availableModels, setAvailableModels] = useState<GroqModelConfig[]>(GROQ_MODELS);
  const [selectedModel, setSelectedModel] = useState<string>('llama-3.3-70b-versatile');
  const [customModel, setCustomModel] = useState<string>('');
  const [isCustomModel, setIsCustomModel] = useState<boolean>(false);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(2048);
  const [topP, setTopP] = useState<number>(1.0);
  const [contextBudget, setContextBudget] = useState<number | 'max'>('max');
  const [stopSequences, setStopSequences] = useState<string[]>([]);
  const [stopInput, setStopInput] = useState<string>('');
  const [systemPrompt, setSystemPrompt] = useState<string>(SYSTEM_PROMPT_PRESETS[0].prompt);
  const [selectedPresetName, setSelectedPresetName] = useState<string>(SYSTEM_PROMPT_PRESETS[0].name);
  const [paramsTab, setParamsTab] = useState<'params' | 'analyzer' | 'system'>('params');
  const [critiqueResult, setCritiqueResult] = useState<string | null>(null);
  const [isCritiquing, setIsCritiquing] = useState<boolean>(false);

  // Dynamically fetch models from Groq & Gemini when API keys are present
  useEffect(() => {
    let cancelled = false;
    const loadModels = async () => {
      const groqList = apiKey?.trim() ? await fetchGroqModels(apiKey) : GROQ_MODELS;
      const geminiList = geminiApiKey?.trim() ? await fetchGeminiModels(geminiApiKey) : [];
      if (!cancelled) {
        const combined = [...groqList];
        geminiList.forEach(gm => {
          if (!combined.some(m => m.id === gm.id)) {
            combined.push(gm);
          }
        });
        if (combined.length > 0) {
          setAvailableModels(combined);
        }
      }
    };
    loadModels();
    return () => {
      cancelled = true;
    };
  }, [apiKey, geminiApiKey]);

  // Floating Parameters Drawer state
  const [showParamsPanel, setShowParamsPanel] = useState<boolean>(false);
  const paramsDrawerRef = useRef<HTMLDivElement>(null);

  // Composer Model Dropdown Popover
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState<boolean>(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
      if (paramsDrawerRef.current && !paramsDrawerRef.current.contains(event.target as Node)) {
        // Only close if click is not on the toggle button
        const target = event.target as HTMLElement;
        if (!target.closest('[data-params-toggle="true"]')) {
          setShowParamsPanel(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Messages & Chat state (starts empty for clean Claude-style centered hero)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages, isLoading]);

  const activeModelId = isCustomModel && customModel.trim() ? customModel.trim() : selectedModel;
  const currentModelConfig =
    availableModels.find(m => m.id === activeModelId) ||
    GROQ_MODELS.find(m => m.id === activeModelId) ||
    GEMINI_FALLBACK_MODELS.find(m => m.id === activeModelId);
  const isGeminiModel = currentModelConfig?.provider === 'gemini' || activeModelId.startsWith('gemini-');
  const modelMaxContext = currentModelConfig?.contextWindow || 128000;
  const activeContextLimit = contextBudget === 'max' ? modelMaxContext : Math.min(contextBudget, modelMaxContext);

  const promptAnalysis = useMemo(
    () => analyzePromptHeuristics(inputPrompt, systemPrompt),
    [inputPrompt, systemPrompt]
  );

  const activeContextTokens = useMemo(() => {
    const sysTokens = estimateTokens(systemPrompt);
    const msgTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
    return sysTokens + msgTokens + estimateTokens(inputPrompt);
  }, [messages, systemPrompt, inputPrompt]);

  const handleTogglePin = (id: string) => {
    setMessages(prev =>
      prev.map(m => (m.id === id ? { ...m, pinned: !m.pinned } : m))
    );
  };

  const handleAddStopSequence = () => {
    const clean = stopInput.trim();
    if (!clean || stopSequences.length >= 4 || stopSequences.includes(clean)) return;
    setStopSequences(prev => [...prev, clean]);
    setStopInput('');
  };

  const handleRunCritique = async () => {
    const draft = inputPrompt.trim();
    if (!draft) {
      showToast('Type a prompt in the input box first', 'info');
      return;
    }
    if (!apiKey?.trim() && !geminiApiKey?.trim()) {
      showToast('Add a Groq or Gemini API key in Settings first', 'warning');
      setIsSettingsModalOpen(true);
      return;
    }
    setIsCritiquing(true);
    setCritiqueResult(null);

    const critiqueMessages: Array<{ role: 'system' | 'user'; content: string }> = [
      {
        role: 'system',
        content:
          'You are a concise prompt engineer. Critique the user prompt in 2 short bullets (clarity, constraints/format), then provide an improved version under "Refined Prompt:" in a single clean block.'
      },
      { role: 'user', content: draft }
    ];

    try {
      if (apiKey?.trim()) {
        await streamChatCompletion({
          apiKey,
          model: 'llama-3.1-8b-instant',
          messages: critiqueMessages,
          temperature: 0.3,
          maxTokens: 512,
          onDelta: acc => setCritiqueResult(acc),
          onFinish: res => {
            setCritiqueResult(res.content);
            setIsCritiquing(false);
          },
          onError: err => {
            showToast(err.message || 'Critique failed', 'error');
            setIsCritiquing(false);
          }
        });
      } else {
        await streamGeminiChatCompletion({
          apiKey: geminiApiKey,
          model: 'gemini-2.5-flash',
          messages: critiqueMessages,
          temperature: 0.3,
          maxTokens: 512,
          onDelta: acc => setCritiqueResult(acc),
          onFinish: res => {
            setCritiqueResult(res.content);
            setIsCritiquing(false);
          },
          onError: err => {
            showToast(err.message || 'Critique failed', 'error');
            setIsCritiquing(false);
          }
        });
      }
    } catch {
      setIsCritiquing(false);
    }
  };

  const handleSelectPreset = (name: string) => {
    const preset = SYSTEM_PROMPT_PRESETS.find(p => p.name === name);
    if (preset) {
      setSelectedPresetName(name);
      setSystemPrompt(preset.prompt);
      showToast(`Applied preset: ${name}`, 'info');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const promptText = inputPrompt.trim();
    if (!promptText || isLoading) return;

    // Check if required provider API key is present
    const hasActiveProviderKey = isGeminiModel ? Boolean(geminiApiKey?.trim()) : Boolean(apiKey?.trim());
    if (!hasActiveProviderKey) {
      showToast(
        isGeminiModel ? 'Gemini API Key required. Opening Settings...' : 'Groq API Key required. Opening Settings...',
        'warning'
      );
      setIsSettingsModalOpen(true);

      const userMsg: ChatMessage = {
        id: `usr-${Date.now()}`,
        role: 'user',
        content: promptText,
        timestamp: new Date().toISOString()
      };

      const advisoryMsg: ChatMessage = {
        id: `ast-${Date.now() + 1}`,
        role: 'assistant',
        content: `⚠️ **Groq API Key Required**\n\nTo run live inference with \`${activeModelId}\`, please configure your Groq API key in **Settings** (click the gear icon or the button below).\n\nGet a free API key at [console.groq.com](https://console.groq.com/keys).`,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, userMsg, advisoryMsg]);
      setInputPrompt('');
      return;
    }

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: promptText,
      timestamp: new Date().toISOString()
    };

    const assistantMsgId = `ast-${Date.now() + 1}`;
    const assistantPlaceholder: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg, assistantPlaceholder]);
    setInputPrompt('');
    setIsLoading(true);

    try {
      const apiMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];

      if (systemPrompt.trim()) {
        apiMessages.push({ role: 'system', content: systemPrompt.trim() });
      }

      // Apply Sliding FIFO Context Window (retaining pinned messages first)
      const validHistory = messages.filter(
        m =>
          m.content &&
          !m.content.startsWith('⚠️ **Groq API Key Required**') &&
          !m.content.startsWith('⚠️ **Inference Advisory')
      );

      const reservedTokens =
        maxTokens + estimateTokens(systemPrompt) + estimateTokens(promptText) + 128;
      const availableBudget = Math.max(512, activeContextLimit - reservedTokens);

      let usedTokens = 0;
      const includedIds = new Set<string>();

      // 1. Always retain pinned messages
      validHistory.forEach(m => {
        if (m.pinned) {
          includedIds.add(m.id);
          usedTokens += estimateTokens(m.content);
        }
      });

      // 2. Fill remaining budget from newest to oldest unpinned messages
      for (let i = validHistory.length - 1; i >= 0; i--) {
        const m = validHistory[i];
        if (includedIds.has(m.id)) continue;
        const msgTokens = estimateTokens(m.content);
        if (usedTokens + msgTokens <= availableBudget) {
          includedIds.add(m.id);
          usedTokens += msgTokens;
        }
      }

      validHistory.forEach(m => {
        if (includedIds.has(m.id)) {
          apiMessages.push({ role: m.role, content: m.content });
        }
      });
      apiMessages.push({ role: 'user', content: promptText });

      if (isGeminiModel) {
        await streamGeminiChatCompletion({
          apiKey: geminiApiKey,
          model: activeModelId,
          messages: apiMessages,
          temperature,
          maxTokens,
          topP,
          stopSequences,
          onDelta: (accumulated) => {
            setMessages(prev =>
              prev.map(m => (m.id === assistantMsgId ? { ...m, content: accumulated } : m))
            );
          },
          onFinish: (result) => {
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content: result.content,
                      metrics: result.metrics,
                      detectedActions: result.detectedActions
                    }
                  : m
              )
            );
            setIsLoading(false);
          },
          onError: (err) => {
            console.error('Gemini streaming error:', err);
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content: `⚠️ **Inference Advisory (${err.name || 'Error'})**: ${err.message || 'An error occurred with Gemini.'}`
                    }
                  : m
              )
            );
            showToast(err.message || 'Gemini inference error', 'error');
            setIsLoading(false);
          }
        });
      } else {
        await streamChatCompletion({
          apiKey,
          model: activeModelId,
          messages: apiMessages,
          temperature,
          maxTokens,
          topP,
          stopSequences,
          onDelta: (accumulated) => {
            setMessages(prev =>
              prev.map(m => (m.id === assistantMsgId ? { ...m, content: accumulated } : m))
            );
          },
          onFinish: (result) => {
            let finalContent = result.content;
            if (result.fallbackModel) {
              finalContent += `\n\n> ℹ️ *Note: Model "${activeModelId}" was unavailable. Automatically routed through fallback model "${result.fallbackModel}".*`;
            }
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content: finalContent,
                      metrics: result.metrics,
                      detectedActions: result.detectedActions
                    }
                  : m
              )
            );
            setIsLoading(false);
          },
          onError: (err) => {
            console.error('Chat streaming error:', err);
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantMsgId
                  ? {
                      ...m,
                      content: `⚠️ **Inference Advisory (${err.name || 'Error'})**: ${err.message || 'An error occurred while communicating with the inference engine.'}\n\nPlease check your API key in **Settings** or try selecting a different active model like \`openai/gpt-oss-120b\` or \`llama-3.1-8b-instant\`.`
                    }
                  : m
              )
            );
            showToast(err.message || 'Inference error', 'error');
            setIsLoading(false);
          }
        });
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      showToast(error.message || 'Error communicating with Groq API', 'error');

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMsgId
            ? {
                ...m,
                content: `⚠️ **Inference Advisory**: ${error.message || 'An error occurred while communicating with the inference engine.'}\n\nPlease check your API key in **Settings** or try selecting a different model.`
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSaveToNotepad = (content: string, title?: string) => {
    const cleanTitle = title?.trim() || 'Saved Response from Playground';
    const saved = addNote({
      title: cleanTitle,
      content,
      tags: ['playground', 'editorial', activeModelId.split('/').pop()?.split('-')[0] || 'groq'],
      source: 'playground'
    });
    triggerConfetti();
    showToast(`Note saved: "${saved.title}"`, 'success', {
      label: 'Open Notepad',
      onClick: () => setIsNotepadDrawerOpen(true)
    });
  };

  const handleClearChat = () => {
    setMessages([]);
    showToast('Conversation reset', 'info');
  };

  const handleExportChat = () => {
    if (messages.length === 0) {
      showToast('No messages to export yet', 'info');
      return;
    }
    const formatted = messages
      .map(
        m =>
          `### ${m.role === 'assistant' ? 'AIO Assistant' : 'User'} (${new Date(m.timestamp).toLocaleTimeString()})\n\n${m.content}\n`
      )
      .join('\n---\n\n');

    const blob = new Blob([formatted], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `aio_chat_${new Date().toISOString().split('T')[0]}.md`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('Exported conversation', 'info');
  };

  const modelDisplayName = currentModelConfig
    ? `${currentModelConfig.name}${currentModelConfig.badge ? ` · ${currentModelConfig.badge}` : ''}`
    : activeModelId;

  // Reusable Prompt Card Component
  const renderPromptCard = (isCentered: boolean = false) => (
    <form
      onSubmit={handleSendMessage}
      className={`relative w-full rounded-[18px] border border-[#C4BEB2] dark:border-stone-700/80 bg-theme-surface p-4 shadow-warm-lg focus-within:border-[rgba(28,25,23,0.35)] dark:focus-within:border-theme-accent transition-all duration-200 text-left ${
        isCentered ? 'max-w-[720px] mx-auto' : 'max-w-[760px] mx-auto'
      }`}
    >
      <textarea
        ref={textareaRef}
        value={inputPrompt}
        onChange={e => setInputPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything or request a structured blueprint... (Return to send, Shift + Return for new line)"
        rows={isCentered ? 3 : 2}
        className="w-full resize-none bg-transparent px-1 py-1 text-sm text-theme-primary placeholder:text-theme-muted focus:outline-none"
      />

      <div className="flex items-center justify-between pt-3 border-t border-[#D6D1C7] dark:border-stone-700/60 text-xs">
        {/* Bottom-Left: Model Selector Pill Button matching user screenshot */}
        <div className="flex items-center gap-2">
          {/* Model Selector Pill */}
          <div className="relative" ref={modelDropdownRef}>
            <button
              type="button"
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="inline-flex items-center gap-2.5 rounded-full border border-[#B8976C] dark:border-[#B29672] bg-transparent hover:bg-stone-500/10 dark:hover:bg-stone-800/40 px-4 py-1.5 text-[13px] font-normal text-stone-900 dark:text-[#FAF8F5] hover:border-theme-accent dark:hover:border-[#E5C158] transition-all duration-160 shadow-warm-sm group"
            >
              <span className="font-sans text-stone-900 dark:text-[#FAF8F5] whitespace-nowrap">
                {modelDisplayName}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-stone-600 dark:text-[#C4A482] group-hover:text-stone-900 dark:group-hover:text-white transition-transform duration-160 ${
                  isModelDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Model Dropdown Menu */}
            {isModelDropdownOpen && (
              <div className="absolute bottom-full left-0 mb-2 w-80 rounded-card border border-[#C8C2B6] dark:border-theme-borderStrong bg-theme-surface p-2 shadow-warm-lg z-40 animate-slide-up">
                <div className="px-3 py-1.5 border-b border-theme-border mb-1.5 flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-theme-muted font-semibold">
                    Select Groq Model
                  </span>
                  <span className="text-[9px] font-mono text-theme-accent font-semibold">LPU Fast</span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-1">
                  {availableModels.map(m => {
                    const isSelected = activeModelId === m.id && !isCustomModel;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedModel(m.id);
                          setIsCustomModel(false);
                          setIsModelDropdownOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-btn px-2.5 py-2 text-left text-xs transition-colors ${
                          isSelected
                            ? 'bg-theme-accentLight text-theme-primary border border-theme-borderStrong font-semibold'
                            : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated'
                        }`}
                      >
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="truncate text-xs font-medium">
                            {m.name}
                            {m.badge ? ` · ${m.badge}` : ''}
                          </span>
                          <span className="text-[10px] text-theme-muted truncate">
                            {m.description}
                          </span>
                        </div>
                        {m.badge && (
                          <span className="shrink-0 rounded-full bg-theme-sidebar px-2 py-0.5 text-[9px] font-mono text-theme-accent border border-theme-border font-medium">
                            {m.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* Custom Model ID */}
                  <div className="pt-1.5 border-t border-theme-border">
                    {!isCustomModel ? (
                      <button
                        type="button"
                        onClick={() => setIsCustomModel(true)}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-theme-accent hover:underline font-mono"
                      >
                        + Custom Model ID...
                      </button>
                    ) : (
                      <div className="p-1 space-y-1.5">
                        <input
                          type="text"
                          value={customModel}
                          onChange={e => setCustomModel(e.target.value)}
                          placeholder="e.g., llama-3.3-70b-versatile..."
                          className="w-full rounded-btn border border-theme-border bg-theme-elevated px-2.5 py-1 text-xs text-theme-primary focus:border-theme-accent focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => setIsModelDropdownOpen(false)}
                          className="w-full rounded-btn bg-theme-brand py-1 text-[11px] font-medium text-theme-surface"
                        >
                          Apply Custom Model
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom-Right Controls: Attachment + Send Button */}
        <div className="flex items-center gap-2">
          {/* Attachment button */}
          <button
            type="button"
            onClick={() => setActiveTab('snap-to-notes')}
            className="flex h-8 w-8 items-center justify-center rounded-full text-theme-secondary hover:text-theme-primary hover:bg-theme-elevated transition-colors"
            title="Attach Image / Switch to Snap-to-Notes"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          {/* Primary Send Button with Send text + icon */}
          <button
            type="submit"
            disabled={!inputPrompt.trim() || isLoading}
            className="flex items-center gap-1.5 rounded-lg bg-stone-700 dark:bg-[#3E3832] px-3.5 py-1.5 text-xs font-medium text-stone-100 hover:bg-stone-800 dark:hover:bg-[#4E463E] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-160 shadow-warm-sm"
            title="Send Message"
          >
            <span>Send</span>
            <Send className="h-3.5 w-3.5 stroke-[2]" />
          </button>
        </div>
      </div>
    </form>
  );

  return (
    <div className="relative flex flex-col flex-1 h-full w-full overflow-hidden">
      {/* Floating Parameters & Context Pill in Top-Right Area */}
      <div className="absolute right-6 top-3 z-30 flex items-center gap-2">
        <span
          className="hidden sm:inline-flex items-center gap-1 rounded-full border border-theme-border bg-theme-surface/90 px-2.5 py-1 text-[10px] font-mono text-theme-muted shadow-warm-sm backdrop-blur-md"
          title="Active context tokens vs Context Window Budget"
        >
          <span>
            {activeContextTokens >= 1000
              ? `${(activeContextTokens / 1000).toFixed(1)}k`
              : activeContextTokens}{' '}
            /{' '}
            {activeContextLimit >= 1000
              ? `${Math.round(activeContextLimit / 1024)}k`
              : activeContextLimit}{' '}
            ctx
          </span>
        </span>

        <button
          type="button"
          data-params-toggle="true"
          onClick={() => setShowParamsPanel(!showParamsPanel)}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-160 shadow-warm-sm backdrop-blur-md ${
            showParamsPanel
              ? 'border-theme-accent bg-theme-accentLight text-theme-accent font-semibold'
              : 'border-theme-border bg-theme-surface/90 text-theme-secondary hover:text-theme-primary hover:border-theme-borderStrong'
          }`}
          title="Model Parameters, Prompt Analyzer & System Persona"
        >
          <Sliders className="h-3 w-3 text-theme-accent" />
          <span>Parameters</span>
          {showParamsPanel ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {/* Floating Vertical Drawer anchored downward on the right */}
        {showParamsPanel && (
          <div
            ref={paramsDrawerRef}
            className="absolute right-0 top-10 z-40 w-80 sm:w-96 min-h-[480px] max-h-[85vh] overflow-y-auto rounded-card border border-theme-borderStrong bg-theme-surface p-4 shadow-warm-lg animate-slide-up flex flex-col gap-4"
          >
            {/* Header + Tabs */}
            <div className="flex items-center justify-between border-b border-theme-border pb-2.5">
              <div className="flex items-center gap-1 rounded-btn bg-theme-elevated p-0.5 border border-theme-border">
                <button
                  type="button"
                  onClick={() => setParamsTab('params')}
                  className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                    paramsTab === 'params'
                      ? 'bg-theme-surface text-theme-accent shadow-warm-sm font-semibold'
                      : 'text-theme-secondary hover:text-theme-primary'
                  }`}
                >
                  <Sliders className="h-3 w-3" />
                  <span>Params</span>
                </button>
                <button
                  type="button"
                  onClick={() => setParamsTab('analyzer')}
                  className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                    paramsTab === 'analyzer'
                      ? 'bg-theme-surface text-theme-accent shadow-warm-sm font-semibold'
                      : 'text-theme-secondary hover:text-theme-primary'
                  }`}
                >
                  <Layers className="h-3 w-3" />
                  <span>Analyzer</span>
                </button>
                <button
                  type="button"
                  onClick={() => setParamsTab('system')}
                  className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium transition-colors ${
                    paramsTab === 'system'
                      ? 'bg-theme-surface text-theme-accent shadow-warm-sm font-semibold'
                      : 'text-theme-secondary hover:text-theme-primary'
                  }`}
                >
                  <Terminal className="h-3 w-3" />
                  <span>System</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowParamsPanel(false)}
                className="text-theme-muted hover:text-theme-primary p-0.5 rounded"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {paramsTab === 'params' && (
              <div className="space-y-4">
                {/* Sliders */}
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-theme-secondary mb-1 font-mono text-[11px]">
                      <span>Temperature</span>
                      <span className="font-semibold text-theme-accent">{temperature.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="2.0"
                      step="0.05"
                      value={temperature}
                      onChange={e => setTemperature(parseFloat(e.target.value))}
                      className="w-full accent-theme-accent cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-theme-secondary mb-1 font-mono text-[11px]">
                      <span>Max Tokens</span>
                      <span className="font-semibold text-theme-accent">{maxTokens}</span>
                    </div>
                    <input
                      type="range"
                      min="128"
                      max="8192"
                      step="128"
                      value={maxTokens}
                      onChange={e => setMaxTokens(parseInt(e.target.value, 10))}
                      className="w-full accent-theme-accent cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-theme-secondary mb-1 font-mono text-[11px]">
                      <span>Top P</span>
                      <span className="font-semibold text-theme-accent">{topP.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={topP}
                      onChange={e => setTopP(parseFloat(e.target.value))}
                      className="w-full accent-theme-accent cursor-pointer"
                    />
                  </div>
                </div>

                {/* Context Window Budget (Sliding FIFO) */}
                <div className="space-y-2 pt-2 border-t border-theme-border">
                  <div className="flex items-center justify-between">
                    <span className="font-editorial text-xs font-semibold text-theme-primary">
                      Context Window Budget
                    </span>
                    <span className="font-mono text-[10px] text-theme-accent">
                      {contextBudget === 'max'
                        ? `Max (${Math.round(modelMaxContext / 1024)}k)`
                        : `${Math.round(activeContextLimit / 1024)}k`}
                    </span>
                  </div>
                  <div className="grid grid-cols-6 gap-1">
                    {CONTEXT_BUDGET_OPTIONS.map(opt => (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => setContextBudget(opt.value)}
                        className={`rounded-btn py-1 text-[10px] font-mono transition-colors ${
                          contextBudget === opt.value
                            ? 'bg-theme-accentLight text-theme-accent border border-theme-borderStrong font-semibold'
                            : 'border border-theme-border bg-theme-elevated text-theme-secondary hover:text-theme-primary'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-theme-muted leading-relaxed">
                    Sliding FIFO trims older unpinned turns when active tokens exceed budget minus completion tokens. Pinned messages are always retained.
                  </p>
                </div>

                {/* Stop Sequences (0/4) */}
                <div className="space-y-2 pt-2 border-t border-theme-border">
                  <div className="flex items-center justify-between font-mono text-[11px]">
                    <span className="text-theme-secondary">Stop Sequences</span>
                    <span className="text-theme-muted">{stopSequences.length}/4</span>
                  </div>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={stopInput}
                      onChange={e => setStopInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddStopSequence();
                        }
                      }}
                      disabled={stopSequences.length >= 4}
                      placeholder="Enter delimiter..."
                      className="flex-1 rounded-input border border-theme-border bg-theme-elevated px-2.5 py-1 font-mono text-[11px] text-theme-primary placeholder:text-theme-muted focus:border-theme-accent focus:outline-none disabled:opacity-50"
                    />
                    <button
                      type="button"
                      onClick={handleAddStopSequence}
                      disabled={stopSequences.length >= 4 || !stopInput.trim()}
                      className="rounded-btn border border-theme-border bg-theme-elevated px-2 py-1 text-theme-secondary hover:text-theme-primary disabled:opacity-40"
                      title="Add stop sequence"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {stopSequences.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {stopSequences.map(seq => (
                        <span
                          key={seq}
                          className="inline-flex items-center gap-1 rounded-btn border border-theme-border bg-theme-elevated px-2 py-0.5 font-mono text-[10px] text-theme-primary"
                        >
                          <span>{seq}</span>
                          <button
                            type="button"
                            onClick={() => setStopSequences(prev => prev.filter(s => s !== seq))}
                            className="text-theme-muted hover:text-rose-500"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {paramsTab === 'analyzer' && (
              <div className="space-y-3">
                {/* Detected Paradigm */}
                <div className="rounded-btn border border-theme-border bg-theme-elevated p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-theme-muted">
                      Detected Paradigm
                    </span>
                    <span className="rounded-btn bg-theme-accentLight border border-theme-borderStrong px-2 py-0.5 text-[10px] font-mono font-semibold text-theme-accent">
                      {promptAnalysis.paradigm}
                    </span>
                  </div>
                  <p className="text-[11px] text-theme-secondary leading-relaxed">
                    {inputPrompt.trim()
                      ? `Analyzing ${inputPrompt.trim().length} chars (~${estimateTokens(inputPrompt)} tokens) in real time.`
                      : 'Type or paste your prompt in the composer to analyze its structure in real time.'}
                  </p>
                </div>

                {/* Shot Evidence Breakdown */}
                <div className="rounded-btn border border-theme-border bg-theme-elevated p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-theme-muted">
                      Shot Evidence
                    </span>
                    <span className="font-mono text-[10px] text-theme-accent">
                      {promptAnalysis.exemplars.length} Exemplars
                    </span>
                  </div>
                  {promptAnalysis.exemplars.length === 0 ? (
                    <p className="font-mono text-[10px] text-theme-muted italic">
                      No input/output example markers detected yet.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {promptAnalysis.exemplars.slice(0, 3).map((ex, i) => (
                        <li key={i} className="truncate font-mono text-[10px] text-theme-secondary">
                          • {ex}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Structural Anatomy */}
                <div className="rounded-btn border border-theme-border bg-theme-elevated p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-wider text-theme-muted">
                      Structural Anatomy
                    </span>
                    <span className="font-mono text-[10px] text-theme-accent">
                      {promptAnalysis.pipCount} / 4 Pips
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                    {[
                      { label: 'Persona / System', active: promptAnalysis.pips.persona },
                      { label: 'Context Delimiters', active: promptAnalysis.pips.delimiters },
                      { label: 'Demonstrations', active: promptAnalysis.pips.demonstrations },
                      { label: 'Target Task / Format', active: promptAnalysis.pips.targetTask }
                    ].map(pip => (
                      <div
                        key={pip.label}
                        className={`flex items-center gap-1.5 rounded border px-2 py-1 ${
                          pip.active
                            ? 'border-theme-borderStrong bg-theme-surface text-theme-primary font-medium'
                            : 'border-theme-border text-theme-muted'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            pip.active ? 'bg-theme-accent' : 'bg-theme-borderStrong'
                          }`}
                        />
                        <span className="truncate">{pip.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Refine / Critique */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleRunCritique}
                    disabled={isCritiquing || !inputPrompt.trim()}
                    className="w-full flex items-center justify-center gap-1.5 rounded-btn bg-theme-brand px-3 py-2 text-xs font-semibold text-theme-surface hover:bg-theme-brandHover disabled:opacity-40 transition-all shadow-warm-sm"
                  >
                    <Sparkles className={`h-3.5 w-3.5 ${isCritiquing ? 'animate-spin' : ''}`} />
                    <span>{isCritiquing ? 'Refining Prompt...' : 'Run Prompt Critique'}</span>
                  </button>

                  {critiqueResult && (
                    <div className="rounded-btn border border-theme-border bg-theme-elevated p-2.5 space-y-2 text-[11px] text-theme-secondary">
                      <p className="whitespace-pre-wrap leading-relaxed">{critiqueResult}</p>
                      {critiqueResult.includes('Refined Prompt:') && (
                        <button
                          type="button"
                          onClick={() => {
                            const refined = critiqueResult.split('Refined Prompt:').pop()?.trim();
                            if (refined) {
                              setInputPrompt(refined.replace(/^```[\w]*\n?|```$/g, '').trim());
                              showToast('Applied refined prompt', 'success');
                            }
                          }}
                          className="inline-flex items-center gap-1 rounded-btn border border-theme-borderStrong bg-theme-surface px-2.5 py-1 text-[10px] font-semibold text-theme-accent hover:bg-theme-accentLight transition-colors"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Apply Refined Prompt</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {paramsTab === 'system' && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-editorial text-xs font-semibold uppercase tracking-wider text-theme-muted">
                    System Persona &amp; Rules
                  </span>
                  <span className="font-mono text-[10px] text-theme-muted">
                    {systemPrompt.length} chars
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {SYSTEM_PROMPT_PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleSelectPreset(preset.name)}
                      className={`rounded-btn px-2 py-0.5 text-[10px] transition-all duration-160 ${
                        selectedPresetName === preset.name
                          ? 'bg-theme-accentLight text-theme-accent border border-theme-borderStrong font-semibold'
                          : 'border border-theme-border bg-theme-elevated text-theme-secondary hover:text-theme-primary'
                      }`}
                    >
                      {preset.name.split(' ')[0]}
                    </button>
                  ))}
                </div>

                <textarea
                  value={systemPrompt}
                  onChange={e => {
                    setSystemPrompt(e.target.value);
                    setSelectedPresetName('Custom');
                  }}
                  rows={12}
                  placeholder="Define role framing, behavioral boundaries, or persona..."
                  className="w-full min-h-[260px] rounded-input border border-theme-border bg-theme-elevated p-2.5 font-mono text-[10px] leading-relaxed text-theme-primary placeholder:text-theme-muted focus:border-theme-accent focus:outline-none"
                />
                {systemPrompt.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setSystemPrompt('');
                      setSelectedPresetName('Custom');
                    }}
                    className="text-[10px] font-mono text-theme-muted hover:text-rose-500 transition-colors"
                  >
                    Clear Persona
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Conversation Canvas */}
      {messages.length === 0 ? (
        /* Empty State: Claude-Style Centered Hero */
        <div className="flex-1 flex flex-col items-center justify-center w-full px-4 text-center my-auto animate-fade-in">
          {/* Centered Greeting with Asterisk */}
          <div className="flex items-center justify-center gap-2.5 mb-6">
            <span className="text-theme-accent text-2xl font-serif select-none leading-none">✳</span>
            <h2 className="font-editorial text-2xl sm:text-3xl font-medium tracking-tight text-theme-primary">
              Back at it, {userFirstName}
            </h2>
          </div>

          {/* Missing API Key Advisory Banner */}
          {!isConfigured && (
            <div className="mx-auto w-full max-w-[720px] mb-4 flex items-center justify-between rounded-card border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-200 shadow-warm-sm animate-fade-in text-left">
              <div className="flex items-center gap-2.5">
                <Key className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Groq API Key not detected. Connect your free key for real-time LPU inference.</span>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(true)}
                className="rounded-btn bg-amber-600 dark:bg-amber-500 px-3 py-1 font-semibold text-white hover:bg-amber-700 transition-colors shadow-warm-sm shrink-0"
              >
                Set API Key
              </button>
            </div>
          )}

          {/* Centered Input Card */}
          <div className="w-full max-w-[720px]">
            {renderPromptCard(true)}
          </div>
        </div>
      ) : (
        /* Active Chat State: Messages Feed + Pinned Bottom Input */
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-6 max-w-[760px] mx-auto w-full">
            {!isConfigured && (
              <div className="flex items-center justify-between rounded-card border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-800 dark:text-amber-200 shadow-warm-sm">
                <div className="flex items-center gap-2.5">
                  <Key className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Groq API Key not detected. Connect your key in Settings.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSettingsModalOpen(true)}
                  className="rounded-btn bg-amber-600 dark:bg-amber-500 px-3 py-1 text-[11px] font-semibold text-white hover:bg-amber-700 transition-colors shadow-warm-sm"
                >
                  Set API Key
                </button>
              </div>
            )}
            {messages.map(msg => (
              <ChatMessageItem
                key={msg.id}
                message={msg}
                onSaveToNotepad={handleSaveToNotepad}
                onTogglePin={handleTogglePin}
              />
            ))}

            {isLoading && (
              <div className="flex items-center gap-3 rounded-card border border-theme-borderStrong bg-theme-surface p-4 text-xs text-theme-secondary shadow-warm-sm">
                <Zap className="h-4 w-4 text-theme-accent animate-pulse" />
                <span className="font-editorial text-sm italic text-theme-primary">
                  Synthesizing response on Groq LPU...
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Pinned Prompt Card */}
          <div className="sticky bottom-0 z-10 w-full max-w-[760px] mx-auto px-4 pb-4 pt-2 bg-gradient-to-t from-theme-main via-theme-main/90 to-transparent">
            {renderPromptCard(false)}
          </div>

          {/* Action Buttons in Bottom-Right Corner of Viewport */}
          <div className="fixed bottom-4 right-6 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportChat}
              className="flex items-center gap-1.5 rounded-full border border-[#C8C2B6] dark:border-theme-border bg-theme-surface/90 px-3.5 py-1.5 text-xs text-theme-secondary hover:text-theme-primary hover:border-theme-borderStrong transition-all shadow-warm-sm backdrop-blur-md"
              title="Export conversation as Markdown"
            >
              <Download className="h-3 w-3 text-theme-muted" />
              <span>Export</span>
            </button>
            <button
              type="button"
              onClick={handleClearChat}
              className="flex items-center gap-1.5 rounded-full border border-[#C8C2B6] dark:border-theme-border bg-theme-surface/90 px-3.5 py-1.5 text-xs text-theme-secondary hover:text-theme-primary hover:border-theme-borderStrong transition-all shadow-warm-sm backdrop-blur-md"
              title="Finish task and clear conversation for a fresh start"
            >
              <Trash2 className="h-3 w-3 text-theme-muted" />
              <span>Fresh Start</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
