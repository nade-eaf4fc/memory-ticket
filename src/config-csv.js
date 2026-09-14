export const CONFIG_FORMAT = 'memory-ticket';
export const CONFIG_VERSION = 1;

const columnsV1 = [
  'format', 'version', 'active_face', 'style', 'color',
  'palette_1', 'palette_2', 'palette_3',
  'custom_color_1', 'custom_color_2', 'custom_color_3',
  'side', 'code', 'resolution', 'date', 'serial', 'qr', 'barcode',
  'front_title', 'front_subtitle', 'front_metadata', 'front_filename',
  'front_crop_x', 'front_crop_y', 'front_crop_zoom', 'front_labels_json',
  'back_title', 'back_subtitle', 'back_metadata', 'back_filename',
  'back_crop_x', 'back_crop_y', 'back_crop_zoom', 'back_labels_json',
];

const csvCell = value => {
  const text = value == null ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

function csvRows(text) {
  const rows = [], row = [];
  let field = '', quoted = false;
  text = String(text ?? '').replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = false;
      else field += char;
      continue;
    }
    if (char === '"' && field === '') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row.splice(0)); field = ''; }
    else field += char;
  }
  if (quoted) throw new Error('CSVの引用符が閉じられていません。');
  if (field !== '' || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  return rows.filter(values => values.some(value => value !== ''));
}

const cropValues = crop => [crop?.x ?? .5, crop?.y ?? .5, crop?.zoom ?? 1];
const faceValues = face => {
  const [x, y, zoom] = cropValues(face?.crop);
  return [
    face?.title ?? '', face?.subtitle ?? '', face?.metadata ?? '', face?.filename ?? '',
    x, y, zoom, JSON.stringify(face?.labels ?? {}),
  ];
};

export function configToCsv(config) {
  const palette = config.palette ?? [];
  const custom = config.customColors ?? [];
  const values = [
    CONFIG_FORMAT, CONFIG_VERSION, config.activeFace ?? 'front', config.style ?? 'Pastel', config.color ?? 'auto',
    palette[0] ?? '', palette[1] ?? '', palette[2] ?? '',
    custom[0] ?? '', custom[1] ?? '', custom[2] ?? '',
    config.side ?? 'right', config.code ?? 'QR', config.resolution ?? 2,
    config.date ?? '', config.serial ?? '', config.qr ?? '', config.barcode ?? '',
    ...faceValues(config.front), ...faceValues(config.back),
  ];
  return `\uFEFF${columnsV1.map(csvCell).join(',')}\r\n${values.map(csvCell).join(',')}\r\n`;
}

function number(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function jsonObject(value) {
  if (!value) return {};
  let parsed;
  try { parsed = JSON.parse(value); }
  catch { throw new Error('CSV内のラベル設定を読み取れませんでした。'); }
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('CSV内のラベル設定が不正です。');
  return Object.fromEntries(Object.entries(parsed).filter(([, item]) => typeof item === 'string'));
}

function faceFromRow(row, prefix) {
  return {
    title: row[`${prefix}_title`] ?? '',
    subtitle: row[`${prefix}_subtitle`] ?? '',
    metadata: row[`${prefix}_metadata`] ?? '',
    filename: row[`${prefix}_filename`] ?? '',
    crop: {
      x: number(row[`${prefix}_crop_x`], .5),
      y: number(row[`${prefix}_crop_y`], .5),
      zoom: number(row[`${prefix}_crop_zoom`], 1),
    },
    labels: jsonObject(row[`${prefix}_labels_json`]),
  };
}

function parseV1(row) {
  return {
    version: 1,
    activeFace: row.active_face === 'back' ? 'back' : 'front',
    style: row.style,
    color: row.color,
    palette: [row.palette_1, row.palette_2, row.palette_3],
    customColors: [row.custom_color_1, row.custom_color_2, row.custom_color_3],
    side: row.side,
    code: row.code,
    resolution: number(row.resolution, 2),
    date: row.date,
    serial: row.serial,
    qr: row.qr,
    barcode: row.barcode,
    front: faceFromRow(row, 'front'),
    back: faceFromRow(row, 'back'),
  };
}

export function csvToConfig(text) {
  const rows = csvRows(text);
  if (rows.length < 2) throw new Error('設定CSVにヘッダーとデータ行が必要です。');
  const [header, values] = rows;
  const row = Object.fromEntries(header.map((key, index) => [key.trim(), values[index] ?? '']));
  if (row.format !== CONFIG_FORMAT) throw new Error('MEMORY TICKETの設定CSVではありません。');
  const version = Number(row.version);
  if (!Number.isInteger(version) || version < 1) throw new Error('設定CSVのversionが不正です。');
  if (version > CONFIG_VERSION) throw new Error(`この設定CSVは新しいversion ${version}です。アプリを更新してください。`);
  if (version === 1) return parseV1(row);
  throw new Error(`設定CSV version ${version}には対応していません。`);
}
