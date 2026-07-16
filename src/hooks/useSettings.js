import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { DEFAULT_SETTINGS } from '../lib/constants';
import { useToast } from '../context/ToastContext';

export function useSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
      if (error) throw error;
      setSettings(data || DEFAULT_SETTINGS);
    } catch (e) {
      showToast("Couldn't load settings. Using defaults.", 'error');
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('settings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, () => load())
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [load]);

  const saveSettings = useCallback(
    async (next) => {
      try {
        const { error } = await supabase.from('settings').update(next).eq('id', 1);
        if (error) throw error;
        showToast('Settings saved — dashboard updated.');
        return true;
      } catch (e) {
        showToast('Settings failed to save. Try again.', 'error');
        return false;
      }
    },
    [showToast]
  );

  return { settings, loading, saveSettings };
}
