'use client';

import type { ImportStep } from '@/types/import';
import { Check } from 'lucide-react';

interface ProgressBarProps {
  currentStep: ImportStep;
}

const steps = [
  { id: 'upload', label: 'Upload', number: 1 },
  { id: 'mapping', label: 'Map Fields', number: 2 },
  { id: 'validation', label: 'Validate', number: 3 },
  { id: 'importing', label: 'Import', number: 4 },
  { id: 'complete', label: 'Complete', number: 4 },
] as const;

export function ProgressBar({ currentStep }: ProgressBarProps) {
  const currentStepIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.filter(s => s.id !== 'importing').map((step, index) => {
          const isComplete = index < currentStepIndex;
          const isCurrent = step.id === currentStep || (currentStep === 'importing' && step.id === 'complete');

          return (
            <div key={step.id} className="flex items-center flex-1">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-medium
                    transition-colors duration-200
                    ${isComplete
                      ? 'bg-primary text-primary-foreground'
                      : isCurrent
                        ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                        : 'bg-surface-elevated text-text-tertiary'
                    }
                  `}
                >
                  {isComplete ? <Check className="h-5 w-5" /> : step.number}
                </div>
                <span className={`
                  text-xs mt-2 font-medium
                  ${isCurrent ? 'text-text-primary' : 'text-text-tertiary'}
                `}>
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.filter(s => s.id !== 'importing').length - 1 && (
                <div className="flex-1 h-0.5 mx-4 relative top-[-16px]">
                  <div className={`
                    h-full transition-colors duration-200
                    ${isComplete ? 'bg-primary' : 'bg-surface-elevated'}
                  `} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
