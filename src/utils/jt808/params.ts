import type { Field } from '../../types/jt808';
import { TERMINAL_PARAMS, type TerminalParam } from '../../data/terminalParams';
import { hexN } from './hex';
import { parse1078Param } from './params1078';
import { Reader, group } from './reader';

const PARAM_BY_ID: Record<number, TerminalParam> = Object.fromEntries(TERMINAL_PARAMS.map((p) => [p.id, p]));
const SIZES: Record<string, 1 | 2 | 4> = { BYTE: 1, WORD: 2, DWORD: 4 };

export function parseParams(r: Reader, count: number): Field[] {
  const items: Field[] = [];
  for (let i = 0; i < count; i++) {
    const s = r.pos;
    const idF = r.uint('参数 ID', 4, (v) => ({
      value: `${hexN(v, 2)} ${PARAM_BY_ID[v]?.name ?? '未定义参数'}`,
      steps: [`查终端参数表 → ${PARAM_BY_ID[v]?.name ?? '未收录（可能为厂商自定义）'}`]
    }));
    const lenF = r.uint('参数长度', 1, (v) => ({ value: `${v} 字节` }));
    const def = PARAM_BY_ID[idF.num ?? 0];
    const len = lenF.num ?? 0;
    let valF: Field;
    const size = def ? SIZES[def.type] : undefined;
    const id = idF.num ?? 0;
    const structured = id >= 0x0075 && id <= 0x007c ? try1078(r, id, len) : null;
    if (structured) {
      valF = structured;
    } else if (def && size && size === len) {
      valF = r.uint('参数值', size, (v) => ({ value: def.unit ? `${v} ${def.unit}` : String(v), steps: [`参数类型 ${def.type}`] }));
    } else if (def?.type === 'STRING') {
      valF = r.str('参数值', len, 'gbk');
    } else {
      valF = r.bytes('参数值', len, undefined, [def ? `参数类型 ${def.type}` : '未知参数，按原始字节显示']);
    }
    items.push(group(r.buf, `${hexN(idF.num ?? 0, 2)} ${def?.name ?? '未定义参数'}`, s, [idF, lenF, valF], valF.value, r.section));
  }
  return items;
}
function try1078(r: Reader, id: number, len: number): Field | null {
  if (r.remaining < len) return null;
  const start = r.pos;
  const sub = new Reader(r.buf, start, start + len, r.section);
  let kids: Field[] | null = null;
  try {
    kids = parse1078Param(id, sub);
  } catch {
    kids = null;
  }
  if (!kids || sub.remaining !== 0) return null;
  r.pos = start + len;
  const out = group(r.buf, '参数值', start, kids, `${len} 字节（按 JT/T 1078 结构解析）`, r.section);
  out.length = len;
  return out;
}
