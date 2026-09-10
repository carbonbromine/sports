# HUAWEI Band 6 数据接入设计

## 结论

HUAWEI Band 6 可以作为本应用的数据源，但接入链路不是由应用直接连接手环蓝牙：

```text
HUAWEI Band 6
  -> HUAWEI Health
  -> Health Service Kit
  -> Capacitor 原生插件
  -> Web 数据看板
```

华为官方的“直接获取智能表数据”能力目前只支持 WATCH 3/4 系列且要求 HarmonyOS 3.0.0 及以上，因此不适用于 Band 6。Band 6 应先与 HUAWEI Health 完成同步，再由本应用在用户授权后读取 Health Service Kit 数据。

## 可接入数据

| 模块 | Band 6 能力 | Health Service Kit | 当前界面 |
| --- | --- | --- | --- |
| 日常活动 | 步数、距离、卡路里、活动时长 | 支持读取，通常为小时级更新 | 活动圆环与三个摘要指标 |
| 心率 | 全天心率、静息心率、运动心率 | 支持读取，通常为小时级更新 | 最新值、日内区间、趋势、静息心率 |
| 睡眠 | 总时长、深睡、浅睡、REM、清醒 | 支持睡眠记录与分期，通常为分钟级更新 | 睡眠分、分期时间轴和时长 |
| 血氧 | 单次及自动血氧 | 支持读取，通常为小时级更新 | 最新值、当日最低值 |
| 压力 | 全天压力 | 开启自动压力检测后可读取 | 最新压力值与状态 |
| 锻炼记录 | 跑步、骑行、游泳、跳绳、自由训练等 | 支持摘要及部分明细数据 | 最近运动、时长、距离、热量、平均心率 |

Band 6 不提供可用于本看板的体温、ECG、血压数据，因此不设计这些板块。户外轨迹依赖配对手机的 GPS 和对应位置数据授权，不能假定手环独立产生轨迹。

## 同步与授权限制

1. 用户需要安装 HUAWEI Health、登录 HUAWEI ID，并让手环数据先同步到 HUAWEI Health。
2. 应用需要在华为开发者后台开通 Health Service Kit，并申请实际使用的数据权限。
3. 应用包名、签名证书指纹和 AppGallery Connect 配置必须一致。当前 Debug 签名仅适合本地测试。
4. 用户必须逐项授权；拒绝某项权限时，其余功能仍应可用。
5. 测试权限最多支持 100 个测试用户。正式发布前需要提交服务验证，官方说明审核约为 15 个工作日。
6. 手环、手机蓝牙、网络或 HUAWEI Health 后台运行状态都会影响数据及时性，因此界面必须展示“最后同步时间”，不能标记为实时数据。

## 建议申请的数据权限

首版只申请看板实际使用的读取权限：

- 步数
- 距离
- 卡路里
- 中高强度活动
- 心率
- 睡眠
- 血氧
- 压力
- 锻炼记录

不申请写权限、体温、血压、ECG、生理周期等无关范围，以符合数据最小化原则。

## 当前代码边界

`huawei-health.js` 定义了 Web 层数据适配器：

- `getStatus()`：检查原生插件与授权状态。
- `connect()`：发起 Health Service Kit 用户授权。
- `sync()`：获取近七天数据并转换成统一看板模型。
- `demoSnapshot()`：在未集成华为凭据时提供明确标注的演示数据。

原生 Capacitor 插件需暴露以下接口：

```text
HuaweiHealth.getStatus()
HuaweiHealth.authorize({ scopes })
HuaweiHealth.readDashboard({ startTime, endTime })
```

正式接入时应在 Android 原生层完成 Health Service Kit SDK 初始化、授权和查询，不应在 WebView 中保存 Access Token。Web 层只接收展示所需的聚合结果。

## 待提供配置

- 华为开发者账号及 Health Service Kit 服务开通状态
- AppGallery Connect 项目和 Android 应用
- 包名 `com.carbonbromine.sports`
- 发布签名证书 SHA-256 指纹
- `agconnect-services.json`
- 获批的数据读取权限范围
- 与应用主体一致的隐私政策

## 官方依据

- [Health Service Kit 开放数据总览](https://developer.huawei.com/consumer/en/doc/HMSCore-Guides/data_description-0000001467889369)
- [HUAWEI Health 用户授权](https://developer.huawei.com/consumer/en/doc/HMSCore-Guides/add-permissions-0000001050069726)
- [Health Service Kit 服务验证](https://developer.huawei.com/consumer/en/doc/development/HMSCore-Guides/verification-0000001211587947)
- [智能表直接数据获取的设备限制](https://developer.huawei.com/consumer/cn/doc/HMScore-Guides/obtain-smart-watch-data-0000001365189921)
- [HUAWEI Band 6 官方能力说明](https://consumer.huawei.com/sg/wearables/band6/)
