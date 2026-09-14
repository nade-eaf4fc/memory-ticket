import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import { initializeCanvas, readPsd } from 'ag-psd';
import jsQR from 'jsqr';
import { renderTicket, validate } from '../src/ticket.js';
import { psdBlob, shareSupported } from '../src/export.js';
import { extractPalette } from '../src/palette.js';

initializeCanvas(createCanvas);
GlobalFonts.registerFromPath('node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2', 'Manrope Variable');
GlobalFonts.registerFromPath('node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2', 'IBM Plex Mono');
const image = await loadImage('public/sample.jpg');
const state = { style: 'Pastel', color: 'iris', side: 'right', code: 'Both', title: 'A MOMENT, KEPT.', subtitle: 'September light / a personal collection', date: '2026-09-14', serial: '001042', metadata: 'PERSONAL ARCHIVE / VOL. 01', qr: 'https://example.com/trace?edition=1042', barcode: 'TRACE-1042', image, palette: ['#dce3f0', '#f1e2df', '#e8e1f5'] };
await mkdir('work/qa', { recursive: true });
for (const side of ['left', 'right']) {
  for (const code of ['None', 'QR', 'Barcode', 'Both']) {
    const scene = renderTicket({ ...state, side, code }, createCanvas);
    assert.equal(scene.error, '');
    if (code === 'QR' || code === 'Both') {
      const data = scene.canvas.getContext('2d').getImageData(0, 0, 1800, 900);
      const decoded = jsQR(new Uint8ClampedArray(data.data), 1800, 900);
      assert.equal(decoded?.data, state.qr, `${side} ${code} QR must decode from final ticket`);
    }
    assert.equal(scene.canvas.getContext('2d').getImageData(side === 'left' ? 390 : 1410, 0, 1, 1).data[3], 0);
  }
}
const scene = renderTicket(state, createCanvas);
await writeFile('work/qa/ticket.png', scene.canvas.toBuffer('image/png'));
const blob = await psdBlob(scene), bytes = Buffer.from(await blob.arrayBuffer());
await writeFile('work/qa/ticket.psd', bytes);
const decoded = readPsd(bytes);
assert.equal(decoded.width, 1800); assert.equal(decoded.height, 900);
assert.equal(decoded.children.length, scene.layers.length);
for (const resolution of [2, 3]) {
  const large = renderTicket(state, createCanvas, resolution);
  const pngBytes = large.canvas.toBuffer('image/png');
  assert.equal(pngBytes.readUInt32BE(16), 1800 * resolution);
  assert.equal(pngBytes.readUInt32BE(20), 900 * resolution);
  const [x, y, w, h] = large.regions.qr[0].map(v => v * resolution);
  const pixels = large.canvas.getContext('2d').getImageData(x, y, w, h);
  assert.equal(jsQR(new Uint8ClampedArray(pixels.data), w, h)?.data, state.qr);
  const psd = readPsd(Buffer.from(await (await psdBlob(large)).arrayBuffer()), { skipLayerImageData: true, skipCompositeImageData: true });
  assert.equal(psd.width, 1800 * resolution);
  assert.equal(psd.height, 900 * resolution);
  assert.equal(psd.children.length, scene.layers.length);
  for (let i = 0; i < large.layers.length; i++) {
    assert.equal(large.layers[i].left, scene.layers[i].left * resolution);
    assert.equal(large.layers[i].top, scene.layers[i].top * resolution);
    assert.equal(large.layers[i].canvas.width, scene.layers[i].canvas.width * resolution);
  }
}
for (const name of ['03 · Photograph', '07 · Title', '14 · QR code', '15 · Barcode']) assert(decoded.children.some(l => l.name === name));
assert.equal(validate({ ...state, barcode: '日本語' }).length > 0, true);
assert.equal(validate({ ...state, qr: '' }).length > 0, true);
assert.equal(shareSupported({}, { share() {}, canShare() { return true; } }), true);
assert.equal(shareSupported({}, { share() {}, canShare() { throw Error(); } }), false);
assert.equal(shareSupported({}, {}), false);
const red = createCanvas(64, 64), rc = red.getContext('2d'); rc.fillStyle = '#dc3040'; rc.fillRect(0, 0, 64, 64);
assert(extractPalette(red, createCanvas)[0].startsWith('hsl(354 '));
console.log(`PASS: 8 ticket configurations, 3 PNG/PSD resolutions, scaled layer positions, final-image QR decoding, transparent notches, ${scene.layers.length} PSD layers, input errors, palette hue, and share capability branches.`);

