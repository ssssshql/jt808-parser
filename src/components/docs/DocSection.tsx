import React from 'react';

interface DocSectionProps {
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}

export function DocSection({ title, aside, children }: DocSectionProps) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-3">
        <h2 className="text-base font-medium text-on-surface">{title}</h2>
        {aside && <span className="text-xs text-on-surface-variant">{aside}</span>}
      </div>
      {children}
    </section>);

}