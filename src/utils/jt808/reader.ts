import type { BitRow, Field, Section } from '../../types/jt808';
import { bytesToHex, decodeText, hex2, hexN } from './hex';

export class ParseError extends Error {
  offset: number;
  constructor(message: string, offset: number) {
    super(message);
    this.name = 'ParseError';
    this.offset = offset;
  }
}

export interface Interpretation {
  value?: string;
  steps?: string[];
  bits?: BitRow[];
}

export interface BitDef {
  bit: number;
  width?: number;
  name: string;
  render?: (value: number) => string;
}

let fieldSeq = 0;
export function resetFieldIds(): void {
  fieldSeq = 0;
}

export function makeField(buf: Uint8Array, init: Omit<Field, 'id' | 'raw'>): Field {
  fieldSeq += 1;
  return { ...init, id: `f${fieldSeq}`, raw: bytesToHex(buf, init.offset, init.offset + init.length) };
}

export function bitsFrom(value: number, defs: BitDef[]): BitRow[] {
  return defs.map((d) => {
    const width = d.width ?? 1;
    const v = Math.floor(value / 2 ** d.bit) % 2 ** width;
    return {
      bits: width > 1 ? `${d.bit}–${d.bit + width - 1}` : `${d.bit}`,
      name: d.name,
      value: d.render ? d.render(v) : String(v),
      active: v !== 0
    };
  });
}

/** 校验 6 字节 BCD 时间（YYMMDDhhmmss），返回问题描述；全 0 视为未设置 */
export function timeProblem(d: string): string | null {
  if (!/^\d{12}$/.test(d)) return '包含非十进制 BCD 数字';
  if (d === '000000000000') return null;
  const [y, mo, da, h, mi, s] = (d.match(/.{2}/g) ?? []).map(Number);
  if (mo < 1 || mo > 12) return `月份 ${mo} 超出 1–12`;
  const dim = new Date(2000 + y, mo, 0).getDate();
  if (da < 1 || da > dim) return `日期 ${da} 超出该月 1–${dim}`;
  if (h > 23) return `小时 ${h} 超出 0–23`;
  if (mi > 59) return `分钟 ${mi} 超出 0–59`;
  if (s > 59) return `秒 ${s} 超出 0–59`;
  return null;
}

export class Reader {
  buf: Uint8Array;
  pos: number;
  end: number;
  section: Section;

  constructor(buf: Uint8Array, pos: number, end: number, section: Section) {
    this.buf = buf;
    this.pos = pos;
    this.end = end;
    this.section = section;
  }

  get remaining(): number {
    return this.end - this.pos;
  }

  claim(name: string, n: number): number {
    if (n < 0 || this.pos + n > this.end) {
      throw new ParseError(`「${name}」需要 ${n} 字节，但仅剩 ${Math.max(0, this.remaining)} 字节`, this.pos);
    }
    const start = this.pos;
    this.pos += n;
    return start;
  }

  sub(name: string, length: number, section: Section = this.section): Reader {
    const start = this.claim(name, length);
    return new Reader(this.buf, start, start + length, section);
  }

  uint(name: string, size: 1 | 2 | 4, interpret?: (v: number) => Interpretation): Field {
    const start = this.claim(name, size);
    let v = 0;
    for (let i = 0; i < size; i++) v = v * 256 + this.buf[start + i];
    const raw = bytesToHex(this.buf, start, start + size);
    const type = size === 1 ? 'BYTE' : size === 2 ? 'WORD' : 'DWORD';
    const base =
    size === 1 ?
    [`读取 1 字节：${raw}`, `按无符号 BYTE 解释 → ${hexN(v, 1)} = ${v}`] :
    [`读取 ${size} 字节：${raw}`, `按大端序（高字节在前）拼接 → ${hexN(v, size)}`, `转换为十进制 → ${v}`];
    const it = interpret?.(v) ?? {};
    return makeField(this.buf, {
      name,
      type,
      offset: start,
      length: size,
      value: it.value ?? String(v),
      steps: [...base, ...(it.steps ?? [])],
      bits: it.bits,
      section: this.section,
      num: v
    });
  }

