import type { Field, ProtocolVersion } from '../../types/jt808';
import {
  ADAS_TYPES, ALARM_LEVEL, BSD_TYPES, DEVIATION, DSM_TYPES, FATIGUE_MAX, FLAG_STATUS, ROAD_SIGN,
  SAFETY_STANDARD_NAME, TPMS_ALARM_DEFS, TPMS_POS_LEN, VEHICLE_STATUS_DEFS, defaultStandard,
  type SafetyStandard } from
'./dictionaries';
import { hexN } from './hex';
import { Reader, bitsFrom, group } from './reader';

const BCD_TIME_LEN = 6;

/**
 * 报警标识号格式：
 * - 苏标表 4-16：终端 ID[7] + 时间 BCD[6] + 序号 + 附件数量 + 预留[1] = 16 字节
 * - 粤标表 5-16：终端 ID[30] + 时间 BCD[6] + 序号 + 附件数量 + 预留[2] = 40 字节
 */
export const ALARM_ID_LAYOUT: Record<SafetyStandard, {termId: number;reserved: number;total: number;}> = {
  su: { termId: 7, reserved: 1, total: 16 },
  yue: { termId: 30, reserved: 2, total: 40 }
};

/** 校验某位置起 6 字节是否是合法 BCD 时间（YY MM DD hh mm ss） */
function isBcdTimeAt(buf: Uint8Array, at: number, end: number): boolean {
  if (at < 0 || at + BCD_TIME_LEN > end) return false;
  const d: number[] = [];
  for (let i = 0; i < BCD_TIME_LEN; i++) {
    const b = buf[at + i];
    if (b >> 4 > 9 || (b & 0x0f) > 9) return false;
    d.push((b >> 4) * 10 + (b & 0x0f));
  }
  const [, mm, dd, hh, mi, ss] = d;
  return mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31 && hh <= 23 && mi <= 59 && ss <= 59;
}

export interface StandardMatch {
  standard: SafetyStandard;
  /** 是否由报文结构（BCD 时间 + 长度）确认，false 表示按协议版本取默认 */
  verified: boolean;
}

/**
 * 判断报文使用苏标还是粤标。
 * @param idAt 报警标识号相对 r.pos 的偏移，可随标准不同（如 0x1210 前面还有终端 ID）
 * @param fits 标识号之后剩余字节是否与该标准吻合（如 0x9208 应正好剩 48 字节）
 */
export function detectStandard(
r: Reader,
version: ProtocolVersion,
idAt: (s: SafetyStandard) => number,
fits: (s: SafetyStandard, after: number) => boolean)
: StandardMatch {
  const order: SafetyStandard[] = version === '2019' ? ['yue', 'su'] : ['su', 'yue'];
  const timeOk = (s: SafetyStandard) => isBcdTimeAt(r.buf, r.pos + idAt(s) + ALARM_ID_LAYOUT[s].termId, r.end);
  const after = (s: SafetyStandard) => r.end - (r.pos + idAt(s) + ALARM_ID_LAYOUT[s].total);
  const strict = order.find((s) => timeOk(s) && after(s) >= 0 && fits(s, after(s)));
  if (strict) return { standard: strict, verified: true };
  const loose = order.find((s) => timeOk(s) && after(s) >= 0);
  if (loose) return { standard: loose, verified: true };
  return { standard: defaultStandard(version), verified: false };
}

/** 报警标识号位于附加信息末尾时：剩余正好为 0，或带尾部填充 */
const atEnd = (_s: SafetyStandard, after: number) => after === 0;

