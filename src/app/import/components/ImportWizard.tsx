'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import type {
  ImportState,
  ImportStep,
  ParsedCSV,
  FieldMapping,
  ValidationResult,
  ImportData,
  ImportResult
} from '@/types/import';
import { Step1Upload } from './Step1Upload';
import { Step2Mapping } from './Step2Mapping';
import { Step3Validation } from './Step3Validation';
import { Step4Summary } from './Step4Summary';
import { ProgressBar } from './ProgressBar';

interface ImportWizardProps {
  entityId: string;
  existingTourId?: string;
  existingTourName?: string;
  mode?: string; // 'add-single-show' or undefined
}

export function ImportWizard({ entityId, existingTourId, existingTourName, mode }: ImportWizardProps) {
  const [state, setState] = useState<ImportState>({
    step: mode === 'add-single-show' ? 'validation' : 'upload', // Skip to validation for single show
    file: null,
    parsedData: null,
    mappings: [],
    validation: null,
    importData: null,
    result: null,
    error: null,
  });

  const updateState = (updates: Partial<ImportState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const goToStep = (step: ImportStep) => {
    updateState({ step, error: null });
  };

  const handleFileSelected = (file: File, parsed: ParsedCSV, mappings: FieldMapping[]) => {
    updateState({
      file,
      parsedData: parsed,
      mappings,
      step: 'mapping',
    });
  };

  const handleMappingConfirmed = (mappings: FieldMapping[]) => {
    updateState({
      mappings,
      step: 'validation',
    });
  };

  const handleValidationComplete = (validation: ValidationResult, importData: ImportData) => {
    updateState({
      validation,
      importData,
    });
  };

  const handleStartImport = async (dataToImport?: ImportData) => {
    // CRITICAL: Use ONLY the provided data, never fall back to state
    // The state may contain old/stale data from the CSV parsing
    const importData = dataToImport;

    if (!importData) {
      console.error('❌ No import data provided to handleStartImport');
      return;
    }

    if (importData.shows.length === 0) {
      updateState({ error: 'There are no valid shows to import', step: 'validation' });
      toast.error('There are no valid shows to import');
      return;
    }

    try {
      updateState({ step: 'importing' });

      const response = await fetch('/api/import/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Entity-Id': entityId,
        },
        body: JSON.stringify({
          entityId,
          ...importData,
        }),
      });

      console.log('🚀 Response received:', response.status, response.statusText);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Import API error:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        throw new Error(error.error?.message || error.message || 'Import failed');
      }

      const result: ImportResult = await response.json();

      updateState({
        result,
        step: 'complete',
      });

      toast.success('Import completed successfully!');
    } catch (error) {
      console.error('❌ Import failed with error:', error);
      const message = error instanceof Error ? error.message : 'Import failed';
      console.error('❌ Error message:', message);
      updateState({
        error: message,
        step: 'validation', // Go back to validation
      });
      toast.error('Import not completed', {
        description: message,
      });
    }
  };

  const handleReset = () => {
    setState({
      step: 'upload',
      file: null,
      parsedData: null,
      mappings: [],
      validation: null,
      importData: null,
      result: null,
      error: null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <ProgressBar currentStep={state.step} />

      {/* Error Display */}
      {state.error && (
        <div
          className="rounded-2xl border border-[#ff5c3f]/30 bg-[#fff5ef] px-5 py-4 text-[#171612] shadow-sm"
          role="alert"
        >
          <p className="font-semibold">Import not completed</p>
          <p className="mt-1 text-sm leading-6 text-[#625f57]">{state.error}</p>
        </div>
      )}

      {/* Step Content */}
      {state.step === 'upload' && (
        <Step1Upload
          onFileSelected={handleFileSelected}
        />
      )}

      {state.step === 'mapping' && state.parsedData && (
        <Step2Mapping
          parsedData={state.parsedData}
          initialMappings={state.mappings}
          onConfirm={handleMappingConfirmed}
          onBack={() => goToStep('upload')}
        />
      )}

      {state.step === 'validation' && (mode === 'add-single-show' || (state.parsedData && state.mappings.length > 0)) && (
        <Step3Validation
          parsedData={state.parsedData || undefined}
          mappings={state.mappings}
          entityId={entityId}
          existingTourId={existingTourId}
          existingTourName={existingTourName}
          mode={mode}
          onComplete={handleValidationComplete}
          onStartImport={handleStartImport}
          onBack={() => mode === 'add-single-show' ? undefined : goToStep('mapping')}
        />
      )}

      {state.step === 'importing' && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg font-medium">Importing data...</p>
          <p className="text-sm text-text-tertiary">This may take a few moments</p>
        </div>
      )}

      {state.step === 'complete' && state.result && (
        <Step4Summary
          result={state.result}
          onReset={handleReset}
          entityId={entityId}
        />
      )}
    </div>
  );
}
