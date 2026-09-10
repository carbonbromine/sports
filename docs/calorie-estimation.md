# 热量估算设计

## 功能边界

热量数据分为三部分：

1. 饮食摄入：照片识别食物类别，再结合用户校正后的份量和食物热量库计算。
2. 活动消耗：优先使用平均心率模型；心率不可用时使用运动类型对应的 MET 模型。
3. 基础消耗：使用身高、体重、年龄和性别计算静息能量消耗，并按当天已过去时间折算。

所有结果都是估算值。食物烹饪方式、调味油和隐藏配料会影响摄入结果；环境温度、药物、压力和个体体能会影响心率模型。

## 拍照识别

Web 层入口位于 `nutrition-estimator.js`，按以下优先级选择识别服务：

1. Capacitor 原生插件 `FoodCalorieEstimator.estimateMeal`
2. `window.RhythmConfig.foodEstimatorEndpoint` 配置的服务端接口

未配置上述任一识别服务时，应用不会根据文件名随机生成结果，而是明确提示图片识别尚未配置。此时仍可按食物营养表填写名称、实际份量和每 100 克热量，应用使用以下公式记录：

```text
摄入热量 = 实际份量克数 * 每 100 克热量 / 100
```

生产接口接受 `multipart/form-data`：

```text
POST {foodEstimatorEndpoint}
image: <JPG | PNG | HEIC>
```

返回结构：

```json
{
  "items": [
    {
      "name": "杂粮米饭",
      "portionGrams": 180,
      "kcalPer100g": 116,
      "confidence": 0.91
    }
  ]
}
```

华为 ML Kit 的图像分类与目标检测可以识别 `food` 类别，但热量仍需要食物细分类模型、份量估算和营养数据库共同完成，不能只依赖一个分类标签。

## 运动消耗

当平均心率明显高于静息心率时，使用 Keytel 心率回归：

```text
男性 kcal/min =
  (-55.0969 + 0.6309 * HR + 0.1988 * 体重kg + 0.2017 * 年龄) / 4.184

女性 kcal/min =
  (-20.4022 + 0.4472 * HR - 0.1263 * 体重kg + 0.074 * 年龄) / 4.184
```

没有可靠心率时使用 MET：

```text
kcal/min = MET * 3.5 * 体重kg / 200
```

当前内置 MET：

| 运动 | MET |
| --- | ---: |
| 快走 | 4.3 |
| 跑步 | 8.3 |
| 骑行 | 7.5 |
| 游泳 | 6.0 |
| 力量训练 | 5.0 |
| 瑜伽 | 2.8 |
| 其他运动 | 5.0 |

基础代谢采用 Mifflin-St Jeor 公式：

```text
女性 BMR = 10 * 体重kg + 6.25 * 身高cm - 5 * 年龄 - 161
男性 BMR = 10 * 体重kg + 6.25 * 身高cm - 5 * 年龄 + 5
```

页面中的“基础消耗”按当天已经过去的分钟数折算，而不是直接展示整日 BMR。

## 血压处理

血压不是本实现中的热量计算变量，只用于运动前风险提示：

- 收缩压不低于 180 或舒张压不低于 120：提示停止剧烈运动、复测并在伴随不适时及时就医。
- 收缩压不低于 140 或舒张压不低于 90：提示降低运动强度。
- 收缩压低于 90 或舒张压低于 60：提示关注头晕、乏力等反应。

该提示不构成诊断或医疗建议。

## 汇总口径

```text
今日摄入 = 已完成的饮食计划 + 拍照确认的食物
活动消耗 = 手环活动消耗 + 手动确认的运动估算
今日热量结余 = 今日摄入 - 截至当前的基础消耗 - 活动消耗
```

用户应只把尚未包含在手环活动消耗中的运动手动计入，避免重复计算。

## 参考

- [HUAWEI ML Kit 图像分类](https://developer.huawei.com/consumer/en/doc/development/hiai-Guides/image-classification-0000001050040095)
- [HUAWEI ML Kit 目标检测](https://developer.huawei.com/consumer/en/doc/hiai-guides/object-detection-track-0000001050038150)
- Keytel LR et al. Prediction of energy expenditure from heart rate monitoring during submaximal exercise. Journal of Sports Sciences. 2005;23(3):289-297.
- [Mifflin-St Jeor 静息能量公式](https://www.ncbi.nlm.nih.gov/books/NBK278991/table/diet-treatment-obes.table12est/)
