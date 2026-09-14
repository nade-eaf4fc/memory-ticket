import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import { selectedPalette } from './palette.js';
import { cropRect, photoBounds } from './crop.js';
import { ticketLabels } from './labels.js';

export const WIDTH = 1800, HEIGHT = 900;
export const INK = '#282b30', PAPER = '#fbfaf6';
export const SANS = '"Manrope Variable", "Noto Sans JP Variable", sans-serif';
export const MONO = '"IBM Plex Mono", "Noto Sans JP Variable", monospace';
export const createBrowserCanvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h });

export function validate(state) {
  if (['QR', 'Both'].includes(state.code) && !state.qr.trim()) return 'QRにURLまたは文字列を入力してください。';
  if (state.qr.length > 500) return 'QRは500文字以内で入力してください。';
  if (['Barcode', 'Both'].includes(state.code) && !/^[\x20-\x7e]{1,24}$/.test(state.barcode)) return 'バーコードは半角英数字・記号を1〜24文字で入力してください。';
  return '';
}

export function renderTicket(state, createCanvas = createBrowserCanvas, resolution = 1) {
  if (!Number.isFinite(resolution) || resolution <= 0 || resolution > 4) throw new Error('Unsupported render resolution');
  const layers = [], regions = {};
  const labels = ticketLabels(state);
  const back = state.face === 'back';
  const leftStub = back ? state.side !== 'left' : state.side === 'left';
  const bx = leftStub ? 390 : 0, sx = leftStub ? 0 : 1410;
  const seam = leftStub ? 390 : 1410;
  const output = createCanvas(Math.round(WIDTH * resolution), Math.round(HEIGHT * resolution)), composite = output.getContext('2d');
  const colors = selectedPalette(state);
  let error = validate(state);

  function layer(name, key, bounds, draw) {
    let [x, y, w, h] = bounds.map(Math.round);
    const left = Math.round(x * resolution), top = Math.round(y * resolution);
    const canvas = createCanvas(Math.ceil((x + w) * resolution) - left, Math.ceil((y + h) * resolution) - top), c = canvas.getContext('2d');
    c.setTransform(resolution, 0, 0, resolution, -left, -top);
    c.imageSmoothingQuality = 'high';
    c.beginPath(); c.roundRect(0, 0, WIDTH, HEIGHT, 18);
    for (const cy of [0, HEIGHT]) { c.moveTo(seam + 23, cy); c.arc(seam, cy, 23, 0, Math.PI * 2); }
    c.clip('evenodd');
    draw(c);
    layers.push({ name, canvas, left, top });
    composite.drawImage(canvas, left, top);
    if (key) (regions[key] ??= []).push([x, y, w, h]);
  }
  function text(name, key, value, x, baseline, size, maxWidth, font = SANS, weight = 500, tracking = 0) {
    if (!value) return;
    let textWidth = maxWidth;
    layer(name, key, [x - 5, Math.max(0, baseline - size * 1.5), maxWidth + 10, size * 2], c => {
      c.fillStyle = INK;
      const setFont = () => { c.font = `${weight} ${size}px ${font}`; c.letterSpacing = `${tracking}px`; };
      setFont();
      while (c.measureText(value).width > maxWidth && size > 12) { size--; setFont(); }
      textWidth = c.measureText(value).width;
      c.fillText(value, x, baseline, maxWidth);
    });
    if (key) regions[key][regions[key].length - 1] = [x - 7, baseline - size * 1.12, Math.min(maxWidth, textWidth) + 14, size * 1.4];
  }
  layer('01 · Background', 'color', [bx, 0, 1410, 900], c => {
    if (state.style === 'Pastel') {
      const gradient = c.createLinearGradient(bx, 0, bx + 1300, 1000);
      colors.forEach((color, i) => gradient.addColorStop([0, .58, 1][i], color));
      c.fillStyle = gradient;
    } else c.fillStyle = state.color !== 'auto' ? colors[0] : state.style === 'Museum' ? '#e7e9e5' : '#e9d8b5';
    if (back) c.fillStyle = PAPER;
    c.fillRect(bx, 0, 1410, 900);
  });
  layer('02 · Stub paper', 'side', [sx, 0, 390, 900], c => {
    const gradient = c.createLinearGradient(sx, 0, sx + 390, 900);
    colors.forEach((color, i) => gradient.addColorStop([0, .58, 1][i], color));
    c.fillStyle = back ? gradient : PAPER; c.fillRect(sx, 0, 390, 900);
  });
  if (state.image) {
    const [x, y, w, h] = photoBounds(state);
    layer('03 · Photograph', 'image', [bx + x, y, w, h], c => {
      c.drawImage(state.image, ...cropRect(state.image, w, h, state.crop), bx + x, y, w, h);
    });
  }
  layer('04 · Rules and perforation', null, [0, 0, WIDTH, HEIGHT], c => {
    c.strokeStyle = '#282b3040'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(bx + 64, back ? 790 : 690); c.lineTo(bx + 1346, back ? 790 : 690);
    c.moveTo(sx + 52, 151); c.lineTo(sx + 338, 151); c.stroke();
    c.setLineDash([6, 10]); c.beginPath(); c.moveTo(seam, 30); c.lineTo(seam, 870); c.stroke();
    if (state.style === 'Retro') {
      c.setLineDash([]); c.strokeStyle = '#282b3060'; c.strokeRect(bx + 35, 29, 1340, 842);
    }
  });
  text('05 · Collection label', 'headerLabel', labels.headerLabel, bx + 64, 59, 19, 990, MONO, 400, 1);
  text('06 · Serial / header', 'headerSerial', labels.headerSerial, bx + 1080, 59, 18, 266, MONO);
  const titleFont = state.style === 'Museum' ? 'Georgia, "Noto Sans JP Variable", serif' : state.style === 'Retro' ? MONO : SANS;
  if (back) {
    const x = bx + (state.image ? 720 : 96), width = state.image ? 600 : 1180;
    text('07 · Back title', 'title', state.title, x, 220, 48, width, titleFont, 600, -.8);
    if (state.subtitle) layer('08 · Back message', 'subtitle', [x, 265, width, 480], c => {
      const wrap = size => {
        c.font = `400 ${size}px ${SANS}`;
        const lines = [];
        for (const paragraph of state.subtitle.split('\n')) {
          let line = '';
          for (const char of paragraph) {
            if (line && c.measureText(line + char).width > width) { lines.push(line); line = ''; }
            line += char;
          }
          lines.push(line);
        }
        return lines;
      };
      let size = 28, lines = wrap(size);
      while (lines.length * size * 1.65 > 470 && size > 12) lines = wrap(--size);
      if (lines.length * size * 1.65 > 470) error = '裏面の文章が長すぎます。文章や改行を減らしてください。';
      c.fillStyle = INK;
      lines.forEach((line, i) => c.fillText(line, x, 265 + size + i * size * 1.65));
    });
  } else {
    text('07 · Title', 'title', state.title, bx + 61, 777, 74, 1282, titleFont, state.style === 'Museum' ? 400 : 600, -1.5);
    text('08 · Subtitle', 'subtitle', state.subtitle, bx + 65, 821, 25, 1278, SANS, 400);
  }
  text('09 · Metadata', 'metadata', state.metadata, bx + 65, 864, 18, 1278, MONO, 400, .5);
  text('10 · Stub wordmark', 'stubBrand', labels.stubBrand, sx + 50, 80, 42, 290, SANS, 700, -1);
  text('11 · Stub caption', 'stubCaption', labels.stubCaption, sx + 52, 117, 16, 286, MONO, 400, .5);
  text('12 · Edition label', 'editionLabel', labels.editionLabel, sx + 52, 210, 18, 286, MONO, 400, 1);
  text('13 · Serial / stub', 'stubSerial', labels.stubSerial, sx + 50, 264, 46, 290, MONO, 400);
  const qrOn = ['QR', 'Both'].includes(state.code), barOn = ['Barcode', 'Both'].includes(state.code);
  if (!error && qrOn) {
    const qr = QRCode.create(state.qr, { errorCorrectionLevel: 'M' });
    const count = qr.modules.size, unit = Math.floor((barOn ? 252 : 288) / (count + 8)), size = unit * (count + 8);
    const x = Math.round(sx + (390 - size) / 2), y = barOn ? 306 : 328;
    layer('14 · QR code', 'qr', [x, y, size, size], c => {
      c.fillStyle = PAPER; c.fillRect(x, y, size, size); c.fillStyle = INK;
      for (let r = 0; r < count; r++) for (let col = 0; col < count; col++) {
        if (qr.modules.get(r, col)) c.fillRect(x + (col + 4) * unit, y + (r + 4) * unit, unit, unit);
      }
    });
  }
  if (!error && barOn) {
    const bar = createCanvas(1, 1);
    JsBarcode(bar, state.barcode, { format: 'CODE128', width: 1, height: qrOn ? 92 : 160, displayValue: false, margin: 10, background: PAPER, lineColor: INK });
    const scale = Math.max(1, Math.floor(330 / bar.width)), w = bar.width * scale;
    const x = Math.round(sx + (390 - w) / 2), y = qrOn ? 576 : 367;
    layer('15 · Barcode', 'barcode', [x, y, w, bar.height], c => { c.imageSmoothingEnabled = false; c.drawImage(bar, x, y, w, bar.height); });
    text('16 · Barcode value', 'barcodeLabel', labels.barcodeLabel, sx + 45, qrOn ? 724 : 591, 18, 300, MONO);
  }
  if (state.code === 'None') {
    text('14 · Admission label', 'admissionTop', labels.admissionTop, sx + 50, 436, 62, 290, SANS, 600, -1);
    text('15 · Admission count', 'admissionBottom', labels.admissionBottom, sx + 50, 505, 62, 290, SANS, 600, -1);
  }
  text('17 · Date', 'dateLabel', labels.dateLabel, sx + 50, 807, 29, 290, MONO, 400);
  text('18 · Style label', 'footerLabel', labels.footerLabel, sx + 52, 857, 18, 286, MONO, 400, .5);
  regions.serial = [...(state.labels?.headerSerial === undefined ? regions.headerSerial || [] : []), ...(state.labels?.stubSerial === undefined ? regions.stubSerial || [] : [])];
  if (state.labels?.dateLabel === undefined) regions.date = regions.dateLabel;
  regions.code = [[sx + 30, 295, 330, 446]];
  return { canvas: output, layers, regions, error };
}
