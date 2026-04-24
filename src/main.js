import './styles/main.css';
import { initConfig } from './config.js';
import { state, initState, persistState, exportStateAsJson, importStateFromJson } from './state.js';
import { render } from './render.js';
import { populateFilters, renderLegend } from './filters.js';
import {
  initModals, openAddFeature, openEdit, openAddWorkstream, openEditWorkstream,
  saveFeature, deleteFeature, closeModal, saveWorkstream, deleteWorkstream,
  pickStart, pickEnd, openSignInModal, closeSignInModal,
  openNewRoadmapModal, closeNewRoadmapModal,
} from './modals.js';
import {
  startResize, doResize, stopResize, rowDragMouseDown, cellClick, startBarDrag,
  startLabelResize, initLabelWidth,
} from './interactions.js';
import { exportToPptx } from './export/exportPptx.js';
import { exportToGoogleSlides } from './export/exportGoogleSlides.js';
import {
  initWizard, shouldShowWizard, openWizard,
  wizardNext, wizardBack, wizardSkip,
  wizardAddWorkstream, wizardRemoveWorkstream,
  wizardAddFeature, wizardRemoveFeature,
} from './wizard.js';
import { toggleWsCollapse, startWsRename } from './render.js';
import { refreshConfigFromStartDate } from './config.js';

const THEME_KEY   = 'roadmap_theme';
const THEMES      = ['gradient', 'gradient-dark'];
const DENSITY_KEY = 'roadmap_density';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(THEME_KEY, theme);
  const logo = document.getElementById('top-bar-logo');
  if (logo) logo.src = (import.meta.env.BASE_URL || '/') + (theme === 'gradient-dark' ? 'logo-white.svg' : 'logo-black.svg');
  const btn = document.getElementById('theme-toggle-btn');
  if (btn) btn.textContent = theme === 'gradient-dark' ? '☽' : '☀︎';
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'gradient';
  const next    = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length];
  applyTheme(next);
}

function applyDensity(density) {
  const gantt = document.getElementById('gantt');
  if (!gantt) return;
  gantt.classList.toggle('compact', density === 'compact');
  localStorage.setItem(DENSITY_KEY, density);
  const btn = document.getElementById('density-btn');
  if (btn) btn.textContent = density === 'compact' ? 'Comfortable' : 'Compact';
}

function toggleDensity() {
  const gantt = document.getElementById('gantt');
  applyDensity(gantt?.classList.contains('compact') ? 'comfortable' : 'compact');
}

Object.assign(window, { toggleTheme, toggleDensity });
import {
  initAuth, isConfigured, showSignIn, signOut, submitSignIn,
  loadRoadmap, saveRoadmap, newRoadmap, confirmNewRoadmap, subscribeRealtime,
} from './auth.js';

// Expose all functions called from inline onclick handlers in render()
Object.assign(window, {
  render, openAddFeature, openEdit, openAddWorkstream, openEditWorkstream,
  saveFeature, deleteFeature, closeModal, saveWorkstream, deleteWorkstream,
  pickStart, pickEnd, startResize, doResize, stopResize, rowDragMouseDown, cellClick, startBarDrag,
  exportToPptx, exportToGoogleSlides, exportStateAsJson,
  showSignIn, signOut, submitSignIn, openSignInModal, closeSignInModal,
  openNewRoadmapModal, closeNewRoadmapModal,
  saveRoadmap, newRoadmap, confirmNewRoadmap,
  openWizard, wizardNext, wizardBack, wizardSkip,
  wizardAddWorkstream, wizardRemoveWorkstream,
  wizardAddFeature, wizardRemoveFeature,
  toggleWsCollapse, startWsRename,
  startLabelResize,
  handleRoadmapSelect: async (e) => {
    const id = e.target.value;
    if (id) {
      await loadRoadmap(id);
      subscribeRealtime(id);
    } else {
      await newRoadmap();
    }
  },
  handleJsonImport: (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    importStateFromJson(file)
      .then(() => { populateFilters(); render(); })
      .catch(err => alert(`Import failed: ${err.message}`));
  },
});

async function init() {
  applyTheme(localStorage.getItem(THEME_KEY) || 'gradient');
  await initConfig();
  initState();
  if (state.ganttStartDate) refreshConfigFromStartDate(state.ganttStartDate);
  initLabelWidth();
  await initAuth();
  initModals();
  initWizard();
  populateFilters();
  renderLegend();
  render();
  applyDensity(localStorage.getItem(DENSITY_KEY) || 'comfortable');
  if (shouldShowWizard()) openWizard();

  // Wire up roadmap name input
  const nameEl = document.getElementById('roadmap-name');
  if (nameEl) {
    nameEl.value = state.currentRoadmapName;
    nameEl.addEventListener('change', () => {
      state.currentRoadmapName = nameEl.value.trim() || 'My Roadmap';
      persistState();
    });
  }
}

init();
