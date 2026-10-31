
import { CircleAlertIcon, InboxIcon } from 'lucide-react';

interface ParseStatePanelProps {
  error: string;
  empty: boolean;
}

export function ParseStatePanel({ error, empty }: ParseStatePanelProps) {
  return (
    <section className="flex min-h-[320px] flex-col items-center justify-center rounded-xl bg-surface-container-low px-6 text-center">
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-2xl ${
        empty ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'}`
        }>
        
        {empty ? <InboxIcon size={26} aria-hidden /> : <CircleAlertIcon size={26} aria-hidden />}
      </div>
      <h2 className="mt-4 text-base font-medium text-on-surface">{empty ? '等待报文' : '无法解析该报文'}</h2>
      <p className="mt-1 max-w-sm text-sm text-on-surface-variant">{error}</p>
      {!empty &&
      <p className="mt-3 max-w-sm text-xs text-on-surface-variant">
          标准格式：0x7E + 消息头 + 消息体 + 校验码 + 0x7E，中间的 0x7E / 0x7D 需转义为 7D 02 / 7D 01
        </p>
      }
    </section>);

}