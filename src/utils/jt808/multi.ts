import { MSG_NAMES } from '../../data/messages';
import { bytesToHex, cleanHex, escapeContent, hexN, hexToBytes, xorRange } from './hex';

/** 多帧输入中的一条报文 */
export interface FrameItem {
  /** 显示用标签 */
  label: string;
  /** 交给 parseFrame 的十六进制字符串 */
  hex: string;
  /** 由多少个分包合并而成；普通报文为 undefined */
  mergedFrom?: number;
}

interface PacketInfo {
  msgId: number;
  phone: string;
  total: number;
  idx: number;
  /** 反转义后的完整内容（不含首尾 0x7E 与校验码） */
  content: number[];
  bodyStart: number;
}

/**
 * 按 0x7E 切分输入中的多条报文。
 * 只有一条（或无法切分）时返回原输入，保持单帧解析的错误提示不变。
 */
export function splitFrames(input: string): string[] {
  const clean = cleanHex(input);
  if (!clean || clean.length % 2) return [input];
  const bytes = hexToBytes(clean);
  const segments: Uint8Array[] = [];
  let start = -1;
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] !== 0x7e) continue;
    if (start >= 0 && i > start + 1) segments.push(bytes.subarray(start + 1, i));
    start = i;
  }
  if (segments.length < 2) return [input];
  return segments.map((s) => `7e${bytesToHex(s)}7e`.replace(/\s/g, ''));
}

function unescape(seg: Uint8Array): number[] | null {
  const out: number[] = [];
  for (let i = 0; i < seg.length; i++) {
    if (seg[i] !== 0x7d) {
      out.push(seg[i]);
      continue;
    }
    const n = seg[i + 1];
    if (n === 0x02) out.push(0x7e);else
    if (n === 0x01) out.push(0x7d);else
    return null;
    i++;
  }
  return out;
}

/** 读取分包报文的消息头；非分包或格式不对返回 null */
export function peekPacket(hex: string): PacketInfo | null {
  const bytes = hexToBytes(cleanHex(hex));
  if (bytes.length < 2 || bytes[0] !== 0x7e || bytes[bytes.length - 1] !== 0x7e) return null;
  const un = unescape(bytes.subarray(1, bytes.length - 1));
  if (!un || un.length < 13) return null;
  const content = un.slice(0, -1);
  const props = content[2] << 8 | content[3];
  if (!(props >> 13 & 1)) return null;
  const v2019 = (props >> 14 & 1) === 1;
  const phoneLen = v2019 ? 10 : 6;
  const phoneStart = v2019 ? 5 : 4;
  const pkgAt = phoneStart + phoneLen + 2;
  if (content.length < pkgAt + 4) return null;
  return {
    msgId: content[0] << 8 | content[1],
    phone: bytesToHex(Uint8Array.from(content.slice(phoneStart, phoneStart + phoneLen))).replace(/\s/g, ''),
    total: content[pkgAt] << 8 | content[pkgAt + 1],
    idx: content[pkgAt + 2] << 8 | content[pkgAt + 3],
    content,
    bodyStart: pkgAt + 4
  };
}

/**
 * 把同一消息（相同消息 ID、终端手机号、总包数）的全部分包按包序号拼接，
 * 生成一条可整体解析的报文：沿用首包消息头，消息体为各包消息体顺序拼接，重新计算校验码。
 * 只有包序号 1..N 齐全时才合并。
 */
export function mergeSubpackages(frames: string[]): FrameItem[] {
  const groups = new Map<string, PacketInfo[]>();
  for (const f of frames) {
    const p = peekPacket(f);
    if (!p || p.total < 2) continue;
    const key = `${p.msgId}|${p.phone}|${p.total}`;
    const list = groups.get(key) ?? [];
    list.push(p);
    groups.set(key, list);
  }
  const out: FrameItem[] = [];
  for (const list of groups.values()) {
    const total = list[0].total;
    const byIdx = new Map<number, PacketInfo>();
    for (const p of list) if (!byIdx.has(p.idx)) byIdx.set(p.idx, p);
    let complete = true;
    for (let i = 1; i <= total; i++) if (!byIdx.has(i)) complete = false;
    if (!complete) continue;
    const ordered = Array.from({ length: total }, (_, i) => byIdx.get(i + 1)).filter((p): p is PacketInfo => !!p);
    const [first, ...rest] = ordered;
    const content = [...first.content];
    for (const p of rest) content.push(...p.content.slice(p.bodyStart));
    const buf = Uint8Array.from([0x7e, ...content, 0]);
    const cs = xorRange(buf, 1, buf.length - 1);
    const hex = bytesToHex(Uint8Array.from([0x7e, ...escapeContent([...content, cs]), 0x7e])).replace(/\s/g, '');
    out.push({
      label: `合并 ${hexN(first.msgId, 2)} ${MSG_NAMES[first.msgId] ?? ''}（${total} 包）`.trim(),
      hex,
      mergedFrom: total
    });
  }
  return out;
}

/** 把输入整理成可切换的报文列表：逐条报文 + 可合并的分包组 */
export function frameItems(input: string, describe: (hex: string) => string): FrameItem[] {
  const frames = splitFrames(input);
  if (frames.length < 2) return [{ label: '报文', hex: input }];
  const items: FrameItem[] = frames.map((hex, i) => ({ label: `#${i + 1} ${describe(hex)}`, hex }));
  return [...mergeSubpackages(frames), ...items];
}
