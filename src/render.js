import { getConfig } from './config.js';
import { state } from './state.js';

export function statusFor(id) {
  const cfg = getConfig();
  return cfg.statuses.find(s => s.id === id) || cfg.statuses[cfg.statuses.length - 1];
}

function gridCols() {
  const cfg = getConfig();
  return `${cfg.labelWidth}px ${cfg.months.map(() => cfg.colWidth + 'px').join(' ')}`;
}

export function render() {
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
      html += `<div class="release-cell" style="grid-column:span ${span};background:${rel.bg}">${rel.label}</div>`;
    } else if (!rel) {
      html += `<div class="release-cell"></div>`;
    }
  });
  html += '</div>';

  // Month header row
  html += `<div class="gantt-header" style="display:grid;grid-template-columns:${gridCols()}">`;
  html += `<div class="month-cell" style="text-align:left;padding-left:10px">Workstream / Feature</div>`;
  cfg.months.forEach((m, i) => {
    html += `<div class="month-cell${i === cfg.currentMonth ? ' current' : ''}">${m}</div>`;
  });
  html += '</div>';

  // One section per workstream
  state.workstreams.forEach(ws => {
    if (filterWs && ws.id !== filterWs) return;
    const wsFeatures = state.features.filter(f => f.ws === ws.id && (!filterSt || f.status === filterSt));

    html += `<div class="ws-section">`;
    html += `<div class="ws-header" data-wsid="${ws.id}">
      <div class="ws-dot" style="background:${ws.color}"></div>
      <div class="ws-name">${ws.name}</div>
      <div class="ws-actions">
        <button onclick="openAddFeature('${ws.id}')">+ feature</button>
        <button onclick="openEditWorkstream('${ws.id}')">edit</button>
      </div>
    </div>`;

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
          html += `<div class="bar"
            style="left:4px;width:${totalW}px;background:${st.fill};border:1px solid ${st.color};color:${st.color}"
            onmousedown="startBarDrag(event,${f.id})">
            <div class="bar-resize-l" onmousedown="startResize(event,${f.id},'l')"></div>
            <span style="overflow:hidden;text-overflow:ellipsis">${f.name}</span>
            <div class="bar-resize-r" onmousedown="startResize(event,${f.id},'r')"></div>
          </div>`;
        }
        html += '</div>';
      });
      html += '</div>';
    });

    html += '</div>';
  });

  g.innerHTML = html;
}
