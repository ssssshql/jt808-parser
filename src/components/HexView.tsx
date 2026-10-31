import { useMemo, useState } from 'react';
import { SECTION_ORDER, SECTION_STYLES } from '../data/sections';
import { hex2, hex4 } from '../utils/jt808/hex';
import type { Field, Section } from '../types/jt808';

type Range = [number, number] | null;

interface HexViewProps {
  bytes: Uint8Array;
  owners: (Field | undefined)[];
  selectedRange: Range;
  hoverRange: Range;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  onOpen: (field: Field) => void;
}

const inRange = (i: number, r: Range) => !!r && i >= r[0] && i < r[1];

export function HexView({ bytes, owners, selectedRange, hoverRange, onHover, onSelect, onOpen }: HexViewProps) {
  const [hoverByte, setHoverByte] = useState<number | null>(null);
  const rows = Math.ceil(bytes.length / 16);
  const present = useMemo(() => {
    const s = new Set<Section>();
    owners.forEach((o) => o && s.add(o.section));
    return SECTION_ORDER.filter((x) => s.has(x));
  }, [owners]);
  const hovered = hoverByte !== null ? owners[hoverByte] : undefined;

  return (
    <section aria-label="字节视图" className="flex min-h-[220px] flex-1 flex-col rounded-xl bg-surface-container-low lg:min-h-0">
      <div className="flex items-center gap-3 px-4 pb-2 pt-3">
        <h2 className="text-base font-medium text-on-surface">字节视图</h2>
        <div className="ml-auto flex flex-wrap justify-end gap-x-3 gap-y-1">
          {present.map((s) =>
          <span key={s} className="flex items-center gap-1.5 text-xs text-on-surface-variant">
              <span className={`h-2.5 w-2.5 rounded-sm ${SECTION_STYLES[s].swatch}`} />
              {SECTION_STYLES[s].label}
            </span>
          )}
        </div>
      </div>
      <div className="m3-scroll min-h-0 flex-1 overflow-auto px-4" onMouseLeave={() => {setHoverByte(null);onHover(null);}}>
        <div className="min-w-[440px] font-mono text-[12px]">
          <div className="flex h-5 items-center gap-3 text-[11px] text-on-surface-variant">
            <span className="w-9 shrink-0">偏移</span>
            <div className="grid flex-1 gap-[2px]" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>
              {Array.from({ length: 16 }, (_, i) =>
              <span key={i} className="text-center">{hex2(i).slice(1)}</span>
              )}
            </div>
          </div>
          {Array.from({ length: rows }, (_, r) =>
          <div key={r} className="flex h-[23px] items-center gap-3">
              <span className="w-9 shrink-0 text-on-surface-variant">{hex4(r * 16)}</span>
              <div className="grid flex-1 gap-[2px]" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>
                {Array.from({ length: 16 }, (_, c) => {
                const i = r * 16 + c;
                if (i >= bytes.length) return <span key={c} />;
                const owner = owners[i];
                const sel = inRange(i, selectedRange);
                const hov = inRange(i, hoverRange);
                const tone = sel ?
                'bg-primary text-on-primary' :
                owner?.error ?
                'bg-error-container text-on-error-container' :
                SECTION_STYLES[owner?.section ?? 'frame'].tint;
                return (
                  <span
                    key={c}
                    onMouseEnter={() => {
                      setHoverByte(i);
                      onHover(owner?.id ?? null);
                    }}
                    onClick={() => owner && onSelect(owner.id)}
                    onDoubleClick={() => owner && onOpen(owner)}
                    className={`flex h-[20px] cursor-pointer select-none items-center justify-center rounded-[3px] transition-colors duration-100 ${tone} ${
                    hov && !sel ? 'ring-1 ring-inset ring-on-surface/70' : ''}`
                    }>
                    
                      {hex2(bytes[i])}
                    </span>);

              })}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex h-9 shrink-0 items-center gap-2 border-t border-outline-variant px-4 text-xs text-on-surface-variant">
        {hovered && hoverByte !== null ?
        <>
            <span className="font-mono text-on-surface">{hex4(hoverByte)}</span>
            <span>({hoverByte})</span>
            <span className="font-mono">值 0x{hex2(bytes[hoverByte])}</span>
            <span className="truncate font-medium text-on-surface">{hovered.name}</span>
            <span className="ml-auto truncate">{hovered.value}</span>
          </> :

        <span>悬停字节查看所属字段 · 单击定位 · 双击查看解析过程</span>
        }
      </div>
    </section>);

}