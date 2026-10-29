import type { Field, ProtocolVersion, Section } from '../../types/jt808';
import {
  AREA_TYPES, EXTRA_NAMES, EXT_SIGNAL_DEFS, IO_DEFS, SAFETY_EXTRA_IDS, STATUS_DEFS, alarmDefs, heading } from
'./dictionaries';
import { hexN } from './hex';
import { Reader, bitsFrom, errorField, group, type Interpretation } from './reader';
import { parseAdas, parseAggressive, parseBsd, parseDsm, parseTpms } from './safety';

function coord(v: number, flag: number, bit: number, pos: string, neg: string): Interpretation {
  const deg = (v / 1e6).toFixed(6);
  return {
    value: `${deg}° ${flag ? neg : pos}`,
    steps: [`单位 10⁻⁶ 度 → ${v} ÷ 10⁶ = ${deg}°`, `状态位 bit${bit} = ${flag} → ${flag ? neg : pos}`]
  };
}

const scaled = (unit: string, div: number, label: string) => (v: number): Interpretation => ({
  value: `${(v / div).toFixed(1)} ${unit}`,
  steps: [`${label}单位 1/${div} ${unit} → ${v} ÷ ${div} = ${(v / div).toFixed(1)} ${unit}`]
});

export function parseLocation(r: Reader, version: ProtocolVersion, out: Field[]): void {
  out.push(
    r.uint('报警标志', 4, (v) => {
      const bits = bitsFrom(v, alarmDefs(version));
      const on = bits.filter((b) => b.active);
      return {
        value: on.length ? on.map((b) => b.name).join('、') : '无报警',
        bits,
        steps: [on.length ? `置位的报警位：${on.map((b) => `bit${b.bits} ${b.name}`).join('，')}` : '所有报警位均为 0，无报警']
      };
    })
  );
  const status = r.uint('状态', 4, (v) => {
    const bits = bitsFrom(v, STATUS_DEFS);
    const sys = bits.filter((b) => ['GPS', '北斗', 'GLONASS', 'Galileo'].includes(b.name) && b.active).map((b) => b.name);
    const acc = bits[0].value;
    const fix = bits[1].value;
    return {
      value: `ACC ${acc} · ${fix} · ${sys.length ? sys.join('+') : '无卫星系统'}`,
      bits,
      steps: [`二进制 → ${v.toString(2).padStart(32, '0').replace(/(.{8})(?=.)/g, '$1 ')}`]
    };
  });
  out.push(status);
  const st = status.num ?? 0;
  out.push(r.uint('纬度', 4, (v) => coord(v, st >> 2 & 1, 2, '北纬 N', '南纬 S')));
  out.push(r.uint('经度', 4, (v) => coord(v, st >> 3 & 1, 3, '东经 E', '西经 W')));
  out.push(r.uint('高程', 2, (v) => ({ value: `${v} m`, steps: ['海拔高度，单位为米'] })));
  out.push(r.uint('速度', 2, scaled('km/h', 10, '')));
  out.push(r.uint('方向', 2, (v) => ({ value: `${v}° ${heading(v)}`, steps: [`取值 0–359，正北为 0，顺时针 → ${v}°（${heading(v)}）`] })));
  out.push(r.time('时间'));
  while (r.remaining > 0) out.push(parseExtra(r, version));
}

function parseExtra(r: Reader, version: ProtocolVersion): Field {
  const start = r.pos;
  const idv = r.buf[r.pos];
  const section: Section = SAFETY_EXTRA_IDS.includes(idv) ? 'safety' : 'extra';
  r.section = section;
  if (r.remaining < 2) {
    return r.bytes('附加信息（残缺）', r.remaining, '不足 2 字节，无法构成 ID + 长度');
  }
  const name = EXTRA_NAMES[idv] ?? '未定义附加信息';
  const children: Field[] = [];
  children.push(r.uint('附加信息 ID', 1, (v) => ({ value: `${hexN(v, 1)} ${name}` })));
  const lenF = r.uint('附加信息长度', 1, (v) => ({ value: `${v} 字节` }));
  children.push(lenF);
  const len = lenF.num ?? 0;
  let summary = '';
  let sub: Reader | null = null;
  try {
    sub = r.sub(name, len, section);
  } catch (e) {
    children.push(errorField(r.buf, e, r.end, section));
    r.pos = r.end;
    summary = '长度越界';
  }
  if (sub) {
    const content: Field[] = [];
    try {
      summary = parseExtraContent(sub, idv, len, version, content);
      if (sub.remaining > 0) content.push(sub.bytes('未解析字节', sub.remaining));
    } catch (e) {
      content.push(errorField(r.buf, e, sub.end, section));
      summary = '解析失败';
    }
    children.push(...content);
  }
  return group(r.buf, `${hexN(idv, 1)} ${name}`, start, children, summary, section, [
  '附加信息采用 ID(1 字节) + 长度(1 字节) + 内容 的 TLV 结构',
  `ID = ${hexN(idv, 1)}（${name}），内容长度 = ${len} 字节`,
  `内容解析结果：${summary}`]
  );
}

