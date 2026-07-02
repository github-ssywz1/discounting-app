// ycy记账 — 预加载脚本
// 安全地在主进程和渲染进程之间建立通信桥梁

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 查询数据（SELECT 语句）
  dbQuery: (sql, params) => ipcRenderer.invoke('db:query', sql, params),

  // 执行写操作（INSERT / UPDATE / DELETE 语句）
  dbRun: (sql, params) => ipcRenderer.invoke('db:run', sql, params),
});
