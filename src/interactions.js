import { getConfig } from './config.js';
import { state, persistState } from './state.js';
import { render } from './render.js';

let resizing = null;
let dragSrc = null;

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

export function dragStart(e, fid) {
  dragSrc = fid;
  e.dataTransfer.effectAllowed = 'move';
  document.body.classList.add('is-dragging');
}

export function dragOver(e) {
  e.preventDefault();
}

export function dragEnter(e, fid) {
  e.preventDefault();
  if (fid !== dragSrc) e.currentTarget.classList.add('dragging-over');
}

export function dragLeave(e) {
  if (!e.currentTarget.contains(e.relatedTarget)) {
    e.currentTarget.classList.remove('dragging-over');
  }
}

export function dragEnd() {
  dragSrc = null;
  document.body.classList.remove('is-dragging');
  document.querySelectorAll('.dragging-over').forEach(el => el.classList.remove('dragging-over'));
}

export function dropOn(e, fid) {
  e.currentTarget.classList.remove('dragging-over');
  if (!dragSrc || dragSrc === fid) return;
  const src = state.features.find(x => x.id === dragSrc);
  const tgt = state.features.find(x => x.id === fid);
  if (!src || !tgt || src.ws !== tgt.ws) return;
  const si = state.features.indexOf(src);
  const ti = state.features.indexOf(tgt);
  state.features.splice(si, 1);
  state.features.splice(ti, 0, src);
  render();
  persistState();
}
