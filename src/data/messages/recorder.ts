import type { MessageSpec } from '../../types/messageSpec';
import { hexN } from '../../utils/jt808/hex';
import {
  ALL_VERSIONS, ONLY_2019, bcd, bytes, bytesBy, list, location, str, strBy, time, u16, u32, u8 } from
'../../utils/jt808/specHelpers';

const RECORDER_CMDS = {
  0x00: '采集记录仪执行标准版本', 0x01: '采集当前驾驶人信息', 0x02: '采集记录仪实时时间',
  0x03: '采集累计行驶里程', 0x04: '采集记录仪脉冲系数', 0x05: '采集车辆信息', 0x06: '采集状态信号配置信息',
  0x07: '采集记录仪唯一性编号', 0x08: '采集指定的行驶速度记录', 0x09: '采集指定的位置信息记录',
  0x10: '采集指定的事故疑点记录', 0x11: '采集指定的超时驾驶记录', 0x12: '采集指定的驾驶人身份记录',
  0x13: '采集指定的外部供电记录', 0x14: '采集指定的参数修改记录', 0x15: '采集指定的速度状态日志'
};

const RECORDER_SET_CMDS = {
  0x82: '设置车辆信息', 0x83: '设置记录仪初次安装日期', 0x84: '设置状态量配置信息',
  0xc2: '设置记录仪时间', 0xc3: '设置记录仪脉冲系数', 0xc4: '设置初始里程'
};

const MEDIA_TYPE = { 0: '图像', 1: '音频', 2: '视频' };
const MEDIA_FORMAT = { 0: 'JPEG', 1: 'TIF', 2: 'MP3', 3: 'WAV', 4: 'WMV' };
const MEDIA_EVENT = {
  0: '平台下发指令', 1: '定时动作', 2: '抢劫报警触发', 3: '碰撞侧翻报警触发',
  4: '门开拍照', 5: '门关拍照', 6: '车门由开变关且车速超过 20 km/h', 7: '定距拍照'
};
const SAVE_FLAG = { 0: '实时上传', 1: '保存' };
const DELETE_FLAG = { 0: '保留', 1: '删除' };

const PASS_TYPES = {
  0x00: 'GNSS 模块详细定位数据', 0x0b: '道路运输证 IC 卡信息', 0x41: '串口 1 透传', 0x42: '串口 2 透传',
  0xf7: '外设状态信息（粤标）', 0xf8: '外设系统信息（粤标）'
};

const ok0702 = (c: {values: Record<string, number>;}) => c.values['状态'] === 1 && c.values['IC 卡读取结果'] === 0;
const okText = '状态 = 1 且 IC 卡读取结果 = 0';

const rec = { category: '行驶记录与驾驶员', standard: 'JT/T 808' } as const;
const media = { category: '多媒体', standard: 'JT/T 808' } as const;
const pass = { category: '数据透传与加密', standard: 'JT/T 808' } as const;

