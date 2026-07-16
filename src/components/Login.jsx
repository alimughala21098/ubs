import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      showToast(err.message || 'Something went wrong signing in.', 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl shadow-panel p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full border-2 border-accent-light flex items-center justify-center font-display font-bold text-accent-light">
            FT
          </div>
          <div>
            <h1 className="font-display font-semibold text-lg leading-tight">FAR Tech</h1>
            <p className="text-xs text-muted">Upwork Bid Pipeline</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">Email</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-surface2 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wide mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-surface2 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="mt-2 bg-accent hover:bg-accent-light transition-colors text-white font-semibold rounded-xl py-2.5 text-sm disabled:opacity-60"
          >
            {busy ? 'Please wait…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-xs text-muted text-center leading-relaxed">
          Accounts are created by an admin. If you don't have a login yet, ask your admin to add
          you from Settings → Team.
        </p>
      </div>
    </div>
  );
}
