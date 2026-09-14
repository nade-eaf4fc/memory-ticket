export const defaultCrop = () => ({ x: .5, y: .5, zoom: 1 });

export function cropRect(image, width, height, crop = defaultCrop()) {
  const zoom = Math.max(1, Math.min(4, Number(crop.zoom) || 1));
  const scale = Math.max(width / image.width, height / image.height) * zoom;
  const w = width / scale, h = height / scale;
  const clamp = n => Math.max(0, Math.min(1, Number.isFinite(n) ? n : .5));
  return [(image.width - w) * clamp(crop.x), (image.height - h) * clamp(crop.y), w, h];
}

export function photoBounds(state) {
  if (state.face !== 'back') return [64, 96, 1282, 548];
  return state.title || state.subtitle ? [64, 152, 590, 584] : [64, 152, 1282, 584];
}

export function attachCropDialog(dialog, getState, apply) {
  const canvas = dialog.querySelector('canvas'), controls = {};
  for (const key of ['zoom', 'x', 'y']) controls[key] = dialog.querySelector(`[name="${key}"]`);
  let draft, source, drag;
  function draw() {
    if (!source?.image) return;
    const [, , w, h] = photoBounds(source);
    canvas.width = 1000; canvas.height = Math.round(1000 * h / w);
    canvas.getContext('2d').drawImage(source.image, ...cropRect(source.image, w, h, draft), 0, 0, canvas.width, canvas.height);
    for (const key of Object.keys(controls)) controls[key].value = draft[key];
    dialog.querySelector('output').textContent = `${Math.round(draft.zoom * 100)}%`;
  }
  for (const [key, input] of Object.entries(controls)) input.addEventListener('input', () => { draft[key] = Number(input.value); draw(); });
  canvas.addEventListener('pointerdown', event => {
    drag = { x: event.clientX, y: event.clientY, crop: { ...draft } };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!drag) return;
    const rect = canvas.getBoundingClientRect(), [, , w, h] = photoBounds(source);
    const [, , sw, sh] = cropRect(source.image, w, h, draft);
    draft.x = Math.max(0, Math.min(1, drag.crop.x - (event.clientX - drag.x) / rect.width * sw / Math.max(1, source.image.width - sw)));
    draft.y = Math.max(0, Math.min(1, drag.crop.y - (event.clientY - drag.y) / rect.height * sh / Math.max(1, source.image.height - sh)));
    draw();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(type, () => { drag = null; });
  dialog.querySelector('[data-crop-reset]').onclick = () => { draft = defaultCrop(); draw(); };
  dialog.querySelector('[data-crop-cancel]').onclick = () => dialog.close();
  dialog.querySelector('[data-crop-apply]').onclick = () => { apply({ ...draft }); dialog.close(); };
  return () => {
    source = getState();
    if (!source.image) return;
    draft = { ...(source.crop || defaultCrop()) }; dialog.showModal(); draw();
  };
}
