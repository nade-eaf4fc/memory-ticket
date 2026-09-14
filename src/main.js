import '@fontsource-variable/manrope';
import '@fontsource-variable/noto-sans-jp';
import '@fontsource/ibm-plex-mono/latin-400.css';
import './style.css';
import { palettes, extractPalette } from './palette.js';
import { renderTicket, createBrowserCanvas, SANS, MONO } from './ticket.js';
import { pngBlob, psdBlob, shareSupported, fileStem } from './export.js';
import { attachTilt } from './tilt.js';
import { attachCropDialog, defaultCrop } from './crop.js';
import { labelFields, ticketLabels } from './labels.js';
import { CONFIG_VERSION, configToCsv, csvToConfig } from './config-csv.js';

const $ = selector => document.querySelector(selector);
const state = {
  style: 'Pastel', color: 'auto', side: 'right', code: 'QR', title: 'A MOMENT, KEPT.',
  subtitle: '日々の景色を、一枚に。', date: '2026-09-14', serial: '001042',
  metadata: 'PERSONAL ARCHIVE / VOL. 01', qr: 'https://example.com', barcode: '260914-001042',
  image: null, palette: palettes[0].colors, customColors: palettes.find(p => p.id === 'custom').colors.slice(), resolution: 2, face: 'front', crop: defaultCrop(), labels: {},
};
const faceKeys = ['image', 'crop', 'title', 'subtitle', 'metadata', 'filename', 'labels'];
const faces = { front: {}, back: { image: null, crop: defaultCrop(), title: '', subtitle: '', metadata: '', filename: '', labels: {} } };
let flipping = false;
$('#app').innerHTML = `
  <header><div class="brand">MEMORY<span>TICKET</span></div><span class="edition">A LITTLE PIECE OF YOUR WORLD.</span></header>
  <main>
    <section class="workspace" aria-label="チケットのプレビューと保存">
      <div class="preview-heading"><span class="eyebrow" id="style-caption">PASTEL / 01</span><label class="resolution-control"><span>保存サイズ</span><select id="resolution" aria-label="保存解像度"><option value="1">1800 × 900 · 標準</option><option value="2" selected>3600 × 1800 · 高画質</option><option value="3">5400 × 2700 · 最高画質</option></select></label></div>
      <div class="face-toolbar"><div class="face-tabs" aria-label="編集する面"><button data-face="front" aria-pressed="true">表</button><button data-face="back" aria-pressed="false">裏</button></div><button id="flip" class="text-button">↻ 裏面を見る</button></div>
      <div class="stage"><div class="ticket-wrap"><canvas id="ticket" width="1800" height="900" aria-label="編集中のチケット"></canvas><div id="focus-overlay" aria-hidden="true"></div></div></div>
      <div class="image-actions"><button id="share" class="button secondary" disabled><span aria-hidden="true">↗</span> SNSに投稿</button><button id="export" class="button primary" disabled><span aria-hidden="true">↓</span> PNG保存</button></div>
      <p id="status" class="status" role="status" aria-live="polite"></p>
      <a id="download-again" class="download-again hidden">保存が始まらない場合はこちら</a>
      <details class="layer-export"><summary>レイヤーで保存 <span>＋</span></summary><div class="layer-content"><button id="psd" class="button secondary" disabled>PSDを保存</button><p>背景・画像・文字・コードを要素ごとの画像レイヤーに分けます。文字の再入力はこの画面で行えます。</p><details class="clip-help"><summary>CLIP STUDIOで使うには</summary><p>PSDをCLIP STUDIO PAINTで開き、「別名で保存」で .clip を選びます。CLIPファイルの直接出力には未対応です。</p></details></div></details>
      <details class="layer-export"><summary>設定を保存・復元 <span>＋</span></summary><div class="layer-content"><div class="image-actions"><button id="config-export" class="button secondary">CSVを保存</button><button id="config-import" class="button secondary">CSVを読み込む</button></div><input id="config-file" class="hidden" type="file" accept=".csv,text/csv"><p>設定CSV version ${CONFIG_VERSION}。文字・色・コード・表裏・トリミングなどを保存します。画像そのものはCSVに含まれないため、復元後に同じ画像を再選択してください。</p></div></details>
    </section>
    <aside class="editor" aria-label="チケットの編集">
      <div class="editor-intro"><span class="eyebrow">MAKE IT YOURS</span><span class="editor-mark" aria-hidden="true">01—</span></div>
      <label class="upload" data-focus="image"><span class="upload-icon" aria-hidden="true">＋</span><span>画像を選ぶ<small id="filename">または、ここにドロップ</small></span><input id="upload" type="file" accept="image/jpeg,image/png,image/webp,image/avif"></label>
      <div class="photo-actions"><button id="crop-image" class="text-button" disabled>トリミング</button><button id="remove-image" class="text-button" disabled>画像を削除</button></div>
      <label class="field title-field">タイトル<input id="title" maxlength="80" value="A MOMENT, KEPT." data-focus="title" autocomplete="off"></label>
      <label class="field hidden" id="back-message-field">裏面の文章 <small>任意</small><textarea id="back-message" data-focus="subtitle" maxlength="600" rows="5" placeholder="この一枚のことを、自由に。"></textarea></label>
      <p class="privacy">画像はこのブラウザー内だけで処理します。</p>
      <details class="advanced" id="design-options"><summary>色・レイアウト <span>＋</span></summary><div class="detail-content">
        <fieldset class="color-field" data-focus="color"><legend>パステルカラー</legend><div class="color-grid">${palettes.map(p => `<button type="button" class="palette-option ${p.id === 'auto' ? 'active' : ''}" data-color="${p.id}" data-focus="color" aria-pressed="${p.id === 'auto'}"><i style="background:linear-gradient(120deg,${p.colors.join(',')})"></i><span>${p.name}</span></button>`).join('')}</div><div id="custom-colors" hidden style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px"><label class="field">Color 1<input type="color" data-custom-color="0" data-focus="color" aria-label="カスタムカラー1" value="#d9cef1" style="height:44px;padding:4px"></label><label class="field">Color 2<input type="color" data-custom-color="1" data-focus="color" aria-label="カスタムカラー2" value="#f6d8c3" style="height:44px;padding:4px"></label><label class="field">Color 3<input type="color" data-custom-color="2" data-focus="color" aria-label="カスタムカラー3" value="#cbe8e2" style="height:44px;padding:4px"></label></div></fieldset>
        <label class="field">スタイル<select id="style" data-focus="style">${['Pastel', 'Museum', 'Retro'].map(s => `<option>${s}</option>`).join('')}</select></label>
        <label class="field">半券の位置<select id="side" data-focus="side"><option value="right">右側</option><option value="left">左側</option></select></label>
      </div></details>
      <details class="advanced" id="text-options"><summary>文字・日付 <span>＋</span></summary><div class="detail-content">
        <label class="field">サブタイトル<input id="subtitle" data-focus="subtitle" maxlength="100" value="日々の景色を、一枚に。"></label>
        <div class="row"><label class="field">日付<input id="date" type="date" data-focus="date" value="2026-09-14"></label><label class="field">シリアル<input id="serial" data-focus="serial" maxlength="24" value="001042"></label></div>
        <label class="field">小さな情報<input id="metadata" data-focus="metadata" maxlength="120" value="PERSONAL ARCHIVE / VOL. 01"></label>
      </div></details>
      <details class="advanced" id="code-options"><summary>QR・バーコード <span>＋</span></summary><div class="detail-content">
        <label class="field">コード<select id="code" data-focus="code"><option>None</option><option selected>QR</option><option>Barcode</option><option>Both</option></select></label>
        <label class="field" id="qrfield">QRのURL・文字列<input id="qr" data-focus="qr" maxlength="500" value="https://example.com"></label>
        <label class="field hidden" id="barfield">バーコードの内容<input id="barcode" data-focus="barcode" maxlength="24" value="260914-001042"><small>半角英数字・記号、24文字まで</small></label>
      </div></details>
      <details class="advanced" id="label-options"><summary>券面の細かな文字 <span>＋</span></summary><div class="detail-content">
        <p class="label-help">表示中の面だけを編集します。空欄にすると非表示。「元に戻す」で日付や番号との連動も戻ります。</p>
        ${labelFields.map(([key, name, limit]) => `<div class="label-setting" data-label-setting="${key}"><label class="field" for="label-${key}">${name}<input id="label-${key}" data-label="${key}" data-focus="${key}" maxlength="${limit}" autocomplete="off"></label><button type="button" class="text-button" data-reset-label="${key}" aria-label="${name}を元に戻す">元に戻す</button></div>`).join('')}
      </div></details>
    </aside>
  </main>
  <footer class="site-footer"><span>© 2026 nade-eaf4fc</span><a href="https://github.com/nade-eaf4fc/memory-ticket" target="_blank" rel="noopener noreferrer">GitHub ↗</a></footer>
  <dialog id="crop-dialog" aria-labelledby="crop-title"><div class="dialog-heading"><h2 id="crop-title">画像のトリミング</h2><button class="close" data-crop-cancel aria-label="キャンセル">×</button></div><p>画像をドラッグして位置を調整できます。</p><div class="crop-viewport"><canvas aria-label="トリミングのプレビュー"></canvas></div><label class="crop-control">拡大 <output>100%</output><input type="range" name="zoom" min="1" max="4" step=".01"></label><div class="crop-positions"><label class="crop-control">左右<input type="range" name="x" min="0" max="1" step=".005"></label><label class="crop-control">上下<input type="range" name="y" min="0" max="1" step=".005"></label></div><div class="crop-actions"><button data-crop-reset class="button secondary">中央に戻す</button><button data-crop-apply class="button primary">適用する</button></div></dialog>
  <dialog id="share-dialog" aria-labelledby="share-title"><div class="dialog-heading"><h2 id="share-title">この一枚を、シェア。</h2><button class="close" id="close-share" aria-label="閉じる">×</button></div><p>このブラウザーでは画像を直接共有できません。PNGを保存し、投稿画面に添付してください。</p><button id="share-save" class="button primary">1. PNGを保存</button><a id="share-x" class="button secondary" target="_blank" rel="noopener noreferrer">2. Xの投稿画面を開く ↗</a><small>画像の添付と投稿は、ご自身で行ってください。</small></dialog>
`;

