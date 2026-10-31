import type { ProtocolVersion } from '../../types/jt808';
import type { BitDef } from './reader';

export const TERMINAL_RESULT = ['成功/确认', '失败', '消息有误', '不支持'];
export const PLATFORM_RESULT = ['成功/确认', '失败', '消息有误', '不支持', '报警处理确认'];
export const REGISTER_RESULT = ['成功', '车辆已被注册', '数据库中无该车辆', '终端已被注册', '数据库中无该终端'];

export const PROPS_DEFS: BitDef[] = [
{ bit: 0, width: 10, name: '消息体长度', render: (v) => `${v} 字节` },
{ bit: 10, width: 3, name: '数据加密方式', render: (v) => v === 0 ? '不加密' : v === 1 ? 'RSA 加密' : `保留 (${v})` },
{ bit: 13, name: '分包', render: (v) => v ? '分包' : '不分包' },
{ bit: 14, name: '版本标识', render: (v) => v ? '1 · 2019 版' : '0 · 2011/2013 版' },
{ bit: 15, name: '保留' }];


export const PLATE_COLORS: Record<number, string> = {
  0: '未上牌（后续为 VIN）',
  1: '蓝色',
  2: '黄色',
  3: '黑色',
  4: '白色',
  5: '绿色',
  9: '其他'
};

export const PROVINCES: Record<number, string> = {
  11: '北京', 12: '天津', 13: '河北', 14: '山西', 15: '内蒙古', 21: '辽宁', 22: '吉林', 23: '黑龙江',
  31: '上海', 32: '江苏', 33: '浙江', 34: '安徽', 35: '福建', 36: '江西', 37: '山东', 41: '河南',
  42: '湖北', 43: '湖南', 44: '广东', 45: '广西', 46: '海南', 50: '重庆', 51: '四川', 52: '贵州',
  53: '云南', 54: '西藏', 61: '陕西', 62: '甘肃', 63: '青海', 64: '宁夏', 65: '新疆'
};

/** 2013 表 24 */
const ALARM_NAMES_2013: Record<number, string> = {
  0: '紧急报警', 1: '超速报警', 2: '疲劳驾驶报警', 3: '危险预警', 4: 'GNSS 模块故障',
  5: 'GNSS 天线未接或被剪断', 6: 'GNSS 天线短路', 7: '终端主电源欠压', 8: '终端主电源掉电',
  9: '终端 LCD 或显示器故障', 10: 'TTS 模块故障', 11: '摄像头故障', 12: '道路运输证 IC 卡模块故障',
  13: '超速预警', 14: '疲劳驾驶预警', 18: '当天累计驾驶超时', 19: '超时停车', 20: '进出区域',
  21: '进出路线', 22: '路段行驶时间不足/过长', 23: '路线偏离报警', 24: '车辆 VSS 故障',
  25: '车辆油量异常', 26: '车辆被盗', 27: '车辆非法点火', 28: '车辆非法位移', 29: '碰撞预警',
  30: '侧翻预警', 31: '非法开门报警'
};

/** 2011 表 18：bit12–17、bit29–31 保留，bit3 为「预警」 */
const ALARM_NAMES_2011: Record<number, string> = Object.fromEntries(
  Object.entries({ ...ALARM_NAMES_2013, 3: '预警' }).filter(([b]) => !(Number(b) >= 12 && Number(b) <= 17) && Number(b) < 29)
);

/** 2019 表 25：新增 bit15–17，bit3/bit29 改名，bit31 保留 */
const ALARM_NAMES_2019: Record<number, string> = Object.fromEntries(
  Object.entries({
    ...ALARM_NAMES_2013,
    3: '危险驾驶行为报警', 15: '违规行驶报警', 16: '胎压预警', 17: '右转盲区异常报警', 29: '碰撞侧翻报警'
  }).filter(([b]) => Number(b) !== 31)
);

