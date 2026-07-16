import React from 'react';
import ConnectsGauge from './ConnectsGauge';
import WinStamps from './WinStamps';
import { useAuth } from '../context/AuthContext';

export default function Header({ connectsUsed, settings, wonCount, view, onToggleView, onOpenSettings, onNewBid }) {
  const { profile, isAdmin, signOut } = useAuth();

  return (
    <header className="bg-bg border-b border-border px-6 md:px-8 py-5">
      <div className="flex justify-between items-start gap-6 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-accent-light flex items-center justify-center font-display font-bold text-accent-light flex-shrink-0">
            FT
          </div>
          <div>
            <h1 className="font-display font-semibold text-xl leading-tight">FAR Tech — Upwork Bid Pipeline</h1>
            <p className="text-[11px] font-mono text-muted uppercase tracking-wide mt-0.5">
              {isAdmin ? 'Viewing all bids' : 'Viewing your bids'}
              {profile ? ` · Signed in as ${profile.full_name} (${profile.role})` : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onToggleView}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-border text-white/90 hover:border-accent-light hover:text-accent-light transition-colors"
          >
            {view === 'board' ? 'Dashboard' : 'Board'}
          </button>
          <button
            onClick={onOpenSettings}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold border border-border text-white/90 hover:border-accent-light hover:text-accent-light transition-colors"
          >
            {isAdmin ? 'Settings & Team' : 'Settings'}
          </button>
          <button
            onClick={onNewBid}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-accent hover:bg-accent-light transition-colors text-white"
          >
            + Log New Bid
          </button>
          <button
            onClick={signOut}
            className="px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-danger transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      <div className="flex gap-8 mt-6 flex-wrap items-center">
        <ConnectsGauge used={connectsUsed} cap={Number(settings.monthly_connects_cap) || 0} />
        <WinStamps wins={wonCount} target={Number(settings.probation_win_target) || 1} />
      </div>
    </header>
  );
}
