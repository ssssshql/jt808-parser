
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
{ id: 0x0200, text: '终端在位置汇报中携带 0x64–0x67 主动安全附加信息，报警标识号中声明附件数量' },
{ id: 0x9208, text: '平台下发附件服务器地址与报警编号' },
{ id: 0x1210, text: '终端连接附件服务器，上报附件文件列表' },
{ id: 0x1211, text: '每个文件上传前发送文件信息' },
{ id: 0x1212, text: '文件数据（码流）上传完成后发送完成消息' },
{ id: 0x9212, text: '附件服务器应答完成或要求补传' }];


export function SafetyReference({ version, onNavigate }: SafetyReferenceProps) {
  return (
    <div>
      <DocHeader
        eyebrow="协议参考 · 苏标 / 粤标主动安全"
        title="主动安全附加信息"
        desc="主动安全报警通过位置汇报附加信息 0x64 ADAS、0x65 DSM、0x66 TPMS、0x67 BSD 上报。苏标 T/JSATL 12-2017 基于 JT/T 808-2011，报警标识号 16 字节（终端 ID 7 + 预留 1）；粤标 T/GDRTA 002-2020 基于 JT/T 808-2019，报警标识号 40 字节（终端 ID 30 + 预留 2），并扩展了 ADAS/DSM 报警类型，胎压报警位置为 BYTE[2]。解析器用终端 ID 之后的 BCD 时间与报文长度判断标准，判断不了时 2011/2013 按苏标、2019 按粤标。本页按所选协议版本展示对应标准。" />
      
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
        <DocSection key={s.id} title={`${hexN(s.id, 1)} ${s.name}`} aside={version === '2019' ? '粤标 T/GDRTA 002-2020' : '苏标 T/JSATL 12-2017'}>
            <p className="mb-3 text-sm text-on-surface-variant">{s.desc}</p>
            <SpecTable rows={buildDocRows(s.fields, version)} onNavigate={(k: DocRefKey) => onNavigate(k)} />
          </DocSection>
        )}
      </div>
    </div>);

}