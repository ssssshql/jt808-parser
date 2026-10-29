import React from 'react';
import { DocHeader } from './DocHeader';
import { DocSection } from './DocSection';
import { SpecTable } from './SpecTable';
import { SAFETY_EXTRA_SPECS } from '../../data/referenceSpecs';
import { SPEC_BY_ID } from '../../data/messages';
import { buildDocRows } from '../../utils/jt808/specDocs';
import { hexN } from '../../utils/jt808/hex';
import type { ProtocolVersion } from '../../types/jt808';
import type { DocRefKey } from '../../types/messageSpec';

interface SafetyReferenceProps {
  version: ProtocolVersion;
  onNavigate: (key: string) => void;
}

const FLOW: {id: number;text: string;}[] = [
{ id: 0x0200, text: '终端在位置汇报中携带 0x64–0x67、0x70 主动安全附加信息，报警标识号中声明附件数量' },
{ id: 0x9208, text: '平台下发附件服务器地址与报警编号' },
{ id: 0x1210, text: '终端连接附件服务器，上报附件文件列表' },
{ id: 0x1211, text: '每个文件上传前发送文件信息' },
{ id: 0x1212, text: '文件数据（码流）上传完成后发送完成消息' },
{ id: 0x9212, text: '附件服务器应答完成或要求补传' }];


export function SafetyReference({ version, onNavigate }: SafetyReferenceProps) {
  return (
    <div>
      <DocHeader
        eyebrow="协议参考 · 粤标主动安全"
        title="主动安全附加信息"
        desc="依据广东省道路运输车辆主动安全智能防控系统通讯协议（粤标），主动安全报警通过位置汇报附加信息 0x64 ADAS、0x65 DSM、0x66 TPMS、0x67 BSD 及 0x70 激烈驾驶上报。报警标识号中的终端 ID 在 2011/2013 版为 7 字节，2019 版为 30 字节，解析器按剩余长度自动识别。" />
      
      <div className="space-y-8 px-6 py-6">
        <DocSection title="报警附件上传流程">
          <ol className="space-y-2">
            {FLOW.map((s, i) =>
            <li key={s.id} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary-container text-xs font-medium text-on-secondary-container">
                  {i + 1}
                </span>
                <div className="pt-0.5 text-sm">
                  <button type="button" onClick={() => onNavigate(hexN(s.id, 2))} className="mr-2 font-medium text-primary hover:underline">
                    <span className="font-mono">{hexN(s.id, 2)}</span> {SPEC_BY_ID[s.id]?.name}
                  </button>
                  <span className="text-on-surface-variant">{s.text}</span>
                </div>
              </li>
            )}
          </ol>
        </DocSection>

        {SAFETY_EXTRA_SPECS.map((s) =>
        <DocSection key={s.id} title={`${hexN(s.id, 1)} ${s.name}`} aside={`JT/T 808-${version}`}>
            <p className="mb-3 text-sm text-on-surface-variant">{s.desc}</p>
            <SpecTable rows={buildDocRows(s.fields, version)} onNavigate={(k: DocRefKey) => onNavigate(k)} />
          </DocSection>
        )}
      </div>
    </div>);

}