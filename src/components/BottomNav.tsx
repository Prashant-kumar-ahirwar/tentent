import React from 'react';
import { BookOpen, Settings, Plus, Home } from 'lucide-react';

interface BottomNavProps {
  activeView: 'dashboard' | 'settings';
  onChangeView: (view: 'dashboard' | 'settings') => void;
  onOpenAddEntry: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeView,
  onChangeView,
  onOpenAddEntry,
}) => {
  return (
    <>
      {/* Floating Action Button (FAB) for quick adding entry on mobile & tablet */}
      {activeView === 'dashboard' && (
        <button
          onClick={onOpenAddEntry}
          title="Add new monthly bill entry"
          className="md:hidden fixed bottom-[72px] right-4 w-13 h-13 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shadow-lg hover:bg-[var(--primary-hover)] active:scale-95 transition-all z-40 cursor-pointer border-2 border-white/20"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Bottom Sticky Navigation Bar (Mobile only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--card)]/95 backdrop-blur-md border-t border-[var(--line-strong)] z-30 shadow-lg">
        <div className="flex items-center h-15">
          <button
            onClick={() => onChangeView('dashboard')}
            className={`flex-1 h-full flex flex-col items-center justify-center text-xs font-semibold transition-colors cursor-pointer ${
              activeView === 'dashboard'
                ? 'text-[var(--primary)] bg-[var(--paper-dark)]/50 border-t-2 border-[var(--primary)]'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            <BookOpen className="w-4 h-4 mb-0.5" />
            <span>Ledger</span>
          </button>

          <button
            onClick={() => onChangeView('settings')}
            className={`flex-1 h-full flex flex-col items-center justify-center text-xs font-semibold transition-colors cursor-pointer ${
              activeView === 'settings'
                ? 'text-[var(--primary)] bg-[var(--paper-dark)]/50 border-t-2 border-[var(--primary)]'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            <Settings className="w-4 h-4 mb-0.5" />
            <span>Settings</span>
          </button>
        </div>
      </nav>
    </>
  );
};