function parseExtraContent(r: Reader, id: number, len: number, version: ProtocolVersion, out: Field[]): string {
  const push = (f: Field): string => {
    out.push(f);
    return f.value;
  };
  switch (id) {
    case 0x01:
      return push(r.uint('里程', 4, scaled('km', 10, '里程')));
    case 0x02:
      return push(r.uint('油量', 2, scaled('L', 10, '油量')));
    case 0x03:
      return push(r.uint('行驶记录速度', 2, scaled('km/h', 10, '速度')));
    case 0x04:
      return push(r.uint('报警事件 ID', 2));
    case 0x05:{
        const f = r.bytes('胎压', len);
        const vals = Array.from(r.buf.subarray(f.offset, f.offset + len)).
        map((b, i) => b === 0xff ? null : `${i + 1}# ${b} Pa`).
        filter((x): x is string => x !== null);
        f.value = vals.length ? vals.join('，') : '无有效数据';
        f.steps.push('每字节对应一个轮胎，单位 Pa，0xFF 表示无效');
        return push(f);
      }
    case 0xe0:
      return push(r.uint('后续自定义信息长度', 1, (v) => ({ value: `${v} 字节` })));
    case 0x06:
      return push(r.uint('车厢温度', 2, (v) => {
        const t = v > 0x7fff ? v - 0x10000 : v;
        return { value: `${t} ℃`, steps: [`按有符号 16 位整数解释 → ${t} ℃`] };
      }));
    case 0x11:{
        const t = r.uint('位置类型', 1, (v) => ({ value: AREA_TYPES[v] ?? `未知 (${v})` }));
        out.push(t);
        if (r.remaining >= 4) out.push(r.uint('区域或路段 ID', 4));
        return t.value;
      }
    case 0x12:{
        const t = r.uint('位置类型', 1, (v) => ({ value: AREA_TYPES[v] ?? `未知 (${v})` }));
        out.push(t);
        out.push(r.uint('区域或路线 ID', 4));
        const d = r.uint('方向', 1, (v) => ({ value: v === 0 ? '进' : '出' }));
        out.push(d);
        return `${t.value} · ${d.value}`;
      }
    case 0x13:{
        out.push(r.uint('路段 ID', 4));
        const t = r.uint('路段行驶时间', 2, (v) => ({ value: `${v} s` }));
        out.push(t);
        const res = r.uint('结果', 1, (v) => ({ value: v === 0 ? '不足' : '过长' }));
        out.push(res);
        return `${t.value} · ${res.value}`;
      }
    case 0x25:
      return push(r.uint('扩展车辆信号', 4, (v) => {
        const bits = bitsFrom(v, EXT_SIGNAL_DEFS);
        const on = bits.filter((b) => b.active).map((b) => b.name);
        return { value: on.length ? on.join('、') : '无信号', bits };
      }));
    case 0x2a:
      return push(r.uint('IO 状态', 2, (v) => {
        const bits = bitsFrom(v, IO_DEFS);
        const on = bits.filter((b) => b.active).map((b) => b.name);
        return { value: on.length ? on.join('、') : '正常', bits };
      }));
    case 0x2b:
      return push(r.uint('模拟量', 4, (v) => {
        const ad0 = v & 0xffff;
        const ad1 = Math.floor(v / 65536);
        return { value: `AD0 ${ad0} · AD1 ${ad1}`, steps: [`bit0–15 → AD0 = ${ad0}`, `bit16–31 → AD1 = ${ad1}`] };
      }));
    case 0x30:
      return push(r.uint('信号强度', 1));
    case 0x31:
      return push(r.uint('卫星数', 1, (v) => ({ value: `${v} 颗` })));
    case 0x64:
      return parseAdas(r, out, version);
    case 0x65:
      return parseDsm(r, out, version);
    case 0x66:
      return parseTpms(r, out, version);
    case 0x67:
      return parseBsd(r, out, version);
    case 0x70:
      return parseAggressive(r, out, version);
    default:
      return push(r.bytes('附加信息内容', len, `${len} 字节自定义数据`));
  }
}