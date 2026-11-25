import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  FileText,
  CheckSquare,
  Sun,
  Moon,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { theme, toggleTheme } = useApp();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;

    setErrorMsg(null);
    setInfoMsg(null);
    setNeedsConfirmation(false);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg('Please enter your email and password.');
      return;
    }
    if (mode === 'signup' && password.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: fullName.trim() || cleanEmail.split('@')[0]
            }
          }
        });

        if (error) throw error;

        if (data.user && !data.session) {
          setInfoMsg('Account created! Please click the confirmation link sent to your email (check Spam too), then sign in.');
          setMode('signin');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });
        if (error) throw error;
      }
    } catch (err: any) {
      const msg = err?.message || 'Authentication failed. Please try again.';
      if (msg.toLowerCase().includes('email not confirmed')) {
        setNeedsConfirmation(true);
        setErrorMsg('Your email is not confirmed yet. Click the link in your inbox (or Spam), or resend it below.');
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!supabase || !email.trim()) return;
    setIsResending(true);
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      if (error) throw error;
      setNeedsConfirmation(false);
      setInfoMsg('Confirmation email resent! Please check your inbox and Spam folder.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not resend confirmation email.');
    } finally {
      setIsResending(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    if (!supabase) return;
    setErrorMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setErrorMsg(err.message || `Failed to sign in with ${provider}`);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-theme-main text-theme-primary flex flex-col justify-center items-center p-4 sm:p-6 transition-colors duration-180">
      {/* Top-Right Theme Toggle */}
      <div className="fixed top-5 right-6 z-20">
        <button
          type="button"
          onClick={toggleTheme}
          className="inline-flex items-center gap-2 rounded-full border border-theme-border bg-theme-surface px-3.5 py-1.5 text-xs font-medium text-theme-secondary hover:text-theme-primary hover:border-theme-borderStrong transition-all shadow-warm-sm"
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-theme-accent" /> : <Moon className="h-3.5 w-3.5 text-theme-accent" />}
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
      </div>

      <div className="w-full max-w-md space-y-6 animate-fade-in">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-theme-brand text-theme-surface shadow-warm-md">
            <span className="font-editorial text-sm italic font-bold tracking-tight">AIO</span>
          </div>
          <div>
            <h1 className="font-editorial text-2xl sm:text-3xl font-bold tracking-tight text-theme-primary">
              AIO
            </h1>
            <p className="text-xs font-mono text-theme-muted mt-1 tracking-wide">
              AI Chat · Notes · To-Do
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="rounded-card border border-theme-borderStrong bg-theme-surface p-6 sm:p-7 shadow-warm-lg space-y-5">
          {/* Mode Tabs */}
          <div className="grid grid-cols-2 rounded-btn bg-theme-elevated p-1 border border-theme-border">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
              }}
              className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                mode === 'signin'
                  ? 'bg-theme-brand text-theme-surface shadow-warm-sm'
                  : 'text-theme-secondary hover:text-theme-primary'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
                setInfoMsg(null);
              }}
              className={`rounded-lg py-2 text-xs font-semibold transition-all ${
                mode === 'signup'
                  ? 'bg-theme-brand text-theme-surface shadow-warm-sm'
                  : 'text-theme-secondary hover:text-theme-primary'
              }`}
            >
              Create Account
            </button>
          </div>

          {errorMsg && (
            <div className="flex flex-col gap-2 rounded-btn border border-rose-500/40 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
              {needsConfirmation && (
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={isResending}
                  className="self-start ml-6 text-[11px] font-semibold underline hover:opacity-80 disabled:opacity-50"
                >
                  {isResending ? 'Sending...' : 'Resend confirmation email'}
                </button>
              )}
            </div>
          )}

          {infoMsg && (
            <div className="flex items-start gap-2.5 rounded-btn border border-emerald-500/40 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="text-[11px] font-semibold uppercase tracking-wider text-theme-muted block mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Dipankar Sahoo"
                    className="w-full rounded-btn border border-theme-border bg-theme-elevated pl-9 pr-3.5 py-2.5 text-xs text-theme-primary placeholder:text-theme-muted focus:border-theme-accent focus:outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-theme-muted block mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-btn border border-theme-border bg-theme-elevated pl-9 pr-3.5 py-2.5 text-xs text-theme-primary placeholder:text-theme-muted focus:border-theme-accent focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-theme-muted block mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-theme-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                  className="w-full rounded-btn border border-theme-border bg-theme-elevated pl-9 pr-10 py-2.5 text-xs text-theme-primary placeholder:text-theme-muted focus:border-theme-accent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-muted hover:text-theme-primary"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex h-10 items-center justify-center gap-2 rounded-btn bg-theme-brand text-xs font-bold text-theme-surface hover:bg-theme-brandHover disabled:opacity-50 transition-all shadow-warm-sm"
            >
              <span>
                {isLoading
                  ? 'Please wait...'
                  : mode === 'signin'
                  ? 'Sign In to Workspace'
                  : 'Create Free Account'}
              </span>
              {!isLoading && <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </form>

          {/* Optional Social Login Divider */}
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-theme-border" />
            </div>
            <div className="relative flex justify-center text-[10px] font-mono uppercase">
              <span className="bg-theme-surface px-2.5 text-theme-muted">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => handleOAuthLogin('google')}
              className="flex items-center justify-center gap-2 rounded-btn border border-theme-border bg-theme-elevated py-2 text-xs font-medium text-theme-primary hover:border-theme-borderStrong transition-colors"
            >
              Google
            </button>
            <button
              type="button"
              onClick={() => handleOAuthLogin('github')}
              className="flex items-center justify-center gap-2 rounded-btn border border-theme-border bg-theme-elevated py-2 text-xs font-medium text-theme-primary hover:border-theme-borderStrong transition-colors"
            >
              GitHub
            </button>
          </div>
        </div>

        {/* Workspace Highlights */}
        <div className="grid grid-cols-3 gap-2 text-center text-[11px] text-theme-muted">
          <div className="flex flex-col items-center gap-1 p-2">
            <Sparkles className="h-3.5 w-3.5 text-theme-accent" />
            <span>Groq AI Chat</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2">
            <FileText className="h-3.5 w-3.5 text-theme-accent" />
            <span>Smart Notes</span>
          </div>
          <div className="flex flex-col items-center gap-1 p-2">
            <CheckSquare className="h-3.5 w-3.5 text-theme-accent" />
            <span>To-Do &amp; Plan</span>
          </div>
        </div>
      </div>
    </div>
  );
};
