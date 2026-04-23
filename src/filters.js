import { getConfig } from './config.js';
import { state } from './state.js';

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
  const cfg = getConfig();
  document.getElementById('legend').innerHTML = cfg.statuses.map(s =>
    `<div class="legend-item">
      <div class="legend-dot" style="background:${s.color}"></div>${s.label}
    </div>`
  ).join('');
}
