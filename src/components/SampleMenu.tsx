import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { ChevronDownIcon, FileTextIcon } from 'lucide-react';
import { samples } from '../data/samples';
import { hexN } from '../utils/jt808/hex';
import type { Sample } from '../types/jt808';

interface SampleMenuProps {
  onPick: (sample: Sample) => void;
}

export function SampleMenu({ onPick }: SampleMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-8 items-center gap-2 rounded-lg border border-outline-variant pl-2 pr-2.5 text-sm font-medium text-on-surface-variant transition-colors duration-150 hover:bg-on-surface/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
        
        <FileTextIcon size={18} className="text-primary" aria-hidden />
        示例报文
        <ChevronDownIcon size={16} aria-hidden className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open &&
        <m.div
          role="menu"
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -4 }}
          transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
          style={{ transformOrigin: 'top left' }}
          className="absolute left-0 top-10 z-40 w-[360px] max-w-[calc(100vw-2rem)] rounded-[4px] bg-surface-container py-2 shadow-elev-2">
          
            {samples.map((s) =>
          <button
            key={s.id}
            type="button"
            role="menuitem"
            onClick={() => {
              onPick(s);
              setOpen(false);
            }}
            className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors duration-100 hover:bg-on-surface/[0.08] focus-visible:bg-on-surface/[0.12] focus-visible:outline-none">
            
                <span className="w-14 shrink-0 font-mono text-xs text-primary">{hexN(s.msgId, 2)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-on-surface">{s.label}</span>
                  <span className="block truncate text-xs text-on-surface-variant">{s.description}</span>
                </span>
                <span className="shrink-0 rounded px-1.5 py-0.5 text-[11px] text-on-surface-variant bg-surface-container-highest">{s.version}</span>
              </button>
          )}
          </m.div>
        }
      </AnimatePresence>
    </div>);

}