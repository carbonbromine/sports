# 律动健康计划

一个专注于计划编写、导入、完成跟踪和到时提醒的移动端应用。

当前精简分支只包含：

- 手动添加运动或饮食计划
- CSV / JSON 批量导入与 JSON 导出
- Android 原生计划提醒
- 展示今日进度和下一项安排的 Android 桌面组件

## 本地运行

```bash
python3 -m http.server 4177 --bind 127.0.0.1
```

访问 `http://127.0.0.1:4177`。计划与完成记录保存在浏览器 `localStorage` 中。

## 一键生成 Android APK

在 macOS 上双击 `build-apk.command`，或者在终端运行：

```bash
./build-apk.sh
```

脚本会自动完成以下步骤：

1. 选择 Node.js 20 或更高版本，并检测 JDK 21。
2. 缺少 JDK 21 时下载并校验 Eclipse Temurin 到用户缓存目录。
3. 检测 Android SDK；缺失时从 Google 官方源下载并校验命令行工具。
4. 接受 Android SDK 许可并安装所需编译组件。
5. 安装固定版本的 Capacitor 依赖并创建 Android 工程。
6. 同步最新 Web 资源、原生提醒和桌面组件并生成 Debug APK。

构建产物固定输出到：

```text
dist/rhythm-plan-debug.apk
```

首次构建可能需要联网下载 JDK、Android SDK 和 Gradle，后续构建会复用本地缓存。Debug APK 可直接在开启“允许安装未知来源应用”的 Android 设备上安装。

## 导入格式

支持 CSV 和 JSON，单次最多 500 条、文件最大 2 MB。CSV 示例见 `example-plan.csv`，核心字段为：

```text
日期,时间,类型,名称,时长,提醒,备注
2026-09-10,07:30,运动,晨间慢跑,30,15,保持轻松呼吸
```

JSON 可直接传入计划数组，也可使用 `{ "plans": [...] }` 或 `{ "tasks": [...] }`。

## 提醒说明

Android APK 使用系统本地通知，即使应用退出仍可调度提醒。Android 13 及以上首次开启时需要允许通知；部分系统还需要在应用设置中允许“闹钟和提醒”。

浏览器版本使用 Web Notification，浏览器彻底退出后不保证准时唤醒。

## 桌面组件

在“计划”页点击“桌面计划组件”。支持系统固定组件时会直接弹出添加确认；否则在桌面组件列表中搜索“律动计划”。组件展示今日完成数、下一项计划、时间和备注，点击组件可打开应用。
