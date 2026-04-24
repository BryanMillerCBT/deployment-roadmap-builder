import { getConfig } from './config.js';
import { state, persistState } from './state.js';
import { render } from './render.js';

let resizing = null;
let barDrag  = null;

export function cellClick(fid, mi) {
  const f = state.features.find(x => x.id === fid);
  if (!f) return;
  if (mi < f.start)    { f.start = mi; render(); persistState(); }
  else if (mi > f.end) { f.end   = mi; render(); persistState(); }
}

export function startResize(e, fid, side) {
  e.stopPropagation();
  e.preventDefault();
  resizing = { fid, side, startX: e.clientX, orig: { ...state.features.find(x => x.id === fid) } };
  document.addEventListener('mousemove', doResize);
  document.addEventListener('mouseup', stopResize);
}

export function doResize(e) {
  if (!resizing) return;
  const cfg = getConfig();
  const dx = e.clientX - resizing.startX;
  const dMonths = Math.round(dx / cfg.colWidth);
  const f = state.features.find(x => x.id === resizing.fid);
  if (!f) return;
  if (resizing.side === 'r') {
    f.end   = Math.min(cfg.months.length - 1, Math.max(f.start, resizing.orig.end   + dMonths));
  } else {
    f.start = Math.max(0, Math.min(f.end, resizing.orig.start + dMonths));
  }
  render();
}

export function stopResize() {
  if (!resizing) return;
  persistState();
  resizing = null;
  document.removeEventListener('mousemove', doResize);
  document.removeEventListener('mouseup', stopResize);
}

// ── Bar drag (move entire bar horizontally) ───────────────────────────────────

export function startBarDrag(e, fid) {
  if (e.button !== 0) return;
  e.stopPropagation();
  e.preventDefault();
  const f = state.features.find(x => x.id === fid);
  if (!f) return;
  barDrag = { fid, startX: e.clientX, orig: { start: f.start, end: f.end }, moved: false };
  document.addEventListener('mousemove', doBarDrag);
  document.addEventListener('mouseup', stopBarDrag);
}

function doBarDrag(e) {
  if (!barDrag) return;
  const dx = e.clientX - barDrag.startX;
  if (!barDrag.moved && Math.abs(dx) < 5) return;
  barDrag.moved = true;
  document.body.classList.add('is-dragging');
  const cfg = getConfig();
  const dMonths = Math.round(dx / cfg.colWidth);
  const f = state.features.find(x => x.id === barDrag.fid);
  if (!f) return;
  const duration = barDrag.orig.end - barDrag.orig.start;
  const newStart = Math.max(0, Math.min(cfg.months.length - 1 - duration, barDrag.orig.start + dMonths));
  f.start = newStart;
  f.end   = newStart + duration;
  render();
}

function stopBarDrag() {
  if (!barDrag) return;
  document.removeEventListener('mousemove', doBarDrag);
  document.removeEventListener('mouseup', stopBarDrag);
  document.body.classList.remove('is-dragging');
  const { fid, moved } = barDrag;
  barDrag = null;
  if (moved) {
    persistState();
  } else {
    window.openEdit(fid);
  }
}

let rowDrag = null;

export function rowDragMouseDown(e, fid) {
  if (e.button !== 0) return;
  e.preventDefault();
  const f = state.features.find(x => x.id === fid);
  if (!f) return;
  rowDrag = { fid, ws: f.ws, targetFid: null };
  document.body.classList.add('is-dragging');
  document.addEventListener('mousemove', onRowDragMove);
  document.addEventListener('mouseup', onRowDragUp);
}

function onRowDragMove(e) {
  if (!rowDrag) return;
  document.querySelectorAll('.dragging-over').forEach(el => el.classList.remove('dragging-over'));
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const row = el?.closest('[data-fid]');
  const targetFid = row ? parseInt(row.dataset.fid) : null;
  if (targetFid && targetFid !== rowDrag.fid) {
    const tgt = state.features.find(x => x.id === targetFid);
    if (tgt?.ws === rowDrag.ws) {
      row.classList.add('dragging-over');
      rowDrag.targetFid = targetFid;
      return;
    }
  }
  rowDrag.targetFid = null;
}

function onRowDragUp() {
  if (!rowDrag) return;
  document.body.classList.remove('is-dragging');
  document.querySelectorAll('.dragging-over').forEach(el => el.classList.remove('dragging-over'));
  document.removeEventListener('mousemove', onRowDragMove);
  document.removeEventListener('mouseup', onRowDragUp);
  const { fid, targetFid } = rowDrag;
  rowDrag = null;
  if (!targetFid || targetFid === fid) return;
  const src = state.features.find(x => x.id === fid);
  const tgt = state.features.find(x => x.id === targetFid);
  if (!src || !tgt || src.ws !== tgt.ws) return;
  const si = state.features.indexOf(src);
  const ti = state.features.indexOf(tgt);
  state.features.splice(si, 1);
  state.features.splice(ti, 0, src);
  render();
  persistState();
}
