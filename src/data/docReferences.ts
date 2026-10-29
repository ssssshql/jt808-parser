import type { DocRefKey } from '../types/messageSpec';

export const DOC_REFERENCES: {key: DocRefKey;title: string;desc: string;}[] = [
{ key: 'frame', title: '消息结构与编码', desc: '帧格式、消息头、数据类型、转义规则与校验码' },
{ key: 'bits', title: '报警标志与状态位', desc: '位置信息中 32 位报警标志与状态位的定义' },
{ key: 'extras', title: '位置附加信息', desc: '位置汇报可携带的附加信息项（ID + 长度 + 内容）' },
{ key: 'safety', title: '主动安全附加信息', desc: 'ADAS / DSM / TPMS / BSD 报警结构与附件上传流程' },
{ key: 'params', title: '终端参数', desc: '设置 / 查询终端参数使用的参数 ID 列表' }];