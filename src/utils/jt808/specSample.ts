import type { ProtocolVersion } from '../../types/jt808';
import type { MessageSpec, SpecCtx, SpecField, SpecLen } from '../../types/messageSpec';
import { buildSampleFrame } from './build';
import { bytesToHex, cleanHex, hexToBytes } from './hex';

const TIME = [0x26, 0x10, 0x28, 0x14, 0x30, 0x25];
const LOC_BASIC = [
0x00, 0x00, 0x00, 0x00, 0x00, 0x0c, 0x00, 0x03, 0x01, 0x57, 0xfb, 0x6a, 0x06, 0xca, 0xa2, 0xaa,
0x00, 0x32, 0x02, 0x58, 0x00, 0x5a, ...TIME];

const LOC_EXTRAS = [0x01, 0x04, 0x00, 0x00, 0x30, 0x39, 0x30, 0x01, 0x1c, 0x31, 0x01, 0x0c];

const ascii = (s: string): number[] => Array.from(s).map((c) => c.charCodeAt(0) & 0xff);

const fit = (data: number[], n: number): number[] =>
data.length >= n ? data.slice(0, n) : [...data, ...new Array<number>(n - data.length).fill(0)];

function uintBytes(v: number, size: number): number[] {
  const out: number[] = [];
  for (let i = size - 1; i >= 0; i--) out.push(Math.floor(v / 256 ** i) % 256);
  return out;
}

function fixedLen(len: SpecLen | undefined, version: ProtocolVersion): number | null {
  if (len === undefined || len === 'rest') return null;
  if (typeof len === 'number') return len;
  return len[version] ?? null;
}

function visible(fields: SpecField[], version: ProtocolVersion): SpecField[] {
  return fields.filter((f) => !f.versions || f.versions.includes(version));
}

function genFields(fields: SpecField[], ctx: SpecCtx): number[] {
  const list = visible(fields, ctx.version);
  const memo = new Map<SpecField, number[]>();
  const out: number[] = [];
  list.forEach((f, idx) => {
    if (f.when && !f.when(ctx)) return;
    const pre = memo.get(f);
    if (pre) {
      out.push(...pre);
      return;
    }
    if (f.kind === 'uint') {
      const later = list.slice(idx + 1);
      const lenTarget = later.find(
        (g) => (g.kind === 'str' || g.kind === 'bytes' || g.kind === 'location') && g.lenRef === f.name
      );
      const countTarget = later.find((g) => (g.kind === 'list' || g.kind === 'params') && g.countRef === f.name);
      let v: number;
      if (lenTarget) {
        const b = genField(lenTarget, ctx);
        memo.set(lenTarget, b);
        v = b.length;
      } else if (countTarget) {
        v = 1;
      } else {
        v = f.example ?? (f.enum ? Number(Object.keys(f.enum)[0] ?? 1) : f.bits ? 0 : 1);
      }
      ctx.values[f.name] = v;
      out.push(...uintBytes(v, f.size));
      return;
    }
    out.push(...genField(f, ctx));
  });
  return out;
}

function genField(f: SpecField, ctx: SpecCtx): number[] {
  switch (f.kind) {
    case 'uint':
      return uintBytes(f.example ?? 1, f.size);
    case 'bcd':{
        if (f.time) return [...TIME];
        const digits = (f.example ?? '12345678901234567890').padEnd(f.size * 2, '0').slice(0, f.size * 2);
        return Array.from(hexToBytes(digits));
      }
    case 'str':{
        const text = ascii(f.example ?? 'TEST');
        const n = f.lenRef ? null : fixedLen(f.len, ctx.version);
        return n === null ? text : fit(text, n);
      }
    case 'bytes':{
        const ex = f.example !== undefined ? Array.from(hexToBytes(cleanHex(f.example))) : null;
        const n = f.lenRef ? null : fixedLen(f.len, ctx.version);
        if (n === null) return ex ?? [0x01, 0x02, 0x03, 0x04];
        return fit(ex ?? [], n);
      }
    case 'list':{
        const count = f.countRef ? ctx.values[f.countRef] ?? 0 : 1;
        const out: number[] = [];
        for (let i = 0; i < count; i++) out.push(...genFields(f.item, { version: ctx.version, values: { ...ctx.values } }));
        return out;
      }
    case 'location':
      return f.basic ? [...LOC_BASIC] : [...LOC_BASIC, ...LOC_EXTRAS];
    case 'alarmId':
      return ctx.version === '2019' ?
      [...fit(ascii('1234567'), 30), ...TIME, 0x00, 0x01, 0x00, 0x00] :
      [...fit(ascii('1234567'), 7), ...TIME, 0x00, 0x01, 0x00];
    case 'params':{
        const count = ctx.values[f.countRef] ?? 0;
        const out: number[] = [];
        for (let i = 0; i < count; i++) out.push(0x00, 0x00, 0x00, 0x01, 0x04, 0x00, 0x00, 0x00, 0x1e);
        return out;
      }
    default:
      return [];
  }
}

export function generateSampleBody(spec: MessageSpec, version: ProtocolVersion): string {
  return bytesToHex(Uint8Array.from(genFields(spec.fields, { version, values: {} })));
}

export function buildDocSample(spec: MessageSpec, version: ProtocolVersion): string {
  return buildSampleFrame({
    id: `doc-${spec.id}`,
    label: spec.name,
    description: '',
    msgId: spec.id,
    version,
    phone: version === '2019' ? '13800138000' : '013912345678',
    serial: 1,
    body: generateSampleBody(spec, version)
  });
}