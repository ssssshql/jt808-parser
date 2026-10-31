import { useState } from 'react';
import { ArrowRightIcon } from 'lucide-react';
import { DOC_REFERENCES } from '../../data/docReferences';
import type { DocRefKey } from '../../types/messageSpec';
import type { DocRow } from '../../utils/jt808/specDocs';

interface SpecTableProps {
  rows: DocRow[];
  onNavigate: (key: DocRefKey) => void;
  emptyText?: string;
}

const COLS = 'grid grid-cols-[64px_minmax(160px,1fr)_112px_52px_minmax(240px,2fr)] gap-3';

const fmtKey = (k: string) => Number(k) > 9 ? `0x${Number(k).toString(16).toUpperCase().padStart(2, '0')}` : k;

export function SpecTable({ rows, onNavigate, emptyText = '消息体为空' }: SpecTableProps) {
  if (!rows.length) {
    return <p className="rounded-lg bg-surface-container px-4 py-3 text-sm text-on-surface-variant">{emptyText}</p>;
  }
  return (
    <div className="m3-scroll overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div role="table" className="min-w-[760px]">
        <div role="row" className={`${COLS} border-b border-outline-variant px-4 py-2 text-xs font-medium text-on-surface-variant`}>
          <span role="columnheader">起始字节</span>
          <span role="columnheader">字段</span>
          <span role="columnheader">数据类型</span>
          <span role="columnheader">长度</span>
          <span role="columnheader">说明</span>
        </div>
        {rows.map((row) =>
        <div
          key={row.key}
          role="row"
          className={`${COLS} border-b border-outline-variant/60 px-4 py-2 text-[13px] last:border-b-0 ${row.group ? 'bg-surface-container-low' : ''}`}>
          
            <span className="pt-px font-mono text-[12px] text-on-surface-variant">{row.offset}</span>
            <span className={`text-on-surface ${row.group ? 'font-medium' : ''}`} style={{ paddingLeft: row.depth * 16 }}>
              {row.depth > 0 && <span className="mr-1 text-outline">└</span>}
              {row.name}
            </span>
            <span className="pt-px font-mono text-[12px] text-on-surface">{row.type}</span>
            <span className="pt-px font-mono text-[12px] text-on-surface">{row.length}</span>
            <DescCell row={row} onNavigate={onNavigate} />
          </div>
        )}
      </div>
    </div>);

}

function DescCell({ row, onNavigate }: {row: DocRow;onNavigate: (key: DocRefKey) => void;}) {
  const [expanded, setExpanded] = useState(false);
  const entries = row.enumEntries ?? [];
  const hideEnum = !!row.ref && entries.length > 12;
  const shown = expanded ? entries : entries.slice(0, 8);
  const refTitle = row.ref ? DOC_REFERENCES.find((r) => r.key === row.ref)?.title : undefined;

  return (
    <div className="min-w-0 space-y-1">
      {(row.desc || row.unit) &&
      <p className="leading-5 text-on-surface">
          {row.desc}
          {row.unit &&
        <span className="text-on-surface-variant">
              {row.desc ? '，' : ''}单位：{row.unit}
            </span>
        }
        </p>
      }
      {row.lenNote && <p className="text-xs text-on-surface-variant">{row.lenNote}</p>}
      {(row.versionOnly || row.cond) &&
      <div className="flex flex-wrap gap-1">
          {row.versionOnly &&
        <span className="rounded-md bg-secondary-container px-1.5 py-0.5 text-[11px] font-medium text-on-secondary-container">
              仅 {row.versionOnly.join(' / ')}
            </span>
        }
          {row.cond &&
        <span className="rounded-md bg-tertiary-container px-1.5 py-0.5 text-[11px] font-medium text-on-tertiary-container">
              条件：{row.cond}
            </span>
        }
        </div>
      }
      {!hideEnum && entries.length > 0 &&
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-on-surface-variant">
          {shown.map(([k, v]) =>
        <span key={k}>
              <span className="font-mono text-on-surface">{fmtKey(k)}</span> {v}
            </span>
        )}
          {entries.length > 8 &&
        <button type="button" onClick={() => setExpanded((e) => !e)} className="font-medium text-primary hover:underline">
              {expanded ? '收起' : `全部 ${entries.length} 项`}
            </button>
        }
        </div>
      }
      {row.bits &&
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-on-surface-variant">
          {row.bits.map((b) =>
        <span key={`${b.bit}-${b.name}`}>
              <span className="font-mono text-on-surface">
                bit{b.bit}
                {b.width && b.width > 1 ? `–${b.bit + b.width - 1}` : ''}
              </span>{' '}
              {b.name}
            </span>
        )}
        </div>
      }
      {row.ref && refTitle &&
      <button
        type="button"
        onClick={() => onNavigate(row.ref as DocRefKey)}
        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
        
          见「{refTitle}」
          <ArrowRightIcon size={12} aria-hidden />
        </button>
      }
    </div>);

}