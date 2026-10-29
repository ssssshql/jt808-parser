import type { MessageSpec, SpecField } from '../../types/messageSpec';
import { ALL_VERSIONS, bytes, list, strBy, time, u16, u32, u8 } from '../../utils/jt808/specHelpers';

const base = { category: '音视频（JT/T 1078）', standard: 'JT/T 1078', versions: ALL_VERSIONS } as const;

const CODECS: Record<number, string> = {
  1: 'G.721', 2: 'G.722', 3: 'G.723', 4: 'G.728', 5: 'G.729', 6: 'G.711A', 7: 'G.711U', 8: 'G.726',
  9: 'G.729A', 10: 'DVI4_3', 11: 'DVI4_4', 12: 'DVI4_8K', 13: 'DVI4_16K', 14: 'LPC', 15: 'S16BE_STEREO',
  16: 'S16BE_MONO', 17: 'MPEGAUDIO', 18: 'LPCM', 19: 'AAC', 20: 'WMA9STD', 21: 'HEAAC', 22: 'PCM_VOICE',
  23: 'PCM_AUDIO', 24: 'AACLC', 25: 'MP3', 26: 'ADPCMA', 27: 'MP4AUDIO', 28: 'AMR', 91: '透传',
  98: 'H.264', 99: 'H.265', 100: 'AVS', 101: 'SVAC'
};

const RES_TYPE = { 0: '音视频', 1: '音频', 2: '视频', 3: '视频或音视频' };
const STREAM_ANY = { 0: '所有码流', 1: '主码流', 2: '子码流' };
const STORAGE = { 0: '所有存储器', 1: '主存储器', 2: '灾备存储器' };
const SPEED = { 0: '无效', 1: '1 倍', 2: '2 倍', 3: '4 倍', 4: '8 倍', 5: '16 倍' };
const BIG_SMALL = { 0: '调大', 1: '调小' };
const START_STOP = { 0: '停止', 1: '启动' };

const server = (): SpecField[] => [
u8('服务器 IP 地址长度'),
strBy('服务器 IP 地址', '服务器 IP 地址长度', { example: '192.168.1.100' }),
u16('服务器音视频通道监听端口号（TCP）', { example: 1078 }),
u16('服务器音视频通道监听端口号（UDP）', { example: 0 })];


const ALARM_FLAG = bytes('报警标志', 8, { desc: 'bit0–31 为 JT/T 808 报警标志，bit32–63 为 JT/T 1078 视频报警标志；全 0 表示不以报警为检索条件' });

const ptz = (id: number, name: string, field: SpecField, desc: string): MessageSpec => ({
  ...base, id, name, direction: 'down', replies: [0x0001], desc,
  fields: [u8('逻辑通道号', { example: 1 }), field]
});

