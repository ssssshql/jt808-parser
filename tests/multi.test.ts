import { describe, expect, it } from 'vitest';
import { parseFrame } from '../src/utils/jt808/frame';
import { frameItems, mergeSubpackages, splitFrames } from '../src/utils/jt808/multi';
import { find, frame } from './helpers';

describe('多帧输入', () => {
  it('单帧保持原样', () => {
    const h = frame(0x0002, []);
    expect(splitFrames(h)).toEqual([h]);
  });
  it('按 7E 切分（连写或空格分隔）', () => {
    const a = frame(0x0002, []);
    const b = frame(0x0002, [], { serial: 2 });
    expect(splitFrames(a + b)).toHaveLength(2);
    expect(splitFrames(`${a}\n${b}`)).toHaveLength(2);
  });
});

describe('分包合并', () => {
  // 0x0801 多媒体数据上传分 3 包
  const body = [0, 0, 0, 7, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 2, 0x01, 0x5f, 0x5e, 0x10, 0x06, 0xca, 0x2f, 0x20, 0, 10, 0, 100, 0, 90, 0x26, 0x10, 0x31, 0x17, 0x47, 0x00, ...Array(30).fill(0xab), 0x7e, 0x7d];
  const parts = [body.slice(0, 20), body.slice(20, 50), body.slice(50)];
  const frames = parts.map((p, i) => frame(0x0801, p, { pkg: [3, i + 1], serial: 10 + i }));

  it('包序号齐全时合并，乱序也可以', () => {
    const merged = mergeSubpackages([frames[2], frames[0], frames[1]]);
    expect(merged).toHaveLength(1);
    const r = parseFrame(merged[0].hex, '2013', { mergedFrom: merged[0].mergedFrom });
    if (!r.ok) throw new Error(r.error);
    expect(r.summary.checksum.ok).toBe(true);
    expect(find(r.fields, '多媒体数据包')?.length).toBe(32);
    expect(r.warnings.join()).toContain('由 3 个分包合并');
  });
  it('缺包时不合并', () => {
    expect(mergeSubpackages([frames[0], frames[2]])).toHaveLength(0);
  });
  it('frameItems 把合并结果放在最前', () => {
    const items = frameItems(frames.join(''), () => 'x');
    expect(items).toHaveLength(4);
    expect(items[0].mergedFrom).toBe(3);
  });
});
