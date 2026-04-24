import { state, persistState } from './state.js';
import { populateFilters } from './filters.js';
import { render } from './render.js';

const WIZARD_KEY = 'roadmap_wizard_done';

let wizardWs   = [];
let currentStep = 1;
const TOTAL_STEPS = 3;

export function shouldShowWizard() {
  return !localStorage.getItem(WIZARD_KEY) && state.features.length === 0;
}

export function openWizard() {
  wizardWs    = state.workstreams.map(ws => ({ ...ws }));
  currentStep = 1;
  renderWizardStep();
  document.getElementById('wizard-modal-bg').classList.add('open');
}

function closeWizard(markDone = true) {
  document.getElementById('wizard-modal-bg').classList.remove('open');
  if (markDone) localStorage.setItem(WIZARD_KEY, '1');
}

export function wizardSkip() {
  closeWizard(true);
}

export function wizardNext() {
  if (currentStep === 1) {
    const name = document.getElementById('wizard-roadmap-name').value.trim();
    if (!name) { document.getElementById('wizard-roadmap-name').focus(); return; }
    state.currentRoadmapName = name;
    const nameEl = document.getElementById('roadmap-name');
    if (nameEl) nameEl.value = name;
  }
  if (currentStep === 2) collectWizardWorkstreams();

  if (currentStep < TOTAL_STEPS) {
    currentStep++;
    renderWizardStep();
  } else {
    finishWizard();
  }
}

export function wizardBack() {
  if (currentStep === 2) collectWizardWorkstreams();
  if (currentStep > 1) {
    currentStep--;
    renderWizardStep();
  }
}

function collectWizardWorkstreams() {
  wizardWs = Array.from(document.querySelectorAll('.wizard-ws-row')).map(row => ({
    id:    row.dataset.wsid,
    name:  row.querySelector('.wizard-ws-name').value.trim(),
    color: row.querySelector('.wizard-ws-color').value,
  })).filter(ws => ws.name);
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

function finishWizard() {
  collectWizardWorkstreams();
  if (wizardWs.length === 0) {
    wizardWs = [{ id: 'general', name: 'General', color: '#4A6FA5' }];
  }
  state.workstreams = wizardWs;
  state.features    = [];
  state.nextId      = 1;
  populateFilters();
  render();
  persistState();
  closeWizard(true);
}

function renderWizardStep() {
  const content = document.getElementById('wizard-content');
  const title   = document.getElementById('wizard-title');
  const stepEl  = document.getElementById('wizard-step-indicator');
  const backBtn = document.getElementById('wizard-back-btn');
  const nextBtn = document.getElementById('wizard-next-btn');

  stepEl.textContent      = `Step ${currentStep} of ${TOTAL_STEPS}`;
  backBtn.style.display   = currentStep > 1 ? 'inline-block' : 'none';
  nextBtn.textContent     = currentStep === TOTAL_STEPS ? 'Finish' : 'Next →';

  if (currentStep === 1) {
    title.textContent = 'Name your roadmap';
    content.innerHTML = `
      <p class="wizard-desc">Give this roadmap a name — typically the customer or project it covers.</p>
      <div class="form-row">
        <label>Roadmap name</label>
        <input type="text" id="wizard-roadmap-name"
          placeholder="e.g. Acme Corp Deployment"
          value="${state.currentRoadmapName && state.currentRoadmapName !== 'My Roadmap' ? state.currentRoadmapName : ''}" />
      </div>
    `;
    setTimeout(() => document.getElementById('wizard-roadmap-name')?.focus(), 50);

  } else if (currentStep === 2) {
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

  } else if (currentStep === 3) {
    const validWs = wizardWs.filter(ws => ws.name);
    title.textContent = "You're all set!";
    content.innerHTML = `
      <p class="wizard-desc">Here's what you've configured. Click <strong>Finish</strong> to open your roadmap.</p>
      <div class="wizard-summary-row"><span class="wizard-summary-label">Roadmap</span>${state.currentRoadmapName}</div>
      <div class="wizard-summary-label" style="margin:12px 0 6px">Workstreams</div>
      ${validWs.map(ws => `
        <div class="wizard-summary-ws">
          <div class="wizard-ws-swatch" style="background:${ws.color}"></div>
          <span>${ws.name}</span>
        </div>
      `).join('')}
      <p class="wizard-desc" style="margin-top:16px">
        Add features by clicking <strong>+ Add feature</strong> in the toolbar, or by clicking any cell in the chart.
      </p>
    `;
  }
}

export function initWizard() {
  document.getElementById('wizard-modal-bg').addEventListener('keydown', e => {
    if (e.key === 'Enter' && currentStep !== 2) wizardNext();
  });
}
