import type { Field, ParseOutcome } from '../../types/jt808';
import { hexN } from './hex';

interface ExportField {
  name: string;
  type: string;
  offset: number;
  length: number;
  raw: string;
  value: string;
  error?: boolean;
  children?: ExportField[];
}

const slim = (f: Field): ExportField => ({
  name: f.name,
  type: f.type,
  offset: f.offset,
  length: f.length,
  raw: f.raw,
  value: f.value,
  ...(f.error ? { error: true } : {}),
  ...(f.children?.length ? { children: f.children.map(slim) } : {})
});

/** 把一条或多条解析结果转成便于保存/对比的 JSON（偏移基于反转义后的报文） */
export function toExportJson(entries: {label: string;hex: string;result: ParseOutcome;}[]): string {
  const frames = entries.map(({ label, hex, result }) =>
  result.ok ?
  {
    label,
    input: hex,
    msgId: hexN(result.summary.msgId, 2),
    msgName: result.summary.msgName,
    summary: result.summary,
    warnings: result.warnings,
    fields: result.fields.map(slim)
  } :
  { label, input: hex, error: result.error }
  );
  return JSON.stringify({ tool: 'jt808-parser', exportedAt: new Date().toISOString(), frames }, null, 2);
}

export function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
