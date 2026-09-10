(() => {
  "use strict";

  const STORAGE_KEY = "rhythm-health-state-v1";
  const NOTIFIED_KEY = "rhythm-health-notified-v1";
  const MAX_IMPORT_BYTES = 2 * 1024 * 1024;
  const DAY_MS = 24 * 60 * 60 * 1000;
  const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];
  const FULL_WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

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
    calorieMetric: document.querySelector("#calorieMetric"),
    durationMetric: document.querySelector("#durationMetric"),
    barChart: document.querySelector("#barChart"),
    balanceScore: document.querySelector("#balanceScore"),
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
    confirmDialog: document.querySelector("#confirmDialog"),
    confirmResetButton: document.querySelector("#confirmResetButton"),
    toast: document.querySelector("#toast"),
    toastMessage: document.querySelector("#toastMessage")
  };

  let state = loadState();
  let selectedDate = todayKey();
  let activeFilter = "all";
  let selectedFile = null;
  let installPrompt = null;
  let toastTimer = 0;
  let reminderTimer = 0;

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

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Array.isArray(saved.tasks)) {
        return {
          tasks: saved.tasks,
          remindersEnabled: Boolean(saved.remindersEnabled)
        };
      }
    } catch (error) {
      console.warn("Unable to read saved plan data.", error);
    }

    return {
      tasks: createDefaultTasks(),
      remindersEnabled: false
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

  function completedExerciseBetween(start, end) {
    return state.tasks.filter(
      (task) => task.type === "exercise" && task.done && task.date >= start && task.date <= end
    );
  }

  function renderInsights() {
    const end = todayKey();
    const start = offsetDate(end, -6);
    const exercises = completedExerciseBetween(start, end);
    const calories = exercises.reduce((sum, task) => sum + Number(task.calories || 0), 0);
    const duration = exercises.reduce((sum, task) => sum + Number(task.duration || 0), 0);
    const mealTasks = state.tasks.filter(
      (task) => task.type === "meal" && task.done && task.date >= start && task.date <= end
    );
    const totalWeekTasks = state.tasks.filter((task) => task.date >= start && task.date <= end);
    const completedWeekTasks = totalWeekTasks.filter((task) => task.done);
    const completion = totalWeekTasks.length ? completedWeekTasks.length / totalWeekTasks.length : 0;
    const variety = exercises.length && mealTasks.length ? 8 : 0;
    const score = Math.min(98, Math.round(58 + completion * 32 + variety));

    els.calorieMetric.textContent = calories.toLocaleString("zh-CN");
    els.durationMetric.textContent = duration.toLocaleString("zh-CN");
    els.balanceScore.textContent = String(score);

    const chartDays = Array.from({ length: 7 }, (_, index) => offsetDate(end, index - 6));
    els.barChart.innerHTML = chartDays
      .map((key) => {
        const tasks = state.tasks.filter((task) => task.date === key);
        const done = tasks.filter((task) => task.done).length;
        const value = tasks.length ? Math.max(8, Math.round((done / tasks.length) * 100)) : 4;
        const date = dateFromKey(key);
        return `
          <div class="bar-column${key === todayKey() ? " is-today" : ""}" title="${formatDateLabel(key)}：${done}/${tasks.length}">
            <div class="bar-track"><span class="bar-fill" style="height:${value}%"></span></div>
            <span>${WEEKDAYS[date.getDay()]}</span>
          </div>
        `;
      })
      .join("");
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
      insights: ["每一步都有回应", "看见身体的变化"],
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
      plans: sortTasks(state.tasks)
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

    [els.addDialog, els.importDialog, els.confirmDialog].forEach((dialog) => {
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
        remindersEnabled: state.remindersEnabled
      };
      selectedDate = todayKey();
      localStorage.removeItem(NOTIFIED_KEY);
      saveState();
      renderAll();
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
    registerServiceWorker();
    scheduleNextReminder();
    window.setInterval(checkDueReminders, 30 * 1000);
  }

  init();
})();
