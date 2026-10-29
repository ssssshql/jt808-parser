import React from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { ParserProvider } from './contexts/ParserContext';
import { Parser } from './pages/Parser';
import { Docs } from './pages/Docs';

// 使用 HashRouter：路由不占用真实路径段，配合 vite base=./ 后
// 一份产物可部署在任意目录（根目录 / 子路径 / 多层子路径），无需重新构建。
export function App() {
  return (
    <HashRouter>
      <ParserProvider>
        <MotionConfig reducedMotion="user">
          <Routes>
            <Route path="/" element={<Parser />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/docs/:docKey" element={<Docs />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </MotionConfig>
      </ParserProvider>
    </HashRouter>);

}
