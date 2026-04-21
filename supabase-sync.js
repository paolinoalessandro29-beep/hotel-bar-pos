/* ============================================================
   SUPABASE SYNC MODULE
   ------------------------------------------------------------
   Espone `window.POSSync` con questa API:
     .enabled                -> true se configurato e pronto
     .init(onRemoteUpdate)   -> Promise<remoteState|null>
                                onRemoteUpdate(state) viene chiamato
                                quando arrivano cambiamenti da altri device
     .push(state)            -> invia lo stato al cloud (debounced)

   Se la config non c'è o è lasciata coi placeholder, il modulo
   resta "disabled" e l'app funziona come prima (solo localStorage).
   ============================================================ */

(() => {
  'use strict';

  const CFG = window.SUPABASE_CONFIG;
  const isPlaceholder = (v) =>
    !v ||
    v.includes('xxxxxxxx') ||
    v.includes('YOUR_') ||
    v.includes('LONG_PUBLIC_KEY');

  // Fallback stub if not configured
  const disabled = {
    enabled: false,
    init: async () => null,
    push: () => {},
  };

  if (!CFG || isPlaceholder(CFG.url) || isPlaceholder(CFG.anonKey)) {
    console.info('[POSSync] Supabase non configurato — app in modalità locale');
    window.POSSync = disabled;
    return;
  }

  if (typeof supabase === 'undefined' || !supabase.createClient) {
    console.error('[POSSync] Libreria @supabase/supabase-js non caricata');
    window.POSSync = disabled;
    return;
  }

  const client    = supabase.createClient(CFG.url, CFG.anonKey);
  const TABLE     = 'pos_state';
  const ROW_ID    = 'main';
  const DEBOUNCE  = 600;   // ms — accumula le modifiche rapide

  let pushTimer      = null;
  let pendingState   = null;
  let lastPushedAt   = 0;
  let remoteCallback = null;
  let applyingRemote = false;

  async function pullOnce() {
    try {
      const { data, error } = await client
        .from(TABLE)
        .select('*')
        .eq('id', ROW_ID)
        .maybeSingle();
      if (error) {
        console.error('[POSSync] pull error:', error.message);
        return null;
      }
      return data; // { id, data, updated_at } oppure null
    } catch (e) {
      console.error('[POSSync] pull exception:', e);
      return null;
    }
  }

  async function doPush(snapshot) {
    try {
      const { error } = await client
        .from(TABLE)
        .upsert({
          id: ROW_ID,
          data: snapshot,
          updated_at: new Date().toISOString()
        });
      if (error) {
        console.error('[POSSync] push error:', error.message);
        return false;
      }
      lastPushedAt = Date.now();
      return true;
    } catch (e) {
      console.error('[POSSync] push exception:', e);
      return false;
    }
  }

  function push(snapshot) {
    // Non ri-pubblicare ciò che abbiamo appena ricevuto da remoto
    if (applyingRemote) return;
    pendingState = snapshot;
    if (pushTimer) clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      const s = pendingState;
      pendingState = null;
      pushTimer = null;
      if (s) doPush(s);
    }, DEBOUNCE);
  }

  function subscribe() {
    client
      .channel('pos_state_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLE, filter: `id=eq.${ROW_ID}` },
        (payload) => {
          // Ignora l'eco del nostro push recente
          if (Date.now() - lastPushedAt < 1500) return;
          const newRow = payload.new;
          if (!newRow || !newRow.data) return;
          if (!remoteCallback) return;
          applyingRemote = true;
          try { remoteCallback(newRow.data); }
          catch (e) { console.error('[POSSync] remote callback error:', e); }
          finally { setTimeout(() => { applyingRemote = false; }, 150); }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') console.info('[POSSync] realtime connesso ☁️');
      });
  }

  async function init(onRemoteUpdate) {
    remoteCallback = onRemoteUpdate || null;
    const row = await pullOnce();
    subscribe();
    return row ? row.data : null;
  }

  window.POSSync = { enabled: true, init, push };
})();