export const recorderSpecs: MessageSpec[] = [
{
  ...rec, id: 0x8700, name: '行驶记录数据采集命令', direction: 'down', versions: ALL_VERSIONS, replies: [0x0700],
  desc: '平台通过终端采集行驶记录仪（GB/T 19056）数据。',
  fields: [
  u8('命令字', { enum: RECORDER_CMDS }),
  bytes('数据块', 'rest', { example: '', desc: '按 GB/T 19056 要求的完整数据包，可为空' })]

},
{
  ...rec, id: 0x0700, name: '行驶记录数据上传', direction: 'up', versions: ALL_VERSIONS,
  desc: '终端返回行驶记录仪数据。',
  fields: [
  u16('应答流水号', { desc: '对应采集命令的流水号' }),
  u8('命令字', { enum: RECORDER_CMDS }),
  bytes('数据块', 'rest', { desc: '按 GB/T 19056 要求的完整数据包' })]

},
{
  ...rec, id: 0x8701, name: '行驶记录参数下传命令', direction: 'down', versions: ALL_VERSIONS, replies: [0x0001],
  desc: '平台通过终端设置行驶记录仪参数。',
  fields: [u8('命令字', { enum: RECORDER_SET_CMDS, example: 0x82 }), bytes('数据块', 'rest')]
},
{
  ...rec, id: 0x0701, name: '电子运单上报', direction: 'up', versions: ALL_VERSIONS, replies: [0x8001],
  desc: '终端上报电子运单内容。',
  fields: [u32('电子运单长度'), bytesBy('电子运单内容', '电子运单长度')]
},
{
  ...rec, id: 0x0702, name: '驾驶员身份信息采集上报', direction: 'up', versions: ALL_VERSIONS, replies: [0x8001],
  desc: '驾驶员插拔从业资格证 IC 卡时上报身份信息。2019 版增加驾驶员身份证号。',
  fields: [
  u8('状态', { enum: { 1: '从业资格证 IC 卡插入（上班）', 2: '从业资格证 IC 卡拔出（下班）' } }),
  time('时间', { desc: '插卡/拔卡时间，YY-MM-DD-hh-mm-ss' }),
  u8('IC 卡读取结果', {
    when: (c) => c.values['状态'] === 1,
    whenText: '状态 = 1',
    enum: { 0: '读卡成功', 1: '读卡失败：卡片密钥认证未通过', 2: '读卡失败：卡片已被锁定', 3: '读卡失败：卡片被拔出', 4: '读卡失败：数据校验错误' }
  }),
  u8('驾驶员姓名长度', { when: ok0702, whenText: okText }),
  strBy('驾驶员姓名', '驾驶员姓名长度', { enc: 'gbk', when: ok0702, whenText: okText, example: 'Zhang San' }),
  str('从业资格证编码', 20, { when: ok0702, whenText: okText, example: '440300198801010000' }),
  u8('发证机构名称长度', { when: ok0702, whenText: okText }),
  strBy('发证机构名称', '发证机构名称长度', { enc: 'gbk', when: ok0702, whenText: okText, example: 'GD' }),
  bcd('证件有效期', 4, { when: ok0702, whenText: okText, desc: 'YYYYMMDD', example: '20301231' }),
  str('驾驶员身份证号', 20, { versions: ONLY_2019, when: ok0702, whenText: okText, example: '440300198801010000' })]

},
{
  ...rec, id: 0x8702, name: '上报驾驶员身份信息请求', direction: 'down', versions: ALL_VERSIONS, replies: [0x0702],
  desc: '平台请求终端上报当前驾驶员身份信息，消息体为空。',
  fields: []
},
{
  ...rec, id: 0x0705, name: 'CAN 总线数据上传', direction: 'up', versions: ALL_VERSIONS, replies: [0x8001],
  desc: '终端上传采集到的 CAN 总线数据。',
  fields: [
  u16('数据项个数'),
  bcd('CAN 总线数据接收时间', 5, { desc: '第 1 条 CAN 数据的接收时间，hh-mm-ss-msms', example: '1430250500' }),
  list('CAN 总线数据项', '数据项个数', [
  u32('CAN ID', {
    bits: [
    { bit: 0, width: 29, name: 'CAN 总线 ID', render: (v) => hexN(v, 4) },
    { bit: 29, name: '数据采集方式', render: (v) => v ? '采集区间平均值' : '原始数据' },
    { bit: 30, name: '帧类型', render: (v) => v ? '扩展帧' : '标准帧' },
    { bit: 31, name: 'CAN 通道号', render: (v) => v ? 'CAN2' : 'CAN1' }],

    example: 0x18fef100
  }),
  bytes('CAN 数据', 8)]
  )]

}];


