import { getConfig } from './config.js';
import { state, persistState } from './state.js';
import { render } from './render.js';
import { populateFilters } from './filters.js';

let selStart = 0, selEnd = 0, editingId = null;
let editingWsId = null;

export function buildMonthBtns(containerId, selected, onSelectName) {
  const cfg = getConfig();
  document.getElementById(containerId).innerHTML = cfg.months.map((m, i) =>
    `<div class="month-btn${i === selected ? ' selected' : ''}" onclick="${onSelectName}(${i})">${m}</div>`
  ).join('');
}

export function pickStart(i) {
  selStart = i;
  if (selEnd < i) selEnd = i;
  buildMonthBtns('start-months', selStart, 'pickStart');
  buildMonthBtns('end-months',   selEnd,   'pickEnd');
}

export function pickEnd(i) {
  selEnd = i;
  if (selStart > i) selStart = i;
  buildMonthBtns('start-months', selStart, 'pickStart');
  buildMonthBtns('end-months',   selEnd,   'pickEnd');
}

export function openAddFeature(wsId) {
  editingId = null;
  document.getElementById('modal-title').textContent = 'Add feature';
  document.getElementById('f-name').value = '';
  document.getElementById('delete-btn').style.display = 'none';
  populateWsSelect(wsId || state.workstreams[0]?.id || '');
  populateStatusSelect('notstarted');
  selStart = 0; selEnd = 0;
  buildMonthBtns('start-months', 0, 'pickStart');
  buildMonthBtns('end-months',   0, 'pickEnd');
  document.getElementById('modal-bg').classList.add('open');
}

export function openEdit(fid) {
  const f = state.features.find(x => x.id === fid);
  if (!f) return;
  editingId = fid;
  document.getElementById('modal-title').textContent = 'Edit feature';
  document.getElementById('f-name').value = f.name;
  document.getElementById('delete-btn').style.display = 'block';
  populateWsSelect(f.ws);
  populateStatusSelect(f.status);
  selStart = f.start; selEnd = f.end;
  buildMonthBtns('start-months', selStart, 'pickStart');
  buildMonthBtns('end-months',   selEnd,   'pickEnd');
  document.getElementById('modal-bg').classList.add('open');
}

function populateWsSelect(selected) {
  document.getElementById('f-ws').innerHTML = state.workstreams.map(w =>
    `<option value="${w.id}"${w.id === selected ? ' selected' : ''}>${w.name}</option>`
  ).join('');
}

function populateStatusSelect(selected) {
  const cfg = getConfig();
  document.getElementById('f-status').innerHTML = cfg.statuses.map(s =>
    `<option value="${s.id}"${s.id === selected ? ' selected' : ''}>${s.label}</option>`
  ).join('');
}

export function saveFeature() {
  const name   = document.getElementById('f-name').value.trim();
  const ws     = document.getElementById('f-ws').value;
  const status = document.getElementById('f-status').value;
  if (!name) return;
  if (editingId != null) {
    Object.assign(state.features.find(x => x.id === editingId), { name, ws, status, start: selStart, end: selEnd });
  } else {
    state.features.push({ id: state.nextId++, name, ws, status, start: selStart, end: selEnd });
  }
  closeModal();
  render();
  persistState();
}

export function deleteFeature() {
  state.features = state.features.filter(x => x.id !== editingId);
  closeModal();
  render();
  persistState();
}

export function closeModal() {
  document.getElementById('modal-bg').classList.remove('open');
  editingId = null;
}

export function openAddWorkstream() {
  editingWsId = null;
  document.getElementById('ws-modal-title').textContent = 'Add workstream';
  document.getElementById('ws-name-input').value = '';
  document.getElementById('ws-delete-btn').style.display = 'none';
  document.getElementById('ws-modal-bg').classList.add('open');
}

export function openEditWorkstream(id) {
  const ws = state.workstreams.find(w => w.id === id);
  if (!ws) return;
  editingWsId = id;
  document.getElementById('ws-modal-title').textContent = 'Edit workstream';
  document.getElementById('ws-name-input').value = ws.name;
  document.getElementById('ws-color-input').value = ws.color;
  document.getElementById('ws-delete-btn').style.display = 'block';
  document.getElementById('ws-modal-bg').classList.add('open');
}

export function saveWorkstream() {
  const name  = document.getElementById('ws-name-input').value.trim();
  const color = document.getElementById('ws-color-input').value;
  if (!name) return;
  if (editingWsId) {
    const ws = state.workstreams.find(w => w.id === editingWsId);
    ws.name = name; ws.color = color;
  } else {
    state.workstreams.push({ id: name.toLowerCase().replace(/\s+/g, '-'), name, color });
  }
  document.getElementById('ws-modal-bg').classList.remove('open');
  populateFilters();
  render();
  persistState();
}

export function deleteWorkstream() {
  if (state.features.some(f => f.ws === editingWsId)) {
    alert('Move or delete all features in this workstream first.');
    return;
  }
  state.workstreams = state.workstreams.filter(w => w.id !== editingWsId);
  document.getElementById('ws-modal-bg').classList.remove('open');
  populateFilters();
  render();
  persistState();
}

export function initModals() {
  document.getElementById('modal-bg').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
  document.getElementById('ws-modal-bg').addEventListener('click', function(e) {
    if (e.target === this) document.getElementById('ws-modal-bg').classList.remove('open');
  });
}
