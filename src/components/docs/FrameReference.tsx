import React, { useMemo } from 'react';
import { DocHeader } from './DocHeader';
import { DocSection } from './DocSection';
import { SpecTable } from './SpecTable';
import { SECTION_STYLES } from '../../data/sections';
import { HEADER_FIELDS } from '../../data/referenceSpecs';
import { buildDocRows } from '../../utils/jt808/specDocs';
import type { ProtocolVersion } from '../../types/jt808';
import type { DocRefKey } from '../../types/messageSpec';

interface FrameReferenceProps {
  version: ProtocolVersion;
  onNavigate: (key: DocRefKey) => void;
}

const DATA_TYPES = [
['BYTE', '无符号单字节整型（8 位）'],
['WORD', '无符号双字节整型（16 位），大端序'],
['DWORD', '无符号四字节整型（32 位），大端序'],
['BYTE[n]', 'n 字节原始数据'],
['BCD[n]', '8421 码，每字节表示两位十进制数'],
['STRING', '字符串，中文使用 GBK 编码，无数据时置空']];


export function FrameReference({ version, onNavigate }: FrameReferenceProps) {
  const rows = useMemo(() => buildDocRows(HEADER_FIELDS, version), [version]);
  const headerLen = version === '2019' ? 17 : 12;
  const blocks = [
  { label: '标识位', sub: '0x7E · 1', section: 'frame' as const, grow: 1 },
  { label: '消息头', sub: `${headerLen} 或 ${headerLen + 4} 字节`, section: 'header' as const, grow: 3 },
  { label: '消息体', sub: '0–1023 字节', section: 'body' as const, grow: 5 },
  { label: '校验码', sub: '1 字节', section: 'frame' as const, grow: 1 },
  { label: '标识位', sub: '0x7E · 1', section: 'frame' as const, grow: 1 }];


  return (
    <div>
      <DocHeader
        eyebrow="协议参考"
        title="消息结构与编码"
        desc="每条 JT808 消息由标识位、消息头、消息体和校验码组成。所有多字节整数采用大端序（网络字节序）传输。" />
      
      <div className="space-y-7 px-6 py-6">
        <DocSection title="帧格式">
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-surface-container-lowest p-3">
            {blocks.map((b, i) =>
            <div key={i} style={{ flexGrow: b.grow }} className={`min-w-[84px] basis-0 rounded-lg px-3 py-3 ${SECTION_STYLES[b.section].tint}`}>
                <div className="text-sm font-medium">{b.label}</div>
                <div className="mt-0.5 text-xs opacity-80">{b.sub}</div>
              </div>
            )}
          </div>
        </DocSection>

        <DocSection title="消息头" aside={`JT/T 808-${version} · 不分包时 ${headerLen} 字节`}>
          <SpecTable rows={rows} onNavigate={onNavigate} />
        </DocSection>

        <div className="grid gap-7 xl:grid-cols-2">
          <DocSection title="转义规则">
            <p className="mb-3 text-sm leading-6 text-on-surface">
              消息头、消息体和校验码中出现 0x7E 或 0x7D 时需要转义，接收方按相反规则还原。
            </p>
            <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest text-sm">
              {[
              ['0x7E', '0x7D 0x02'],
              ['0x7D', '0x7D 0x01']].
              map(([a, b]) =>
              <div key={a} className="grid grid-cols-2 border-b border-outline-variant/60 px-4 py-2 font-mono last:border-b-0">
                  <span>{a}</span>
                  <span>→ {b}</span>
                </div>
              )}
            </div>
            <ol className="mt-3 space-y-1.5 text-sm text-on-surface">
              <li><span className="font-medium">发送：</span>封装消息 → 计算校验码 → 转义 → 首尾加 0x7E</li>
              <li><span className="font-medium">接收：</span>去除首尾 0x7E → 反转义 → 验证校验码 → 解析</li>
            </ol>
          </DocSection>
          <DocSection title="校验码">
            <p className="text-sm leading-6 text-on-surface">
              从消息头第一个字节开始，到消息体最后一个字节结束，逐字节进行异或（XOR），结果占 1 字节。校验在转义前计算、反转义后验证。
            </p>
            <p className="mt-3 rounded-xl bg-surface-container px-4 py-3 font-mono text-[12px] text-on-surface">
              CS = H[0] ⊕ H[1] ⊕ … ⊕ B[n-1]
            </p>
          </DocSection>
        </div>

        <DocSection title="数据类型">
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest text-sm">
            {DATA_TYPES.map(([t, d]) =>
            <div key={t} className="grid grid-cols-[120px_1fr] border-b border-outline-variant/60 px-4 py-2 last:border-b-0">
                <span className="font-mono text-[13px]">{t}</span>
                <span className="text-on-surface">{d}</span>
              </div>
            )}
          </div>
        </DocSection>

        <DocSection title="版本差异">
          <ul className="space-y-1.5 text-sm text-on-surface">
            <li>2019 版消息体属性 bit14 为版本标识（置 1），2011/2013 版该位保留为 0。</li>
            <li>2019 版消息头新增 1 字节协议版本号，终端手机号由 BCD[6] 扩展为 BCD[10]。</li>
            <li>2011 与 2013 版消息头结构一致，差异主要在消息体（如终端注册的字段长度）。</li>
          </ul>
        </DocSection>
      </div>
    </div>);

}