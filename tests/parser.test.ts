import { describe, expect, it } from 'vitest';
import { samples } from '../src/data/samples';
import { buildSampleFrame } from '../src/utils/jt808/build';
import { parseFrame } from '../src/utils/jt808/frame';
import { timeProblem } from '../src/utils/jt808/reader';
import type { ParseResult } from '../src/types/jt808';
import { LOC, bcdTime, find, frame, hasError } from './helpers';

const ok = (hex: string, mode: Parameters<typeof parseFrame>[1] = 'auto'): ParseResult => {
  const r = parseFrame(hex, mode);
  if (!r.ok) throw new Error(r.error);
  return r;
};

describe('内置样例', () => {
  for (const s of samples) {
    it(`${s.id} 解析无错误且校验通过`, () => {
      const r = ok(buildSampleFrame(s), s.version);
      expect(r.summary.checksum.ok).toBe(true);
      expect(hasError(r.fields)).toBe(false);
      expect(find(r.fields, '未解析的剩余字节')).toBeUndefined();
    });
  }
});

describe('帧结构', () => {
  it('还原转义并校验', () => {
    const r = ok(frame(0x0002, [], { serial: 0x7e7d }));
    expect(r.summary.escapes).toBeGreaterThan(0);
    expect(r.summary.serial).toBe(0x7e7d);
    expect(r.summary.checksum.ok).toBe(true);
  });
  it('校验码错误时标记失败', () => {
    const h = frame(0x0002, []);
    const bad = h.slice(0, -4) + '00' + '7e';
    expect(ok(bad).summary.checksum.ok).toBe(false);
  });
  it('非法转义报错', () => {
    expect(parseFrame('7e00027d0301380013800000017e', 'auto').ok).toBe(false);
  });
});

describe('0x0200 附加信息', () => {
  it('JT/T 1078 视频报警 0x14–0x18', () => {
    const extras = [0x14, 4, 0, 0, 0, 0x21, 0x15, 4, 0, 0, 0, 5, 0x17, 2, 0x10, 0x01, 0x18, 3, 0, 1, 80];
    const r = ok(frame(0x0200, [...LOC, ...extras]));
    expect(find(r.fields, '视频相关报警')?.value).toBe('视频信号丢失报警、异常驾驶行为报警');
    expect(find(r.fields, '视频信号丢失报警状态')?.value).toBe('通道 1、3');
    expect(find(r.fields, '存储器故障报警状态')?.value).toBe('主存储器 1；灾备存储器 1');
    expect(find(r.fields, '疲劳程度')?.value).toBe('80');
  });
  it('非法 BCD 时间被标注', () => {
    const r = ok(frame(0x0200, [...LOC.slice(0, 22), 0x26, 0x13, 0x31, 0x25, 0x61, 0x00]));
    expect(find(r.fields, '时间')?.value).toContain('非法时间');
  });
});

describe('版本差异', () => {
  it('0x0702 自动识别 2013（插卡状态 + 时间）', () => {
    const r = ok(frame(0x0702, [1, ...bcdTime, 0, 2, 0x41, 0x42, ...Array(20).fill(0x30), 2, 0x47, 0x44, 0x20, 0x30, 0x12, 0x31]));
    expect(r.summary.version).toBe('2013');
    expect(find(r.fields, '驾驶员姓名')?.value).toBe('AB');
  });
  it('0x0702 自动识别 2011', () => {
    const r = ok(frame(0x0702, [2, 0x41, 0x42, ...Array(20).fill(0x31), ...Array(40).fill(0x32), 2, 0x47, 0x44]));
    expect(r.summary.version).toBe('2011');
    expect(find(r.fields, '驾驶员姓名')?.value).toBe('AB');
    expect(find(r.fields, '状态')).toBeUndefined();
  });
  it('0x0801 2011 无位置信息，2013 有', () => {
    const r11 = ok(frame(0x0801, [0, 0, 0, 1, 0, 0, 0, 1, 1, 2, 3]));
    expect(r11.summary.version).toBe('2011');
    expect(find(r11.fields, '多媒体数据包')?.length).toBe(3);
    const r13 = ok(frame(0x0801, [0, 0, 0, 1, 0, 0, 0, 1, ...LOC, 9, 9]));
    expect(r13.summary.version).toBe('2013');
    expect(find(r13.fields, '多媒体数据包')?.length).toBe(2);
  });
  it('2013 新增消息在 2011 下给出警告', () => {
    const r = ok(frame(0x8003, [0, 1, 1, 0, 2]), '2011');
    expect(r.warnings.join()).toContain('未定义');
  });
  it('0x9301 云台旋转含速度', () => {
    const r = ok(frame(0x9301, [1, 2, 100]));
    expect(find(r.fields, '速度')?.value).toContain('100');
  });
});

describe('终端参数', () => {
  it('0x0075 按 JT/T 1078 结构展开', () => {
    const p = [0, 0, 0, 0x75, 21, 1, 5, 0, 25, 25, 0, 0, 0x07, 0xd0, 0, 3, 0, 25, 15, 0, 0, 3, 0xe8, 0, 3, 1];
    const r = ok(frame(0x8103, [1, ...p]));
    expect(find(r.fields, '实时流分辨率')?.value).toBe('720P');
    expect(find(r.fields, '实时流目标码率')?.value).toBe('2000 kbps');
    expect(find(r.fields, 'OSD 字幕叠加设置')?.value).toBe('日期和时间、车牌号码');
  });
  it('长度不符时回退为原始字节', () => {
    const r = ok(frame(0x8103, [1, 0, 0, 0, 0x75, 2, 1, 2]));
    expect(find(r.fields, '实时流分辨率')).toBeUndefined();
    expect(hasError(r.fields)).toBe(false);
  });
});

describe('timeProblem', () => {
  it.each([
  ['261031174700', null],
  ['000000000000', null],
  ['260229000000', '日期 29 超出该月 1–28'],
  ['240229000000', null],
  ['261301000000', '月份 13 超出 1–12'],
  ['2610312a0000', '包含非十进制 BCD 数字']])(
    '%s', (d, want) => expect(timeProblem(d)).toBe(want));
});
