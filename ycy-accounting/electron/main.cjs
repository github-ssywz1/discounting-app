// ycy记账 — Electron 主进程
// 负责：创建窗口、管理 SQLite 数据库、处理 IPC 通信

const electron = require('electron');
const { BrowserWindow, ipcMain } = electron;
const app = electron.app;
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

let db = null;
let SQL = null;
let DB_PATH = null;

// 定位 sql.js 的 WASM 文件
const sqlDir = path.dirname(require.resolve('sql.js'));
const wasmPath = path.join(sqlDir, 'dist', 'sql-wasm.wasm');

// 初始化数据库
async function initDb() {
  DB_PATH = path.join(app.getPath('userData'), 'ycy-accounting.db');
  SQL = await initSqlJs({ locateFile: () => wasmPath });

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // 创建花销表
  db.run(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      subcategory TEXT NOT NULL,
      note TEXT DEFAULT '',
      date TEXT NOT NULL,
      created_at TEXT NOT NULL
    )
  `);
  saveDb();
  console.log('数据库初始化完成:', DB_PATH);
}

// 将数据库保存到磁盘
function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ===== IPC 处理器 =====

// 查询数据（SELECT）
ipcMain.handle('db:query', (_event, sql, params) => {
  const stmt = db.prepare(sql);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
});

// 执行写操作（INSERT / UPDATE / DELETE）
ipcMain.handle('db:run', (_event, sql, params) => {
  db.run(sql, params);
  saveDb();
  // 获取最后插入的 ID
  const result = db.exec('SELECT last_insert_rowid() as id');
  const lastId = result.length > 0 ? result[0].values[0][0] : null;
  return { lastInsertRowid: lastId };
});

// ===== 创建窗口 =====
function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    title: 'ycy记账',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 开发模式：加载 Vite 开发服务器
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    // 生产模式：加载打包后的文件
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// ===== 应用生命周期 =====
app.whenReady().then(async () => {
  await initDb();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
