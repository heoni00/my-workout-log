const STORAGE_KEY = "my-workout-log-v1";

const exercisePresets = [
  "스쿼트",
  "벤치프레스",
  "데드리프트",
  "숄더프레스",
  "랫풀다운",
  "바벨로우",
  "런지",
  "러닝"
];

const mealPresets = [
  { name: "밥 한 공기", calories: 300 },
  { name: "닭가슴살", calories: 120 },
  { name: "계란 2개", calories: 150 },
  { name: "프로틴", calories: 120 },
  { name: "바나나", calories: 90 },
  { name: "샐러드", calories: 180 }
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const els = {
  selectedDayName: $("#selectedDayName"),
  selectedDateText: $("#selectedDateText"),
  datePickerBtn: $("#datePickerBtn"),
  dateInput: $("#dateInput"),
  prevDayBtn: $("#prevDayBtn"),
  nextDayBtn: $("#nextDayBtn"),
  todayBtn: $("#todayBtn"),
  todayVolume: $("#todayVolume"),
  todaySets: $("#todaySets"),
  todayCalories: $("#todayCalories"),
  saveState: $("#saveState"),
  exerciseQuick: $("#exerciseQuick"),
  mealQuick: $("#mealQuick"),
  workoutList: $("#workoutList"),
  mealList: $("#mealList"),
  addWorkoutBtn: $("#addWorkoutBtn"),
  addMealBtn: $("#addMealBtn"),
  moodInput: $("#moodInput"),
  intensityInput: $("#intensityInput"),
  intensityLabel: $("#intensityLabel"),
  noteInput: $("#noteInput"),
  saveBtn: $("#saveBtn"),
  deleteDayBtn: $("#deleteDayBtn"),
  calendarGrid: $("#calendarGrid"),
  monthLabel: $("#monthLabel"),
  monthWorkoutCount: $("#monthWorkoutCount"),
  prevMonthBtn: $("#prevMonthBtn"),
  nextMonthBtn: $("#nextMonthBtn"),
  selectedSummaryTitle: $("#selectedSummaryTitle"),
  selectedSummaryBody: $("#selectedSummaryBody"),
  monthWorkoutDays: $("#monthWorkoutDays"),
  streakDays: $("#streakDays"),
  totalVolume: $("#totalVolume"),
  topExercises: $("#topExercises"),
  recentEntries: $("#recentEntries"),
  exportBtn: $("#exportBtn"),
  importInput: $("#importInput"),
  toast: $("#toast"),
  workoutTemplate: $("#workoutTemplate"),
  mealTemplate: $("#mealTemplate"),
  exerciseNames: $("#exerciseNames")
};

let state = loadState();
let selectedDate = state.selectedDate || toISODate(new Date());
let calendarCursor = firstDayOfMonth(parseISODate(selectedDate));
let saveTimer = 0;

init();

function init() {
  renderPresetButtons();
  renderExerciseDatalist();
  bindEvents();
  switchView("log");
  setSelectedDate(selectedDate, { keepCalendar: false });
  registerServiceWorker();
}

function bindEvents() {
  els.prevDayBtn.addEventListener("click", () => shiftSelectedDay(-1));
  els.nextDayBtn.addEventListener("click", () => shiftSelectedDay(1));
  els.todayBtn.addEventListener("click", () => setSelectedDate(toISODate(new Date()), { keepCalendar: false }));
  els.datePickerBtn.addEventListener("click", () => {
    if (typeof els.dateInput.showPicker === "function") {
      els.dateInput.showPicker();
    } else {
      els.dateInput.focus();
    }
  });
  els.dateInput.addEventListener("change", () => {
    if (els.dateInput.value) setSelectedDate(els.dateInput.value, { keepCalendar: false });
  });

  els.addWorkoutBtn.addEventListener("click", () => addWorkout());
  els.addMealBtn.addEventListener("click", () => addMeal());

  els.workoutList.addEventListener("input", handleWorkoutInput);
  els.mealList.addEventListener("input", handleMealInput);
  els.workoutList.addEventListener("click", handleWorkoutClick);
  els.mealList.addEventListener("click", handleMealClick);

  els.moodInput.addEventListener("change", () => {
    currentEntry().mood = els.moodInput.value;
    scheduleSave();
  });
  els.intensityInput.addEventListener("input", () => {
    els.intensityLabel.textContent = els.intensityInput.value;
    currentEntry().intensity = Number(els.intensityInput.value);
    scheduleSave();
  });
  els.noteInput.addEventListener("input", () => {
    currentEntry().note = els.noteInput.value;
    scheduleSave();
  });

  els.saveBtn.addEventListener("click", () => {
    persistNow();
    showToast("기록을 저장했어요.");
  });

  els.deleteDayBtn.addEventListener("click", () => {
    if (!hasEntryContent(currentEntry())) {
      showToast("삭제할 기록이 없어요.");
      return;
    }
    const ok = window.confirm("선택한 날짜의 기록을 삭제할까요?");
    if (!ok) return;
    delete state.entries[selectedDate];
    persistNow();
    renderAll();
    showToast("선택한 날짜 기록을 삭제했어요.");
  });

  els.prevMonthBtn.addEventListener("click", () => {
    calendarCursor = addMonths(calendarCursor, -1);
    renderCalendar();
  });
  els.nextMonthBtn.addEventListener("click", () => {
    calendarCursor = addMonths(calendarCursor, 1);
    renderCalendar();
  });

  els.calendarGrid.addEventListener("click", (event) => {
    const day = event.target.closest(".calendar-day");
    if (!day) return;
    setSelectedDate(day.dataset.date, { keepCalendar: true });
    switchView("calendar");
  });

  $$(".nav-btn").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  els.exportBtn.addEventListener("click", exportData);
  els.importInput.addEventListener("change", importData);
}

function renderPresetButtons() {
  exercisePresets.forEach((name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quick-chip";
    button.textContent = name;
    button.addEventListener("click", () => addWorkout({ name, sets: 3 }));
    els.exerciseQuick.append(button);
  });

  mealPresets.forEach((meal) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quick-chip";
    button.textContent = `${meal.name} ${meal.calories}`;
    button.addEventListener("click", () => addMeal(meal));
    els.mealQuick.append(button);
  });
}