/** 解析报警标识号（标准需先由 detectStandard 确定） */
export function parseAlarmIdentifier(r: Reader, match: StandardMatch, padding = 0): Field {
  const start = r.pos;
  const { standard, verified } = match;
  const layout = ALARM_ID_LAYOUT[standard];
  const children: Field[] = [];
  children.push(r.str('终端 ID', layout.termId));
  children.push(r.time('时间'));
  children.push(r.uint('序号', 1, () => ({ steps: ['同一时间点报警的序号，从 0 循环累加'] })));
  children.push(r.uint('附件数量', 1, (v) => ({ value: `${v} 个` })));
  children.push(r.bytes('预留', layout.reserved, `${layout.reserved} 字节保留`));
  const steps = [
  `${SAFETY_STANDARD_NAME[standard]}：报警标识号 ${layout.total} 字节 = 终端 ID(${layout.termId}) + 时间(6) + 序号(1) + 附件数量(1) + 预留(${layout.reserved})`,
  verified ?
  `终端 ID 之后 6 字节为合法 BCD 时间，按${standard === 'yue' ? '粤标' : '苏标'}拆分` :
  `未能通过 BCD 时间确认标准，按 JT/T 808-${standard === 'yue' ? '2019 → 粤标' : '2011/2013 → 苏标'}默认拆分`];

  if (padding > 0) {
    children.push(r.bytes('尾部填充', padding, `${padding} 字节（协议未定义，已忽略）`, [
    `附加信息长度比标准结构多出 ${padding} 字节，按尾部填充处理`]
    ));
    steps.push(`尾部另有 ${padding} 字节填充，已忽略`);
  }
  return group(
    r.buf,
    '报警标识号',
    start,
    children,
    `${children[0].value} · ${children[1].value} · 附件 ${children[3].num ?? 0} 个`,
    r.section,
    steps
  );
}

const typeName = (dict: Record<number, string>) => (v: number) => ({
  value: dict[v] ?? `用户自定义 (${hexN(v, 1)})`
});

function head(r: Reader, out: Field[]): void {
  out.push(r.uint('报警 ID', 4, () => ({ steps: ['按报警发生顺序从 0 循环累加，不区分报警类型'] })));
  out.push(r.uint('标志状态', 1, (v) => ({ value: FLAG_STATUS[v] ?? `未知 (${v})`, steps: ['仅适用于有开始和结束标志类型的报警或事件'] })));
}

/** 车速 … 车辆状态，共 19 字节 */
const TAIL_LEN = 19;

function tail(r: Reader, out: Field[], match: StandardMatch, padding = 0): void {
  out.push(r.uint('车速', 1, (v) => ({ value: `${v} km/h` })));
  out.push(r.uint('高程', 2, (v) => ({ value: `${v} m` })));
  out.push(r.uint('纬度', 4, (v) => ({ value: `${(v / 1e6).toFixed(6)}°`, steps: [`单位 10⁻⁶ 度 → ${v} ÷ 10⁶ = ${(v / 1e6).toFixed(6)}°`] })));
  out.push(r.uint('经度', 4, (v) => ({ value: `${(v / 1e6).toFixed(6)}°`, steps: [`单位 10⁻⁶ 度 → ${v} ÷ 10⁶ = ${(v / 1e6).toFixed(6)}°`] })));
  out.push(r.time('日期时间'));
  out.push(
    r.uint('车辆状态', 2, (v) => {
      const bits = bitsFrom(v, VEHICLE_STATUS_DEFS);
      const on = bits.filter((b) => b.active).map((b) => b.name);
      return { value: on.length ? on.join('、') : '无', bits };
    })
  );
  out.push(parseAlarmIdentifier(r, match, padding));
}

/** 报警标识号位于末尾（ADAS / DSM / BSD）：识别标准并计算尾部填充 */
function detectTerminal(r: Reader, version: ProtocolVersion, idAt: number): {match: StandardMatch;padding: number;} {
  const match = detectStandard(r, version, () => idAt, atEnd);
  const padding = Math.max(0, r.remaining - idAt - ALARM_ID_LAYOUT[match.standard].total);
  return { match, padding };
}

function attachments(out: Field[]): string {
  const id = out.find((f) => f.name === '报警标识号');
  const n = id?.children?.[3]?.num;
  return n === undefined ? '' : ` · 附件 ${n} 个`;
}

const stdTag = (m: StandardMatch) => m.standard === 'yue' ? '粤标' : '苏标';

