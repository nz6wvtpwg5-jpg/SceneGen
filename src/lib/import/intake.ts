import type { ParsedCSV, ParsedCSVRow, ImportSourceKind } from '@/types/import';
import { parseCSVText } from '@/lib/csv/parser';

const DATE_TOKEN = String.raw`(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}|(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*[, ]+\d{1,2}[ ,\/-]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[ ,\/-]+\d{2,4}|\d{1,2}[ ,\/-]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[ ,\/-]+\d{2,4})`;

function cleanCell(value: unknown): string {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'object' && value && 'text' in value) return cleanCell((value as { text: unknown }).text);
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function uniqueHeaders(headers: string[]): string[] {
  const counts = new Map<string, number>();
  return headers.map((header, index) => {
    const base = cleanCell(header) || `Column ${index + 1}`;
    const count = (counts.get(base.toLowerCase()) || 0) + 1;
    counts.set(base.toLowerCase(), count);
    return count === 1 ? base : `${base} ${count}`;
  });
}

export function rowsToParsedCSV(matrix: unknown[][], sourceKind: ImportSourceKind, sourceName: string): ParsedCSV {
  const nonEmpty = matrix
    .map(row => row.map(cleanCell))
    .filter(row => row.some(Boolean));
  if (!nonEmpty.length) throw new Error('No readable schedule rows were found');
  const headerIndex = nonEmpty.findIndex(row => row.some(cell => /date|day|city|town|venue|location/i.test(cell)));
  const selectedHeaderIndex = headerIndex >= 0 ? headerIndex : 0;
  const headers = uniqueHeaders(nonEmpty[selectedHeaderIndex]);
  const rows: ParsedCSVRow[] = nonEmpty.slice(selectedHeaderIndex + 1, selectedHeaderIndex + 501).map(values => {
    const row: ParsedCSVRow = {};
    headers.forEach((header, index) => { row[header] = values[index] || null; });
    return row;
  });
  return { headers, rows, rowCount: rows.length, sourceKind, sourceName, sourcePreset: detectSourcePreset(headers, sourceName) };
}

export function parseDelimitedImport(text: string, sourceKind: ImportSourceKind, sourceName: string): ParsedCSV {
  const clean = text.replace(/^\uFEFF/, '').trim();
  const firstLine = clean.split(/\r?\n/, 1)[0] || '';
  const delimiter = firstLine.includes('\t') ? '\t' : firstLine.includes(';') && !firstLine.includes(',') ? ';' : ',';
  if (delimiter === ',') {
    const parsed = parseCSVText(clean);
    return { ...parsed, sourceKind, sourceName, sourcePreset: detectSourcePreset(parsed.headers, sourceName) };
  }
  return rowsToParsedCSV(clean.split(/\r?\n/).map(line => line.split(delimiter)), sourceKind, sourceName);
}

export function parseScheduleText(text: string, sourceKind: ImportSourceKind, sourceName: string): ParsedCSV {
  const clean = text.replace(/\r/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!clean) throw new Error('Paste or upload some schedule text first');
  const lines = clean.split(/\n+/).map(line => line.trim()).filter(Boolean);
  if (lines[0] && /[,\t;]/.test(lines[0]) && /date|day/i.test(lines[0])) {
    return parseDelimitedImport(lines.join('\n'), sourceKind, sourceName);
  }

  const datePattern = new RegExp(`^(${DATE_TOKEN})\\s*(?:[|–—,-]|\\s{2,})?\\s*(.*)$`, 'i');
  const rows: ParsedCSVRow[] = [];
  for (const line of lines) {
    const match = line.match(datePattern);
    if (!match) continue;
    const remainder = match[2].trim();
    const cells = remainder.split(/\s*(?:\||\t|\s[-–—]\s)\s*/).map(cleanCell).filter(Boolean);
    let city = cells[0] || '';
    let venue = cells[1] || '';
    if (!venue && city.includes(',')) {
      const parts = city.split(',').map(cleanCell);
      city = parts[0];
      venue = parts.slice(1).join(', ');
    }
    rows.push({ Date: match[1], City: city, Venue: venue || null, Notes: cells.slice(2).join(' | ') || null });
  }
  if (!rows.length) {
    const date = clean.match(new RegExp(DATE_TOKEN, 'i'))?.[0];
    const labelled = (label: string) => clean.match(new RegExp(`(?:^|\\n)\\s*${label}\\s*[:\\-]\\s*([^\\n]+)`, 'im'))?.[1]?.trim();
    const city = labelled('(?:city|town|market|location)');
    const venue = labelled('(?:venue|room|club)');
    if (date && city) rows.push({ Date: date, City: city, Venue: venue || null, Notes: clean.slice(0, 4000) });
  }
  if (!rows.length) {
    throw new Error('No dated schedule lines were recognised. Put each date on its own line, followed by city and venue.');
  }
  const headers = ['Date', 'City', 'Venue', 'Notes'];
  return { headers, rows: rows.slice(0, 500), rowCount: Math.min(rows.length, 500), sourceKind, sourceName, sourcePreset: detectSourcePreset(headers, sourceName) };
}

export function detectSourcePreset(headers: string[], sourceName = ''): ParsedCSV['sourcePreset'] {
  const signature = `${sourceName} ${headers.join(' ')}`.toLowerCase();
  if (/master\s*tour|event type|day title|promoter rep|venue contact/.test(signature)) return 'master_tour';
  return 'generic';
}
