import React, { useState } from 'react';
import { KirayaData, AppTheme } from '../types';
import { Zap, Search, Sun, Sparkles, Plus, Home, BookOpen, BarChart3, Settings as SettingsIcon, X } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface MastheadProps {
  data: KirayaData;
  theme: AppTheme;
  activeView: 'dashboard' | 'settings' | 'analytics';
  onChangeView: (view: 'dashboard' | 'settings' | 'analytics') => void;
  onToggleTheme: () => void;
  onOpenRateEditor: () => void;
  onOpenAddRoom: () => void;
  onOpenAddEntry?: () => void;
  onOpenAutoGenerateModal?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Masthead: React.FC<MastheadProps> = ({
  data,
  theme,
  activeView,
  onChangeView,
  onToggleTheme,
  onOpenRateEditor,
  onOpenAddRoom,
  onOpenAddEntry,
  onOpenAutoGenerateModal,
  searchQuery,
  onSearchChange,
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const isPurpleBlue = theme === 'purple-blue';

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line-strong)] bg-[var(--card)]/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        
        {/* Top Navbar Row */}
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Left: Brand Logo & Desktop Nav Tabs */}
          <div className="flex items-center gap-6">
            <BrandLogo size="md" showText={true} tagline={true} />

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 bg-[var(--paper-dark)] p-1 rounded-xl border border-[var(--line)]">
              <button
                onClick={() => onChangeView('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'dashboard'
                    ? 'bg-[var(--card)] text-[var(--primary)] shadow-sm'
                    : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Ledger</span>
              </button>

              <button
                onClick={() => onChangeView('settings')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'settings'
                    ? 'bg-[var(--card)] text-[var(--primary)] shadow-sm'
                    : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                }`}
              >
                <SettingsIcon className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>
            </nav>
          </div>

          {/* Right: Actions & Theme Switcher */}
          <div className="flex items-center gap-2">
            
            {/* Electricity Rate Quick Button */}
            <button
              onClick={onOpenRateEditor}
              title="Click to edit default Electricity Tariff (₹/unit)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono font-medium bg-[var(--paper-dark)] border border-[var(--line-strong)] text-[var(--ink)] hover:border-[var(--primary)] transition-all cursor-pointer shadow-2xs"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="hidden sm:inline text-[var(--ink-soft)]">Tariff:</span>
              <span className="font-bold">₹{data.rate}</span>
              <span className="text-[10px] text-[var(--ink-soft)] hidden lg:inline">/unit</span>
            </button>

            {/* Auto-Generate Next Month Quick Action */}
            {onOpenAutoGenerateModal && data.rooms.length > 0 && (
              <button
                onClick={onOpenAutoGenerateModal}
                title="Auto-roll next month bills for all rooms"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/10 border border-indigo-500/30 text-[var(--primary)] hover:bg-indigo-500/20 transition-all cursor-pointer shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Auto-Roll Month</span>
                <span className="md:hidden">Auto</span>
              </button>
            )}

            {/* Quick Add Room (Desktop) */}
            <button
              onClick={onOpenAddRoom}
              title="Add a new rental room"
              className="hidden lg:flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--paper-dark)] border border-[var(--line-strong)] text-[var(--ink)] hover:border-[var(--primary)] transition-all cursor-pointer shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>+ Room</span>
            </button>

            {/* Quick Add Bill Entry (Desktop) */}
            {onOpenAddEntry && data.rooms.length > 0 && (
              <button
                onClick={onOpenAddEntry}
                title="Add new monthly bill entry"
                className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white transition-all cursor-pointer shadow-sm active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Bill Entry</span>
              </button>
            )}

            {/* Search Toggle */}
            <button
              onClick={() => setShowSearch(prev => !prev)}
              title="Search entries & tenants"
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                showSearch || searchQuery
                  ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                  : 'bg-[var(--paper-dark)] border-[var(--line-strong)] text-[var(--ink)] hover:bg-[var(--paper-darker)]'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              title={isPurpleBlue ? "Switch to Light theme" : "Switch to Purple/Blue Vibrant theme"}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shadow-2xs ${
                isPurpleBlue
                  ? 'bg-purple-950/60 text-purple-200 border-purple-500/40 hover:border-purple-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-400'
              }`}
            >
              {isPurpleBlue ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  <span className="hidden sm:inline text-[11px]">Night</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden sm:inline text-[11px]">Light</span>
                </>
              )}
            </button>

          </div>

        </div>

        {/* Search Bar Tray */}
        {(showSearch || searchQuery) && (
          <div className="py-2.5 border-t border-dashed border-[var(--line-strong)] animate-fadeIn">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 absolute left-3 text-[var(--ink-soft)] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search by tenant name, mobile, month (e.g. August 2026), or note..."
                className="w-full pl-9 pr-8 py-2 bg-[var(--paper-dark)] border border-[var(--line-strong)] rounded-xl text-xs text-[var(--ink)] placeholder-[var(--ink-faint)] focus:outline-none focus:border-[var(--primary)] font-mono transition-colors"
                autoFocus
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 p-1 text-[var(--ink-soft)] hover:text-[var(--ink)] cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </header>
  );
};
