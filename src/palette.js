export const palettes = [
  { id: 'auto', name: '画像から', colors: ['#dce3f0', '#f1e2df', '#e8e1f5'] },
  { id: 'air', name: 'Air', colors: ['#cbdff1', '#e4def5', '#ecedf7'] },
  { id: 'iris', name: 'Iris', colors: ['#d9cef1', '#eadff5', '#f4e5d5'] },
  { id: 'sorbet', name: 'Sorbet', colors: ['#f6d8c3', '#f5e9bc', '#f0dce8'] },
  { id: 'matcha', name: 'Matcha', colors: ['#d7e5c5', '#e8ebcf', '#d7e6dc'] },
  { id: 'rose', name: 'Rose', colors: ['#f1cfdf', '#ecdaf0', '#f4e3dc'] },
  { id: 'tide', name: 'Tide', colors: ['#cbe8e2', '#d5e4ef', '#e6e9d3'] },
];

export function extractPalette(image, createCanvas) {
  const context = createCanvas(64, 64).getContext('2d');
  context.drawImage(image, 0, 0, 64, 64);
  const { data } = context.getImageData(0, 0, 64, 64);
  const bins = Array.from({ length: 12 }, () => ({ n: 0, h: 0, s: 0 }));
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]].map(v => v / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const delta = max - min, l = (max + min) / 2;
    if (delta < .04 || l < .08 || l > .95) continue;
    const h = (max === r ? ((g - b) / delta + 6) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4) * 60;
    const bin = bins[Math.floor(h / 30) % 12];
    bin.n++; bin.h += h; bin.s += delta / (1 - Math.abs(2 * l - 1));
  }
  const best = bins.filter(b => b.n).sort((a, b) => b.n - a.n);
  if (!best.length) return ['#e0e2e4', '#ebebe9', '#dedfe1'];
  return Array.from({ length: 3 }, (_, i) => {
    const b = best[i % best.length];
    return `hsl(${Math.round(b.h / b.n)} ${Math.round(Math.min(.36, Math.max(.16, b.s / b.n * .48)) * 100)}% ${[84, 90, 87][i]}%)`;
  });
}

export function selectedPalette(state) {
  return state.color === 'auto' ? state.palette : palettes.find(p => p.id === state.color).colors;
}