export const mediaSpecs: MessageSpec[] = [
{
  ...media, id: 0x0800, name: '多媒体事件信息上传', direction: 'up', versions: ALL_VERSIONS, replies: [0x8001],
  desc: '终端因特定事件拍摄或录制多媒体时，先上报该事件信息。',
  fields: [
  u32('多媒体数据 ID'),
  u8('多媒体类型', { enum: MEDIA_TYPE }),
  u8('多媒体格式编码', { enum: MEDIA_FORMAT }),
  u8('事件项编码', { enum: MEDIA_EVENT }),
  u8('通道 ID')]

},
{
  ...media, id: 0x0801, name: '多媒体数据上传', direction: 'up', versions: ALL_VERSIONS, replies: [0x8800],
  desc: '终端上传多媒体数据，携带拍摄时刻的位置基本信息。',
  fields: [
  u32('多媒体 ID'),
  u8('多媒体类型', { enum: MEDIA_TYPE }),
  u8('多媒体格式编码', { enum: MEDIA_FORMAT }),
  u8('事件项编码', { enum: MEDIA_EVENT }),
  u8('通道 ID'),
  location('位置基本信息', { basic: true, desc: '0x0200 消息体的前 28 字节' }),
  bytes('多媒体数据包', 'rest')]

},
{
  ...media, id: 0x8800, name: '多媒体数据上传应答', direction: 'down', versions: ALL_VERSIONS,
  desc: '平台确认多媒体数据接收情况，列出需要重传的包。',
  fields: [
  u32('多媒体 ID'),
  u8('重传包总数', { desc: '为 0 表示全部收到' }),
  list('重传包 ID 列表', '重传包总数', [u16('重传包 ID')])]

},
{
  ...media, id: 0x8801, name: '摄像头立即拍摄命令', direction: 'down', versions: ALL_VERSIONS, replies: [0x0805],
  desc: '平台要求终端立即拍照或录像。',
  fields: [
  u8('通道 ID', { example: 1 }),
  u16('拍摄命令', { desc: '0 表示停止拍摄；0xFFFF 表示录像；其他表示拍照张数' }),
  u16('拍照间隔/录像时间', { unit: 's', desc: '0 表示按最小间隔拍照或一直录像' }),
  u8('保存标志', { enum: SAVE_FLAG }),
  u8('分辨率', { enum: { 1: '320×240', 2: '640×480', 3: '800×600', 4: '1024×768', 5: '176×144', 6: '352×288', 7: '704×288', 8: '704×576' } }),
  u8('图像/视频质量', { desc: '1–10，1 代表质量损失最小' }),
  u8('亮度', { desc: '0–255' }),
  u8('对比度', { desc: '0–127' }),
  u8('饱和度', { desc: '0–127' }),
  u8('色度', { desc: '0–255' })]

},
{
  ...media, id: 0x0805, name: '摄像头立即拍摄命令应答', direction: 'up', versions: ALL_VERSIONS,
  desc: '终端应答立即拍摄命令，成功时返回拍摄得到的多媒体 ID 列表。',
  fields: [
  u16('应答流水号', { desc: '对应拍摄命令的流水号' }),
  u8('结果', { enum: { 0: '成功', 1: '失败', 2: '通道不支持' } }),
  u16('多媒体 ID 个数', { when: (c) => c.values['结果'] === 0, whenText: '结果 = 0' }),
  list('多媒体 ID 列表', '多媒体 ID 个数', [u32('多媒体 ID')], { when: (c) => c.values['结果'] === 0, whenText: '结果 = 0' })]

},
{
  ...media, id: 0x8802, name: '存储多媒体数据检索', direction: 'down', versions: ALL_VERSIONS, replies: [0x0802],
  desc: '平台检索终端存储的多媒体数据。',
  fields: [
  u8('多媒体类型', { enum: MEDIA_TYPE }),
  u8('通道 ID', { desc: '0 表示检索该媒体类型的所有通道' }),
  u8('事件项编码', { enum: MEDIA_EVENT }),
  time('起始时间'),
  time('结束时间')]

},
{
  ...media, id: 0x0802, name: '存储多媒体数据检索应答', direction: 'up', versions: ALL_VERSIONS,
  desc: '终端返回检索到的多媒体数据列表。',
  fields: [
  u16('应答流水号', { desc: '对应检索消息的流水号' }),
  u16('多媒体数据总项数'),
  list('检索项', '多媒体数据总项数', [
  u32('多媒体 ID'),
  u8('多媒体类型', { enum: MEDIA_TYPE }),
  u8('通道 ID'),
  u8('事件项编码', { enum: MEDIA_EVENT }),
  location('位置基本信息', { basic: true })]
  )]

},
{
  ...media, id: 0x8803, name: '存储多媒体数据上传命令', direction: 'down', versions: ALL_VERSIONS, replies: [0x0001],
  desc: '平台要求终端上传指定条件的已存储多媒体数据。',
  fields: [
  u8('多媒体类型', { enum: MEDIA_TYPE }),
  u8('通道 ID'),
  u8('事件项编码', { enum: MEDIA_EVENT }),
  time('起始时间'),
  time('结束时间'),
  u8('删除标志', { enum: DELETE_FLAG })]

},
{
  ...media, id: 0x8804, name: '录音开始命令', direction: 'down', versions: ALL_VERSIONS, replies: [0x0001],
  desc: '平台控制终端开始或停止录音。',
  fields: [
  u8('录音命令', { enum: { 0: '停止录音', 1: '开始录音' } }),
  u16('录音时间', { unit: 's', desc: '0 表示一直录音' }),
  u8('保存标志', { enum: SAVE_FLAG }),
  u8('音频采样率', { enum: { 0: '8K', 1: '11K', 2: '23K', 3: '32K' } })]

},
{
  ...media, id: 0x8805, name: '单条存储多媒体数据检索上传命令', direction: 'down', versions: ALL_VERSIONS, replies: [0x0001],
  desc: '平台要求终端上传指定 ID 的多媒体数据。',
  fields: [u32('多媒体 ID'), u8('删除标志', { enum: DELETE_FLAG })]
}];


