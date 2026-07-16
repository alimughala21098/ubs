import React from 'react';
import { fmtMoney, fmtDate, hoursSince, daysSince } from '../lib/format';
import { FOLLOWUP_STAGES, STUCK_DAYS } from '../lib/constants';

function lastLogDate(bid) {
  if (!bid.log || !bid.log.length) return null;
  const latest = bid.log.reduce((acc, l) => {
    const t = new Date(l.created_at).getTime();
    return isNaN(t) ? acc : Math.max(acc, t);
  }, 0);
  return latest ? new Date(latest).toISOString() : null;
}

export function needsFollowUp(bid) {
  if (!FOLLOWUP_STAGES.includes(bid.stage)) return false;
  const last = lastLogDate(bid);
  if (!last) return hoursSince(bid.date_submitted) > 24 && hoursSince(bid.last_activity) > 24;
  return hoursSince(last) > 24;
}

export function isStuck(bid) {
  if (bid.stage !== 'negotiation') return false;
  const last = lastLogDate(bid) || bid.last_activity || bid.date_submitted;
  return daysSince(last) >= STUCK_DAYS;
}

export default function BidCard({ bid, commission, onOpen, onDragStart, onDragEnd }) {
  const followup = needsFollowUp(bid);
  const stuck = isStuck(bid);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', bid.id);
        onDragStart(bid.id);
      }}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(bid.id)}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(bid.id);
        }
      }}
      className={
        'bg-surface2 border rounded-xl p-3 cursor-grab hover:shadow-panel transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ' +
        (bid.needs_escalation ? 'border-accent-light animate-pulse-accent' : 'border-border')
      }
    >
      <div className="flex justify-between items-start gap-2">
        <div className="text-sm font-semibold leading-snug text-white">{bid.job_title || 'Untitled job'}</div>
        <div className="flex gap-1 flex-shrink-0 mt-1">
          {bid.needs_escalation && (
            <span className="w-2 h-2 rounded-full bg-accent-light" title="Needs admin review" />
          )}
          {followup && <span className="w-2 h-2 rounded-full bg-danger" title="Needs follow-up — no log in 24h" />}
          {stuck && <span className="w-2 h-2 rounded-full bg-warning" title="Stuck in negotiation 5+ days" />}
        </div>
      </div>

      <div className="text-xs text-muted mt-1">
        {bid.client || 'Unknown client'}
        {bid.client_country ? ` · ${bid.client_country}` : ''}
        {bid.creator?.full_name ? ` · ${bid.creator.full_name}` : ''}
      </div>

      <div className="flex justify-between items-center mt-3 font-mono text-[11.5px]">
        <span className="text-accent-light font-semibold">
          {fmtMoney(bid.budget)}
          {bid.budget_type === 'Hourly' ? '/hr' : ''}
        </span>
        <span className="text-muted">{fmtDate(bid.date_submitted)}</span>
      </div>

      {(bid.needs_escalation || followup || bid.stage === 'won') && (
        <div className="flex gap-1.5 flex-wrap mt-2">
          {bid.needs_escalation && (
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-accent/15 text-accent-light">
              Needs review
            </span>
          )}
          {followup && (
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-danger/15 text-danger">
              Follow up
            </span>
          )}
          {bid.stage === 'won' && (
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-success/15 text-success">
              {fmtMoney(commission)} commission
            </span>
          )}
        </div>
      )}
    </div>
  );
}
