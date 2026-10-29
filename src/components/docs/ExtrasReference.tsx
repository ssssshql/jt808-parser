import React from 'react';
import { ArrowRightIcon } from 'lucide-react';
import { DocHeader } from './DocHeader';
import { DocSection } from './DocSection';
import { EXTRA_DOCS } from '../../data/referenceSpecs';
import { SAFETY_EXTRA_IDS } from '../../utils/jt808/dictionaries';
import { hexN } from '../../utils/jt808/hex';
import type { DocRefKey } from '../../types/messageSpec';

interface ExtrasReferenceProps {
  onNavigate: (key: DocRefKey) => void;
}

export function ExtrasReference({ onNavigate }: ExtrasReferenceProps) {
  return (
    <div>
      <DocHeader
        eyebrow="协议参考"
        title="位置附加信息"
        desc="位置基本信息（28 字节）之后可跟随 0 至多个附加信息项。每项为 附加信息 ID（BYTE）+ 附加信息长度（BYTE）+ 附加信息内容，解析器遇到未定义的 ID 时按原始字节显示。" />
      
      <div className="px-6 py-6">
        <DocSection title="附加信息项定义" aside={`${EXTRA_DOCS.length} 项`}>
          <div className="m3-scroll overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
            <div className="min-w-[640px] text-[13px]">
              <div className="grid grid-cols-[64px_72px_minmax(160px,1fr)_minmax(240px,2fr)] gap-3 border-b border-outline-variant px-4 py-2 text-xs font-medium text-on-surface-variant">
                <span>ID</span>
                <span>长度</span>
                <span>名称</span>
                <span>说明</span>
              </div>
              {EXTRA_DOCS.map((e) => {
                const safety = SAFETY_EXTRA_IDS.includes(e.id);
                return (
                  <div key={e.id} className="grid grid-cols-[64px_72px_minmax(160px,1fr)_minmax(240px,2fr)] gap-3 border-b border-outline-variant/60 px-4 py-2 last:border-b-0">
                    <span className="font-mono">{hexN(e.id, 1)}</span>
                    <span className="font-mono">{e.length}</span>
                    <span className="text-on-surface">
                      {e.name}
                      {e.versions &&
                      <span className="ml-2 rounded-md bg-secondary-container px-1.5 py-0.5 text-[11px] font-medium text-on-secondary-container">{e.versions}</span>
                      }
                    </span>
                    <span className="text-on-surface-variant">
                      {e.desc}
                      {safety &&
                      <button
                        type="button"
                        onClick={() => onNavigate('safety')}
                        className="ml-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        
                          查看结构
                          <ArrowRightIcon size={12} aria-hidden />
                        </button>
                      }
                    </span>
                  </div>);

              })}
            </div>
          </div>
        </DocSection>
      </div>
    </div>);

}