const ALARM_NAMES: Record<ProtocolVersion, Record<number, string>> = {
  '2011': ALARM_NAMES_2011, '2013': ALARM_NAMES_2013, '2019': ALARM_NAMES_2019
};

export function alarmDefs(version: ProtocolVersion): BitDef[] {
  return Object.entries(ALARM_NAMES[version]).map(([b, name]) => ({ bit: Number(b), name }));
}

const onOff = (v: number) => v ? '开' : '关';
const used = (v: number) => v ? '使用' : '未使用';

/** 2013 表 25 */
const STATUS_DEFS_2013: BitDef[] = [
{ bit: 0, name: 'ACC', render: onOff },
{ bit: 1, name: '定位', render: (v) => v ? '已定位' : '未定位' },
{ bit: 2, name: '纬度方向', render: (v) => v ? '南纬' : '北纬' },
{ bit: 3, name: '经度方向', render: (v) => v ? '西经' : '东经' },
{ bit: 4, name: '运营状态', render: (v) => v ? '停运' : '运营' },
{ bit: 5, name: '经纬度加密', render: (v) => v ? '已加密' : '未加密' },
{ bit: 8, width: 2, name: '载重状态', render: (v) => ['空车', '半载', '保留', '满载'][v] },
{ bit: 10, name: '油路', render: (v) => v ? '断开' : '正常' },
{ bit: 11, name: '电路', render: (v) => v ? '断开' : '正常' },
{ bit: 12, name: '车门锁', render: (v) => v ? '加锁' : '解锁' },
{ bit: 13, name: '门 1（前门）', render: onOff },
{ bit: 14, name: '门 2（中门）', render: onOff },
{ bit: 15, name: '门 3（后门）', render: onOff },
{ bit: 16, name: '门 4（驾驶席门）', render: onOff },
{ bit: 17, name: '门 5（自定义）', render: onOff },
{ bit: 18, name: 'GPS', render: used },
{ bit: 19, name: '北斗', render: used },
{ bit: 20, name: 'GLONASS', render: used },
{ bit: 21, name: 'Galileo', render: used }];

/** 2011 表 17：仅 bit0–5、bit10–12 有定义 */
const STATUS_DEFS_2011 = STATUS_DEFS_2013.filter((d) => d.bit <= 5 || d.bit >= 10 && d.bit <= 12);

/** 2019 表 24：新增 bit6、bit7、bit22 */
const STATUS_DEFS_2019: BitDef[] = [
...STATUS_DEFS_2013.slice(0, 6),
{ bit: 6, name: '紧急刹车系统前撞预警', render: (v) => v ? '预警' : '无' },
{ bit: 7, name: '车道偏移预警', render: (v) => v ? '预警' : '无' },
...STATUS_DEFS_2013.slice(6),
{ bit: 22, name: '行驶状态', render: (v) => v ? '行驶' : '停止' }];

const STATUS_BY_VERSION: Record<ProtocolVersion, BitDef[]> = {
  '2011': STATUS_DEFS_2011, '2013': STATUS_DEFS_2013, '2019': STATUS_DEFS_2019
};

export function statusDefs(version: ProtocolVersion): BitDef[] {
  return STATUS_BY_VERSION[version];
}


export const EXT_SIGNAL_DEFS: BitDef[] = [
'近光灯', '远光灯', '右转向灯', '左转向灯', '制动', '倒档', '雾灯', '示廓灯',
'喇叭', '空调', '空档', '缓速器工作', 'ABS 工作', '加热器工作', '离合器'].
map((name, bit) => ({ bit, name }));

export const IO_DEFS: BitDef[] = [
{ bit: 0, name: '深度休眠' },
{ bit: 1, name: '休眠' }];


export const VEHICLE_STATUS_DEFS: BitDef[] = [
{ bit: 0, name: 'ACC', render: onOff },
{ bit: 1, name: '左转向', render: onOff },
{ bit: 2, name: '右转向', render: onOff },
{ bit: 3, name: '雨刮器', render: onOff },
{ bit: 4, name: '制动', render: onOff },
{ bit: 5, name: '插卡', render: (v) => v ? '已插卡' : '未插卡' },
{ bit: 10, name: '定位', render: (v) => v ? '已定位' : '未定位' }];


