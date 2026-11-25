import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Key,
  Eye,
  EyeOff,
  Zap,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Cpu
} from 'lucide-react';
import { testGroqConnection } from '../../services/groq';
import { INITIAL_NOTES, INITIAL_CALENDAR_EVENTS, INITIAL_TODOS } from '../../utils/constants';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    apiKey,
    setApiKey,
    showToast
  } = useApp();

  const [inputKey, setInputKey] = useState(apiKey);
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    modelCount?: number;
    latencyMs?: number;
  } | null>(null);

  useEffect(() => {
    if (isSettingsModalOpen) {
      setInputKey(apiKey);
      setTestResult(null);
      setShowKey(false);
    }
  }, [isSettingsModalOpen, apiKey]);

  if (!isSettingsModalOpen) return null;

  const handleSave = () => {
    setApiKey(inputKey);
    showToast('Groq API Key configuration saved', 'success');
    setIsSettingsModalOpen(false);
  };

  const handleTestConnection = async () => {
    const keyToTest = inputKey.trim();
    if (!keyToTest) {
      setTestResult({
        success: false,
        message: 'Please enter a key to test'
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await testGroqConnection(keyToTest);
      setTestResult(res);
      if (res.success) {
        showToast('Groq API connection verified ✓', 'success');
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Connection test failed. Check key & network.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleResetData = () => {
    if (window.confirm('Reset all notes, calendar blocks, and to-dos to original sample data?')) {
      localStorage.setItem('groq_nexus_notes_v1', JSON.stringify(INITIAL_NOTES));
      localStorage.setItem('groq_nexus_calendar_v1', JSON.stringify(INITIAL_CALENDAR_EVENTS));
      localStorage.setItem('groq_nexus_todos_v1', JSON.stringify(INITIAL_TODOS));
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in transition-colors duration-180">
      <div className="relative w-full max-w-xl rounded-card border border-theme-borderStrong bg-theme-surface p-6 shadow-warm-lg text-theme-primary max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-theme-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-btn bg-theme-accentLight border border-theme-borderStrong text-theme-accent">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-editorial text-lg font-semibold text-theme-primary">
                Engine &amp; Workspace Credentials
              </h2>
              <p className="text-xs text-theme-secondary font-mono">
                Groq LPU Inference &amp; Local Persistence
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(false)}
            className="rounded-btn p-1.5 text-theme-muted hover:bg-theme-sidebar hover:text-theme-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* API Key Input */}
        <div className="mt-5 space-y-5">
          <div>
            <label className="font-editorial text-xs font-semibold uppercase tracking-wider text-theme-muted block mb-2">
              Groq API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={inputKey}
                onChange={e => setInputKey(e.target.value)}
                placeholder="gsk_..."
                className="w-full rounded-btn border border-theme-border bg-theme-elevated px-3.5 py-2.5 pr-10 font-mono text-xs text-theme-primary placeholder:text-theme-muted focus:border-theme-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-primary transition-colors"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-theme-secondary">
              <span className="flex items-center gap-1.5 text-theme-accent">
                <ShieldCheck className="h-3.5 w-3.5" />
                Stored exclusively in your local browser localStorage.
              </span>
              <a
                href="https://console.groq.com/keys"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-theme-accent hover:underline font-mono"
              >
                Get Free Groq Key <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Test Connection Button & Immediate Visual Confirmation */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="inline-flex items-center gap-2 rounded-btn border border-theme-border bg-theme-elevated px-3.5 py-2 text-xs font-medium text-theme-primary hover:border-theme-borderStrong transition-all disabled:opacity-50 shadow-warm-sm"
            >
              <Zap className={`h-3.5 w-3.5 text-theme-accent ${isTesting ? 'animate-spin' : ''}`} />
              {isTesting ? 'Testing connection...' : 'Test Connection'}
            </button>

            {testResult && (
              <div
                className={`inline-flex items-center gap-1.5 rounded-btn px-3 py-1.5 text-xs font-medium border ${
                  testResult.success
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                )}
                <span className="font-semibold">{testResult.success ? 'Connected' : 'Invalid Key'}:</span>
                <span className="truncate max-w-xs">{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Inference Engine Info Card */}
          <div className="rounded-card border border-theme-border bg-theme-elevated p-4 text-xs text-theme-secondary space-y-2.5 shadow-warm-sm">
            <div className="flex items-center gap-2 text-theme-primary font-semibold font-editorial">
              <Cpu className="h-4 w-4 text-theme-accent" />
              <span>Supported Groq LPU Models in AIO Studio</span>
            </div>
            <ul className="grid grid-cols-2 gap-2 text-[11px] text-theme-secondary pt-1 font-mono">
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-theme-accent" />
                <strong className="text-theme-primary">GPT-OSS (120B / 20B):</strong> Flagship open weights
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-theme-accent" />
                <strong className="text-theme-primary">Qwen 3.8 27B:</strong> High-density reasoning
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-theme-accent" />
                <strong className="text-theme-primary">Llama 3.3 70B:</strong> High intelligence
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-theme-accent" />
                <strong className="text-theme-primary">Llama 3.1 8B:</strong> ~100ms ultra-fast
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-theme-accent" />
                <strong className="text-theme-primary">DeepSeek R1:</strong> Deep reasoning
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-theme-accent" />
                <strong className="text-theme-primary">Llama 4 Vision:</strong> Multimodal OCR (Scout 17B / Maverick 17B)
              </li>
            </ul>
          </div>

          {/* Reset Workspace */}
          <div className="pt-3 border-t border-theme-border flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold font-editorial text-theme-primary">Reset Workspace Data</p>
              <p className="text-[11px] text-theme-muted">Restore initial sample documents &amp; schedule</p>
            </div>
            <button
              type="button"
              onClick={handleResetData}
              className="inline-flex items-center gap-1.5 rounded-btn border border-rose-300 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/20 px-3 py-1.5 text-xs text-rose-600 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset All
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-theme-border">
          <button
            type="button"
            onClick={() => setIsSettingsModalOpen(false)}
            className="rounded-btn px-4 py-2 text-xs font-medium text-theme-secondary hover:text-theme-primary hover:bg-theme-sidebar transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-btn bg-theme-brand px-5 py-2 text-xs font-semibold text-theme-surface hover:bg-theme-brandHover transition-all shadow-warm-sm"
          >
            Save &amp; Apply
          </button>
        </div>
      </div>
    </div>
  );
};
