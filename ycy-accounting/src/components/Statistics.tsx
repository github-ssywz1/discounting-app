import { useState, useEffect } from 'react'
import { getCategoryStats, getMonthlyTotal } from '../data/db'
import { CATEGORY_LIST } from '../data/categories'
import { format } from 'date-fns'

interface CategoryStat {
  category: string
  total: number
}

export default function Statistics() {
  const [selectedMonth, setSelectedMonth] = useState(
    format(new Date(), 'yyyy-MM')
  )
  const [stats, setStats] = useState<CategoryStat[]>([])
  const [monthlyTotal, setMonthlyTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true)
      const [categoryStats, total] = await Promise.all([
        getCategoryStats(selectedMonth),
        getMonthlyTotal(selectedMonth),
      ])
      setStats(categoryStats)
      setMonthlyTotal(total)
      setLoading(false)
    }
    loadStats()
  }, [selectedMonth])

  // 找出最大值用于比例条
  const maxTotal = stats.length > 0 ? stats[0].total : 1

  // 月份列表
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const val = format(d, 'yyyy-MM')
    const label = format(d, 'yyyy年MM月')
    return { val, label }
  })

  // 分类颜色映射（按索引取不同深浅的蓝色）
  const barColors = [
    'bg-primary-500',
    'bg-blue-400',
    'bg-indigo-400',
    'bg-sky-400',
    'bg-cyan-400',
    'bg-primary-400',
    'bg-blue-300',
    'bg-indigo-300',
    'bg-sky-300',
    'bg-slate-300',
  ]

  return (
    <div className="max-w-lg mx-auto p-4">
      {/* 月份选择 */}
      <select
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
        className="w-full p-3 text-sm bg-white border border-slate-200 rounded-xl mb-4
          focus:outline-none focus:border-primary-400 text-slate-700 cursor-pointer appearance-none
          bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.75rem_center] pr-10"
      >
        {monthOptions.map((m) => (
          <option key={m.val} value={m.val}>
            {m.label}
          </option>
        ))}
      </select>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">加载中...</div>
      ) : stats.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-3">📊</div>
          <p className="text-slate-400 text-sm">该月没有记账记录</p>
        </div>
      ) : (
        <>
          {/* 月度总支出 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-4 text-center">
            <p className="text-sm text-slate-500 mb-1">月度总支出</p>
            <p className="text-3xl font-semibold text-slate-800 tabular-nums">
              ¥{monthlyTotal.toFixed(2)}
            </p>
          </div>

          {/* 分类支出明细 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5">
            <h3 className="text-sm font-medium text-slate-500 mb-4">
              分类支出
            </h3>
            <div className="space-y-4">
              {stats.map((stat, index) => {
                const percentage =
                  monthlyTotal > 0
                    ? ((stat.total / monthlyTotal) * 100).toFixed(1)
                    : '0.0'
                const barWidth =
                  maxTotal > 0 ? (stat.total / maxTotal) * 100 : 0

                return (
                  <div key={stat.category}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm text-slate-700">
                        {stat.category}
                      </span>
                      <span className="text-sm text-slate-500 tabular-nums">
                        ¥{stat.total.toFixed(2)}
                        <span className="text-xs text-slate-400 ml-1">
                          ({percentage}%)
                        </span>
                      </span>
                    </div>
                    {/* 比例条 */}
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          barColors[index] || 'bg-slate-300'
                        }`}
                        style={{ width: `${Math.max(barWidth, 2)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 未使用的分类提示 */}
          {stats.length < CATEGORY_LIST.length && (
            <p className="text-xs text-slate-300 text-center mt-3">
              * 仅显示该月有支出的分类
            </p>
          )}
        </>
      )}
    </div>
  )
}
