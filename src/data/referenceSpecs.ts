import type { SpecField } from '../types/messageSpec';
import {
  ADAS_TYPES, ALARM_LEVEL, BSD_TYPES, DEVIATION, DSM_TYPES, FLAG_STATUS, PROPS_DEFS, ROAD_SIGN,
  TPMS_ALARM_DEFS, VEHICLE_STATUS_DEFS } from
'../utils/jt808/dictionaries';
import { BEFORE_2019, ONLY_2019, alarmId, bcd, bitOf, bytes, bytesBy, list, str, time, u16, u32, u8 } from '../utils/jt808/specHelpers';

/** 文档按协议版本展示：2011/2013 → 苏标 T/JSATL 12-2017，2019 → 粤标 T/GDRTA 002-2020 */
const SU = { versions: BEFORE_2019 };
const YUE = { versions: ONLY_2019 };

export const HEADER_FIELDS: SpecField[] = [
u16('消息 ID'),
u16('消息体属性', { bits: PROPS_DEFS }),
u8('协议版本号', { versions: ONLY_2019, desc: '每次关键修订递增，初始版本为 1' }),
bcd('终端手机号', 6, { versions: BEFORE_2019, desc: '12 位，不足时前补 0' }),
bcd('终端手机号', 10, { versions: ONLY_2019, desc: '20 位，不足时前补 0' }),
u16('消息流水号', { desc: '按发送顺序从 0 开始循环累加' }),
u16('消息总包数', { when: (c) => bitOf(c, '消息体属性', 13) === 1, whenText: '消息体属性 bit13 = 1（分包）' }),
u16('包序号', { when: (c) => bitOf(c, '消息体属性', 13) === 1, whenText: '消息体属性 bit13 = 1（分包）', desc: '从 1 开始' })];


export const LOCATION_BASIC_FIELDS: SpecField[] = [
u32('报警标志', { desc: '按位定义的 32 位报警标志', ref: 'bits' }),
u32('状态', { desc: '按位定义的 32 位状态', ref: 'bits' }),
u32('纬度', { scale: 1e6, unit: '°', desc: '纬度值乘以 10⁶，南北由状态位 bit2 决定' }),
u32('经度', { scale: 1e6, unit: '°', desc: '经度值乘以 10⁶，东西由状态位 bit3 决定' }),
u16('高程', { unit: 'm', desc: '海拔高度' }),
u16('速度', { scale: 10, unit: 'km/h' }),
u16('方向', { unit: '°', desc: '0–359，正北为 0，顺时针' }),
time('时间')];


/** 苏标表 4-16（16 字节）/ 粤标表 5-16（40 字节） */
export const ALARM_ID_FIELDS: SpecField[] = [
str('终端 ID', { '2011': 7, '2013': 7, '2019': 30 }, { desc: '由大写字母和数字组成' }),
time('时间'),
u8('序号', { desc: '同一时间点报警的序号，从 0 循环累加' }),
u8('附件数量'),
bytes('预留', { '2011': 1, '2013': 1, '2019': 2 })];


export const PARAM_ITEM_FIELDS: SpecField[] = [
u32('参数 ID', { ref: 'params' }),
u8('参数长度'),
bytesBy('参数值', '参数长度', { desc: '数据类型随参数 ID 而定' })];


const SAFETY_TAIL: SpecField[] = [
u8('车速', { unit: 'km/h' }),
u16('高程', { unit: 'm' }),
u32('纬度', { scale: 1e6, unit: '°' }),
u32('经度', { scale: 1e6, unit: '°' }),
time('日期时间'),
u16('车辆状态', { bits: VEHICLE_STATUS_DEFS }),
alarmId()];


const SAFETY_HEAD: SpecField[] = [
u32('报警 ID', { desc: '按报警发生顺序从 0 循环累加，不区分报警类型' }),
u8('标志状态', { enum: FLAG_STATUS, desc: '仅适用于有开始和结束标志的报警或事件' })];


