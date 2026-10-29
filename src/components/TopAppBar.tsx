import React from 'react';
import { NavLink } from 'react-router-dom';
import { BinaryIcon, BookOpenIcon, ScanLineIcon } from 'lucide-react';

interface TopAppBarProps {
  children?: React.ReactNode;
}

const NAV = [
{ to: '/', label: '解析器', icon: ScanLineIcon, end: true },
{ to: '/docs', label: '协议文档', icon: BookOpenIcon, end: false }];


export function TopAppBar({ children }: TopAppBarProps) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 px-3 lg:px-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
        <BinaryIcon size={22} aria-hidden />
      </div>
      <div className="hidden min-w-0 shrink sm:block">
        <h1 className="truncate text-[22px] leading-7 text-on-surface">JT808 报文解析器</h1>
        <p className="hidden truncate text-xs text-on-surface-variant xl:block">
          JT/T 808-2011 / 2013 / 2019 · 主动安全扩展 · JT/T 1078
        </p>
      </div>
      <nav aria-label="主导航" className="flex shrink-0 items-center gap-1 sm:ml-4">
        {NAV.map(({ to, label, icon: Icon, end }) =>
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
          `flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary sm:px-4 ${
          isActive ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-on-surface/[0.08]'}`

          }>
          
            <Icon size={18} aria-hidden />
            <span className="whitespace-nowrap">{label}</span>
          </NavLink>
        )}
      </nav>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        {children}
        <a
          href="https://github.com/ssssshql/jt808-parser"
          target="_blank"
          rel="noopener noreferrer"
          title="GitHub 开源地址"
          aria-label="GitHub 开源地址"
          className="flex h-10 w-10 items-center justify-center rounded-full text-on-surface-variant transition-colors duration-150 hover:bg-on-surface/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
          
          <svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor" aria-hidden>
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>
          </svg>
        </a>
      </div>
    </header>);

}