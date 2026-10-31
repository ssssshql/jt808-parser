import type { MessageSpec } from '../../types/messageSpec';
import { ALL_VERSIONS, BEFORE_2019, ONLY_2019, list, str, strBy, u16, u8 } from '../../utils/jt808/specHelpers';

const base = { category: '信息与电话', standard: 'JT/T 808' } as const;

export const infoSpecs: MessageSpec[] = [
{
  ...base, id: 0x8300, name: '文本信息下发', direction: 'down', versions: ALL_VERSIONS, replies: [0x0001],
  desc: '平台向终端下发文本信息，可指定显示、TTS 播读等方式。2019 版增加文本类型。',
  fields: [
  u8('标志', {
    versions: BEFORE_2019,
    bits: [
    { bit: 0, name: '紧急' },
    { bit: 2, name: '终端显示器显示' },
    { bit: 3, name: '终端 TTS 播读' },
    { bit: 4, name: '广告屏显示' },
    { bit: 5, name: '信息类型', render: (v) => v ? 'CAN 故障码信息' : '中心导航信息' }],

    example: 12
  }),
  u8('标志', {
    versions: ONLY_2019,
    desc: '2019 版 bit0–1 为文本信息等级，bit4 保留',
    bits: [
    { bit: 0, width: 2, name: '文本等级', render: (v) => ({ 1: '服务', 2: '紧急', 3: '通知' } as Record<number, string>)[v] ?? '保留' },
    { bit: 2, name: '终端显示器显示' },
    { bit: 3, name: '终端 TTS 播读' },
    { bit: 5, name: '信息类型', render: (v) => v ? 'CAN 故障码信息' : '中心导航信息' }],

    example: 13
  }),
  u8('文本类型', { versions: ONLY_2019, enum: { 1: '通知', 2: '服务' } }),
  str('文本信息', 'rest', { enc: 'gbk', example: 'Hello', desc: '最长 1024 字节' })]

},
{
  ...base, id: 0x8301, name: '事件设置', direction: 'down', versions: BEFORE_2019, replies: [0x0001],
  desc: '平台设置终端事件列表，驾驶员可通过终端上报事件。2019 版已删除。',
  fields: [
  u8('设置类型', { enum: { 0: '删除终端现有所有事件', 1: '更新事件', 2: '追加事件', 3: '修改事件', 4: '删除特定几项事件' } }),
  u8('设置总数'),
  list('事件项列表', '设置总数', [
  u8('事件 ID', { desc: '若已有相同 ID 的事件则被覆盖' }),
  u8('事件内容长度'),
  strBy('事件内容', '事件内容长度', { enc: 'gbk', example: 'EVENT' })]
  )]

},
{
  ...base, id: 0x0301, name: '事件报告', direction: 'up', versions: BEFORE_2019, replies: [0x8001],
  desc: '驾驶员在终端上选择事件后上报。2019 版已删除。',
  fields: [u8('事件 ID')]
},
{
  ...base, id: 0x8302, name: '提问下发', direction: 'down', versions: BEFORE_2019, replies: [0x0302],
  desc: '平台向驾驶员提问，附带候选答案。2019 版已删除。',
  fields: [
  u8('标志', { bits: [{ bit: 0, name: '紧急' }, { bit: 3, name: '终端 TTS 播读' }, { bit: 4, name: '广告屏显示' }] }),
  u8('问题内容长度'),
  strBy('问题文本', '问题内容长度', { enc: 'gbk', example: 'OK?' }),
  list('候选答案列表', undefined, [
  u8('答案 ID'),
  u16('答案内容长度'),
  strBy('答案内容', '答案内容长度', { enc: 'gbk', example: 'YES' })]
  )]

},
{
  ...base, id: 0x0302, name: '提问应答', direction: 'up', versions: BEFORE_2019,
  desc: '驾驶员回答平台提问。2019 版已删除。',
  fields: [u16('应答流水号', { desc: '对应提问下发消息的流水号' }), u8('答案 ID')]
},
{
  ...base, id: 0x8303, name: '信息点播菜单设置', direction: 'down', versions: BEFORE_2019, replies: [0x0001],
  desc: '平台设置终端的信息点播菜单。2019 版已删除。',
  fields: [
  u8('设置类型', { enum: { 0: '删除终端全部信息项', 1: '更新菜单', 2: '追加菜单', 3: '修改菜单' } }),
  u8('信息项总数'),
  list('信息项列表', '信息项总数', [
  u8('信息类型'),
  u16('信息名称长度'),
  strBy('信息名称', '信息名称长度', { enc: 'gbk', example: 'NEWS' })]
  )]

},
{
  ...base, id: 0x0303, name: '信息点播/取消', direction: 'up', versions: BEFORE_2019, replies: [0x8001],
  desc: '驾驶员点播或取消点播信息。2019 版已删除。',
  fields: [u8('信息类型'), u8('点播/取消标志', { enum: { 0: '取消', 1: '点播' } })]
},
{
  ...base, id: 0x8304, name: '信息服务', direction: 'down', versions: BEFORE_2019, replies: [0x0001],
  desc: '平台按点播的信息类型推送信息内容。2019 版已删除。',
  fields: [u8('信息类型'), u16('信息长度'), strBy('信息内容', '信息长度', { enc: 'gbk', example: 'INFO' })]
},
{
  ...base, id: 0x8400, name: '电话回拨', direction: 'down', versions: ALL_VERSIONS, replies: [0x0001],
  desc: '平台要求终端拨打指定电话，可用于普通通话或监听。',
  fields: [
  u8('标志', { enum: { 0: '普通通话', 1: '监听' } }),
  str('电话号码', 'rest', { example: '13800138000', desc: '最长 20 字节' })]

},
{
  ...base, id: 0x8401, name: '设置电话本', direction: 'down', versions: ALL_VERSIONS, replies: [0x0001],
  desc: '平台设置终端电话本，可限定呼入/呼出。',
  fields: [
  u8('设置类型', { enum: { 0: '删除终端上所有联系人', 1: '更新电话本', 2: '追加电话本', 3: '修改电话本（以联系人为索引）' } }),
  u8('联系人总数'),
  list('联系人项', '联系人总数', [
  u8('标志', { enum: { 1: '呼入', 2: '呼出', 3: '呼入/呼出' } }),
  u8('号码长度'),
  strBy('电话号码', '号码长度', { example: '13800138000' }),
  u8('联系人长度'),
  strBy('联系人', '联系人长度', { enc: 'gbk', example: 'Zhang' })]
  )]

}];