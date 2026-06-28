import React from 'react';
import { LayoutDashboard, Sun, Moon, ShieldAlert } from 'lucide-react';

interface SidebarProps {
  isDark: boolean;
  toggleTheme: () => void;
}

export default function Sidebar({ isDark, toggleTheme }: SidebarProps) {
  return (
    <aside className="w-64 glass-panel border-r shrink-0 flex flex-col h-screen sticky top-0 transition-all duration-300">
      {/* Brand Header */}
      <div className="p-6 border-b border-[var(--border-color)] flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-500">
          <ShieldAlert size={22} className="animate-pulse" />
        </div>
        <div>
          <h1 className="font-bold text-lg leading-tight tracking-tight text-[var(--text-primary)]">
            Malaria Analytics
          </h1>
          <span className="text-xs font-semibold text-teal-500 tracking-wider uppercase">
            SVM AI Predictor
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        <button
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all bg-teal-500 text-white shadow-md shadow-teal-500/10"
        >
          <LayoutDashboard size={18} />
          <span>Dashboard Historis</span>
        </button>
      </nav>

      {/* Footer Settings & Theme Switcher */}
      <div className="p-4 border-t border-[var(--border-color)] space-y-4">
        <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-tertiary)]">
          <div className="flex items-center gap-2">
            {isDark ? (
              <Moon size={16} className="text-teal-400" />
            ) : (
              <Sun size={16} className="text-amber-500" />
            )}
            <span className="text-xs font-medium text-[var(--text-secondary)]">
              {isDark ? 'Dark Mode' : 'Light Mode'}
            </span>
          </div>
          <button
            onClick={toggleTheme}
            className="w-10 h-6 bg-teal-500/10 border border-teal-500/20 rounded-full p-0.5 relative transition-colors cursor-pointer"
            aria-label="Toggle theme"
          >
            <div
              className={`w-4.5 h-4.5 rounded-full bg-teal-500 shadow-sm transition-transform duration-300 ${
                isDark ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div className="text-center">
          <p className="text-[10px] text-[var(--text-tertiary)]">
            Malaria AI Dashboard v1.2.0
          </p>
        </div>
      </div>
    </aside>
  );
}
