import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import EmployeeManager from './EmployeeManager';

export default function SettingsPage({ settings, onSave }) {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState(isAdmin ? 'team' : 'general');
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => setForm(settings), [settings]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = await onSave({
      monthly_connects_cap: Number(form.monthly_connects_cap) || 0,
      probation_win_target: Math.max(Number(form.probation_win_target) || 1, 1),
      commission_rate_percent: Number(form.commission_rate_percent) || 0,
      escalation_budget_threshold: Number(form.escalation_budget_threshold) || 0
    });
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="p-6 md:p-8 flex flex-col gap-5 max-w-5xl">
      <div>
        <h1 className="font-display text-xl font-semibold">Settings</h1>
        <p className="text-xs text-muted mt-0.5">
          {isAdmin ? 'Add or edit team members and assign CRM login credentials.' : 'View pipeline configuration.'}
        </p>
      </div>

      {isAdmin && (
        <div className="flex gap-1 border border-border rounded-xl p-1 w-fit">
          <TabButton active={tab === 'team'} onClick={() => setTab('team')}>
            👤 Employee Management
          </TabButton>
          <TabButton active={tab === 'general'} onClick={() => setTab('general')}>
            ⚙ General Config
          </TabButton>
        </div>
      )}

      {!isAdmin && (
        <p className="text-xs text-warning bg-warning/10 border border-warning/30 rounded-lg px-3 py-2">
          Only an admin can save changes here — you can still view current values.
        </p>
      )}

      {tab === 'team' && isAdmin ? (
        <div className="bg-surface border border-border rounded-2xl p-5 md:p-6">
          <h2 className="text-base font-semibold mb-0.5">Employee Management</h2>
          <p className="text-xs text-muted mb-5">Add or edit team members and assign CRM login credentials.</p>
          <EmployeeManager />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-5 md:p-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Monthly connects cap">
              <input
                type="number"
                min="0"
                value={form.monthly_connects_cap}
                onChange={(e) => update('monthly_connects_cap', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Monthly / probation win target">
              <input
                type="number"
                min="1"
                value={form.probation_win_target}
                onChange={(e) => update('probation_win_target', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Commission rate (%)">
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.commission_rate_percent}
                onChange={(e) => update('commission_rate_percent', e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Escalation budget threshold (USD) — flags bids below this">
              <input
                type="number"
                min="0"
                value={form.escalation_budget_threshold}
                onChange={(e) => update('escalation_budget_threshold', e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="flex justify-end items-center gap-3 pt-4 border-t border-border">
            {saved && <span className="text-xs text-success">Saved.</span>}
            <button
              type="submit"
              disabled={!isAdmin}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-accent hover:bg-accent-light text-white disabled:opacity-50"
            >
              Save settings
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ' +
        (active ? 'bg-accent text-white' : 'text-muted hover:text-white')
      }
    >
      {children}
    </button>
  );
}

const inputCls =
  'w-full bg-surface2 border border-border rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-accent';

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  );
}
