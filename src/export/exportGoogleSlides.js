import { getConfig } from '../config.js';
import { state } from '../state.js';

const SCOPES = 'https://www.googleapis.com/auth/presentations https://www.googleapis.com/auth/drive.file';

let tokenClient = null;
let gapiLoaded = false;
let gisLoaded = false;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function ensureLibsLoaded() {
  if (!gapiLoaded) {
    await loadScript('https://apis.google.com/js/api.js');
    await new Promise((resolve) => window.gapi.load('client', resolve));
    await window.gapi.client.init({});
    await window.gapi.client.load('https://slides.googleapis.com/$discovery/rest?version=v1');
    await window.gapi.client.load('https://www.googleapis.com/discovery/v1/apis/drive/v3/rest');
    gapiLoaded = true;
  }
  if (!gisLoaded) {
    await loadScript('https://accounts.google.com/gsi/client');
    gisLoaded = true;
  }
}

function getAccessToken() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is not set. See .env.example for setup instructions.');
  }
  return new Promise((resolve, reject) => {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPES,
      callback: (resp) => {
        if (resp.error) reject(new Error(resp.error));
        else resolve(resp.access_token);
      },
    });
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

function hexNoHash(color) {
  return color.replace('#', '');
}

function rgbFromHex(hex) {
  const h = hexNoHash(hex);
  return {
    red:   parseInt(h.slice(0,2), 16) / 255,
    green: parseInt(h.slice(2,4), 16) / 255,
    blue:  parseInt(h.slice(4,6), 16) / 255,
  };
}

function ptToEmu(pt) { return Math.round(pt * 12700); }
function inToEmu(inches) { return Math.round(inches * 914400); }

function makeRect(x, y, w, h) {
  return {
    size: { width: { emu: inToEmu(w) }, height: { emu: inToEmu(h) } },
    transform: { translateX: inToEmu(x), translateY: inToEmu(y), scaleX: 1, scaleY: 1, unit: 'EMU' },
  };
}

function shapeRequest(objectId, x, y, w, h, fillHex, strokeHex) {
  const requests = [
    {
      createShape: {
        objectId,
        shapeType: 'RECTANGLE',
        elementProperties: { pageObjectId: '{{PAGE_ID}}', ...makeRect(x, y, w, h) },
      },
    },
    {
      updateShapeProperties: {
        objectId,
        shapeProperties: {
          shapeBackgroundFill: { solidFill: { color: { rgbColor: rgbFromHex(fillHex) } } },
          outline: strokeHex
            ? { outlineFill: { solidFill: { color: { rgbColor: rgbFromHex(strokeHex) } } }, weight: { magnitude: 9525, unit: 'EMU' } }
            : { dashStyle: 'NONE' },
        },
        fields: 'shapeBackgroundFill,outline',
      },
    },
  ];
  return requests;
}

function textRequest(objectId, text, x, y, w, h, opts = {}) {
  const { fontSize = 7, bold = false, colorHex = '555555', align = 'LEFT' } = opts;
  return [
    {
      createShape: {
        objectId,
        shapeType: 'TEXT_BOX',
        elementProperties: { pageObjectId: '{{PAGE_ID}}', ...makeRect(x, y, w, h) },
      },
    },
    {
      insertText: { objectId, text },
    },
    {
      updateTextStyle: {
        objectId,
        style: {
          fontSize: { magnitude: fontSize, unit: 'PT' },
          bold,
          foregroundColor: { opaqueColor: { rgbColor: rgbFromHex(colorHex) } },
        },
        fields: 'fontSize,bold,foregroundColor',
      },
    },
    {
      updateParagraphStyle: {
        objectId,
        style: { alignment: align },
        fields: 'alignment',
      },
    },
  ];
}

