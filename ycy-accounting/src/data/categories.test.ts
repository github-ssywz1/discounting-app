// categories.ts 单元测试
import { describe, it, expect } from 'vitest'
import { CATEGORY_MAP, CATEGORY_LIST, getSubcategories, PRESET_CATEGORIES } from './categories'

describe('categories.ts — 分类数据处理', () => {
  describe('CATEGORY_MAP', () => {
    it('应该包含 10 个一级分类', () => {
      expect(Object.keys(CATEGORY_MAP)).toHaveLength(10)
    })

    it('每个一级分类都应该有对应的二级分类列表', () => {
      for (const [key, subs] of Object.entries(CATEGORY_MAP)) {
        expect(Array.isArray(subs)).toBe(true)
        expect(subs.length).toBeGreaterThan(0)
        expect(key).toBeTruthy()
      }
    })

    it('所有二级分类都不应为空字符串', () => {
      for (const subs of Object.values(CATEGORY_MAP)) {
        for (const name of subs) {
          expect(name).toBeTruthy()
          expect(typeof name).toBe('string')
        }
      }
    })
  })

  describe('CATEGORY_LIST', () => {
    it('应该和 CATEGORY_MAP 的 key 完全一致', () => {
      expect(CATEGORY_LIST).toEqual(Object.keys(CATEGORY_MAP))
    })
  })

  describe('getSubcategories()', () => {
    it('传入已知分类应返回对应的二级分类列表', () => {
      expect(getSubcategories('餐饮饮食')).toEqual(CATEGORY_MAP['餐饮饮食'])
      expect(getSubcategories('交通出行')).toEqual(CATEGORY_MAP['交通出行'])
    })

    it('传入不存在的分类应返回空数组', () => {
      expect(getSubcategories('不存在的分类')).toEqual([])
    })

    it('传入空字符串应返回空数组', () => {
      expect(getSubcategories('')).toEqual([])
    })
  })

  describe('PRESET_CATEGORIES', () => {
    it('长度应该和一级分类数量一致', () => {
      expect(PRESET_CATEGORIES).toHaveLength(CATEGORY_LIST.length)
    })

    it('每条记录应有 name 和 subcategories 字段', () => {
      for (const preset of PRESET_CATEGORIES) {
        expect(preset).toHaveProperty('name')
        expect(preset).toHaveProperty('subcategories')
        expect(Array.isArray(preset.subcategories)).toBe(true)
      }
    })
  })
})
