import type { Field, ProtocolVersion } from '../../types/jt808';
import { MSG_NAMES, SPEC_BY_ID } from '../../data/messages';
import {
  FILE_TYPES, PLATE_COLORS, PLATFORM_RESULT, PROVINCES, REGISTER_RESULT, TERMINAL_RESULT } from
'./dictionaries';
import { parseBySpec } from './specParser';
import { formatSize, hexN } from './hex';
import { parseLocation } from './location';
import { Reader, errorField, group } from './reader';
import { parseAlarmIdentifier } from './safety';

export function parseBody(r: Reader, msgId: number, version: ProtocolVersion, out: Field[]): void {
  const termLen = version === '2019' ? 30 : 7;
  switch (msgId) {
    case 0x0001:
    case 0x8001:{
        const table = msgId === 0x8001 ? PLATFORM_RESULT : TERMINAL_RESULT;
        out.push(r.uint('应答流水号', 2, () => ({ steps: ['对应被应答消息的流水号'] })));
        out.push(r.uint('应答 ID', 2, (v) => ({ value: `${hexN(v, 2)} ${MSG_NAMES[v] ?? '未知消息'}` })));
        out.push(r.uint('结果', 1, (v) => ({ value: table[v] ?? `未知 (${v})` })));
        return;
      }
    case 0x0100:
      parseRegister(r, version, out);
      return;
    case 0x8100:{
        out.push(r.uint('应答流水号', 2));
        const res = r.uint('结果', 1, (v) => ({ value: REGISTER_RESULT[v] ?? `未知 (${v})` }));
        out.push(res);
        if (res.num === 0 && r.remaining > 0) out.push(r.str('鉴权码', r.remaining));
        return;
      }
    case 0x0102:{
        if (version === '2019') {
          const l = r.uint('鉴权码长度', 1, (v) => ({ value: `${v} 字节` }));
          out.push(l);
          out.push(r.str('鉴权码', l.num ?? 0));
          out.push(r.str('终端 IMEI', 15));
          out.push(r.str('软件版本号', 20));
        } else {
          out.push(r.str('鉴权码', r.remaining));
        }
        return;
      }
    case 0x0200:
      parseLocation(r, version, out);
      return;
    case 0x0201:
      out.push(r.uint('应答流水号', 2));
      parseLocation(r, version, out);
      return;
    case 0x0704:
      parseBatch(r, version, out);
      return;
    case 0x9208:{
        const l = r.uint('服务器 IP 长度', 1, (v) => ({ value: `${v} 字节` }));
        out.push(l);
        out.push(r.str('服务器 IP 地址', l.num ?? 0));
        out.push(r.uint('TCP 端口', 2));
        out.push(r.uint('UDP 端口', 2));
        out.push(parseAlarmIdentifier(r, version, false, termLen));
        out.push(r.str('报警编号', 32));
        out.push(r.bytes('预留', 16, '16 字节保留'));
        return;
      }
    case 0x1210:{
        out.push(r.str('终端 ID', termLen));
        out.push(parseAlarmIdentifier(r, version, false, termLen));
        out.push(r.str('报警编号', 32));
        out.push(r.uint('信息类型', 1, (v) => ({ value: v === 0 ? '正常报警文件信息' : v === 1 ? '补传报警文件信息' : `未知 (${v})` })));
        const cnt = r.uint('附件数量', 1, (v) => ({ value: `${v} 个` }));
        out.push(cnt);
        for (let i = 0; i < (cnt.num ?? 0); i++) {
          const s = r.pos;
          const nl = r.uint('文件名称长度', 1, (v) => ({ value: `${v} 字节` }));
          const nm = r.str('文件名称', nl.num ?? 0);
          const sz = r.uint('文件大小', 4, (v) => ({ value: formatSize(v), steps: [`${v} 字节 → ${formatSize(v)}`] }));
          out.push(group(r.buf, `附件 ${i + 1}`, s, [nl, nm, sz], `${nm.value} · ${sz.value}`, r.section));
        }
        return;
      }
    case 0x1211:
    case 0x1212:{
        const nl = r.uint('文件名称长度', 1, (v) => ({ value: `${v} 字节` }));
        out.push(nl);
        out.push(r.str('文件名称', nl.num ?? 0));
        out.push(r.uint('文件类型', 1, (v) => ({ value: FILE_TYPES[v] ?? `未知 (${v})` })));
        out.push(r.uint('文件大小', 4, (v) => ({ value: formatSize(v) })));
        return;
      }
    default:{
        const spec = SPEC_BY_ID[msgId];
        if (spec) {
          parseBySpec(r, spec, version, out);
          return;
        }
        if (r.remaining > 0) {
          out.push(r.bytes('消息体', r.remaining, `${r.remaining} 字节（未收录的消息 ID，按原始字节显示）`));
        }
      }
  }
}

function parseRegister(r: Reader, version: ProtocolVersion, out: Field[]): void {
  out.push(r.uint('省域 ID', 2, (v) => ({ value: `${v}${PROVINCES[v] ? ` ${PROVINCES[v]}` : ''}`, steps: ['GB/T 2260 行政区划代码前两位'] })));
  out.push(r.uint('市县域 ID', 2, () => ({ steps: ['GB/T 2260 行政区划代码后四位'] })));
  const [m, mo, id] = version === '2019' ? [11, 30, 30] : version === '2013' ? [5, 20, 7] : [5, 8, 7];
  out.push(r.str('制造商 ID', m));
  out.push(r.str('终端型号', mo));
  out.push(r.str('终端 ID', id));
  const color = r.uint('车牌颜色', 1, (v) => ({
    value: PLATE_COLORS[v] ?? `其他 (${v})`,
    steps: [`JT/T 808-${version} 终端注册：制造商 ${m} 字节，型号 ${mo} 字节，终端 ID ${id} 字节`]
  }));
  out.push(color);
  if (r.remaining > 0) {
    out.push(color.num === 0 ? r.str('车辆识别码 VIN', r.remaining) : r.str('车牌号', r.remaining, 'gbk'));
  }
}

function parseBatch(r: Reader, version: ProtocolVersion, out: Field[]): void {
  const cnt = r.uint('数据项个数', 2, (v) => ({ value: `${v} 条` }));
  out.push(cnt);
  out.push(r.uint('位置数据类型', 1, (v) => ({ value: v === 0 ? '正常位置批量汇报' : v === 1 ? '盲区补报' : `未知 (${v})` })));
  for (let i = 0; i < (cnt.num ?? 0); i++) {
    const s = r.pos;
    const lenF = r.uint('数据体长度', 2, (v) => ({ value: `${v} 字节` }));
    const sub = r.sub(`位置数据 ${i + 1}`, lenF.num ?? 0);
    const inner: Field[] = [];
    try {
      parseLocation(sub, version, inner);
    } catch (e) {
      inner.push(errorField(r.buf, e, sub.end, sub.section));
    }
    const time = inner.find((f) => f.name === '时间')?.value ?? '';
    const speed = inner.find((f) => f.name === '速度')?.value ?? '';
    out.push(group(r.buf, `位置数据 ${i + 1}`, s, [lenF, ...inner], `${time} · ${speed}`, 'body'));
  }
}