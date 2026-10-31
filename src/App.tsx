
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { LazyMotion, MotionConfig, domAnimation } from 'framer-motion';
import { ParserProvider } from './contexts/ParserContext';
import { Parser } from './pages/Parser';
// 文档页按需加载，首屏只下载解析器
const Docs = lazy(() => import('./pages/Docs').then((m) => ({ default: m.Docs })));

// 使用 HashRouter：路由不占用真实路径段，配合 vite base=./ 后
// 一份产物可部署在任意目录（根目录 / 子路径 / 多层子路径），无需重新构建。
export function App() {
  return (
    <HashRouter>
      <ParserProvider>
        <LazyMotion features={domAnimation} strict>
        <MotionConfig reducedMotion="user">
          <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<Parser />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/docs/:docKey" element={<Docs />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </Suspense>
        </MotionConfig>
        </LazyMotion>
      </ParserProvider>
    </HashRouter>);

}
