import { createClient } from '@supabase/supabase-js';
import { state, persistState } from './state.js';
import { render } from './render.js';
import { populateFilters } from './filters.js';

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

export async function showSignIn() {
  const email = prompt('Enter your email address to receive a sign-in link:');
  if (!email || !supabase) return;
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) alert(`Sign in failed: ${error.message}`);
  else alert(`Check your email (${email}) for a sign-in link.`);
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
  updateAuthBar();
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
  const { data, error } = await supabase.from('roadmaps').select('*').eq('id', id).single();
  if (error) { console.error('Failed to load roadmap:', error); return; }
  state.workstreams       = data.workstreams;
  state.features          = data.features;
  state.nextId            = data.next_id;
  state.currentRoadmapId  = data.id;
  state.currentRoadmapName = data.name;
  const nameEl = document.getElementById('roadmap-name');
  if (nameEl) nameEl.value = data.name;
  populateFilters();
  render();
}

export async function saveRoadmap() {
  if (!supabase || !currentUser) {
    persistState();
    return;
  }
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
    alert(`Save failed: ${result.error.message}`);
    return;
  }
  state.currentRoadmapId = result.data.id;
  await loadRoadmapList();
  persistState();
}

export async function newRoadmap() {
  if (!confirm('Start a new roadmap? Unsaved changes will be lost.')) return;
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