  bcd(name: string, n: number, interpret?: (digits: string) => Interpretation): Field {
    const start = this.claim(name, n);
    const pairs: string[] = [];
    let digits = '';
    let invalid = false;
    for (let i = 0; i < n; i++) {
      const b = this.buf[start + i];
      const hi = b >> 4;
      const lo = b & 0x0f;
      if (hi > 9 || lo > 9) invalid = true;
      const s = hi.toString(16).toUpperCase() + lo.toString(16).toUpperCase();
      pairs.push(`${hex2(b)}→${s}`);
      digits += s;
    }
    const steps = [
    `读取 ${n} 字节 BCD 码：${bytesToHex(this.buf, start, start + n)}`,
    `每字节高 4 位、低 4 位各表示一位十进制数：${pairs.join('  ')}`,
    `依次拼接 → "${digits}"`];

    if (invalid) steps.push('警告：存在大于 9 的半字节，不是合法的 BCD 编码');
    const it = interpret?.(digits) ?? {};
    return makeField(this.buf, {
      name,
      type: `BCD[${n}]`,
      offset: start,
      length: n,
      value: it.value ?? digits,
      steps: [...steps, ...(it.steps ?? [])],
      section: this.section,
      text: digits
    });
  }

  time(name = '时间'): Field {
    return this.bcd(name, 6, (d) => {
      const [yy, mm, dd, hh, mi, ss] = d.match(/.{2}/g) ?? [];
      const s = `20${yy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
      const steps = [
      `按 YY MM DD hh mm ss 切分 → ${yy} | ${mm} | ${dd} | ${hh} | ${mi} | ${ss}`,
      `年份补全为 20${yy}，时区 GMT+8 → ${s}`];
      const problem = timeProblem(d);
      if (problem) steps.push(`注意：${problem}`);
      return { value: problem ? `${s}（非法时间）` : s, steps };
    });
  }

  str(name: string, n: number, enc: 'ascii' | 'gbk' = 'ascii'): Field {
    const start = this.claim(name, n);
    // 终端 ID 等字段常右对齐（前补 0x00）或左对齐（后补 0x00），两侧填充都去掉再解码
    let s = start;
    let e = start + n;
    while (e > s && this.buf[e - 1] === 0x00) e--;
    while (s < e && this.buf[s] === 0x00) s++;
    const lead = s - start;
    const trail = start + n - e;
    const text = decodeText(this.buf.subarray(s, e), enc);
    const steps = [`读取 ${n} 字节（偏移 ${hexN(start)} 起）`];
    if (lead || trail) {
      steps.push(`去除填充：前 ${lead} 字节、后 ${trail} 字节 0x00，有效内容 ${n - lead - trail} 字节`);
    }
    steps.push(`按 ${enc === 'gbk' ? 'GBK' : 'ASCII'} 解码 → "${text}"`);
    return makeField(this.buf, {
      name,
      type: enc === 'gbk' ? `STRING[${n}] · GBK` : `STRING[${n}]`,
      offset: start,
      length: n,
      value: text || '（空）',
      steps,
      section: this.section,
      text
    });
  }

  bytes(name: string, n: number, value?: string, steps: string[] = []): Field {
    const start = this.claim(name, n);
    return makeField(this.buf, {
      name,
      type: `BYTE[${n}]`,
      offset: start,
      length: n,
      value: value ?? `${n} 字节`,
      steps: [`读取 ${n} 字节原始数据`, ...steps],
      section: this.section
    });
  }
}

export function group(
buf: Uint8Array,
name: string,
offset: number,
children: Field[],
value: string,
section: Section,
steps?: string[])
: Field {
  const end = children.length ? Math.max(...children.map((c) => c.offset + c.length)) : offset;
  return makeField(buf, {
    name,
    type: '结构',
    offset,
    length: end - offset,
    value,
    steps: steps ?? [`由 ${children.length} 个子字段组成，共 ${end - offset} 字节`],
    section,
    children
  });
}

export function errorField(buf: Uint8Array, e: unknown, end: number, section: Section): Field {
  const offset = e instanceof ParseError ? e.offset : end;
  const msg = e instanceof Error ? e.message : String(e);
  const length = Math.max(0, end - offset);
  return makeField(buf, {
    name: '解析错误',
    type: '错误',
    offset,
    length,
    value: msg,
    steps: [msg, length > 0 ? `剩余 ${length} 字节未能解析` : '已到达数据末尾'],
    section,
    error: true
  });
}