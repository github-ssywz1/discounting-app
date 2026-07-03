---
name: build-apk
description: |
  当用户提到以下任意一种说法时使用此技能：
  "打包APK"、"构建APK"、"打包安卓"、"安卓打包"、"生成APK"、"build apk"、"出个APK"、"打个APK包"、"构建安卓版"。
  即使用户只用中文简短地说"打包"或"构建一下"，在记账app项目中也要触发。
---

# 打包 APK 技能

## 前提条件

打包前必须确认以下环境已就绪：

- **Java 21**（Amazon Corretto）
- **Android SDK**（路径见下方）
- **Gradle**（Android 项目自带 `./gradlew`）

## 构建步骤

严格按照以下顺序执行：

### 1. 设置环境变量

```bash
export ANDROID_HOME="C:/android-sdk"
export JAVA_HOME="C:/Program Files/Amazon Corretto/jdk21.0.11_10"
```

### 2. 构建网页前端

```bash
cd d:/claudecode/vibecoding/记账app/ycy-accounting
npm run build
```

如果构建失败，停止并告知用户错误信息。

### 3. 同步到 Android 项目

```bash
npx cap sync android
```

### 4. 打包 APK

```bash
cd android && ./gradlew assembleDebug
```

### 5. 确认输出

构建成功后，APK 输出在：
```
android/app/build/outputs/apk/debug/app-debug.apk
```

将此 APK 文件复制到项目根目录下，命名为 `ycy记账.apk`：

```bash
cp android/app/build/outputs/apk/debug/app-debug.apk ../ycy记账.apk
```

### 6. 告知用户

告诉用户：
- APK 已生成在 `ycy记账.apk`
- 文件大小
- 可以直接传到手机安装

## 如果某一步失败

- **环境变量问题**：如果 `gradlew`、`java` 或 `android` 命令找不到，检查环境变量是否正确设置
- **构建错误**：读出错误信息，分析原因，告知用户。常见问题包括：
  - TypeScript 类型错误 → 先修复再重新打包
  - Gradle 下载依赖失败 → 检查网络
  - Android SDK 版本不匹配 → 检查 `android/variables.gradle` 中的版本配置
