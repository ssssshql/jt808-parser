import { createContext, useContext, useMemo, useState } from 'react';
import { samples } from '../data/samples';
import { buildSampleFrame } from '../utils/jt808/build';
import type { VersionMode } from '../types/jt808';

interface ParserContextValue {
  input: string;
  setInput: (value: string) => void;
  mode: VersionMode;
  setMode: (mode: VersionMode) => void;
}

const ParserContext = createContext<ParserContextValue | null>(null);

export function ParserProvider({ children }: {children: React.ReactNode;}) {
  const [input, setInput] = useState<string>(() => buildSampleFrame(samples[0]));
  const [mode, setMode] = useState<VersionMode>('auto');
  const value = useMemo(() => ({ input, setInput, mode, setMode }), [input, mode]);
  return <ParserContext.Provider value={value}>{children}</ParserContext.Provider>;
}

export function useParserState(): ParserContextValue {
  const ctx = useContext(ParserContext);
  if (!ctx) throw new Error('useParserState 必须在 ParserProvider 内使用');
  return ctx;
}