import type { Field, ProtocolVersion } from '../../types/jt808';
import {
  ADAS_TYPES, AGGRESSIVE_TYPES, ALARM_LEVEL, BSD_TYPES, DEVIATION, DSM_TYPES, FLAG_STATUS, ROAD_SIGN,
  TPMS_ALARM_DEFS, VEHICLE_STATUS_DEFS } from
'./dictionaries';
import { hexN } from './hex';
import { ParseError, Reader, bitsFrom, group } from './reader';

const ID_LEN_2019 = 30;
const ID_LEN_LEGACY = 7;
const BCD_TIME_LEN = 6;
/** 粤标 TGDRTA 002-2020 表 5-16：终端ID[30] + 时间BCD[6] + 序号[1] + 附件数量[1] + 预留[2] = 40 字节 */
const ID_BLOCK_YUE = 40;
/** 部标 JT/T 808：终端ID + 时间BCD[6] + 序号[1] + 附件数量[1] + 预留[1]（7字节ID时共16字节，30字节时共39字节） */
const ID_BLOCK_GUO_7 = ID_LEN_LEGACY + 9;
const ID_BLOCK_GUO_30 = ID_LEN_2019 + 9;

/** 校验某位置起 6 字节是否是合法 BCD 时间（YY MM DD hh mm ss） */
function isBcdTimeAt(buf: Uint8Array, at: number): boolean {
  if (at + BCD_TIME_LEN > buf.length) return false;
  const d: number[] = [];
  for (let i = 0; i < BCD_TIME_LEN; i++) {
    const b = buf[at + i];
    const hi = b >> 4;
    const lo = b & 0x0f;
    if (hi > 9 || lo > 9) return false;
    d.push(hi * 10 + lo);
  }
  const [, mm, dd, hh, mi, ss] = d;
  return mm >= 1 && mm <= 12 && dd >= 1 && dd <= 31 && hh <= 23 && mi <= 59 && ss <= 59;
}

export interface TermIdLen {
  len: number;
  /** 终端 ID + 时间 + 序号 + 附件数量 + 预留之后仍剩余的字节数 */
  leftover: number;
  /** 命中的标准：粤标（定长 40）/ 部标（自动判 ID 长度）/ 兜底推断 */
  standard: 'yue' | 'guobiao' | 'fallback';
  /** 是否通过了 BCD 时间合法性校验 */
  verified: boolean;
}

/**
 * 解析报警标识号中的终端 ID 长度。
 * 优先级：粤标定长 40（TGDRTA 002-2020 表 5-16）→ 部标候选（30 / 7）按 BCD 时间合法性判定
 * → 兜底用剩余长度推断。不能用「剩余字节 - 9」直接反推：附加信息长度若把尾部填充算进去，
 * 会把时间字段首字节吞进终端 ID，导致时间/序号/附件数量全部错位。
 */
export function resolveTermIdLen(
r: Reader,
version: ProtocolVersion,
terminates: boolean)
: TermIdLen {
  const room = r.remaining;

  // 1) 粤标定长 40，且其后 6 字节是合法 BCD 时间（双重确认，防止误吞）
  if (room === ID_BLOCK_YUE && isBcdTimeAt(r.buf, r.pos + ID_LEN_2019)) {
    return { len: ID_LEN_2019, leftover: 0, standard: 'yue', verified: true };
  }

  // 2) 部标：ID + 9 字节固定字段，候选按版本排序，用时间校验确认
  const candidates = version === '2019' ? [ID_LEN_2019, ID_LEN_LEGACY] : [ID_LEN_LEGACY, ID_LEN_2019];
  const fits = candidates.filter((c) => c + 9 <= room && isBcdTimeAt(r.buf, r.pos + c));
  if (fits.length) {
    const exact = fits.find((c) => room - (c + 9) === 0);
    const len = exact ?? fits[0];
    return { len, leftover: room - (len + 9), standard: 'guobiao', verified: true };
  }

  // 3) 兜底：时间校验不通过时仍尝试标准块长度（时间字节可能非法但结构可对齐）
  for (const block of [ID_BLOCK_YUE, ID_BLOCK_GUO_30, ID_BLOCK_GUO_7]) {
    if (room >= block && (room === block || terminates)) {
      const len = block === ID_BLOCK_YUE ? ID_LEN_2019 : block - 9;
      return { len, leftover: room - block, standard: 'fallback', verified: false };
    }
  }

  // 4) 最终兜底：报警标识号位于末尾时，用剩余长度推断
  if (terminates) {
    const len = room - 9;
    if (len > 0) return { len, leftover: 0, standard: 'fallback', verified: false };
    throw new ParseError(`报警标识号长度不足，剩余 ${room} 字节`, r.pos);
  }

  const len = candidates.find((c) => c + 9 <= room);
  if (len === undefined) throw new ParseError(`报警标识号需要至少 ${ID_LEN_LEGACY + 9} 字节，剩余 ${room} 字节`, r.pos);
  return { len, leftover: room - (len + 9), standard: 'fallback', verified: false };
}