// Back faces preserve physical cutouts, optional content, and export layers.
for (const side of ['left', 'right']) {
  for (const photo of [null, image]) {
    for (const subtitle of ['', 'A quiet afternoon.\nA place to remember.']) {
      const back = renderTicket({ ...state, face: 'back', side, image: photo, title: '', subtitle }, createCanvas);
      assert.equal(back.error, '');
      assert.equal(back.layers.some(layer => layer.name === '03 · Photograph'), !!photo);
      assert.equal(back.layers.some(layer => layer.name === '08 · Back message'), !!subtitle);
      const pixels = back.canvas.getContext('2d').getImageData(0, 0, 1800, 900);
      assert.equal(jsQR(new Uint8ClampedArray(pixels.data), 1800, 900)?.data, state.qr);
      assert.equal(back.canvas.getContext('2d').getImageData(side === 'left' ? 1410 : 390, 0, 1, 1).data[3], 0);
    }
  }
}
const back = renderTicket({ ...state, face: 'back', title: 'BEHIND THE MOMENT', subtitle: 'A quiet afternoon.\nA place to remember.', crop: { x: .15, y: .8, zoom: 1.8 } }, createCanvas);
await writeFile('work/qa/back.png', back.canvas.toBuffer('image/png'));
const backPsd = readPsd(Buffer.from(await (await psdBlob(back)).arrayBuffer()));
assert(backPsd.children.some(layer => layer.name === '08 · Back message'));
assert.equal(renderTicket({ ...state, face: 'back', subtitle: '\n'.repeat(100) }, createCanvas).error.length > 0, true);
const { cropRect } = await import('../src/crop.js');
for (const crop of [{ x: 0, y: 0, zoom: 1 }, { x: 1, y: 1, zoom: 4 }]) {
  const [x,y,w,h] = cropRect(image, 590, 584, crop);
  assert(x >= 0 && y >= 0 && x + w <= image.width + .001 && y + h <= image.height + .001);
  assert(Math.abs(w / h - 590 / 584) < .0001);
}
console.log('Back faces, optional content, crop bounds, and layered PSD passed.');

const { labelFields, ticketLabels } = await import('../src/labels.js');
const blankLabels = Object.fromEntries(labelFields.map(([key]) => [key, '']));
for (const face of ['front', 'back']) {
  for (const code of ['None', 'Both']) {
    const blank = renderTicket({ ...state, face, code, title: '', subtitle: '', metadata: '', labels: blankLabels }, createCanvas);
    assert(blank.layers.every(layer => !/label|Serial|Title|Subtitle|Metadata|wordmark|caption|Edition|value|Date|message|count/i.test(layer.name)), 'Empty labels must not leave text layers');
    const edited = renderTicket({ ...state, face, code, labels: { headerSerial: 'CUSTOM 42', stubBrand: 'MY ARCHIVE', dateLabel: 'AUTUMN 2026' } }, createCanvas);
    assert(edited.regions.headerSerial && edited.regions.stubBrand && edited.regions.dateLabel);
    assert.equal(ticketLabels({ ...state, face, labels: { headerSerial: '' } }).headerSerial, '');
  }
}
assert.equal(ticketLabels({ ...state, serial: '9000' }).headerSerial, 'NO. 9000');
assert.equal(ticketLabels({ ...state, serial: '9000', labels: { headerSerial: 'CUSTOM' } }).headerSerial, 'CUSTOM');
console.log('All ticket labels can be overridden or removed independently on both faces.');
