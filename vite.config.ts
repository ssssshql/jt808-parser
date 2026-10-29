import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  // 部署到 GitHub Pages 子路径（仓库名即 base）
  base: '/jt808-parser/',
  plugins: [react()],
})
