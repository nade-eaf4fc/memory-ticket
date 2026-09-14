export function fileStem(serial) {
  return `memory-ticket-${serial.replace(/[^a-zA-Z0-9_-]/g, '_') || 'ticket'}`;
}

export async function psdBlob(scene) {
  const { writePsd } = await import('ag-psd');
  const buffer = writePsd({
    width: scene.canvas.width,
    height: scene.canvas.height,
    canvas: scene.canvas,
    children: scene.layers.map(layer => ({ ...layer, blendMode: 'normal', opacity: 1 })),
  });
  return new Blob([buffer], { type: 'image/vnd.adobe.photoshop' });
}

export function pngBlob(canvas) {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('画像を書き出せませんでした。')), 'image/png'));
}

export function shareSupported(file, navigatorObject = navigator) {
  try { return !!navigatorObject.share && !!navigatorObject.canShare?.({ files: [file] }); }
  catch { return false; }
}
