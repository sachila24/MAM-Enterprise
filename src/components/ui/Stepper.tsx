import React, { Fragment } from 'react';
interface Step {
  label: string;
}
interface StepperProps {
  steps: Step[];
  current: number;
}
export function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="flex items-center w-full">
      {steps.map((step, index) => {
        const isCompleted = index < current;
        const isCurrent = index === current;
        const isUpcoming = index > current;
        return (
          <Fragment key={step.label}>
            <div className="flex items-center">
              <div
                className={`flex h-8 items-center justify-center rounded-full px-4 text-sm font-medium transition-colors
                  ${isCompleted ? 'bg-brand-800 text-white' : ''}
                  ${isCurrent ? 'border-2 border-brand-800 bg-brand-50 text-brand-800' : ''}
                  ${isUpcoming ? 'bg-neutral-100 text-neutral-500' : ''}
                `}>
                
                {step.label}
              </div>
            </div>
            {index < steps.length - 1 &&
            <div
              className={`h-0.5 flex-1 mx-2 transition-colors ${isCompleted ? 'bg-brand-800' : 'bg-neutral-200'}`} />

            }
          </Fragment>);

      })}
    </div>);

}