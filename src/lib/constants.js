// Pipeline stages, in fixed board order.
// Status color usage follows brand rule: green = won/paid-equivalent,
// amber = needs attention/pending, red = lost/danger. Everything else
// stays neutral so the accent blue reads as the one confident color.
export const STAGES = [
  { key: 'lead', label: 'Lead Identified', dot: 'bg-muted' },
  { key: 'submitted', label: 'Bid Submitted', dot: 'bg-accent' },
  { key: 'replied', label: 'Client Viewed/Replied', dot: 'bg-accent-light' },
  { key: 'interview', label: 'Interview/Call Scheduled', dot: 'bg-accent-light' },
  { key: 'negotiation', label: 'Negotiation', dot: 'bg-warning' },
  { key: 'won', label: 'Won', dot: 'bg-success' },
  { key: 'lost', label: 'Lost', dot: 'bg-danger' },
  { key: 'archived', label: 'Archived', dot: 'bg-muted' }
];

export const STAGE_INDEX = STAGES.reduce((acc, s, i) => {
  acc[s.key] = i;
  return acc;
}, {});

export const FOLLOWUP_STAGES = ['replied', 'interview', 'negotiation'];
export const STUCK_DAYS = 5;

export const DEFAULT_SETTINGS = {
  monthly_connects_cap: 500,
  probation_win_target: 5,
  commission_rate_percent: 10,
  escalation_budget_threshold: 2000
};
