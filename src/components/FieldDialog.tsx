import { useEffect, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { SECTION_STYLES } from '../data/sections';
import { hex4 } from '../utils/jt808/hex';
import type { Field } from '../types/jt808';

interface FieldDialogProps {
  field: Field | null;
  onClose: () => void;
}

export function FieldDialog({ field, onClose }: FieldDialogProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!field) return;
    setCopied(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [field, onClose]);

  const copy = (f: Field) => {
    const text = [
    `${f.name}（${f.type}）`,
    `偏移 0x${hex4(f.offset)}（${f.offset}） · 长度 ${f.length} 字节`,
    `原始字节：${f.raw}`,
    `解析值：${f.value}`,
    '解析过程：',
    ...f.steps.map((s, i) => `${i + 1}. ${s}`)].
    join('\n');
    navigator.clipboard?.writeText(text).then(() => setCopied(true)).catch(() => setCopied(false));
  };

  return (
    <AnimatePresence>
      {field &&
      <m.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}>
        
          <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
          <m.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="field-dialog-title"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className="relative flex max-h-[86vh] w-full max-w-[680px] flex-col rounded-[28px] bg-surface-container-high shadow-elev-3">
          
            <div className="px-6 pb-3 pt-6">
              <div className="flex items-center gap-2 text-xs text-on-surface-variant">
                <span className={`h-2.5 w-2.5 rounded-sm ${field.error ? 'bg-error' : SECTION_STYLES[field.section].swatch}`} />
                {SECTION_STYLES[field.section].label} · {field.type}
              </div>
              <h2 id="field-dialog-title" className="mt-1 text-2xl text-on-surface">{field.name}</h2>
              <p className="mt-1 text-sm text-on-surface-variant">
                偏移 <span className="font-mono">{hex4(field.offset)}</span>（十进制 {field.offset}） · 长度 {field.length} 字节
              </p>
            </div>

            <div className="m3-scroll min-h-0 flex-1 space-y-5 overflow-auto px-6 pb-2">
              <div className={`rounded-2xl px-4 py-3 ${field.error ? 'bg-error-container text-on-error-container' : 'bg-surface-container-lowest'}`}>
                <div className="text-xs text-on-surface-variant">解析值</div>
                <div className="mt-0.5 break-all text-lg font-medium">{field.value}</div>
              </div>

              <section>
                <h3 className="mb-2 text-sm font-medium text-on-surface">原始字节</h3>
                {field.length > 0 ?
              field.length <= 24 ?
              <div className="flex flex-wrap gap-1">
                      {field.raw.split(' ').map((b, i) =>
                <span
                  key={i}
                  title={`偏移 0x${hex4(field.offset + i)}`}
                  className="rounded-md bg-primary-container px-1.5 py-0.5 font-mono text-[13px] text-on-primary-container">
                  
                          {b}
                        </span>
                )}
                    </div> :

              <p className="break-all rounded-lg bg-surface-container px-3 py-2 font-mono text-[12px] leading-5 text-on-surface">{field.raw}</p> :


              <p className="text-sm text-on-surface-variant">无</p>
              }
              </section>

              <section>
                <h3 className="mb-2 text-sm font-medium text-on-surface">解析过程</h3>
                <ol className="space-y-2">
                  {field.steps.map((s, i) =>
                <li key={i} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary-container text-xs font-medium text-on-secondary-container">
                        {i + 1}
                      </span>
                      <span className="break-all pt-0.5 text-sm leading-5 text-on-surface">{s}</span>
                    </li>
                )}
                </ol>
              </section>

              {field.bits &&
            <section>
                  <h3 className="mb-2 text-sm font-medium text-on-surface">位定义</h3>
                  <div className="grid gap-x-6 sm:grid-cols-2">
                    {field.bits.map((b) =>
                <div
                  key={b.bits + b.name}
                  className={`flex h-7 items-center gap-2 border-b border-outline-variant/60 text-[13px] ${b.active ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                  
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${b.active ? 'bg-primary' : 'bg-outline-variant'}`} />
                        <span className="w-12 shrink-0 font-mono text-[12px]">bit{b.bits}</span>
                        <span className={`truncate ${b.active ? 'font-medium' : ''}`}>{b.name}</span>
                        <span className="ml-auto shrink-0">{b.value}</span>
                      </div>
                )}
                  </div>
                </section>
            }

              {field.children &&
            <section>
                  <h3 className="mb-2 text-sm font-medium text-on-surface">子字段</h3>
                  <div>
                    {field.children.map((c) =>
                <div key={c.id} className="grid h-7 grid-cols-[64px_minmax(0,1fr)_minmax(0,1.3fr)] items-center gap-3 border-b border-outline-variant/60 text-[13px]">
                        <span className="font-mono text-[12px] text-on-surface-variant">{hex4(c.offset)}</span>
                        <span className="truncate text-on-surface">{c.name}</span>
                        <span className={`truncate ${c.error ? 'text-error' : 'text-on-surface-variant'}`} title={c.value}>{c.value}</span>
                      </div>
                )}
                  </div>
                </section>
            }
            </div>

            <div className="flex justify-end gap-2 px-6 pb-6 pt-4">
              <button
              type="button"
              onClick={() => copy(field)}
              className="h-10 rounded-full px-4 text-sm font-medium text-primary transition-colors duration-150 hover:bg-primary/[0.08]">
              
                {copied ? '已复制' : '复制'}
              </button>
              <button
              type="button"
              autoFocus
              onClick={onClose}
              className="h-10 rounded-full px-4 text-sm font-medium text-primary transition-colors duration-150 hover:bg-primary/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
              
                关闭
              </button>
            </div>
          </m.div>
        </m.div>
      }
    </AnimatePresence>);

}