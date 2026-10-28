'use client';

import { useMemo, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createMapping, importFieldOptions, validateMappings } from '@/lib/csv/mapper';
import type { ParsedCSV, FieldMapping } from '@/types/import';

interface Props {
  parsedData: ParsedCSV;
  initialMappings: FieldMapping[];
  onConfirm: (mappings: FieldMapping[]) => void;
  onBack: () => void;
}

function targetFor(mapping: FieldMapping): string {
  if (mapping.classification === 'ignore') return 'ignore';
  if (mapping.type === 'line_item') return mapping.classification || 'ignore';
  return mapping.scenegenField;
}

export function Step2Mapping({ parsedData, initialMappings, onConfirm, onBack }: Props) {
  const [mappings, setMappings] = useState(initialMappings);
  const errors = useMemo(() => validateMappings(mappings), [mappings]);

  const changeTarget = (column: string, target: string) => {
    setMappings(current => current.map(mapping => mapping.csvColumn === column ? createMapping(column, target) : mapping));
  };

  return <div className="space-y-6">
    <div className="panel-dark p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h2 className="text-xl font-semibold text-[#151713]">Match your columns</h2><p className="mt-1 text-sm text-text-secondary">SceneGen suggested these matches. Change any that are wrong.</p></div>
        {parsedData.sourcePreset === 'master_tour' && <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"><Sparkles className="h-3.5 w-3.5" />Master Tour layout detected</span>}
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-black/10 bg-white/70">
        {mappings.map(mapping => <div key={mapping.csvColumn} className="grid gap-3 border-b border-black/10 p-4 last:border-0 sm:grid-cols-[1fr_1fr_1.2fr] sm:items-center">
          <div><p className="text-xs text-text-muted">Your heading</p><p className="font-medium text-[#151713]">{mapping.csvColumn}</p></div>
          <div><p className="text-xs text-text-muted">Example</p><p className="truncate text-sm text-text-secondary">{String(parsedData.rows[0]?.[mapping.csvColumn] ?? '—')}</p></div>
          <label className="text-xs text-text-muted">SceneGen field
            <select aria-label={`Map ${mapping.csvColumn}`} value={targetFor(mapping)} onChange={event => changeTarget(mapping.csvColumn, event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-black/15 bg-white px-3 text-base text-[#151713]">
              {importFieldOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        </div>)}
      </div>

      {errors.length > 0 && <div role="alert" className="mt-4 flex gap-2 rounded-xl border border-semantic-warning/30 bg-semantic-warning/10 p-4 text-sm text-[#151713]"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-medium">Two fields are required</p>{errors.map(error => <p key={error} className="mt-1 text-text-secondary">{error}</p>)}</div></div>}
      <p className="mt-4 text-xs leading-5 text-text-secondary">Unmapped columns are ignored. Financial columns are never guessed into the database without being visible here first.</p>
    </div>
    <div className="flex items-center justify-between"><Button variant="outline" onClick={onBack}><ChevronLeft className="mr-2 h-4 w-4" />Back</Button><Button disabled={errors.length > 0} onClick={() => onConfirm(mappings)}>Preview import<ChevronRight className="ml-2 h-4 w-4" /></Button></div>
  </div>;
}
