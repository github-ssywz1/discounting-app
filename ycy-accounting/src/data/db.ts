// ycy记账 — 数据库操作层
// 使用 sql.js（SQLite 的 WebAssembly 版本）在浏览器中直接运行
// 数据库持久化到 localStorage

import initSqlJs from 'sql.js'
import type { Database as SqlDatabase } from 'sql.js'
import type { Expense, NewExpense } from '../types'
// Vite 会处理 WASM 文件的路径
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

const STORAGE_KEY = 'ycy-accounting-db'
let db: SqlDatabase | null = null
let SQL: Awaited<ReturnType<typeof initSqlJs>> | null = null

/** 初始化数据库（首次使用时自动调用） */
async function ensureDb(): Promise<SqlDatabase> {
  if (db) return db

  // 初始化 sql.js（使用本地 WASM 文件，由 Vite 处理路径）
  if (!SQL) {
    SQL = await initSqlJs({
      locateFile: () => wasmUrl,
    })
  }

  // 尝试从 localStorage 恢复数据
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const uint8 = new Uint8Array(JSON.parse(saved))
      db = new SQL.Database(uint8)
    } catch {
      db = new SQL.Database()
    }
  } else {
    db = new SQL.Database()
  }

  // 创建表结构
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
  `)
  saveDb()
  return db
}

/** 将数据库保存到 localStorage */
function saveDb() {
  if (!db) return
  const data = db.export()
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(data)))
}

/** 添加一笔花销，返回新记录的 ID */
export async function addExpense(expense: NewExpense): Promise<number> {
  const database = await ensureDb()
  database.run(
    `INSERT INTO expenses (amount, category, subcategory, note, date, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      expense.amount,
      expense.category,
      expense.subcategory,
      expense.note,
      expense.date,
      new Date().toISOString(),
    ]
  )
  saveDb()

  // 获取最后插入的 ID
  const result = database.exec('SELECT last_insert_rowid() as id')
  const lastId = result[0]?.values[0]?.[0] as unknown as number
  return lastId
}

/** 查询花销列表，支持按日期范围和分类筛选 */
export async function getExpenses(filter?: {
  startDate?: string
  endDate?: string
  category?: string
}): Promise<Expense[]> {
  const database = await ensureDb()

  let sql = 'SELECT * FROM expenses WHERE 1=1'
  const params: unknown[] = []

  if (filter?.startDate) {
    sql += ' AND date >= ?'
    params.push(filter.startDate)
  }
  if (filter?.endDate) {
    sql += ' AND date <= ?'
    params.push(filter.endDate)
  }
  if (filter?.category) {
    sql += ' AND category = ?'
    params.push(filter.category)
  }

  sql += ' ORDER BY date DESC, created_at DESC'

  const stmt = database.prepare(sql)
  if (params.length > 0) stmt.bind(params as any[])

  const rows: Expense[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as Expense)
  }
  stmt.free()
  return rows
}

/** 删除一笔花销 */
export async function deleteExpense(id: number): Promise<void> {
  const database = await ensureDb()
  database.run('DELETE FROM expenses WHERE id = ?', [id])
  saveDb()
}

/** 获取某月的分类汇总 */
export async function getCategoryStats(
  yearMonth: string
): Promise<{ category: string; total: number }[]> {
  const database = await ensureDb()
  const stmt = database.prepare(
    `SELECT category, SUM(amount) as total
     FROM expenses WHERE date LIKE ?
     GROUP BY category ORDER BY total DESC`
  )
  stmt.bind([`${yearMonth}%`])
  const rows: { category: string; total: number }[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as { category: string; total: number })
  }
  stmt.free()
  return rows
}

/** 获取某月的总支出 */
export async function getMonthlyTotal(yearMonth: string): Promise<number> {
  const database = await ensureDb()
  const stmt = database.prepare(
    `SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE date LIKE ?`
  )
  stmt.bind([`${yearMonth}%`])
  let total = 0
  while (stmt.step()) {
    total = stmt.getAsObject().total as unknown as number
  }
  stmt.free()
  return total
}
