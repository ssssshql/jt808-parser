import type { Field, ProtocolVersion } from '../../types/jt808';
import type { MessageSpec, SpecCtx, SpecField, SpecLen, UintSpec } from '../../types/messageSpec';
import { parseLocation } from './location';
import { parseParams } from './params';
import { Reader, bitsFrom, errorField, group, type Interpretation } from './reader';
import { parseAlarmIdentifier } from './safety';

interface RunCtx extends SpecCtx {
  abort: {v: boolean;};
}

export function parseBySpec(r: Reader, spec: MessageSpec, version: ProtocolVersion, out: Field[]): void {
  parseFields(r, spec.fields, { version, values: {}, abort: { v: false } }, out);
}

export function resolveLen(len: SpecLen | undefined, lenRef: string | undefined, ctx: SpecCtx, remaining: number): number {
  if (lenRef) return ctx.values[lenRef] ?? 0;
  if (len === undefined || len === 'rest') return remaining;
  if (typeof len === 'number') return len;
  return len[ctx.version] ?? len['2013'] ?? len['2019'] ?? remaining;
}

function scaleText(scale: number): string {
  return scale === 1e6 ? '10⁻⁶' : `1/${scale}`;
}

function describeUint(f: UintSpec, v: number): Interpretation {
  const steps: string[] = [];
  let value: string | undefined;
  let bits;
  if (f.bits) {
    bits = bitsFrom(v, f.bits);
    const on = bits.filter((b) => b.active).map((b) => b.value === '1' ? b.name : `${b.name}：${b.value}`);
    value = on.length ? on.join('、') : '无';
    steps.push(on.length ? `置位：${bits.filter((b) => b.active).map((b) => `bit${b.bits} ${b.name}`).join('，')}` : '所有定义位均为 0');
  } else if (f.enum) {
    const label = f.enum[v];
    value = label !== undefined ? label : `未定义 (${v})`;
    steps.push(`查取值表：${v} → ${label ?? '未定义'}`);
  } else if (f.scale) {
    const digits = Math.max(0, Math.round(Math.log10(f.scale)));
    const x = (v / f.scale).toFixed(digits);
    value = `${x}${f.unit ? ` ${f.unit}` : ''}`;
    steps.push(`单位 ${scaleText(f.scale)}${f.unit ? ` ${f.unit}` : ''} → ${v} ÷ ${f.scale} = ${x}`);
  } else if (f.unit) {
    value = `${v} ${f.unit}`;
  }
  if (f.desc) steps.push(`说明：${f.desc}`);
  return { value, steps, bits };
}

function parseFields(r: Reader, fields: SpecField[], ctx: RunCtx, out: Field[]): void {
  for (const f of fields) {
    if (ctx.abort.v) return;
    if (f.versions && !f.versions.includes(ctx.version)) continue;
    if (f.when && !f.when(ctx)) continue;
    out.push(...parseOne(r, f, ctx));
  }
}

function parseOne(r: Reader, f: SpecField, ctx: RunCtx): Field[] {
  const descStep = f.desc ? [`说明：${f.desc}`] : [];
  switch (f.kind) {
    case 'uint':{
        const fld = r.uint(f.name, f.size, (v) => describeUint(f, v));
        ctx.values[f.name] = fld.num ?? 0;
        return [fld];
      }
    case 'bcd':{
        const fld = f.time ? r.time(f.name) : r.bcd(f.name, f.size);
        fld.steps.push(...descStep);
        return [fld];
      }
    case 'str':{
        const n = resolveLen(f.len, f.lenRef, ctx, r.remaining);
        const fld = r.str(f.name, n, f.enc ?? 'ascii');
        if (f.lenRef) fld.steps.unshift(`长度由「${f.lenRef}」指定为 ${n} 字节`);
        fld.steps.push(...descStep);
        return [fld];
      }
    case 'bytes':{
        const n = resolveLen(f.len, f.lenRef, ctx, r.remaining);
        const extra = f.lenRef ? [`长度由「${f.lenRef}」指定为 ${n} 字节`, ...descStep] : descStep;
        return [r.bytes(f.name, n, undefined, extra)];
      }
    case 'list':{
        const start = r.pos;
        const items: Field[] = [];
        const count = f.countRef ? ctx.values[f.countRef] ?? 0 : Number.POSITIVE_INFINITY;
        const itemLabel = f.name.replace(/(列表|项)$/, '');
        for (let i = 0; i < count; i++) {
          if (!f.countRef && r.remaining <= 0) break;
          const s = r.pos;
          const children: Field[] = [];
          const itemCtx: RunCtx = { version: ctx.version, values: { ...ctx.values }, abort: ctx.abort };
          try {
            parseFields(r, f.item, itemCtx, children);
          } catch (e) {
            children.push(errorField(r.buf, e, r.end, r.section));
            r.pos = r.end;
            ctx.abort.v = true;
          }
          items.push(
            group(r.buf, `${itemLabel} ${i + 1}`, s, children, children.slice(0, 3).map((c) => c.value).join(' · '), r.section)
          );
          if (ctx.abort.v || r.pos === s) break;
        }
        const countText = f.countRef ? `重复 ${count} 次（由「${f.countRef}」指定）` : `重复至消息体结束，共 ${items.length} 项`;
        return [group(r.buf, f.name, start, items, `${items.length} 项`, r.section, [countText, ...descStep])];
      }
    case 'location':{
        const start = r.pos;
        const n = f.basic ? 28 : f.lenRef ? ctx.values[f.lenRef] ?? 0 : r.remaining;
        const sub = r.sub(f.name, n);
        const inner: Field[] = [];
        try {
          parseLocation(sub, ctx.version, inner);
        } catch (e) {
          inner.push(errorField(r.buf, e, sub.end, 'body'));
        }
        if (!f.basic && !f.lenRef) return inner;
        const summary = ['时间', '速度'].
        map((k) => inner.find((x) => x.name === k)?.value).
        filter(Boolean).
        join(' · ');
        return [group(r.buf, f.name, start, inner, summary, 'body', [`位置信息结构同 0x0200 消息体，共 ${n} 字节`, ...descStep])];
      }
    case 'alarmId':
      return [parseAlarmIdentifier(r, ctx.version, false, ctx.version === '2019' ? 30 : 7)];
    case 'params':{
        const start = r.pos;
        const items = parseParams(r, ctx.values[f.countRef] ?? 0);
        return [group(r.buf, f.name, start, items, `${items.length} 项`, r.section, [`重复次数由「${f.countRef}」指定`])];
      }
    default:
      return [];
  }
}