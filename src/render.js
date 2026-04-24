import { getConfig } from './config.js';
import { state, persistState } from './state.js';

export function statusFor(id) {
  const cfg = getConfig();
  return cfg.statuses.find(s => s.id === id) || cfg.statuses[cfg.statuses.length - 1];
}

export function isDark() {
  return document.documentElement.getAttribute('data-theme') === 'gradient-dark';
}

function barFill(st)  { return isDark() ? (st.darkFill  || st.fill)  : st.fill; }
function barColor(st) { return isDark() ? (st.darkColor || st.color) : st.color; }

function gridCols() {
  const cfg = getConfig();
  return `var(--label-w) ${cfg.months.map(() => cfg.colWidth + 'px').join(' ')}`;
}

const _collapsed = new Set();

export function toggleWsCollapse(wsId) {
  if (_collapsed.has(wsId)) _collapsed.delete(wsId);
  else _collapsed.add(wsId);
  render();
}

export function startWsRename(wsId) {
  const header = document.querySelector(`.ws-header[data-wsid="${wsId}"]`);
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
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });
}

function renderStatsBar() {
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

export function render() {
  renderStatsBar();

  const cfg = getConfig();
  const filterWs = document.getElementById('filterWs').value;
  const filterSt = document.getElementById('filterStatus').value;
  const g = document.getElementById('gantt');
  let html = '';

  // Release band header
  html += `<div class="release-row" style="display:grid;grid-template-columns:${gridCols()}">`;
  html += `<div class="release-cell"></div>`;
  cfg.months.forEach((m, i) => {
    const rel = cfg.releases.find(r => r.start <= i && i <= r.end);
    if (rel && i === rel.start) {
      const span = rel.end - rel.start + 1;
      html += `<div class="release-cell" style="grid-column:span ${span};background:${rel.bg};color:${rel.color || ''}">${rel.label}</div>`;
    } else if (!rel) {
      html += `<div class="release-cell"></div>`;
    }
  });
  html += '</div>';

  // Month header row
  html += `<div class="gantt-header" style="display:grid;grid-template-columns:${gridCols()}">`;
  html += `<div class="month-cell label-col-header" style="text-align:left;padding-left:10px">Workstream / Feature<div class="label-col-resizer" onmousedown="startLabelResize(event)"></div></div>`;
  cfg.months.forEach((m, i) => {
    html += `<div class="month-cell${i === cfg.currentMonth ? ' current' : ''}">${m}</div>`;
  });
  html += '</div>';

  // One section per workstream
  state.workstreams.forEach(ws => {
    if (filterWs && ws.id !== filterWs) return;
    const wsFeatures = state.features.filter(f => f.ws === ws.id && (!filterSt || f.status === filterSt));
    const collapsed = _collapsed.has(ws.id);

    html += `<div class="ws-section">`;
    html += `<div class="ws-header" data-wsid="${ws.id}">
      <button class="ws-collapse-btn${collapsed ? ' collapsed' : ''}" onclick="toggleWsCollapse('${ws.id}')" aria-expanded="${!collapsed}" title="${collapsed ? 'Expand' : 'Collapse'}">▾</button>
      <div class="ws-dot" style="background:${ws.color}"></div>
      <div class="ws-name" ondblclick="startWsRename('${ws.id}')" title="Double-click to rename">${ws.name}</div>
      <div class="ws-actions">
        <button onclick="openAddFeature('${ws.id}')">+ feature</button>
        <button onclick="openEditWorkstream('${ws.id}')">edit</button>
      </div>
    </div>`;

    if (!collapsed) {
      wsFeatures.forEach(f => {
        const st = statusFor(f.status);
        html += `<div class="feature-row" data-fid="${f.id}" style="display:grid;grid-template-columns:${gridCols()}">`;

        html += `<div class="feature-label">
          <span class="drag-handle" onmousedown="rowDragMouseDown(event,${f.id})">⠿</span>
          <span onclick="openEdit(${f.id})" style="cursor:pointer">${f.name}</span>
        </div>`;

        cfg.months.forEach((_, i) => {
          const isStart = i === f.start;
          const totalW = (f.end - f.start + 1) * cfg.colWidth - 8;
          html += `<div class="cell${i % 2 ? ' alt' : ''}" onclick="cellClick(${f.id},${i})">`;
          if (isStart) {
            const grips = `<span class="grip-dot"></span><span class="grip-dot"></span><span class="grip-dot"></span>`;
            html += `<div class="bar"
              style="left:4px;width:${totalW}px;background:${barFill(st)};color:${barColor(st)}"
              onmousedown="startBarDrag(event,${f.id})">
              <div class="bar-resize-l" onmousedown="startResize(event,${f.id},'l')">${grips}</div>
              <span style="flex:1;overflow:hidden;text-overflow:ellipsis;pointer-events:none;padding:0 2px">${f.name}</span>
              <div class="bar-resize-r" onmousedown="startResize(event,${f.id},'r')">${grips}</div>
            </div>`;
          }
          html += '</div>';
        });
        html += '</div>';
      });
    }

    html += '</div>';
  });

  g.innerHTML = html;
}
