export const hex2 = (n: number): string => (n & 0xff).toString(16).toUpperCase().padStart(2, '0');

export const hexN = (n: number, bytes = 2): string =>
'0x' + (n >>> 0).toString(16).toUpperCase().padStart(bytes * 2, '0');

export const hex4 = (n: number): string => n.toString(16).toUpperCase().padStart(4, '0');

export function bytesToHex(buf: Uint8Array, start = 0, end = buf.length): string {
  const out: string[] = [];
  for (let i = start; i < end; i++) out.push(hex2(buf[i]));
  return out.join(' ');
}

export function cleanHex(input: string): string {
  return input.replace(/0x/gi, '').replace(/[^0-9a-fA-F]/g, '').toUpperCase();
}

export function hexToBytes(clean: string): Uint8Array {
  const out = new Uint8Array(Math.floor(clean.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.substr(i * 2, 2), 16);
  return out;
}

export function formatHex(input: string): string {
  return (cleanHex(input).match(/.{1,2}/g) ?? []).join(' ');
}

export function xorRange(buf: Uint8Array, start: number, end: number): number {
  let x = 0;
  for (let i = start; i < end; i++) x ^= buf[i];
  return x;
}

export function escapeContent(content: number[]): number[] {
  const out: number[] = [];
  content.forEach((b) => {
    if (b === 0x7e) out.push(0x7d, 0x02);else
    if (b === 0x7d) out.push(0x7d, 0x01);else
    out.push(b);
  });
  return out;
}

const decoders: Partial<Record<'gbk' | 'ascii', TextDecoder>> = {};

export function decodeText(bytes: Uint8Array, enc: 'gbk' | 'ascii'): string {
  try {
    const d = decoders[enc] ?? (decoders[enc] = new TextDecoder(enc === 'gbk' ? 'gbk' : 'ascii'));
    return d.decode(bytes);
  } catch {
    return Array.from(bytes).
    map((b) => b >= 32 && b < 127 ? String.fromCharCode(b) : '.').
    join('');
  }
}

export function formatSize(v: number): string {
  if (v < 1024) return `${v} B`;
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`;
  return `${(v / 1024 / 1024).toFixed(2)} MB`;
}