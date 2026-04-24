const DEFAULT_CONFIG = {
  ganttStartDate: "2026-02-01",
  months: ["FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC","JAN"],
  currentMonth: 2,
  colWidth: 64,
  labelWidth: 188,
  releases: [
    { label: "Winter 26", start: 0, end: 2,  bg: "rgba(57,39,255,0.07)",  color: "#3927ff" },
    { label: "Spring 26", start: 3, end: 5,  bg: "rgba(0,135,255,0.07)",  color: "#0087ff" },
    { label: "Summer 26", start: 6, end: 8,  bg: "rgba(0,219,154,0.07)",  color: "#00a37a" },
    { label: "Winter 27", start: 9, end: 11, bg: "rgba(187,116,255,0.08)", color: "#7b44c4" },
  ],
  wsColors: ["#3927ff","#0087ff","#00db9a","#bb74ff","#00deff","#6353ff","#c0392b","#8a6700"],
  statuses: [
    { id: "not-started",     label: "Not Started",     color: "#606e7c", fill: "#eceff1", darkFill: "#3e4c59", darkColor: "#e3e7eb" },
    { id: "identified",      label: "Identified",      color: "#6353ff", fill: "#ede9ff", darkFill: "#3d35aa", darkColor: "#ffffff" },
    { id: "requirements",    label: "Requirements",    color: "#0065cc", fill: "#ddeeff", darkFill: "#0a4f9e", darkColor: "#ffffff" },
    { id: "in-progress",     label: "In Progress",     color: "#006fb5", fill: "#ddf4ff", darkFill: "#085c8a", darkColor: "#ffffff" },
    { id: "at-risk",         label: "At Risk",         color: "#b91c1c", fill: "#fde8e8", darkFill: "#922020", darkColor: "#ffffff" },
    { id: "on-hold",         label: "On Hold",         color: "#7a5800", fill: "#fff8db", darkFill: "#7a6200", darkColor: "#ffffff" },
    { id: "ready-to-deploy", label: "Ready to Deploy", color: "#3927ff", fill: "#e8e5ff", darkFill: "#3020cc", darkColor: "#ffffff" },
    { id: "deployed",        label: "Deployed",        color: "#00a37a", fill: "#d1faf0", darkFill: "#00614a", darkColor: "#ffffff" },
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

const MONTH_ABBR = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

export function refreshConfigFromStartDate(dateStr) {
  if (!dateStr) return;
  const start = new Date(dateStr + 'T00:00:00');
  const cfg   = _config || DEFAULT_CONFIG;
  cfg.ganttStartDate = dateStr;
  cfg.months = Array.from({ length: 12 }, (_, i) => MONTH_ABBR[(start.getMonth() + i) % 12]);
  const now  = new Date();
  const diff = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  cfg.currentMonth = Math.max(0, Math.min(11, diff));
}
