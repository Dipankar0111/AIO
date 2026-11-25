import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ChatMessage, GroqModelConfig } from '../../types';
import { GROQ_MODELS, SYSTEM_PROMPT_PRESETS } from '../../utils/constants';
import { streamChatCompletion, fetchGroqModels } from '../../services/groq';
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
  Key
} from 'lucide-react';

export const LLMPlayground: React.FC = () => {
  const {
    user,
    apiKey,
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
  const [systemPrompt, setSystemPrompt] = useState<string>(SYSTEM_PROMPT_PRESETS[0].prompt);
  const [selectedPresetName, setSelectedPresetName] = useState<string>(SYSTEM_PROMPT_PRESETS[0].name);

  // Dynamically fetch models from Groq when API key is present
  useEffect(() => {
    if (apiKey && apiKey.trim()) {
      fetchGroqModels(apiKey).then(models => {
        if (models && models.length > 0) {
          setAvailableModels(models);
        }
      });
    }
  }, [apiKey]);

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
  const currentModelConfig = availableModels.find(m => m.id === activeModelId) || GROQ_MODELS.find(m => m.id === activeModelId);

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

    // Check if API key is present
    if (!apiKey || !apiKey.trim()) {
      showToast('Groq API Key required. Opening Settings...', 'warning');
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

      messages.forEach(m => {
        if (
          m.content &&
          !m.content.startsWith('⚠️ **Groq API Key Required**') &&
          !m.content.startsWith('⚠️ **Inference Advisory')
        ) {
          apiMessages.push({ role: m.role, content: m.content });
        }
      });
      apiMessages.push({ role: 'user', content: promptText });

      await streamChatCompletion({
        apiKey,
        model: activeModelId,
        messages: apiMessages,
        temperature,
        maxTokens,
        topP,
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
      {/* Floating Parameters Drawer Button in Top-Right Area */}
      <div className="absolute right-6 top-3 z-30">
        <button
          type="button"
          data-params-toggle="true"
          onClick={() => setShowParamsPanel(!showParamsPanel)}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-160 shadow-warm-sm backdrop-blur-md ${
            showParamsPanel
              ? 'border-theme-accent bg-theme-accentLight text-theme-accent font-semibold'
              : 'border-theme-border bg-theme-surface/90 text-theme-secondary hover:text-theme-primary hover:border-theme-borderStrong'
          }`}
          title="Model Parameters Drawer"
        >
          <Sliders className="h-3 w-3 text-theme-accent" />
          <span>Parameters</span>
          {showParamsPanel ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {/* Floating Vertical Drawer (~280px) anchored downward on the right */}
        {showParamsPanel && (
          <div
            ref={paramsDrawerRef}
            className="absolute right-0 top-10 z-40 w-72 sm:w-80 rounded-card border border-theme-borderStrong bg-theme-surface p-4 shadow-warm-lg animate-slide-up space-y-4"
          >
            <div className="flex items-center justify-between border-b border-theme-border pb-2">
              <span className="font-editorial text-xs font-semibold text-theme-primary">
                Inference Parameters
              </span>
              <button
                type="button"
                onClick={() => setShowParamsPanel(false)}
                className="text-theme-muted hover:text-theme-primary p-0.5 rounded"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

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

            {/* System Prompt & Presets */}
            <div className="space-y-2 pt-2 border-t border-theme-border">
              <span className="font-editorial text-xs font-semibold uppercase tracking-wider text-theme-muted block">
                System Persona
              </span>
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
                rows={2}
                placeholder="Custom system instructions..."
                className="w-full rounded-input border border-theme-border bg-theme-elevated p-2 font-mono text-[10px] text-theme-primary placeholder:text-theme-muted focus:border-theme-accent focus:outline-none"
              />
            </div>
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
              title="Reset conversation back to centered empty state"
            >
              <Trash2 className="h-3 w-3 text-theme-muted" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
