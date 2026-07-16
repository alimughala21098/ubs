import React, { useMemo, useState } from 'react';
import { ToastProvider, useToast } from './context/ToastContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useBids } from './hooks/useBids';
import { useSettings } from './hooks/useSettings';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import FilterBar from './components/FilterBar';
import Board from './components/Board';
import Overview from './components/Overview';
import Followups from './components/Followups';
import Dashboard from './components/Dashboard';
import SettingsPage from './components/SettingsPage';
import BidModal from './components/BidModal';
import { needsFollowUp } from './components/BidCard';

function Shell() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const { bids, createBid, updateBid, deleteBid, moveStage } = useBids();
  const { settings, saveSettings } = useSettings();

  const [page, setPage] = useState('dashboard');
  const [filters, setFilters] = useState({ text: '', country: '', bidder: '', needsReview: false });
  const [modalBidId, setModalBidId] = useState(undefined); // undefined = closed, null = new, id = edit

  const commissionFor = (bid) => (Number(bid.budget) || 0) * (Number(settings.commission_rate_percent) || 0) / 100;

  const followUpCount = useMemo(() => bids.filter(needsFollowUp).length, [bids]);

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
      showToast('Budget is below the escalation threshold — flagged for admin review.');
    }
    if (ok) setModalBidId(undefined);
  }

  async function handleDeleteBid(id) {
    if (!window.confirm("Delete this bid? This can't be undone.")) return;
    const ok = await deleteBid(id);
    if (ok) setModalBidId(undefined);
  }

  function openBid(id) {
    setModalBidId(id);
  }

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center text-muted text-sm">Loading…</div>;
  }
  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar page={page} onNavigate={setPage} followUpCount={followUpCount} />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="sticky top-0 z-20 bg-surface border-b border-border px-6 md:px-8 py-3.5 flex items-center gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Search bids, clients…"
            value={filters.text}
            onChange={(e) => setFilters((f) => ({ ...f, text: e.target.value }))}
            className="flex-1 min-w-[200px] bg-surface2 border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            onClick={() => setModalBidId(null)}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-accent hover:bg-accent-light transition-colors text-white whitespace-nowrap"
          >
            + Log New Bid
          </button>
        </div>

        {page === 'pipeline' && (
          <FilterBar filters={filters} setFilters={setFilters} countries={countries} bidders={bidders} />
        )}

        <main className="flex-1 min-w-0">
          {page === 'dashboard' && <Overview bids={bids} settings={settings} onOpenBid={openBid} />}
          {page === 'pipeline' && (
            <Board bids={filteredBids} commissionFor={commissionFor} onOpenBid={openBid} onMoveStage={moveStage} />
          )}
          {page === 'followups' && <Followups bids={bids} onOpenBid={openBid} />}
          {page === 'analytics' && <Dashboard bids={bids} commissionFor={commissionFor} settings={settings} />}
          {page === 'settings' && (
            <SettingsPage
              settings={settings}
              onSave={async (next) => {
                const ok = await saveSettings(next);
                if (ok) showToast('Settings saved.');
                return ok;
              }}
            />
          )}
        </main>

        <footer className="text-center text-[11px] font-mono text-muted py-5">
          FAR Tech internal tool · shared team board · not client-facing
        </footer>
      </div>

      {modalBidId !== undefined && (
        <BidModal
          bid={activeModalBid}
          settings={settings}
          onClose={() => setModalBidId(undefined)}
          onSave={handleSaveBid}
          onDelete={handleDeleteBid}
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
