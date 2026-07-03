---
name: security-audit
description: |
  当用户提到以下任意一种说法时使用此技能：
  "安全检查"、"安全审查"、"安全审计"、"security audit"、"代码安全检查"、"查一下安全问题"、"有没有安全漏洞"、"安全隐患"、"安全扫描"、"security check"。
  即使用户只用中文简短地说"安全检查"或"安全审查"，在记账app项目中也要触发。
---

# 安全审计技能

## 检查目标

对项目进行全面安全检查，覆盖源代码和配置文件。检查完毕后自动修复发现的问题，并给出报告。

---

## 执行流程

严格按照以下顺序执行：

### 第 1 步：收集文件

**源代码**：
- Glob 搜索 `src/**/*.ts` 和 `src/**/*.tsx`

**配置文件**：
- 读取项目根目录下的配置文件：
  - `package.json`
  - `vite.config.ts`
  - `tsconfig.json`
  - `vitest.config.ts`
  - `.claude/settings.json`
  - `.claude/settings.local.json`
- Glob 搜索 `android/` 下的配置文件：
  - `android/**/*.gradle`
  - `android/**/*.properties`
  - `android/**/*.xml`
- Glob 搜索 `.env` 类文件：
  - `**/.env`
  - `**/.env.*`

### 第 2 步：逐项检查

对收集到的每个文件进行以下四项检查。对问题分严重等级：

- 🔴 **高危（Critical）**：确定会造成安全漏洞，必须立即修复
- 🟡 **中危（Medium）**：存在风险但不一定马上被利用
- 🔵 **低危（Low）**：不好的实践，建议改进

---

#### 检查项 A — 敏感信息泄露

在代码和配置文件中搜索以下模式：

| 危险模式 | 说明 | 示例 |
|----------|------|------|
| 硬编码密钥/Token | 代码中直接写死的 API Key、Token、密钥 | `const apiKey = "sk-xxx"` |
| 硬编码密码 | 代码或配置中的明文密码 | `password: "123456"` |
| 个人信息 | 手机号、身份证号、邮箱等（除非必要） | 作者信息除外 |
| 内网地址 | 非公开的 IP 地址、内部域名 | `192.168.1.x`、`internal.corp.com` |

**检查方式**：
- 用 Grep 搜索关键词：`password`、`secret`、`token`、`key`、`apiKey`、`API_KEY`、`private`、`credential`
- 对匹配结果逐条判断是否属于硬编码敏感信息

**判定与修复**：
- 🔴 发现硬编码密钥/Token → 替换为环境变量引用 + 注释说明
- 🔴 发现硬编码密码 → 删除，替换为 `process.env.XXX` 或移除
- 🔴 发现个人隐私信息（手机号等不可公开的）→ 脱敏或删除
- 🟡 发现内网地址 → 替换为占位符

**修复方法**：
```
# 修复前
const API_KEY = "sk-abc123xyz"

# 修复后
// API 密钥从环境变量读取，不要硬编码在代码中
const API_KEY = import.meta.env.VITE_API_KEY || ''
```

---

#### 检查项 B — SQL / 数据注入漏洞

检查所有数据库操作代码（特指 `src/data/db.ts` 中的 `sql.js` 查询）：

| 危险模式 | 说明 | 示例 |
|----------|------|------|
| 字符串拼接 SQL | 用 `+` 或模板字符串拼接用户输入进 SQL | `` `SELECT * FROM users WHERE name = '${userInput}'` `` |
| 未参数化的查询 | SQL 执行时传入原始字符串而非参数绑定 | `db.exec("SELECT * FROM expenses WHERE id = " + id)` |
| LIKE 查询注入 | LIKE 参数中包含用户输入未转义 | `` `SELECT * FROM t WHERE name LIKE '%${input}%'` `` |

**检查方式**：
- 读取 `db.ts`（及其他数据库操作文件），逐条检查 SQL 语句
- 确认是否使用了**参数绑定**（用 `?` 占位符 + `stmt.bind([...])`）
- 对于 `LIKE` 查询，检查用户输入是否经过了转义

**判定与修复**：
- 🔴 发现字符串拼接 SQL → 改为参数化查询（用 `?` 占位符 + `.bind()`）
- 🟡 LIKE 查询未转义特殊字符（`%`、`_`）→ 添加转义函数

**修复方法**：
```typescript
// 修复前（有注入风险）
const sql = `SELECT * FROM expenses WHERE note = '${userNote}'`

// 修复后（参数化查询）
const stmt = db.prepare('SELECT * FROM expenses WHERE note = ?')
stmt.bind([userNote])
```

