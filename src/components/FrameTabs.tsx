import type { FrameItem } from '../utils/jt808/multi';

interface FrameTabsProps {
  items: FrameItem[];
  value: number;
  onChange: (index: number) => void;
}

/** 多条报文 / 合并分包之间切换 */
export function FrameTabs({ items, value, onChange }: FrameTabsProps) {
  if (items.length < 2) return null;
  return (
    <nav aria-label="报文列表" className="m3-scroll flex shrink-0 gap-2 overflow-x-auto rounded-xl bg-surface-container-low px-3 py-2">
      {items.map((it, i) =>
      <button
        key={`${i}-${it.hex.length}`}
        type="button"
        onClick={() => onChange(i)}
        aria-pressed={i === value}
        className={`h-8 shrink-0 whitespace-nowrap rounded-lg border px-3 text-xs font-medium transition-colors duration-150 ${
        i === value ?
        'border-transparent bg-secondary-container text-on-secondary-container' :
        'border-outline-variant text-on-surface-variant hover:bg-on-surface/[0.08]'}`
        }>
          {it.label}
        </button>
      )}
    </nav>);

}
