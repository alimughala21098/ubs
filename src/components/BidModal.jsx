import React, { useEffect, useState } from 'react';
import { STAGES } from '../lib/constants';
import { fmtDateTime, fmtMoney, todayISO } from '../lib/format';
import { useAuth } from '../context/AuthContext';

const emptyForm = {
  job_title: '',
  job_link: '',
  client: '',
  client_country: '',
  client_rating: '',
  budget_type: 'Fixed',
  budget: '',
  connects_spent: 0,
  date_submitted: todayISO(),
  stage: 'lead',
  proposal_template: '',
  escalation_manual: false,
  notes: ''
};

export default function BidModal({ bid, settings, onClose, onSave, onDelete, onReviewDecision }) {
  const { profile, isAdmin } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [pendingLog, setPendingLog] = useState([]);
  const [logInput, setLogInput] = useState('');

  useEffect(() => {
    if (bid) {
      setForm({
        job_title: bid.job_title || '',
        job_link: bid.job_link || '',
        client: bid.client || '',
        client_country: bid.client_country || '',
        client_rating: bid.client_rating ?? '',
        budget_type: bid.budget_type || 'Fixed',
        budget: bid.budget ?? '',
        connects_spent: bid.connects_spent ?? 0,
        date_submitted: (bid.date_submitted || '').slice(0, 10) || todayISO(),
        stage: bid.stage || 'lead',
        proposal_template: bid.proposal_template || '',
        escalation_manual: !!bid.escalation_manual,
        notes: bid.notes || ''
      });
    } else {
      setForm(emptyForm);
    }
    setPendingLog([]);
    setLogInput('');
  }, [bid]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function addLogEntry() {
    const text = logInput.trim();
    if (!text) return;
    setPendingLog((p) => [...p, { author: profile?.full_name || 'Team', text, created_at: new Date().toISOString() }]);
    setLogInput('');
  }

  const combinedLog = [...(bid?.log || []), ...pendingLog].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );

  function handleSubmit(e) {
    e.preventDefault();
    const budget = Number(form.budget) || 0;
    const threshold = Number(settings.escalation_budget_threshold) || 0;
    const autoFlag = budget > 0 && budget < threshold;
    const needsEscalation = form.escalation_manual || autoFlag;
    // A decision (approved/declined) only applies to the review that earned it.
    // If the bid wasn't flagged before and now is, that's a new review — reset
    // to pending. If it was already flagged, leave whatever decision stands.
    const isFreshlyFlagged = needsEscalation && !bid?.needs_escalation;

    const payload = {
      job_title: form.job_title.trim(),
      job_link: form.job_link.trim(),
      client: form.client.trim(),
      client_country: form.client_country.trim(),
      client_rating: form.client_rating === '' ? null : Number(form.client_rating),
      budget_type: form.budget_type,
      budget,
      connects_spent: Number(form.connects_spent) || 0,
      date_submitted: form.date_submitted || todayISO(),
      stage: form.stage,
      proposal_template: form.proposal_template.trim(),
      escalation_manual: form.escalation_manual,
      needs_escalation: needsEscalation,
      notes: form.notes.trim(),
      pendingLog
    };
    if (isFreshlyFlagged) payload.escalation_status = 'pending';

    onSave(payload, { autoFlagged: autoFlag && !form.escalation_manual });
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[100] flex items-start justify-center p-4 md:p-10 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-surface border border-border rounded-2xl shadow-panel p-6 md:p-7">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-display text-xl font-semibold">{bid ? 'Edit bid' : 'Log new bid'}</h2>
          <button onClick={onClose} className="text-muted hover:text-danger text-xl leading-none p-1">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Job title" full>
              <input
                required
                value={form.job_title}
                onChange={(e) => update('job_title', e.target.value)}
                placeholder="e.g. Shopify store redesign"
                className={inputCls}
              />
            </Field>
            <Field label="Job link (Upwork URL)" full>
              <input
                value={form.job_link}
                onChange={(e) => update('job_link', e.target.value)}
                placeholder="https://www.upwork.com/jobs/..."
                className={inputCls}
              />
            </Field>
            <Field label="Client name">
              <input required value={form.client} onChange={(e) => update('client', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Client country">
              <input value={form.client_country} onChange={(e) => update('client_country', e.target.value)} className={inputCls} />
            </Field>
            <Field label="Client rating (0–5, optional)">
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={form.client_rating}
                onChange={(e) => update('client_rating', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Budget type">
              <select value={form.budget_type} onChange={(e) => update('budget_type', e.target.value)} className={inputCls}>
                <option value="Fixed">Fixed</option>
                <option value="Hourly">Hourly</option>
              </select>
            </Field>
            <Field label="Budget (USD)">
              <input
                required
                type="number"
                min="0"
                step="1"
                value={form.budget}
                onChange={(e) => update('budget', e.target.value)}
                className={inputCls + ' font-mono'}
              />
            </Field>
            <Field label="Connects spent">
              <input
                type="number"
                min="0"
                step="1"
                value={form.connects_spent}
                onChange={(e) => update('connects_spent', e.target.value)}
                className={inputCls + ' font-mono'}
              />
            </Field>
            <Field label="Date submitted">
              <input
                type="date"
                value={form.date_submitted}
                onChange={(e) => update('date_submitted', e.target.value)}
                className={inputCls + ' font-mono'}
              />
            </Field>
            <Field label="Stage">
              <select value={form.stage} onChange={(e) => update('stage', e.target.value)} className={inputCls}>
                {STAGES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Proposal template used" full>
              <input
                value={form.proposal_template}
                onChange={(e) => update('proposal_template', e.target.value)}
                placeholder="e.g. Template A — Discovery-first"
                className={inputCls}
              />
            </Field>

            <div className="md:col-span-2 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <input
                  id="needs-escalation"
                  type="checkbox"
                  checked={form.escalation_manual}
                  onChange={(e) => update('escalation_manual', e.target.checked)}
                  className="accent-accent"
                />
                <label htmlFor="needs-escalation" className="text-sm font-medium text-white">
                  Flag for admin review
                </label>
              </div>
              {Number(form.budget) > 0 && Number(form.budget) < (Number(settings.escalation_budget_threshold) || 0) && (
                <p className="text-[11px] text-accent-light pl-6">
                  Auto-flagged — budget is below the {fmtMoney(settings.escalation_budget_threshold)} threshold.
                  This clears on its own if the budget comes back up to or above it, unless you check the box above
                  too.
                </p>
              )}

              {bid?.needs_escalation && (
                <div className="pl-6 flex items-center gap-3 mt-1">
                  <StatusBadge status={bid.escalation_status} />
                  {isAdmin && (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => onReviewDecision(bid.id, 'approved')}
                        disabled={bid.escalation_status === 'approved'}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-success/15 text-success hover:bg-success/25 disabled:opacity-40 disabled:cursor-default"
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => onReviewDecision(bid.id, 'declined')}
                        disabled={bid.escalation_status === 'declined'}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-danger/15 text-danger hover:bg-danger/25 disabled:opacity-40 disabled:cursor-default"
                      >
                        Decline
                      </button>
                      {bid.escalation_status !== 'pending' && (
                        <button
                          type="button"
                          onClick={() => onReviewDecision(bid.id, 'pending')}
                          className="text-[11px] font-medium px-2.5 py-1 rounded-lg text-muted hover:text-white"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <Field label="Notes" full>
              <textarea
                value={form.notes}
                onChange={(e) => update('notes', e.target.value)}
                className={inputCls + ' min-h-[70px] resize-y'}
              />
            </Field>
          </div>

          <div>
            <label className={labelCls}>Communication log</label>
            <div className="flex gap-2 mb-2">
              <input
                value={logInput}
                onChange={(e) => setLogInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addLogEntry();
                  }
                }}
                placeholder="Add a log entry (e.g. Client replied asking for a call)"
                className={inputCls}
              />
              <button
                type="button"
                onClick={addLogEntry}
                className="px-3 rounded-xl border border-border text-sm font-semibold hover:border-accent-light hover:text-accent-light"
              >
                Add
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto flex flex-col gap-2">
              {combinedLog.length === 0 ? (
                <p className="text-xs text-muted">No log entries yet — add one when the client responds.</p>
              ) : (
                combinedLog.map((l, i) => (
                  <div key={i} className="bg-surface2 border border-border rounded-lg px-3 py-2 text-xs">
                    <div className="font-mono text-[10.5px] text-muted mb-1">
                      {fmtDateTime(l.created_at)} · {l.author || 'Team'}
                    </div>
                    {l.text}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-between items-center gap-3 pt-4 border-t border-border">
            <div>
              {bid && (
                <button
                  type="button"
                  onClick={() => onDelete(bid.id)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border border-danger text-danger hover:bg-danger/10"
                >
                  Delete bid
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-border text-white/80 hover:border-white/40"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-accent hover:bg-accent-light text-white"
              >
                Save bid
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls =
  'w-full bg-surface2 border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent';
const labelCls = 'block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5';

function Field({ label, children, full }) {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    pending: { text: 'Pending review', cls: 'bg-warning/15 text-warning' },
    approved: { text: 'Approved', cls: 'bg-success/15 text-success' },
    declined: { text: 'Declined', cls: 'bg-danger/15 text-danger' }
  };
  const s = map[status] || map.pending;
  return (
    <span className={'text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ' + s.cls}>
      {s.text}
    </span>
  );
}
