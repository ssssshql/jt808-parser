import React from 'react';

interface DocHeaderProps {
  eyebrow: React.ReactNode;
  title: string;
  desc: string;
  children?: React.ReactNode;
}

export function DocHeader({ eyebrow, title, desc, children }: DocHeaderProps) {
  return (
    <header className="border-b border-outline-variant px-6 pb-5 pt-6">
      <div className="flex flex-wrap items-center gap-2 text-sm text-on-surface-variant">{eyebrow}</div>
      <h1 className="mt-1 text-[28px] leading-9 text-on-surface">{title}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-on-surface-variant">{desc}</p>
      {children}
    </header>);

}