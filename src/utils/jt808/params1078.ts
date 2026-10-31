import type { Field } from '../../types/jt808';
import { VIDEO_ALARM_DEFS } from './dictionaries';
import { Reader, bitsFrom, group, type BitDef } from './reader';

/** JT/T 1078 表 2–表 7：终端参数 0x0075–0x007C 的结构化解析 */

const ENC_MODE: Record<number, string> = { 0: 'CBR（固定码率）', 1: 'VBR（可变码率）', 2: 'ABR（平均码率）' };
const RESOLUTION: Record<number, string> = { 0: 'QCIF', 1: 'CIF', 2: 'WCIF', 3: 'D1', 4: 'WD1', 5: '720P', 6: '1080P' };
const CH_TYPE: Record<number, string> = { 0: '音视频', 1: '音频', 2: '视频' };
const OSD_DEFS: BitDef[] = ['日期和时间', '车牌号码', '逻辑通道号', '经纬度', '行驶记录速度', '卫星定位速度', '连续驾驶时间'].
map((name, bit) => ({ bit, name }));
const WAKE_MODE: BitDef[] = [{ bit: 0, name: '条件唤醒' }, { bit: 1, name: '定时唤醒' }, { bit: 2, name: '手动唤醒' }];
const WAKE_COND: BitDef[] = [{ bit: 0, name: '紧急报警' }, { bit: 1, name: '碰撞侧翻报警' }, { bit: 2, name: '车辆开门' }];
const WEEK: BitDef[] = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((name, bit) => ({ bit, name }));
const PERIODS: BitDef[] = [1, 2, 3, 4].map((n, bit) => ({ bit, name: `时间段 ${n}` }));

const pick = (t: Record<number, string>) => (v: number) => ({ value: t[v] ?? `保留 (${v})` });
const unit = (u: string) => (v: number) => ({ value: `${v} ${u}` });
const flags = (defs: BitDef[]) => (v: number) => {
  const bits = bitsFrom(v, defs);
  const on = bits.filter((b) => b.active).map((b) => b.name);
  return { value: on.length ? on.join('、') : '无', bits };
};
const hhmm = (d: string) => ({ value: `${d.slice(0, 2)}:${d.slice(2, 4)}` });

function streamParams(r: Reader, out: Field[], withAudio: boolean): void {
  for (const k of ['实时流', '存储流']) {
    out.push(r.uint(`${k}编码模式`, 1, pick(ENC_MODE)));
    out.push(r.uint(`${k}分辨率`, 1, pick(RESOLUTION)));
    out.push(r.uint(`${k}关键帧间隔`, 2, unit('帧')));
    out.push(r.uint(`${k}目标帧率`, 1, unit('帧/s')));
    out.push(r.uint(`${k}目标码率`, 4, unit('kbps')));
  }
  out.push(r.uint('OSD 字幕叠加设置', 2, flags(OSD_DEFS)));
  if (withAudio) out.push(r.uint('是否启用音频输出', 1, (v) => ({ value: v ? '启用' : '不启用' })));
}

/** 返回 null 表示该参数不由此处解析（或长度不符），调用方按原始字节显示 */
export function parse1078Param(id: number, r: Reader): Field[] | null {
  const out: Field[] = [];
  switch (id) {
    case 0x0075:
      if (r.remaining !== 21) return null;
      streamParams(r, out, true);
      return out;
    case 0x0076:{
        if (r.remaining < 3) return null;
        const a = r.uint('音视频通道总数', 1);
        const b = r.uint('音频通道总数', 1);
        const c = r.uint('视频通道总数', 1);
        out.push(a, b, c);
        const n = (a.num ?? 0) + (b.num ?? 0) + (c.num ?? 0);
        if (r.remaining !== n * 4) return null;
        for (let i = 0; i < n; i++) {
          const s = r.pos;
          const kids = [
          r.uint('物理通道号', 1),
          r.uint('逻辑通道号', 1),
          r.uint('通道类型', 1, pick(CH_TYPE)),
          r.uint('是否连接云台', 1, (v) => ({ value: v ? '连接' : '未连接' }))];
          out.push(group(r.buf, `通道对照 ${i + 1}`, s, kids, `逻辑通道 ${kids[1].num} · ${kids[2].value}`, r.section));
        }
        return out;
      }
    case 0x0077:{
        if (r.remaining < 1) return null;
        const n = r.uint('单独设置的通道数量', 1);
        out.push(n);
        if (r.remaining !== (n.num ?? 0) * 21) return null;
        for (let i = 0; i < (n.num ?? 0); i++) {
          const s = r.pos;
          const kids: Field[] = [r.uint('逻辑通道号', 1)];
          streamParams(r, kids, false);
          out.push(group(r.buf, `通道参数 ${i + 1}`, s, kids, `逻辑通道 ${kids[0].num}`, r.section));
        }
        return out;
      }
    case 0x0079:
      if (r.remaining !== 3) return null;
      out.push(r.uint('特殊报警录像存储阈值', 1, unit('%')));
      out.push(r.uint('特殊报警录像持续时间', 1, unit('分钟')));
      out.push(r.uint('特殊报警标识起始时间', 1, (v) => ({ value: `报警前 ${v} 分钟` })));
      return out;
    case 0x007a:
      if (r.remaining !== 4) return null;
      out.push(r.uint('视频相关报警屏蔽字', 4, (v) => ({ ...flags(VIDEO_ALARM_DEFS)(v), steps: ['置 1 表示屏蔽对应报警'] })));
      return out;
    case 0x007b:
      if (r.remaining !== 2) return null;
      out.push(r.uint('车辆核载人数', 1, unit('人')));
      out.push(r.uint('疲劳程度阈值', 1));
      return out;
    case 0x007c:
      if (r.remaining !== 20) return null;
      out.push(r.uint('休眠唤醒模式', 1, flags(WAKE_MODE)));
      out.push(r.uint('唤醒条件类型', 1, flags(WAKE_COND)));
      out.push(r.uint('定时唤醒日设置', 1, flags(WEEK)));
      out.push(r.uint('定时唤醒启用标志', 1, flags(PERIODS)));
      for (let i = 1; i <= 4; i++) {
        out.push(r.bcd(`时间段 ${i} 唤醒时间`, 2, hhmm));
        out.push(r.bcd(`时间段 ${i} 关闭时间`, 2, hhmm));
      }
      return out;
    default:
      return null;
  }
}
