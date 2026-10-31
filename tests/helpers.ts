import { escapeContent } from '../src/utils/jt808/hex';
import type { Field } from '../src/types/jt808';

const hex = (a: number[]) => a.map((x) => x.toString(16).padStart(2, '0')).join('');

/** 组一条 2011/2013 版报文（可选分包），自动计算校验码并转义 */
export function frame(id: number, body: number[], opt: {phone?: number[];serial?: number;pkg?: [number, number];} = {}): string {
  const phone = opt.phone ?? [0x01, 0x38, 0x00, 0x13, 0x80, 0x00];
  const serial = opt.serial ?? 1;
  const props = body.length & 0x3ff | (opt.pkg ? 1 << 13 : 0);
  const head = [id >> 8, id & 255, props >> 8, props & 255, ...phone, serial >> 8, serial & 255];
  if (opt.pkg) head.push(opt.pkg[0] >> 8, opt.pkg[0] & 255, opt.pkg[1] >> 8, opt.pkg[1] & 255);
  const all = [...head, ...body];
  const cs = all.reduce((x, b) => x ^ b, 0);
  return `7e${hex(escapeContent([...all, cs]))}7e`;
}

/** 深度优先查找第一个同名字段 */
export function find(fields: Field[], name: string): Field | undefined {
  for (const f of fields) {
    if (f.name === name) return f;
    const c = f.children && find(f.children, name);
    if (c) return c;
  }
  return undefined;
}

export function hasError(fields: Field[]): boolean {
  return fields.some((f) => f.error || (f.children ? hasError(f.children) : false));
}

export const bcdTime = [0x26, 0x10, 0x31, 0x17, 0x47, 0x00];
/** 0x0200 位置基本信息 28 字节 */
export const LOC = [0, 0, 0, 0, 0, 0, 0, 2, 0x01, 0x5f, 0x5e, 0x10, 0x06, 0xca, 0x2f, 0x20, 0, 10, 0, 100, 0, 90, ...bcdTime];