export const TPMS_ALARM_DEFS: BitDef[] = [
'胎压（定时上报）', '胎压过高', '胎压过低', '胎温过高', '传感器异常', '胎压不平衡', '慢漏气', '电池电量低'].
map((name, bit) => ({ bit, name }));

export const EXTRA_NAMES: Record<number, string> = {
  0x01: '里程',
  0x02: '油量',
  0x03: '行驶记录速度',
  0x04: '人工确认报警事件 ID',
  0x05: '胎压',
  0x06: '车厢温度',
  0x11: '超速报警附加信息',
  0x12: '进出区域/路线报警',
  0x13: '路段行驶时间报警',
  0x25: '扩展车辆信号状态位',
  0x2a: 'IO 状态位',
  0x2b: '模拟量',
  0x30: '网络信号强度',
  0x31: 'GNSS 卫星数',
  0x14: '视频相关报警（JT/T 1078）',
  0x15: '视频信号丢失报警状态（JT/T 1078）',
  0x16: '视频信号遮挡报警状态（JT/T 1078）',
  0x17: '存储器故障报警状态（JT/T 1078）',
  0x18: '异常驾驶行为报警（JT/T 1078）',
  0x64: 'ADAS 高级驾驶辅助报警',
  0x65: 'DSM 驾驶员状态监测报警',
  0x66: 'TPMS 胎压监测报警',
  0x67: 'BSD 盲区监测报警',
  0xe0: '后续自定义信息长度',
  0xf1: '安装异常信息（粤标）',
  0xf2: '算法异常信息（粤标）'
};

/** 部标附加信息的起始版本：2011 表 20 只定义 0x01–0x03、0x11–0x13；0x05/0x06 为 2019 新增 */
export const EXTRA_SINCE: Record<number, ProtocolVersion> = {
  0x04: '2013', 0x25: '2013', 0x2a: '2013', 0x2b: '2013', 0x30: '2013', 0x31: '2013', 0xe0: '2013',
  0x05: '2019', 0x06: '2019'
};

export const FLAG_STATUS = ['不可用', '开始标志', '结束标志'];
export const ALARM_LEVEL: Record<number, string> = { 1: '一级报警', 2: '二级报警' };

/**
 * 主动安全扩展的两份地方标准：
 * - 苏标 T/JSATL 12-2017（基于 JT/T 808-2011，报警标识号 16 字节）
 * - 粤标 T/GDRTA 002-2020（基于 JT/T 808-2019，报警标识号 40 字节）
 */
export type SafetyStandard = 'su' | 'yue';
export const SAFETY_STANDARD_NAME: Record<SafetyStandard, string> = {
  su: '苏标 T/JSATL 12-2017',
  yue: '粤标 T/GDRTA 002-2020'
};
/** 无法从报文结构判断时按协议版本取默认：2019 → 粤标，2011/2013 → 苏标 */
export const defaultStandard = (version: ProtocolVersion): SafetyStandard => version === '2019' ? 'yue' : 'su';

/** 苏标表 4-15；0x08–0x0F、0x12–0x1F 为用户自定义 */
const ADAS_TYPES_SU: Record<number, string> = {
  0x01: '前向碰撞报警', 0x02: '车道偏离报警', 0x03: '车距过近报警', 0x04: '行人碰撞报警',
  0x05: '频繁变道报警', 0x06: '道路标识超限报警', 0x07: '障碍物报警',
  0x10: '道路标志识别事件', 0x11: '主动抓拍事件'
};
/** 粤标表 5-15；0x08–0x0F、0x14–0x1F 为用户自定义 */
const ADAS_TYPES_YUE: Record<number, string> = {
  ...ADAS_TYPES_SU, 0x12: '实线变道报警', 0x13: '车厢过道行人检测报警'
};
export const ADAS_TYPES: Record<SafetyStandard, Record<number, string>> = { su: ADAS_TYPES_SU, yue: ADAS_TYPES_YUE };

