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

  function demoSnapshot() {
    const now = new Date();
    const updatedAt = new Date(now.getTime() - 7 * 60 * 1000);
    return {
      mode: "demo",
      device: {
        name: "HUAWEI Band 6",
        connected: false,
        source: "HUAWEI Health",
        updatedAt: updatedAt.toISOString()
      },
      activity: {
        steps: 8642,
        stepGoal: 10000,
        distanceKm: 6.18,
        caloriesKcal: 436,
        activeMinutes: 78
      },
      heartRate: {
        latest: 76,
        resting: 62,
        min: 54,
        max: 126,
        updatedAt: updatedAt.toISOString(),
        samples: [64, 61, 59, 58, 62, 71, 89, 108, 82, 76, 73, 78, 84, 92, 86, 80, 75, 72, 76]
      },
      sleep: {
        totalMinutes: 452,
        score: 86,
        deepMinutes: 98,
        lightMinutes: 238,
        remMinutes: 94,
        awakeMinutes: 22,
        stages: [
          { type: "light", minutes: 32 },
          { type: "deep", minutes: 41 },
          { type: "light", minutes: 66 },
          { type: "rem", minutes: 24 },
          { type: "light", minutes: 58 },
          { type: "awake", minutes: 8 },
          { type: "deep", minutes: 57 },
          { type: "light", minutes: 82 },
          { type: "rem", minutes: 70 },
          { type: "awake", minutes: 14 }
        ]
      },
      spo2: {
        latest: 98,
        min: 94,
        updatedAt: updatedAt.toISOString()
      },
      stress: {
        latest: 31,
        level: "relaxed",
        updatedAt: updatedAt.toISOString()
      },
      workouts: [
        {
          id: "demo-run",
          type: "run",
          title: "户外跑步",
          startTime: new Date(now.getTime() - 23 * 60 * 60 * 1000).toISOString(),
          durationMinutes: 32,
          distanceKm: 5.4,
          caloriesKcal: 318,
          averageHeartRate: 142
        },
        {
          id: "demo-strength",
          type: "strength",
          title: "自由训练",
          startTime: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          durationMinutes: 45,
          distanceKm: 0,
          caloriesKcal: 286,
          averageHeartRate: 118
        }
      ]
    };
  }

  function getNativePlugin() {
    return window.Capacitor?.Plugins?.HuaweiHealth || null;
  }

  async function getStatus() {
    const plugin = getNativePlugin();
    if (!plugin?.getStatus) {
      return { available: false, authorized: false, mode: "demo" };
    }
    return plugin.getStatus();
  }

  async function connect() {
    const plugin = getNativePlugin();
    if (!plugin?.authorize) {
      return { available: false, authorized: false, mode: "demo" };
    }
    return plugin.authorize({ scopes: REQUIRED_SCOPES });
  }

  async function sync() {
    const plugin = getNativePlugin();
    if (!plugin?.readDashboard) {
      return demoSnapshot();
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
    demoSnapshot,
    getStatus,
    connect,
    sync
  };
})();
