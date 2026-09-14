import assert from 'node:assert/strict';
import { CONFIG_VERSION, configToCsv, csvToConfig } from '../src/config-csv.js';

const config = {
  activeFace: 'back',
  style: 'Pastel',
  color: 'custom',
  palette: ['hsl(210 24% 84%)', 'hsl(12 20% 90%)', 'hsl(274 18% 87%)'],
  customColors: ['#d9cef1', '#f6d8c3', '#cbe8e2'],
  side: 'left',
  code: 'Both',
  resolution: 3,
  date: '2026-09-14',
  serial: '001042',
  qr: 'https://example.com/a,b?x="quoted"',
  barcode: 'TRACE-1042',
  front: {
    title: 'A MOMENT, "KEPT".',
    subtitle: 'line 1, with comma\nline 2',
    metadata: 'PERSONAL ARCHIVE / VOL. 01',
    filename: 'front,photo.jpg',
    crop: { x: .12, y: .85, zoom: 2.4 },
    labels: { headerLabel: 'CUSTOM, HEADER', stubBrand: 'MY "ARCHIVE"' },
  },
  back: {
    title: 'BEHIND THE MOMENT',
    subtitle: 'A note\nwith two lines.',
    metadata: '',
    filename: 'back.jpg',
    crop: { x: .5, y: .25, zoom: 1.3 },
    labels: { dateLabel: 'AUTUMN 2026' },
  },
};

const csv = configToCsv(config);
assert(csv.startsWith('\uFEFFformat,version,'));
const restored = csvToConfig(csv);
assert.equal(restored.version, CONFIG_VERSION);
assert.deepEqual(restored, { version: CONFIG_VERSION, ...config });

const future = csv.replace(',1,back,', ',999,back,');
assert.throws(() => csvToConfig(future), /新しいversion 999/);
assert.throws(() => csvToConfig('format,version\r\nother,1\r\n'), /MEMORY TICKET/);

console.log(`CSV configuration version ${CONFIG_VERSION} round-trip and version guards passed.`);
