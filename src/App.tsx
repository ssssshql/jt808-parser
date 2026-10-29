import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { ParserProvider } from './contexts/ParserContext';
import { Parser } from './pages/Parser';
import { Docs } from './pages/Docs';

export function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
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
    </BrowserRouter>);

}