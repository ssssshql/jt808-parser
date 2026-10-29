export type Section = 'frame' | 'header' | 'body' | 'extra' | 'safety';
export type ProtocolVersion = '2011' | '2013' | '2019';
export type VersionMode = 'auto' | ProtocolVersion;

export interface BitRow {
  bits: string;
  name: string;
  value: string;
  active: boolean;
}

export interface Field {
  id: string;
  name: string;
  type: string;
  offset: number;
  length: number;
  raw: string;
  value: string;
  steps: string[];
  section: Section;
  bits?: BitRow[];
  children?: Field[];
  error?: boolean;
  num?: number;
  text?: string;
}

export interface FrameSummary {
  msgId: number;
  msgName: string;
  phone: string;
  serial: number;
  version: ProtocolVersion;
  versionNote: string;
  bodyLength: number;
  checksum: {expected: number;actual: number;ok: boolean;};
  escapes: number;
  totalBytes: number;
  rawBytes: number;
}

export interface ParseResult {
  ok: true;
  bytes: Uint8Array;
  fields: Field[];
  summary: FrameSummary;
  warnings: string[];
}

export interface ParseFailure {
  ok: false;
  error: string;
}

export type ParseOutcome = ParseResult | ParseFailure;

export interface Sample {
  id: string;
  label: string;
  description: string;
  msgId: number;
  version: ProtocolVersion;
  phone: string;
  serial: number;
  body: string;
}