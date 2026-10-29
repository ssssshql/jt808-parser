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
      <div className="ml-auto flex shrink-0 items-center gap-3">{children}</div>
    </header>);

}