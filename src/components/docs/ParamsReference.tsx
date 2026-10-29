import React, { useMemo, useState } from 'react';
import { SearchIcon } from 'lucide-react';
import { DocHeader } from './DocHeader';
import { DocSection } from './DocSection';
import { TERMINAL_PARAMS } from '../../data/terminalParams';
import { hexN } from '../../utils/jt808/hex';
import type { ProtocolVersion } from '../../types/jt808';

interface ParamsReferenceProps {
  version: ProtocolVersion;
}

export function ParamsReference({ version }: ParamsReferenceProps) {
  const [query, setQuery] = useState('');
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/^0x/, '');
    return TERMINAL_PARAMS.filter((p) => !q || p.id.toString(16).padStart(4, '0').includes(q) || p.name.toLowerCase().includes(q));
  }, [query]);

  return (
    <div>
      <DocHeader
        eyebrow="协议参考"
        title="终端参数"
        desc="用于 0x8103 设置终端参数、0x8106 查询指定终端参数及 0x0104 查询应答。每个参数项为 参数 ID（DWORD）+ 参数长度（BYTE）+ 参数值。" />
      
      <div className="px-6 py-6">
        <DocSection
          title="参数 ID 列表"
          aside={
          <label className="inline-flex h-8 items-center gap-2 rounded-full bg-surface-container-high px-3">
              <SearchIcon size={14} aria-hidden />
              <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="筛选 ID 或名称"
              aria-label="筛选参数"
              className="w-40 bg-transparent text-xs text-on-surface focus:outline-none" />
            
            </label>
          }>
          
          <div className="m3-scroll overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
            <div className="min-w-[620px] text-[13px]">
              <div className="grid grid-cols-[80px_minmax(220px,1fr)_80px_120px_100px] gap-3 border-b border-outline-variant px-4 py-2 text-xs font-medium text-on-surface-variant">
                <span>参数 ID</span>
                <span>名称</span>
                <span>类型</span>
                <span>单位</span>
                <span>适用版本</span>
              </div>
              {rows.map((p) => {
                const available = !p.versions || p.versions.includes(version);
                return (
                  <div
                    key={p.id}
                    className={`grid grid-cols-[80px_minmax(220px,1fr)_80px_120px_100px] gap-3 border-b border-outline-variant/60 px-4 py-1.5 last:border-b-0 ${available ? '' : 'opacity-50'}`}>
                    
                    <span className="font-mono">{hexN(p.id, 2)}</span>
                    <span className="text-on-surface">{p.name}</span>
                    <span className="font-mono text-[12px]">{p.type}</span>
                    <span className="text-on-surface-variant">{p.unit ?? '—'}</span>
                    <span className="text-on-surface-variant">{p.versions ? p.versions.join(' / ') : '全部'}</span>
                  </div>);

              })}
              {rows.length === 0 && <p className="px-4 py-6 text-center text-sm text-on-surface-variant">没有匹配的参数</p>}
            </div>
          </div>
        </DocSection>
      </div>
    </div>);

}