const tilt = attachTilt($('.ticket-wrap'));
let scene, png, ready = false, busy = false, revision = 0, imageRevision = 0, focusKey = null;
let previewState, previewFrame = 0;
function drawPreview() {
  if (!previewState) return;
  const canvas = $('#ticket');
  const width = $('.ticket-interaction').clientWidth;
  const density = window.devicePixelRatio || 1;
  const pixels = Math.max(2, Math.min(7200, Math.floor(width * density / 2) * 2));
  // Keep an exact 2:1 bitmap and avoid even a one-pixel CSS downscale.
  $('.ticket-wrap').style.width = `${pixels / density}px`;
  const preview = renderTicket(previewState, createBrowserCanvas, pixels / 1800);
  canvas.width = preview.canvas.width; canvas.height = preview.canvas.height;
  canvas.getContext('2d').drawImage(preview.canvas, 0, 0);
}
function resizePreview() {
  cancelAnimationFrame(previewFrame);
  previewFrame = requestAnimationFrame(drawPreview);
}
new ResizeObserver(resizePreview).observe($('.ticket-interaction'));
window.addEventListener('resize', resizePreview);
function storeCurrentFace() {
  for (const key of faceKeys) faces[state.face][key] = state[key];
}
function filenameText() {
  if (!state.filename) return state.image ? '画像を変更' : '画像なし · 任意で追加';
  return state.image ? state.filename : `${state.filename} · 画像を再選択`;
}
function syncFaceUi() {
  for (const key of ['title', 'subtitle', 'metadata']) $('#' + key).value = state[key] ?? '';
  $('#back-message').value = state.subtitle ?? '';
  $('#filename').textContent = filenameText();
  $('#back-message-field').classList.toggle('hidden', state.face !== 'back');
  $('#subtitle').closest('label').classList.toggle('hidden', state.face === 'back');
  $('#title').placeholder = state.face === 'back' ? '裏面の見出し（任意）' : 'タイトル';
  $('#flip').textContent = state.face === 'back' ? '↻ 表面を見る' : '↻ 裏面を見る';
  $('#ticket').setAttribute('aria-label', state.face === 'back' ? '裏面のプレビュー' : '表面のプレビュー');
  document.querySelectorAll('[data-face]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.face === state.face)));
}
function syncCommonUi() {
  for (const key of ['date', 'serial', 'qr', 'barcode', 'side', 'code', 'style']) $('#' + key).value = state[key] ?? '';
  $('#resolution').value = String(state.resolution);
}
function normalizeCrop(crop) {
  const clamp = (value, min, max, fallback) => Number.isFinite(Number(value)) ? Math.max(min, Math.min(max, Number(value))) : fallback;
  return { x: clamp(crop?.x, 0, 1, .5), y: clamp(crop?.y, 0, 1, .5), zoom: clamp(crop?.zoom, 1, 4, 1) };
}
function configFace(face) {
  return {
    title: face?.title ?? '', subtitle: face?.subtitle ?? '', metadata: face?.metadata ?? '', filename: face?.filename ?? '',
    crop: normalizeCrop(face?.crop), labels: { ...(face?.labels ?? {}) },
  };
}
function currentConfig() {
  storeCurrentFace();
  return {
    activeFace: state.face, style: state.style, color: state.color, palette: state.palette.slice(), customColors: state.customColors.slice(),
    side: state.side, code: state.code, resolution: state.resolution, date: state.date, serial: state.serial, qr: state.qr, barcode: state.barcode,
    front: configFace(faces.front), back: configFace(faces.back),
  };
}
function validColor(value, fallback) {
  return typeof value === 'string' && value && globalThis.CSS?.supports?.('color', value) ? value : fallback;
}
async function applyConfig(config) {
  const styles = ['Pastel', 'Museum', 'Retro'], sides = ['left', 'right'], codes = ['None', 'QR', 'Barcode', 'Both'];
  if (!styles.includes(config.style)) throw new Error('CSVのスタイル設定が不正です。');
  if (!palettes.some(p => p.id === config.color)) throw new Error('CSVのカラー設定が不正です。');
  if (!sides.includes(config.side) || !codes.includes(config.code) || ![1, 2, 3].includes(config.resolution)) throw new Error('CSVのレイアウト設定が不正です。');
  ++imageRevision;
  const fallbackPalette = palettes[0].colors;
  state.style = config.style; state.color = config.color; state.side = config.side; state.code = config.code;
  state.resolution = config.resolution; state.date = config.date; state.serial = config.serial; state.qr = config.qr; state.barcode = config.barcode;
  state.palette = config.palette.map((color, i) => validColor(color, fallbackPalette[i]));
  const customDefault = palettes.find(p => p.id === 'custom').colors;
  state.customColors = config.customColors.map((color, i) => validColor(color, customDefault[i]));
  for (const face of ['front', 'back']) {
    const saved = configFace(config[face]);
    faces[face] = { ...saved, image: null };
  }
  state.face = config.activeFace === 'back' ? 'back' : 'front';
  Object.assign(state, faces[state.face], { face: state.face });
  syncCommonUi(); syncFaceUi(); focus(null);
  await render();
  const names = [faces.front.filename, faces.back.filename].filter(Boolean);
  status(`設定CSV v${config.version}を読み込みました。${names.length ? '画像は含まれないため、保存時と同じ画像を再選択してください。' : ''}`);
}
async function changeFace(face) {
  if (flipping || busy || face === state.face) return;
  flipping = true; setReady(false); tilt.suspend(true);
  $('.editor').inert = true;
  document.querySelectorAll('[data-face], #flip').forEach(button => button.disabled = true);
  const surface = $('.ticket-interaction');
  const motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let outgoing;
  try {
    if (motion) {
      outgoing = surface.animate([{ transform: 'perspective(1400px) rotateY(0deg)' }, { transform: 'perspective(1400px) rotateY(90deg)' }], { duration: 230, easing: 'ease-in', fill: 'forwards' });
      await outgoing.finished;
    }
    storeCurrentFace();
    Object.assign(state, faces[face], { face });
    syncFaceUi();
    focus(null); await render();
    outgoing?.cancel();
    if (motion) await surface.animate([{ transform: 'perspective(1400px) rotateY(-90deg)' }, { transform: 'perspective(1400px) rotateY(0deg)' }], { duration: 300, easing: 'ease-out' }).finished;
  } finally {
    outgoing?.cancel(); flipping = false; tilt.suspend(false); $('.editor').inert = false;
    document.querySelectorAll('[data-face], #flip').forEach(button => button.disabled = false);
    setReady(!!png && !scene?.error);
  }
}
document.querySelectorAll('[data-face]').forEach(button => button.onclick = () => changeFace(button.dataset.face));
$('#flip').onclick = () => changeFace(state.face === 'front' ? 'back' : 'front');
$('#back-message').addEventListener('input', event => { state.subtitle = event.target.value; render(); });
$('#remove-image').onclick = () => {
  ++imageRevision; state.image = null; state.crop = defaultCrop(); state.filename = '';
  $('#filename').textContent = '画像なし · 任意で追加'; render();
};
$('#crop-image').onclick = attachCropDialog($('#crop-dialog'), () => ({ ...state }), crop => { state.crop = crop; render(); });
let downloadUrl;
const actions = ['export', 'share', 'psd'];
function setReady(value) { ready = value; actions.forEach(id => $('#' + id).disabled = !value || busy || flipping); }
function status(message, error = false) { $('#status').textContent = message; $('#status').classList.toggle('error', error); }
function clearDownload() {
  $('#download-again').classList.add('hidden');
  if (downloadUrl) { URL.revokeObjectURL(downloadUrl); downloadUrl = null; }
}
function download(blob, extension, serial = state.serial, face = state.face) {
  clearDownload();
  downloadUrl = URL.createObjectURL(blob);
  const a = $('#download-again');
  a.href = downloadUrl; a.download = `${fileStem(serial)}-${face}.${extension}`;
  a.classList.remove('hidden'); a.click();
  status(`${extension.toUpperCase()}を作成しました。`);
}
function focus(key) {
  focusKey = key;
  const overlay = $('#focus-overlay'); overlay.replaceChildren();
  if (!scene || !key) return;
  const bounds = scene.regions[key];
  if (!bounds) return;
  for (const [x, y, w, h] of bounds) {
    const light = document.createElement('div'); light.className = 'focus-light';
    Object.assign(light.style, { left: `${x / 18}%`, top: `${y / 9}%`, width: `${w / 18}%`, height: `${h / 9}%` });
    overlay.append(light);
  }
}
async function render() {
  const id = ++revision;
  setReady(false); png = null; clearDownload(); status('');
  $('#qrfield').classList.toggle('hidden', !['QR', 'Both'].includes(state.code));
  $('#barfield').classList.toggle('hidden', !['Barcode', 'Both'].includes(state.code));
  $('#style-caption').textContent = state.style.toUpperCase() + (state.face === 'back' ? ' / 02' : ' / 01');
  const labels = ticketLabels(state);
  for (const [key] of labelFields) {
    $('#label-' + key).value = labels[key];
    const reset = document.querySelector(`[data-reset-label="${key}"]`);
    reset.disabled = state.labels[key] === undefined;
  }
  for (const key of ['admissionTop', 'admissionBottom']) document.querySelector(`[data-label-setting="${key}"]`).classList.toggle('hidden', state.code !== 'None');
  document.querySelector('[data-label-setting="barcodeLabel"]').classList.toggle('hidden', !['Barcode', 'Both'].includes(state.code));
  document.querySelectorAll('[data-color]').forEach(button => {
    const active = button.dataset.color === state.color;
    button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
  });
  $('[data-color="auto"] i').style.background = `linear-gradient(120deg,${state.palette.join(',')})`;
  $('[data-color="custom"] i').style.background = `linear-gradient(120deg,${state.customColors.join(',')})`;
  $('#custom-colors').hidden = state.color !== 'custom';
  document.querySelectorAll('[data-custom-color]').forEach(input => { input.value = state.customColors[Number(input.dataset.customColor)]; });
  $('#crop-image').disabled = $('#remove-image').disabled = !state.image;
  try {
    const characters = Object.values(labels).join('') || 'A';
    await Promise.all([document.fonts.load(`600 74px ${SANS}`, state.title || 'A'), document.fonts.load(`400 25px ${SANS}`, state.subtitle || 'あ'), document.fonts.load(`400 20px ${MONO}`, characters), document.fonts.load(`700 42px ${SANS}`, characters)]);
    if (id !== revision) return;
    scene = renderTicket(state, createBrowserCanvas, state.resolution);
    previewState = { ...state };
    drawPreview();
    focus(focusKey);
    if (scene.error) { status(scene.error, true); return; }
    const blob = await pngBlob(scene.canvas);
    if (id !== revision) return;
    png = new File([blob], `${fileStem(state.serial)}-${state.face}.png`, { type: 'image/png' });
    tilt.setMask(blob);
    setReady(true);
  } catch { if (id === revision) status('画像を作成できませんでした。入力内容を確認してください。', true); }
}

async function loadImage(file) {
  if (!file) return;
  if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) { status('PNG・JPEG・WebP・AVIFの画像を選んでください。', true); return; }
  if (file.size > 30 * 1024 * 1024) { status('30MB以下の画像を選んでください。', true); return; }
  const face = state.face;
  const keepCrop = !state.image && !!state.filename && state.filename === file.name;
  const id = ++imageRevision, url = URL.createObjectURL(file), image = new Image();
  setReady(false); status('画像を読み込んでいます…');
  try {
    image.src = url; await image.decode();
    if (id !== imageRevision || face !== state.face) return;
    if (image.width * image.height > 60000000) throw Error('large');
    state.image = image; state.crop = keepCrop ? normalizeCrop(state.crop) : defaultCrop(); state.filename = file.name;
    if (state.face === 'front') state.palette = extractPalette(image, createBrowserCanvas);
    $('#filename').textContent = file.name;
    await render();
  } catch { if (id === imageRevision) { setReady(!!png); status('画像を読み込めませんでした。別の画像をお試しください。', true); } }
  finally { URL.revokeObjectURL(url); }
}

