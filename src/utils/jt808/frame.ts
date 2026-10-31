import type { Field, ParseOutcome, ProtocolVersion, VersionMode } from '../../types/jt808';
import { MSG_NAMES, SPEC_BY_ID } from '../../data/messages';
import { PROPS_DEFS } from './dictionaries';
import { cleanHex, hex2, hexN, hexToBytes, xorRange } from './hex';
import { parseBody } from './messages';
import { Reader, bitsFrom, errorField, group, makeField, resetFieldIds, timeProblem } from './reader';

export interface ParseOptions {
  /** 由多少个分包合并而成（见 multi.ts），用于调整长度校验提示 */
  mergedFrom?: number;
}

export function parseFrame(input: string, mode: VersionMode, opts: ParseOptions = {}): ParseOutcome {
  const clean = cleanHex(input);
  if (!clean) return { ok: false, error: '请输入或粘贴一条十六进制 JT808 报文' };
  if (clean.length % 2) return { ok: false, error: `十六进制字符数为 ${clean.length}，不是偶数，请检查是否缺失字符` };

  const raw = hexToBytes(clean);
  const warnings: string[] = [];
  let content: Uint8Array;
  if (raw.length >= 2 && raw[0] === 0x7e && raw[raw.length - 1] === 0x7e) {
    content = raw.subarray(1, raw.length - 1);
  } else {
    warnings.push('未检测到完整的首尾 0x7E 标识位，已按缺省标识位处理');
    let s = 0;
    let e = raw.length;
    if (raw[0] === 0x7e) s = 1;
    if (raw[raw.length - 1] === 0x7e) e = raw.length - 1;
    content = raw.subarray(s, e);
  }

  const inner = content.indexOf(0x7e);
  if (inner >= 0) return { ok: false, error: `第 ${inner + 2} 字节处出现未转义的 0x7E，输入可能包含多条报文（多条报文请用 7E 首尾分隔）` };

  const unesc: number[] = [];
  let escapes = 0;
  for (let i = 0; i < content.length; i++) {
    const b = content[i];
    if (b === 0x7d) {
      const n = content[i + 1];
      if (n === 0x02) unesc.push(0x7e);else
      if (n === 0x01) unesc.push(0x7d);else
      return { ok: false, error: `非法转义序列 0x7D ${n === undefined ? '（位于末尾）' : hex2(n)}，0x7D 之后只能是 0x01 或 0x02` };
      escapes++;
      i++;
    } else unesc.push(b);
  }
  if (unesc.length < 13) {
    return { ok: false, error: `反转义后仅 ${unesc.length} 字节，不足消息头 + 校验码的最小长度 13 字节` };
  }

  const bytes = Uint8Array.from([0x7e, ...unesc, 0x7e]);
  const L = bytes.length;
  const csPos = L - 2;
  resetFieldIds();

  const fields: Field[] = [];
  fields.push(
    makeField(bytes, {
      name: '标识位',
      type: 'BYTE',
      offset: 0,
      length: 1,
      value: '0x7E 帧起始',
      section: 'frame',
      steps: [
      '报文以 0x7E 开始并以 0x7E 结束',
      escapes ?
      `检测到 ${escapes} 处转义并已还原：0x7D 0x02 → 0x7E，0x7D 0x01 → 0x7D` :
      '未检测到转义序列（0x7D 0x01 / 0x7D 0x02）',
      `反转义后报文共 ${L} 字节（输入 ${raw.length} 字节），本页所有偏移均基于反转义后的报文`]

    })
  );

  const r = new Reader(bytes, 1, csPos, 'header');
  let msgId = 0;
  let flag = false;
  let declaredLen = 0;
  let enc = 0;
  let subpackage = false;
  let pktIdx = 1;
  let phone = '';
  let serial = 0;

  try {
    const idF = r.uint('消息 ID', 2, (v) => ({
      value: `${hexN(v, 2)} ${MSG_NAMES[v] ?? '未知消息'}`,
      steps: [`查消息 ID 对照表 → ${MSG_NAMES[v] ?? '未收录'}`]
    }));
    msgId = idF.num ?? 0;
    fields.push(idF);

    const propF = r.uint('消息体属性', 2, (v) => {
      const bits = bitsFrom(v, PROPS_DEFS);
      return {
        value: `${bits[0].value} · ${bits[1].value} · ${bits[2].value}${v & 0x4000 ? ' · 2019 版' : ''}`,
        bits,
        steps: [
        `转为二进制 → ${v.toString(2).padStart(16, '0').replace(/(.{4})(?=.)/g, '$1 ')}`,
        `bit0–9 消息体长度 = ${hexN(v, 2)} & 0x03FF = ${v & 0x3ff}`,
        `bit10–12 加密方式 = ${v >> 10 & 7}；bit13 分包 = ${v >> 13 & 1}；bit14 版本标识 = ${v >> 14 & 1}`]

      };
    });
    const pv = propF.num ?? 0;
    declaredLen = pv & 0x3ff;
    enc = pv >> 10 & 7;
    subpackage = (pv >> 13 & 1) === 1;
    flag = (pv >> 14 & 1) === 1;
    fields.push(propF);

    if (flag) {
      fields.push(r.uint('协议版本号', 1, () => ({ steps: ['2019 版新增字段，每次关键修订递增，初始版本为 1'] })));
    }
    const phoneF = r.bcd('终端手机号', flag ? 10 : 6, (d) => {
      const t = d.replace(/^0+/, '') || '0';
      return { value: t, steps: [flag ? '2019 版终端手机号为 BCD[10]（20 位）' : '2011/2013 版终端手机号为 BCD[6]（12 位）', t !== d ? `去除前导 0 → ${t}` : '无前导 0'] };
    });
    phone = phoneF.value;
    fields.push(phoneF);
    const serialF = r.uint('消息流水号', 2, () => ({ steps: ['按发送顺序从 0 开始循环累加'] }));
    serial = serialF.num ?? 0;
    fields.push(serialF);

    if (subpackage) {
      const s = r.pos;
      const total = r.uint('消息总包数', 2);
      const idx = r.uint('包序号', 2, () => ({ steps: ['从 1 开始'] }));
      pktIdx = idx.num ?? 1;
      fields.push(group(bytes, '消息包封装项', s, [total, idx], `第 ${pktIdx} / ${total.num} 包`, 'header'));
    }
  } catch (e) {
    return { ok: false, error: `消息头解析失败：${e instanceof Error ? e.message : String(e)}` };
  }

  let version: ProtocolVersion;
  let versionNote: string;
  const bodyStart = r.pos;
  const bodyLen = csPos - bodyStart;
  if (mode === 'auto') {
    if (flag) {
      version = '2019';
      versionNote = '消息体属性 bit14 版本标识为 1';
    } else if (msgId === 0x0100) {
      version = bodyLen < 37 ? '2011' : '2013';
      versionNote = '依据终端注册消息体长度推断';
    } else if (msgId === 0x0702 || msgId === 0x0801) {
      const at = msgId === 0x0702 ? 1 : 8 + 22;
      const statusOk = msgId !== 0x0702 || bytes[bodyStart] === 1 || bytes[bodyStart] === 2;
      const hasTime = bodyLen >= at + 6 && statusOk && isValidTime(bytes, bodyStart + at);
      version = hasTime ? '2013' : '2011';
      versionNote = msgId === 0x0702 ?
      `依据首字节是否为插/拔卡状态且后跟合法 BCD 时间推断为 ${version}` :
      `依据通道 ID 后是否为合法的 28 字节位置基本信息推断为 ${version}`;
    } else {
      version = '2013';
      versionNote = '版本标识为 0，按 2013 解析（兼容 2011）';
    }
  } else {
    version = mode;
    versionNote = '手动指定';
    if (mode === '2019' && !flag) warnings.push('已指定 2019 版，但未设置版本标识，消息头仍按 2011/2013 结构解析');
    if (mode !== '2019' && flag) warnings.push('报文设置了 2019 版本标识，消息头按 2019 结构解析');
  }

  const spec = SPEC_BY_ID[msgId];
  if (spec && !spec.versions.includes(version)) {
    warnings.push(`${hexN(msgId, 2)} ${spec.name} 在 JT/T 808-${version} 中未定义（适用版本：${spec.versions.join(' / ')}），仍按已知结构尝试解析`);
  }

  if (opts.mergedFrom) warnings.push(`由 ${opts.mergedFrom} 个分包合并：沿用第 1 包消息头，消息体为各包按序拼接，校验码已重新计算`);
  else if (bodyLen !== declaredLen) warnings.push(`消息体属性声明长度 ${declaredLen} 字节，实际为 ${bodyLen} 字节`);

  const br = new Reader(bytes, bodyStart, csPos, 'body');
  if (enc !== 0) {
    fields.push(br.bytes('加密消息体', br.remaining, enc === 1 ? 'RSA 加密数据，无法直接解析' : `加密方式 ${enc} 为保留值，按原始字节显示`));
  } else if (subpackage && pktIdx > 1) {
    fields.push(br.bytes('分包数据', br.remaining, '后续分包数据，需与首包拼接后解析'));
  } else {
    const body: Field[] = [];
    try {
      parseBody(br, msgId, version, body);
      if (br.remaining > 0) body.push(br.bytes('未解析的剩余字节', br.remaining));
    } catch (e) {
      body.push(errorField(bytes, e, csPos, br.section));
      warnings.push(`消息体解析中断：${e instanceof Error ? e.message : String(e)}`);
    }
    fields.push(...body);
  }

  const expected = xorRange(bytes, 1, csPos);
  const actual = bytes[csPos];
  const ok = expected === actual;
  const terms = Array.from(bytes.subarray(1, csPos)).map(hex2);
  const expr = terms.length > 10 ? `${terms.slice(0, 6).join(' ⊕ ')} ⊕ … ⊕ ${terms.slice(-2).join(' ⊕ ')}` : terms.join(' ⊕ ');
  if (!ok) warnings.push(`校验码不一致：报文携带 ${hexN(actual, 1)}，计算结果 ${hexN(expected, 1)}`);
  fields.push(
    makeField(bytes, {
      name: '校验码',
      type: 'BYTE',
      offset: csPos,
      length: 1,
      value: ok ? `${hexN(actual, 1)} 校验通过` : `${hexN(actual, 1)}，应为 ${hexN(expected, 1)}`,
      section: 'frame',
      error: !ok,
      steps: [
      `校验范围：偏移 0x0001 至 ${hexN(csPos - 1)}（消息头 + 消息体），共 ${csPos - 1} 字节`,
      `逐字节异或：${expr}`,
      `计算结果 ${hexN(expected, 1)}，报文携带 ${hexN(actual, 1)} → ${ok ? '校验通过' : '校验失败'}`]

    })
  );
  fields.push(
    makeField(bytes, { name: '标识位', type: 'BYTE', offset: L - 1, length: 1, value: '0x7E 帧结束', section: 'frame', steps: ['帧结束标识'] })
  );

  return {
    ok: true,
    bytes,
    fields,
    warnings,
    summary: {
      msgId,
      msgName: MSG_NAMES[msgId] ?? '未知消息',
      phone,
      serial,
      version,
      versionNote,
      bodyLength: bodyLen,
      checksum: { expected, actual, ok },
      escapes,
      totalBytes: L,
      rawBytes: raw.length
    }
  };
}
function isValidTime(buf: Uint8Array, at: number): boolean {
  let d = '';
  for (let i = 0; i < 6; i++) d += buf[at + i].toString(16).padStart(2, '0');
  return d !== '000000000000' && timeProblem(d) === null;
}
