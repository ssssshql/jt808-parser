import type { MessageSpec, SpecField } from '../../types/messageSpec';
import {
  ALL_VERSIONS, BEFORE_2019, ONLY_2019, bitOf, bytes, list, location, strBy, time, u16, u32, u8 } from
'../../utils/jt808/specHelpers';

const lat = (name: string) => u32(name, { scale: 1e6, unit: '°' });
const lon = (name: string) => u32(name, { scale: 1e6, unit: '°' });

const REGION_ATTR_BITS = [
{ bit: 0, name: '根据时间' },
{ bit: 1, name: '限速' },
{ bit: 2, name: '进区域报警给驾驶员' },
{ bit: 3, name: '进区域报警给平台' },
{ bit: 4, name: '出区域报警给驾驶员' },
{ bit: 5, name: '出区域报警给平台' },
{ bit: 6, name: '纬度', render: (v: number) => v ? '南纬' : '北纬' },
{ bit: 7, name: '经度', render: (v: number) => v ? '西经' : '东经' },
{ bit: 8, name: '门控', render: (v: number) => v ? '禁止开门' : '允许开门' },
{ bit: 14, name: '进区域通信模块', render: (v: number) => v ? '关闭' : '开启' },
{ bit: 15, name: '进区域采集 GNSS 详细定位数据', render: (v: number) => v ? '采集' : '不采集' }];


const ROUTE_ATTR_BITS = [
{ bit: 0, name: '根据时间' },
{ bit: 2, name: '进路线报警给驾驶员' },
{ bit: 3, name: '进路线报警给平台' },
{ bit: 4, name: '出路线报警给驾驶员' },
{ bit: 5, name: '出路线报警给平台' }];


const SEGMENT_BITS = [
{ bit: 0, name: '行驶时间' },
{ bit: 1, name: '限速' },
{ bit: 2, name: '纬度', render: (v: number) => v ? '南纬' : '北纬' },
{ bit: 3, name: '经度', render: (v: number) => v ? '西经' : '东经' }];


const timeRange = (attr: string): SpecField[] => [
time('起始时间', { when: (c) => bitOf(c, attr, 0) === 1, whenText: `${attr} bit0 = 1` }),
time('结束时间', { when: (c) => bitOf(c, attr, 0) === 1, whenText: `${attr} bit0 = 1` })];


const speedLimit = (attr: string, prefix = ''): SpecField[] => [
u16(`${prefix}最高速度`, { unit: 'km/h', when: (c) => bitOf(c, attr, 1) === 1, whenText: `${attr} bit1 = 1` }),
u8(`${prefix}超速持续时间`, { unit: 's', when: (c) => bitOf(c, attr, 1) === 1, whenText: `${attr} bit1 = 1` })];


const nightSpeed = (attr: string, prefix = ''): SpecField =>
u16(`${prefix}夜间最高速度`, { unit: 'km/h', versions: ONLY_2019, when: (c) => bitOf(c, attr, 1) === 1, whenText: `${attr} bit1 = 1` });

const regionName = (label: string): SpecField[] => [
u16(`${label}名称长度`, { versions: ONLY_2019 }),
strBy(`${label}名称`, `${label}名称长度`, { versions: ONLY_2019, enc: 'gbk', example: 'AREA1' })];


const deleteRegion = (id: number, name: string, kind: string): MessageSpec => ({
  id, name, direction: 'down', category: '车辆控制与区域', standard: 'JT/T 808', versions: ALL_VERSIONS, replies: [0x0001],
  desc: `删除终端上已设置的${kind}。`,
  fields: [
  u8(`${kind === '路线' ? '路线' : '区域'}数`, { desc: `不超过 125 个，为 0 时删除所有${kind}` }),
  list(`${kind === '路线' ? '路线' : '区域'} ID 列表`, `${kind === '路线' ? '路线' : '区域'}数`, [u32(`${kind === '路线' ? '路线' : '区域'} ID`)])]

});

const SET_ATTR = { 0: '更新区域', 1: '追加区域', 2: '修改区域' };
const QUERY_TYPES = { 1: '圆形区域', 2: '矩形区域', 3: '多边形区域', 4: '路线' };

