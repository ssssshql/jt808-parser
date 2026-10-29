import type { Category, MessageSpec } from '../../types/messageSpec';
import { activeSafetySpecs } from './activeSafety';
import { av1078Specs } from './av1078';
import { infoSpecs } from './info';
import { locationSpecs } from './location';
import { mediaSpecs, recorderSpecs, transportSpecs } from './recorder';
import { terminalSpecs } from './terminal';

export const CATEGORIES: Category[] = [
'通用与终端管理',
'位置与报警',
'车辆控制与区域',
'信息与电话',
'行驶记录与驾驶员',
'多媒体',
'数据透传与加密',
'主动安全（粤标）',
'音视频（JT/T 1078）'];


export const MESSAGE_SPECS: MessageSpec[] = [
...terminalSpecs,
...locationSpecs,
...infoSpecs,
...recorderSpecs,
...mediaSpecs,
...transportSpecs,
...activeSafetySpecs,
...av1078Specs];


export const SPEC_BY_ID: Record<number, MessageSpec> = Object.fromEntries(MESSAGE_SPECS.map((s) => [s.id, s]));

export const MSG_NAMES: Record<number, string> = Object.fromEntries(MESSAGE_SPECS.map((s) => [s.id, s.name]));