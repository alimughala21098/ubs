import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { POSITIONS, POSITION_ROLE } from '../lib/constants';

const emptyForm = { full_name: '', email: '', password: '', position: 'Upwork Bidder (Probation)' };

const AVATAR_COLORS = ['#6D5DFB', '#F59E0B', '#22C55E', '#EC4899', '#06B6D4', '#EF4444'];
function avatarColor(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function initials(name) {
  return (name || '?')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
}
function randomPassword() {
  return Math.random().toString(36).slice(-6) + Math.random().toString(36).toUpperCase().slice(-4) + '!1';
}

export default function EmployeeManager() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savedCreds, setSavedCreds] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editPosition, setEditPosition] = useState('');

  const load = React.useCallback(async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
      if (error) throw error;
      setProfiles(data || []);
    } catch (e) {
      showToast("Couldn't load the team list.", 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('profiles-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => load())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [load]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function callManageEmployee(body) {
    const { data, error } = await supabase.functions.invoke('manage-employee', { body });
    if (error) {
      let msg = error.message || 'Request failed.';
      if (error.context && typeof error.context.json === 'function') {
        try {
          const parsed = await error.context.json();
          if (parsed?.error) msg = parsed.error;
        } catch (_) {
          /* not JSON, keep generic message */
        }
      }
      throw new Error(msg);
    }
    if (data?.ok === false) throw new Error(data.error || 'Request failed.');
    return data;
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim() || !form.password) {
      showToast('Full name, email, and password are required.', 'error');
      return;
    }
    setBusy(true);
    try {
      await callManageEmployee({
        action: 'create',
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        position: form.position,
        role: POSITION_ROLE[form.position] || 'bidder'
      });
      showToast(`Account created for ${form.full_name.trim()}. They can sign in now.`);
      setSavedCreds({ name: form.full_name.trim(), email: form.email.trim(), password: form.password });
      setForm(emptyForm);
      setShowPassword(false);
      load();
    } catch (err) {
      showToast(err.message || 'Could not create the account.', 'error');
    } finally {
      setBusy(false);
    }
  }

  function startEdit(profile) {
    setEditingId(profile.id);
    setEditPosition(profile.position || 'Upwork Bidder (Probation)');
  }

  async function saveEdit(profile) {
    try {
      await callManageEmployee({
        action: 'update_position',
        user_id: profile.id,
        position: editPosition,
        role: POSITION_ROLE[editPosition] || 'bidder'
      });
      showToast(`${profile.full_name} is now ${editPosition}.`);
      setEditingId(null);
      load();
    } catch (err) {
      showToast(err.message || 'Could not update position.', 'error');
    }
  }

  async function handleResetPassword(profile) {
    const newPassword = window.prompt(`New password for ${profile.full_name} (min 6 characters):`);
    if (!newPassword) return;
    try {
      await callManageEmployee({ action: 'reset_password', user_id: profile.id, password: newPassword });
      showToast(`Password reset for ${profile.full_name}. Share it with them directly — it won't be shown again.`);
    } catch (err) {
      showToast(err.message || 'Could not reset password.', 'error');
    }
  }

  async function handleRemove(profile) {
    if (
      !window.confirm(
        `Remove ${profile.full_name}'s account? They'll be signed out immediately. Their past bids stay on the board.`
      )
    ) {
      return;
    }
    try {
      await callManageEmployee({ action: 'delete', user_id: profile.id });
      showToast(`${profile.full_name}'s account was removed.`);
      load();
    } catch (err) {
      showToast(err.message || 'Could not remove the account.', 'error');
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-6">
      {/* Add New Employee */}
      <div className="bg-surface2/60 border border-border rounded-2xl p-5">
        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
          <span className="text-accent-light">＋</span> Add New Employee
        </h3>
        <p className="text-xs text-muted mb-4">Creates a login instantly — no email confirmation needed.</p>

        <form onSubmit={handleCreate} className="flex flex-col gap-3.5">
          <div>
            <label className={labelCls}>Full Name *</label>
            <input
              placeholder="e.g. Bilal Ahmed"
              value={form.full_name}
              onChange={(e) => update('full_name', e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Position *</label>
            <select value={form.position} onChange={(e) => update('position', e.target.value)} className={inputCls}>
              {POSITIONS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.key}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Login Email *</label>
            <input
              type="email"
              placeholder="name@fartechdev.com"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Password *</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  className={inputCls + ' pr-9'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-white text-xs"
                >
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
              <button
                type="button"
                onClick={() => update('password', randomPassword())}
                className="px-3 rounded-xl border border-border text-xs font-semibold text-muted hover:border-accent-light hover:text-accent-light whitespace-nowrap"
              >
                Generate
              </button>
            </div>
            <p className="text-[10.5px] text-muted mt-1">
              Shown once right after creation — not stored anywhere retrievable. Use "Reset password" later if
              needed.
            </p>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="mt-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-accent hover:bg-accent-light transition-colors text-white disabled:opacity-60"
          >
            {busy ? 'Creating…' : 'Add Employee'}
          </button>
        </form>

        {savedCreds && (
          <div className="mt-4 text-xs bg-success/10 border border-success/30 rounded-xl px-3 py-3">
            <div className="flex justify-between items-start gap-3">
              <div>
                <div className="font-semibold text-white mb-1">
                  {savedCreds.name} can sign in now — share these once:
                </div>
                <div className="font-mono text-[11px]">{savedCreds.email}</div>
                <div className="font-mono text-[11px]">{savedCreds.password}</div>
              </div>
              <button type="button" onClick={() => setSavedCreds(null)} className="text-muted hover:text-white flex-shrink-0">
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Current Team */}
      <div className="bg-surface2/60 border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Current Team</h3>
          <span className="text-[10.5px] font-mono text-muted uppercase tracking-wide">{profiles.length} members</span>
        </div>

        {loading ? (
          <p className="text-xs text-muted">Loading team…</p>
        ) : (
          <div className="flex flex-col gap-2 max-h-[520px] overflow-y-auto pr-1">
            {profiles.map((p) => {
              const isSelf = p.id === user?.id;
              const isEditing = editingId === p.id;
              return (
                <div key={p.id} className="bg-surface border border-border rounded-xl px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: avatarColor(p.full_name || p.id) }}
                      >
                        {initials(p.full_name)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {p.full_name}
                          {isSelf && <span className="text-muted font-normal"> (you)</span>}
                        </div>
                        <div className="text-[11px] text-muted truncate">{p.email}</div>
                        <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-accent/15 text-accent-light">
                          {p.position || (p.role === 'admin' ? 'Admin' : 'Bidder')}
                        </span>
                      </div>
                    </div>

                    {!isSelf && !isEditing && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          title="Change position"
                          onClick={() => startEdit(p)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-accent-light hover:bg-accent/10"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          title="Reset password"
                          onClick={() => handleResetPassword(p)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-accent-light hover:bg-accent/10"
                        >
                          ⟳
                        </button>
                        <button
                          type="button"
                          title="Remove"
                          onClick={() => handleRemove(p)}
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-danger hover:bg-danger/10"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing && (
                    <div className="flex items-center gap-2 mt-3 pl-12">
                      <select
                        value={editPosition}
                        onChange={(e) => setEditPosition(e.target.value)}
                        className="flex-1 bg-surface2 border border-border rounded-lg px-2 py-1.5 text-xs"
                      >
                        {POSITIONS.map((pos) => (
                          <option key={pos.key} value={pos.key}>
                            {pos.key}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => saveEdit(p)}
                        className="text-xs font-semibold text-white bg-accent hover:bg-accent-light rounded-lg px-3 py-1.5"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-xs font-medium text-muted hover:text-white px-2"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls =
  'w-full bg-surface2 border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent';
const labelCls = 'block text-xs font-semibold text-muted uppercase tracking-wide mb-1';
