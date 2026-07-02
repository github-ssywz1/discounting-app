import { useState, useCallback } from 'react'
import { Save, Check } from 'lucide-react'
import {
  CATEGORY_LIST,
  getSubcategories,
} from '../data/categories'
import { addExpense } from '../data/db'

interface Props {
  onSuccess: () => void
}

export default function AddExpense({ onSuccess }: Props) {
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState(CATEGORY_LIST[0])
  const [subcategory, setSubcategory] = useState(getSubcategories(CATEGORY_LIST[0])[0])
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  const subcategories = getSubcategories(category)

  // 切换一级分类时，二级分类重置为第一个
  const handleCategoryChange = useCallback((newCategory: string) => {
    setCategory(newCategory)
    const subs = getSubcategories(newCategory)
    setSubcategory(subs[0])
  }, [])

  const handleSubmit = async () => {
    const amountNum = parseFloat(amount)
    if (!amount || isNaN(amountNum) || amountNum <= 0) return

    setSaving(true)
    await addExpense({
      amount: amountNum,
      category,
      subcategory,
      note: note.trim(),
      date,
    })

    // 重置表单
    setAmount('')
    setNote('')
    setDate(new Date().toISOString().slice(0, 10))
    setSaving(false)

    // 显示成功反馈
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 1500)

    onSuccess()
  }

  // 回车键提交
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
    }
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      {/* 金额输入 */}
      <div className="mb-6">
        <label className="block text-sm text-slate-500 mb-2">
          金额（元）
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-slate-400">
            ¥
          </span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="0.00"
            autoFocus
            className="w-full pl-10 pr-4 py-4 text-3xl font-medium text-slate-800 bg-white border-2 border-slate-200 rounded-2xl
              focus:outline-none focus:border-primary-400 focus:ring-4 focus:ring-primary-50
              placeholder:text-slate-300 transition-all"
          />
        </div>
      </div>

      {/* 分类选择 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="block text-sm text-slate-500 mb-2">分类</label>
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full p-3 text-sm bg-white border border-slate-200 rounded-xl
              focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-50
              text-slate-700 cursor-pointer transition-all appearance-none
              bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.75rem_center] pr-10"
          >
            {CATEGORY_LIST.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-500 mb-2">子分类</label>
          <select
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            className="w-full p-3 text-sm bg-white border border-slate-200 rounded-xl
              focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-50
              text-slate-700 cursor-pointer transition-all appearance-none
              bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_0.75rem_center] pr-10"
          >
            {subcategories.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 日期和备注 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div>
          <label className="block text-sm text-slate-500 mb-2">日期</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full p-3 text-sm bg-white border border-slate-200 rounded-xl
              focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-50
              text-slate-700 cursor-pointer transition-all"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-500 mb-2">
            备注 <span className="text-slate-300">（可选）</span>
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="例如：和同事AA"
            maxLength={100}
            className="w-full p-3 text-sm bg-white border border-slate-200 rounded-xl
              focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-50
              text-slate-700 placeholder:text-slate-300 transition-all"
          />
        </div>
      </div>

      {/* 提交按钮 */}
      <button
        onClick={handleSubmit}
        disabled={saving || !amount || parseFloat(amount) <= 0}
        className={`w-full py-3.5 rounded-2xl font-medium text-base flex items-center justify-center gap-2 transition-all cursor-pointer
          ${
            saving || !amount || parseFloat(amount) <= 0
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : showSuccess
                ? 'bg-emerald-500 text-white'
                : 'bg-primary-500 text-white hover:bg-primary-600 active:scale-[0.98] shadow-lg shadow-primary-200'
          }`}
      >
        {showSuccess ? (
          <>
            <Check size={20} />
            已保存
          </>
        ) : saving ? (
          '保存中...'
        ) : (
          <>
            <Save size={20} />
            记下这笔
          </>
        )}
      </button>
    </div>
  )
}