function renderExerciseDatalist() {
  els.exerciseNames.innerHTML = "";
  exercisePresets.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    els.exerciseNames.append(option);
  });
}

function switchView(viewName) {
  $$(".view").forEach((view) => {
    view.classList.toggle("is-active", view.id === `view-${viewName}`);
  });
  $$(".nav-btn").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === viewName);
  });

  if (viewName === "calendar") renderCalendar();
  if (viewName === "stats") renderStats();
}

function setSelectedDate(dateString, options = {}) {
  selectedDate = dateString;
  state.selectedDate = selectedDate;
  ensureEntry(selectedDate);
  els.dateInput.value = selectedDate;
  if (!options.keepCalendar) calendarCursor = firstDayOfMonth(parseISODate(selectedDate));
  persistNow({ quiet: true });
  renderAll();
}

function shiftSelectedDay(amount) {
  const next = addDays(parseISODate(selectedDate), amount);
  setSelectedDate(toISODate(next), { keepCalendar: false });
}

function renderAll() {
  renderDateHeader();
  renderEntry();
  renderTodaySummary();
  renderCalendar();
  renderStats();
}

function renderDateHeader() {
  const date = parseISODate(selectedDate);
  els.selectedDayName.textContent = relativeDayName(date);
  els.selectedDateText.textContent = formatFullDate(date);
}

function renderEntry() {
  const entry = currentEntry();
  renderWorkoutList(entry.workouts);
  renderMealList(entry.meals);
  els.moodInput.value = entry.mood || "";
  els.intensityInput.value = String(entry.intensity || 5);
  els.intensityLabel.textContent = String(entry.intensity || 5);
  els.noteInput.value = entry.note || "";
}

function renderWorkoutList(workouts) {
  els.workoutList.innerHTML = "";
  if (!workouts.length) {
    els.workoutList.append(emptyMessage("운동을 추가하면 kg, 횟수, 세트를 기록할 수 있어요."));
    return;
  }

  workouts.forEach((item) => {
    const node = els.workoutTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.id = item.id;
    $('[data-field="name"]', node).value = item.name || "";
    $('[data-field="weight"]', node).value = cleanNumber(item.weight);
    $('[data-field="reps"]', node).value = cleanNumber(item.reps);
    $('[data-field="sets"]', node).value = cleanNumber(item.sets || 1);
    els.workoutList.append(node);
  });
}

function renderMealList(meals) {
  els.mealList.innerHTML = "";
  if (!meals.length) {
    els.mealList.append(emptyMessage("먹은 음식과 대략적인 kcal를 가볍게 남겨보세요."));
    return;
  }

  meals.forEach((item) => {
    const node = els.mealTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.id = item.id;
    $('[data-field="name"]', node).value = item.name || "";
    $('[data-field="calories"]', node).value = cleanNumber(item.calories);
    els.mealList.append(node);
  });
}