async function buildRequests(cfg, pageId) {
  const LABEL_COL_W = 1.4;
  const MONTH_W     = (10 - LABEL_COL_W) / 12;
  const ROW_H       = 0.28;
  const RELEASE_Y   = 0.4;
  const MONTHS_Y    = 0.65;
  const BODY_Y      = 0.9;
  const LEGEND_Y    = 5.2;

  let requests = [];
  let uid = 0;
  const id = (prefix) => `${prefix}_${uid++}`;

  const applyPageId = (reqs) =>
    reqs.map(r => JSON.parse(JSON.stringify(r).replace(/\{\{PAGE_ID\}\}/g, pageId)));

  // Title
  const titleName = document.getElementById('roadmap-name')?.value || state.currentRoadmapName || 'Deployment Roadmap';
  requests.push(...applyPageId(textRequest(id('title'), titleName, 0.1, 0, 9.8, RELEASE_Y, { fontSize: 16, bold: true, colorHex: '232F3E' })));

  // Release bands
  cfg.releases.forEach(rel => {
    const x = LABEL_COL_W + rel.start * MONTH_W;
    const w = (rel.end - rel.start + 1) * MONTH_W;
    requests.push(...applyPageId(shapeRequest(id('rel'), x, RELEASE_Y, w, 0.25, hexNoHash(rel.bg), 'CCCCCC')));
    requests.push(...applyPageId(textRequest(id('relt'), rel.label, x, RELEASE_Y, w, 0.25, { fontSize: 7, colorHex: '555555', align: 'CENTER' })));
  });

  // Month headers
  requests.push(...applyPageId(textRequest(id('wfhdr'), 'Workstream / Feature', 0, MONTHS_Y, LABEL_COL_W, 0.25, { fontSize: 7, bold: true, colorHex: '444444' })));
  cfg.months.forEach((m, i) => {
    const x = LABEL_COL_W + i * MONTH_W;
    const isCurrent = i === cfg.currentMonth;
    requests.push(...applyPageId(shapeRequest(id('mhdr'), x, MONTHS_Y, MONTH_W, 0.25, isCurrent ? 'FF9900' : 'F5F5F5', 'DDDDDD')));
    requests.push(...applyPageId(textRequest(id('mhdrt'), m, x, MONTHS_Y, MONTH_W, 0.25, { fontSize: 7, colorHex: isCurrent ? 'FFFFFF' : '666666', bold: isCurrent, align: 'CENTER' })));
  });

  // Feature rows
  let currentY = BODY_Y;
  state.workstreams.forEach(ws => {
    const wsFeatures = state.features.filter(f => f.ws === ws.id);
    if (wsFeatures.length === 0 || currentY + ROW_H > LEGEND_Y - 0.1) return;

    requests.push(...applyPageId(shapeRequest(id('wsrow'), 0, currentY, 10, ROW_H, 'F0F0F0', 'DDDDDD')));
    requests.push(...applyPageId(textRequest(id('wsname'), ws.name, 0.26, currentY, LABEL_COL_W - 0.3, ROW_H, { fontSize: 8, bold: true, colorHex: '333333' })));
    currentY += ROW_H;

    wsFeatures.forEach(f => {
      if (currentY + ROW_H > LEGEND_Y - 0.1) return;
      const st = cfg.statuses.find(s => s.id === f.status) || cfg.statuses[cfg.statuses.length - 1];

      requests.push(...applyPageId(textRequest(id('fname'), f.name, 0.05, currentY, LABEL_COL_W - 0.1, ROW_H, { fontSize: 7, colorHex: '555555' })));

      const barX = LABEL_COL_W + f.start * MONTH_W + 0.03;
      const barW = Math.max((f.end - f.start + 1) * MONTH_W - 0.06, 0.1);
      requests.push(...applyPageId(shapeRequest(id('bar'), barX, currentY + 0.04, barW, ROW_H - 0.08, hexNoHash(st.fill), hexNoHash(st.color))));
      requests.push(...applyPageId(textRequest(id('bart'), f.name, barX + 0.04, currentY + 0.04, barW - 0.08, ROW_H - 0.08, { fontSize: 6, colorHex: hexNoHash(st.color) })));

      currentY += ROW_H;
    });
  });

  // Legend
  let legendX = 0.1;
  cfg.statuses.forEach(s => {
    if (legendX + 1.55 > 10) return;
    requests.push(...applyPageId(shapeRequest(id('ldot'), legendX, LEGEND_Y + 0.04, 0.1, 0.1, hexNoHash(s.color), hexNoHash(s.color))));
    requests.push(...applyPageId(textRequest(id('llbl'), s.label, legendX + 0.15, LEGEND_Y, 1.35, 0.2, { fontSize: 7, colorHex: '555555' })));
    legendX += 1.55;
  });

  return requests;
}

export async function exportToGoogleSlides() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) {
    alert('Google Slides export is not configured yet.\n\nTo enable it:\n1. Create a GCP project with the Slides API enabled\n2. Add your OAuth Client ID to a .env file as VITE_GOOGLE_CLIENT_ID\n\nSee .env.example for details.');
    return;
  }

  const btn = document.getElementById('btn-google-slides');
  if (btn) { btn.disabled = true; btn.textContent = 'Exporting…'; }

  try {
    await ensureLibsLoaded();
    await getAccessToken();

    const cfg = getConfig();
    const titleName = document.getElementById('roadmap-name')?.value || state.currentRoadmapName || 'Deployment Roadmap';

    // Create a blank presentation
    const createResp = await window.gapi.client.slides.presentations.create({ title: titleName });
    const presentation = createResp.result;
    const presentationId = presentation.presentationId;
    const pageId = presentation.slides[0].objectId;

    // Set slide size to widescreen (10" x 5.63")
    await window.gapi.client.slides.presentations.batchUpdate({
      presentationId,
      resource: {
        requests: [{
          updatePageProperties: {
            objectId: pageId,
            pageProperties: {
              pageSize: {
                width:  { magnitude: inToEmu(10),   unit: 'EMU' },
                height: { magnitude: inToEmu(5.63),  unit: 'EMU' },
              },
            },
            fields: 'pageSize',
          },
        }],
      },
    });

    // Delete the default placeholder text boxes
    const placeholders = presentation.slides[0].pageElements || [];
    if (placeholders.length > 0) {
      await window.gapi.client.slides.presentations.batchUpdate({
        presentationId,
        resource: {
          requests: placeholders.map(el => ({ deleteObject: { objectId: el.objectId } })),
        },
      });
    }

    // Build and apply all content requests
    const requests = await buildRequests(cfg, pageId);
    if (requests.length > 0) {
      await window.gapi.client.slides.presentations.batchUpdate({
        presentationId,
        resource: { requests },
      });
    }

    // Share with "anyone with link can view"
    await window.gapi.client.drive.permissions.create({
      fileId: presentationId,
      resource: { role: 'reader', type: 'anyone' },
    });

    window.open(`https://docs.google.com/presentation/d/${presentationId}/edit`, '_blank');
  } catch (err) {
    console.error('Google Slides export failed:', err);
    alert(`Export failed: ${err.message}`);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Export to Google Slides'; }
  }
}
