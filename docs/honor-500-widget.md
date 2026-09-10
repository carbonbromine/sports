# 荣耀 500 桌面健康卡片

## 兼容方式

桌面卡片使用 Android 标准 `AppWidgetProvider` 实现，不依赖荣耀私有 API。荣耀 500 的 MagicOS 桌面可在以下位置找到：

```text
桌面双指捏合
  -> 卡片
  -> 经典小组件
  -> 律动
  -> 添加到桌面
```

App 内“我的 > 桌面健康卡片”也会调用 Android 8.0 及以上系统的 `requestPinAppWidget`，由桌面弹出添加确认。

荣耀官方添加经典小组件说明：
[Widgets Are Missing from the Home Screen](https://www.honor.com/my/support/content/en-us00409513/)

## 卡片内容

卡片采用 4×2 初始尺寸，并支持桌面横向、纵向调整：

- 今日步数与步数目标
- 步数进度条
- 最新心率
- 昨夜睡眠时长
- 今日热量结余
- 下一项运动或饮食计划
- 数据来源与最后更新时间

点击卡片任意位置会打开律动 App。

## 数据同步

Web 层通过 `home-widget.js` 调用原生 `HomeWidget` Capacitor 插件。插件将摘要写入 Android `SharedPreferences`，再主动通知所有桌面 Widget 刷新。

```text
Web 数据模型
  -> HomeWidget.update()
  -> SharedPreferences
  -> AppWidgetManager
  -> HealthSummaryWidget
```

以下操作会触发刷新：

- App 启动
- HUAWEI Health 数据同步
- 完成或恢复计划
- 添加、修改或删除热量记录
- 修改食物份量或运动消耗后保存

桌面卡片每 30 分钟也会由系统触发一次更新，但只读取最近缓存。Android 系统不会在后台唤醒 WebView 重新请求 HUAWEI Health；需要实时数据时应打开 App 完成同步。

## 工程结构

可提交的原生模板位于：

```text
native/android/app/src/main/
```

`scripts/prepare-android.js` 在每次构建时把模板应用到 Capacitor 生成的 `android/` 目录，因此删除生成目录后仍可完整重建。

关键实现：

- `HealthSummaryWidget.java`：读取缓存并更新 RemoteViews
- `HomeWidgetPlugin.java`：接收 Web 数据并请求固定到桌面
- `widget_health_summary.xml`：卡片布局
- `health_summary_widget_info.xml`：尺寸、刷新周期和桌面类别

## 限制

- 当前是 Android/MagicOS 桌面组件，iOS 不支持该实现。
- 厂商桌面可能对圆角、内边距进行二次处理。
- 用户移除卡片后，App 不会自动重新添加。
- 手环未连接时卡片显示“未连接”并使用空值，不生成模拟健康测量。
