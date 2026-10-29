import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // 相对资源路径：产物可部署在任意目录（GitHub Pages 子路径 / nginx 根目录 / 多层子路径），
  // 配合 HashRouter 使用，无需按部署路径重新构建。
  base: './',
  plugins: [react()],
})
