(() => {
  "use strict";

  const STORAGE_KEY = "rhythm-health-state-v1";
  const NOTIFIED_KEY = "rhythm-health-notified-v1";
  const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
  const FULL_WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const ACTIVITY_METS = {
    walk: { label: "快走", met: 4.3 },
    run: { label: "跑步", met: 8.3 },
    cycling: { label: "骑行", met: 7.5 },
    swimming: { label: "游泳", met: 6 },
    strength: { label: "力量训练", met: 5 },
    yoga: { label: "瑜伽", met: 2.8 },
    other: { label: "其他运动", met: 5 }
  };

  const els = {
    pageTitle: document.querySelector("#pageTitle"),
    greeting: document.querySelector("#greeting"),
    notificationButton: document.querySelector("#notificationButton"),
    dateStrip: document.querySelector("#dateStrip"),
    todayTimeline: document.querySelector("#todayTimeline"),
    selectedDateLabel: document.querySelector("#selectedDateLabel"),
    focusCount: document.querySelector("#focusCount"),
    focusTitle: document.querySelector("#focusTitle"),
    focusSummary: document.querySelector("#focusSummary"),
    focusProgress: document.querySelector("#focusProgress"),
    planCount: document.querySelector("#planCount"),
    planList: document.querySelector("#planList"),
    planFilters: document.querySelector("#planFilters"),
    weeklyRing: document.querySelector("#weeklyRing"),
    weeklyPercent: document.querySelector("#weeklyPercent"),
    weeklySummary: document.querySelector("#weeklySummary"),
    wearableCard: document.querySelector("#wearableCard"),
    wearableDateLabel: document.querySelector("#wearableDateLabel"),
    wearableMode: document.querySelector("#wearableMode"),
    wearableStatus: document.querySelector("#wearableStatus"),
    wearableSyncTime: document.querySelector("#wearableSyncTime"),
    connectHuaweiButton: document.querySelector("#connectHuaweiButton"),
    syncHuaweiButton: document.querySelector("#syncHuaweiButton"),
    stepRing: document.querySelector("#stepRing"),
    stepsMetric: document.querySelector("#stepsMetric"),
    stepGoal: document.querySelector("#stepGoal"),
    distanceMetric: document.querySelector("#distanceMetric"),
    activeCaloriesMetric: document.querySelector("#activeCaloriesMetric"),
    activeMinutesMetric: document.querySelector("#activeMinutesMetric"),
    heartRateMetric: document.querySelector("#heartRateMetric"),
    heartRateRange: document.querySelector("#heartRateRange"),
    heartRateChart: document.querySelector("#heartRateChart"),
    heartLine: document.querySelector("#heartLine"),
    heartArea: document.querySelector("#heartArea"),
    restingHeartRate: document.querySelector("#restingHeartRate"),
    heartUpdatedAt: document.querySelector("#heartUpdatedAt"),
    sleepDurationMetric: document.querySelector("#sleepDurationMetric"),
    sleepScoreMetric: document.querySelector("#sleepScoreMetric"),
    sleepTimeline: document.querySelector("#sleepTimeline"),
    deepSleepMetric: document.querySelector("#deepSleepMetric"),
    lightSleepMetric: document.querySelector("#lightSleepMetric"),
    remSleepMetric: document.querySelector("#remSleepMetric"),
    awakeMetric: document.querySelector("#awakeMetric"),
    spo2Metric: document.querySelector("#spo2Metric"),
    spo2UpdatedAt: document.querySelector("#spo2UpdatedAt"),
    stressMetric: document.querySelector("#stressMetric"),
    stressUpdatedAt: document.querySelector("#stressUpdatedAt"),
    wearableWorkoutList: document.querySelector("#wearableWorkoutList"),
    dataViewTabs: document.querySelector(".data-view-tabs"),
    calorieNetMetric: document.querySelector("#calorieNetMetric"),
    calorieBalanceStatus: document.querySelector("#calorieBalanceStatus"),
    calorieIntakeMetric: document.querySelector("#calorieIntakeMetric"),
    basalBurnMetric: document.querySelector("#basalBurnMetric"),
    exerciseBurnMetric: document.querySelector("#exerciseBurnMetric"),
    foodPhotoBox: document.querySelector("#foodPhotoBox"),
    foodPhotoInput: document.querySelector("#foodPhotoInput"),
    foodPhotoPreview: document.querySelector("#foodPhotoPreview"),
    foodPhotoPlaceholder: document.querySelector("#foodPhotoPlaceholder"),
    foodAnalysisState: document.querySelector("#foodAnalysisState"),
    foodEstimateMode: document.querySelector("#foodEstimateMode"),
    foodEstimateTotal: document.querySelector("#foodEstimateTotal"),
    foodEstimateList: document.querySelector("#foodEstimateList"),
    saveFoodEstimateButton: document.querySelector("#saveFoodEstimateButton"),
    burnCalculatorForm: document.querySelector("#burnCalculatorForm"),
    burnResult: document.querySelector("#burnResult"),
    burnEstimateMetric: document.querySelector("#burnEstimateMetric"),
    burnMethodLabel: document.querySelector("#burnMethodLabel"),
    burnIntensityLabel: document.querySelector("#burnIntensityLabel"),
    bloodPressureNotice: document.querySelector("#bloodPressureNotice"),
    saveBurnEstimateButton: document.querySelector("#saveBurnEstimateButton"),
    calorieEntryCount: document.querySelector("#calorieEntryCount"),
    calorieLedger: document.querySelector("#calorieLedger"),
    streakWeek: document.querySelector("#streakWeek"),
    reminderStatus: document.querySelector("#reminderStatus"),
    reminderToggle: document.querySelector("#reminderToggle"),
    addDialog: document.querySelector("#addDialog"),
    addForm: document.querySelector("#addForm"),
    taskDate: document.querySelector("#taskDate"),
    importDialog: document.querySelector("#importDialog"),
    importForm: document.querySelector("#importForm"),
    planFile: document.querySelector("#planFile"),
    dropZone: document.querySelector("#dropZone"),
    selectedFileName: document.querySelector("#selectedFileName"),
    importSubmitButton: document.querySelector("#importSubmitButton"),
    importError: document.querySelector("#importError"),
    deviceDialog: document.querySelector("#deviceDialog"),
    confirmDialog: document.querySelector("#confirmDialog"),
    confirmResetButton: document.querySelector("#confirmResetButton"),
    toast: document.querySelector("#toast"),
    toastMessage: document.querySelector("#toastMessage")
  };

  let state = loadState();
  let selectedDate = todayKey();
  let activeFilter = "all";
  let activeInsightsPane = "wearable";
  let selectedFile = null;
  let installPrompt = null;
  let toastTimer = 0;
  let reminderTimer = 0;
  let wearableSnapshot = window.RhythmHuaweiHealth?.demoSnapshot() || null;
  let currentFoodEstimate = null;
  let currentFoodPhotoUrl = "";
  let pendingBurnEstimate = null;

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function toDateKey(date) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function todayKey() {
    return toDateKey(new Date());
  }

  function dateFromKey(key) {
    const [year, month, day] = key.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function offsetDate(key, offset) {
    const date = dateFromKey(key);
    date.setDate(date.getDate() + offset);
    return toDateKey(date);
  }

  function startOfWeek(key = todayKey()) {
    const date = dateFromKey(key);
    const mondayOffset = date.getDay() === 0 ? -6 : 1 - date.getDay();
    date.setDate(date.getDate() + mondayOffset);
    return toDateKey(date);
  }

  function makeId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function createDefaultTasks() {
    const today = todayKey();
    const exerciseNames = ["轻松慢跑", "核心激活", "下肢力量", "舒展瑜伽", "间歇快走", "上肢力量", "户外骑行"];
    const mealNames = ["燕麦坚果早餐", "鸡胸肉能量碗", "杂粮轻食午餐", "牛油果全麦吐司", "三文鱼蔬菜餐", "酸奶水果杯", "菌菇豆腐晚餐"];
    const tasks = [];

    for (let offset = -6; offset <= 6; offset += 1) {
      const date = offsetDate(today, offset);
      const index = ((dateFromKey(date).getDay() + 6) % 7);
      const isPast = offset < 0;
      const completionGate = Math.abs(offset) % 4;

      tasks.push({
        id: makeId(),
        date,
        time: "07:30",
        type: "exercise",
        title: exerciseNames[index],
        duration: 35 + (index % 3) * 5,
        calories: 220 + index * 18,
        reminder: 15,
        note: "保持可顺畅说话的呼吸节奏",
        done: isPast && completionGate !== 0,
        source: "示例计划"
      });

      tasks.push({
        id: makeId(),
        date,
        time: "08:25",
        type: "meal",
        title: mealNames[index],
        duration: 20,
        calories: 420 + index * 16,
        reminder: 5,
        note: "注意补充水分与优质蛋白",
        done: isPast || offset === 0,
        source: "示例计划"
      });

      tasks.push({
        id: makeId(),
        date,
        time: "12:30",
        type: "meal",
        title: index % 2 ? "彩虹蔬菜午餐" : "低脂高蛋白午餐",
        duration: 25,
        calories: 560,
        reminder: 10,
        note: "蔬菜占餐盘的一半",
        done: isPast && completionGate !== 1,
        source: "示例计划"
      });
    }

    tasks.push(
      {
        id: makeId(),
        date: today,
        time: "18:40",
        type: "exercise",
        title: "全身力量训练",
        duration: 45,
        calories: 310,
        reminder: 30,
        note: "深蹲、推举、划船各 4 组",
        done: false,
        source: "示例计划"
      },
      {
        id: makeId(),
        date: today,
        time: "20:30",
        type: "exercise",
        title: "睡前拉伸",
        duration: 12,
        calories: 45,
        reminder: 5,
        note: "重点放松髋部与腿后侧",
        done: false,
        source: "示例计划"
      }
    );

    return tasks;
  }

  function defaultHealthProfile() {
    return {
      sex: "female",
      age: 28,
      height: 168,
      weight: 65,
      restingHeartRate: 62
    };
  }

  function emptyCalorieLedger() {
    return {
      foods: [],
      burns: []
    };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Array.isArray(saved.tasks)) {
        return {
          tasks: saved.tasks,
          remindersEnabled: Boolean(saved.remindersEnabled),
          healthProfile: {
            ...defaultHealthProfile(),
            ...(saved.healthProfile || {})
          },
          calorieLedger: {
            foods: Array.isArray(saved.calorieLedger?.foods) ? saved.calorieLedger.foods : [],
            burns: Array.isArray(saved.calorieLedger?.burns) ? saved.calorieLedger.burns : []
          }
        };
      }
    } catch (error) {
      console.warn("Unable to read saved plan data.", error);
    }

    return {
      tasks: createDefaultTasks(),
      remindersEnabled: false,
      healthProfile: defaultHealthProfile(),
      calorieLedger: emptyCalorieLedger()
    };
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function sortTasks(tasks) {
    return [...tasks].sort((a, b) => {
      const dateOrder = a.date.localeCompare(b.date);
      return dateOrder || a.time.localeCompare(b.time);
    });
  }

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function refreshIcons(root = document) {
    if (window.lucide) {
      window.lucide.createIcons({
        attrs: {
          "aria-hidden": "true"
        },
        root
      });
    }
  }

  function formatDateLabel(key, compact = false) {
    const date = dateFromKey(key);
    if (key === todayKey()) return compact ? "今天" : `今天 · ${date.getMonth() + 1}月${date.getDate()}日`;
    if (key === offsetDate(todayKey(), 1)) return compact ? "明天" : `明天 · ${date.getMonth() + 1}月${date.getDate()}日`;
    if (key === offsetDate(todayKey(), -1)) return compact ? "昨天" : `昨天 · ${date.getMonth() + 1}月${date.getDate()}日`;
    return compact
      ? `${date.getMonth() + 1}/${date.getDate()}`
      : `${date.getMonth() + 1}月${date.getDate()}日 · ${FULL_WEEKDAYS[date.getDay()]}`;
  }

  function taskMeta(task) {
    const parts = [];
    if (Number(task.duration) > 0) parts.push(`${task.duration} 分钟`);
    if (task.type === "exercise" && Number(task.calories) > 0) parts.push(`约 ${task.calories} 千卡`);
    if (task.reminder !== null && task.reminder !== undefined) {
      parts.push(Number(task.reminder) === 0 ? "准时提醒" : `提前 ${task.reminder} 分钟`);
    }
    return parts;
  }

  function taskIcon(type) {
    return type === "meal" ? "utensils" : "dumbbell";
  }

  function renderDateStrip() {
    const keys = Array.from({ length: 7 }, (_, index) => offsetDate(todayKey(), index - 3));
    els.dateStrip.innerHTML = keys
      .map((key) => {
        const date = dateFromKey(key);
        const selected = key === selectedDate ? " is-selected" : "";
        const today = key === todayKey() ? " is-today" : "";
        return `
          <button class="date-button${selected}${today}" type="button" data-date="${key}" aria-label="${formatDateLabel(key)}">
            <span>周${WEEKDAYS[date.getDay()]}</span>
            <strong>${date.getDate()}</strong>
          </button>
        `;
      })
      .join("");
  }

  function renderToday() {
    const tasks = sortTasks(state.tasks.filter((task) => task.date === selectedDate));
    const done = tasks.filter((task) => task.done).length;
    const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

    els.selectedDateLabel.textContent = formatDateLabel(selectedDate);
    els.focusCount.textContent = `${done}/${tasks.length}`;
    els.focusProgress.style.width = `${percent}%`;

    if (tasks.length === 0) {
      els.focusTitle.textContent = "给身体留一点时间";
      els.focusSummary.textContent = "今天还没有安排，添加一个轻松计划吧";
      els.todayTimeline.innerHTML = `
        <div class="empty-state">
          <span><i data-lucide="calendar-plus"></i></span>
          <h3>这一天还没有计划</h3>
          <p>点击底部加号，安排一项运动或饮食计划。</p>
        </div>
      `;
      refreshIcons(els.todayTimeline);
      return;
    }

    els.focusTitle.textContent = percent === 100 ? "今天全部完成" : percent >= 50 ? "已经完成一半" : "完成今天的计划";
    els.focusSummary.textContent = percent === 100 ? "今天的每一次选择都值得记录" : `还有 ${tasks.length - done} 项安排，按自己的节奏来`;
    els.todayTimeline.innerHTML = tasks
      .map((task) => {
        const meta = taskMeta(task).map((item) => `<span>${escapeHTML(item)}</span>`).join("");
        return `
          <article class="timeline-item${task.done ? " is-done" : ""}" data-task-id="${escapeHTML(task.id)}">
            <time class="task-time">${escapeHTML(task.time)}</time>
            <span class="task-icon ${task.type === "meal" ? "meal" : ""}">
              <i data-lucide="${taskIcon(task.type)}"></i>
            </span>
            <div class="task-copy">
              <strong class="task-title">${escapeHTML(task.title)}</strong>
              <div class="task-meta">${meta}</div>
            </div>
            <button class="complete-button${task.done ? " is-done" : ""}" type="button" data-complete="${escapeHTML(task.id)}" aria-label="${task.done ? "标记为未完成" : "标记为完成"}">
              <i data-lucide="check"></i>
            </button>
          </article>
        `;
      })
      .join("");
    refreshIcons(els.todayTimeline);
  }

  function weeklyTasks() {
    const first = startOfWeek();
    const last = offsetDate(first, 6);
    return state.tasks.filter((task) => task.date >= first && task.date <= last);
  }

  function renderPlans() {
    const today = todayKey();
    const upcoming = state.tasks.filter((task) => !task.done && task.date >= today);
    const weekly = weeklyTasks();
    const done = weekly.filter((task) => task.done).length;
    const percent = weekly.length ? Math.round((done / weekly.length) * 100) : 0;

    els.planCount.textContent = String(upcoming.length);
    els.weeklyPercent.textContent = `${percent}%`;
    els.weeklyRing.style.setProperty("--progress", `${percent * 3.6}deg`);
    els.weeklySummary.textContent = weekly.length
      ? `已完成 ${done} 项，共安排 ${weekly.length} 项`
      : "导入或添加计划后，这里会汇总本周进度";

    const filtered = sortTasks(state.tasks)
      .filter((task) => task.date >= offsetDate(today, -1))
      .filter((task) => activeFilter === "all" || task.type === activeFilter)
      .slice(0, 18);

    if (!filtered.length) {
      els.planList.innerHTML = `
        <div class="empty-state">
          <span><i data-lucide="clipboard-list"></i></span>
          <h3>暂无此类计划</h3>
          <p>可以导入现有计划表，也可以手动添加。</p>
        </div>
      `;
      refreshIcons(els.planList);
      return;
    }

    els.planList.innerHTML = filtered
      .map((task) => `
        <article class="plan-row">
          <span class="plan-icon ${task.type === "meal" ? "meal" : ""}">
            <i data-lucide="${taskIcon(task.type)}"></i>
          </span>
          <div>
            <h3>${escapeHTML(task.title)}</h3>
            <p>${escapeHTML(formatDateLabel(task.date, true))} · ${escapeHTML(task.time)} · ${escapeHTML(taskMeta(task)[0] || "计划安排")}</p>
          </div>
          <span class="plan-status${task.done ? " is-done" : ""}">${task.done ? "已完成" : "待进行"}</span>
        </article>
      `)
      .join("");
    refreshIcons(els.planList);
  }

  function formatSyncTime(value) {
    if (!value) return "等待同步";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "等待同步";
    return `${pad(date.getHours())}:${pad(date.getMinutes())} 更新`;
  }

  function formatMinutes(value) {
    const minutes = Math.max(0, Number(value) || 0);
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (!hours) return `${remainder}分`;
    return remainder ? `${hours}时${remainder}分` : `${hours}小时`;
  }

  function formatWorkoutDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "最近";
    const key = toDateKey(date);
    return formatDateLabel(key, true);
  }

  function renderHeartChart(samples) {
    if (!Array.isArray(samples) || samples.length < 2) {
      els.heartLine.setAttribute("points", "");
      els.heartArea.setAttribute("d", "");
      return;
    }

    const width = 340;
    const height = 106;
    const minValue = Math.min(45, ...samples);
    const maxValue = Math.max(135, ...samples);
    const range = Math.max(1, maxValue - minValue);
    const points = samples.map((sample, index) => {
      const x = (index / (samples.length - 1)) * width;
      const y = height - ((sample - minValue) / range) * (height - 14) - 7;
      return [x, y];
    });
    const pointString = points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
    els.heartLine.setAttribute("points", pointString);
    els.heartArea.setAttribute(
      "d",
      `M ${points[0][0].toFixed(1)} ${height} L ${pointString.replaceAll(",", " ")} L ${points[points.length - 1][0].toFixed(1)} ${height} Z`
    );
  }

  function renderInsights() {
    const snapshot = wearableSnapshot || window.RhythmHuaweiHealth.demoSnapshot();
    const device = snapshot.device || {};
    const activity = snapshot.activity || {};
    const heartRate = snapshot.heartRate || {};
    const sleep = snapshot.sleep || {};
    const spo2 = snapshot.spo2 || {};
    const stress = snapshot.stress || {};
    const isLive = snapshot.mode === "live" && device.connected;
    const steps = Number(activity.steps || 0);
    const stepGoal = Math.max(1, Number(activity.stepGoal || 10000));
    const stepPercent = Math.min(100, Math.round((steps / stepGoal) * 100));

    els.wearableDateLabel.textContent = formatDateLabel(todayKey());
    els.wearableMode.textContent = isLive ? "已连接" : "演示数据";
    els.wearableMode.classList.toggle("is-live", isLive);
    els.wearableStatus.textContent = isLive ? `${device.name || "HUAWEI Band 6"} 已同步` : "通过 HUAWEI Health 同步";
    els.wearableSyncTime.textContent = isLive ? formatSyncTime(device.updatedAt) : "接入 Health Service Kit 后获取真实数据";
    els.connectHuaweiButton.querySelector("span").textContent = isLive ? "已连接" : "连接";
    els.wearableCard.classList.toggle("is-connected", isLive);

    els.stepsMetric.textContent = steps.toLocaleString("zh-CN");
    els.stepGoal.textContent = stepGoal.toLocaleString("zh-CN");
    els.stepRing.style.setProperty("--step-progress", `${stepPercent * 3.6}deg`);
    els.distanceMetric.textContent = Number(activity.distanceKm || 0).toFixed(1);
    els.activeCaloriesMetric.textContent = Number(activity.caloriesKcal || 0).toLocaleString("zh-CN");
    els.activeMinutesMetric.textContent = Number(activity.activeMinutes || 0).toLocaleString("zh-CN");

    els.heartRateMetric.textContent = heartRate.latest ?? "--";
    els.heartRateRange.textContent = heartRate.min && heartRate.max ? `${heartRate.min}-${heartRate.max} bpm` : "暂无区间";
    els.restingHeartRate.textContent = heartRate.resting ? `${heartRate.resting} bpm` : "--";
    els.heartUpdatedAt.textContent = formatSyncTime(heartRate.updatedAt);
    renderHeartChart(heartRate.samples);

    els.sleepDurationMetric.textContent = formatMinutes(sleep.totalMinutes);
    els.sleepScoreMetric.textContent = sleep.score ?? "--";
    els.deepSleepMetric.textContent = formatMinutes(sleep.deepMinutes);
    els.lightSleepMetric.textContent = formatMinutes(sleep.lightMinutes);
    els.remSleepMetric.textContent = formatMinutes(sleep.remMinutes);
    els.awakeMetric.textContent = formatMinutes(sleep.awakeMinutes);
    const stageTotal = Math.max(1, (sleep.stages || []).reduce((sum, stage) => sum + Number(stage.minutes || 0), 0));
    els.sleepTimeline.innerHTML = (sleep.stages || [])
      .map((stage) => `<span class="sleep-segment ${escapeHTML(stage.type)}" style="width:${(Number(stage.minutes || 0) / stageTotal) * 100}%"></span>`)
      .join("");

    els.spo2Metric.textContent = spo2.latest ?? "--";
    els.spo2UpdatedAt.textContent = spo2.min ? `今日最低 ${spo2.min}% · ${formatSyncTime(spo2.updatedAt)}` : "等待同步";
    els.stressMetric.textContent = stress.latest ?? "--";
    els.stressUpdatedAt.textContent = formatSyncTime(stress.updatedAt);

    const workouts = Array.isArray(snapshot.workouts) ? snapshot.workouts : [];
    els.wearableWorkoutList.innerHTML = workouts.length
      ? workouts.map((workout) => {
        const isStrength = workout.type === "strength";
        const metric = Number(workout.distanceKm) > 0
          ? `<strong>${Number(workout.distanceKm).toFixed(1)} km</strong><span>${workout.caloriesKcal || 0} kcal</span>`
          : `<strong>${workout.caloriesKcal || 0} kcal</strong><span>平均 ${workout.averageHeartRate || "--"} bpm</span>`;
        return `
          <article class="workout-row">
            <span class="workout-icon${isStrength ? " coral" : ""}">
              <i data-lucide="${isStrength ? "dumbbell" : "footprints"}"></i>
            </span>
            <div class="workout-copy">
              <strong>${escapeHTML(workout.title || "锻炼记录")}</strong>
              <span>${formatWorkoutDate(workout.startTime)} · ${formatMinutes(workout.durationMinutes)} · 平均 ${workout.averageHeartRate || "--"} bpm</span>
            </div>
            <div class="workout-value">${metric}</div>
          </article>
        `;
      }).join("")
      : `
        <div class="empty-state">
          <span><i data-lucide="activity"></i></span>
          <h3>暂无锻炼记录</h3>
          <p>手环数据同步到 HUAWEI Health 后会显示在这里。</p>
        </div>
      `;
    refreshIcons(els.wearableWorkoutList);
  }

  function calculateBmr(profile = state.healthProfile) {
    const sexOffset = profile.sex === "male" ? 5 : -161;
    return Math.max(0, Math.round(
      10 * Number(profile.weight) +
      6.25 * Number(profile.height) -
      5 * Number(profile.age) +
      sexOffset
    ));
  }

  function currentBasalBurn() {
    const now = new Date();
    const elapsedMinutes = now.getHours() * 60 + now.getMinutes();
    return Math.round(calculateBmr() * (elapsedMinutes / 1440));
  }

  function todayCalorieEntries() {
    const date = todayKey();
    const plannedMeals = state.tasks
      .filter((task) => task.date === date && task.type === "meal" && task.done && Number(task.calories) > 0)
      .map((task) => ({
        id: `task:${task.id}`,
        kind: "intake",
        title: task.title,
        calories: Number(task.calories),
        detail: "已完成饮食计划",
        time: task.time,
        removable: false
      }));
    const foods = state.calorieLedger.foods
      .filter((entry) => entry.date === date)
      .map((entry) => ({
        ...entry,
        kind: "intake",
        detail: `${entry.portionGrams}g · ${entry.source === "live" ? "图片识别" : "演示估算"}`,
        removable: true
      }));
    const wearableCalories = Number(wearableSnapshot?.activity?.caloriesKcal || 0);
    const wearableEntry = wearableCalories > 0
      ? [{
        id: "wearable:today",
        kind: "burn",
        title: "手环活动消耗",
        calories: wearableCalories,
        detail: wearableSnapshot?.mode === "live" ? "HUAWEI Health" : "手环演示数据",
        time: "现在",
        removable: false
      }]
      : [];
    const burns = state.calorieLedger.burns
      .filter((entry) => entry.date === date)
      .map((entry) => ({
        ...entry,
        kind: "burn",
        detail: `${entry.duration}分钟 · ${entry.method}`,
        removable: true
      }));

    return [...plannedMeals, ...foods, ...wearableEntry, ...burns]
      .sort((a, b) => String(b.time || "").localeCompare(String(a.time || "")));
  }

  function renderCalorieSummary() {
    const entries = todayCalorieEntries();
    const intake = entries
      .filter((entry) => entry.kind === "intake")
      .reduce((sum, entry) => sum + Number(entry.calories || 0), 0);
    const activityBurn = entries
      .filter((entry) => entry.kind === "burn")
      .reduce((sum, entry) => sum + Number(entry.calories || 0), 0);
    const basalBurn = currentBasalBurn();
    const net = Math.round(intake - basalBurn - activityBurn);

    els.calorieIntakeMetric.textContent = Math.round(intake).toLocaleString("zh-CN");
    els.basalBurnMetric.textContent = basalBurn.toLocaleString("zh-CN");
    els.exerciseBurnMetric.textContent = Math.round(activityBurn).toLocaleString("zh-CN");
    els.calorieNetMetric.textContent = `${net > 0 ? "+" : ""}${net.toLocaleString("zh-CN")}`;
    els.calorieBalanceStatus.textContent = net > 300
      ? "当前摄入高于消耗"
      : net < -300
        ? "当前消耗高于摄入"
        : "当前摄入与消耗接近平衡";
    els.calorieEntryCount.textContent = `${entries.length} 条`;

    els.calorieLedger.innerHTML = entries.length
      ? entries.map((entry) => `
        <article class="ledger-row">
          <span class="ledger-icon${entry.kind === "burn" ? " burn" : ""}">
            <i data-lucide="${entry.kind === "burn" ? "flame" : "utensils"}"></i>
          </span>
          <div class="ledger-copy">
            <strong>${escapeHTML(entry.title)}</strong>
            <span>${escapeHTML(entry.time || "")} · ${escapeHTML(entry.detail || "")}</span>
          </div>
          <strong class="ledger-calories ${entry.kind}">${entry.kind === "burn" ? "-" : "+"}${Math.round(entry.calories)} kcal</strong>
          ${entry.removable
            ? `<button class="ledger-delete" type="button" data-delete-calorie="${escapeHTML(entry.id)}" data-kind="${entry.kind}" aria-label="删除记录"><i data-lucide="trash-2"></i></button>`
            : '<span></span>'}
        </article>
      `).join("")
      : `
        <div class="empty-state">
          <span><i data-lucide="notebook-tabs"></i></span>
          <h3>今天还没有热量记录</h3>
          <p>拍摄食物或估算一次运动消耗后，记录会显示在这里。</p>
        </div>
      `;
    refreshIcons(els.calorieLedger);
  }

  function renderFoodEstimate() {
    if (!currentFoodEstimate) {
      els.foodAnalysisState.hidden = true;
      return;
    }

    els.foodAnalysisState.hidden = false;
    els.foodEstimateMode.textContent = currentFoodEstimate.mode === "live" ? "图片识别" : "演示估算";
    els.foodEstimateTotal.textContent = window.RhythmNutritionEstimator.totalCalories(currentFoodEstimate.items);
    els.foodEstimateList.innerHTML = currentFoodEstimate.items.map((item, index) => {
      const calories = Math.round((item.portionGrams * item.kcalPer100g) / 100);
      return `
        <div class="food-estimate-row">
          <div class="food-estimate-copy">
            <strong>${escapeHTML(item.name)}</strong>
            <span>${Math.round(item.confidence * 100)}% 置信度 · ${item.kcalPer100g} kcal/100g</span>
          </div>
          <label class="portion-control">
            <input type="number" min="1" max="2000" value="${item.portionGrams}" data-food-portion="${index}" aria-label="${escapeHTML(item.name)}份量" />
            <span>g</span>
          </label>
          <strong class="food-item-calories" data-food-calories="${index}">${calories} kcal</strong>
        </div>
      `;
    }).join("");
    els.saveFoodEstimateButton.disabled = false;
  }

  async function handleFoodPhoto(file) {
    if (!file) return;
    if (currentFoodPhotoUrl) URL.revokeObjectURL(currentFoodPhotoUrl);
    currentFoodPhotoUrl = URL.createObjectURL(file);
    els.foodPhotoPreview.src = currentFoodPhotoUrl;
    els.foodPhotoPreview.hidden = false;
    els.foodPhotoPlaceholder.hidden = true;
    els.foodPhotoBox.classList.add("has-photo");
    els.foodAnalysisState.hidden = false;
    els.foodEstimateMode.textContent = "分析中";
    els.foodEstimateTotal.textContent = "--";
    els.foodEstimateList.innerHTML = `
      <div class="food-analysis-loading">
        <i data-lucide="loader-circle"></i>
        <span>正在分析餐盘内容</span>
      </div>
    `;
    refreshIcons(els.foodEstimateList);

    try {
      currentFoodEstimate = await window.RhythmNutritionEstimator.estimatePhoto(file);
      renderFoodEstimate();
    } catch (error) {
      currentFoodEstimate = null;
      els.foodAnalysisState.hidden = true;
      showToast(error.message || "食物照片分析失败", "circle-alert");
    }
  }

  function saveFoodEstimate() {
    if (!currentFoodEstimate) return;
    const now = new Date();
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    const entries = currentFoodEstimate.items.map((item) => ({
      id: makeId(),
      date: todayKey(),
      time,
      title: item.name,
      portionGrams: Number(item.portionGrams),
      calories: Math.round((item.portionGrams * item.kcalPer100g) / 100),
      source: currentFoodEstimate.mode
    }));
    state.calorieLedger.foods.push(...entries);
    saveState();
    els.saveFoodEstimateButton.disabled = true;
    renderCalorieSummary();
    showToast(`已记录 ${entries.length} 项食物，共 ${window.RhythmNutritionEstimator.totalCalories(currentFoodEstimate.items)} kcal`);
  }

  function estimateExerciseBurn(formData) {
    const sex = formData.get("sex") === "male" ? "male" : "female";
    const age = clampNumber(formData.get("age"), 18, 90, 28);
    const height = clampNumber(formData.get("height"), 120, 230, 168);
    const weight = clampNumber(formData.get("weight"), 30, 250, 65);
    const duration = clampNumber(formData.get("duration"), 1, 600, 30);
    const heartRate = clampNumber(formData.get("heartRate"), 0, 220, 0);
    const restingHeartRate = clampNumber(formData.get("restingHeartRate"), 0, 140, 0);
    const systolic = clampNumber(formData.get("systolic"), 0, 260, 0);
    const diastolic = clampNumber(formData.get("diastolic"), 0, 180, 0);
    const activityKey = ACTIVITY_METS[formData.get("activity")] ? formData.get("activity") : "other";
    const activity = ACTIVITY_METS[activityKey];
    const canUseHeartRate = heartRate >= Math.max(70, restingHeartRate + 10);
    let caloriesPerMinute;
    let method;

    if (canUseHeartRate) {
      caloriesPerMinute = sex === "male"
        ? (-55.0969 + 0.6309 * heartRate + 0.1988 * weight + 0.2017 * age) / 4.184
        : (-20.4022 + 0.4472 * heartRate - 0.1263 * weight + 0.074 * age) / 4.184;
      method = "心率模型";
    } else {
      caloriesPerMinute = activity.met * 3.5 * weight / 200;
      method = "MET 模型";
    }

    caloriesPerMinute = Math.max(1, Math.min(30, caloriesPerMinute));
    const maxHeartRate = 208 - 0.7 * age;
    const intensityRatio = heartRate > 0 ? heartRate / maxHeartRate : activity.met / 12;
    const intensity = intensityRatio >= 0.85 ? "高强度" : intensityRatio >= 0.65 ? "中高强度" : intensityRatio >= 0.5 ? "中等强度" : "低强度";
    let bloodPressureMessage = "血压不参与热量公式，仅用于运动前风险提示。";
    let bloodPressureWarning = false;

    if (systolic >= 180 || diastolic >= 120) {
      bloodPressureMessage = "血压读数明显偏高，请停止剧烈运动并复测；如伴不适应及时就医。";
      bloodPressureWarning = true;
    } else if (systolic >= 140 || diastolic >= 90) {
      bloodPressureMessage = "血压读数偏高，本次结果仅供参考，建议降低运动强度。";
      bloodPressureWarning = true;
    } else if ((systolic > 0 && systolic < 90) || (diastolic > 0 && diastolic < 60)) {
      bloodPressureMessage = "血压读数偏低，请关注头晕、乏力等身体反应。";
      bloodPressureWarning = true;
    }

    return {
      id: makeId(),
      date: todayKey(),
      time: `${pad(new Date().getHours())}:${pad(new Date().getMinutes())}`,
      kind: "burn",
      title: activity.label,
      activity: activityKey,
      duration,
      calories: Math.round(caloriesPerMinute * duration),
      method,
      intensity,
      bloodPressureMessage,
      bloodPressureWarning,
      profile: { sex, age, height, weight, restingHeartRate }
    };
  }

  function showBurnEstimate(estimate) {
    pendingBurnEstimate = estimate;
    els.burnEstimateMetric.textContent = estimate.calories;
    els.burnMethodLabel.textContent = estimate.method;
    els.burnIntensityLabel.textContent = estimate.intensity;
    els.bloodPressureNotice.textContent = estimate.bloodPressureMessage;
    els.bloodPressureNotice.classList.toggle("is-warning", estimate.bloodPressureWarning);
    els.burnResult.hidden = false;
    els.saveBurnEstimateButton.disabled = false;
  }

  function saveBurnEstimate() {
    if (!pendingBurnEstimate) return;
    state.calorieLedger.burns.push({
      id: pendingBurnEstimate.id,
      date: pendingBurnEstimate.date,
      time: pendingBurnEstimate.time,
      title: pendingBurnEstimate.title,
      duration: pendingBurnEstimate.duration,
      calories: pendingBurnEstimate.calories,
      method: pendingBurnEstimate.method
    });
    state.healthProfile = pendingBurnEstimate.profile;
    saveState();
    els.saveBurnEstimateButton.disabled = true;
    renderCalorieSummary();
    showToast(`已记录 ${pendingBurnEstimate.calories} kcal 运动消耗`);
  }

  function deleteCalorieEntry(id, kind) {
    const collection = kind === "burn" ? state.calorieLedger.burns : state.calorieLedger.foods;
    const index = collection.findIndex((entry) => entry.id === id);
    if (index < 0) return;
    collection.splice(index, 1);
    saveState();
    renderCalorieSummary();
    showToast("热量记录已删除", "trash-2");
  }

  function hydrateBurnForm() {
    const profile = state.healthProfile;
    els.burnCalculatorForm.elements.sex.value = profile.sex;
    els.burnCalculatorForm.elements.age.value = profile.age;
    els.burnCalculatorForm.elements.height.value = profile.height;
    els.burnCalculatorForm.elements.weight.value = profile.weight;
    els.burnCalculatorForm.elements.restingHeartRate.value = wearableSnapshot?.heartRate?.resting || profile.restingHeartRate;
    els.burnCalculatorForm.elements.heartRate.value = wearableSnapshot?.workouts?.[0]?.averageHeartRate || 132;
  }

  function setInsightsPane(target) {
    activeInsightsPane = target === "calories" ? "calories" : "wearable";
    els.dataViewTabs.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.insightPane === activeInsightsPane);
    });
    document.querySelectorAll("[data-insight-content]").forEach((pane) => {
      pane.classList.toggle("is-active", pane.dataset.insightContent === activeInsightsPane);
    });
    els.greeting.textContent = activeInsightsPane === "calories" ? "摄入与消耗" : "每一步都有回应";
    els.pageTitle.textContent = activeInsightsPane === "calories" ? "看懂今天的热量" : "看见身体的变化";
  }

  function renderStreak() {
    const monday = startOfWeek();
    els.streakWeek.innerHTML = Array.from({ length: 7 }, (_, index) => {
      const key = offsetDate(monday, index);
      const tasks = state.tasks.filter((task) => task.date === key);
      const done = tasks.length > 0 && tasks.every((task) => task.done);
      return `
        <div class="streak-day${done ? " is-done" : ""}${key === todayKey() ? " is-today" : ""}">
          <span>${done ? '<i data-lucide="check"></i>' : dateFromKey(key).getDate()}</span>
          周${WEEKDAYS[dateFromKey(key).getDay()]}
        </div>
      `;
    }).join("");
    refreshIcons(els.streakWeek);
  }

  function renderReminderState() {
    const permission = "Notification" in window ? Notification.permission : "unsupported";
    const enabled = state.remindersEnabled && permission === "granted";
    els.notificationButton.classList.toggle("is-enabled", enabled);
    els.reminderToggle.classList.toggle("is-on", enabled);
    els.reminderStatus.textContent = permission === "denied"
      ? "已被浏览器阻止"
      : enabled
        ? "已开启，到时发送系统通知"
        : "尚未开启";
    els.notificationButton.setAttribute("aria-label", enabled ? "提醒已开启" : "开启提醒");
  }

  function renderAll() {
    renderDateStrip();
    renderToday();
    renderPlans();
    renderInsights();
    renderCalorieSummary();
    renderStreak();
    renderReminderState();
  }

  function setView(target) {
    document.querySelectorAll(".view").forEach((view) => {
      view.classList.toggle("is-active", view.dataset.view === target);
    });
    document.querySelectorAll(".nav-item").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.target === target);
    });

    const headings = {
      today: [getGreeting(), "今天，也要动起来"],
      plans: ["整理你的节奏", "让计划更容易坚持"],
      insights: activeInsightsPane === "calories"
        ? ["摄入与消耗", "看懂今天的热量"]
        : ["每一步都有回应", "看见身体的变化"],
      profile: ["你的健康空间", "按喜欢的方式生活"]
    };
    const [eyebrow, title] = headings[target] || headings.today;
    els.greeting.textContent = eyebrow;
    els.pageTitle.textContent = title;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 6) return "夜深了，注意休息";
    if (hour < 11) return "早上好";
    if (hour < 14) return "中午好";
    if (hour < 18) return "下午好";
    return "晚上好";
  }

  function toggleTask(id) {
    const task = state.tasks.find((item) => item.id === id);
    if (!task) return;
    task.done = !task.done;
    saveState();
    renderAll();
    showToast(task.done ? `已完成：${task.title}` : `已恢复：${task.title}`);
  }

  function showToast(message, icon = "circle-check") {
    clearTimeout(toastTimer);
    els.toastMessage.textContent = message;
    const currentIcon = els.toast.querySelector("svg");
    if (currentIcon) {
      const replacement = document.createElement("i");
      replacement.dataset.lucide = icon;
      currentIcon.replaceWith(replacement);
      refreshIcons(els.toast);
    }
    els.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => els.toast.classList.remove("is-visible"), 2600);
  }

  function openAddDialog() {
    els.addForm.reset();
    els.taskDate.value = selectedDate;
    els.addForm.elements.time.value = "18:30";
    els.addForm.elements.duration.value = "30";
    els.addForm.elements.reminder.value = "15";
    els.addDialog.showModal();
    window.setTimeout(() => els.addForm.elements.title.focus(), 100);
  }

  function addTask(formData) {
    const type = formData.get("type") === "meal" ? "meal" : "exercise";
    const duration = clampNumber(formData.get("duration"), 0, 360, 0);
    state.tasks.push({
      id: makeId(),
      date: String(formData.get("date")),
      time: String(formData.get("time")),
      type,
      title: String(formData.get("title")).trim(),
      duration,
      calories: type === "exercise" ? Math.round(duration * 7.2) : 0,
      reminder: clampNumber(formData.get("reminder"), 0, 1440, 0),
      note: String(formData.get("note") || "").trim(),
      done: false,
      source: "手动添加"
    });
    saveState();
    selectedDate = String(formData.get("date"));
    renderAll();
    scheduleNextReminder();
    showToast("计划已添加");
  }

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, number));
  }

  function normalizeDate(value) {
    const input = String(value || "").trim();
    if (!input) return "";
    const normalized = input
      .replace(/[年/.]/g, "-")
      .replace(/月/g, "-")
      .replace(/日/g, "")
      .replace(/-+/g, "-");
    const match = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) return "";
    const key = `${match[1]}-${pad(match[2])}-${pad(match[3])}`;
    const date = dateFromKey(key);
    return toDateKey(date) === key ? key : "";
  }

  function normalizeTime(value) {
    const input = String(value || "").trim();
    const match = input.match(/^(\d{1,2}):(\d{1,2})/);
    if (!match) return "";
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (hour > 23 || minute > 59) return "";
    return `${pad(hour)}:${pad(minute)}`;
  }

  function normalizeType(value) {
    const type = String(value || "").trim().toLowerCase();
    if (["运动", "exercise", "workout", "sport", "fitness"].includes(type)) return "exercise";
    if (["饮食", "meal", "diet", "food", "nutrition"].includes(type)) return "meal";
    return "";
  }

  function valueFromAliases(record, aliases) {
    const key = Object.keys(record).find((candidate) =>
      aliases.includes(candidate.trim().toLowerCase())
    );
    return key ? record[key] : undefined;
  }

  function normalizeImportedRecord(record, index) {
    const date = normalizeDate(valueFromAliases(record, ["日期", "date"]));
    const time = normalizeTime(valueFromAliases(record, ["时间", "time"]));
    const type = normalizeType(valueFromAliases(record, ["类型", "type", "category"]));
    const title = String(valueFromAliases(record, ["名称", "计划名称", "标题", "title", "name"]) || "").trim();

    if (!date || !time || !type || !title) {
      throw new Error(`第 ${index + 1} 条记录缺少有效的日期、时间、类型或名称`);
    }

    const duration = clampNumber(valueFromAliases(record, ["时长", "时长(分钟)", "duration", "minutes"]), 0, 360, 0);
    const calories = clampNumber(valueFromAliases(record, ["热量", "卡路里", "calories", "kcal"]), 0, 5000, type === "exercise" ? Math.round(duration * 7.2) : 0);
    const reminder = clampNumber(valueFromAliases(record, ["提醒", "提前提醒", "reminder"]), 0, 1440, 15);
    const doneValue = String(valueFromAliases(record, ["完成", "已完成", "done", "completed"]) || "").toLowerCase();

    return {
      id: makeId(),
      date,
      time,
      type,
      title: title.slice(0, 60),
      duration,
      calories,
      reminder,
      note: String(valueFromAliases(record, ["备注", "note", "notes"]) || "").trim().slice(0, 200),
      done: ["true", "1", "yes", "是", "已完成"].includes(doneValue),
      source: "文件导入"
    };
  }

  function parseCSVLine(line) {
    const cells = [];
    let current = "";
    let quoted = false;

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      if (character === '"') {
        if (quoted && line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          quoted = !quoted;
        }
      } else if (character === "," && !quoted) {
        cells.push(current.trim());
        current = "";
      } else {
        current += character;
      }
    }
    cells.push(current.trim());
    return cells;
  }

  function parseCSV(text) {
    const lines = text
      .replace(/^\uFEFF/, "")
      .split(/\r?\n/)
      .filter((line) => line.trim());
    if (lines.length < 2) throw new Error("CSV 文件至少需要表头和一条计划");
    const headers = parseCSVLine(lines[0]);
    return lines.slice(1).map((line) => {
      const values = parseCSVLine(line);
      return headers.reduce((record, header, index) => {
        record[header] = values[index] || "";
        return record;
      }, {});
    });
  }

  async function parseImportFile(file) {
    if (!file) throw new Error("请先选择文件");
    if (file.size > MAX_IMPORT_BYTES) throw new Error("文件不能超过 2 MB");
    const text = await file.text();
    let records;

    if (file.name.toLowerCase().endsWith(".json") || file.type.includes("json")) {
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("JSON 文件格式不正确");
      }
      records = Array.isArray(parsed) ? parsed : parsed.plans || parsed.tasks;
      if (!Array.isArray(records)) throw new Error("JSON 顶层需要是数组，或包含 plans/tasks 数组");
    } else {
      records = parseCSV(text);
    }

    if (!records.length) throw new Error("文件中没有可导入的计划");
    if (records.length > 500) throw new Error("一次最多导入 500 条计划");
    return records.map(normalizeImportedRecord);
  }

  function setSelectedFile(file) {
    selectedFile = file || null;
    els.dropZone.classList.toggle("has-file", Boolean(file));
    els.selectedFileName.textContent = file ? `${file.name} · ${Math.max(1, Math.ceil(file.size / 1024))} KB` : "单个文件不超过 2 MB";
    els.importSubmitButton.disabled = !file;
    setImportError("");
  }

  function setImportError(message) {
    els.importError.textContent = message;
    els.importError.classList.toggle("is-visible", Boolean(message));
  }

  function downloadFile(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function downloadTemplate() {
    const start = todayKey();
    const csv = [
      "\uFEFF日期,时间,类型,名称,时长,提醒,热量,备注",
      `${start},07:30,运动,晨间慢跑,30,15,220,保持轻松呼吸`,
      `${start},08:20,饮食,高蛋白早餐,20,5,420,鸡蛋和全麦面包`,
      `${offsetDate(start, 1)},19:00,运动,力量训练,45,30,320,完成四组基础动作`
    ].join("\n");
    downloadFile("律动计划导入模板.csv", csv, "text/csv;charset=utf-8");
    showToast("示例模板已下载", "download");
  }

  function exportPlans() {
    const content = JSON.stringify({
      exportedAt: new Date().toISOString(),
      plans: sortTasks(state.tasks),
      calorieLedger: state.calorieLedger,
      healthProfile: state.healthProfile
    }, null, 2);
    downloadFile(`律动计划-${todayKey()}.json`, content, "application/json");
    showToast("计划备份已导出", "file-check-2");
  }

  async function requestReminders() {
    if (!("Notification" in window)) {
      showToast("当前浏览器不支持系统提醒", "circle-alert");
      return;
    }

    if (Notification.permission === "denied") {
      showToast("请在浏览器设置中允许通知", "circle-alert");
      renderReminderState();
      return;
    }

    const permission = Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();
    state.remindersEnabled = permission === "granted";
    saveState();
    renderReminderState();
    if (state.remindersEnabled) {
      scheduleNextReminder();
      showToast("计划提醒已开启", "bell-ring");
    }
  }

  function toggleReminders() {
    if (!("Notification" in window) || !state.remindersEnabled || Notification.permission !== "granted") {
      requestReminders();
      return;
    }
    state.remindersEnabled = false;
    saveState();
    renderReminderState();
    clearTimeout(reminderTimer);
    showToast("计划提醒已关闭", "bell-off");
  }

  function reminderTimestamp(task) {
    const date = dateFromKey(task.date);
    const [hours, minutes] = task.time.split(":").map(Number);
    date.setHours(hours, minutes, 0, 0);
    return date.getTime() - Number(task.reminder || 0) * 60 * 1000;
  }

  function notifiedSet() {
    try {
      return new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY)) || []);
    } catch {
      return new Set();
    }
  }

  async function sendTaskNotification(task) {
    const body = task.type === "meal"
      ? `${task.time} · 饮食计划${task.note ? ` · ${task.note}` : ""}`
      : `${task.time} · ${task.duration || 0} 分钟${task.note ? ` · ${task.note}` : ""}`;
    const options = {
      body,
      icon: "./assets/app-icon.svg",
      badge: "./assets/app-icon.svg",
      tag: `rhythm-${task.id}-${task.date}`,
      data: { taskId: task.id },
      vibrate: [120, 60, 120]
    };

    try {
      const registration = await navigator.serviceWorker?.ready;
      if (registration) {
        await registration.showNotification(`该进行「${task.title}」了`, options);
      } else {
        new Notification(`该进行「${task.title}」了`, options);
      }
    } catch (error) {
      console.warn("Unable to show reminder.", error);
    }
  }

  function checkDueReminders() {
    if (!state.remindersEnabled || !("Notification" in window) || Notification.permission !== "granted") return;
    const now = Date.now();
    const sent = notifiedSet();
    let changed = false;

    state.tasks
      .filter((task) => !task.done)
      .forEach((task) => {
        const key = `${task.id}:${task.date}:${task.time}`;
        const due = reminderTimestamp(task);
        if (now >= due && now - due <= 5 * 60 * 1000 && !sent.has(key)) {
          sent.add(key);
          changed = true;
          sendTaskNotification(task);
        }
      });

    if (changed) {
      localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...sent].slice(-300)));
    }
  }

  function scheduleNextReminder() {
    clearTimeout(reminderTimer);
    if (!state.remindersEnabled) return;
    checkDueReminders();
    const now = Date.now();
    const next = state.tasks
      .filter((task) => !task.done && reminderTimestamp(task) > now)
      .sort((a, b) => reminderTimestamp(a) - reminderTimestamp(b))[0];
    if (!next) return;
    const delay = Math.min(reminderTimestamp(next) - now, 24 * 60 * 60 * 1000);
    reminderTimer = window.setTimeout(scheduleNextReminder, Math.max(1000, delay));
  }

  async function shareSummary() {
    if (activeInsightsPane === "calories") {
      const text = `今日摄入 ${els.calorieIntakeMetric.textContent} kcal，基础消耗 ${els.basalBurnMetric.textContent} kcal，活动消耗 ${els.exerciseBurnMetric.textContent} kcal，当前结余 ${els.calorieNetMetric.textContent} kcal。`;
      if (navigator.share) {
        try {
          await navigator.share({ title: "今日热量总结", text });
          return;
        } catch (error) {
          if (error.name === "AbortError") return;
        }
      }
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        showToast("热量总结已复制", "copy");
      } else {
        showToast(text, "share-2");
      }
      return;
    }

    const week = weeklyTasks();
    const done = week.filter((task) => task.done).length;
    const text = `我这周在律动完成了 ${done}/${week.length} 项健康计划。`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "我的健康周报", text });
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      showToast("周报摘要已复制", "copy");
    } else {
      showToast(text, "share-2");
    }
  }

  async function installApp() {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      return;
    }
    showToast("请使用浏览器菜单中的“添加到主屏幕”", "smartphone");
  }

  async function connectHuaweiHealth() {
    const provider = window.RhythmHuaweiHealth;
    if (!provider) {
      showToast("健康数据模块加载失败", "circle-alert");
      return;
    }

    try {
      const status = await provider.getStatus();
      if (!status.available) {
        els.deviceDialog.showModal();
        return;
      }

      const authorization = status.authorized ? status : await provider.connect();
      if (!authorization.authorized) {
        showToast("未获得健康数据授权", "circle-alert");
        return;
      }

      wearableSnapshot = await provider.sync();
      renderInsights();
      showToast("HUAWEI Health 已连接", "link-2");
    } catch (error) {
      console.warn("Unable to connect HUAWEI Health.", error);
      showToast("连接失败，请检查授权状态", "circle-alert");
    }
  }

  async function syncHuaweiHealth() {
    const provider = window.RhythmHuaweiHealth;
    els.syncHuaweiButton.classList.add("is-syncing");
    els.syncHuaweiButton.disabled = true;

    try {
      const status = await provider?.getStatus();
      if (!status?.available || !status.authorized) {
        wearableSnapshot = provider?.demoSnapshot() || wearableSnapshot;
        renderInsights();
        showToast("已刷新演示数据", "refresh-cw");
        return;
      }

      wearableSnapshot = await provider.sync();
      renderInsights();
      showToast("手环数据已同步", "refresh-cw");
    } catch (error) {
      console.warn("Unable to synchronize health data.", error);
      showToast("同步失败，请稍后重试", "circle-alert");
    } finally {
      els.syncHuaweiButton.classList.remove("is-syncing");
      els.syncHuaweiButton.disabled = false;
    }
  }

  function bindEvents() {
    document.querySelector(".bottom-nav").addEventListener("click", (event) => {
      const button = event.target.closest(".nav-item");
      if (button) setView(button.dataset.target);
    });

    els.dateStrip.addEventListener("click", (event) => {
      const button = event.target.closest("[data-date]");
      if (!button) return;
      selectedDate = button.dataset.date;
      renderDateStrip();
      renderToday();
    });

    els.todayTimeline.addEventListener("click", (event) => {
      const button = event.target.closest("[data-complete]");
      if (button) toggleTask(button.dataset.complete);
    });

    els.planFilters.addEventListener("click", (event) => {
      const button = event.target.closest("[data-filter]");
      if (!button) return;
      activeFilter = button.dataset.filter;
      els.planFilters.querySelectorAll("button").forEach((item) => {
        item.classList.toggle("is-active", item === button);
      });
      renderPlans();
    });

    els.dataViewTabs.addEventListener("click", (event) => {
      const button = event.target.closest("[data-insight-pane]");
      if (button) setInsightsPane(button.dataset.insightPane);
    });

    els.foodPhotoInput.addEventListener("change", () => {
      handleFoodPhoto(els.foodPhotoInput.files[0]);
    });

    els.foodEstimateList.addEventListener("input", (event) => {
      const input = event.target.closest("[data-food-portion]");
      if (!input || !currentFoodEstimate) return;
      const index = Number(input.dataset.foodPortion);
      const item = currentFoodEstimate.items[index];
      if (!item) return;
      item.portionGrams = clampNumber(input.value, 1, 2000, item.portionGrams);
      const calories = Math.round((item.portionGrams * item.kcalPer100g) / 100);
      const calorieLabel = els.foodEstimateList.querySelector(`[data-food-calories="${index}"]`);
      if (calorieLabel) calorieLabel.textContent = `${calories} kcal`;
      els.foodEstimateTotal.textContent = window.RhythmNutritionEstimator.totalCalories(currentFoodEstimate.items);
      els.saveFoodEstimateButton.disabled = false;
    });

    els.saveFoodEstimateButton.addEventListener("click", saveFoodEstimate);

    els.burnCalculatorForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!els.burnCalculatorForm.reportValidity()) return;
      showBurnEstimate(estimateExerciseBurn(new FormData(els.burnCalculatorForm)));
    });

    els.saveBurnEstimateButton.addEventListener("click", saveBurnEstimate);
    els.calorieLedger.addEventListener("click", (event) => {
      const button = event.target.closest("[data-delete-calorie]");
      if (button) deleteCalorieEntry(button.dataset.deleteCalorie, button.dataset.kind);
    });

    document.querySelector("#viewAllButton").addEventListener("click", () => setView("plans"));
    document.querySelector("#openAddButton").addEventListener("click", openAddDialog);
    document.querySelector("#openImportButton").addEventListener("click", () => {
      setSelectedFile(null);
      els.importForm.reset();
      els.importDialog.showModal();
    });

    document.querySelectorAll("[data-close]").forEach((button) => {
      button.addEventListener("click", () => document.querySelector(`#${button.dataset.close}`).close());
    });

    [els.addDialog, els.importDialog, els.deviceDialog, els.confirmDialog].forEach((dialog) => {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
      });
    });

    els.addForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!els.addForm.reportValidity()) return;
      addTask(new FormData(els.addForm));
      els.addDialog.close();
    });

    els.planFile.addEventListener("change", () => setSelectedFile(els.planFile.files[0]));
    ["dragenter", "dragover"].forEach((eventName) => {
      els.dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        els.dropZone.classList.add("is-dragging");
      });
    });
    ["dragleave", "drop"].forEach((eventName) => {
      els.dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        els.dropZone.classList.remove("is-dragging");
      });
    });
    els.dropZone.addEventListener("drop", (event) => {
      const file = event.dataTransfer.files[0];
      if (file) setSelectedFile(file);
    });

    els.importForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      els.importSubmitButton.disabled = true;
      try {
        const imported = await parseImportFile(selectedFile);
        state.tasks.push(...imported);
        saveState();
        renderAll();
        scheduleNextReminder();
        els.importDialog.close();
        showToast(`已导入 ${imported.length} 项计划`, "file-check-2");
      } catch (error) {
        setImportError(error.message || "文件导入失败");
      } finally {
        els.importSubmitButton.disabled = !selectedFile;
      }
    });

    document.querySelector("#downloadTemplateButton").addEventListener("click", downloadTemplate);
    els.notificationButton.addEventListener("click", toggleReminders);
    document.querySelector("#reminderSettingsButton").addEventListener("click", toggleReminders);
    els.connectHuaweiButton.addEventListener("click", connectHuaweiHealth);
    els.syncHuaweiButton.addEventListener("click", syncHuaweiHealth);

    document.addEventListener("click", (event) => {
      const action = event.target.closest("[data-action]")?.dataset.action;
      if (action === "export") exportPlans();
      if (action === "share") shareSummary();
      if (action === "install") installApp();
      if (action === "reset") els.confirmDialog.showModal();
    });

    els.confirmResetButton.addEventListener("click", () => {
      state = {
        tasks: createDefaultTasks(),
        remindersEnabled: state.remindersEnabled,
        healthProfile: defaultHealthProfile(),
        calorieLedger: emptyCalorieLedger()
      };
      selectedDate = todayKey();
      localStorage.removeItem(NOTIFIED_KEY);
      saveState();
      renderAll();
      hydrateBurnForm();
      scheduleNextReminder();
      showToast("示例数据已恢复");
    });

    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      installPrompt = event;
    });

    window.addEventListener("focus", checkDueReminders);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkDueReminders();
    });

    const focusPhoto = document.querySelector(".focus-photo");
    focusPhoto.addEventListener("error", () => {
      document.querySelector(".focus-card").classList.add("image-error");
      focusPhoto.hidden = true;
    });
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("./service-worker.js").catch((error) => {
        console.warn("Unable to register service worker.", error);
      });
    }
  }

  function init() {
    els.greeting.textContent = getGreeting();
    saveState();
    refreshIcons();
    bindEvents();
    renderAll();
    hydrateBurnForm();
    registerServiceWorker();
    scheduleNextReminder();
    window.setInterval(checkDueReminders, 30 * 1000);
  }

  init();
})();
