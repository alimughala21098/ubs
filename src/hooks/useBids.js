import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useToast } from '../context/ToastContext';

// Merge a flat bid_logs array onto their parent bids as bid.log = [...]
function attachLogs(bids, logs) {
  const byBid = {};
  logs.forEach((l) => {
    if (!byBid[l.bid_id]) byBid[l.bid_id] = [];
    byBid[l.bid_id].push(l);
  });
  return bids.map((b) => ({ ...b, log: byBid[b.id] || [] }));
}

export function useBids() {
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const loadAll = useCallback(async () => {
    try {
      const [{ data: bidRows, error: bidErr }, { data: logRows, error: logErr }] = await Promise.all([
        supabase
          .from('bids')
          .select('*, creator:created_by(full_name)')
          .order('created_at', { ascending: false }),
        supabase.from('bid_logs').select('*').order('created_at', { ascending: false })
      ]);
      if (bidErr) throw bidErr;
      if (logErr) throw logErr;
      setBids(attachLogs(bidRows || [], logRows || []));
    } catch (e) {
      showToast("Couldn't load the board. Check your Supabase connection.", 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAll();

    const channel = supabase
      .channel('bids-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bids' }, () => loadAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bid_logs' }, () => loadAll())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadAll]);

  const createBid = useCallback(
    async (payload, createdBy) => {
      const { pendingLog, ...bidFields } = payload;
      try {
        const { data, error } = await supabase
          .from('bids')
          .insert([{ ...bidFields, created_by: createdBy }])
          .select()
          .single();
        if (error) throw error;

        if (pendingLog && pendingLog.length) {
          await supabase
            .from('bid_logs')
            .insert(pendingLog.map((l) => ({ bid_id: data.id, author: l.author, text: l.text })));
        }
        showToast('New bid logged.');
        return data;
      } catch (e) {
        showToast('Save failed — the bid was not stored. Try again.', 'error');
        return null;
      }
    },
    [showToast]
  );

  const updateBid = useCallback(
    async (id, payload, options = {}) => {
      const { pendingLog, ...bidFields } = payload;
      try {
        const { error } = await supabase
          .from('bids')
          .update({ ...bidFields, last_activity: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;

        if (pendingLog && pendingLog.length) {
          await supabase
            .from('bid_logs')
            .insert(pendingLog.map((l) => ({ bid_id: id, author: l.author, text: l.text })));
        }
        if (!options.silent) showToast('Bid updated.');
        return true;
      } catch (e) {
        showToast('Save failed — your change was not stored. Try again.', 'error');
        return false;
      }
    },
    [showToast]
  );

  const moveStage = useCallback(
    async (id, stage) => {
      const ok = await updateBid(id, { stage }, { silent: true });
      if (ok) showToast('Moved to new stage.');
      return ok;
    },
    [updateBid, showToast]
  );

  const deleteBid = useCallback(
    async (id) => {
      try {
        const { error } = await supabase.from('bids').delete().eq('id', id);
        if (error) throw error;
        showToast('Bid deleted.');
        return true;
      } catch (e) {
        showToast('Delete failed. Please try again.', 'error');
        return false;
      }
    },
    [showToast]
  );

  return { bids, loading, createBid, updateBid, deleteBid, moveStage, reload: loadAll };
}
