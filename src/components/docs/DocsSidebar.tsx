import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDownIcon, ArrowUpIcon, BellRingIcon, BoxesIcon, CheckIcon, FrameIcon, SearchIcon, ShieldAlertIcon, SlidersHorizontalIcon, XIcon } from
'lucide-react';
import { DOC_REFERENCES } from '../../data/docReferences';
import { CATEGORIES, MESSAGE_SPECS } from '../../data/messages';
import { hexN } from '../../utils/jt808/hex';
import type { ProtocolVersion } from '../../types/jt808';
import type { DocRefKey } from '../../types/messageSpec';

interface DocsSidebarProps {
  activeKey: string;
  version: ProtocolVersion;
  onSelect: (key: string) => void;
}

type DirFilter = 'all' | 'up' | 'down';

const REF_ICONS: Record<DocRefKey, typeof FrameIcon> = {
  frame: FrameIcon,
  bits: BellRingIcon,
  extras: BoxesIcon,
  safety: ShieldAlertIcon,
  params: SlidersHorizontalIcon
};

export function DocsSidebar({ activeKey, version, onSelect }: DocsSidebarProps) {
  const [query, setQuery] = useState('');
  const [dir, setDir] = useState<DirFilter>('all');
  const navRef = useRef<HTMLElement>(null);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^0x/, '');
    const filtered = MESSAGE_SPECS.filter((s) => {
      if (dir !== 'all' && s.direction !== dir) return false;
      if (!q) return true;
      return s.id.toString(16).padStart(4, '0').includes(q) || s.name.toLowerCase().includes(q);
    });
    return CATEGORIES.map((c) => ({ category: c, items: filtered.filter((s) => s.category === c).sort((a, b) => a.id - b.id) })).filter(
      (g) => g.items.length > 0
    );
  }, [query, dir]);

  const count = groups.reduce((n, g) => n + g.items.length, 0);

  useEffect(() => {
    navRef.current?.querySelector(`[data-doc-key="${activeKey}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [activeKey]);

  const chip = (value: DirFilter, label: string) => {
    const sel = dir === value;
    return (
      <button
        type="button"
        aria-pressed={sel}
        onClick={() => setDir(value)}
        className={`inline-flex h-8 items-center gap-1 rounded-lg px-3 text-sm font-medium transition-colors duration-150 ${
        sel ? 'bg-secondary-container text-on-secondary-container' : 'border border-outline-variant text-on-surface-variant hover:bg-on-surface/[0.08]'}`
        }>
        
        {sel && <CheckIcon size={14} aria-hidden />}
        {label}
      </button>);

  };

  const itemClass = (active: boolean) =>
  `flex h-9 w-full items-center gap-3 rounded-full px-3 text-left text-sm transition-colors duration-100 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${
  active ? 'bg-secondary-container font-medium text-on-secondary-container' : 'text-on-surface hover:bg-on-surface/[0.08]'}`;


  return (
    <aside aria-label="文档导航" className="flex min-h-[360px] flex-col rounded-xl bg-surface-container-low lg:min-h-0">
      <div className="space-y-2 p-3">
        <label className="flex h-11 items-center gap-2 rounded-full bg-surface-container-high px-4 focus-within:outline focus-within:outline-2 focus-within:outline-primary">
          <SearchIcon size={18} className="shrink-0 text-on-surface-variant" aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索消息 ID 或名称"
            aria-label="搜索消息"
            className="min-w-0 flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none" />
          
          {query &&
          <button type="button" aria-label="清除搜索" onClick={() => setQuery('')} className="text-on-surface-variant">
              <XIcon size={16} />
            </button>
          }
        </label>
        <div className="flex items-center gap-2">
          {chip('all', '全部')}
          {chip('up', '上行')}
          {chip('down', '下行')}
          <span className="ml-auto text-xs text-on-surface-variant">{count} 条消息</span>
        </div>
      </div>
      <nav ref={navRef} className="m3-scroll min-h-0 flex-1 overflow-auto px-2 pb-3">
        {!query &&
        <div>
            <h3 className="px-3 pb-1 pt-1 text-xs font-medium text-on-surface-variant">协议参考</h3>
            {DOC_REFERENCES.map((r) => {
            const Icon = REF_ICONS[r.key];
            return (
              <button key={r.key} type="button" data-doc-key={r.key} onClick={() => onSelect(r.key)} className={itemClass(activeKey === r.key)}>
                  <Icon size={16} className="shrink-0" aria-hidden />
                  <span className="truncate">{r.title}</span>
                </button>);

          })}
          </div>
        }
        {groups.map((g) =>
        <div key={g.category}>
            <h3 className="flex items-center justify-between px-3 pb-1 pt-4 text-xs font-medium text-on-surface-variant">
              {g.category}
              <span className="font-normal">{g.items.length}</span>
            </h3>
            {g.items.map((s) => {
            const key = hexN(s.id, 2);
            const available = s.versions.includes(version);
            return (
              <button
                key={s.id}
                type="button"
                data-doc-key={key}
                onClick={() => onSelect(key)}
                title={available ? s.name : `${s.name}（JT/T 808-${version} 未定义）`}
                className={`${itemClass(activeKey === key)} ${available ? '' : 'opacity-50'}`}>
                
                  <span className="w-12 shrink-0 font-mono text-xs">{key}</span>
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  {s.direction === 'up' ?
                <ArrowUpIcon size={14} className="shrink-0 text-on-surface-variant" aria-label="上行" /> :

                <ArrowDownIcon size={14} className="shrink-0 text-on-surface-variant" aria-label="下行" />
                }
                </button>);

          })}
          </div>
        )}
        {count === 0 && <p className="px-3 py-6 text-center text-sm text-on-surface-variant">没有匹配的消息</p>}
      </nav>
    </aside>);

}