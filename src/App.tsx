import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LLMPlayground } from './components/playground/LLMPlayground';
import { SnapToNotes } from './components/snap-to-notes/SnapToNotes';
import { DailyScheduler } from './components/scheduler/DailyScheduler';
import { NotepadDrawer } from './components/drawers/NotepadDrawer';
import { CalendarDrawer } from './components/drawers/CalendarDrawer';
import { SettingsModal } from './components/common/SettingsModal';
import { ToastContainer } from './components/common/ToastContainer';
import { LoginPage } from './components/auth/LoginPage';
import { isSupabaseConfigured } from './lib/supabase';

const MainLayout: React.FC = () => {
  const { activeTab, user, authLoading } = useApp();

  if (isSupabaseConfigured && authLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-theme-main text-theme-primary">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-theme-brand text-theme-surface shadow-warm-md animate-pulse">
            <span className="font-editorial text-xs italic font-bold">AIO</span>
          </div>
          <span className="text-xs font-mono text-theme-muted">Loading workspace...</span>
        </div>
      </div>
    );
  }

  if (isSupabaseConfigured && !user) {
    return (
      <>
        <LoginPage />
        <ToastContainer />
      </>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-theme-main text-theme-primary transition-colors duration-180">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 bg-theme-main overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto relative flex flex-col">
          {activeTab === 'playground' ? (
            <LLMPlayground />
          ) : (
            <div className="max-w-[1100px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5">
              {activeTab === 'snap-to-notes' && <SnapToNotes />}
              {activeTab === 'scheduler' && <DailyScheduler />}
            </div>
          )}
        </main>
      </div>
      <NotepadDrawer />
      <CalendarDrawer />
      <SettingsModal />
      <ToastContainer />
    </div>
  );
};

export function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}

export default App;
