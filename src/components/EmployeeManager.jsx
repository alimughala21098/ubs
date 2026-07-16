import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const emptyForm = { full_name: '', email: '', password: '', role: 'bidder' };

function randomPassword() {
  return Math.random().toString(36).slice(-6) + Math.random().toString(36).toUpperCase().slice(-4) + '!1';
}

export default function EmployeeManager() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [savedPassword, setSavedPassword] = useState(null);

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
      // Try to surface the function's own error message when available
      const msg = data?.error || error.message || 'Request failed.';
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
        role: form.role
      });
      showToast(`Account created for ${form.full_name.trim()}. They can sign in now.`);
      setSavedPassword({ email: form.email.trim(), password: form.password });
      setForm(emptyForm);
      load();
    } catch (err) {
      showToast(err.message || 'Could not create the account.', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleRoleChange(profile, role) {
    if (role === profile.role) return;
    try {
      await callManageEmployee({ action: 'update_role', user_id: profile.id, role });
      showToast(`${profile.full_name} is now ${role === 'admin' ? 'an admin' : 'a bidder'}.`);
      load();
    } catch (err) {
      showToast(err.message || 'Could not update role.', 'error');
    }
  }

  async function handleRemove(profile) {
    if (!window.confirm(`Remove ${profile.full_name}'s account? They'll be signed out immediately. Their past bids stay on the board.`)) {
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
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="text-sm font-semibold mb-1">Add a teammate</h3>
        <p className="text-xs text-muted mb-3">
          Creates a login instantly — no email confirmation needed. Share the email/password with
          them directly.
        </p>
        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            placeholder="Full name"
            value={form.full_name}
            onChange={(e) => update('full_name', e.target.value)}
            className={inputCls}
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
            className={inputCls}
          />
          <div className="flex gap-2">
            <input
              placeholder="Password (min 6 chars)"
              value={form.password}
              onChange={(e) => update('password', e.target.value)}
              className={inputCls}
            />
            <button
              type="button"
              onClick={() => update('password', randomPassword())}
              className="px-3 rounded-xl border border-border text-xs font-semibold text-muted hover:border-accent-light hover:text-accent-light whitespace-nowrap"
            >
              Generate
            </button>
          </div>
          <select value={form.role} onChange={(e) => update('role', e.target.value)} className={inputCls}>
            <option value="bidder">Bidder</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="submit"
            disabled={busy}
            className="md:col-span-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-accent hover:bg-accent-light transition-colors text-white disabled:opacity-60"
          >
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>

        {savedPassword && (
          <div className="mt-3 text-xs bg-success/10 border border-success/30 rounded-lg px-3 py-2 flex justify-between items-center gap-3">
            <span>
              Created <strong>{savedPassword.email}</strong> — password: <strong>{savedPassword.password}</strong>
            </span>
            <button
              type="button"
              onClick={() => setSavedPassword(null)}
              className="text-muted hover:text-white flex-shrink-0"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold mb-3">Team ({profiles.length})</h3>
        {loading ? (
          <p className="text-xs text-muted">Loading team…</p>
        ) : (
          <div className="flex flex-col gap-2">
            {profiles.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 bg-surface2 border border-border rounded-xl px-3 py-2.5"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {p.full_name}
                    {p.id === user?.id && <span className="text-muted font-normal"> (you)</span>}
                  </div>
                  <div className="text-[11px] text-muted font-mono truncate">{p.email}</div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <select
                    value={p.role}
                    disabled={p.id === user?.id}
                    onChange={(e) => handleRoleChange(p, e.target.value)}
                    className="bg-surface border border-border rounded-lg px-2 py-1.5 text-xs disabled:opacity-50"
                  >
                    <option value="bidder">Bidder</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    type="button"
                    disabled={p.id === user?.id}
                    onClick={() => handleRemove(p)}
                    className="text-xs font-semibold text-danger hover:bg-danger/10 rounded-lg px-2 py-1.5 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const inputCls =
  'w-full bg-surface2 border border-border rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent';
