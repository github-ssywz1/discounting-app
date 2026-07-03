/**
 * ycy记账 — 应用入口文件
 * 把 React 应用挂载到 HTML 页面上的 "#root" 节点
 * StrictMode 会在开发时帮我们发现潜在问题（不会影响生产环境）
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

// 找到页面上的挂载点，渲染 App 组件
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
