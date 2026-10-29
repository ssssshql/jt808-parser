import type { Sample } from '../../types/jt808';
import { bytesToHex, cleanHex, escapeContent, hexToBytes } from './hex';

export function buildSampleFrame(s: Sample): string {
  const body = Array.from(hexToBytes(cleanHex(s.body)));
  const is2019 = s.version === '2019';
  const props = body.length & 0x3ff | (is2019 ? 0x4000 : 0);
  const phone = Array.from(hexToBytes(s.phone.padStart(is2019 ? 20 : 12, '0')));
  const content = [
  s.msgId >> 8, s.msgId & 0xff, props >> 8, props & 0xff,
  ...(is2019 ? [1] : []), ...phone, s.serial >> 8 & 0xff, s.serial & 0xff, ...body];

  const cs = content.reduce((a, b) => a ^ b, 0);
  return bytesToHex(Uint8Array.from([0x7e, ...escapeContent([...content, cs]), 0x7e]));
}