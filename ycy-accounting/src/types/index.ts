// ycy记账 — 数据模型类型定义

/** 一条花销记录 */
export interface Expense {
  id: number
  amount: number // 金额（元）
  category: string // 一级分类
  subcategory: string // 二级分类
  note: string // 备注
  date: string // 日期 YYYY-MM-DD
  created_at: string // 创建时间 ISO 字符串
}

/** 新增花销时不需要 id 和 created_at */
export type NewExpense = Omit<Expense, 'id' | 'created_at'>
