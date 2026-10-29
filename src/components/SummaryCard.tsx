import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpenIcon, CircleAlertIcon, CircleCheckIcon, TriangleAlertIcon } from 'lucide-react';
import { SPEC_BY_ID } from '../data/messages';
import { hexN } from '../utils/jt808/hex';
import type { FrameSummary } from '../types/jt808';

interface SummaryCardProps {
  summary: FrameSummary;
  warnings: string[];
}

export function SummaryCard({ summary, warnings }: SummaryCardProps) {
  const items: {label: string;value: string;hint?: string;}[] = [
  { label: '终端手机号', value: summary.phone },
  { label: '消息流水号', value: `${summary.serial}`, hint: hexN(summary.serial, 2) },
  { label: '协议版本', value: `JT/T 808-${summary.version}`, hint: summary.versionNote },
  { label: '消息体长度', value: `${summary.bodyLength} 字节` },
  { label: '帧长度', value: `${summary.totalBytes} 字节`, hint: `输入 ${summary.rawBytes} 字节` },
  { label: '转义', value: summary.escapes ? `${summary.escapes} 处已还原` : '无' }];

  const ok = summary.checksum.ok;

  return (
    <section aria-label="报文摘要" className="shrink-0 rounded-xl bg-surface-container-low px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-sm font-medium text-primary">{hexN(summary.msgId, 2)}</div>
          <h2 className="truncate text-[22px] leading-7 text-on-surface">{summary.msgName}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
        {SPEC_BY_ID[summary.msgId] &&
          <Link
            to={`/docs/${hexN(summary.msgId, 2)}`}
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-primary transition-colors duration-150 hover:bg-primary/[0.08]">
            
            <BookOpenIcon size={16} aria-hidden />
            文档
          </Link>
          }
        <span
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium ${
            ok ? 'bg-success-container text-on-success-container' : 'bg-error-container text-on-error-container'}`
            }>
            
          {ok ? <CircleCheckIcon size={16} aria-hidden /> : <CircleAlertIcon size={16} aria-hidden />}
          {ok ? '校验通过' : '校验失败'}
        </span>
        </div>
      </div>
      <dl className="mt-2.5 grid grid-cols-3 gap-x-4 gap-y-2">
        {items.map((it) =>
        <div key={it.label} className="min-w-0" title={it.hint}>
            <dt className="text-xs text-on-surface-variant">{it.label}</dt>
            <dd className="truncate text-sm font-medium text-on-surface">{it.value}</dd>
          </div>
        )}
      </dl>
      {warnings.length > 0 &&
      <ul className="mt-2.5 space-y-1 rounded-lg bg-safety-container px-3 py-2 text-xs text-on-safety-container">
          {warnings.map((w) =>
        <li key={w} className="flex items-start gap-1.5">
              <TriangleAlertIcon size={14} className="mt-px shrink-0" aria-hidden />
              <span>{w}</span>
            </li>
        )}
        </ul>
      }
    </section>);

}