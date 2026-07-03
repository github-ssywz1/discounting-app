// vitest.config.ts — Vitest 测试配置
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // 在 Node 环境下运行测试（适合纯逻辑，不涉及浏览器 DOM）
    environment: 'node',
    // 测试文件匹配规则：所有 .test.ts 或 .test.tsx 文件
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // 全局 API（让 describe/it/expect 无需 import）
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
