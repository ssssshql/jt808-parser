import type { MessageSpec } from '../../types/messageSpec';
import {
  PLATE_COLORS, PLATFORM_RESULT, PROVINCES, REGISTER_RESULT, TERMINAL_RESULT } from
'../../utils/jt808/dictionaries';
import {
  ALL_VERSIONS, BEFORE_2019, ONLY_2019, bcd, bytesBy, list, params, str, strBy, time, u16, u32, u8 } from
'../../utils/jt808/specHelpers';
import { PARAM_NAMES } from '../terminalParams';

const UPGRADE_TYPES = { 0: '终端', 12: '道路运输证 IC 卡读卡器', 52: '北斗卫星定位模块' };

const CONTROL_CMDS = {
  1: '无线升级',
  2: '控制终端连接指定服务器',
  3: '终端关机',
  4: '终端复位',
  5: '终端恢复出厂设置',
  6: '关闭数据通信',
  7: '关闭所有无线通信'
};

const base = { category: '通用与终端管理', standard: 'JT/T 808' } as const;

export const terminalSpecs: MessageSpec[] = [
{
  ...base, id: 0x0001, name: '终端通用应答', direction: 'up', versions: ALL_VERSIONS,
  desc: '终端对平台下发的、没有专用应答的消息进行通用应答。',
  fields: [
  u16('应答流水号', { desc: '对应平台消息的流水号' }),
  u16('应答 ID', { desc: '对应平台消息的 ID' }),
  u8('结果', { enum: TERMINAL_RESULT })]

},
{
  ...base, id: 0x8001, name: '平台通用应答', direction: 'down', versions: ALL_VERSIONS,
  desc: '平台对终端上报的、没有专用应答的消息进行通用应答。',
  fields: [
  u16('应答流水号', { desc: '对应终端消息的流水号' }),
  u16('应答 ID', { desc: '对应终端消息的 ID' }),
  u8('结果', { enum: PLATFORM_RESULT })]

},
{
  ...base, id: 0x0002, name: '终端心跳', direction: 'up', versions: ALL_VERSIONS, replies: [0x8001],
  desc: '终端在没有业务数据发送时，按「终端心跳发送间隔」参数周期性发送，用于维持链路。消息体为空。',
  fields: []
},
{
  ...base, id: 0x8003, name: '补传分包请求', direction: 'down', versions: ALL_VERSIONS,
  desc: '平台在接收分包消息时发现缺包，要求终端重传指定分包。',
  fields: [
  u16('原始消息流水号', { desc: '对应要求补传的原始消息第一包的流水号' }),
  u8('重传包总数', { versions: BEFORE_2019 }),
  u16('重传包总数', { versions: ONLY_2019 }),
  list('重传包 ID 列表', '重传包总数', [u16('重传包序号', { desc: '从 1 开始' })])]

},
{
  ...base, id: 0x0005, name: '终端补传分包请求', direction: 'up', versions: ONLY_2019,
  desc: '终端接收平台分包消息缺包时，请求平台补传。2019 版新增。',
  fields: [
  u16('原始消息流水号'),
  u16('重传包总数'),
  list('重传包 ID 列表', '重传包总数', [u16('重传包序号')])]

},
{
  ...base, id: 0x0100, name: '终端注册', direction: 'up', versions: ALL_VERSIONS, replies: [0x8100],
  desc: '终端首次接入平台时发送注册请求，平台返回鉴权码。各版本制造商 ID、终端型号、终端 ID 的长度不同。',
  fields: [
  u16('省域 ID', { enum: PROVINCES, desc: 'GB/T 2260 行政区划代码前两位', example: 44 }),
  u16('市县域 ID', { desc: 'GB/T 2260 行政区划代码后四位', example: 300 }),
  str('制造商 ID', { '2011': 5, '2013': 5, '2019': 11 }, { example: '70111' }),
  str('终端型号', { '2011': 8, '2013': 20, '2019': 30 }, { example: 'JT-X9', desc: '由制造商自行定义，不足时后补 0x00' }),
  str('终端 ID', { '2011': 7, '2013': 7, '2019': 30 }, { example: 'T900001', desc: '由大写字母和数字组成' }),
  u8('车牌颜色', { enum: PLATE_COLORS, example: 1 }),
  str('车辆标识', 'rest', { enc: 'gbk', example: 'B12345', desc: '车牌颜色为 0 时为车辆 VIN，否则为机动车号牌' })]

},
{
  ...base, id: 0x8100, name: '终端注册应答', direction: 'down', versions: ALL_VERSIONS,
  desc: '平台对终端注册消息的应答，成功时下发鉴权码。',
  fields: [
  u16('应答流水号', { desc: '对应终端注册消息的流水号' }),
  u8('结果', { enum: REGISTER_RESULT }),
  str('鉴权码', 'rest', { when: (c) => c.values['结果'] === 0, whenText: '结果 = 0（成功）', example: 'AUTH9527' })]

},
{
  ...base, id: 0x0003, name: '终端注销', direction: 'up', versions: ALL_VERSIONS, replies: [0x8001],
  desc: '终端请求注销，消息体为空。',
  fields: []
},
{
  ...base, id: 0x0004, name: '查询服务器时间请求', direction: 'up', versions: ONLY_2019, replies: [0x8004],
  desc: '终端向平台请求校时，消息体为空。2019 版新增。',
  fields: []
},
{
  ...base, id: 0x8004, name: '查询服务器时间应答', direction: 'down', versions: ONLY_2019,
  desc: '平台返回服务器当前 UTC 时间。2019 版新增。',
  fields: [time('UTC 日期时间', { desc: 'YY-MM-DD-hh-mm-ss（UTC）' })]
},
{
  ...base, id: 0x0102, name: '终端鉴权', direction: 'up', versions: ALL_VERSIONS, replies: [0x8001],
  desc: '终端注册后每次连接平台时，使用鉴权码进行鉴权。2019 版增加了鉴权码长度、IMEI 和软件版本号。',
  fields: [
  str('鉴权码', 'rest', { versions: BEFORE_2019, example: 'AUTH9527' }),
  u8('鉴权码长度', { versions: ONLY_2019 }),
  strBy('鉴权码', '鉴权码长度', { versions: ONLY_2019, example: 'AUTH9527' }),
  str('终端 IMEI', 15, { versions: ONLY_2019, example: '860000000000001' }),
  str('软件版本号', 20, { versions: ONLY_2019, example: 'V1.2.0', desc: '厂家自定义版本号，不足时后补 0x00' })]

},
{
  ...base, id: 0x8103, name: '设置终端参数', direction: 'down', versions: ALL_VERSIONS, replies: [0x0001],
  desc: '平台批量设置终端参数，每个参数项为 参数 ID + 参数长度 + 参数值。',
  fields: [u8('参数总数'), params('参数项列表', '参数总数')]
},
{
  ...base, id: 0x8104, name: '查询终端参数', direction: 'down', versions: ALL_VERSIONS, replies: [0x0104],
  desc: '平台查询终端全部参数，消息体为空。',
  fields: []
},
{
  ...base, id: 0x0104, name: '查询终端参数应答', direction: 'up', versions: ALL_VERSIONS,
  desc: '终端对查询终端参数 / 查询指定终端参数的应答。',
  fields: [
  u16('应答流水号', { desc: '对应查询消息的流水号' }),
  u8('应答参数个数'),
  params('参数项列表', '应答参数个数')]

},
{
  ...base, id: 0x8105, name: '终端控制', direction: 'down', versions: ALL_VERSIONS, replies: [0x0001],
  desc: '平台对终端进行升级、连接切换、关机、复位等控制。',
  fields: [
  u8('命令字', { enum: CONTROL_CMDS }),
  str('命令参数', 'rest', { enc: 'gbk', example: '', desc: '命令字为 1、2 时有效，各参数之间以半角分号分隔' })]

},
{
  ...base, id: 0x8106, name: '查询指定终端参数', direction: 'down', versions: ALL_VERSIONS, replies: [0x0104],
  desc: '平台查询指定 ID 的终端参数。',
  fields: [
  u8('参数总数'),
  list('参数 ID 列表', '参数总数', [u32('参数 ID', { enum: PARAM_NAMES, ref: 'params', example: 1 })])]

},
{
  ...base, id: 0x8107, name: '查询终端属性', direction: 'down', versions: ALL_VERSIONS, replies: [0x0107],
  desc: '平台查询终端属性，消息体为空。',
  fields: []
},
{
  ...base, id: 0x0107, name: '查询终端属性应答', direction: 'up', versions: ALL_VERSIONS,
  desc: '终端返回终端类型、制造商、型号、SIM 卡、软硬件版本和通信模块属性。',
  fields: [
  u16('终端类型', {
    bits: [
    { bit: 0, name: '适用客运车辆' },
    { bit: 1, name: '适用危险品车辆' },
    { bit: 2, name: '适用普通货运车辆' },
    { bit: 3, name: '适用出租车辆' },
    { bit: 6, name: '支持硬盘录像' },
    { bit: 7, name: '分体机', render: (v) => v ? '分体机' : '一体机' },
    { bit: 8, name: '适用挂车（2019）' }]

  }),
  str('制造商 ID', { '2011': 5, '2013': 5, '2019': 11 }, { example: '70111' }),
  str('终端型号', { '2011': 20, '2013': 20, '2019': 30 }, { example: 'JT-X9' }),
  str('终端 ID', { '2011': 7, '2013': 7, '2019': 30 }, { example: 'T900001' }),
  bcd('终端 SIM 卡 ICCID', 10, { example: '89860000000000000001' }),
  u8('终端硬件版本号长度'),
  strBy('终端硬件版本号', '终端硬件版本号长度', { example: 'HW1.0' }),
  u8('终端固件版本号长度'),
  strBy('终端固件版本号', '终端固件版本号长度', { example: 'FW2.3.1' }),
  u8('GNSS 模块属性', {
    bits: [
    { bit: 0, name: 'GPS' },
    { bit: 1, name: '北斗' },
    { bit: 2, name: 'GLONASS' },
    { bit: 3, name: 'Galileo' }],

    example: 3
  }),
  u8('通信模块属性', {
    bits: [
    { bit: 0, name: 'GPRS' },
    { bit: 1, name: 'CDMA' },
    { bit: 2, name: 'TD-SCDMA' },
    { bit: 3, name: 'WCDMA' },
    { bit: 4, name: 'CDMA2000' },
    { bit: 5, name: 'TD-LTE' },
    { bit: 7, name: '其他通信方式' }],

    example: 32
  })]

},
{
  ...base, id: 0x8108, name: '下发终端升级包', direction: 'down', versions: ALL_VERSIONS, replies: [0x0001, 0x0108],
  desc: '平台向终端下发升级数据包，通常采用分包传输。',
  fields: [
  u8('升级类型', { enum: UPGRADE_TYPES }),
  str('制造商 ID', { '2011': 5, '2013': 5, '2019': 11 }, { example: '70111' }),
  u8('版本号长度'),
  strBy('版本号', '版本号长度', { example: 'V2.0.0' }),
  u32('升级数据包长度', { unit: 'B' }),
  bytesBy('升级数据包', '升级数据包长度')]

},
{
  ...base, id: 0x0108, name: '终端升级结果通知', direction: 'up', versions: ALL_VERSIONS, replies: [0x8001],
  desc: '终端升级完成并重新连接后，通知平台升级结果。',
  fields: [u8('升级类型', { enum: UPGRADE_TYPES }), u8('升级结果', { enum: ['成功', '失败', '取消'] })]
}];