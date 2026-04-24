import { getConfig } from './config.js';
import { state, persistState } from './state.js';
import { initGantt } from './gantt.js';

export function statusFor(id) {
  const cfg = getConfig();
  return cfg.statuses.find(s => s.id === id) || cfg.statuses[cfg.statuses.length - 1];
}

export function isDark() {
  return document.documentElement.getAttribute('data-theme') === 'gradient-dark';
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

export function renderStatsBar() {
  const el = document.getElementById('stats-bar');
  if (!el) return;
  const cfg = getConfig();
  const total = state.features.length;
  if (total === 0) { el.innerHTML = ''; return; }

  const deployedCount = state.features.filter(f => f.status === 'deployed').length;
  const pct = Math.round((deployedCount / total) * 100);

  const statusCounts = {};
  state.features.forEach(f => { statusCounts[f.status] = (statusCounts[f.status] || 0) + 1; });

  const dark = isDark();
  const pills = cfg.statuses
    .filter(s => statusCounts[s.id])
    .map(s => {
      const bg  = dark ? (s.darkFill  || s.fill)  : s.fill;
      const clr = dark ? (s.darkColor || s.color) : s.color;
      return `<span class="stats-pill" style="background:${bg};color:${clr}">${s.label} <b>${statusCounts[s.id]}</b></span>`;
    })
    .join('');

  el.innerHTML = `
    <div class="stats-deploy">
      <span class="stats-pct">${pct}%</span>
      <span class="stats-label">deployed</span>
    </div>
    <div class="stats-track-wrap" title="${deployedCount} of ${total} features deployed">
      <div class="stats-track"><div class="stats-track-fill" style="width:${pct}%"></div></div>
    </div>
    <span class="stats-count">${total} feature${total !== 1 ? 's' : ''}</span>
    <div class="stats-pills">${pills}</div>
  `;
}

// ── Release band header ───────────────────────────────────────────────────────

function renderReleaseHeader() {
  const el = document.getElementById('release-header');
  if (!el) return;
  const cfg = getConfig();
  let html = '<div class="release-cell release-cell-label"></div>';
  cfg.months.forEach((_, i) => {
    const rel = cfg.releases.find(r => r.start <= i && i <= r.end);
    if (rel && i === rel.start) {
      const span = rel.end - rel.start + 1;
      html += `<div class="release-cell" style="grid-column:span ${span};background:${rel.bg};color:${rel.color || ''}">${rel.label}</div>`;
    } else if (!rel) {
      html += '<div class="release-cell"></div>';
    }
  });
  el.innerHTML = html;
}

// ── Collapsible workstreams ───────────────────────────────────────────────────

const _collapsed = new Set();

export function toggleWsCollapse(wsId) {
  if (_collapsed.has(wsId)) _collapsed.delete(wsId);
  else _collapsed.add(wsId);
  render();
}

// ── Inline workstream rename ──────────────────────────────────────────────────

export function startWsRename(wsId) {
  const header = document.querySelector(`.vis-ws-header[data-wsid="${wsId}"]`);
  if (!header) return;
  const nameEl = header.querySelector('.ws-name');
  if (!nameEl || nameEl.querySelector('input')) return;

  const ws = state.workstreams.find(w => w.id === wsId);
  if (!ws) return;

  const input = document.createElement('input');
  input.className = 'ws-name-inline';
  input.value = ws.name;
  nameEl.textContent = '';
  nameEl.appendChild(input);
  input.focus();
  input.select();

  let saved = false;

  function save() {
    if (saved) return;
    saved = true;
    const val = input.value.trim();
    if (val && val !== ws.name) {
      ws.name = val;
      persistState();
    }
    render();
  }

  function cancel() {
    if (saved) return;
    saved = true;
    render();
  }

  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });
}

// ── Main render ───────────────────────────────────────────────────────────────

export function render() {
  renderStatsBar();
  renderReleaseHeader();

  const filterWs = document.getElementById('filterWs')?.value ?? '';
  const filterSt = document.getElementById('filterStatus')?.value ?? '';
  initGantt(filterWs, filterSt, _collapsed);
}
