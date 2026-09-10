(() => {
  "use strict";

  const REQUIRED_SCOPES = [
    "steps.read",
    "distance.read",
    "calories.read",
    "activity.read",
    "heartrate.read",
    "sleep.read",
    "spo2.read",
    "stress.read"
  ];

  function emptySnapshot() {
    return {
      mode: "unavailable",
      device: {
        name: "HUAWEI Band 6",
        connected: false,
        source: "HUAWEI Health",
        updatedAt: null
      },
      activity: {
        steps: 0,
        stepGoal: 10000,
        distanceKm: 0,
        caloriesKcal: 0,
        activeMinutes: 0
      },
      heartRate: {
        latest: null,
        resting: null,
        min: null,
        max: null,
        updatedAt: null,
        samples: []
      },
      sleep: {
        totalMinutes: 0,
        score: null,
        deepMinutes: 0,
        lightMinutes: 0,
        remMinutes: 0,
        awakeMinutes: 0,
        stages: []
      },
      spo2: {
        latest: null,
        min: null,
        updatedAt: null
      },
      stress: {
        latest: null,
        level: null,
        updatedAt: null
      },
      workouts: []
    };
  }

  function getNativePlugin() {
    return window.Capacitor?.Plugins?.HuaweiHealth || null;
  }

  async function getStatus() {
    const plugin = getNativePlugin();
    if (!plugin?.getStatus) {
      return { available: false, authorized: false, mode: "unavailable" };
    }
    return plugin.getStatus();
  }

  async function connect() {
    const plugin = getNativePlugin();
    if (!plugin?.authorize) {
      return { available: false, authorized: false, mode: "unavailable" };
    }
    return plugin.authorize({ scopes: REQUIRED_SCOPES });
  }

  async function sync() {
    const plugin = getNativePlugin();
    if (!plugin?.readDashboard) {
      throw new Error("当前安装包尚未配置 HUAWEI Health Service Kit");
    }

    const snapshot = await plugin.readDashboard({
      startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date().toISOString()
    });
    return {
      ...snapshot,
      mode: "live",
      device: {
        name: "HUAWEI Band 6",
        source: "HUAWEI Health",
        connected: true,
        ...snapshot.device
      }
    };
  }

  window.RhythmHuaweiHealth = {
    scopes: [...REQUIRED_SCOPES],
    emptySnapshot,
    getStatus,
    connect,
    sync
  };
})();
