import React from 'react';
import { CheckIcon } from 'lucide-react';

interface VersionSegmentedProps<T extends string> {
  options: {value: T;label: string;}[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}

export function VersionSegmented<T extends string>({ options, value, onChange, ariaLabel }: VersionSegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="inline-flex h-10 overflow-hidden rounded-full border border-outline">
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={`flex w-[68px] items-center justify-center gap-1 text-sm font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:w-20 ${
            i > 0 ? 'border-l border-outline' : ''} ${
            selected ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface hover:bg-on-surface/[0.08]'}`}>
            
            {selected && <CheckIcon size={16} aria-hidden />}
            {o.label}
          </button>);

      })}
    </div>);

}