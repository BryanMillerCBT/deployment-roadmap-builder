import PptxGenJS from 'pptxgenjs';
import { getConfig } from '../config.js';
import { state } from '../state.js';

const SLIDE_W      = 10;
const SLIDE_H      = 5.63;
const LABEL_COL_W  = 1.4;
const MONTH_W      = (SLIDE_W - LABEL_COL_W) / 12;
const ROW_H        = 0.28;
const RELEASE_Y    = 0.4;
const MONTHS_Y     = 0.65;
const BODY_START_Y = 0.9;
const LEGEND_Y     = 5.2;
const OVERFLOW_Y   = 5.05;

function hex(color) {
  return color.replace('#', '');
}

function buildSlide(prs, cfg, workstreamsSubset, featuresSubset) {
  const slide = prs.addSlide();

  // Title
  const name = document.getElementById('roadmap-name')?.value || state.currentRoadmapName || 'Deployment Roadmap';
  slide.addText(name, {
    x: 0.1, y: 0, w: SLIDE_W - 0.2, h: RELEASE_Y,
    fontSize: 16, bold: true, color: '232F3E', valign: 'middle',
  });

  // Release bands
  cfg.releases.forEach(rel => {
    const x = LABEL_COL_W + rel.start * MONTH_W;
    const w = (rel.end - rel.start + 1) * MONTH_W;
    slide.addShape(prs.ShapeType.rect, {
      x, y: RELEASE_Y, w, h: 0.25,
      fill: { color: hex(rel.bg) },
      line: { color: 'CCCCCC', width: 0.5 },
    });
    slide.addText(rel.label, {
      x, y: RELEASE_Y, w, h: 0.25,
      fontSize: 7, align: 'center', color: '555555',
    });
  });

  // Month headers
  slide.addText('Workstream / Feature', {
    x: 0, y: MONTHS_Y, w: LABEL_COL_W, h: 0.25,
    fontSize: 7, bold: true, color: '444444', valign: 'middle',
  });
  cfg.months.forEach((m, i) => {
    const x = LABEL_COL_W + i * MONTH_W;
    const isCurrent = i === cfg.currentMonth;
    slide.addShape(prs.ShapeType.rect, {
      x, y: MONTHS_Y, w: MONTH_W, h: 0.25,
      fill: { color: isCurrent ? 'FF9900' : 'F5F5F5' },
      line: { color: 'DDDDDD', width: 0.5 },
    });
    slide.addText(m, {
      x, y: MONTHS_Y, w: MONTH_W, h: 0.25,
      fontSize: 7, align: 'center',
      color: isCurrent ? 'FFFFFF' : '666666',
      bold: isCurrent,
    });
  });

  let currentY = BODY_START_Y;
  const overflowMap = new Map();

  workstreamsSubset.forEach(ws => {
    const wsFeatures = featuresSubset.filter(f => f.ws === ws.id);
    if (wsFeatures.length === 0) return;

    // WS header row — check if it fits
    if (currentY + ROW_H > OVERFLOW_Y) {
      overflowMap.set(ws, wsFeatures);
      return;
    }
    slide.addShape(prs.ShapeType.rect, {
      x: 0, y: currentY, w: SLIDE_W, h: ROW_H,
      fill: { color: 'F0F0F0' },
      line: { color: 'DDDDDD', width: 0.5 },
    });
    slide.addShape(prs.ShapeType.ellipse, {
      x: 0.08, y: currentY + (ROW_H - 0.12) / 2, w: 0.12, h: 0.12,
      fill: { color: hex(ws.color) },
      line: { color: hex(ws.color), width: 0 },
    });
    slide.addText(ws.name, {
      x: 0.26, y: currentY, w: LABEL_COL_W - 0.3, h: ROW_H,
      fontSize: 8, bold: true, color: '333333', valign: 'middle',
    });
    currentY += ROW_H;

    const overflowFeatures = [];
    wsFeatures.forEach(f => {
      if (currentY + ROW_H > OVERFLOW_Y) {
        overflowFeatures.push(f);
        return;
      }
      const st = cfg.statuses.find(s => s.id === f.status) || cfg.statuses[cfg.statuses.length - 1];

      slide.addText(f.name, {
        x: 0.05, y: currentY, w: LABEL_COL_W - 0.1, h: ROW_H,
        fontSize: 7, color: '555555', valign: 'middle',
      });

      const barX = LABEL_COL_W + f.start * MONTH_W + 0.03;
      const barW = Math.max((f.end - f.start + 1) * MONTH_W - 0.06, 0.1);
      slide.addShape(prs.ShapeType.rect, {
        x: barX, y: currentY + 0.04, w: barW, h: ROW_H - 0.08,
        fill: { color: hex(st.fill) },
        line: { color: hex(st.color), width: 1 },
      });
      slide.addText(f.name, {
        x: barX + 0.04, y: currentY + 0.04, w: barW - 0.08, h: ROW_H - 0.08,
        fontSize: 6, color: hex(st.color), valign: 'middle',
      });

      currentY += ROW_H;
    });

    if (overflowFeatures.length > 0) overflowMap.set(ws, overflowFeatures);
  });

  // Legend strip
  let legendX = 0.1;
  cfg.statuses.forEach(s => {
    if (legendX + 1.55 > SLIDE_W) return;
    slide.addShape(prs.ShapeType.ellipse, {
      x: legendX, y: LEGEND_Y + 0.04, w: 0.1, h: 0.1,
      fill: { color: hex(s.color) },
      line: { color: hex(s.color), width: 0 },
    });
    slide.addText(s.label, {
      x: legendX + 0.15, y: LEGEND_Y, w: 1.35, h: 0.2,
      fontSize: 7, color: '555555',
    });
    legendX += 1.55;
  });

  // Recurse for overflow
  if (overflowMap.size > 0) {
    buildSlide(prs, cfg, [...overflowMap.keys()], [...overflowMap.values()].flat());
  }
}

export function exportToPptx() {
  const cfg = getConfig();
  const prs = new PptxGenJS();
  prs.layout = 'LAYOUT_WIDE';

  buildSlide(prs, cfg, state.workstreams, state.features);

  const name = document.getElementById('roadmap-name')?.value || state.currentRoadmapName || 'roadmap';
  prs.writeFile({ fileName: `${name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-roadmap.pptx` });
}
