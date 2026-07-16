import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function SettingsModal({ settings, onClose, onSave }) {
  const { isAdmin } = useAuth();
  const [form, setForm] = useState(settings);

  useEffect(() => setForm(settings), [settings]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      monthly_connects_cap: Number(form.monthly_connects_cap) || 0,
      probation_win_target: Math.max(Number(form.probation_win_target) || 1, 1),
      commission_rate_percent: Number(form.commission_rate_percent) || 0,
      escalation_budget_threshold: Number(form.escalation_budget_threshold) || 0
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-[100] flex items-start justify-center p-4 md:p-10 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-panel p-6 md:p-7">
        <div className="flex justify-between items-center mb-5">
          <h2 className="font-display text-xl font-semibold">Settings</h2>
          <button onClick={onClose} className="text-muted hover:text-danger text-xl leading-none p-1">
            ✕
          </button>
        </div>

        {!isAdmin && (
          <p className="text-xs text-warning bg-warning/10 border border-warning/30 rounded-lg px-3 py-2 mb-4">
            Only Ali or Rohaan can save changes here — you can still view current values.
          </p>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            <Field label="Probation win target">
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
            <Field label="Escalation budget threshold (USD)">
              <input
                type="number"
                min="0"
                value={form.escalation_budget_threshold}
                onChange={(e) => update('escalation_budget_threshold', e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold border border-border text-white/80 hover:border-white/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isAdmin}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-accent hover:bg-accent-light text-white disabled:opacity-50"
            >
              Save settings
            </button>
          </div>
        </form>
      </div>
    </div>
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
