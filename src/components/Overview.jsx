import React, { useMemo } from 'react';
import { STAGE_INDEX, STAGES, isProbationPosition } from '../lib/constants';
import { fmtMoney, fmtDate, daysSince, currentMonthKey } from '../lib/format';
import { needsFollowUp, isStuck } from './BidCard';
import { useAuth } from '../context/AuthContext';
import ConnectsGauge from './ConnectsGauge';
import WinStamps from './WinStamps';

export default function Overview({ bids, settings, onOpenBid }) {
  const { isAdmin, profile } = useAuth();

  const connectsUsed = useMemo(() => {
    const mk = currentMonthKey();
    return bids.reduce((sum, b) => {
      const submittedKey = b.date_submitted ? b.date_submitted.slice(0, 7) : null;
      return sum + (submittedKey === mk ? Number(b.connects_spent) || 0 : 0);
    }, 0);
  }, [bids]);

  const active = bids.filter((b) => !['won', 'lost', 'archived'].includes(b.stage));
  const conversations = bids.filter((b) => ['replied', 'interview', 'negotiation'].includes(b.stage));
  const callsBooked = bids.filter((b) => STAGE_INDEX[b.stage] >= STAGE_INDEX.interview && b.stage !== 'lost').length;
  const won = bids.filter((b) => b.stage === 'won');
  const qualified = bids.filter((b) => STAGE_INDEX[b.stage] >= STAGE_INDEX.replied).length;
  const proposalsSent = bids.filter((b) => STAGE_INDEX[b.stage] >= STAGE_INDEX.submitted).length;

  const pipelineValue = active.reduce((s, b) => s + (Number(b.budget) || 0), 0);
  const revenueWon = won.reduce((s, b) => s + (Number(b.budget) || 0), 0);

  const followUps = useMemo(
    () => bids.filter(needsFollowUp).sort((a, b) => daysSince(b.last_activity) - daysSince(a.last_activity)),
    [bids]
  );
  const stuckBids = useMemo(
    () => bids.filter(isStuck).sort((a, b) => daysSince(b.last_activity) - daysSince(a.last_activity)),
    [bids]
  );

  const byBudgetType = useMemo(() => {
    const map = { Fixed: 0, Hourly: 0 };
    bids.forEach((b) => {
      map[b.budget_type] = (map[b.budget_type] || 0) + 1;
    });
    return map;
  }, [bids]);

  const recent = [...bids].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 6);

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl font-semibold">Dashboard</h1>
        <p className="text-xs text-muted mt-0.5">
          FAR Tech &amp; Developers — {isAdmin ? 'Bid pipeline overview' : 'Your bid pipeline'}
        </p>
      </div>

      {!isAdmin && (
        <div className="bg-surface border border-border rounded-2xl p-5 flex flex-wrap gap-8">
          <ConnectsGauge used={connectsUsed} cap={Number(settings.monthly_connects_cap) || 0} />
          <WinStamps
            wins={bids.filter((b) => b.stage === 'won').length}
            target={Number(settings.probation_win_target) || 1}
            label={isProbationPosition(profile?.position) ? 'Probation wins' : 'Monthly target'}
          />
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Total Bids" value={bids.length} />
        <Kpi label="Active Conversations" value={conversations.length} />
        <Kpi label="Calls Booked" value={callsBooked} />
        <Kpi label="Deals Won" value={won.length} accent="success" />
        <Kpi label="Qualified" value={qualified} />
        <Kpi label="Proposals Sent" value={proposalsSent} />
        <Kpi label="Pipeline Value" value={fmtMoney(pipelineValue)} accent="accent" />
        <Kpi label="Revenue Won" value={fmtMoney(revenueWon)} accent="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <AlertList
          title="Follow-ups Today"
          count={followUps.length}
          badgeColor="bg-warning"
          items={followUps}
          emptyText="Nothing needs a follow-up right now."
          onOpenBid={onOpenBid}
        />
        <AlertList
          title="Stuck in Negotiation (5+ days)"
          count={stuckBids.length}
          badgeColor="bg-danger"
          items={stuckBids}
          emptyText="No stalled negotiations."
          onOpenBid={onOpenBid}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-surface border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-3">Pipeline by Budget Type</h3>
          <div className="flex flex-col gap-3">
            {Object.entries(byBudgetType).map(([type, count]) => (
              <div key={type}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white font-medium">{type}</span>
                  <span className="text-muted font-mono">{count}</span>
                </div>
                <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${bids.length ? (count / bids.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-3">Recent Bids</h3>
          <div className="flex flex-col gap-2">
            {recent.length === 0 && <p className="text-xs text-muted">No bids logged yet.</p>}
            {recent.map((b) => (
              <button
                key={b.id}
                onClick={() => onOpenBid(b.id)}
                className="flex justify-between items-center text-left px-2.5 py-2 rounded-lg hover:bg-surface2 transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-xs font-medium text-white truncate">{b.job_title || 'Untitled job'}</div>
                  <div className="text-[10.5px] text-muted truncate">
                    {b.client} · {STAGES.find((s) => s.key === b.stage)?.label}
                  </div>
                </div>
                <span className="text-[10.5px] font-mono text-muted flex-shrink-0 ml-2">{fmtDate(b.date_submitted)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, accent }) {
  const color = accent === 'success' ? 'text-success' : accent === 'accent' ? 'text-accent-light' : 'text-white';
  return (
    <div className="bg-surface border border-border rounded-2xl p-4">
      <div className="text-[10.5px] uppercase tracking-wide text-muted mb-1.5">{label}</div>
      <div className={'font-display text-2xl font-semibold ' + color}>{value}</div>
    </div>
  );
}

function AlertList({ title, count, badgeColor, items, emptyText, onOpenBid }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {count > 0 && (
          <span className={'text-[10px] font-bold text-white rounded-full w-5 h-5 flex items-center justify-center ' + badgeColor}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-muted">{emptyText}</p>
      ) : (
        <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
          {items.map((b) => (
            <button
              key={b.id}
              onClick={() => onOpenBid(b.id)}
              className="flex justify-between items-center text-left px-2.5 py-2 rounded-lg hover:bg-surface2 transition-colors"
            >
              <div className="min-w-0">
                <div className="text-xs font-medium text-white truncate">{b.job_title || 'Untitled job'}</div>
                <div className="text-[10.5px] text-muted truncate">
                  {b.client}
                  {b.creator?.full_name ? ` · ${b.creator.full_name}` : ''}
                </div>
              </div>
              <span className="text-[10.5px] font-mono text-muted flex-shrink-0 ml-2">
                {Math.floor(daysSince(b.last_activity))}d
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
