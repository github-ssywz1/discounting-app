---
name: unit-test
description: |
  当用户提到以下任意一种说法时使用此技能：
  "单元测试"、"写测试"、"跑测试"、"测试一下"、"执行测试"、"test"、"添加测试"、"创建测试"、"帮我写测试"、"测一下"、"测试报告"、"运行测试"。
  即使用户只用中文简短地说"测试"或"写个测试"，在记账app项目中也要触发。
---

# 单元测试技能（Vitest）

## 前提条件

- 项目是基于 Vite + React + TypeScript 的前端项目
- Node.js 环境已安装（`npm` 可用）

## 执行流程

严格按照以下顺序执行：

### 1. 检查 Vitest 是否已安装

检查 `package.json` 的 `devDependencies` 中是否已经有 `vitest`。

如果没有，运行以下命令安装：

```bash
cd d:/claudecode/vibecoding/记账app/ycy-accounting
npm install -D vitest
```

### 2. 创建 Vitest 配置文件

检查项目根目录是否已有 `vitest.config.ts`。如果没有，创建一个：

```typescript
// vitest.config.ts — Vitest 测试配置
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    // 在 Node 环境下运行测试（适合纯逻辑，不涉及浏览器 DOM）
    environment: 'node',
    // 测试文件匹配规则：所有 .test.ts 或 .test.tsx 文件
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // 全局 API（可选，让 describe/it/expect 无需 import）
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

同时更新 `package.json`，在 `scripts` 中添加测试命令：

```json
"test": "vitest run",
"test:watch": "vitest"
```

**注意**：修改 `package.json` 时只添加这两个脚本，不要改动其他任何配置。

### 3. 分析项目中的逻辑代码

查看 `src/` 目录中的文件，识别哪些文件包含**可测试的纯逻辑**：

- **数据类型文件**（如 `src/types/index.ts`）：只有类型定义，**不需要测试**
- **纯逻辑文件**（如 `src/data/categories.ts`）：包含导出的函数、常量，**需要测试**
- **数据库操作文件**（如 `src/data/db.ts`）：依赖外部库（sql.js WASM），**需要特殊处理**（见下文）
- **React 组件文件**（如 `src/components/*.tsx`）：界面组件，**不在测试范围内**

### 4. 创建测试文件

为每个需要测试的逻辑文件创建对应的 `.test.ts` 文件，放在**同一目录下**。

#### 4.1 测试纯逻辑（以 categories.ts 为例）

创建 `src/data/categories.test.ts`：

```typescript
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
```

#### 4.2 处理数据库操作文件（db.ts）

`db.ts` 依赖 `sql.js`（浏览器内运行的 SQLite WASM），在 Node 环境下无法直接运行。

**处理方法**：为 db.ts 创建测试文件 `src/data/db.test.ts`，但只测试**不依赖数据库的纯逻辑部分**，或者使用 **Mock（模拟）** sql.js 的行为。

如果 db.ts 中没有独立于数据库的纯逻辑，则在报告中说明：
> "db.ts 全部逻辑依赖 sql.js WASM，当前环境无法直接测试，跳过。建议后续搭建浏览器环境测试或使用 Mock。"

**实际处理**：由于 db.ts 中所有导出函数都依赖 `ensureDb()`，在 Node 环境下需要 Mock。优先级：先测 categories.ts，对 db.ts 在报告中标注"跳过（需要浏览器环境）"。

### 5. 运行测试

```bash
cd d:/claudecode/vibecoding/记账app/ycy-accounting
npx vitest run
```

### 6. 整理测试报告

根据运行输出，用中文向用户汇报：

- ✅ 共 X 个测试，全部通过
- ❌ 共 X 个测试，Y 个通过，Z 个失败

如果测试失败，逐条列出失败信息：
- 哪个文件的哪个测试失败
- 期望值是什么，实际值是什么
- 可能的原因分析

如果某个文件被跳过（如 db.ts），在报告中说明原因。

格式示例：
```
📊 测试报告

✅ 通过: 8 个
❌ 失败: 1 个
⏭️ 跳过: db.ts（依赖浏览器环境，需单独处理）

失败详情:
  src/data/categories.test.ts > getSubcategories() > 传入空字符串应返回空数组
  期望: []
  实际: undefined
  可能原因: 函数未处理空字符串边界情况
```

## 如果某一步失败

- **安装失败**：检查网络连接，尝试 `npm install -D vitest --registry https://registry.npmmirror.com`
- **测试配置报错**：检查 `vitest.config.ts` 语法是否正确，`include` 路径是否匹配
- **测试执行报错**：读出错误信息，分析是代码 bug 还是测试代码写错了，告知用户
- **TypeScript 类型错误**：如果是测试文件中的类型问题，根据具体错误修复
