// ycy记账 — 数据库操作层
// 使用 sql.js（SQLite 的 WebAssembly 版本）在浏览器中直接运行
// 数据库持久化到 localStorage

import initSqlJs from 'sql.js'
import type { Database as SqlDatabase } from 'sql.js'
import type { Expense, NewExpense, Category } from '../types'
// Vite 会处理 WASM 文件的路径
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'
// 预置分类种子数据
import { PRESET_CATEGORIES } from './categories'

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

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parent_id INTEGER,
      is_preset INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    )
  `)

  // 首次使用时，导入预置分类
  const count = db.exec('SELECT COUNT(*) as c FROM categories')
  const rowCount = count[0]?.values[0]?.[0] as unknown as number
  if (rowCount === 0) {
    seedPresetCategories(db)
  }

  saveDb()
  return db
}

/** 导入预置分类 */
function seedPresetCategories(database: SqlDatabase) {
  const now = new Date().toISOString()
  let order = 0
  for (const preset of PRESET_CATEGORIES) {
    // 插入一级分类
    database.run(
      'INSERT INTO categories (name, parent_id, is_preset, sort_order, created_at) VALUES (?, NULL, 1, ?, ?)',
      [preset.name, order, now]
    )
    const result = database.exec('SELECT last_insert_rowid() as id')
    const parentId = result[0]?.values[0]?.[0] as unknown as number
    // 插入二级分类
    for (let i = 0; i < preset.subcategories.length; i++) {
      database.run(
        'INSERT INTO categories (name, parent_id, is_preset, sort_order, created_at) VALUES (?, ?, 1, ?, ?)',
        [preset.subcategories[i], parentId, i, now]
      )
    }
    order++
  }
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

// ═══════════════════════════════════════════════════════
//  分类管理 — CRUD 操作
// ═══════════════════════════════════════════════════════

/** 获取所有分类（按 sort_order 排序） */
export async function getAllCategories(): Promise<Category[]> {
  const database = await ensureDb()
  const stmt = database.prepare(
    'SELECT * FROM categories ORDER BY is_preset DESC, sort_order ASC, id ASC'
  )
  const rows: Category[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as Category)
  }
  stmt.free()
  return rows
}

/** 获取一级分类列表（用于下拉选择） */
export async function getTopLevelCategories(): Promise<Category[]> {
  const database = await ensureDb()
  const stmt = database.prepare(
    'SELECT * FROM categories WHERE parent_id IS NULL ORDER BY sort_order ASC, id ASC'
  )
  const rows: Category[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as Category)
  }
  stmt.free()
  return rows
}

/** 获取某个一级分类下的二级分类列表 */
export async function getSubcategoriesByParentId(parentId: number): Promise<Category[]> {
  const database = await ensureDb()
  const stmt = database.prepare(
    'SELECT * FROM categories WHERE parent_id = ? ORDER BY sort_order ASC, id ASC'
  )
  stmt.bind([parentId])
  const rows: Category[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as Category)
  }
  stmt.free()
  return rows
}

/** 根据一级分类名称获取二级分类名称列表（兼容旧记账逻辑） */
export async function getSubcategoryNames(categoryName: string): Promise<string[]> {
  const database = await ensureDb()
  // 先找一级分类的 id
  const stmt = database.prepare(
    'SELECT id FROM categories WHERE name = ? AND parent_id IS NULL'
  )
  stmt.bind([categoryName])
  let parentId: number | null = null
  while (stmt.step()) {
    parentId = stmt.getAsObject().id as unknown as number
  }
  stmt.free()
  if (parentId === null) return []

  const subStmt = database.prepare(
    'SELECT name FROM categories WHERE parent_id = ? ORDER BY sort_order ASC, id ASC'
  )
  subStmt.bind([parentId])
  const names: string[] = []
  while (subStmt.step()) {
    names.push(subStmt.getAsObject().name as unknown as string)
  }
  subStmt.free()
  return names
}

/** 新增分类。parentId 不传则新增一级分类，传入则新增对应二级分类 */
export async function addCategory(name: string, parentId?: number): Promise<number> {
  const database = await ensureDb()
  database.run(
    'INSERT INTO categories (name, parent_id, is_preset, sort_order, created_at) VALUES (?, ?, 0, 99, ?)',
    [name, parentId ?? null, new Date().toISOString()]
  )
  saveDb()
  const result = database.exec('SELECT last_insert_rowid() as id')
  return result[0]?.values[0]?.[0] as unknown as number
}

/** 重命名分类（仅限用户自建分类） */
export async function updateCategoryName(
  id: number,
  newName: string
): Promise<{ success: boolean; error?: string }> {
  const database = await ensureDb()

  // 检查是否是预置分类
  const stmt = database.prepare('SELECT is_preset, name, parent_id FROM categories WHERE id = ?')
  stmt.bind([id])
  let oldName = ''
  let isPreset = 0
  let parentId: number | null = null
  while (stmt.step()) {
    const row = stmt.getAsObject()
    isPreset = row.is_preset as unknown as number
    oldName = row.name as unknown as string
    parentId = row.parent_id as unknown as number | null
  }
  stmt.free()

  if (isPreset === 1) {
    return { success: false, error: '预置分类不能修改名称' }
  }

  // 更新分类名称
  database.run('UPDATE categories SET name = ? WHERE id = ?', [newName, id])

  // 同步更新 expenses 表中的引用
  if (parentId === null) {
    // 一级分类：更新 expenses.category
    database.run('UPDATE expenses SET category = ? WHERE category = ?', [newName, oldName])
  } else {
    // 二级分类：更新 expenses.subcategory
    database.run('UPDATE expenses SET subcategory = ? WHERE subcategory = ?', [newName, oldName])
  }

  saveDb()
  return { success: true }
}

/** 删除分类（仅限用户自建分类，且该分类下没有记账记录时才可删） */
export async function deleteCategory(
  id: number
): Promise<{ success: boolean; error?: string }> {
  const database = await ensureDb()

  // 检查是否是预置分类
  const stmt = database.prepare('SELECT is_preset FROM categories WHERE id = ?')
  stmt.bind([id])
  let isPreset = 0
  while (stmt.step()) {
    isPreset = stmt.getAsObject().is_preset as unknown as number
  }
  stmt.free()

  if (isPreset === 1) {
    return { success: false, error: '预置分类不能删除' }
  }

  // 检查是否有记账记录引用了这个分类
  const count = await getCategoryUsageCount(id)
  if (count > 0) {
    return { success: false, error: `该分类下有 ${count} 笔记账记录，不能删除` }
  }

  // 删除该分类
  database.run('DELETE FROM categories WHERE id = ?', [id])
  saveDb()
  return { success: true }
}

/** 获取某个分类被多少笔记账记录引用 */
async function getCategoryUsageCount(id: number): Promise<number> {
  const database = await ensureDb()

  const stmt = database.prepare('SELECT name, parent_id FROM categories WHERE id = ?')
  stmt.bind([id])
  let name = ''
  let parentId: number | null = null
  while (stmt.step()) {
    const row = stmt.getAsObject()
    name = row.name as unknown as string
    parentId = row.parent_id as unknown as number | null
  }
  stmt.free()

  if (!name) return 0

  let countSql: string
  let params: unknown[]
  if (parentId === null) {
    countSql = 'SELECT COUNT(*) as c FROM expenses WHERE category = ?'
    params = [name]
  } else {
    countSql = 'SELECT COUNT(*) as c FROM expenses WHERE subcategory = ?'
    params = [name]
  }

  const countStmt = database.prepare(countSql)
  countStmt.bind(params as any[])
  let result = 0
  while (countStmt.step()) {
    result = countStmt.getAsObject().c as unknown as number
  }
  countStmt.free()
  return result
}
