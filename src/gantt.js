import { Timeline } from 'vis-timeline/esnext';
import { getConfig } from './config.js';
import { state, persistState } from './state.js';
import { statusFor, isDark } from './render.js';

let _timeline = null;

export function getTimeline() { return _timeline; }

export function redrawGantt() {
  if (_timeline) _timeline.redraw();
}

export function destroyGantt() {
  if (_timeline) { _timeline.destroy(); _timeline = null; }
}

function monthToDate(idx) {
  const cfg = getConfig();
  const d = new Date(cfg.ganttStartDate + 'T00:00:00');
  d.setMonth(d.getMonth() + idx);
  return d;
}

function dateToMonthIdx(date) {
  const cfg = getConfig();
  const start = new Date(cfg.ganttStartDate + 'T00:00:00');
  return (date.getFullYear() - start.getFullYear()) * 12 +
    (date.getMonth() - start.getMonth());
}

function snapMonth(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function itemStyle(f) {
  const st = statusFor(f.status);
  const dark = isDark();
  const bg  = dark ? (st.darkFill  || st.fill)  : st.fill;
  const clr = dark ? (st.darkColor || st.color) : st.color;
  return `background:${bg};color:${clr};border-color:transparent;`;
}

function buildItems(filterWs, filterSt, collapsed) {
  const cfg = getConfig();
  const arr = [];

  // Current month highlight band
  const cm = cfg.currentMonth;
  if (cm >= 0 && cm < cfg.months.length) {
    arr.push({
      id: '__current__',
      content: '',
      start: monthToDate(cm),
      end: monthToDate(cm + 1),
      type: 'background',
      className: 'vis-current-month',
      selectable: false,
    });
  }

  // Feature items
  state.features.forEach(f => {
    if (filterWs && f.ws !== filterWs) return;
    if (filterSt && f.status !== filterSt) return;
    if (collapsed.has(f.ws)) return;
    arr.push({
      id: f.id,
      content: f.name,
      start: monthToDate(f.start),
      end: monthToDate(f.end + 1),
      group: f.ws,
      style: itemStyle(f),
      className: 'vis-feature',
      editable: { updateTime: true, updateGroup: true, remove: false },
    });
  });

  return arr;
}

function buildGroups(filterWs, collapsed) {
  return state.workstreams
    .filter(ws => !filterWs || ws.id === filterWs)
    .map((ws, i) => ({
      id: ws.id,
      order: i,
      content: `<div class="vis-ws-header" data-wsid="${ws.id}">
        <button class="ws-collapse-btn${collapsed.has(ws.id) ? ' collapsed' : ''}"
          onclick="toggleWsCollapse('${ws.id}')"
          aria-expanded="${!collapsed.has(ws.id)}"
          title="${collapsed.has(ws.id) ? 'Expand' : 'Collapse'}">▾</button>
        <div class="ws-dot" style="background:${ws.color}"></div>
        <div class="ws-name" ondblclick="startWsRename('${ws.id}')" title="Double-click to rename">${ws.name}</div>
        <div class="ws-actions">
          <button onclick="openAddFeature('${ws.id}')">+ feature</button>
          <button onclick="openEditWorkstream('${ws.id}')">edit</button>
        </div>
      </div>`,
    }));
}

function addResizeHandle(container) {
  const leftPanel = container.querySelector('.vis-panel.vis-left');
  if (!leftPanel || leftPanel.querySelector('.label-col-resizer')) return;
  const handle = document.createElement('div');
  handle.className = 'label-col-resizer';
  handle.addEventListener('mousedown', e => window.startLabelResize(e));
  leftPanel.appendChild(handle);
}

export function initGantt(filterWs, filterSt, collapsed) {
  const cfg = getConfig();
  const container = document.getElementById('gantt');
  if (!container) return;

  const startDate = monthToDate(0);
  const endDate   = monthToDate(cfg.months.length);
  const itemArr   = buildItems(filterWs, filterSt, collapsed);
  const groupArr  = buildGroups(filterWs, collapsed);

  if (_timeline) {
    _timeline.setItems(itemArr);
    _timeline.setGroups(groupArr);
    return;
  }

  const options = {
    start: startDate,
    end: endDate,
    min: startDate,
    max: endDate,
    moveable: false,
    zoomable: false,
    showMajorLabels: false,
    showMinorLabels: true,
    timeAxis: { scale: 'month', step: 1 },
    orientation: { axis: 'top' },
    editable: { updateTime: true, updateGroup: true, remove: false },
    snap: snapMonth,
    selectable: true,
    multiselect: false,
    groupOrder: 'order',
    margin: { item: { horizontal: 4, vertical: 4 }, axis: 4 },
    format: { minorLabels: { month: 'MMM', year: '' } },
    onMove(item, callback) {
      const f = state.features.find(x => x.id === item.id);
      if (!f) { callback(null); return; }
      const cfg = getConfig();
      const rawStart = dateToMonthIdx(item.start);
      const rawEnd   = dateToMonthIdx(item.end) - 1;
      const dur      = f.end - f.start;
      f.start = Math.max(0, Math.min(cfg.months.length - 1, rawStart));
      f.end   = Math.max(f.start, Math.min(cfg.months.length - 1, rawEnd >= rawStart ? rawEnd : f.start + dur));
      f.ws    = String(item.group);
      item.style = itemStyle(f);
      persistState();
      callback(item);
    },
  };

  _timeline = new Timeline(container, itemArr, groupArr, options);

  _timeline.on('select', props => {
    const id = props.items[0];
    if (typeof id === 'number') {
      window.openEdit(id);
      setTimeout(() => _timeline?.setSelection([]), 0);
    }
  });

  requestAnimationFrame(() => addResizeHandle(container));
}