function renderTodaySummary() {
  const totals = summarizeEntry(currentEntry());
  els.todayVolume.textContent = `${formatNumber(totals.volume)} kg`;
  els.todaySets.textContent = String(totals.sets);
  els.todayCalories.textContent = `${formatNumber(totals.calories)} kcal`;
}

function renderCalendar() {
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  els.monthLabel.textContent = `${year}년 ${month + 1}월`;

  const days = [];
  const first = new Date(year, month, 1);
  const start = addDays(first, -first.getDay());
  for (let i = 0; i < 42; i += 1) days.push(addDays(start, i));

  els.calendarGrid.innerHTML = "";
  days.forEach((date) => {
    const dateString = toISODate(date);
    const entry = state.entries[dateString] || blankEntry();
    const totals = summarizeEntry(entry);
    const day = document.createElement("button");
    day.type = "button";
    day.className = "calendar-day";
    day.dataset.date = dateString;
    day.classList.toggle("is-outside", date.getMonth() !== month);
    day.classList.toggle("is-today", dateString === toISODate(new Date()));
    day.classList.toggle("is-selected", dateString === selectedDate);

    const label = document.createElement("span");
    label.textContent = String(date.getDate());
    const small = document.createElement("small");
    small.textContent = totals.calories ? `${formatCompact(totals.calories)}k` : "";
    const dots = document.createElement("div");
    dots.className = "day-dots";
    if (totals.sets) dots.append(dot("workout"));
    if (totals.calories) dots.append(dot("food"));
    if ((entry.note || "").trim()) dots.append(dot("note"));
    day.append(label, small, dots);
    els.calendarGrid.append(day);
  });

  const monthDates = Object.keys(state.entries).filter((date) => {
    const parsed = parseISODate(date);
    return parsed.getFullYear() === year && parsed.getMonth() === month && hasWorkout(state.entries[date]);
  });
  els.monthWorkoutCount.textContent = `${monthDates.length}일 운동`;
  renderSelectedSummary();
}

function renderSelectedSummary() {
  const entry = currentEntry();
  const totals = summarizeEntry(entry);
  els.selectedSummaryTitle.textContent = formatShortDate(parseISODate(selectedDate));
  els.selectedSummaryBody.innerHTML = "";

  if (!hasEntryContent(entry)) {
    els.selectedSummaryBody.append(emptyMessage("이 날짜에는 아직 기록이 없어요."));
    return;
  }

  const workoutText = entry.workouts.length
    ? entry.workouts.map((item) => `${item.name || "운동"} ${cleanNumber(item.weight)}kg x ${cleanNumber(item.reps)}회 x ${cleanNumber(item.sets || 1)}세트`).join(", ")
    : "운동 기록 없음";
  els.selectedSummaryBody.append(summaryItem("운동", workoutText));

  const mealText = entry.meals.length
    ? entry.meals.map((item) => `${item.name || "음식"} ${cleanNumber(item.calories)}kcal`).join(", ")
    : "음식 기록 없음";
  els.selectedSummaryBody.append(summaryItem("음식", `${mealText} · 총 ${formatNumber(totals.calories)}kcal`));

  const note = [entry.mood, entry.intensity ? `강도 ${entry.intensity}/10` : "", entry.note]
    .filter(Boolean)
    .join(" · ");
  els.selectedSummaryBody.append(summaryItem("느낌", note || "메모 없음"));
}

function renderStats() {
  const entries = Object.entries(state.entries)
    .filter(([, entry]) => hasEntryContent(entry))
    .sort(([a], [b]) => b.localeCompare(a));
  const now = parseISODate(selectedDate);
  const monthWorkoutDays = entries.filter(([date, entry]) => {
    const parsed = parseISODate(date);
    return parsed.getFullYear() === now.getFullYear() && parsed.getMonth() === now.getMonth() && hasWorkout(entry);
  }).length;
  const totalVolume = entries.reduce((sum, [, entry]) => sum + summarizeEntry(entry).volume, 0);

  els.monthWorkoutDays.textContent = `${monthWorkoutDays}일`;
  els.streakDays.textContent = `${calculateStreak()}일`;
  els.totalVolume.textContent = `${formatNumber(totalVolume)} kg`;

  renderTopExercises(entries);
  renderRecentEntries(entries);
}