/** 苏标表 4-17；0x06–0x0F、0x12–0x1F 为用户自定义 */
const DSM_TYPES_SU: Record<number, string> = {
  0x01: '疲劳驾驶报警', 0x02: '接打电话报警', 0x03: '抽烟报警', 0x04: '分神驾驶报警',
  0x05: '驾驶员异常报警', 0x10: '自动抓拍事件', 0x11: '驾驶员变更事件'
};
/** 粤标表 5-17；0x07、0x09、0x0E–0x0F、0x12–0x1F 为用户自定义 */
const DSM_TYPES_YUE: Record<number, string> = {
  0x01: '疲劳驾驶报警', 0x02: '接打手持电话报警', 0x03: '抽烟报警', 0x04: '不目视前方报警',
  0x05: '驾驶员异常报警', 0x06: '探头遮挡报警', 0x08: '超时驾驶报警', 0x0a: '未系安全带报警',
  0x0b: '红外阻断型墨镜失效报警', 0x0c: '双脱把报警（双手同时脱离方向盘）', 0x0d: '玩手机报警',
  0x10: '自动抓拍事件', 0x11: '驾驶员变更事件'
};
export const DSM_TYPES: Record<SafetyStandard, Record<number, string>> = { su: DSM_TYPES_SU, yue: DSM_TYPES_YUE };

/** 疲劳程度上限：苏标 1–10，粤标 1–9 */
export const FATIGUE_MAX: Record<SafetyStandard, number> = { su: 10, yue: 9 };

/** 胎压报警位置长度：苏标表 4-19 为 BYTE，粤标表 5-19 为 BYTE[2] */
export const TPMS_POS_LEN: Record<SafetyStandard, 1 | 2> = { su: 1, yue: 2 };

export const SAFETY_EXTRA_IDS = [0x64, 0x65, 0x66, 0x67];

export const BSD_TYPES: Record<number, string> = {
  0x01: '后方接近报警', 0x02: '左侧后方接近报警', 0x03: '右侧后方接近报警'
};

export const DEVIATION: Record<number, string> = { 1: '左侧偏离', 2: '右侧偏离' };
const ROAD_SIGN_SU: Record<number, string> = { 1: '限速标志', 2: '限高标志', 3: '限重标志' };
export const ROAD_SIGN: Record<SafetyStandard, Record<number, string>> = {
  su: ROAD_SIGN_SU,
  yue: { ...ROAD_SIGN_SU, 4: '禁行标志', 5: '禁停标志' }
};

/** 苏标表 4-25 / 粤标表 5-25 */
export const FILE_TYPES: Record<SafetyStandard, string[]> = {
  su: ['图片', '音频', '视频', '文本', '其它'],
  yue: ['全景图片', '音频', '视频', '文本', '面部特征图片', '其它']
};
/** JT/T 1078 表 14：0x14 视频相关报警 */
export const VIDEO_ALARM_DEFS: BitDef[] = [
'视频信号丢失报警', '视频信号遮挡报警', '存储单元故障报警', '其他视频设备故障报警', '客车超员报警', '异常驾驶行为报警', '特殊报警录像达到存储阈值报警'].
map((name, bit) => ({ bit, name }));

/** JT/T 1078 表 15：0x18 异常驾驶行为类型 */
export const ABNORMAL_DRIVING_DEFS: BitDef[] = [
{ bit: 0, name: '疲劳' }, { bit: 1, name: '打电话' }, { bit: 2, name: '抽烟' }];

export const AREA_TYPES = ['无特定位置', '圆形区域', '矩形区域', '多边形区域', '路段'];

export function heading(v: number): string {
  return ['正北', '东北', '正东', '东南', '正南', '西南', '正西', '西北'][Math.round(v / 45) % 8];
}