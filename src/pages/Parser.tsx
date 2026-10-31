import { useCallback, useEffect, useMemo, useState } from 'react';
import { TopAppBar } from '../components/TopAppBar';
import { VersionSegmented } from '../components/VersionSegmented';
import { InputPanel } from '../components/InputPanel';
import { SummaryCard } from '../components/SummaryCard';
import { HexView } from '../components/HexView';
import { FieldTable } from '../components/FieldTable';
import { FieldDialog } from '../components/FieldDialog';
import { ParseStatePanel } from '../components/ParseStatePanel';
import { FrameTabs } from '../components/FrameTabs';
import { useParserState } from '../contexts/ParserContext';
import { parseFrame } from '../utils/jt808/frame';
import { buildByteOwners, findField } from '../utils/jt808/fields';
import { cleanHex, hexN } from '../utils/jt808/hex';
import { frameItems } from '../utils/jt808/multi';
import { downloadText, toExportJson } from '../utils/jt808/exportJson';
import type { Field, VersionMode } from '../types/jt808';

const NO_FIELDS: Field[] = [];

const MODE_OPTIONS: {value: VersionMode;label: string;}[] = [
{ value: 'auto', label: '自动' },
{ value: '2011', label: '2011' },
{ value: '2013', label: '2013' },
{ value: '2019', label: '2019' }];


export function Parser() {
  const { input, setInput, mode, setMode } = useParserState();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [dialogField, setDialogField] = useState<Field | null>(null);

  const [frameIdx, setFrameIdx] = useState(0);
  const items = useMemo(() => frameItems(input, (hex) => {
    const r = parseFrame(hex, mode);
    return r.ok ? `${hexN(r.summary.msgId, 2)} ${r.summary.msgName}` : '解析失败';
  }), [input, mode]);
  useEffect(() => setFrameIdx(0), [input]);
  const current = items[Math.min(frameIdx, items.length - 1)];
  const result = useMemo(() => parseFrame(current.hex, mode, { mergedFrom: current.mergedFrom }), [current, mode]);
  const frameCount = items.filter((it) => !it.mergedFrom).length;

  const exportJson = useCallback(() => {
    const entries = items.map((it) => ({ label: it.label, hex: it.hex, result: parseFrame(it.hex, mode, { mergedFrom: it.mergedFrom }) }));
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    downloadText(`jt808-${stamp}.json`, toExportJson(entries));
  }, [items, mode]);
  const fields = result.ok ? result.fields : NO_FIELDS;

  useEffect(() => {
    setSelectedId(null);
    setHoverId(null);
  }, [result]);

  const owners = useMemo(() => result.ok ? buildByteOwners(result.fields, result.bytes.length) : [], [result]);
  const selected = selectedId ? findField(fields, selectedId) : undefined;
  const hovered = hoverId ? findField(fields, hoverId) : undefined;
  const closeDialog = useCallback(() => setDialogField(null), []);

  return (
    <div className="flex min-h-screen w-full flex-col bg-surface text-on-surface lg:h-screen lg:overflow-hidden">
      <TopAppBar>
        <span className="hidden text-sm text-on-surface-variant md:inline">协议版本</span>
        <VersionSegmented options={MODE_OPTIONS} value={mode} onChange={setMode} ariaLabel="协议版本" />
      </TopAppBar>
      <main className="grid min-h-0 flex-1 gap-3 px-3 pb-3 lg:grid-cols-[minmax(460px,5fr)_7fr] lg:px-4 lg:pb-4">
        <div className="flex min-h-0 flex-col gap-3">
          <InputPanel value={input} onChange={setInput} frameCount={frameCount} onExport={cleanHex(input) ? exportJson : undefined} />
          <FrameTabs items={items} value={Math.min(frameIdx, items.length - 1)} onChange={setFrameIdx} />
          {result.ok &&
          <>
              <SummaryCard summary={result.summary} warnings={result.warnings} />
              <HexView
              bytes={result.bytes}
              owners={owners}
              selectedRange={selected ? [selected.offset, selected.offset + selected.length] : null}
              hoverRange={hovered ? [hovered.offset, hovered.offset + hovered.length] : null}
              onHover={setHoverId}
              onSelect={setSelectedId}
              onOpen={setDialogField} />
            
            </>
          }
        </div>
        {result.ok ?
        <FieldTable
          fields={result.fields}
          msgLabel={`${hexN(result.summary.msgId, 2)} ${result.summary.msgName}`}
          selectedId={selectedId}
          hoverId={hoverId}
          onSelect={setSelectedId}
          onHover={setHoverId}
          onOpen={setDialogField} /> :


        <ParseStatePanel error={result.error} empty={!cleanHex(input)} />
        }
      </main>
      <FieldDialog field={dialogField} onClose={closeDialog} />
    </div>);

}