export const transportSpecs: MessageSpec[] = [
{
  ...pass, id: 0x8900, name: '数据下行透传', direction: 'down', versions: ALL_VERSIONS, replies: [0x0001],
  desc: '平台向终端透传数据，透传类型 0xF0–0xFF 为用户自定义。',
  fields: [u8('透传消息类型', { enum: PASS_TYPES, example: 0x41 }), bytes('透传消息内容', 'rest')]
},
{
  ...pass, id: 0x0900, name: '数据上行透传', direction: 'up', versions: ALL_VERSIONS, replies: [0x8001],
  desc: '终端向平台透传数据，如 GNSS 详细定位数据、IC 卡信息、串口数据及粤标主动安全外设信息。',
  fields: [u8('透传消息类型', { enum: PASS_TYPES, example: 0x41 }), bytes('透传消息内容', 'rest')]
},
{
  ...pass, id: 0x0901, name: '数据压缩上报', direction: 'up', versions: ALL_VERSIONS, replies: [0x8001],
  desc: '终端将长数据经 GZIP 压缩后上报。',
  fields: [u32('压缩消息长度'), bytesBy('压缩消息体', '压缩消息长度', { desc: 'GZIP 压缩后的消息体' })]
},
{
  ...pass, id: 0x8a00, name: '平台 RSA 公钥', direction: 'down', versions: ALL_VERSIONS, replies: [0x0a00],
  desc: '平台下发 RSA 公钥，用于终端加密上行数据。',
  fields: [u32('e', { desc: 'RSA 公钥 {e, n} 中的 e', example: 65537 }), bytes('n', 128, { desc: 'RSA 公钥 {e, n} 中的 n' })]
},
{
  ...pass, id: 0x0a00, name: '终端 RSA 公钥', direction: 'up', versions: ALL_VERSIONS, replies: [0x8001],
  desc: '终端上报自身 RSA 公钥，用于平台加密下行数据。',
  fields: [u32('e', { desc: 'RSA 公钥 {e, n} 中的 e', example: 65537 }), bytes('n', 128, { desc: 'RSA 公钥 {e, n} 中的 n' })]
}];