export interface SafetyExtraSpec {
  id: number;
  name: string;
  desc: string;
  fields: SpecField[];
}

export const SAFETY_EXTRA_SPECS: SafetyExtraSpec[] = [
{
  id: 0x64,
  name: '高级驾驶辅助系统报警信息（ADAS）',
  desc: '前向碰撞、车道偏离、车距过近、行人碰撞等前向辅助驾驶报警。',
  fields: [
  ...SAFETY_HEAD,
  u8('报警/事件类型', { enum: ADAS_TYPES.su, desc: '苏标表 4-15；0x08–0x0F、0x12–0x1F 为用户自定义', ...SU }),
  u8('报警/事件类型', { enum: ADAS_TYPES.yue, desc: '粤标表 5-15；0x08–0x0F、0x14–0x1F 为用户自定义', ...YUE }),
  u8('报警级别', { enum: ALARM_LEVEL }),
  u8('前车车速', { unit: 'km/h', desc: '范围 0–250，仅报警类型为 0x01、0x02 时有效' }),
  u8('前车/行人距离', { scale: 10, unit: 's', desc: '单位 100 ms，范围 0–100，仅报警类型为 0x01、0x02、0x04 时有效' }),
  u8('偏离类型', { enum: DEVIATION, desc: '仅报警类型为 0x02 时有效' }),
  u8('道路标志识别类型', { enum: ROAD_SIGN.su, desc: '仅报警类型为 0x06、0x10 时有效', ...SU }),
  u8('道路标志识别类型', { enum: ROAD_SIGN.yue, desc: '仅报警类型为 0x06、0x10 时有效', ...YUE }),
  u8('道路标志识别数据'),
  ...SAFETY_TAIL]

},
{
  id: 0x65,
  name: '驾驶员状态监测系统报警信息（DSM）',
  desc: '疲劳驾驶、接打电话、抽烟、分神驾驶等驾驶员行为报警。',
  fields: [
  ...SAFETY_HEAD,
  u8('报警/事件类型', { enum: DSM_TYPES.su, desc: '苏标表 4-17；0x06–0x0F、0x12–0x1F 为用户自定义', ...SU }),
  u8('报警/事件类型', { enum: DSM_TYPES.yue, desc: '粤标表 5-17；0x07、0x09、0x0E–0x0F、0x12–0x1F 为用户自定义', ...YUE }),
  u8('报警级别', { enum: ALARM_LEVEL }),
  u8('疲劳程度', { desc: '苏标：范围 1–10，数值越大越疲劳，仅报警类型为 0x01 时有效', ...SU }),
  u8('疲劳程度', { desc: '粤标：范围 1–9，数值越大越疲劳，仅报警类型为 0x01 时有效', ...YUE }),
  bytes('预留', 4),
  ...SAFETY_TAIL]

},
{
  id: 0x66,
  name: '胎压监测系统报警信息（TPMS）',
  desc: '胎压过高/过低、胎温过高、慢漏气等轮胎报警，携带轮胎事件列表。',
  fields: [
  ...SAFETY_HEAD,
  ...SAFETY_TAIL,
  u8('报警/事件列表总数'),
  list('报警/事件信息列表', '报警/事件列表总数', [
  u8('胎压报警位置', { desc: '苏标表 4-19：BYTE，从左前轮开始以 Z 字形从 00 依次编号', ...SU }),
  u16('胎压报警位置', { desc: '粤标表 5-19：BYTE[2]，从左前轮开始以 Z 字形从 00 依次编号', ...YUE }),
  u16('报警/事件类型', { bits: TPMS_ALARM_DEFS }),
  u16('胎压', { unit: 'kPa' }),
  u16('胎温', { unit: '℃' }),
  u16('电池电量', { unit: '%' })]
  )]

},
{
  id: 0x67,
  name: '盲区监测系统报警信息（BSD）',
  desc: '后方、左侧后方、右侧后方接近报警。',
  fields: [...SAFETY_HEAD, u8('报警/事件类型', { enum: BSD_TYPES }), ...SAFETY_TAIL]
}];