export const locationSpecs: MessageSpec[] = [
{
  id: 0x0200, name: '位置信息汇报', direction: 'up', category: '位置与报警', standard: 'JT/T 808', versions: ALL_VERSIONS, replies: [0x8001],
  desc: '终端按位置汇报策略周期性上报位置、报警与状态，可附带多个附加信息项（含主动安全报警）。',
  fields: [location('位置信息')]
},
{
  id: 0x8201, name: '位置信息查询', direction: 'down', category: '位置与报警', standard: 'JT/T 808', versions: ALL_VERSIONS, replies: [0x0201],
  desc: '平台查询终端当前位置信息，消息体为空。',
  fields: []
},
{
  id: 0x0201, name: '位置信息查询应答', direction: 'up', category: '位置与报警', standard: 'JT/T 808', versions: ALL_VERSIONS,
  desc: '终端对位置信息查询的应答，消息体为应答流水号 + 位置信息汇报消息体。',
  fields: [u16('应答流水号', { desc: '对应位置信息查询消息的流水号' }), location('位置信息')]
},
{
  id: 0x8202, name: '临时位置跟踪控制', direction: 'down', category: '位置与报警', standard: 'JT/T 808', versions: ALL_VERSIONS, replies: [0x0001],
  desc: '平台要求终端在有效期内按指定间隔汇报位置。',
  fields: [
  u16('时间间隔', { unit: 's', desc: '为 0 时停止跟踪' }),
  u32('位置跟踪有效期', { unit: 's', desc: '终端在接收到控制后，在有效期截止前依据时间间隔汇报' })]

},
{
  id: 0x8203, name: '人工确认报警消息', direction: 'down', category: '位置与报警', standard: 'JT/T 808', versions: ALL_VERSIONS, replies: [0x0001],
  desc: '平台人工确认终端上报的报警，终端收到后清除对应报警标志。',
  fields: [
  u16('报警消息流水号', { desc: '需人工确认的报警消息流水号，为 0 表示该报警类型所有消息' }),
  u32('人工确认报警类型', {
    bits: [
    { bit: 0, name: '确认紧急报警' },
    { bit: 3, name: '确认危险预警' },
    { bit: 20, name: '确认进出区域报警' },
    { bit: 21, name: '确认进出路线报警' },
    { bit: 22, name: '确认路段行驶时间不足/过长报警' },
    { bit: 27, name: '确认车辆非法点火报警' },
    { bit: 28, name: '确认车辆非法位移报警' }],

    example: 1
  })]

},
{
  id: 0x8204, name: '链路检测', direction: 'down', category: '位置与报警', standard: 'JT/T 808', versions: ONLY_2019, replies: [0x0001],
  desc: '平台检测与终端之间的链路是否正常，消息体为空。2019 版新增。',
  fields: []
},
{
  id: 0x0704, name: '定位数据批量上传', direction: 'up', category: '位置与报警', standard: 'JT/T 808', versions: ALL_VERSIONS, replies: [0x8001],
  desc: '终端批量上传多条位置信息，常用于盲区补报。',
  fields: [
  u16('数据项个数'),
  u8('位置数据类型', { enum: { 0: '正常位置批量汇报', 1: '盲区补报' } }),
  list('位置汇报数据项', '数据项个数', [
  u16('位置汇报数据体长度'),
  location('位置汇报数据体', { lenRef: '位置汇报数据体长度' })]
  )]

},
{
  id: 0x8500, name: '车辆控制', direction: 'down', category: '车辆控制与区域', standard: 'JT/T 808', versions: ALL_VERSIONS, replies: [0x0500],
  desc: '平台对车辆进行控制。2011/2013 版使用控制标志位，2019 版改为控制类型列表。',
  fields: [
  u8('控制标志', { versions: BEFORE_2019, bits: [{ bit: 0, name: '车门', render: (v) => v ? '加锁' : '解锁' }] }),
  u16('控制类型数量', { versions: ONLY_2019 }),
  list('控制类型列表', '控制类型数量', [
  u16('控制类型 ID', { enum: { 1: '车门' }, example: 1 }),
  u8('控制参数', { enum: { 0: '车门锁闭', 1: '车门开启' } })],
  { versions: ONLY_2019 })]

},
{
  id: 0x0500, name: '车辆控制应答', direction: 'up', category: '车辆控制与区域', standard: 'JT/T 808', versions: ALL_VERSIONS,
  desc: '终端执行车辆控制后，返回应答流水号与当前位置信息。',
  fields: [u16('应答流水号', { desc: '对应车辆控制消息的流水号' }), location('位置信息')]
},
{
  id: 0x8600, name: '设置圆形区域', direction: 'down', category: '车辆控制与区域', standard: 'JT/T 808', versions: ALL_VERSIONS, replies: [0x0001],
  desc: '平台设置圆形电子围栏，可附带时间段与限速条件。',
  fields: [
  u8('设置属性', { enum: SET_ATTR }),
  u8('区域总数'),
  list('区域项', '区域总数', [
  u32('区域 ID'),
  u16('区域属性', { bits: REGION_ATTR_BITS }),
  lat('中心点纬度'),
  lon('中心点经度'),
  u32('半径', { unit: 'm' }),
  ...timeRange('区域属性'),
  ...speedLimit('区域属性'),
  nightSpeed('区域属性'),
  ...regionName('区域')]
  )]

},
deleteRegion(0x8601, '删除圆形区域', '圆形区域'),
{
  id: 0x8602, name: '设置矩形区域', direction: 'down', category: '车辆控制与区域', standard: 'JT/T 808', versions: ALL_VERSIONS, replies: [0x0001],
  desc: '平台设置矩形电子围栏。',
  fields: [
  u8('设置属性', { enum: SET_ATTR }),
  u8('区域总数'),
  list('区域项', '区域总数', [
  u32('区域 ID'),
  u16('区域属性', { bits: REGION_ATTR_BITS }),
  lat('左上点纬度'),
  lon('左上点经度'),
  lat('右下点纬度'),
  lon('右下点经度'),
  ...timeRange('区域属性'),
  ...speedLimit('区域属性'),
  nightSpeed('区域属性'),
  ...regionName('区域')]
  )]

},
deleteRegion(0x8603, '删除矩形区域', '矩形区域'),
{
  id: 0x8604, name: '设置多边形区域', direction: 'down', category: '车辆控制与区域', standard: 'JT/T 808', versions: ALL_VERSIONS, replies: [0x0001],
  desc: '平台设置多边形电子围栏，每条消息设置一个区域。',
  fields: [
  u32('区域 ID'),
  u16('区域属性', { bits: REGION_ATTR_BITS }),
  ...timeRange('区域属性'),
  ...speedLimit('区域属性'),
  u16('区域总顶点数'),
  list('顶点项', '区域总顶点数', [lat('顶点纬度'), lon('顶点经度')]),
  nightSpeed('区域属性'),
  ...regionName('区域')]

},
deleteRegion(0x8605, '删除多边形区域', '多边形区域'),
{
  id: 0x8606, name: '设置路线', direction: 'down', category: '车辆控制与区域', standard: 'JT/T 808', versions: ALL_VERSIONS, replies: [0x0001],
  desc: '平台设置行驶路线，由多个拐点和路段组成。',
  fields: [
  u32('路线 ID'),
  u16('路线属性', { bits: ROUTE_ATTR_BITS }),
  ...timeRange('路线属性'),
  u16('路线总拐点数'),
  list('拐点项', '路线总拐点数', [
  u32('拐点 ID'),
  u32('路段 ID'),
  lat('拐点纬度'),
  lon('拐点经度'),
  u8('路段宽度', { unit: 'm' }),
  u8('路段属性', { bits: SEGMENT_BITS }),
  u16('路段行驶过长阈值', { unit: 's', when: (c) => bitOf(c, '路段属性', 0) === 1, whenText: '路段属性 bit0 = 1' }),
  u16('路段行驶不足阈值', { unit: 's', when: (c) => bitOf(c, '路段属性', 0) === 1, whenText: '路段属性 bit0 = 1' }),
  ...speedLimit('路段属性', '路段'),
  nightSpeed('路段属性', '路段')]
  ),
  ...regionName('路线')]

},
deleteRegion(0x8607, '删除路线', '路线'),
{
  id: 0x8608, name: '查询区域或线路数据', direction: 'down', category: '车辆控制与区域', standard: 'JT/T 808', versions: ONLY_2019, replies: [0x0608],
  desc: '平台查询终端中存储的区域或路线数据。2019 版新增。',
  fields: [
  u8('查询类型', { enum: QUERY_TYPES, example: 1 }),
  u32('查询 ID 数量', { desc: '为 0 时查询该类型的所有区域或路线' }),
  list('ID 列表', '查询 ID 数量', [u32('区域或线路 ID')])]

},
{
  id: 0x0608, name: '查询区域或线路数据应答', direction: 'up', category: '车辆控制与区域', standard: 'JT/T 808', versions: ONLY_2019,
  desc: '终端返回查询的区域或路线数据。2019 版新增。',
  fields: [
  u8('查询类型', { enum: QUERY_TYPES, example: 1 }),
  u32('数据数量'),
  bytes('区域或线路数据', 'rest', { desc: '按查询类型对应 0x8600 / 0x8602 / 0x8604 / 0x8606 的消息体格式' })]

}];