function renderTopExercises(entries) {
  const counts = new Map();
  entries.forEach(([, entry]) => {
    entry.workouts.forEach((workout) => {
      const name = (workout.name || "이름 없는 운동").trim();
      counts.set(name, (counts.get(name) || 0) + Number(workout.sets || 1));
    });
  });
  const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  els.topExercises.innerHTML = "";
  if (!top.length) {
    els.topExercises.append(emptyMessage("운동을 기록하면 자주 한 종목이 보여요."));
    return;
  }
  const max = Math.max(...top.map(([, count]) => count), 1);
  top.forEach(([name, count]) => {
    const item = document.createElement("div");
    item.className = "bar-item";
    item.innerHTML = `
      <strong>${escapeHTML(name)}</strong>
      <span>${count}세트</span>
      <div class="bar-track"><div class="bar-fill" style="width: ${(count / max) * 100}%"></div></div>
    `;
    els.topExercises.append(item);
  });
}

function renderRecentEntries(entries) {
  els.recentEntries.innerHTML = "";
  if (!entries.length) {
    els.recentEntries.append(emptyMessage("아직 기록이 없어요. 오늘부터 한 줄만 남겨도 충분해요."));
    return;
  }
  entries.slice(0, 7).forEach(([date, entry]) => {
    const totals = summarizeEntry(entry);
    const workoutNames = entry.workouts.map((item) => item.name).filter(Boolean).slice(0, 3).join(", ");
    const item = document.createElement("button");
    item.type = "button";
    item.className = "recent-item";
    item.innerHTML = `
      <strong>${formatShortDate(parseISODate(date))}</strong>
      <span>${escapeHTML(workoutNames || "운동 기록 없음")} · ${totals.sets}세트 · ${formatNumber(totals.calories)}kcal</span>
    `;
    item.addEventListener("click", () => {
      setSelectedDate(date, { keepCalendar: false });
      switchView("log");
    });
    els.recentEntries.append(item);
  });
}

function addWorkout(values = {}) {
  const entry = currentEntry();
  entry.workouts.push({
    id: cryptoId(),
    name: values.name || "",
    weight: values.weight || "",
    reps: values.reps || "",
    sets: values.sets || 1
  });
  scheduleSave();
  renderWorkoutList(entry.workouts);
  renderTodaySummary();
  focusLastInput(els.workoutList, '[data-field="name"]');
}

function addMeal(values = {}) {
  const entry = currentEntry();
  entry.meals.push({
    id: cryptoId(),
    name: values.name || "",
    calories: values.calories || ""
  });
  scheduleSave();
  renderMealList(entry.meals);
  renderTodaySummary();
  focusLastInput(els.mealList, '[data-field="name"]');
}

function handleWorkoutInput(event) {
  const row = event.target.closest(".workout-row");
  if (!row) return;
  const item = currentEntry().workouts.find((workout) => workout.id === row.dataset.id);
  if (!item) return;
  item[event.target.dataset.field] = parseFieldValue(event.target);
  scheduleSave();
  renderTodaySummary();
}

function handleMealInput(event) {
  const row = event.target.closest(".meal-row");
  if (!row) return;
  const item = currentEntry().meals.find((meal) => meal.id === row.dataset.id);
  if (!item) return;
  item[event.target.dataset.field] = parseFieldValue(event.target);
  scheduleSave();
  renderTodaySummary();
}

function handleWorkoutClick(event) {
  const remove = event.target.closest(".remove-row");
  if (!remove) return;
  const row = remove.closest(".workout-row");
  const entry = currentEntry();
  entry.workouts = entry.workouts.filter((workout) => workout.id !== row.dataset.id);
  scheduleSave();
  renderWorkoutList(entry.workouts);
  renderTodaySummary();
}

function handleMealClick(event) {
  const remove = event.target.closest(".remove-row");
  if (!remove) return;
  const row = remove.closest(".meal-row");
  const entry = currentEntry();
  entry.meals = entry.meals.filter((meal) => meal.id !== row.dataset.id);
  scheduleSave();
  renderMealList(entry.meals);
  renderTodaySummary();
}

function currentEntry() {
  return ensureEntry(selectedDate);
}

function ensureEntry(date) {
  if (!state.entries[date]) state.entries[date] = blankEntry();
  const entry = state.entries[date];
  entry.workouts ||= [];
  entry.meals ||= [];
  entry.intensity ||= 5;
  entry.mood ||= "";
  entry.note ||= "";
  return entry;
}

