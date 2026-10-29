import type { MessageSpec } from '../../types/messageSpec';
import { FILE_TYPES } from '../../utils/jt808/dictionaries';
import { ALL_VERSIONS, BEFORE_2019, ONLY_2019, alarmId, bytes, list, str, strBy, u16, u32, u8 } from '../../utils/jt808/specHelpers';

const base = { category: '主动安全（苏标/粤标）', standard: '苏标/粤标主动安全', versions: ALL_VERSIONS } as const;
const NOTES = ['2011/2013 版按苏标 T/JSATL 12-2017，2019 版按粤标 T/GDRTA 002-2020'];
/** 苏标表 4-25 与粤标表 5-25 的文件类型取值不同 */
const fileType = () => [
u8('文件类型', { enum: FILE_TYPES.su, versions: BEFORE_2019 }),
u8('文件类型', { enum: FILE_TYPES.yue, versions: ONLY_2019 })];
const ALARM_NO_EXAMPLE = 'ALM20261028143025000001';
const FILE_NAME_EXAMPLE = '00_64_6401_0_1.jpg';
const FILE_NAME_DESC = '文件类型_通道号_报警类型_序号_报警编号.后缀';

export const activeSafetySpecs: MessageSpec[] = [
{
  ...base, notes: NOTES, id: 0x9208, name: '报警附件上传指令', direction: 'down', replies: [0x0001, 0x1210],
  desc: '平台收到带附件的主动安全报警后，下发附件服务器地址，要求终端上传报警附件。',
  fields: [
  u8('附件服务器 IP 地址长度'),
  strBy('附件服务器 IP 地址', '附件服务器 IP 地址长度', { example: '192.168.1.100' }),
  u16('附件服务器端口（TCP）', { example: 8080 }),
  u16('附件服务器端口（UDP）', { example: 0 }),
  alarmId(),
  str('报警编号', 32, { desc: '平台给报警分配的唯一编号', example: ALARM_NO_EXAMPLE }),
  bytes('预留', 16)]

},
{
  ...base, notes: NOTES, id: 0x1210, name: '报警附件信息消息', direction: 'up', replies: [0x8001],
  desc: '终端连接附件服务器后，上报本次报警附件的文件列表。',
  fields: [
  str('终端 ID', { '2011': 7, '2013': 7, '2019': 30 }, { example: '1234567' }),
  alarmId(),
  str('报警编号', 32, { example: ALARM_NO_EXAMPLE }),
  u8('信息类型', { enum: { 0: '正常报警文件信息', 1: '补传报警文件信息' } }),
  u8('附件数量'),
  list('附件信息列表', '附件数量', [
  u8('文件名称长度'),
  strBy('文件名称', '文件名称长度', { example: FILE_NAME_EXAMPLE, desc: FILE_NAME_DESC }),
  u32('文件大小', { unit: 'B' })]
  )]

},
{
  ...base, notes: NOTES, id: 0x1211, name: '文件信息上传', direction: 'up', replies: [0x8001],
  desc: '终端在上传每个附件文件前，先发送文件信息。',
  fields: [
  u8('文件名称长度'),
  strBy('文件名称', '文件名称长度', { example: FILE_NAME_EXAMPLE, desc: FILE_NAME_DESC }),
  ...fileType(),
  u32('文件大小', { unit: 'B' })]

},
{
  ...base, notes: NOTES, id: 0x1212, name: '文件上传完成消息', direction: 'up', replies: [0x9212],
  desc: '终端完成一个附件文件的数据上传后发送。',
  fields: [
  u8('文件名称长度'),
  strBy('文件名称', '文件名称长度', { example: FILE_NAME_EXAMPLE, desc: FILE_NAME_DESC }),
  ...fileType(),
  u32('文件大小', { unit: 'B' })]

},
{
  ...base, notes: NOTES, id: 0x9212, name: '文件上传完成消息应答', direction: 'down',
  desc: '附件服务器确认文件接收结果，必要时列出需要补传的数据段。',
  fields: [
  u8('文件名称长度'),
  strBy('文件名称', '文件名称长度', { example: FILE_NAME_EXAMPLE }),
  ...fileType(),
  u8('上传结果', { enum: { 0: '完成', 1: '需要补传' } }),
  u8('补传数据包数量'),
  list('补传数据包列表', '补传数据包数量', [u32('数据偏移量'), u32('数据长度')])]

}];