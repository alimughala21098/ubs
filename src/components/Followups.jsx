import React, { useMemo } from 'react';
import { STAGES } from '../lib/constants';
import { fmtMoney, fmtDate, daysSince } from '../lib/format';
import { needsFollowUp } from './BidCard';

export default function Followups({ bids, onOpenBid }) {
  const list = useMemo(
    () => bids.filter(needsFollowUp).sort((a, b) => daysSince(b.last_activity) - daysSince(a.last_activity)),
    [bids]
  );

  return (
    <div className="p-6 md:p-8 flex flex-col gap-5">
      <div>
        <h1 className="font-display text-xl font-semibold">Follow-ups</h1>
        <p className="text-xs text-muted mt-0.5">
          Bids in Replied, Interview, or Negotiation with no activity logged in the last 24 hours.
        </p>
      </div>

      {list.length === 0 ? (
        <div className="bg-surface border border-border rounded-2xl p-10 text-center text-sm text-muted">
          You're all caught up — nothing needs a follow-up right now.
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted uppercase tracking-wide text-[10.5px] font-mono border-b border-border">
                <th className="px-4 py-3">Job</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Bidder</th>
                <th className="px-4 py-3">Budget</th>
                <th className="px-4 py-3">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {list.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => onOpenBid(b.id)}
                  className="border-b border-border last:border-0 hover:bg-surface2 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-white max-w-xs truncate">{b.job_title || 'Untitled job'}</td>
                  <td className="px-4 py-3 text-muted">{b.client}</td>
                  <td className="px-4 py-3">
                    <span className="text-[10.5px] font-mono uppercase px-2 py-0.5 rounded bg-warning/15 text-warning">
                      {STAGES.find((s) => s.key === b.stage)?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{b.creator?.full_name || '—'}</td>
                  <td className="px-4 py-3 font-mono text-accent-light">
                    {fmtMoney(b.budget)}
                    {b.budget_type === 'Hourly' ? '/hr' : ''}
                  </td>
                  <td className="px-4 py-3 font-mono text-danger">
                    {Math.floor(daysSince(b.last_activity))}d ago ({fmtDate(b.last_activity)})
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
