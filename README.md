# 记账app

个人日常记账工具，帮助用户记录每一笔人民币花销。数据 100% 保存在本地，无需联网。

## 功能

- **记账** — 金额输入 + 两级分类选择 + 日期 + 备注
- **明细** — 按日期分组列表，支持按月份和分类筛选，支持删除
- **统计** — 月份选择 + 月度总支出 + 分类排行 + 比例条
- **分类管理** — 支持新增、重命名、删除自定义分类（预置分类不可修改）

## 技术栈

| 项目 | 选择 |
|------|------|
| 框架 | React 19 + TypeScript |
| 构建工具 | Vite |
| 样式 | Tailwind CSS |
| 数据存储 | SQLite（sql.js WASM 版，浏览器内运行） |
| 移动端 | PWA + Android APK（Capacitor） |

## 本地运行

```bash
cd ycy-accounting
npm install
npm run dev        # 开发模式，浏览器打开 http://localhost:5173
npm run build      # 构建生产版本到 dist/
```

## 安卓 APK

将 `ycy-accounting/android/app/build/outputs/apk/debug/app-debug.apk` 传到手机安装即可。

重新打包 APK（需安装 Java 21 + Android SDK）：

```bash
cd ycy-accounting
npm run build
npx cap sync android
cd android && ./gradlew assembleDebug
```

## 版本

| 标签 | 说明 |
|------|------|
| v1.2 | 添加 README.md，项目文档完善 |
| v1.1 | 新增分类管理：用户可增删改自定义分类 |
| v1.0 | 初版完成：记账 + 明细 + 统计，PWA + APK 支持 |

## 隐私

所有数据存储在浏览器本地（localStorage / SQLite），不上传到任何服务器。
