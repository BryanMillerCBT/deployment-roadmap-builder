import { getConfig } from './config.js';
import { state, } from './state.js';
import { isDark } from './render.js';

export function populateFilters() {
  const cfg = getConfig();
  document.getElementById('filterWs').innerHTML =
    '<option value="">All workstreams</option>' +
    state.workstreams.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
  document.getElementById('filterStatus').innerHTML =
    '<option value="">All statuses</option>' +
    cfg.statuses.map(s => `<option value="${s.id}">${s.label}</option>`).join('');
}

export function renderLegend() {
  const cfg  = getConfig();
  const dark = isDark();
  document.getElementById('legend').innerHTML = cfg.statuses.map(s => {
    const fill = dark ? (s.darkFill || s.fill) : s.fill;
    return `<div class="legend-item">
      <div class="legend-dot" style="background:${fill}"></div>${s.label}
    </div>`;
  }).join('');
}
