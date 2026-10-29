import React from 'react';
import { SampleMenu } from './SampleMenu';
import { buildSampleFrame } from '../utils/jt808/build';
import { cleanHex, formatHex } from '../utils/jt808/hex';

interface InputPanelProps {
  value: string;
  onChange: (value: string) => void;
}

export function InputPanel({ value, onChange }: InputPanelProps) {
  const chars = cleanHex(value).length;

  return (
    <section aria-label="报文输入" className="shrink-0 rounded-xl bg-surface-container-low px-4 pb-3 pt-4">
      <div className="relative">
        <textarea
          id="frame-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          placeholder="7E 02 00 00 ... 7E"
          className="peer block h-[92px] w-full resize-none rounded-[4px] border border-outline bg-transparent px-4 py-3 font-mono text-[13px] leading-5 text-on-surface placeholder:text-on-surface-variant/60 focus:border-2 focus:border-primary focus:px-[15px] focus:py-[11px] focus:outline-none" />
        
        <label
          htmlFor="frame-input"
          className="absolute -top-2 left-3 bg-surface-container-low px-1 text-xs text-on-surface-variant peer-focus:text-primary">
          
          原始报文（HEX）
        </label>
      </div>
      <div className="mt-2 flex items-center gap-1">
        <SampleMenu onPick={(s) => onChange(buildSampleFrame(s))} />
        <button
          type="button"
          onClick={() => onChange(formatHex(value))}
          className="h-8 rounded-full px-3 text-sm font-medium text-primary transition-colors duration-150 hover:bg-primary/[0.08]">
          
          格式化
        </button>
        <button
          type="button"
          onClick={() => onChange('')}
          className="h-8 rounded-full px-3 text-sm font-medium text-primary transition-colors duration-150 hover:bg-primary/[0.08]">
          
          清空
        </button>
        <span className="ml-auto text-xs text-on-surface-variant">
          {chars ? `${Math.floor(chars / 2)} 字节 · 实时解析` : '支持空格、0x 前缀等格式'}
        </span>
      </div>
    </section>);

}