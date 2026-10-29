import type { Field, ProtocolVersion } from '../../types/jt808';
import {
  ADAS_TYPES, AGGRESSIVE_TYPES, ALARM_LEVEL, BSD_TYPES, DEVIATION, DSM_TYPES, FLAG_STATUS, ROAD_SIGN,
  TPMS_ALARM_DEFS, VEHICLE_STATUS_DEFS } from
'./dictionaries';
import { hexN } from './hex';
import { ParseError, Reader, bitsFrom, group } from './reader';

export function parseAlarmIdentifier(r: Reader, termIdLen: number): Field {
  const start = r.pos;
  const children: Field[] = [];
  children.push(r.str('终端 ID', termIdLen));
  children.push(r.time('时间'));
  children.push(r.uint('序号', 1, () => ({ steps: ['同一时间点报警的序号，从 0 循环累加'] })));
  children.push(r.uint('附件数量', 1, (v) => ({ value: `${v} 个` })));
  children.push(r.uint('预留', 1));
  return group(
    r.buf,
    '报警标识号',
    start,
    children,
    `${children[0].value} · ${children[1].value} · 附件 ${children[3].num ?? 0} 个`,
    r.section,
    [
    `报警标识号 = 终端 ID(${termIdLen}) + 时间(6) + 序号(1) + 附件数量(1) + 预留(1)，共 ${termIdLen + 9} 字节`,
    termIdLen === 30 ? '终端 ID 为 30 字节（2019 版扩展）' : `终端 ID 为 ${termIdLen} 字节`]

  );
}

const typeName = (dict: Record<number, string>) => (v: number) => ({
  value: dict[v] ?? `用户自定义 (${hexN(v, 1)})`
});

function head(r: Reader, out: Field[]): void {
  out.push(r.uint('报警 ID', 4, () => ({ steps: ['按报警发生顺序从 0 循环累加，不区分报警类型'] })));
  out.push(r.uint('标志状态', 1, (v) => ({ value: FLAG_STATUS[v] ?? `未知 (${v})`, steps: ['仅适用于有开始和结束标志类型的报警或事件'] })));
}

function tail(r: Reader, out: Field[], termIdLen?: number): void {
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
  const len = termIdLen ?? r.remaining - 9;
  if (len <= 0) throw new ParseError(`报警标识号长度不足，剩余 ${r.remaining} 字节`, r.pos);
  out.push(parseAlarmIdentifier(r, len));
}

function attachments(out: Field[]): string {
  const id = out.find((f) => f.name === '报警标识号');
  const n = id?.children?.[3]?.num;
  return n === undefined ? '' : ` · 附件 ${n} 个`;
}

export function parseAdas(r: Reader, out: Field[]): string {
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
  tail(r, out);
  return `${type.value} · ${level.value}${attachments(out)}`;
}

export function parseDsm(r: Reader, out: Field[]): string {
  head(r, out);
  const type = r.uint('报警/事件类型', 1, typeName(DSM_TYPES));
  out.push(type);
  const level = r.uint('报警级别', 1, (v) => ({ value: ALARM_LEVEL[v] ?? `未知 (${v})` }));
  out.push(level);
  out.push(r.uint('疲劳程度', 1, (v) => ({ value: `${v} / 10`, steps: ['范围 1–10，数值越大疲劳程度越严重，仅疲劳驾驶报警时有效'] })));
  out.push(r.bytes('预留', 4, '4 字节保留'));
  tail(r, out);
  return `${type.value} · ${level.value}${attachments(out)}`;
}

export function parseAggressive(r: Reader, out: Field[]): string {
  head(r, out);
  const type = r.uint('报警/事件类型', 2, typeName(AGGRESSIVE_TYPES));
  out.push(type);
  out.push(r.uint('报警时间阈值', 2, () => ({ steps: ['触发报警的持续时间阈值，含义随报警类型而定'] })));
  out.push(r.uint('报警阈值 1', 2, () => ({ steps: ['含义随报警类型而定（如急加速/急减速的加速度阈值）'] })));
  out.push(r.uint('报警阈值 2', 2, () => ({ steps: ['含义随报警类型而定（如急转弯的角速度阈值）'] })));
  tail(r, out);
  return `${type.value}${attachments(out)}`;
}

export function parseBsd(r: Reader, out: Field[]): string {
  head(r, out);
  const type = r.uint('报警/事件类型', 1, typeName(BSD_TYPES));
  out.push(type);
  tail(r, out);
  return `${type.value}${attachments(out)}`;
}

export function parseTpms(r: Reader, out: Field[], version: ProtocolVersion): string {
  head(r, out);
  tail(r, out, version === '2019' ? 30 : 7);
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