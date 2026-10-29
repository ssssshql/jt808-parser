import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FileQuestionIcon } from 'lucide-react';
import { TopAppBar } from '../components/TopAppBar';
import { VersionSegmented } from '../components/VersionSegmented';
import { DocsSidebar } from '../components/docs/DocsSidebar';
import { MessageDoc } from '../components/docs/MessageDoc';
import { FrameReference } from '../components/docs/FrameReference';
import { BitsReference } from '../components/docs/BitsReference';
import { ExtrasReference } from '../components/docs/ExtrasReference';
import { SafetyReference } from '../components/docs/SafetyReference';
import { ParamsReference } from '../components/docs/ParamsReference';
import { useParserState } from '../contexts/ParserContext';
import { SPEC_BY_ID } from '../data/messages';
import type { ProtocolVersion } from '../types/jt808';

const VERSION_OPTIONS: {value: ProtocolVersion;label: string;}[] = [
{ value: '2011', label: '2011' },
{ value: '2013', label: '2013' },
{ value: '2019', label: '2019' }];


export function Docs() {
  const { docKey } = useParams();
  const navigate = useNavigate();
  const { setInput, setMode } = useParserState();
  const [version, setVersion] = useState<ProtocolVersion>('2019');
  const contentRef = useRef<HTMLElement>(null);
  const key = docKey ?? 'frame';
  const spec = /^0x[0-9a-f]+$/i.test(key) ? SPEC_BY_ID[parseInt(key, 16)] : undefined;

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [key]);

  const go = (k: string) => navigate(`/docs/${k}`);

  const openSample = (hex: string, v: ProtocolVersion) => {
    setInput(hex);
    setMode(v === '2011' ? '2011' : 'auto');
    navigate('/');
  };

  let content: React.ReactNode;
  if (spec) content = <MessageDoc spec={spec} version={version} onNavigate={go} onOpenSample={openSample} />;else
  if (key === 'frame') content = <FrameReference version={version} onNavigate={go} />;else
  if (key === 'bits') content = <BitsReference version={version} />;else
  if (key === 'extras') content = <ExtrasReference onNavigate={go} />;else
  if (key === 'safety') content = <SafetyReference version={version} onNavigate={go} />;else
  if (key === 'params') content = <ParamsReference version={version} />;else

  content =
  <div className="flex h-full min-h-[320px] flex-col items-center justify-center px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary-container text-on-secondary-container">
          <FileQuestionIcon size={26} aria-hidden />
        </div>
        <h1 className="mt-4 text-base font-medium text-on-surface">未找到「{key}」</h1>
        <p className="mt-1 text-sm text-on-surface-variant">该消息 ID 未收录，请从左侧列表选择。</p>
      </div>;


  return (
    <div className="flex min-h-screen w-full flex-col bg-surface text-on-surface lg:h-screen lg:overflow-hidden">
      <TopAppBar>
        <span className="hidden text-sm text-on-surface-variant md:inline">文档版本</span>
        <VersionSegmented options={VERSION_OPTIONS} value={version} onChange={setVersion} ariaLabel="文档版本" />
      </TopAppBar>
      <main className="grid min-h-0 flex-1 gap-3 px-3 pb-3 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-4 lg:pb-4">
        <DocsSidebar activeKey={spec ? key.replace(/^0x/i, '0x').toUpperCase().replace('0X', '0x') : key} version={version} onSelect={go} />
        <article ref={contentRef} className="m3-scroll min-h-0 overflow-auto rounded-xl bg-surface-container-low">
          {content}
        </article>
      </main>
    </div>);

}