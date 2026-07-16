import React, { useMemo, useState } from 'react';
import { STAGE_INDEX } from '../lib/constants';
import { fmtMoney, daysSince } from '../lib/format';
import { isStuck } from './BidCard';

export default function Dashboard({ bids, commissionFor, settings }) {
  const [range, setRange] = useState('30');

  const inRange = useMemo(() => {
    if (range === 'all') return bids;
    const days = Number(range);
    return bids.filter((b) => daysSince(b.date_submitted) <= days);
  }, [bids, range]);

  const submittedPlus = inRange.filter((b) => STAGE_INDEX[b.stage] >= 1);
  const repliedPlus = inRange.filter((b) => STAGE_INDEX[b.stage] >= 2);
  const interviewPlus = inRange.filter((b) => STAGE_INDEX[b.stage] >= 3);
  const won = inRange.filter((b) => b.stage === 'won');
  const lost = inRange.filter((b) => b.stage === 'lost');

  const responseRate = submittedPlus.length ? Math.round((repliedPlus.length / submittedPlus.length) * 100) : 0;
  const interviewRate = submittedPlus.length ? Math.round((interviewPlus.length / submittedPlus.length) * 100) : 0;
  const winRate = won.length + lost.length ? Math.round((won.length / (won.length + lost.length)) * 100) : 0;
  const totalWonValue = won.reduce((s, b) => s + (Number(b.budget) || 0), 0);
  const totalCommission = won.reduce((s, b) => s + commissionFor(b), 0);

  const sparkDays = range === 'all' ? 30 : Number(range);
  const buckets = useMemo(() => {
    const arr = [];
    const now = new Date();
    for (let i = sparkDays - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      arr.push({ key: d.toISOString().slice(0, 10), count: 0 });
    }
    const map = {};
    arr.forEach((b) => (map[b.key] = b));
    inRange.forEach((b) => {
      const key = (b.date_submitted || '').slice(0, 10);
      if (map[key]) map[key].count++;
    });
    return arr;
  }, [inRange, sparkDays]);
  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  const stuckList = bids.filter(isStuck);

  return (
    <div className="px-6 md:px-8 py-6">
      <div className="flex justify-between items-baseline flex-wrap gap-3 mb-5">
        <h2 className="font-display text-2xl font-semibold">Performance Dashboard</h2>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="bg-surface2 border border-border rounded-xl px-3 py-2 text-xs font-mono"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="all">All time</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Metric label="Bids sent" value={inRange.length} sub="in selected range" />
        <Metric label="Response rate" value={`${responseRate}%`} sub={`${repliedPlus.length} of ${submittedPlus.length} submitted`} />
        <Metric label="Interview conversion" value={`${interviewRate}%`} sub={`${interviewPlus.length} reached interview+`} />
        <Metric label="Win rate" value={`${winRate}%`} sub={`${won.length} won · ${lost.length} lost`} />
        <Metric label="Total won value" value={fmtMoney(totalWonValue)} sub={`${won.length} contracts signed`} accent />
        <Metric
          label="Probation earnings"
          value={fmtMoney(totalCommission)}
          sub={`${settings.commission_rate_percent}% commission rate`}
          accent
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="bg-surface border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-3">Bids sent (per day)</h3>
          <div className="flex items-end gap-[3px] h-14">
            {buckets.map((b, i) => (
              <div
                key={i}
                title={`${b.key}: ${b.count} bid(s)`}
                className="flex-1 bg-accent rounded-t-sm"
                style={{ height: `${Math.max((b.count / maxCount) * 100, 3)}%` }}
              />
            ))}
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold mb-3">Stuck in negotiation (5+ days)</h3>
          {stuckList.length === 0 ? (
            <p className="text-xs text-muted">Nothing stuck right now — negotiation stage is clear.</p>
          ) : (
            <div className="flex flex-col">
              {stuckList.map((b) => (
                <div key={b.id} className="flex justify-between items-center py-2 border-b border-border last:border-0 text-xs">
                  <span>
                    {b.job_title || 'Untitled'} · {b.client}
                  </span>
                  <span className="font-mono text-warning font-semibold">{Math.floor(daysSince(b.last_activity))}d</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, sub, accent }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 md:p-5">
      <div className="text-[10.5px] uppercase tracking-wide text-muted font-mono">{label}</div>
      <div className={`font-display text-3xl font-bold mt-1.5 ${accent ? 'text-accent-light' : 'text-white'}`}>{value}</div>
      <div className="text-xs text-muted mt-1">{sub}</div>
    </div>
  );
}