export interface ExtraDoc {
  id: number;
  length: string;
  name: string;
  desc: string;
  versions?: string;
}

export const EXTRA_DOCS: ExtraDoc[] = [
{ id: 0x01, length: '4', name: '里程', desc: 'DWORD，1/10 km，对应车上里程表读数' },
{ id: 0x02, length: '2', name: '油量', desc: 'WORD，1/10 L，对应车上油量表读数' },
{ id: 0x03, length: '2', name: '行驶记录功能获取的速度', desc: 'WORD，1/10 km/h' },
{ id: 0x04, length: '2', name: '需人工确认报警事件的 ID', desc: 'WORD，从 1 开始计数', versions: '2013 起' },
{ id: 0x05, length: '30', name: '胎压', desc: 'BYTE[30]，单位 Pa，从车头开始从左到右编号，多余字节为 0xFF 表示无效', versions: '2019' },
{ id: 0x06, length: '2', name: '车厢温度', desc: 'WORD，单位 ℃，取值 -32767～+32767，最高位为 1 表示负数（符号位 + 绝对值）。2019 原文未写长度，按 WORD 解析', versions: '2019' },
{ id: 0x11, length: '1 或 5', name: '超速报警附加信息', desc: '位置类型 BYTE + 区域或路段 ID DWORD（位置类型为 0 时无 ID）' },
{ id: 0x12, length: '6', name: '进出区域/路线报警附加信息', desc: '位置类型 BYTE + 区域或路线 ID DWORD + 方向 BYTE（0 进 / 1 出）' },
{ id: 0x13, length: '7', name: '路段行驶时间不足/过长报警附加信息', desc: '路段 ID DWORD + 路段行驶时间 WORD（s）+ 结果 BYTE（0 不足 / 1 过长）' },
{ id: 0x25, length: '4', name: '扩展车辆信号状态位', desc: 'DWORD，近光灯、远光灯、转向灯、制动、倒档、雾灯等', versions: '2013 起' },
{ id: 0x2a, length: '2', name: 'IO 状态位', desc: 'WORD，bit0 深度休眠，bit1 休眠', versions: '2013 起' },
{ id: 0x2b, length: '4', name: '模拟量', desc: 'DWORD，bit0–15 为 AD0，bit16–31 为 AD1', versions: '2013 起' },
{ id: 0x30, length: '1', name: '无线通信网络信号强度', desc: 'BYTE', versions: '2013 起' },
{ id: 0x31, length: '1', name: 'GNSS 定位卫星数', desc: 'BYTE', versions: '2013 起' },
{ id: 0xe0, length: '1', name: '后续自定义信息长度', desc: 'BYTE', versions: '2013 起' },
{ id: 0x64, length: '可变', name: 'ADAS 高级驾驶辅助系统报警', desc: '主动安全扩展（苏标表 4-15 / 粤标表 5-15）' },
{ id: 0x65, length: '可变', name: 'DSM 驾驶员状态监测系统报警', desc: '主动安全扩展（苏标表 4-17 / 粤标表 5-17）' },
{ id: 0x66, length: '可变', name: 'TPMS 胎压监测系统报警', desc: '主动安全扩展（苏标表 4-18 / 粤标表 5-18）' },
{ id: 0x67, length: '可变', name: 'BSD 盲区监测系统报警', desc: '主动安全扩展（苏标表 4-20 / 粤标表 5-20）' },
{ id: 0xf1, length: '4', name: '安装异常信息', desc: 'DWORD，由厂家自定义（粤标表 5-14）', versions: '粤标' },
{ id: 0xf2, length: '4', name: '算法异常信息', desc: 'DWORD，由厂家自定义（粤标表 5-14）', versions: '粤标' }];