import { getConfig } from './config.js';
import { redrawGantt } from './gantt.js';

const LABEL_W_KEY = 'roadmap_label_w';

let labelResize = null;

// ── Label column resize ───────────────────────────────────────────────────────

export function startLabelResize(e) {
  e.preventDefault();
  const cfg = getConfig();
  labelResize = { startX: e.clientX, origWidth: cfg.labelWidth };
  document.body.classList.add('is-dragging');
  document.addEventListener('mousemove', doLabelResize);
  document.addEventListener('mouseup', stopLabelResize);
}

function doLabelResize(e) {
  if (!labelResize) return;
  const cfg = getConfig();
  const newWidth = Math.max(120, Math.min(400, labelResize.origWidth + (e.clientX - labelResize.startX)));
  cfg.labelWidth = newWidth;
  document.documentElement.style.setProperty('--label-w', newWidth + 'px');
  redrawGantt();
}

function stopLabelResize() {
  if (!labelResize) return;
  document.removeEventListener('mousemove', doLabelResize);
  document.removeEventListener('mouseup', stopLabelResize);
  document.body.classList.remove('is-dragging');
  labelResize = null;
  try { localStorage.setItem(LABEL_W_KEY, getConfig().labelWidth); } catch (_) {}
}

export function initLabelWidth() {
  const cfg = getConfig();
  try {
    const saved = parseInt(localStorage.getItem(LABEL_W_KEY));
    if (saved >= 120 && saved <= 400) cfg.labelWidth = saved;
  } catch (_) {}
  document.documentElement.style.setProperty('--label-w', cfg.labelWidth + 'px');
}
