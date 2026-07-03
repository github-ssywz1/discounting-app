/**
 * CategoryManager — 分类管理页面组件
 *
 * 用户可以在这里管理花销分类：
 * 1. 查看所有一级/二级分类（预置分类带锁图标，不可修改）
 * 2. 新建一级分类或二级分类
 * 3. 重命名用户自建分类（同步更新已有记账记录）
 * 4. 删除用户自建分类（无记账记录时才能删除）
 */
import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Lock, ChevronDown, ChevronRight, X } from 'lucide-react'
import {
  getTopLevelCategories,
  getSubcategoriesByParentId,
  addCategory,
  updateCategoryName,
  deleteCategory,
} from '../data/db'
import type { Category } from '../types'

/** 弹窗类型：不显示/新建一级/新建二级/编辑 */
type ModalType = 'none' | 'addTop' | 'addSub' | 'edit'

/** 分类管理页面：查看、新建、重命名、删除分类 */
export default function CategoryManager() {
  // 一级分类列表
  const [topCategories, setTopCategories] = useState<Category[]>([])
  // 二级分类缓存：{ [parentId]: Category[] }
  const [subCache, setSubCache] = useState<Record<number, Category[]>>({})
  // 展开的一级分类 id 集合
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  // 加载中
  const [loading, setLoading] = useState(true)

  // 弹窗状态
  const [modalType, setModalType] = useState<ModalType>('none')
  const [modalParentId, setModalParentId] = useState<number | null>(null)
  const [modalParentName, setModalParentName] = useState('')
  const [editTarget, setEditTarget] = useState<Category | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [modalError, setModalError] = useState('')
  const [saving, setSaving] = useState(false)

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleteError, setDeleteError] = useState('')

  // 操作提示
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2000)
  }

  // 加载数据
  const loadData = async () => {
    setLoading(true)
    const topList = await getTopLevelCategories()
    setTopCategories(topList)
    // 预加载所有二级分类
    const cache: Record<number, Category[]> = {}
    for (const cat of topList) {
      cache[cat.id] = await getSubcategoriesByParentId(cat.id)
    }
    setSubCache(cache)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  // 切换展开/收起
  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // 打开弹窗
  const openAddTop = () => {
    setModalType('addTop')
    setModalParentId(null)
    setInputValue('')
    setModalError('')
  }

  const openAddSub = (parentId: number, parentName: string) => {
    setModalType('addSub')
    setModalParentId(parentId)
    setModalParentName(parentName)
    setInputValue('')
    setModalError('')
  }

  const openEdit = (cat: Category) => {
    setModalType('edit')
    setEditTarget(cat)
    setInputValue(cat.name)
    setModalError('')
  }

  const closeModal = () => {
    setModalType('none')
    setEditTarget(null)
    setInputValue('')
    setModalError('')
  }

  // 提交新增/编辑
  const handleSubmit = async () => {
    const name = inputValue.trim()
    if (!name) {
      setModalError('名称不能为空')
      return
    }

    setSaving(true)
    setModalError('')

    try {
      if (modalType === 'addTop') {
        await addCategory(name)
        showToast('一级分类已添加')
      } else if (modalType === 'addSub' && modalParentId !== null) {
        await addCategory(name, modalParentId)
        showToast('二级分类已添加')
      } else if (modalType === 'edit' && editTarget) {
        const result = await updateCategoryName(editTarget.id, name)
        if (!result.success) {
          setModalError(result.error || '修改失败')
          setSaving(false)
          return
        }
        showToast('分类名称已更新')
      }
      closeModal()
      await loadData()
    } catch {
      setModalError('操作失败，请重试')
    }
    setSaving(false)
  }

  // 删除分类
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteError('')
    const result = await deleteCategory(deleteTarget.id)
    if (!result.success) {
      setDeleteError(result.error || '删除失败')
      return
    }
    showToast('分类已删除')
    setDeleteTarget(null)
    await loadData()
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto p-6 text-center text-slate-400 text-sm">
        加载中...
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto p-4">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-medium text-slate-500">
          管理分类
        </h2>
        <button
          onClick={openAddTop}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-500 text-white rounded-xl
            hover:bg-primary-600 active:scale-95 transition-all cursor-pointer"
        >
          <Plus size={16} />
          新建大类
        </button>
      </div>

      {/* 分类列表 */}
      <div className="space-y-2">
        {topCategories.map((topCat) => {
          const isExpanded = expanded.has(topCat.id)
          const subList = subCache[topCat.id] || []

          return (
            <div key={topCat.id}>
              {/* 一级分类行 */}
              <div
                className={`flex items-center justify-between p-3 rounded-xl transition-colors
                  ${topCat.is_preset
                    ? 'bg-slate-100'
                    : 'bg-white border border-slate-200 hover:border-slate-300'}`}
              >
                <button
                  onClick={() => toggleExpand(topCat.id)}
                  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                >
                  {isExpanded ? (
                    <ChevronDown size={16} className="text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight size={16} className="text-slate-400 shrink-0" />
                  )}
                  <span className="text-sm font-medium text-slate-800 truncate">
                    {topCat.name}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({subList.length})
                  </span>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  {topCat.is_preset ? (
                    <Lock size={14} className="text-slate-300" />
                  ) : (
                    <>
                      <button
                        onClick={() => openEdit(topCat)}
                        className="p-1 text-slate-300 hover:text-primary-500 transition-colors cursor-pointer"
                        title="编辑名称"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(topCat)}
                        className="p-1 text-slate-300 hover:text-red-400 transition-colors cursor-pointer"
                        title="删除"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* 二级分类列表（展开时显示） */}
              {isExpanded && (
                <div className="ml-6 mt-1 space-y-0.5">
                  {subList.map((subCat) => (
                    <div
                      key={subCat.id}
                      className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm
                        ${subCat.is_preset
                          ? 'text-slate-600'
                          : 'text-slate-700 bg-white/50 hover:bg-slate-50'}`}
                    >
                      <span className="truncate">{subCat.name}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {subCat.is_preset ? (
                          <Lock size={12} className="text-slate-300" />
                        ) : (
                          <>
                            <button
                              onClick={() => openEdit(subCat)}
                              className="p-0.5 text-slate-300 hover:text-primary-500 transition-colors cursor-pointer"
                              title="编辑名称"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(subCat)}
                              className="p-0.5 text-slate-300 hover:text-red-400 transition-colors cursor-pointer"
                              title="删除"
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {/* 添加子分类按钮 */}
                  <button
                    onClick={() => openAddSub(topCat.id, topCat.name)}
                    className="flex items-center gap-1 py-2 px-3 text-xs text-primary-500 hover:text-primary-600
                      hover:bg-primary-50 rounded-lg transition-colors cursor-pointer w-full"
                  >
                    <Plus size={12} />
                    添加子分类
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 空状态 */}
      {topCategories.length === 0 && (
        <div className="text-center py-12 text-slate-400 text-sm">
          暂无分类
        </div>
      )}

      {/* ─── 新增/编辑弹窗 ─── */}
      {modalType !== 'none' && (
        <div
          className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-medium text-slate-800">
                {modalType === 'addTop'
                  ? '新建一级分类'
                  : modalType === 'addSub'
                    ? `添加「${modalParentName}」的子分类`
                    : '修改分类名称'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder={
                modalType === 'addTop' ? '例如：养车费用' : '例如：咖啡'
              }
              maxLength={20}
              autoFocus
              className="w-full p-3 text-sm bg-white border border-slate-200 rounded-xl
                focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-50
                text-slate-800 placeholder:text-slate-300 transition-all mb-3"
            />

            {modalError && (
              <p className="text-xs text-red-400 mb-3">{modalError}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={closeModal}
                className="flex-1 py-2.5 text-sm text-slate-500 bg-slate-100 rounded-xl
                  hover:bg-slate-200 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !inputValue.trim()}
                className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition-all cursor-pointer
                  ${saving || !inputValue.trim()
                    ? 'bg-slate-100 text-slate-400'
                    : 'bg-primary-500 text-white hover:bg-primary-600 active:scale-95'}`}
              >
                {saving ? '保存中...' : '确定'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── 删除确认弹窗 ─── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/30 flex items-end sm:items-center justify-center z-50"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-medium text-slate-800 mb-2">
              确认删除
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              确定要删除分类「{deleteTarget.name}」吗？此操作不可恢复。
            </p>

            {deleteError && (
              <p className="text-xs text-red-400 mb-3">{deleteError}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setDeleteTarget(null)
                  setDeleteError('')
                }}
                className="flex-1 py-2.5 text-sm text-slate-500 bg-slate-100 rounded-xl
                  hover:bg-slate-200 transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 text-sm font-medium bg-red-500 text-white rounded-xl
                  hover:bg-red-600 active:scale-95 transition-all cursor-pointer"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Toast 提示 ─── */}
      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-sm
          px-4 py-2 rounded-xl shadow-lg z-50 animate-bounce">
          {toast}
        </div>
      )}
    </div>
  )
}
