(() => {
  "use strict";

  const SOURCE = "rhythm-plan";
  let cachedPermission = "prompt";

  function getPlugin() {
    return window.Capacitor?.Plugins?.LocalNotifications || null;
  }

  function isNativeAvailable() {
    return Boolean(window.Capacitor?.isNativePlatform?.() && getPlugin());
  }

  function browserPermission() {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
  }

  function getCachedPermission() {
    return isNativeAvailable() ? cachedPermission : browserPermission();
  }

  async function checkPermission() {
    const plugin = getPlugin();
    if (!isNativeAvailable() || !plugin?.checkPermissions) {
      cachedPermission = browserPermission();
      return cachedPermission;
    }
    const result = await plugin.checkPermissions();
    cachedPermission = result.display;
    return cachedPermission;
  }

  async function requestPermission() {
    const plugin = getPlugin();
    if (!isNativeAvailable() || !plugin?.requestPermissions) {
      if (!("Notification" in window)) return "unsupported";
      cachedPermission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      return cachedPermission;
    }
    const result = await plugin.requestPermissions();
    cachedPermission = result.display;
    return cachedPermission;
  }

  function notificationId(task) {
    const input = `${task.id}:${task.date}:${task.time}`;
    let hash = 2166136261;
    for (let index = 0; index < input.length; index += 1) {
      hash ^= input.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) % 2147483646 + 1;
  }

  function reminderDate(task) {
    const [year, month, day] = String(task.date).split("-").map(Number);
    const [hour, minute] = String(task.time).split(":").map(Number);
    const at = new Date(year, month - 1, day, hour, minute, 0, 0);
    at.setMinutes(at.getMinutes() - Number(task.reminder || 0));
    return at;
  }

  function notificationBody(task) {
    if (task.type === "meal") {
      return `${task.time} · 饮食计划${task.note ? ` · ${task.note}` : ""}`;
    }
    return `${task.time} · ${task.duration || 0} 分钟${task.note ? ` · ${task.note}` : ""}`;
  }

  async function cancelPending() {
    const plugin = getPlugin();
    if (!isNativeAvailable() || !plugin?.getPending) return;
    const pending = await plugin.getPending();
    const notifications = (pending.notifications || [])
      .filter((item) => !item.extra?.source || item.extra.source === SOURCE)
      .map((item) => ({ id: item.id }));
    if (notifications.length) {
      await plugin.cancel({ notifications });
    }
  }

  async function sync(tasks, enabled) {
    const plugin = getPlugin();
    if (!isNativeAvailable() || !plugin?.schedule) return { native: false, scheduled: 0 };

    await cancelPending();
    if (!enabled || cachedPermission !== "granted") {
      return { native: true, scheduled: 0 };
    }

    const now = Date.now();
    const notifications = (Array.isArray(tasks) ? tasks : [])
      .filter((task) => !task.done && reminderDate(task).getTime() > now)
      .sort((a, b) => reminderDate(a) - reminderDate(b))
      .map((task) => ({
        id: notificationId(task),
        title: `该进行「${task.title}」了`,
        body: notificationBody(task),
        schedule: {
          at: reminderDate(task),
          allowWhileIdle: true
        },
        autoCancel: true,
        extra: {
          source: SOURCE,
          taskId: task.id
        }
      }));

    if (notifications.length) {
      await plugin.schedule({ notifications });
    }
    return { native: true, scheduled: notifications.length };
  }

  window.RhythmNotifications = {
    isNativeAvailable,
    getCachedPermission,
    checkPermission,
    requestPermission,
    sync,
    cancelPending
  };
})();
