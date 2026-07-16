import React, { useEffect, useState } from 'react';
import { STAGES } from '../lib/constants';
import { fmtDateTime, todayISO } from '../lib/format';
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
  needs_escalation: false,
  notes: ''
};

export default function BidModal({ bid, settings, onClose, onSave, onDelete }) {
  const { profile } = useAuth();
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
        needs_escalation: !!bid.needs_escalation,
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
    const autoFlag = budget > threshold;

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
      needs_escalation: form.needs_escalation || autoFlag,
      notes: form.notes.trim(),
      pendingLog
    };

    onSave(payload, { autoFlagged: autoFlag && !form.needs_escalation });
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

            <div className="md:col-span-2 flex items-center gap-2">
              <input
                id="needs-escalation"
                type="checkbox"
                checked={form.needs_escalation}
                onChange={(e) => update('needs_escalation', e.target.checked)}
                className="accent-accent"
              />
              <label htmlFor="needs-escalation" className="text-sm font-medium text-white">
                Needs admin review
              </label>
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
