import React from 'react';

export default function WinStamps({ wins, target }) {
  const t = Math.max(target || 1, 1);
  const stamps = Array.from({ length: t }, (_, i) => i < wins);

  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wide text-muted mb-2">Probation wins</div>
      <div className="flex gap-1.5 flex-wrap max-w-xs">
        {stamps.map((filled, i) => (
          <div
            key={i}
            title={filled ? `Win #${i + 1}` : 'Win pending'}
            className={
              'w-5 h-5 rounded-full flex items-center justify-center border ' +
              (filled
                ? 'bg-success border-success shadow-[0_0_0_3px_rgba(34,197,94,0.15)]'
                : 'border-border')
            }
          >
            {filled && (
              <svg width="9" height="9" viewBox="0 0 9 9">
                <path d="M1 4.5L3.3 7 8 1.5" stroke="#0F172A" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
