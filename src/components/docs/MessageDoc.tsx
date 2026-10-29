import React, { useMemo, useState } from 'react';
import { ArrowDownIcon, ArrowUpIcon, PlayIcon, TriangleAlertIcon } from 'lucide-react';
import { DocHeader } from './DocHeader';
import { DocSection } from './DocSection';
import { SpecTable } from './SpecTable';
import { MESSAGE_SPECS, SPEC_BY_ID } from '../../data/messages';
import { hexN } from '../../utils/jt808/hex';
import { buildDocRows, totalLength, versionDiffs } from '../../utils/jt808/specDocs';
import { buildDocSample } from '../../utils/jt808/specSample';
import { ALL_VERSIONS } from '../../utils/jt808/specHelpers';
import type { ProtocolVersion } from '../../types/jt808';
import type { MessageSpec } from '../../types/messageSpec';

interface MessageDocProps {
  spec: MessageSpec;
  version: ProtocolVersion;
  onNavigate: (key: string) => void;
  onOpenSample: (hex: string, version: ProtocolVersion) => void;
}

export function MessageDoc({ spec, version, onNavigate, onOpenSample }: MessageDocProps) {
  const [copied, setCopied] = useState(false);
  const supported = spec.versions.includes(version);
  const docVersion = supported ? version : spec.versions[spec.versions.length - 1];
  const rows = useMemo(() => buildDocRows(spec.fields, docVersion), [spec, docVersion]);
  const sample = useMemo(() => buildDocSample(spec, docVersion), [spec, docVersion]);
  const diffs = useMemo(() => versionDiffs(spec), [spec]);
  const requestedBy = useMemo(() => MESSAGE_SPECS.filter((m) => m.replies?.includes(spec.id)), [spec]);
  const total = totalLength(spec.fields, docVersion);
  const up = spec.direction === 'up';

  const copy = () => {
    navigator.clipboard?.writeText(sample).then(() => setCopied(true)).catch(() => setCopied(false));
  };

  const linkList = (ids: number[]) =>
  ids.map((id) =>
  <button
    key={id}
    type="button"
    onClick={() => onNavigate(hexN(id, 2))}
    className="mr-3 inline-flex items-center gap-1.5 text-primary hover:underline">
    
        <span className="font-mono text-xs">{hexN(id, 2)}</span>
        {SPEC_BY_ID[id]?.name ?? '未知消息'}
      </button>
  );

  return (
    <div>
      <DocHeader
        eyebrow={
        <>
            <span className="font-mono font-medium text-primary">{hexN(spec.id, 2)}</span>
            <span className="inline-flex h-6 items-center gap-1 rounded-md bg-surface-container-high px-2 text-xs text-on-surface-variant">
              {up ? <ArrowUpIcon size={12} aria-hidden /> : <ArrowDownIcon size={12} aria-hidden />}
              {up ? '上行 · 终端 → 平台' : '下行 · 平台 → 终端'}
            </span>
            <span className="inline-flex h-6 items-center rounded-md bg-surface-container-high px-2 text-xs text-on-surface-variant">{spec.category}</span>
            <span className="inline-flex h-6 items-center rounded-md bg-surface-container-high px-2 text-xs text-on-surface-variant">{spec.standard}</span>
          </>
        }
        title={spec.name}
        desc={spec.desc}>
        
        <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3 text-sm">
          <div>
            <div className="text-xs text-on-surface-variant">适用版本</div>
            <div className="mt-1 flex gap-1">
              {ALL_VERSIONS.map((v) =>
              <span
                key={v}
                className={`rounded-md px-2 py-0.5 text-xs font-medium ${
                spec.versions.includes(v) ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container text-on-surface-variant/60 line-through'}`
                }>
                
                  {v}
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-on-surface-variant">消息体长度</div>
            <div className="mt-1 font-medium text-on-surface">{total === null ? '可变' : total === 0 ? '空' : `${total} 字节`}</div>
          </div>
          {spec.replies && spec.replies.length > 0 &&
          <div>
              <div className="text-xs text-on-surface-variant">应答消息</div>
              <div className="mt-1">{linkList(spec.replies)}</div>
            </div>
          }
          {requestedBy.length > 0 &&
          <div>
              <div className="text-xs text-on-surface-variant">应答对象</div>
              <div className="mt-1">{linkList(requestedBy.map((m) => m.id))}</div>
            </div>
          }
          <button
            type="button"
            onClick={() => onOpenSample(sample, docVersion)}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-on-primary shadow-elev-1 transition-shadow duration-150 hover:shadow-elev-2">
            
            <PlayIcon size={16} aria-hidden />
            在解析器中打开示例
          </button>
        </div>
      </DocHeader>

      <div className="space-y-7 px-6 py-6">
        {!supported &&
        <div className="flex items-start gap-2 rounded-xl bg-safety-container px-4 py-3 text-sm text-on-safety-container">
            <TriangleAlertIcon size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              JT/T 808-{version} 未定义该消息，以下按 {docVersion} 版显示。
            </span>
          </div>
        }

        <DocSection title="消息体结构" aside={`JT/T 808-${docVersion} · 起始字节从消息体第 0 字节计`}>
          <SpecTable rows={rows} onNavigate={onNavigate} />
        </DocSection>

        {diffs.length > 0 &&
        <DocSection title="版本差异">
            <ul className="space-y-1.5 text-sm text-on-surface">
              {diffs.map((d) =>
            <li key={d} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {d}
                </li>
            )}
            </ul>
          </DocSection>
        }

        {spec.notes && spec.notes.length > 0 &&
        <DocSection title="补充说明">
            <ul className="list-disc space-y-1 pl-5 text-sm text-on-surface">
              {spec.notes.map((n) =>
            <li key={n}>{n}</li>
            )}
            </ul>
          </DocSection>
        }

        <DocSection title="示例报文" aside={`JT/T 808-${docVersion} 完整帧，含消息头与校验码`}>
          <div className="rounded-xl bg-surface-container px-4 py-3">
            <p className="break-all font-mono text-[12px] leading-5 text-on-surface">{sample}</p>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={copy}
                className="h-8 rounded-full px-3 text-sm font-medium text-primary transition-colors duration-150 hover:bg-primary/[0.08]">
                
                {copied ? '已复制' : '复制'}
              </button>
            </div>
          </div>
        </DocSection>
      </div>
    </div>);

}