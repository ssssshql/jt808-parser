import type { ProtocolVersion } from '../../types/jt808';
import type { DocRefKey, MessageSpec, SpecField, SpecLen } from '../../types/messageSpec';
import { ALARM_ID_FIELDS, LOCATION_BASIC_FIELDS, PARAM_ITEM_FIELDS } from '../../data/referenceSpecs';
import type { BitDef } from './reader';

export interface DocRow {
  key: string;
  depth: number;
  offset: string;
  name: string;
  type: string;
  length: string;
  desc?: string;
  unit?: string;
  enumEntries?: [string, string][];
  bits?: BitDef[];
  cond?: string;
  versionOnly?: ProtocolVersion[];
  lenNote?: string;
  ref?: DocRefKey;
  group: boolean;
}

const UINT_TYPES: Record<number, string> = { 1: 'BYTE', 2: 'WORD', 4: 'DWORD' };

function lenOf(len: SpecLen | undefined, lenRef: string | undefined, version: ProtocolVersion): number | null {
  if (lenRef || len === undefined || len === 'rest') return null;
  if (typeof len === 'number') return len;
  return len[version] ?? null;
}

export function fixedLength(f: SpecField, version: ProtocolVersion): number | null {
  switch (f.kind) {
    case 'uint':
    case 'bcd':
      return f.size;
    case 'str':
    case 'bytes':
      return lenOf(f.len, f.lenRef, version);
    case 'location':
      return f.basic ? 28 : null;
    case 'alarmId':
      return version === '2019' ? 39 : 16;
    default:
      return null;
  }
}

function unitText(scale: number | undefined, unit: string | undefined): string | undefined {
  if (scale) return `${scale === 1e6 ? '10⁻⁶' : `1/${scale}`}${unit ? ` ${unit}` : ''}`;
  return unit;
}

export function buildDocRows(fields: SpecField[], version: ProtocolVersion): DocRow[] {
  const rows: DocRow[] = [];
  walk(fields, version, 0, rows, 'r', 0);
  return rows;
}

function walk(fields: SpecField[], version: ProtocolVersion, depth: number, rows: DocRow[], prefix: string, start: number | null): number | null {
  let off: number | null = start;
  fields.forEach((f, i) => {
    if (f.versions && !f.versions.includes(version)) return;
    const key = `${prefix}.${i}`;
    const offset = off === null ? '—' : depth === 0 ? String(off) : `+${off}`;
    const len = fixedLength(f, version);
    const base: DocRow = {
      key,
      depth,
      offset,
      name: f.name,
      type: '',
      length: len === null ? '可变' : String(len),
      desc: f.desc,
      cond: f.whenText,
      versionOnly: f.versions && f.versions.length < 3 ? f.versions : undefined,
      ref: f.ref,
      group: false
    };
    switch (f.kind) {
      case 'uint':
        rows.push({
          ...base,
          type: UINT_TYPES[f.size],
          unit: unitText(f.scale, f.unit),
          enumEntries: f.enum ? Object.entries(f.enum) : undefined,
          bits: f.bits
        });
        break;
      case 'bcd':
        rows.push({ ...base, type: `BCD[${f.size}]` });
        break;
      case 'str':
        rows.push({
          ...base,
          type: f.enc === 'gbk' ? 'STRING · GBK' : 'STRING',
          length: len !== null ? String(len) : f.lenRef ? 'n' : '剩余',
          lenNote: f.lenRef ? `长度由「${f.lenRef}」指定` : len === null ? '占用消息体剩余全部字节' : undefined
        });
        break;
      case 'bytes':
        rows.push({
          ...base,
          type: len !== null ? `BYTE[${len}]` : 'BYTE[n]',
          length: len !== null ? String(len) : f.lenRef ? 'n' : '剩余',
          lenNote: f.lenRef ? `长度由「${f.lenRef}」指定` : len === null ? '占用消息体剩余全部字节' : undefined
        });
        break;
      case 'list':
        rows.push({
          ...base,
          type: '列表',
          group: true,
          lenNote: f.countRef ? `重复次数由「${f.countRef}」指定` : '重复至消息体结束'
        });
        walk(f.item, version, depth + 1, rows, key, 0);
        break;
      case 'location':
        if (!f.basic && !f.lenRef) {
          const after = walk(LOCATION_BASIC_FIELDS, version, depth, rows, key, off);
          rows.push({
            key: `${key}.x`,
            depth,
            offset: after === null ? '—' : depth === 0 ? String(after) : `+${after}`,
            name: '附加信息项列表',
            type: 'TLV 列表',
            length: '可变',
            desc: '0 至多个附加信息项，每项为 ID(1) + 长度(1) + 内容',
            ref: 'extras',
            group: false
          });
        } else {
          rows.push({
            ...base,
            type: f.basic ? '位置基本信息' : '位置信息',
            group: true,
            lenNote: f.lenRef ? `长度由「${f.lenRef}」指定` : undefined
          });
          walk(LOCATION_BASIC_FIELDS, version, depth + 1, rows, key, 0);
          if (!f.basic) {
            rows.push({ key: `${key}.x`, depth: depth + 1, offset: '+28', name: '附加信息项列表', type: 'TLV 列表', length: '可变', ref: 'extras', group: false });
          }
        }
        break;
      case 'alarmId':
        rows.push({ ...base, type: `BYTE[${len}]`, group: true });
        walk(ALARM_ID_FIELDS, version, depth + 1, rows, key, 0);
        break;
      case 'params':
        rows.push({ ...base, type: '参数项列表', group: true, lenNote: `重复次数由「${f.countRef}」指定` });
        walk(PARAM_ITEM_FIELDS, version, depth + 1, rows, key, 0);
        break;
      default:
        break;
    }
    if (f.when || len === null) off = null;else
    if (off !== null) off += len;
  });
  return off;
}

export function totalLength(fields: SpecField[], version: ProtocolVersion): number | null {
  let total = 0;
  for (const f of fields) {
    if (f.versions && !f.versions.includes(version)) continue;
    const len = fixedLength(f, version);
    if (len === null || f.when) return null;
    total += len;
  }
  return total;
}

export function versionDiffs(spec: MessageSpec): string[] {
  const out: string[] = [];
  const walkDiff = (fields: SpecField[]) =>
  fields.forEach((f) => {
    if (f.versions && f.versions.length < 3) out.push(`「${f.name}」仅 ${f.versions.join(' / ')} 版包含`);
    if ((f.kind === 'str' || f.kind === 'bytes') && f.len && typeof f.len === 'object') {
      const entries = Object.entries(f.len);
      if (new Set(entries.map(([, v]) => v)).size > 1) {
        out.push(`「${f.name}」长度：${entries.map(([v, n]) => `${v} 为 ${n} 字节`).join('，')}`);
      }
    }
    if (f.kind === 'alarmId') out.push(`「${f.name}」中终端 ID：2011/2013 为 7 字节，2019 为 30 字节`);
    if (f.kind === 'list') walkDiff(f.item);
  });
  walkDiff(spec.fields);
  return Array.from(new Set(out));
}