import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRightIcon, ChevronsDownUpIcon, ChevronsUpDownIcon } from 'lucide-react';
import { SECTION_STYLES } from '../data/sections';
import { collectGroupIds, findAncestors, flattenLeaves } from '../utils/jt808/fields';
import { hex4 } from '../utils/jt808/hex';
import type { Field, Section } from '../types/jt808';

interface FieldTableProps {
  fields: Field[];
  msgLabel: string;
  selectedId: string | null;
  hoverId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onOpen: (field: Field) => void;
}

type Row =
{kind: 'divider';key: string;label: string;section: Section;} |
{kind: 'empty';key: string;} |
{kind: 'field';field: Field;depth: number;};

const COLS =
'grid grid-cols-[60px_36px_minmax(0,1fr)_minmax(0,1.3fr)] md:grid-cols-[60px_40px_minmax(0,1fr)_104px_minmax(0,0.85fr)_minmax(0,1.4fr)]';

export function FieldTable({ fields, msgLabel, selectedId, hoverId, onSelect, onHover, onOpen }: FieldTableProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const groupIds = useMemo(() => collectGroupIds(fields), [fields]);
  const leafCount = useMemo(() => flattenLeaves(fields).length, [fields]);

  useEffect(() => setExpanded(new Set()), [fields]);

  useEffect(() => {
    if (!selectedId) return;
    const path = findAncestors(fields, selectedId) ?? [];
    if (path.length) {
      setExpanded((prev) => {
        if (path.every((id) => prev.has(id))) return prev;
        const next = new Set(prev);
        path.forEach((id) => next.add(id));
        return next;
      });
    }
    requestAnimationFrame(() => {
      scrollRef.current?.querySelector(`[data-row-id="${selectedId}"]`)?.scrollIntoView({ block: 'nearest' });
    });
  }, [selectedId, fields]);

  const rows = useMemo(() => {
    const out: Row[] = [];
    const hasBody = fields.some((f) => f.section === 'body' || f.section === 'extra' || f.section === 'safety');
    let prev: Section | null = null;
    let seenHeader = false;
    const walk = (f: Field, depth: number) => {
      out.push({ kind: 'field', field: f, depth });
      if (f.children && expanded.has(f.id)) f.children.forEach((c) => walk(c, depth + 1));
    };
    fields.forEach((f) => {
      if (f.section !== prev) {
        if (f.section === 'frame' && seenHeader && !hasBody) {
          out.push({ kind: 'divider', key: 'body-empty', label: `消息体 · ${msgLabel}`, section: 'body' });
          out.push({ kind: 'empty', key: 'empty' });
        }
        const label =
        f.section === 'frame' ?
        seenHeader ? '校验与帧尾' : '帧起始' :
        f.section === 'header' ? '消息头' :
        f.section === 'body' ? `消息体 · ${msgLabel}` :
        f.section === 'extra' ? '附加信息' : '主动安全扩展';
        if (f.section === 'header') seenHeader = true;
        out.push({ kind: 'divider', key: `d-${f.id}`, label, section: f.section });
        prev = f.section;
      }
      walk(f, 0);
    });
    return out;
  }, [fields, expanded, msgLabel]);

  const toggle = (id: string) =>
  setExpanded((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);else
    next.add(id);
    return next;
  });

  return (
    <section aria-label="字段解析" className="flex min-h-[420px] flex-col rounded-xl bg-surface-container-low lg:min-h-0">
      <div className="flex h-12 shrink-0 items-center gap-3 px-4">
        <h2 className="text-base font-medium text-on-surface">字段解析</h2>
        <span className="text-xs text-on-surface-variant">{leafCount} 个字段</span>
        <span className="ml-auto hidden text-xs text-on-surface-variant xl:inline">单击定位字节 · 双击或回车查看解析过程</span>
        <div className="flex items-center">
          <button
            type="button"
            title="全部展开"
            aria-label="全部展开"
            disabled={!groupIds.length}
            onClick={() => setExpanded(new Set(groupIds))}
            className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors duration-150 hover:bg-on-surface/[0.08] disabled:opacity-40">
            
            <ChevronsUpDownIcon size={18} />
          </button>
          <button
            type="button"
            title="全部折叠"
            aria-label="全部折叠"
            disabled={!groupIds.length}
            onClick={() => setExpanded(new Set())}
            className="flex h-9 w-9 items-center justify-center rounded-full text-on-surface-variant transition-colors duration-150 hover:bg-on-surface/[0.08] disabled:opacity-40">
            
            <ChevronsDownUpIcon size={18} />
          </button>
        </div>
      </div>
      <div role="row" className={`${COLS} h-8 shrink-0 items-center border-y border-outline-variant px-4 text-xs font-medium text-on-surface-variant`}>
        <span role="columnheader">偏移</span>
        <span role="columnheader" className="pr-2 text-right">长度</span>
        <span role="columnheader">字段</span>
        <span role="columnheader" className="hidden md:block">数据类型</span>
        <span role="columnheader" className="hidden md:block">原始字节</span>
        <span role="columnheader">解析值</span>
      </div>
      <div ref={scrollRef} role="treegrid" aria-label="字段列表" className="m3-scroll min-h-0 flex-1 overflow-auto pb-2">
        {rows.map((row) => {
          if (row.kind === 'divider') {
            return (
              <div key={row.key} className="flex h-6 items-center gap-2 px-4 pt-1 text-[11px] font-medium text-on-surface-variant">
                <span className={`h-2 w-2 rounded-sm ${SECTION_STYLES[row.section].swatch}`} />
                <span className="truncate">{row.label}</span>
                <span className="h-px flex-1 bg-outline-variant" />
              </div>);

          }
          if (row.kind === 'empty') {
            return (
              <div key={row.key} className="flex h-[26px] items-center px-4 pl-[136px] text-[13px] text-on-surface-variant md:pl-[136px]">
                消息体为空
              </div>);

          }
          const f = row.field;
          const isGroup = !!f.children?.length;
          const isOpen = expanded.has(f.id);
          const selected = f.id === selectedId;
          const hovered = f.id === hoverId;
          return (
            <div
              key={f.id}
              data-row-id={f.id}
              role="row"
              tabIndex={0}
              aria-selected={selected}
              aria-expanded={isGroup ? isOpen : undefined}
              aria-level={row.depth + 1}
              onClick={() => onSelect(f.id)}
              onDoubleClick={() => onOpen(f)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onOpen(f);
                if (isGroup && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
                  e.preventDefault();
                  if (e.key === 'ArrowRight' !== isOpen) toggle(f.id);
                }
              }}
              onMouseEnter={() => onHover(f.id)}
              onMouseLeave={() => onHover(null)}
              className={`${COLS} h-[26px] cursor-default select-none items-center px-4 text-[13px] transition-colors duration-100 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${
              selected ? 'bg-secondary-container text-on-secondary-container' : hovered ? 'bg-on-surface/[0.06]' : ''}`
              }>
              
              <span className="flex items-center gap-2 font-mono text-[12px] text-on-surface-variant" title={`十进制 ${f.offset}`}>
                <span className={`h-2 w-2 shrink-0 rounded-sm ${f.error ? 'bg-error' : SECTION_STYLES[f.section].swatch}`} />
                {hex4(f.offset)}
              </span>
              <span className="pr-2 text-right font-mono text-[12px] text-on-surface-variant">{f.length}</span>
              <span className="flex min-w-0 items-center" style={{ paddingLeft: row.depth * 14 }}>
                {isGroup ?
                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={isOpen ? '折叠' : '展开'}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(f.id);
                  }}
                  onDoubleClick={(e) => e.stopPropagation()}
                  className="mr-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full hover:bg-on-surface/[0.08]">
                  
                    <ChevronRightIcon size={14} className={`transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`} />
                  </button> :

                <span className="w-[22px] shrink-0" />
                }
                <span className={`truncate ${isGroup ? 'font-medium' : ''}`}>{f.name}</span>
              </span>
              <span className="hidden truncate pr-3 font-mono text-[12px] text-on-surface-variant md:block" title={f.type}>
                {f.type}
              </span>
              <span className="hidden truncate pr-3 font-mono text-[12px] text-on-surface-variant md:block" title={f.raw}>
                {f.raw}
              </span>
              <span className={`truncate ${f.error ? 'font-medium text-error' : ''}`} title={f.value}>
                {f.value}
              </span>
            </div>);

        })}
      </div>
    </section>);

}