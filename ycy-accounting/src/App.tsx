import { useState } from 'react'
import { PencilLine, List, PieChart } from 'lucide-react'
import AddExpense from './components/AddExpense'
import ExpenseList from './components/ExpenseList'
import Statistics from './components/Statistics'

type Tab = '记账' | '明细' | '统计'

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  { key: '记账', label: '记账', icon: <PencilLine size={18} /> },
  { key: '明细', label: '明细', icon: <List size={18} /> },
  { key: '统计', label: '统计', icon: <PieChart size={18} /> },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('记账')
  // 用于刷新列表的关键计数器
  const [refreshKey, setRefreshKey] = useState(0)

  // 记账成功后触发刷新
  const handleExpenseAdded = () => {
    setRefreshKey((k) => k + 1)
    // 自动跳转到明细页查看
    setActiveTab('明细')
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* 顶部标题栏 */}
      <header className="flex items-center justify-center py-4 bg-white border-b border-slate-200 select-none">
        <h1 className="text-xl font-semibold text-slate-800 tracking-wide">
          ycy记账
        </h1>
      </header>

      {/* 标签切换栏 */}
      <nav className="flex bg-white border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors cursor-pointer
              ${
                activeTab === tab.key
                  ? 'text-primary-600 border-b-2 border-primary-500 bg-primary-50/50'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </nav>

      {/* 内容区 */}
      <main className="flex-1 overflow-auto">
        {activeTab === '记账' && (
          <AddExpense onSuccess={handleExpenseAdded} />
        )}
        {activeTab === '明细' && (
          <ExpenseList key={refreshKey} />
        )}
        {activeTab === '统计' && (
          <Statistics key={refreshKey} />
        )}
      </main>
    </div>
  )
}
