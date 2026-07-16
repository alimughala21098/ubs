import React, { useMemo, useState } from 'react';
import { ToastProvider, useToast } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useBids } from './hooks/useBids';
import { useSettings } from './hooks/useSettings';
import { currentMonthKey } from './lib/format';
import Login from './components/Login';
import Header from './components/Header';
import FilterBar from './components/FilterBar';
import Board from './components/Board';
import Dashboard from './components/Dashboard';
import BidModal from './components/BidModal';
import SettingsModal from './components/SettingsModal';

function Shell() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const { bids, createBid, updateBid, deleteBid, moveStage } = useBids();
  const { settings, saveSettings } = useSettings();

  const [view, setView] = useState('board');
  const [filters, setFilters] = useState({ text: '', country: '', bidder: '', needsReview: false });
  const [modalBidId, setModalBidId] = useState(undefined); // undefined = closed, null = new, id = edit
  const [settingsOpen, setSettingsOpen] = useState(false);

  const commissionFor = (bid) => (Number(bid.budget) || 0) * (Number(settings.commission_rate_percent) || 0) / 100;

  const connectsUsed = useMemo(() => {
    const mk = currentMonthKey();
    return bids.reduce((sum, b) => {
      const submittedKey = b.date_submitted ? b.date_submitted.slice(0, 7) : null;
      return sum + (submittedKey === mk ? Number(b.connects_spent) || 0 : 0);
    }, 0);
  }, [bids]);

  const wonCount = bids.filter((b) => b.stage === 'won').length;

  const countries = useMemo(
    () => Array.from(new Set(bids.map((b) => b.client_country).filter(Boolean))).sort(),
    [bids]
  );

  const bidders = useMemo(
    () => Array.from(new Set(bids.map((b) => b.creator?.full_name).filter(Boolean))).sort(),
    [bids]
  );

  const filteredBids = useMemo(() => {
    const q = filters.text.trim().toLowerCase();
    return bids.filter((b) => {
      if (q) {
        const hay = `${b.job_title || ''} ${b.client || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.country && b.client_country !== filters.country) return false;
      if (filters.bidder && b.creator?.full_name !== filters.bidder) return false;
      if (filters.needsReview && !b.needs_escalation) return false;
      return true;
    });
  }, [bids, filters]);

  const activeModalBid = modalBidId ? bids.find((b) => b.id === modalBidId) : null;

  async function handleSaveBid(payload, meta) {
    let ok;
    if (activeModalBid) {
      ok = await updateBid(activeModalBid.id, payload);
    } else {
      ok = await createBid(payload, user?.id);
    }
    if (ok && meta?.autoFlagged) {
      showToast('Budget exceeds the escalation threshold — flagged for admin review.');
    }
    if (ok) setModalBidId(undefined);
  }

  async function handleDeleteBid(id) {
    if (!window.confirm("Delete this bid? This can't be undone.")) return;
    const ok = await deleteBid(id);
    if (ok) setModalBidId(undefined);
  }

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted text-sm">Loading…</div>;
  }
  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        connectsUsed={connectsUsed}
        settings={settings}
        wonCount={wonCount}
        view={view}
        onToggleView={() => setView(view === 'board' ? 'dashboard' : 'board')}
        onOpenSettings={() => setSettingsOpen(true)}
        onNewBid={() => setModalBidId(null)}
      />

      {view === 'board' && (
        <FilterBar filters={filters} setFilters={setFilters} countries={countries} bidders={bidders} />
      )}

      <main className="flex-1">
        {view === 'board' ? (
          <Board bids={filteredBids} commissionFor={commissionFor} onOpenBid={setModalBidId} onMoveStage={moveStage} />
        ) : (
          <Dashboard bids={bids} commissionFor={commissionFor} settings={settings} />
        )}
      </main>

      <footer className="text-center text-[11px] font-mono text-muted py-5">
        FAR Tech internal tool · shared team board · not client-facing
      </footer>

      {modalBidId !== undefined && (
        <BidModal
          bid={activeModalBid}
          settings={settings}
          onClose={() => setModalBidId(undefined)}
          onSave={handleSaveBid}
          onDelete={handleDeleteBid}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={async (next) => {
            const ok = await saveSettings(next);
            if (ok) setSettingsOpen(false);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </ToastProvider>
  );
}
