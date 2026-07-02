import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 使用相对路径，Electron 加载本地文件需要
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
