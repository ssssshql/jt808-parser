import React from 'react';
import { DocHeader } from './DocHeader';
import { DocSection } from './DocSection';
import { STATUS_DEFS, alarmDefs } from '../../utils/jt808/dictionaries';
import type { ProtocolVersion } from '../../types/jt808';

interface BitsReferenceProps {
  version: ProtocolVersion;
}

export function BitsReference({ version }: BitsReferenceProps) {
  const alarms = alarmDefs(version);

  return (
    <div>
      <DocHeader
        eyebrow="协议参考"
        title="报警标志与状态位"
        desc="位置信息汇报（0x0200）基本信息中的报警标志与状态均为 32 位 DWORD，按位定义。未列出的位为保留位。" />
      
      <div className="grid gap-7 px-6 py-6 xl:grid-cols-2">
        <DocSection title="报警标志" aside={`JT/T 808-${version}`}>
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest text-[13px]">
            {alarms.map((b) =>
            <div key={b.bit} className="grid grid-cols-[64px_1fr] border-b border-outline-variant/60 px-4 py-1.5 last:border-b-0">
                <span className="font-mono text-on-surface-variant">bit{b.bit}</span>
                <span className="text-on-surface">{b.name}</span>
              </div>
            )}
          </div>
          {version === '2011' && <p className="mt-2 text-xs text-on-surface-variant">2011 版 bit12–14 为保留位，2013 版起定义。</p>}
        </DocSection>
        <DocSection title="状态位">
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest text-[13px]">
            {STATUS_DEFS.map((b) => {
              const width = b.width ?? 1;
              const values = Array.from({ length: 2 ** width }, (_, v) => b.render ? `${v}：${b.render(v)}` : String(v));
              return (
                <div key={b.bit} className="grid grid-cols-[64px_minmax(0,1fr)_minmax(0,1.4fr)] gap-2 border-b border-outline-variant/60 px-4 py-1.5 last:border-b-0">
                  <span className="font-mono text-on-surface-variant">
                    bit{b.bit}
                    {width > 1 ? `–${b.bit + width - 1}` : ''}
                  </span>
                  <span className="text-on-surface">{b.name}</span>
                  <span className="text-on-surface-variant">{values.join(' · ')}</span>
                </div>);

            })}
          </div>
        </DocSection>
      </div>
    </div>);

}