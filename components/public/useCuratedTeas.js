'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { normalizeCuratedSelections } from './curatedSelection';

export default function useCuratedTeas(enabled = true) {
  const [state, setState] = useState({ status: 'loading', entries: [] });
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    async function load() {
      try {
        const { data, error } = await createClient().rpc('list_public_curated_teas');
        if (!active) return;
        setState(error ? { status: 'unavailable', entries: [] } : { status: 'ready', entries: normalizeCuratedSelections(data) });
      } catch {
        if (active) setState({ status: 'unavailable', entries: [] });
      }
    }
    load();
    return () => { active = false; };
  }, [enabled]);
  return state;
}