/**
 * 解析报警标识号。
 * @param terminates 报警标识号是否为该附加信息的最后一段（决定能否用剩余长度兜底、以及是否吞掉尾部填充）
 * @param forcedLen 已知终端 ID 长度时直接指定（如 0x9208 / 0x1210 中标识号并非末段）
 */
export function parseAlarmIdentifier(
r: Reader,
version: ProtocolVersion,
terminates: boolean,
forcedLen?: number)
: Field {
  const start = r.pos;
  const resolved =
  forcedLen === undefined ?
  resolveTermIdLen(r, version, terminates) :
  { len: forcedLen, leftover: 0, standard: 'guobiao' as const, verified: true };
  const { len: termIdLen, leftover, standard, verified } = resolved;
  /** 预留字节数：粤标固定 2，部标 1 */
  const reservedLen = standard === 'yue' ? 2 : 1;
  const children: Field[] = [];
  children.push(r.str('终端 ID', termIdLen));
  children.push(r.time('时间'));
  children.push(r.uint('序号', 1, () => ({ steps: ['同一时间点报警的序号，从 0 循环累加'] })));
  children.push(r.uint('附件数量', 1, (v) => ({ value: `${v} 个` })));
  children.push(r.bytes('预留', reservedLen, `${reservedLen} 字节保留`));

  const consumed = termIdLen + BCD_TIME_LEN + 2 + reservedLen;
  if (terminates && leftover > 0) {
    children.push(
      r.bytes('尾部填充', leftover, `${leftover} 字节（协议未定义，已忽略）`, [
      `按${standard === 'yue' ? '粤标（预留 2 字节）' : '部标（预留 1 字节）'}拆分后共 ${consumed} 字节`,
      `附加信息长度还多出 ${leftover} 字节，按尾部填充处理，不计入终端 ID`]
      )
    );
  }

  const standardNote =
  standard === 'yue' ?
  '粤标 TGDRTA 002-2020 表 5-16：报警标识号固定 40 字节 = 终端 ID(30) + 时间(6) + 序号(1) + 附件数量(1) + 预留(2)' :
  standard === 'guobiao' ?
  `报警标识号 = 终端 ID(${termIdLen}) + 时间(6) + 序号(1) + 附件数量(1) + 预留(1)，共 ${consumed} 字节` :
  `未能匹配粤标（40 字节）或部标标准长度，按剩余长度推断终端 ID 为 ${termIdLen} 字节（可能非标准报文）`;
  const steps = [
  standardNote,
  verified && standard !== 'yue' ?
  `终端 ID 长度由后续 ${BCD_TIME_LEN} 字节的 BCD 时间合法性校验确定为 ${termIdLen} 字节` :
  '',
  termIdLen === ID_LEN_2019 ? '终端 ID 为 30 字节（右侧对齐、前补 0x00）' : `终端 ID 为 ${termIdLen} 字节`].
  filter(Boolean);

  if (terminates && leftover > 0) steps.push(`尾部另有 ${leftover} 字节填充，已忽略`);

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

function tail(r: Reader, out: Field[], version: ProtocolVersion, terminates = true): void {
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
  out.push(parseAlarmIdentifier(r, version, terminates));
}

function attachments(out: Field[]): string {
  const id = out.find((f) => f.name === '报警标识号');
  const n = id?.children?.[3]?.num;
  return n === undefined ? '' : ` · 附件 ${n} 个`;
}

export function parseAdas(r: Reader, out: Field[], version: ProtocolVersion): string {
  head(r, out);
  const type = r.uint('报警/事件类型', 1, typeName(ADAS_TYPES));
  out.push(type);
  const level = r.uint('报警级别', 1, (v) => ({ value: ALARM_LEVEL[v] ?? `未知 (${v})` }));
  out.push(level);
  out.push(r.uint('前车车速', 1, (v) => ({ value: `${v} km/h`, steps: ['范围 0–250，仅报警类型为 0x01、0x02 时有效'] })));
  out.push(r.uint('前车/行人距离', 1, (v) => ({ value: `${(v / 10).toFixed(1)} s`, steps: [`单位 100 ms → ${v} × 0.1 = ${(v / 10).toFixed(1)} s`, '仅报警类型为 0x01、0x02、0x04 时有效'] })));
  out.push(r.uint('偏离类型', 1, (v) => ({ value: DEVIATION[v] ?? '无效' })));
  out.push(r.uint('道路标志识别类型', 1, (v) => ({ value: ROAD_SIGN[v] ?? '无效' })));
  out.push(r.uint('道路标志识别数据', 1));
  tail(r, out, version);
  return `${type.value} · ${level.value}${attachments(out)}`;
}

export function parseDsm(r: Reader, out: Field[], version: ProtocolVersion): string {
  head(r, out);
  const type = r.uint('报警/事件类型', 1, typeName(DSM_TYPES));
  out.push(type);
  const level = r.uint('报警级别', 1, (v) => ({ value: ALARM_LEVEL[v] ?? `未知 (${v})` }));
  out.push(level);
  out.push(r.uint('疲劳程度', 1, (v) => ({ value: `${v} / 10`, steps: ['范围 1–10，数值越大疲劳程度越严重，仅疲劳驾驶报警时有效'] })));
  out.push(r.bytes('预留', 4, '4 字节保留'));
  tail(r, out, version);
  return `${type.value} · ${level.value}${attachments(out)}`;
}

export function parseAggressive(r: Reader, out: Field[], version: ProtocolVersion): string {
  head(r, out);
  const type = r.uint('报警/事件类型', 2, typeName(AGGRESSIVE_TYPES));
  out.push(type);
  out.push(r.uint('报警时间阈值', 2, () => ({ steps: ['触发报警的持续时间阈值，含义随报警类型而定'] })));
  out.push(r.uint('报警阈值 1', 2, () => ({ steps: ['含义随报警类型而定（如急加速/急减速的加速度阈值）'] })));
  out.push(r.uint('报警阈值 2', 2, () => ({ steps: ['含义随报警类型而定（如急转弯的角速度阈值）'] })));
  tail(r, out, version);
  return `${type.value}${attachments(out)}`;
}

export function parseBsd(r: Reader, out: Field[], version: ProtocolVersion): string {
  head(r, out);
  const type = r.uint('报警/事件类型', 1, typeName(BSD_TYPES));
  out.push(type);
  tail(r, out, version);
  return `${type.value}${attachments(out)}`;
}

export function parseTpms(r: Reader, out: Field[], version: ProtocolVersion): string {
  head(r, out);
  tail(r, out, version, false);
  const count = r.uint('报警/事件列表总数', 1, (v) => ({ value: `${v} 项` }));
  out.push(count);
  const n = count.num ?? 0;
  for (let i = 0; i < n; i++) {
    const s = r.pos;
    const c: Field[] = [];
    c.push(r.uint('胎压报警位置', 1, (v) => ({ value: `${v} 号轮胎`, steps: ['从左前轮开始以 Z 字形从 00 依次编号'] })));
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
  return `胎压事件 ${n} 项${attachments(out)}`;
}