export function parseAdas(r: Reader, out: Field[], version: ProtocolVersion): string {
  const { match, padding } = detectTerminal(r, version, 12 + TAIL_LEN);
  head(r, out);
  const type = r.uint('报警/事件类型', 1, typeName(ADAS_TYPES[match.standard]));
  out.push(type);
  const level = r.uint('报警级别', 1, (v) => ({ value: ALARM_LEVEL[v] ?? `未知 (${v})` }));
  out.push(level);
  out.push(r.uint('前车车速', 1, (v) => ({ value: `${v} km/h`, steps: ['范围 0–250，仅报警类型为 0x01、0x02 时有效'] })));
  out.push(r.uint('前车/行人距离', 1, (v) => ({ value: `${(v / 10).toFixed(1)} s`, steps: [`单位 100 ms → ${v} × 0.1 = ${(v / 10).toFixed(1)} s`, '范围 0–100，仅报警类型为 0x01、0x02、0x04 时有效'] })));
  out.push(r.uint('偏离类型', 1, (v) => ({ value: DEVIATION[v] ?? '无效', steps: ['仅报警类型为 0x02 时有效'] })));
  out.push(r.uint('道路标志识别类型', 1, (v) => ({ value: ROAD_SIGN[match.standard][v] ?? '无效', steps: ['仅报警类型为 0x06、0x10 时有效'] })));
  out.push(r.uint('道路标志识别数据', 1));
  tail(r, out, match, padding);
  return `${type.value} · ${level.value} · ${stdTag(match)}${attachments(out)}`;
}

export function parseDsm(r: Reader, out: Field[], version: ProtocolVersion): string {
  const { match, padding } = detectTerminal(r, version, 12 + TAIL_LEN);
  const max = FATIGUE_MAX[match.standard];
  head(r, out);
  const type = r.uint('报警/事件类型', 1, typeName(DSM_TYPES[match.standard]));
  out.push(type);
  const level = r.uint('报警级别', 1, (v) => ({ value: ALARM_LEVEL[v] ?? `未知 (${v})` }));
  out.push(level);
  out.push(r.uint('疲劳程度', 1, (v) => ({ value: `${v} / ${max}`, steps: [`${stdTag(match)}：范围 1–${max}，数值越大疲劳程度越严重，仅报警类型为 0x01 时有效`] })));
  out.push(r.bytes('预留', 4, '4 字节保留'));
  tail(r, out, match, padding);
  return `${type.value} · ${level.value} · ${stdTag(match)}${attachments(out)}`;
}

export function parseBsd(r: Reader, out: Field[], version: ProtocolVersion): string {
  const { match, padding } = detectTerminal(r, version, 6 + TAIL_LEN);
  head(r, out);
  const type = r.uint('报警/事件类型', 1, typeName(BSD_TYPES));
  out.push(type);
  tail(r, out, match, padding);
  return `${type.value} · ${stdTag(match)}${attachments(out)}`;
}

/** TPMS 标识号之后为 列表总数(1) + n × 事件项；事件项长度随标准不同 */
function tpmsFits(r: Reader, idAt: number) {
  return (s: SafetyStandard, after: number): boolean => {
    if (after < 1) return false;
    const n = r.buf[r.pos + idAt + ALARM_ID_LAYOUT[s].total];
    return after === 1 + n * (TPMS_POS_LEN[s] + 8);
  };
}

export function parseTpms(r: Reader, out: Field[], version: ProtocolVersion): string {
  const idAt = 5 + TAIL_LEN;
  const match = detectStandard(r, version, () => idAt, tpmsFits(r, idAt));
  const posLen = TPMS_POS_LEN[match.standard];
  head(r, out);
  tail(r, out, match);
  const count = r.uint('报警/事件列表总数', 1, (v) => ({ value: `${v} 项` }));
  out.push(count);
  const n = count.num ?? 0;
  for (let i = 0; i < n; i++) {
    const s = r.pos;
    const c: Field[] = [];
    c.push(r.uint('胎压报警位置', posLen, (v) => ({
      value: `${v} 号轮胎`,
      steps: [`${stdTag(match)}：${posLen === 2 ? 'BYTE[2]' : 'BYTE'}`, '从左前轮开始以 Z 字形从 00 依次编号']
    })));
    const type = r.uint('报警/事件类型', 2, (v) => {
      const bits = bitsFrom(v, TPMS_ALARM_DEFS);
      const on = bits.filter((b) => b.active).map((b) => b.name);
      return { value: on.length ? on.join('、') : '无', bits };
    });
    c.push(type);
    c.push(r.uint('胎压', 2, (v) => ({ value: `${v} kPa` })));
    c.push(r.uint('胎温', 2, (v) => ({ value: `${v} ℃` })));
    c.push(r.uint('电池电量', 2, (v) => ({ value: `${v} %` })));
    out.push(group(r.buf, `轮胎事件 ${i + 1}`, s, c, `${c[0].value} · ${type.value}`, r.section));
  }
  return `胎压事件 ${n} 项 · ${stdTag(match)}${attachments(out)}`;
}