function blankEntry() {
  return { workouts: [], meals: [], mood: "", intensity: 5, note: "" };
}

function summarizeEntry(entry) {
  const workouts = entry.workouts || [];
  const meals = entry.meals || [];
  return {
    volume: workouts.reduce((sum, item) => {
      const weight = Number(item.weight) || 0;
      const reps = Number(item.reps) || 0;
      const sets = Number(item.sets) || 0;
      return sum + weight * reps * sets;
    }, 0),
    sets: workouts.reduce((sum, item) => sum + (Number(item.sets) || 0), 0),
    calories: meals.reduce((sum, item) => sum + (Number(item.calories) || 0), 0)
  };
}

function hasEntryContent(entry) {
  return hasWorkout(entry) || (entry.meals || []).length > 0 || Boolean((entry.note || "").trim()) || Boolean(entry.mood);
}

function hasWorkout(entry) {
  return (entry.workouts || []).some((item) => item.name || item.weight || item.reps || item.sets);
}

function scheduleSave() {
  els.saveState.textContent = "저장 중";
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    persistNow();
    renderCalendar();
    renderStats();
  }, 250);
}

function persistNow(options = {}) {
  pruneEmptyEntries();
  state.selectedDate = selectedDate;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (!options.quiet) {
    els.saveState.textContent = "저장됨";
  }
}

function pruneEmptyEntries() {
  Object.keys(state.entries).forEach((date) => {
    if (date === selectedDate) return;
    if (!hasEntryContent(state.entries[date])) delete state.entries[date];
  });
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: {}, selectedDate: toISODate(new Date()) };
    const parsed = JSON.parse(raw);
    return {
      entries: parsed.entries && typeof parsed.entries === "object" ? parsed.entries : {},
      selectedDate: parsed.selectedDate || toISODate(new Date())
    };
  } catch (error) {
    console.warn("Failed to load workout log", error);
    return { entries: {}, selectedDate: toISODate(new Date()) };
  }
}

function calculateStreak() {
  let cursor = parseISODate(toISODate(new Date()));
  let count = 0;
  while (true) {
    const date = toISODate(cursor);
    if (!state.entries[date] || !hasWorkout(state.entries[date])) break;
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

function exportData() {
  persistNow({ quiet: true });
  const payload = JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `my-workout-log-${toISODate(new Date())}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("백업 파일을 만들었어요.");
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      if (!parsed.entries || typeof parsed.entries !== "object") {
        throw new Error("Invalid backup");
      }
      state = {
        entries: parsed.entries,
        selectedDate: parsed.selectedDate || selectedDate
      };
      selectedDate = state.selectedDate;
      persistNow();
      setSelectedDate(selectedDate, { keepCalendar: false });
      showToast("백업을 불러왔어요.");
    } catch (error) {
      showToast("가져올 수 없는 파일이에요.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (location.protocol === "file:") return;
  navigator.serviceWorker.register("sw.js").catch(() => {});
}

function emptyMessage(message) {
  const node = document.createElement("p");
  node.className = "empty";
  node.textContent = message;
  return node;
}

function summaryItem(title, text) {
  const node = document.createElement("div");
  node.className = "summary-item";
  node.innerHTML = `<strong>${escapeHTML(title)}</strong><span>${escapeHTML(text)}</span>`;
  return node;
}

function dot(type) {
  const node = document.createElement("span");
  node.className = `dot ${type}`;
  return node;
}

function focusLastInput(container, selector) {
  const input = $$(selector, container).at(-1);
  if (input) input.focus();
}

function parseFieldValue(input) {
  if (input.type === "number") return input.value === "" ? "" : Number(input.value);
  return input.value;
}

function cleanNumber(value) {
  return value === "" || value === undefined || value === null ? "" : value;
}

function cryptoId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseISODate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function addMonths(date, amount) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return firstDayOfMonth(next);
}

function firstDayOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function relativeDayName(date) {
  const today = toISODate(new Date());
  const target = toISODate(date);
  if (target === today) return "오늘";
  if (target === toISODate(addDays(new Date(), -1))) return "어제";
  if (target === toISODate(addDays(new Date(), 1))) return "내일";
  return new Intl.DateTimeFormat("ko-KR", { weekday: "long" }).format(date);
}

function formatFullDate(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short"
  }).format(date);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short"
  }).format(date);
}

function formatNumber(value) {
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format(value || 0);
}

function formatCompact(value) {
  return Math.round((value || 0) / 100) / 10;
}

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 1800);
}
