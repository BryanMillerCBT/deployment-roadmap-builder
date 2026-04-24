const DEFAULT_CONFIG = {
  ganttStartDate: "2026-02-01",
  months: ["FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC","JAN"],
  currentMonth: 2,
  colWidth: 60,
  labelWidth: 160,
  releases: [
    { label: "Winter 26", start: 0, end: 2,  bg: "#DDE3F0" },
    { label: "Spring 26",  start: 3, end: 5,  bg: "#C8E6C9" },
    { label: "Summer 26", start: 6, end: 8,  bg: "#FFE0B2" },
    { label: "Winter 27", start: 9, end: 11, bg: "#E1BEE7" },
  ],
  statuses: [
    { id: "not-started",     label: "Not Started",     color: "#546E7A", fill: "#ECEFF1" },
    { id: "identified",      label: "Identified",      color: "#6A1B9A", fill: "#E1BEE7" },
    { id: "requirements",    label: "Requirements",    color: "#AD1457", fill: "#FCE4EC" },
    { id: "in-progress",     label: "In Progress",     color: "#E65100", fill: "#FFE0B2" },
    { id: "at-risk",         label: "At Risk",         color: "#B71C1C", fill: "#FFCDD2" },
    { id: "on-hold",         label: "On Hold",         color: "#F57F17", fill: "#FFF9C4" },
    { id: "ready-to-deploy", label: "Ready to Deploy", color: "#1565C0", fill: "#BBDEFB" },
    { id: "deployed",        label: "Deployed",        color: "#2E7D32", fill: "#C8E6C9" },
  ],
};

let _config = null;

export async function initConfig() {
  try {
    const res = await fetch(import.meta.env.BASE_URL + 'config.json');
    if (res.ok) {
      _config = await res.json();
      return;
    }
  } catch (_) {}
  _config = structuredClone(DEFAULT_CONFIG);
}

export function getConfig() {
  return _config || DEFAULT_CONFIG;
}

export function setReleases(arr) {
  const cfg = _config || DEFAULT_CONFIG;
  cfg.releases = arr;
}
