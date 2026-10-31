import type { ProtocolVersion } from '../../types/jt808';
import type {
  AlarmIdSpec, BcdSpec, BytesSpec, ListSpec, LocationSpec, ParamsSpec, SpecCtx, SpecField, SpecLen, StrSpec, UintSpec } from
'../../types/messageSpec';

export const ALL_VERSIONS: ProtocolVersion[] = ['2011', '2013', '2019'];
export const ONLY_2019: ProtocolVersion[] = ['2019'];
export const BEFORE_2019: ProtocolVersion[] = ['2011', '2013'];
export const ONLY_2011: ProtocolVersion[] = ['2011'];
export const SINCE_2013: ProtocolVersion[] = ['2013', '2019'];

type UintOpts = Partial<Omit<UintSpec, 'kind' | 'name' | 'size'>>;
type BcdOpts = Partial<Omit<BcdSpec, 'kind' | 'name' | 'size'>>;
type StrOpts = Partial<Omit<StrSpec, 'kind' | 'name' | 'len' | 'lenRef'>>;
type BytesOpts = Partial<Omit<BytesSpec, 'kind' | 'name' | 'len' | 'lenRef'>>;
type ListOpts = Partial<Omit<ListSpec, 'kind' | 'name' | 'countRef' | 'item'>>;
type LocationOpts = Partial<Omit<LocationSpec, 'kind' | 'name'>>;

export const u8 = (name: string, o: UintOpts = {}): UintSpec => ({ kind: 'uint', size: 1, name, ...o });
export const u16 = (name: string, o: UintOpts = {}): UintSpec => ({ kind: 'uint', size: 2, name, ...o });
export const u32 = (name: string, o: UintOpts = {}): UintSpec => ({ kind: 'uint', size: 4, name, ...o });

export const bcd = (name: string, size: number, o: BcdOpts = {}): BcdSpec => ({ kind: 'bcd', name, size, ...o });
export const time = (name = '时间', o: BcdOpts = {}): BcdSpec => ({
  kind: 'bcd',
  name,
  size: 6,
  time: true,
  desc: 'YY-MM-DD-hh-mm-ss（GMT+8）',
  ...o
});

export const str = (name: string, len: SpecLen, o: StrOpts = {}): StrSpec => ({ kind: 'str', name, len, ...o });
export const strBy = (name: string, lenRef: string, o: StrOpts = {}): StrSpec => ({ kind: 'str', name, lenRef, ...o });
export const bytes = (name: string, len: SpecLen, o: BytesOpts = {}): BytesSpec => ({ kind: 'bytes', name, len, ...o });
export const bytesBy = (name: string, lenRef: string, o: BytesOpts = {}): BytesSpec => ({ kind: 'bytes', name, lenRef, ...o });

export const list = (name: string, countRef: string | undefined, item: SpecField[], o: ListOpts = {}): ListSpec => ({
  kind: 'list',
  name,
  countRef,
  item,
  ...o
});

export const location = (name = '位置信息', o: LocationOpts = {}): LocationSpec => ({ kind: 'location', name, ...o });

export const alarmId = (name = '报警标识号'): AlarmIdSpec => ({
  kind: 'alarmId',
  name,
  desc: '终端 ID + 时间 + 序号 + 附件数量 + 预留，用于关联报警与附件',
  ref: 'safety'
});

export const params = (name: string, countRef: string): ParamsSpec => ({ kind: 'params', name, countRef, ref: 'params' });

export const bitOf = (c: SpecCtx, name: string, bit: number): number => Math.floor((c.values[name] ?? 0) / 2 ** bit) % 2;