---

#### 检查项 C — 配置文件中明文敏感信息

检查所有非代码配置文件：

| 危险模式 | 说明 |
|----------|------|
| `.env` 文件提交到 Git | `.env` 不在 `.gitignore` 中 |
| 配置文件中的密钥 | JSON/YAML/XML 配置中的 API Key、密码 |
| Gradle 签名配置 | Android 签名密钥明文写在 gradle 中 |
| 调试开关开启 | 生产环境仍开启 debug 模式 |

**检查方式**：
- 检查 `package.json` 中是否有敏感字段（如 `_password`、`privateKey`）
- 检查 `android/app/build.gradle` 等文件中是否有硬编码签名信息
- 检查 `vite.config.ts` 中是否有环境变量泄露
- Grep 搜索 `debug`、`DEBUG`、`isDebug`，确认生产构建是否关闭

**判定与修复**：
- 🔴 配置文件中有密钥 → 移除，替换为占位符或引用环境变量
- 🔴 `.env` 文件未被 `.gitignore` → 添加到 `.gitignore`
- 🟡 Gradle 签名信息硬编码 → 改用环境变量或 `local.properties`
- 🔵 生产构建可能开启调试 → 在 build 脚本中确认关闭

---

#### 检查项 D — 其他安全隐患

针对本项目特点，额外检查：

| 检查项 | 说明 |
|--------|------|
| **XSS 风险** | React 中是否使用了 `dangerouslySetInnerHTML` |
| **localStorage 安全** | 敏感数据是否加密后存入 localStorage |
| **依赖漏洞** | `package.json` 中依赖是否有已知漏洞 |
| **无输入验证** | 用户输入（金额、备注）是否在前端做了基本验证 |
| **console.log 残留** | 是否有调试日志暴露敏感数据 |
| **硬编码 URL** | 是否有写死的第三方网址或 API 地址 |

**检查方式**：
- Grep 搜索 `dangerouslySetInnerHTML`、`innerHTML`、`document.write`
- 检查 `localStorage.setItem` 调用的参数中是否有敏感信息
- 运行 `npm audit` 检查依赖漏洞
- 检查 `AddExpense.tsx` 中是否有输入校验（金额范围、备注长度限制等）
- Grep 搜索 `console.log` 和 `console.debug`，确认是否残留调试日志

**判定与修复**：
- 🔴 发现 `dangerouslySetInnerHTML` 且传入用户输入 → 改用 React 安全渲染
- 🔴 `npm audit` 发现高危漏洞 → 尝试 `npm audit fix` 修复
- 🟡 用户输入无验证 → 添加基本的校验逻辑（金额 > 0、备注长度限制）
- 🔵 `console.log` 残留 → 删除或改为 `// console.log` 注释（方便开发时恢复）
- 🔵 明文存储到 localStorage → 考虑是否需要加密（本项目为纯本地应用，风险较低，记录即可）

---

### 第 3 步：修复问题

按照方案 B，对发现的问题自动修复。注意以下原则：

- **可以放心自动修复的**：SQL 注入修复（参数化查询）、添加 `.gitignore`、删除 console.log、添加输入验证
- **需要谨慎处理的**：密钥类信息替换为占位符时，保留注释说明原值用途
- **不要擅自修改的**：涉及业务逻辑的安全问题，修复后特别标注让用户确认

### 第 4 步：生成报告

按以下格式输出报告：

```
🔒 安全审计报告

📁 检查范围: X 个源码文件 + Y 个配置文件

━━━━━━━━━━━━━━━━━━

🔴 高危问题: N 个（已全部修复）
🟡 中危问题: M 个（已全部修复）
🔵 低危问题: K 个（已全部修复）

━━━━━━━━━━━━━━━━━━

📄 src/data/db.ts
  🔴 SQL注入风险: 第XX行 LIKE 查询未转义 → 已修复
  🟡 无输入验证: addExpense() 缺少金额校验 → 已添加

📄 .env
  🔴 明文密钥: API_KEY 硬编码 → 已替换为占位符

📄 android/app/build.gradle
  🟡 签名配置硬编码 → 已改为环境变量引用

━━━━━━━━━━━━━━━━━━

### 审计结论

（一段简短总结，评估项目整体安全状况）
```

---

## 如果某一步失败

- **`npm audit` 失败**：可能是网络问题，跳过依赖检查并在报告中说明
- **文件读写失败**：检查文件权限，告知用户
- **Grep 搜索无结果**：说明该项检查通过，没有问题
- **修复导致语法错误**：回滚该修复，改为在报告中说明"需要手动处理"