for (const key of ['title', 'subtitle', 'date', 'serial', 'metadata', 'qr', 'barcode', 'side', 'code', 'style']) {
  $('#' + key).addEventListener('input', event => { state[key] = event.target.value; render(); });
}
document.querySelectorAll('[data-label]').forEach(input => input.addEventListener('input', () => {
  state.labels = { ...state.labels, [input.dataset.label]: input.value }; render();
}));
document.querySelectorAll('[data-reset-label]').forEach(button => button.addEventListener('click', () => {
  const key = button.dataset.resetLabel;
  state.labels = { ...state.labels }; delete state.labels[key];
  $('#label-' + key).focus(); render();
}));
$('#resolution').addEventListener('change', event => { state.resolution = Number(event.target.value); render(); });
document.querySelectorAll('[data-color]').forEach(button => button.addEventListener('click', () => { state.color = button.dataset.color; render(); }));
document.querySelectorAll('[data-custom-color]').forEach(input => input.addEventListener('input', () => {
  state.customColors[Number(input.dataset.customColor)] = input.value; render();
}));
$('.editor').addEventListener('focusin', event => focus(event.target.closest('[data-focus]')?.dataset.focus));
$('.editor').addEventListener('focusout', event => { if (!event.relatedTarget?.closest('[data-focus]')) focus(null); });
document.querySelectorAll('.advanced').forEach(details => details.addEventListener('toggle', () => { if (!details.open) focus(null); }));
$('#upload').addEventListener('change', event => { loadImage(event.target.files[0]); event.target.value = ''; });
document.addEventListener('dragover', event => { event.preventDefault(); $('.upload').classList.add('dragging'); focus('image'); });
document.addEventListener('dragleave', event => { if (!event.relatedTarget) { $('.upload').classList.remove('dragging'); focus(null); } });
document.addEventListener('drop', event => { event.preventDefault(); $('.upload').classList.remove('dragging'); loadImage(event.dataTransfer.files[0]); focus(null); });
$('#config-export').addEventListener('click', () => {
  const csv = configToCsv(currentConfig());
  download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'csv', state.serial, 'settings');
  status(`設定CSV v${CONFIG_VERSION}を作成しました。`);
});
$('#config-import').addEventListener('click', () => $('#config-file').click());
$('#config-file').addEventListener('change', async event => {
  const file = event.target.files[0]; event.target.value = '';
  if (!file) return;
  try { await applyConfig(csvToConfig(await file.text())); }
  catch (error) { status(error?.message || '設定CSVを読み込めませんでした。', true); }
});
$('#export').addEventListener('click', () => { if (ready) download(png, 'png'); });
$('#psd').addEventListener('click', async () => {
  if (!ready || busy) return;
  const capturedScene = scene, serial = state.serial, face = state.face;
  busy = true; setReady(true); status('レイヤーをまとめています…');
  try {
    const blob = await psdBlob(capturedScene); download(blob, 'psd', serial, face);
    status(`PSDを作成しました。${capturedScene.layers.length}個の画像レイヤーに分かれています。`);
  } catch { status('PSDを保存できませんでした。もう一度お試しください。', true); }
  finally { busy = false; setReady(!!png && !scene.error); }
});
$('#share').addEventListener('click', () => {
  if (!ready) return;
  if (shareSupported(png)) {
    navigator.share({ files: [png], title: state.title, text: state.title })
      .then(() => status('共有先に画像を渡しました。'))
      .catch(error => { if (error.name !== 'AbortError') showShareDialog(); });
  } else showShareDialog();
});
function showShareDialog() {
  $('#share-x').href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(state.title + ' #MemoryTicket')}`;
  $('#share-dialog').showModal();
}
$('#share-save').addEventListener('click', () => { if (ready) download(png, 'png'); });
$('#close-share').addEventListener('click', () => $('#share-dialog').close());
$('#share-dialog').addEventListener('click', event => { if (event.target === $('#share-dialog')) $('#share-dialog').close(); });

if (document.modelContext?.registerTool) {
  try {
    Promise.resolve(document.modelContext.registerTool({
      name: 'configure_ticket_text', description: 'チケットのタイトルとサブタイトルを編集する。',
      inputSchema: { type: 'object', properties: { title: { type: 'string', maxLength: 80 }, subtitle: { type: 'string', maxLength: 100 } }, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: true },
      execute: async input => {
        if (!input || typeof input !== 'object' || Object.keys(input).some(key => !['title', 'subtitle'].includes(key) || typeof input[key] !== 'string' || input[key].length > (key === 'title' ? 80 : 100))) throw Error('Invalid ticket text');
        for (const key of Object.keys(input)) { state[key] = input[key]; $('#' + key).value = input[key]; }
        await render(); return { title: state.title, subtitle: state.subtitle };
      },
    })).catch(() => {});
  } catch { /* The editor also works in browsers without WebMCP. */ }
}

render();
const demo = new Image(); demo.src = `${import.meta.env.BASE_URL}sample.jpg`;
demo.decode().then(() => {
  if (imageRevision) return;
  if (state.face !== 'front') { faces.front.image = demo; faces.front.filename = 'サンプル画像を変更'; state.palette = extractPalette(demo, createBrowserCanvas); render(); return; }
  if (state.image) return;
  state.image = demo; state.palette = extractPalette(demo, createBrowserCanvas);
  state.filename = 'サンプル画像を変更'; $('#filename').textContent = state.filename; render();
}).catch(() => status('画像を選んで、最初の一枚を。'));
