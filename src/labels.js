export const labelFields = [
  ['headerLabel', '本体上部 · 左の小さな文字', 100],
  ['headerSerial', '本体上部 · 右の番号・文字', 40],
  ['stubBrand', '半券上部 · 大きな文字', 40],
  ['stubCaption', '半券上部 · 小さな文字', 60],
  ['editionLabel', '半券 · 番号の上の見出し', 40],
  ['stubSerial', '半券 · 大きな番号・文字', 40],
  ['admissionTop', 'コードなし · 上の文字', 40],
  ['admissionBottom', 'コードなし · 下の文字', 40],
  ['barcodeLabel', 'バーコード下 · 表示する文字', 40],
  ['dateLabel', '半券下部 · 日付の表示', 60],
  ['footerLabel', '半券最下部 · スタイルの表記', 60],
];

export function defaultLabels(state) {
  const back = state.face === 'back';
  const date = state.date ? new Date(state.date + 'T12:00:00Z') : null;
  const dateLabel = date && !Number.isNaN(date.getTime()) ? `${String(date.getUTCDate()).padStart(2, '0')} ${['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][date.getUTCMonth()]} ${date.getUTCFullYear()}` : '';
  return {
    headerLabel: back ? 'MEMORY TICKET / BEHIND THE MOMENT' : state.style === 'Museum' ? 'EXHIBITION / PERSONAL COLLECTION' : state.style === 'Retro' ? 'SPECIAL EDITION / ADMIT ONE' : 'MEMORY TICKET / A PERSONAL COLLECTION',
    headerSerial: state.serial ? 'NO. ' + state.serial : '',
    stubBrand: 'MEMORY TICKET', stubCaption: 'KEEP THIS MOMENT', editionLabel: 'EDITION',
    stubSerial: state.serial, admissionTop: 'ADMIT', admissionBottom: 'ONE',
    barcodeLabel: state.barcode, dateLabel,
    footerLabel: state.style.toUpperCase() + (back ? ' / 02' : ' / 01'),
  };
}

export const ticketLabels = state => ({ ...defaultLabels(state), ...state.labels });
