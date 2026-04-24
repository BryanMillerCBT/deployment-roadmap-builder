const LOCAL_KEY = 'roadmap_local_data';

export const state = {
  ganttStartDate: '2026-02-01',
  workstreams: [
    { id: "staffing",   name: "Staffing",   color: "#4A6FA5" },
    { id: "delivery",   name: "Delivery",   color: "#2E8B57" },
    { id: "partners",   name: "Partners",   color: "#B8621A" },
    { id: "operations", name: "Operations", color: "#5B4B8A" },
  ],
  features: [
    { id: 1, ws: "staffing",   name: "Work Planner Contouring", start: 0, end: 2,  status: "deployed" },
    { id: 2, ws: "staffing",   name: "Resource Forecasting",    start: 2, end: 5,  status: "ready-to-deploy" },
    { id: 3, ws: "delivery",   name: "Project Billing Rules",   start: 0, end: 3,  status: "in-progress" },
    { id: 4, ws: "delivery",   name: "Milestone Tracker",       start: 4, end: 7,  status: "identified" },
    { id: 5, ws: "partners",   name: "Partner Portal SSO",      start: 1, end: 4,  status: "requirements" },
    { id: 6, ws: "operations", name: "Expense Automation",      start: 3, end: 6,  status: "not-started" },
  ],
  nextId: 7,
  currentRoadmapId: null,
  currentRoadmapName: 'My Roadmap',
};

export function initState() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved.ganttStartDate)     state.ganttStartDate     = saved.ganttStartDate;
      if (saved.workstreams)        state.workstreams        = saved.workstreams;
      if (saved.features)           state.features           = saved.features;
      if (saved.nextId)             state.nextId             = saved.nextId;
      if (saved.currentRoadmapName) state.currentRoadmapName = saved.currentRoadmapName;
    }
  } catch (_) {}
}

export function persistState() {
  localStorage.setItem(LOCAL_KEY, JSON.stringify({
    ganttStartDate:    state.ganttStartDate,
    workstreams:       state.workstreams,
    features:          state.features,
    nextId:            state.nextId,
    currentRoadmapName: state.currentRoadmapName,
  }));
}

export function exportStateAsJson() {
  const data = {
    name: state.currentRoadmapName,
    workstreams: state.workstreams,
    features: state.features,
    nextId: state.nextId,
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.currentRoadmapName.replace(/[^a-z0-9]/gi, '-')}-roadmap.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importStateFromJson(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.workstreams || !data.features) throw new Error('Invalid roadmap file');
        state.workstreams       = data.workstreams;
        state.features          = data.features;
        state.nextId            = data.nextId || 100;
        state.currentRoadmapName = data.name || 'Imported Roadmap';
        persistState();
        resolve();
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsText(file);
  });
}
