'use client';

import { useCallback, useState } from 'react';
import { ClipboardPaste, FileText, ImageIcon, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseScheduleText } from '@/lib/import/intake';
import { autoDetectMappings } from '@/lib/csv/mapper';
import type { ParsedCSV, FieldMapping } from '@/types/import';

interface Step1UploadProps {
  onFileSelected: (file: File, parsed: ParsedCSV, mappings: FieldMapping[]) => void;
}

const ACCEPTED = '.csv,.tsv,.xlsx,.txt,.docx,.pdf,.png,.jpg,.jpeg,.webp';

export function Step1Upload({ onFileSelected }: Step1UploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');

  const finish = useCallback((file: File, parsed: ParsedCSV) => {
    if (!parsed.rowCount) throw new Error('No schedule rows were found');
    onFileSelected(file, parsed, autoDetectMappings(parsed.headers));
  }, [onFileSelected]);

  const handleFile = useCallback(async (file: File) => {
    const extension = file.name.toLowerCase().split('.').pop() || '';
    if (!ACCEPTED.includes(`.${extension}`)) {
      setError('Use CSV, TSV, XLSX, TXT, DOCX, PDF or a schedule screenshot');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('Files must be 10 MB or smaller');
      return;
    }
    try {
      setIsProcessing(true);
      setError(null);
      const body = new FormData();
      body.set('file', file);
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 120_000);
      const response = await fetch('/api/import/extract', { method: 'POST', body, signal: controller.signal });
      window.clearTimeout(timeout);
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || 'The file could not be read');
      finish(file, payload as ParsedCSV);
    } catch (err) {
      setError(err instanceof Error && err.name === 'AbortError' ? 'Extraction timed out. Try a smaller or clearer file.' : err instanceof Error ? err.message : 'Failed to read file');
    } finally { setIsProcessing(false); }
  }, [finish]);

  const handlePaste = () => {
    try {
      setError(null);
      const parsed = parseScheduleText(pastedText, 'text', 'Pasted schedule');
      finish(new File([pastedText], 'pasted-schedule.txt', { type: 'text/plain' }), parsed);
    } catch (err) { setError(err instanceof Error ? err.message : 'The pasted schedule could not be read'); }
  };

  return (
    <div className="space-y-6">
      <div className="panel-dark p-4 sm:p-6">
        <h2 className="text-xl font-semibold text-[#151713]">Bring in your existing schedule</h2>
        <p className="mt-2 text-sm text-text-secondary">Headings do not need to match SceneGen. You will map and preview everything before anything is saved.</p>

        <div
          onDrop={event => { event.preventDefault(); setIsDragging(false); const file = event.dataTransfer.files[0]; if (file) void handleFile(file); }}
          onDragOver={event => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          className={`mt-5 rounded-2xl border-2 border-dashed p-7 text-center transition-colors ${isDragging ? 'border-primary bg-primary/10' : 'border-black/20 bg-white/60'} ${isProcessing ? 'pointer-events-none opacity-60' : ''}`}
        >
          {isProcessing ? <><div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-2 border-primary border-t-transparent" /><p className="font-medium">Extracting schedule…</p><p className="mt-1 text-sm text-text-secondary">Scans and screenshots can take up to two minutes.</p></> : <>
            <Upload className="mx-auto mb-3 h-10 w-10 text-text-muted" />
            <p className="font-medium text-[#151713]">Drop a file here</p>
            <p className="mt-1 text-sm text-text-secondary">CSV, spreadsheet, Master Tour export, PDF, Word document or screenshot</p>
            <input id="schedule-upload" type="file" accept={ACCEPTED} className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) void handleFile(file); event.currentTarget.value = ''; }} />
            <label htmlFor="schedule-upload" className="mt-4 inline-block"><Button asChild variant="outline"><span><FileText className="mr-2 h-4 w-4" />Choose file</span></Button></label>
          </>}
        </div>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.16em] text-text-muted"><span className="h-px flex-1 bg-black/10" />or paste an email<span className="h-px flex-1 bg-black/10" /></div>
        <textarea value={pastedText} onChange={event => setPastedText(event.target.value)} rows={7} className="w-full rounded-xl border border-black/15 bg-white px-4 py-3 text-base text-[#151713] outline-none focus:border-primary" placeholder={'Paste dates from an email or message, for example:\n12/09/2026 | Manchester | Gorilla\n13/09/2026 | Leeds | Brudenell Social Club'} />
        <Button className="mt-3 w-full sm:w-auto" onClick={handlePaste} disabled={!pastedText.trim()}><ClipboardPaste className="mr-2 h-4 w-4" />Extract pasted schedule</Button>

        {error && <div role="alert" className="mt-4 rounded-xl border border-semantic-error/30 bg-semantic-error/10 px-4 py-3 text-sm text-semantic-error">{error}</div>}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Feature icon={<FileText className="h-4 w-4" />} title="Flexible columns" copy="Map unfamiliar spreadsheet headings yourself." />
          <Feature icon={<ImageIcon className="h-4 w-4" />} title="Scan extraction" copy="Pull dated rows from PDFs and screenshots." />
          <Feature icon={<ClipboardPaste className="h-4 w-4" />} title="Migration ready" copy="Master Tour exports and plain text use the same preview." />
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return <div className="rounded-xl border border-black/10 bg-white/70 p-4"><div className="flex items-center gap-2 font-medium text-[#151713]">{icon}{title}</div><p className="mt-1 text-xs leading-5 text-text-secondary">{copy}</p></div>;
}
