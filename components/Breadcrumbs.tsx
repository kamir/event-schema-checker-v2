import React from 'react';
import { ArrowRightIcon } from './icons/ArrowRightIcon';

interface BreadcrumbsProps {
  steps: string[];
  currentStep: number;
  onNavigate: (step: number) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ steps, currentStep, onNavigate }) => {
  return (
    <nav aria-label="Progress" className="bg-brand-primary border-b border-brand-border">
      <ol role="list" className="max-w-7xl mx-auto flex items-center space-x-2 sm:space-x-4 p-4">
        {steps.map((step, stepIdx) => (
          <li key={step} className="flex items-center">
            {stepIdx > 0 && (
              <ArrowRightIcon className="h-4 w-4 text-brand-subtle mx-2 sm:mx-4 flex-shrink-0" />
            )}
            <button
              onClick={() => onNavigate(stepIdx)}
              disabled={stepIdx >= currentStep}
              className={`text-sm font-medium transition-colors ${
                stepIdx === currentStep
                  ? 'text-brand-orange'
                  : 'text-brand-subtle hover:text-brand-text'
              } disabled:cursor-not-allowed disabled:text-brand-subtle/70`}
              aria-current={stepIdx === currentStep ? 'step' : undefined}
            >
              {step}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
};
