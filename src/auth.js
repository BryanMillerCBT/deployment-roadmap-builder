import { createClient } from '@supabase/supabase-js';
import { state, persistState } from './state.js';
import { render } from './render.js';
import { populateFilters } from './filters.js';
import { openSignInModal, closeSignInModal, closeNewRoadmapModal } from './modals.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export let supabase = null;
let currentUser = null;
let realtimeChannel = null;

export function isConfigured() {
  return !!(SUPABASE_URL && SUPABASE_KEY);
}

export function getCurrentUser() {
  return currentUser;
}

export async function initAuth() {
  if (!isConfigured()) return;

  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const { data: { user } } = await supabase.auth.getUser();
  currentUser = user || null;
  updateAuthBar();

  supabase.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user || null;
    updateAuthBar();
    if (currentUser) loadRoadmapList();
  });

  if (currentUser) await loadRoadmapList();
}

function updateAuthBar() {
  const bar = document.getElementById('auth-bar');
  if (!bar) return;
  if (currentUser) {
    bar.innerHTML = `
      <span>${currentUser.email}</span>
      <button onclick="signOut()">Sign out</button>
    `;
  } else {
    bar.innerHTML = `
      <span>Sign in to save & share roadmaps across your team</span>
      <button onclick="showSignIn()">Sign in</button>
    `;
  }
}

export function showSignIn() {
  openSignInModal();
}

export async function submitSignIn() {
  const email = document.getElementById('signin-email')?.value?.trim();
  const msgEl = document.getElementById('signin-message');
  const btnEl = document.getElementById('signin-submit-btn');
  if (!email || !supabase) return;

  btnEl.disabled = true;
  msgEl.style.display = 'none';

  const redirectTo = window.location.origin + (import.meta.env.BASE_URL || '/');
  const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });

  if (error) {
    msgEl.textContent = `Error: ${error.message}`;
    msgEl.style.cssText = 'display:block;font-size:12px;padding:8px;border-radius:var(--border-radius-md);margin-bottom:10px;background:var(--color-background-danger);color:var(--color-text-danger)';
    btnEl.disabled = false;
  } else {
    msgEl.textContent = `Check your inbox — a sign-in link has been sent to ${email}.`;
    msgEl.style.cssText = 'display:block;font-size:12px;padding:8px;border-radius:var(--border-radius-md);margin-bottom:10px;background:#e8f5e9;color:#2E7D32';
    btnEl.disabled = true;
    setTimeout(closeSignInModal, 4000);
  }
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
  updateAuthBar();
}

// ── UI helpers ───────────────────────────────────────────────────────────────

let _statusTimer = null;

function setSaveStatus(msg, type = 'loading') {
  const el  = document.getElementById('save-status');
  const btn = document.getElementById('save-btn');
  if (!el) return;
  clearTimeout(_statusTimer);
  const colors = {
    loading: 'var(--color-text-secondary)',
    success: '#2E7D32',
    error:   'var(--color-text-danger)',
  };
  el.textContent = msg;
  el.style.color   = colors[type] || colors.loading;
  el.style.display = 'inline';
  if (btn) btn.disabled = type === 'loading';
  if (type === 'success') {
    _statusTimer = setTimeout(() => { el.style.display = 'none'; }, 3000);
  }
}

// ── Roadmap CRUD ──────────────────────────────────────────────────────────────

export async function loadRoadmapList() {
  if (!supabase || !currentUser) return;
  const { data, error } = await supabase.from('roadmaps').select('id, name, updated_at').order('updated_at', { ascending: false });
  if (error) { console.error('Failed to load roadmaps:', error); return; }
  renderRoadmapSelector(data || []);
}

function renderRoadmapSelector(roadmaps) {
  const sel = document.getElementById('roadmap-select');
  if (!sel) return;
  sel.innerHTML = '<option value="">— New roadmap —</option>' +
    roadmaps.map(r => `<option value="${r.id}">${r.name}</option>`).join('');
  if (state.currentRoadmapId) sel.value = state.currentRoadmapId;
  sel.style.display = '';
}

export async function loadRoadmap(id) {
  if (!supabase || !id) return;
  setSaveStatus('Loading…');
  const { data, error } = await supabase.from('roadmaps').select('*').eq('id', id).single();
  if (error) {
    console.error('Failed to load roadmap:', error);
    setSaveStatus(`Load failed: ${error.message}`, 'error');
    return;
  }
  state.workstreams        = data.workstreams;
  state.features           = data.features;
  state.nextId             = data.next_id;
  state.currentRoadmapId   = data.id;
  state.currentRoadmapName = data.name;
  const nameEl = document.getElementById('roadmap-name');
  if (nameEl) nameEl.value = data.name;
  populateFilters();
  render();
  setSaveStatus('Loaded', 'success');
}

export async function saveRoadmap() {
  if (!supabase || !currentUser) {
    persistState();
    return;
  }
  setSaveStatus('Saving…');
  const name = document.getElementById('roadmap-name')?.value?.trim() || state.currentRoadmapName || 'Untitled';
  state.currentRoadmapName = name;

  const payload = {
    name,
    workstreams: state.workstreams,
    features:    state.features,
    next_id:     state.nextId,
    created_by:  currentUser.id,
    updated_at:  new Date().toISOString(),
  };

  let result;
  if (state.currentRoadmapId) {
    result = await supabase.from('roadmaps').update(payload)
      .eq('id', state.currentRoadmapId)
      .eq('created_by', currentUser.id)
      .select().single();
  } else {
    result = await supabase.from('roadmaps').insert(payload).select().single();
  }

  if (result.error) {
    console.error('Save failed:', result.error);
    setSaveStatus(`Save failed: ${result.error.message}`, 'error');
    return;
  }
  state.currentRoadmapId = result.data.id;
  await loadRoadmapList();
  persistState();
  setSaveStatus('Saved', 'success');
}

export async function newRoadmap() {
  window.openNewRoadmapModal();
}

export async function confirmNewRoadmap() {
  closeNewRoadmapModal();
  state.currentRoadmapId   = null;
  state.currentRoadmapName = 'New Roadmap';
  state.workstreams = [
    { id: "staffing",   name: "Staffing",   color: "#4A6FA5" },
    { id: "delivery",   name: "Delivery",   color: "#2E8B57" },
    { id: "partners",   name: "Partners",   color: "#B8621A" },
    { id: "operations", name: "Operations", color: "#5B4B8A" },
  ];
  state.features = [];
  state.nextId   = 1;
  const nameEl = document.getElementById('roadmap-name');
  if (nameEl) nameEl.value = state.currentRoadmapName;
  const sel = document.getElementById('roadmap-select');
  if (sel) sel.value = '';
  populateFilters();
  render();
  persistState();
}

export function subscribeRealtime(roadmapId) {
  if (!supabase || !roadmapId) return;
  if (realtimeChannel) supabase.removeChannel(realtimeChannel);
  realtimeChannel = supabase
    .channel(`roadmap:${roadmapId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'roadmaps', filter: `id=eq.${roadmapId}` },
      (payload) => {
        state.workstreams = payload.new.workstreams;
        state.features    = payload.new.features;
        state.nextId      = payload.new.next_id;
        populateFilters();
        render();
      })
    .subscribe();
}
