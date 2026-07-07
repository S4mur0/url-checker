function detectDelimiter(sampleLine) {
  const commas = (sampleLine.match(/,/g) || []).length;
  const semicolons = (sampleLine.match(/;/g) || []).length;
  return semicolons > commas ? ';' : ',';
}

/** Parser CSV simples com suporte a campos entre aspas (com delimitador/quebra de
 * linha embutidos e aspas escapadas como ""). Detecta automaticamente , ou ; como
 * delimitador comparando as ocorrências na primeira linha. */
export function parseCsv(text) {
  const clean = text.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  if (!clean.trim()) return { headers: [], rows: [] };

  const delimiter = detectDelimiter(clean.slice(0, clean.indexOf('\n') !== -1 ? clean.indexOf('\n') : undefined));

  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i];

    if (inQuotes) {
      if (char === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const nonEmptyRows = rows.filter((r) => r.some((cell) => cell.trim() !== ''));
  const [headers, ...dataRows] = nonEmptyRows;
  return { headers: headers || [], rows: dataRows };
}

const HOSTNAME_HINTS = /subdom|hostname|^host$|dominio|domain/i;
const NOTES_HINTS = /root|raiz|parent|categoria|tag|grupo|owner|responsavel/i;

export function guessColumnIndex(headers, hints, fallback) {
  const idx = headers.findIndex((h) => hints.test(h));
  return idx !== -1 ? idx : fallback;
}

export function guessHostnameColumn(headers) {
  return guessColumnIndex(headers, HOSTNAME_HINTS, 0);
}

export function guessNotesColumn(headers) {
  const idx = headers.findIndex((h) => NOTES_HINTS.test(h));
  return idx;
}
