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

/** 数据库中的分类记录 */
export interface Category {
  id: number
  name: string
  parent_id: number | null // null = 一级分类, 数字 = 对应父分类的 id
  is_preset: number // 0 = 用户自建, 1 = 预置分类（不可修改/删除）
  sort_order: number
  created_at: string
}

/** 前端展示用的分类树节点 */
export interface CategoryTreeNode {
  id: number
  name: string
  is_preset: boolean
  children: CategoryTreeNode[]
}
