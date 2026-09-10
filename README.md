# 律动健康计划

一个无需构建即可运行的移动端 PWA，用于管理运动、饮食计划并发送到时提醒。

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
6. 同步最新 Web 资源并生成 Debug APK。

构建产物固定输出到：

```text
dist/rhythm-health-debug.apk
```

首次构建可能需要联网下载 JDK、Android SDK 和 Gradle，后续构建会复用本地缓存。Debug APK 可直接在开启“允许安装未知来源应用”的 Android 设备上安装。

## 导入格式

支持 CSV 和 JSON，单次最多 500 条、文件最大 2 MB。CSV 示例见 `example-plan.csv`，核心字段为：

```text
日期,时间,类型,名称,时长,提醒,热量,备注
2026-09-10,07:30,运动,晨间慢跑,30,15,220,保持轻松呼吸
```

JSON 可直接传入计划数组，也可使用 `{ "plans": [...] }` 或 `{ "tasks": [...] }`。

## HUAWEI Band 6

数据接入结论、权限范围、界面映射和原生桥接契约见
[HUAWEI Band 6 数据接入设计](docs/huawei-band-6-integration.md)。

## 提醒说明

浏览器授权后，应用会通过系统通知提醒当前计划。Web 平台无法保证应用被操作系统彻底终止后仍准时唤醒；生产版若需要严格的后台本地提醒，应使用 Capacitor 等原生容器接入 iOS/Android 本地通知。
