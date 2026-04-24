import { getConfig, refreshConfigFromStartDate } from './config.js';
import { state, persistState, hasPersistedState } from './state.js';
import { populateFilters } from './filters.js';
import { render } from './render.js';

const WIZARD_KEY = 'roadmap_wizard_done';

let wizardStep     = 1;
const TOTAL_STEPS  = 4;
let wizardStartDate = '';
let wizardWs       = [];
let wizardFeatures = [];

export function shouldShowWizard() {
  return !localStorage.getItem(WIZARD_KEY) && !hasPersistedState();
}

export function openWizard() {
  wizardStartDate = state.ganttStartDate || '2026-02-01';
  wizardWs        = state.workstreams.map(ws => ({ ...ws }));
  wizardFeatures  = [];
  wizardStep      = 1;
  renderWizardStep();
  document.getElementById('wizard-modal-bg').classList.add('open');
}

function closeWizard() {
  document.getElementById('wizard-modal-bg').classList.remove('open');
  localStorage.setItem(WIZARD_KEY, '1');
}

export function wizardSkip() {
  closeWizard();
}

export function wizardNext() {
  if (wizardStep === 1) {
    const name = document.getElementById('wizard-roadmap-name').value.trim();
    if (!name) { document.getElementById('wizard-roadmap-name').focus(); return; }
    const monthVal = document.getElementById('wizard-start-month').value;
    if (!monthVal) { document.getElementById('wizard-start-month').focus(); return; }
    state.currentRoadmapName = name;
    const nameEl = document.getElementById('roadmap-name');
    if (nameEl) nameEl.value = name;
    wizardStartDate = monthVal + '-01';
    refreshConfigFromStartDate(wizardStartDate);
  } else if (wizardStep === 2) {
    collectWizardWorkstreams();
  } else if (wizardStep === 3) {
    collectWizardFeatures();
  } else if (wizardStep === TOTAL_STEPS) {
    finishWizard();
    return;
  }
  wizardStep++;
  renderWizardStep();
}

export function wizardBack() {
  if (wizardStep === 2) collectWizardWorkstreams();
  if (wizardStep === 3) collectWizardFeatures();
  if (wizardStep > 1) { wizardStep--; renderWizardStep(); }
}

function collectWizardWorkstreams() {
  wizardWs = Array.from(document.querySelectorAll('.wizard-ws-row')).map(row => ({
    id:    row.dataset.wsid,
    name:  row.querySelector('.wizard-ws-name').value.trim(),
    color: row.querySelector('.wizard-ws-color').value,
  })).filter(ws => ws.name);
}

function collectWizardFeatures() {
  wizardFeatures = Array.from(document.querySelectorAll('.wizard-feat-row')).map(row => ({
    name:   row.querySelector('.wizard-feat-name').value.trim(),
    ws:     row.querySelector('.wizard-feat-ws').value,
    start:  parseInt(row.querySelector('.wizard-feat-start').value),
    end:    parseInt(row.querySelector('.wizard-feat-end').value),
    status: row.querySelector('.wizard-feat-status').value,
  })).filter(f => f.name);
}

export function wizardAddWorkstream() {
  collectWizardWorkstreams();
  wizardWs.push({ id: `ws-${Date.now()}`, name: '', color: '#4A6FA5' });
  renderWizardStep();
  const rows = document.querySelectorAll('.wizard-ws-row');
  rows[rows.length - 1]?.querySelector('.wizard-ws-name')?.focus();
}

export function wizardRemoveWorkstream(idx) {
  collectWizardWorkstreams();
  wizardWs.splice(idx, 1);
  renderWizardStep();
}

export function wizardAddFeature() {
  collectWizardFeatures();
  const ws = wizardWs.find(w => w.name) || wizardWs[0];
  wizardFeatures.push({ name: '', ws: ws?.id || '', start: 0, end: 0, status: 'not-started' });
  renderWizardStep();
  const rows = document.querySelectorAll('.wizard-feat-row');
  rows[rows.length - 1]?.querySelector('.wizard-feat-name')?.focus();
}

export function wizardRemoveFeature(idx) {
  collectWizardFeatures();
  wizardFeatures.splice(idx, 1);
  renderWizardStep();
}

function finishWizard() {
  if (wizardWs.length === 0) wizardWs = [{ id: 'general', name: 'General', color: '#4A6FA5' }];
  state.ganttStartDate = wizardStartDate;
  state.workstreams    = wizardWs;
  state.features       = wizardFeatures.map((f, i) => ({
    id:     i + 1,
    ws:     f.ws,
    name:   f.name,
    start:  Math.min(f.start, f.end),
    end:    Math.max(f.start, f.end),
    status: f.status,
  }));
  state.nextId = state.features.length + 1;
  refreshConfigFromStartDate(wizardStartDate);
  populateFilters();
  render();
  persistState();
  closeWizard();
}

function monthOptions(selectedIdx) {
  return getConfig().months.map((m, i) =>
    `<option value="${i}"${i === selectedIdx ? ' selected' : ''}>${m}</option>`
  ).join('');
}

function wsOptions(selectedId) {
  return wizardWs.filter(w => w.name).map(w =>
    `<option value="${w.id}"${w.id === selectedId ? ' selected' : ''}>${w.name}</option>`
  ).join('');
}

function statusOptions(selectedId) {
  return getConfig().statuses.map(s =>
    `<option value="${s.id}"${s.id === selectedId ? ' selected' : ''}>${s.label}</option>`
  ).join('');
}

