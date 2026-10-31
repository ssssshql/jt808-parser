
import { DocHeader } from './DocHeader';
import { DocSection } from './DocSection';
import { alarmDefs, statusDefs } from '../../utils/jt808/dictionaries';
import type { ProtocolVersion } from '../../types/jt808';

const ALARM_NOTE: Record<ProtocolVersion, string> = {
  '2011': '2011 表 18：bit12–17、bit29–31 为保留位；表 17 状态位仅 bit0–5、bit10–12 有定义。',
  '2013': '2013 表 24：bit15–17 为保留位。',
  '2019': '2019 表 25：新增 bit15–17，bit3 改为危险驾驶行为报警，bit29 改为碰撞侧翻报警，bit31 为保留位。'
};

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
          <p className="mt-2 text-xs text-on-surface-variant">{ALARM_NOTE[version]}</p>
        </DocSection>
        <DocSection title="状态位" aside={`JT/T 808-${version}`}>
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest text-[13px]">
            {statusDefs(version).map((b) => {
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