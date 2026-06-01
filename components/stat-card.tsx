import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: {
    value: string | number;
    isPositive: boolean; // true = up, false = down
  };
  color?: 'sky' | 'indigo' | 'emerald' | 'amber' | 'rose';
}

export default function StatCard({
  title,
  value,
  icon,
  description,
  trend,
  color = 'sky',
}: StatCardProps) {
  const colorMap = {
    sky: {
      bg: 'bg-sky-500/10 dark:bg-sky-500/20',
      icon: 'text-sky-500',
      border: 'hover:border-sky-500/50',
    },
    indigo: {
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
      icon: 'text-indigo-500',
      border: 'hover:border-indigo-500/50',
    },
    emerald: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
      icon: 'text-emerald-500',
      border: 'hover:border-emerald-500/50',
    },
    amber: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20',
      icon: 'text-amber-500',
      border: 'hover:border-amber-500/50',
    },
    rose: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/20',
      icon: 'text-rose-500',
      border: 'hover:border-rose-500/50',
    },
  };

  const selectedColor = colorMap[color];

  return (
    <div className={`p-6 rounded-2xl glass-panel shadow-sm hover-card border border-[var(--border-color)] flex flex-col justify-between ${selectedColor.border} animate-fade-in`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--text-secondary)] tracking-wider uppercase">
          {title}
        </span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedColor.bg} ${selectedColor.icon}`}>
          {icon}
        </div>
      </div>
      
      <div className="mt-4">
        <h3 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">
          {value}
        </h3>
        
        {(description || trend) && (
          <div className="mt-2 flex items-center gap-2">
            {trend && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                trend.isPositive 
                  ? 'bg-rose-500/15 text-rose-500' 
                  : 'bg-emerald-500/15 text-emerald-500'
              }`}>
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </span>
            )}
            {description && (
              <span className="text-xs text-[var(--text-tertiary)]">
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