function renderWizardStep() {
  const content = document.getElementById('wizard-content');
  const title   = document.getElementById('wizard-title');
  const stepEl  = document.getElementById('wizard-step-indicator');
  const backBtn = document.getElementById('wizard-back-btn');
  const nextBtn = document.getElementById('wizard-next-btn');

  stepEl.textContent    = `Step ${wizardStep} of ${TOTAL_STEPS}`;
  backBtn.style.display = wizardStep > 1 ? 'inline-block' : 'none';
  nextBtn.textContent   = wizardStep === TOTAL_STEPS ? 'Finish' : 'Next →';

  if (wizardStep === 1) {
    title.textContent = 'Name your roadmap';
    content.innerHTML = `
      <p class="wizard-desc">Give this roadmap a name and set when the timeline starts.</p>
      <div class="form-row">
        <label>Roadmap name</label>
        <input type="text" id="wizard-roadmap-name"
          placeholder="e.g. Acme Corp Deployment"
          value="${state.currentRoadmapName !== 'My Roadmap' ? state.currentRoadmapName : ''}" />
      </div>
      <div class="form-row">
        <label>Timeline start</label>
        <input type="month" id="wizard-start-month" value="${wizardStartDate.slice(0, 7)}" />
      </div>
    `;
    setTimeout(() => document.getElementById('wizard-roadmap-name')?.focus(), 50);

  } else if (wizardStep === 2) {
    title.textContent = 'Define your workstreams';
    content.innerHTML = `
      <p class="wizard-desc">Workstreams are the swim lanes in your Gantt. Edit the defaults or add your own.</p>
      <div id="wizard-ws-list">
        ${wizardWs.map((ws, i) => `
          <div class="wizard-ws-row" data-wsid="${ws.id}">
            <input type="color" class="wizard-ws-color" value="${ws.color}" />
            <input type="text"  class="wizard-ws-name"  value="${ws.name}" placeholder="Workstream name" />
            ${wizardWs.length > 1
              ? `<button class="wizard-ws-remove" onclick="wizardRemoveWorkstream(${i})">✕</button>`
              : '<span style="width:28px"></span>'}
          </div>
        `).join('')}
      </div>
      <button class="wizard-add-ws" onclick="wizardAddWorkstream()">+ Add workstream</button>
    `;

  } else if (wizardStep === 3) {
    title.textContent = 'Add initial features';
    content.innerHTML = `
      <p class="wizard-desc">Optionally add features now. You can always add more later from the toolbar.</p>
      <div id="wizard-feat-list">
        ${wizardFeatures.length === 0
          ? '<p class="wizard-empty">No features yet — click below to add one.</p>'
          : wizardFeatures.map((f, i) => `
            <div class="wizard-feat-row">
              <div class="wizard-feat-top">
                <input type="text" class="wizard-feat-name" placeholder="Feature name" value="${f.name}" />
                <button class="wizard-ws-remove" onclick="wizardRemoveFeature(${i})">✕</button>
              </div>
              <div class="wizard-feat-bottom">
                <select class="wizard-feat-ws">${wsOptions(f.ws)}</select>
                <select class="wizard-feat-start">${monthOptions(f.start)}</select>
                <span class="wizard-arrow">→</span>
                <select class="wizard-feat-end">${monthOptions(f.end)}</select>
                <select class="wizard-feat-status">${statusOptions(f.status)}</select>
              </div>
            </div>
          `).join('')}
      </div>
      <button class="wizard-add-ws" onclick="wizardAddFeature()">+ Add feature</button>
    `;

  } else if (wizardStep === 4) {
    const cfg     = getConfig();
    const validWs = wizardWs.filter(w => w.name);
    title.textContent = "You're all set!";
    content.innerHTML = `
      <p class="wizard-desc">Here's a summary. Click <strong>Finish</strong> to open your roadmap.</p>
      <div class="wizard-summary-row">
        <span class="wizard-summary-label">Roadmap</span>${state.currentRoadmapName}
      </div>
      <div class="wizard-summary-row">
        <span class="wizard-summary-label">Starts</span>${cfg.months[0]} ${wizardStartDate.slice(0, 4)}
      </div>
      <div class="wizard-summary-section">Workstreams</div>
      ${validWs.map(ws => `
        <div class="wizard-summary-ws">
          <div class="wizard-ws-swatch" style="background:${ws.color}"></div>
          <span>${ws.name}</span>
        </div>
      `).join('')}
      ${wizardFeatures.length > 0 ? `
        <div class="wizard-summary-section">Features (${wizardFeatures.length})</div>
        ${wizardFeatures.map(f => {
          const ws = validWs.find(w => w.id === f.ws);
          return `<div class="wizard-summary-ws">
            <div class="wizard-ws-swatch" style="background:${ws?.color || '#ccc'}"></div>
            <span>${f.name}
              <span class="wizard-summary-dim">${cfg.months[f.start]}–${cfg.months[f.end]}</span>
            </span>
          </div>`;
        }).join('')}
      ` : '<p class="wizard-empty" style="margin-top:8px">No features — add them from the toolbar.</p>'}
    `;
  }
}

export function initWizard() {
  document.getElementById('wizard-modal-bg').addEventListener('keydown', e => {
    if (e.key === 'Enter' && wizardStep !== 2 && wizardStep !== 3) wizardNext();
  });
}
