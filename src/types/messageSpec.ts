import type { ProtocolVersion } from './jt808';
import type { BitDef } from '../utils/jt808/reader';

export type Direction = 'up' | 'down';

export type Category =
'通用与终端管理' |
'位置与报警' |
'车辆控制与区域' |
'信息与电话' |
'行驶记录与驾驶员' |
'多媒体' |
'数据透传与加密' |
'主动安全（苏标/粤标）' |
'音视频（JT/T 1078）';

export type Standard = 'JT/T 808' | 'JT/T 1078' | '苏标/粤标主动安全';

export type DocRefKey = 'frame' | 'bits' | 'extras' | 'safety' | 'params';

export interface SpecCtx {
  version: ProtocolVersion;
  values: Record<string, number>;
}

export type SpecLen = number | 'rest' | Partial<Record<ProtocolVersion, number>>;

interface SpecBase {
  name: string;
  desc?: string;
  versions?: ProtocolVersion[];
  when?: (ctx: SpecCtx) => boolean;
  whenText?: string;
  ref?: DocRefKey;
}

export interface UintSpec extends SpecBase {
  kind: 'uint';
  size: 1 | 2 | 4;
  enum?: Record<number, string>;
  bits?: BitDef[];
  unit?: string;
  scale?: number;
  example?: number;
}

export interface BcdSpec extends SpecBase {
  kind: 'bcd';
  size: number;
  time?: boolean;
  example?: string;
}

export interface StrSpec extends SpecBase {
  kind: 'str';
  len?: SpecLen;
  lenRef?: string;
  enc?: 'gbk' | 'ascii';
  example?: string;
}

export interface BytesSpec extends SpecBase {
  kind: 'bytes';
  len?: SpecLen;
  lenRef?: string;
  example?: string;
}

export interface ListSpec extends SpecBase {
  kind: 'list';
  countRef?: string;
  item: SpecField[];
}

export interface LocationSpec extends SpecBase {
  kind: 'location';
  basic?: boolean;
  lenRef?: string;
}

export interface AlarmIdSpec extends SpecBase {
  kind: 'alarmId';
}

export interface ParamsSpec extends SpecBase {
  kind: 'params';
  countRef: string;
}

export type SpecField =
UintSpec |
BcdSpec |
StrSpec |
BytesSpec |
ListSpec |
LocationSpec |
AlarmIdSpec |
ParamsSpec;

export interface MessageSpec {
  id: number;
  name: string;
  direction: Direction;
  category: Category;
  standard: Standard;
  versions: ProtocolVersion[];
  desc: string;
  replies?: number[];
  fields: SpecField[];
  notes?: string[];
}