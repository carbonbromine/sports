(() => {
  "use strict";

  function getPlugin() {
    return window.Capacitor?.Plugins?.PlanWidget || null;
  }

  async function update(data) {
    const plugin = getPlugin();
    if (!plugin?.update) return { available: false };
    await plugin.update(data);
    return { available: true };
  }

  async function requestPin() {
    const plugin = getPlugin();
    if (!plugin?.requestPin) return { available: false, supported: false, requested: false };
    return {
      available: true,
      ...(await plugin.requestPin())
    };
  }

  window.RhythmPlanWidget = {
    isAvailable: () => Boolean(getPlugin()?.update),
    update,
    requestPin
  };
})();
