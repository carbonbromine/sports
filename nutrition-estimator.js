(() => {
  "use strict";

  function normalizeItems(items) {
    return (Array.isArray(items) ? items : [])
      .map((item, index) => ({
        id: String(item.id || `food-${Date.now()}-${index}`),
        name: String(item.name || item.label || "未识别食物").slice(0, 30),
        portionGrams: Math.max(1, Math.min(2000, Number(item.portionGrams || item.grams || 100))),
        kcalPer100g: Math.max(0, Math.min(1000, Number(item.kcalPer100g || item.caloriesPer100g || 0))),
        confidence: Math.max(0, Math.min(1, Number(item.confidence || 0)))
      }))
      .filter((item) => item.kcalPer100g > 0);
  }

  function totalCalories(items) {
    return Math.round(items.reduce(
      (sum, item) => sum + (item.portionGrams * item.kcalPer100g) / 100,
      0
    ));
  }

  function normalizeResult(result, mode) {
    const items = normalizeItems(result?.items);
    if (!items.length) throw new Error("没有识别到可计算的食物，请重新拍摄");
    return {
      mode,
      items,
      totalCalories: totalCalories(items),
      analyzedAt: new Date().toISOString()
    };
  }

  function readAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("无法读取照片"));
      reader.readAsDataURL(file);
    });
  }

  async function estimateWithNativePlugin(plugin, file) {
    const dataUrl = await readAsDataUrl(file);
    const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
    const result = await plugin.estimateMeal({
      imageBase64: base64,
      mimeType: file.type || "image/jpeg"
    });
    return normalizeResult(result, "live");
  }

  async function estimateWithApi(endpoint, file) {
    const body = new FormData();
    body.append("image", file, file.name || "meal.jpg");
    const response = await fetch(endpoint, { method: "POST", body });
    if (!response.ok) throw new Error(`识别服务返回 ${response.status}`);
    return normalizeResult(await response.json(), "live");
  }

  async function estimatePhoto(file) {
    if (!file || !String(file.type).startsWith("image/")) {
      throw new Error("请选择 JPG、PNG 或 HEIC 食物照片");
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new Error("照片不能超过 10 MB");
    }

    const nativePlugin = window.Capacitor?.Plugins?.FoodCalorieEstimator;
    if (nativePlugin?.estimateMeal) {
      return estimateWithNativePlugin(nativePlugin, file);
    }

    const endpoint = window.RhythmConfig?.foodEstimatorEndpoint;
    if (endpoint) {
      return estimateWithApi(endpoint, file);
    }

    throw new Error("当前安装包尚未配置食物图片识别服务");
  }

  window.RhythmNutritionEstimator = {
    isAvailable: () => Boolean(
      window.Capacitor?.Plugins?.FoodCalorieEstimator?.estimateMeal ||
      window.RhythmConfig?.foodEstimatorEndpoint
    ),
    estimatePhoto,
    totalCalories
  };
})();
