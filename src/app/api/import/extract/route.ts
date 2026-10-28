import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { recognize } from 'tesseract.js';
import { parseDelimitedImport, parseScheduleText, rowsToParsedCSV } from '@/lib/import/intake';

export const runtime = 'nodejs';
export const maxDuration = 120;
const MAX_BYTES = 10 * 1024 * 1024;
const extractionWindows = new Map<string, number[]>();

function hasSignature(bytes: Buffer, extension: string): boolean {
  if (extension === 'pdf') return bytes.subarray(0, 5).toString() === '%PDF-';
  if (extension === 'png') return bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (['jpg', 'jpeg'].includes(extension)) return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (extension === 'webp') return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  if (['xlsx', 'docx'].includes(extension)) return bytes[0] === 0x50 && bytes[1] === 0x4b;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const userKey = request.headers.get('x-user-id') || 'unknown';
    const now = Date.now();
    const recent = (extractionWindows.get(userKey) || []).filter(time => now - time < 15 * 60_000);
    if (recent.length >= 10) return NextResponse.json({ error: 'Extraction limit reached. Try again in a few minutes.' }, { status: 429 });
    extractionWindows.set(userKey, [...recent, now]);
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a file to extract' }, { status: 422 });
    if (!file.size || file.size > MAX_BYTES) return NextResponse.json({ error: 'Files must be between 1 byte and 10 MB' }, { status: 413 });
    const name = file.name.slice(0, 255);
    const extension = name.toLowerCase().split('.').pop() || '';
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!hasSignature(bytes, extension)) return NextResponse.json({ error: 'The file contents do not match its extension' }, { status: 422 });

    if (['csv', 'tsv', 'txt'].includes(extension)) {
      const text = bytes.toString('utf8');
      const parsed = extension === 'txt'
        ? parseScheduleText(text, 'text', name)
        : parseDelimitedImport(text, extension === 'tsv' ? 'spreadsheet' : 'csv', name);
      return NextResponse.json(parsed);
    }
    if (extension === 'xlsx') {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0]);
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new Error('The workbook does not contain a worksheet');
      const matrix: unknown[][] = [];
      sheet.eachRow({ includeEmpty: false }, row => matrix.push((row.values as unknown[]).slice(1)));
      return NextResponse.json(rowsToParsedCSV(matrix, 'spreadsheet', name));
    }
    if (extension === 'docx') {
      const result = await mammoth.extractRawText({ buffer: bytes });
      return NextResponse.json(parseScheduleText(result.value, 'document', name));
    }
    if (extension === 'pdf') {
      const parser = new PDFParse({ data: bytes });
      try {
        const result = await parser.getText();
        return NextResponse.json(parseScheduleText(result.text, 'document', name));
      } finally { await parser.destroy(); }
    }
    if (['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
      const result = await recognize(bytes, 'eng', { logger: () => undefined });
      return NextResponse.json(parseScheduleText(result.data.text, 'image', name));
    }
    return NextResponse.json({ error: 'Use CSV, TSV, XLSX, TXT, DOCX, PDF, PNG, JPG or WebP' }, { status: 415 });
  } catch (error) {
    console.error('Import extraction failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'The schedule could not be extracted' }, { status: 422 });
  }
}
