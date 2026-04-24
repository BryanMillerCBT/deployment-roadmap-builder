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
} from './interactions.js';
import { exportToPptx } from './export/exportPptx.js';
import { exportToGoogleSlides } from './export/exportGoogleSlides.js';
import {
  initWizard, shouldShowWizard, openWizard,
  wizardNext, wizardBack, wizardSkip, wizardAddWorkstream, wizardRemoveWorkstream,
} from './wizard.js';
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
  openWizard, wizardNext, wizardBack, wizardSkip, wizardAddWorkstream, wizardRemoveWorkstream,
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
  await initConfig();
  initState();
  await initAuth();
  initModals();
  initWizard();
  populateFilters();
  renderLegend();
  render();
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
