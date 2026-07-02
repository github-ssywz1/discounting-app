import { useState, useEffect } from 'react'
import { Trash2, Filter, X } from 'lucide-react'
import { getExpenses, deleteExpense } from '../data/db'
import { CATEGORY_LIST } from '../data/categories'
import type { Expense } from '../types'
import { format } from 'date-fns'

export default function ExpenseList() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filterCategory, setFilterCategory] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [loading, setLoading] = useState(true)

  // 加载数据
  const loadExpenses = async () => {
    setLoading(true)
    const filter: { startDate?: string; endDate?: string; category?: string } = {}

    if (filterMonth) {
      filter.startDate = `${filterMonth}-01`
      // 计算该月最后一天
      const [year, month] = filterMonth.split('-')
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate()
      filter.endDate = `${filterMonth}-${String(lastDay).padStart(2, '0')}`
    }
    if (filterCategory) {
      filter.category = filterCategory
    }

    const data = await getExpenses(filter)
    setExpenses(data)
    setLoading(false)
  }

  useEffect(() => {
    loadExpenses()
  }, [filterCategory, filterMonth])

  const handleDelete = async (id: number) => {
    await deleteExpense(id)
    loadExpenses()
  }

  const handleClearFilter = () => {
    setFilterCategory('')
    setFilterMonth('')
  }

  const hasFilter = filterCategory || filterMonth

  // 按日期分组
  const groupedExpenses = expenses.reduce(
    (groups, expense) => {
      if (!groups[expense.date]) {
        groups[expense.date] = []
      }
      groups[expense.date].push(expense)
      return groups
    },
    {} as Record<string, Expense[]>
  )

  // 计算筛选期间的总支出
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0)

  return (
    <div className="max-w-lg mx-auto p-4">
      {/* 筛选栏 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="flex-1 min-w-[120px] p-2.5 text-sm bg-white border border-slate-200 rounded-xl
            focus:outline-none focus:border-primary-400 text-slate-600 cursor-pointer appearance-none
            bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] pr-8"
        >
          <option value="">全部月份</option>
          {Array.from({ length: 12 }, (_, i) => {
            const d = new Date()
            d.setMonth(d.getMonth() - i)
            const val = format(d, 'yyyy-MM')
            const label = format(d, 'yyyy年MM月')
            return (
              <option key={val} value={val}>
                {label}
              </option>
            )
          })}
        </select>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="flex-1 min-w-[120px] p-2.5 text-sm bg-white border border-slate-200 rounded-xl
            focus:outline-none focus:border-primary-400 text-slate-600 cursor-pointer appearance-none
            bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.5rem_center] pr-8"
        >
          <option value="">全部分类</option>
          {CATEGORY_LIST.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
        {hasFilter && (
          <button
            onClick={handleClearFilter}
            className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="清除筛选"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* 汇总条 */}
      {expenses.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4 flex items-center justify-between">
          <span className="text-sm text-slate-500">
            共 {expenses.length} 笔
          </span>
          <span className="text-lg font-semibold text-slate-800">
            ¥{totalAmount.toFixed(2)}
          </span>
        </div>
      )}

      {/* 花销列表 */}
      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">加载中...</div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-16">
          <Filter size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-400 text-sm">
            {hasFilter ? '筛选结果为空' : '还没有记账记录'}
          </p>
          <p className="text-slate-300 text-xs mt-1">
            {hasFilter ? '试试调整筛选条件' : '去「记账」标签页记一笔吧'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedExpenses).map(([date, items]) => {
            const dayTotal = items.reduce((sum, e) => sum + e.amount, 0)
            // 格式化日期显示
            const dateObj = new Date(date)
            const weekDay = ['日', '一', '二', '三', '四', '五', '六'][dateObj.getDay()]
            const dateLabel = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日 周${weekDay}`

            return (
              <div key={date}>
                {/* 日期标题 */}
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs text-slate-400 font-medium">
                    {dateLabel}
                  </span>
                  <span className="text-xs text-slate-400">
                    日支出 ¥{dayTotal.toFixed(2)}
                  </span>
                </div>

                {/* 当日记账列表 */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  {items.map((expense, index) => (
                    <div
                      key={expense.id}
                      className={`flex items-center justify-between py-3 px-4
                        ${index < items.length - 1 ? 'border-b border-slate-100' : ''}
                        hover:bg-slate-50 transition-colors group`}
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-800">
                            {expense.subcategory}
                          </span>
                          <span className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            {expense.category}
                          </span>
                        </div>
                        {expense.note && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate">
                            {expense.note}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-base font-medium text-slate-800 tabular-nums">
                          ¥{expense.amount.toFixed(2)}
                        </span>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all cursor-pointer p-1"
                          title="删除"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
