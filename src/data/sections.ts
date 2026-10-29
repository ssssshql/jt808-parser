import type { Section } from '../types/jt808';

export const SECTION_STYLES: Record<Section, {tint: string;swatch: string;label: string;}> = {
  frame: { tint: 'bg-surface-container-highest text-on-surface-variant', swatch: 'bg-outline', label: '标识位 / 校验' },
  header: { tint: 'bg-primary-container text-on-primary-container', swatch: 'bg-primary', label: '消息头' },
  body: { tint: 'bg-secondary-container text-on-secondary-container', swatch: 'bg-secondary', label: '消息体' },
  extra: { tint: 'bg-tertiary-container text-on-tertiary-container', swatch: 'bg-tertiary', label: '附加信息' },
  safety: { tint: 'bg-safety-container text-on-safety-container', swatch: 'bg-safety', label: '主动安全' }
};

export const SECTION_ORDER: Section[] = ['frame', 'header', 'body', 'extra', 'safety'];