export const av1078Specs: MessageSpec[] = [
{
  ...base, id: 0x9003, name: '查询终端音视频属性', direction: 'down', replies: [0x1003],
  desc: '平台查询终端支持的音视频能力，消息体为空。',
  fields: []
},
{
  ...base, id: 0x1003, name: '终端上传音视频属性', direction: 'up',
  desc: '终端返回音视频编码、通道数量等属性。',
  fields: [
  u8('输入音频编码方式', { enum: CODECS, example: 6 }),
  u8('输入音频声道数'),
  u8('输入音频采样率', { enum: { 0: '8 kHz', 1: '22.05 kHz', 2: '44.1 kHz', 3: '48 kHz' } }),
  u8('输入音频采样位数', { enum: { 0: '8 位', 1: '16 位', 2: '32 位' } }),
  u16('音频帧长度', { example: 320 }),
  u8('是否支持音频输出', { enum: { 0: '不支持', 1: '支持' } }),
  u8('视频编码方式', { enum: CODECS, example: 98 }),
  u8('终端支持的最大音频物理通道数量'),
  u8('终端支持的最大视频物理通道数量', { example: 4 })]

},
{
  ...base, id: 0x1005, name: '终端上传乘客流量', direction: 'up', replies: [0x8001],
  desc: '终端上报指定时段内的上下车人数。',
  fields: [time('起始时间'), time('结束时间'), u16('上车人数'), u16('下车人数')]
},
{
  ...base, id: 0x9101, name: '实时音视频传输请求', direction: 'down', replies: [0x0001],
  desc: '平台请求终端向指定服务器推送实时音视频流。',
  fields: [
  ...server(),
  u8('逻辑通道号', { example: 1 }),
  u8('数据类型', { enum: { 0: '音视频', 1: '视频', 2: '双向对讲', 3: '监听', 4: '中心广播', 5: '透传' } }),
  u8('码流类型', { enum: { 0: '主码流', 1: '子码流' } })]

},
{
  ...base, id: 0x9102, name: '音视频实时传输控制', direction: 'down', replies: [0x0001],
  desc: '平台控制实时音视频传输：关闭、切换码流、暂停、恢复。',
  fields: [
  u8('逻辑通道号', { example: 1 }),
  u8('控制指令', { enum: { 0: '关闭音视频传输', 1: '切换码流', 2: '暂停该通道所有流的发送', 3: '恢复暂停前流的发送', 4: '关闭双向对讲' } }),
  u8('关闭音视频类型', { enum: { 0: '关闭该通道所有音视频', 1: '只关闭音频，保留视频', 2: '只关闭视频，保留音频' } }),
  u8('切换码流类型', { enum: { 0: '主码流', 1: '子码流' } })]

},
{
  ...base, id: 0x9105, name: '实时音视频传输状态通知', direction: 'down', replies: [0x0001],
  desc: '平台通知终端当前实时流的丢包率。',
  fields: [u8('逻辑通道号', { example: 1 }), u8('丢包率', { unit: '%' })]
},
{
  ...base, id: 0x9201, name: '平台下发远程录像回放请求', direction: 'down', replies: [0x1205],
  desc: '平台请求终端回放存储的录像并推送到指定服务器。',
  fields: [
  ...server(),
  u8('逻辑通道号', { example: 1 }),
  u8('音视频类型', { enum: RES_TYPE }),
  u8('码流类型', { enum: STREAM_ANY }),
  u8('存储器类型', { enum: STORAGE }),
  u8('回放方式', { enum: { 0: '正常回放', 1: '快进回放', 2: '关键帧快退回放', 3: '关键帧播放', 4: '单帧上传' } }),
  u8('快进或快退倍数', { enum: SPEED }),
  time('开始时间'),
  time('结束时间', { desc: '为 0 表示一直回放' })]

},
{
  ...base, id: 0x9202, name: '平台下发远程录像回放控制', direction: 'down', replies: [0x0001],
  desc: '平台控制录像回放：暂停、结束、快进、拖动等。',
  fields: [
  u8('音视频通道号', { example: 1 }),
  u8('回放控制', { enum: { 0: '开始回放', 1: '暂停回放', 2: '结束回放', 3: '快进回放', 4: '关键帧快退回放', 5: '拖动回放', 6: '关键帧播放' } }),
  u8('快进或快退倍数', { enum: SPEED }),
  time('拖动回放位置', { desc: '回放控制为 5 时有效' })]

},
{
  ...base, id: 0x9205, name: '查询资源列表', direction: 'down', replies: [0x1205],
  desc: '平台查询终端存储的音视频资源列表。',
  fields: [
  u8('逻辑通道号', { desc: '0 表示所有通道' }),
  time('开始时间'),
  time('结束时间'),
  ALARM_FLAG,
  u8('音视频资源类型', { enum: RES_TYPE }),
  u8('码流类型', { enum: STREAM_ANY }),
  u8('存储器类型', { enum: STORAGE })]

},
{
  ...base, id: 0x1205, name: '终端上传音视频资源列表', direction: 'up',
  desc: '终端返回符合查询条件的音视频资源列表。',
  fields: [
  u16('流水号', { desc: '对应查询资源列表消息的流水号' }),
  u32('音视频资源总数'),
  list('音视频资源列表', '音视频资源总数', [
  u8('逻辑通道号', { example: 1 }),
  time('开始时间'),
  time('结束时间'),
  ALARM_FLAG,
  u8('音视频资源类型', { enum: RES_TYPE }),
  u8('码流类型', { enum: { 1: '主码流', 2: '子码流' } }),
  u8('存储器类型', { enum: { 1: '主存储器', 2: '灾备存储器' } }),
  u32('文件大小', { unit: 'B' })]
  )]

},
{
  ...base, id: 0x9206, name: '文件上传指令', direction: 'down', replies: [0x0001, 0x1206],
  desc: '平台要求终端通过 FTP 上传指定的音视频文件。',
  fields: [
  u8('服务器地址长度'),
  strBy('服务器地址', '服务器地址长度', { example: 'ftp.example.com' }),
  u16('端口', { example: 21 }),
  u8('用户名长度'),
  strBy('用户名', '用户名长度', { example: 'user' }),
  u8('密码长度'),
  strBy('密码', '密码长度', { example: 'pass' }),
  u8('文件上传路径长度'),
  strBy('文件上传路径', '文件上传路径长度', { example: '/upload' }),
  u8('逻辑通道号', { example: 1 }),
  time('开始时间'),
  time('结束时间'),
  ALARM_FLAG,
  u8('音视频资源类型', { enum: RES_TYPE }),
  u8('码流类型', { enum: STREAM_ANY }),
  u8('存储位置', { enum: STORAGE }),
  u8('任务执行条件', {
    bits: [
    { bit: 0, name: 'WIFI 下可下载' },
    { bit: 1, name: 'LAN 连接时可下载' },
    { bit: 2, name: '3G/4G 连接时可下载' }],

    example: 7
  })]

},
{
  ...base, id: 0x1206, name: '文件上传完成通知', direction: 'up', replies: [0x8001],
  desc: '终端完成文件上传指令后通知平台结果。',
  fields: [u16('应答流水号', { desc: '对应文件上传指令的流水号' }), u8('结果', { enum: { 0: '成功', 1: '失败' } })]
},
{
  ...base, id: 0x9207, name: '文件上传控制', direction: 'down', replies: [0x0001],
  desc: '平台暂停、继续或取消正在进行的文件上传。',
  fields: [u16('应答流水号', { desc: '对应文件上传指令的流水号' }), u8('上传控制', { enum: { 0: '暂停', 1: '继续', 2: '取消' } })]
},
ptz(0x9301, '云台旋转', u8('方向', { enum: { 0: '停止', 1: '上', 2: '下', 3: '左', 4: '右' } }), '平台控制云台向指定方向旋转。'),
ptz(0x9302, '云台调整焦距控制', u8('焦距调整方向', { enum: { 0: '焦距调大', 1: '焦距调小' } }), '平台调整云台摄像头焦距。'),
ptz(0x9303, '云台调整光圈控制', u8('光圈调整方式', { enum: BIG_SMALL }), '平台调整云台摄像头光圈。'),
ptz(0x9304, '云台雨刷控制', u8('启停标识', { enum: START_STOP }), '平台控制云台雨刷启停。'),
ptz(0x9305, '红外补光控制', u8('启停标识', { enum: START_STOP }), '平台控制红外补光灯启停。'),
ptz(0x9306, '云台变倍控制', u8('变倍控制', { enum: BIG_SMALL }), '平台控制云台摄像头变倍。')];