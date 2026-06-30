const STORAGE_KEY = "my-workout-log-v2";
const LEGACY_KEY = "my-workout-log-v1";

const exercisePresets = ["스쿼트", "벤치프레스", "데드리프트", "숄더프레스", "랫풀다운", "바벨로우", "런지", "러닝"];
const mealPresets = [
  { type: "아침", time: "08:00", name: "그릭요거트", calories: 180 },
  { type: "점심", time: "12:30", name: "닭가슴살 덮밥", calories: 520 },
  { type: "저녁", time: "19:00", name: "연어 샐러드", calories: 430 },
  { type: "간식", time: "16:00", name: "프로틴", calories: 120 }
];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const els = {
  todayBtn: $("#todayBtn"),
  prevDayBtn: $("#prevDayBtn"),
  nextDayBtn: $("#nextDayBtn"),
  datePickerBtn: $("#datePickerBtn"),
  dateInput: $("#dateInput"),
  selectedDayName: $("#selectedDayName"),
  selectedDateText: $("#selectedDateText"),
  todayInfo: $("#todayInfo"),
  latestWorkoutTitle: $("#latestWorkoutTitle"),
  latestWorkoutMeta: $("#latestWorkoutMeta"),
  latestBodyTitle: $("#latestBodyTitle"),
  latestBodyMeta: $("#latestBodyMeta"),
  homeWorkoutSummary: $("#homeWorkoutSummary"),
  homeMealSummary: $("#homeMealSummary"),
  homeNoteSummary: $("#homeNoteSummary"),
  monthCount: $("#monthCount"),
  monthLabel: $("#monthLabel"),
  calendarGrid: $("#calendarGrid"),
  prevMonthBtn: $("#prevMonthBtn"),
  nextMonthBtn: $("#nextMonthBtn"),
  selectedSummaryTitle: $("#selectedSummaryTitle"),
  selectedSummaryBody: $("#selectedSummaryBody"),
  saveState: $("#saveState"),
  workoutStartInput: $("#workoutStartInput"),
  workoutEndInput: $("#workoutEndInput"),
  workoutDuration: $("#workoutDuration"),
  exerciseQuick: $("#exerciseQuick"),
  workoutList: $("#workoutList"),
  addWorkoutBtn: $("#addWorkoutBtn"),
  moodInput: $("#moodInput"),
  intensityInput: $("#intensityInput"),
  intensityLabel: $("#intensityLabel"),
  workoutMemoInput: $("#workoutMemoInput"),
  saveWorkoutBtn: $("#saveWorkoutBtn"),
  deleteWorkoutBtn: $("#deleteWorkoutBtn"),
  mealTotalChip: $("#mealTotalChip"),
  mealQuick: $("#mealQuick"),
  mealList: $("#mealList"),
  addMealBtn: $("#addMealBtn"),
  saveMealsBtn: $("#saveMealsBtn"),
  deleteMealsBtn: $("#deleteMealsBtn"),
  bodyHistoryCount: $("#bodyHistoryCount"),
  bodyDateInput: $("#bodyDateInput"),
  bodyWeightInput: $("#bodyWeightInput"),
  bodyMuscleInput: $("#bodyMuscleInput"),
  bodyFatInput: $("#bodyFatInput"),
  bodyFatPercentInput: $("#bodyFatPercentInput"),
  bodyMemoInput: $("#bodyMemoInput"),
  addBodyBtn: $("#addBodyBtn"),
  bodyHistory: $("#bodyHistory"),
  noteCountChip: $("#noteCountChip"),
  infoDateInput: $("#infoDateInput"),
  infoCategoryInput: $("#infoCategoryInput"),
  infoTitleInput: $("#infoTitleInput"),
  infoUrlInput: $("#infoUrlInput"),
  infoMemoInput: $("#infoMemoInput"),
  addInfoNoteBtn: $("#addInfoNoteBtn"),
  infoNoteList: $("#infoNoteList"),
  exportBtn: $("#exportBtn"),
  importInput: $("#importInput"),
  workoutTemplate: $("#workoutTemplate"),
  mealTemplate: $("#mealTemplate"),
  exerciseNames: $("#exerciseNames"),
  toast: $("#toast")
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
  switchView("home");
  setSelectedDate(selectedDate, { keepCalendar: false, quiet: true });
  registerServiceWorker();
}

function bindEvents() {
  els.todayBtn.addEventListener("click", () => setSelectedDate(toISODate(new Date()), { keepCalendar: false }));
  els.prevDayBtn.addEventListener("click", () => shiftSelectedDay(-1));
  els.nextDayBtn.addEventListener("click", () => shiftSelectedDay(1));
  els.datePickerBtn.addEventListener("click", () => {
    if (typeof els.dateInput.showPicker === "function") els.dateInput.showPicker();
    else els.dateInput.focus();
  });
  els.dateInput.addEventListener("change", () => {
    if (els.dateInput.value) setSelectedDate(els.dateInput.value, { keepCalendar: false });
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
  });

  $$(".nav-btn").forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));

  els.workoutStartInput.addEventListener("input", updateWorkoutMeta);
  els.workoutEndInput.addEventListener("input", updateWorkoutMeta);
  els.addWorkoutBtn.addEventListener("click", () => addWorkout());
  els.workoutList.addEventListener("input", handleWorkoutInput);
  els.workoutList.addEventListener("click", handleWorkoutClick);
  els.moodInput.addEventListener("change", () => {
    currentEntry().mood = els.moodInput.value;
    scheduleSave();
  });
  els.intensityInput.addEventListener("input", () => {
    els.intensityLabel.textContent = els.intensityInput.value;
    currentEntry().intensity = Number(els.intensityInput.value);
    scheduleSave();
  });
  els.workoutMemoInput.addEventListener("input", () => {
    currentEntry().workoutMemo = els.workoutMemoInput.value;
    scheduleSave();
  });
  els.saveWorkoutBtn.addEventListener("click", () => {
    persistNow();
    showToast("운동을 저장했어요.");
  });
  els.deleteWorkoutBtn.addEventListener("click", deleteWorkoutForDay);

  els.addMealBtn.addEventListener("click", () => addMeal());
  els.mealList.addEventListener("input", handleMealInput);
  els.mealList.addEventListener("change", handleMealInput);
  els.mealList.addEventListener("click", handleMealClick);
  els.saveMealsBtn.addEventListener("click", () => {
    persistNow();
    showToast("식단을 저장했어요.");
  });
  els.deleteMealsBtn.addEventListener("click", deleteMealsForDay);

  els.addBodyBtn.addEventListener("click", addBodyRecord);
  els.bodyHistory.addEventListener("click", handleBodyDelete);
  els.addInfoNoteBtn.addEventListener("click", addInfoNote);
  els.infoNoteList.addEventListener("click", handleInfoNoteDelete);

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
    button.textContent = `${meal.type} ${meal.name}`;
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
  $$(".view").forEach((view) => view.classList.toggle("is-active", view.id === `view-${viewName}`));
  $$(".nav-btn").forEach((button) => button.classList.toggle("is-active", button.dataset.view === viewName));
  renderAll();
}

function setSelectedDate(dateString, options = {}) {
  selectedDate = dateString;
  state.selectedDate = selectedDate;
  ensureEntry(selectedDate);
  els.dateInput.value = selectedDate;
  els.bodyDateInput.value = selectedDate;
  els.infoDateInput.value = selectedDate;
  if (!options.keepCalendar) calendarCursor = firstDayOfMonth(parseISODate(selectedDate));
  persistNow({ quiet: options.quiet ?? true });
  renderAll();
}

function shiftSelectedDay(amount) {
  setSelectedDate(toISODate(addDays(parseISODate(selectedDate), amount)), { keepCalendar: false });
}

function renderAll() {
  renderDateHeader();
  renderHome();
  renderWorkoutPage();
  renderMealsPage();
  renderBodyPage();
  renderNotesPage();
  renderCalendar();
  renderSelectedSummary();
}

function renderDateHeader() {
  const date = parseISODate(selectedDate);
  els.selectedDayName.textContent = relativeDayName(date);
  els.selectedDateText.textContent = formatFullDate(date);
  els.todayInfo.textContent = formatLongDate(new Date());
}

function renderHome() {
  const entry = currentEntry();
  const totals = summarizeEntry(entry);
  const notesForDate = state.infoNotes.filter((note) => note.date === selectedDate).length;
  els.homeWorkoutSummary.textContent = `${totals.sets}세트`;
  els.homeMealSummary.textContent = `${formatNumber(totals.calories)} kcal`;
  els.homeNoteSummary.textContent = `${notesForDate}개`;

  const recentWorkout = findLatestWorkout();
  if (recentWorkout) {
    const days = daysBetween(parseISODate(recentWorkout.date), new Date());
    els.latestWorkoutTitle.textContent = recentWorkout.names || "운동 기록";
    els.latestWorkoutMeta.textContent = days === 0 ? "오늘 운동했어요" : `${days}일 전 운동`;
  } else {
    els.latestWorkoutTitle.textContent = "아직 기록 없음";
    els.latestWorkoutMeta.textContent = "운동 페이지에서 시작해요";
  }

  const latestBody = latestBodyRecord();
  if (latestBody) {
    els.latestBodyTitle.textContent = `${cleanNumber(latestBody.weight)}kg`;
    els.latestBodyMeta.textContent = `근육 ${emptyDash(latestBody.muscle)}kg · 지방 ${emptyDash(latestBody.fatPercent)}%`;
  } else {
    els.latestBodyTitle.textContent = "인바디 없음";
    els.latestBodyMeta.textContent = "몸 상태 페이지에서 등록";
  }
}

function renderWorkoutPage() {
  const entry = currentEntry();
  els.workoutStartInput.value = entry.workoutStart || "";
  els.workoutEndInput.value = entry.workoutEnd || "";
  renderWorkoutDuration();
  renderWorkoutList(entry.workouts);
  els.moodInput.value = entry.mood || "";
  els.intensityInput.value = String(entry.intensity || 5);
  els.intensityLabel.textContent = String(entry.intensity || 5);
  els.workoutMemoInput.value = entry.workoutMemo || "";
}

function renderWorkoutList(workouts) {
  els.workoutList.innerHTML = "";
  if (!workouts.length) {
    els.workoutList.append(emptyMessage("운동 기록이 없어요."));
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

function renderMealsPage() {
  const entry = currentEntry();
  renderMealList(entry.meals);
  renderMealTotal();
}

function renderMealTotal() {
  els.mealTotalChip.textContent = `${formatNumber(summarizeEntry(currentEntry()).calories)} kcal`;
}

function renderMealList(meals) {
  els.mealList.innerHTML = "";
  if (!meals.length) {
    els.mealList.append(emptyMessage("식단 기록이 없어요."));
    return;
  }
  meals.forEach((item) => {
    const node = els.mealTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.id = item.id;
    $('[data-field="type"]', node).value = item.type || "아침";
    $('[data-field="time"]', node).value = item.time || "";
    $('[data-field="name"]', node).value = item.name || "";
    $('[data-field="calories"]', node).value = cleanNumber(item.calories);
    els.mealList.append(node);
  });
}

function renderBodyPage() {
  els.bodyDateInput.value ||= selectedDate;
  els.bodyHistoryCount.textContent = `${state.bodyRecords.length}개`;
  els.bodyHistory.innerHTML = "";
  const records = [...state.bodyRecords].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  if (!records.length) {
    els.bodyHistory.append(emptyMessage("인바디 기록이 없어요."));
    return;
  }
  records.forEach((record) => {
    const item = document.createElement("article");
    item.className = "history-item";
    item.innerHTML = `
      <div>
        <strong>${escapeHTML(formatShortDate(parseISODate(record.date)))}</strong>
        <span>${emptyDash(record.weight)}kg · 근육 ${emptyDash(record.muscle)}kg · 지방 ${emptyDash(record.fat)}kg · ${emptyDash(record.fatPercent)}%</span>
        ${record.memo ? `<p>${escapeHTML(record.memo)}</p>` : ""}
      </div>
      <button class="icon-btn remove-row" type="button" data-id="${record.id}" aria-label="인바디 삭제"><svg><use href="#icon-trash"></use></svg></button>
    `;
    els.bodyHistory.append(item);
  });
}

function renderNotesPage() {
  els.infoDateInput.value ||= selectedDate;
  els.noteCountChip.textContent = `${state.infoNotes.length}개`;
  els.infoNoteList.innerHTML = "";
  const notes = [...state.infoNotes].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  if (!notes.length) {
    els.infoNoteList.append(emptyMessage("저장한 메모가 없어요."));
    return;
  }
  notes.forEach((note) => {
    const item = document.createElement("article");
    item.className = "note-item";
    const url = normalizeUrl(note.url || "");
    item.innerHTML = `
      <div>
        <div class="note-topline"><span>${escapeHTML(note.category || "기타")}</span><time>${escapeHTML(formatShortDate(parseISODate(note.date)))}</time></div>
        <strong>${escapeHTML(note.title || "제목 없음")}</strong>
        ${note.memo ? `<p>${escapeHTML(note.memo)}</p>` : ""}
        ${url ? `<a href="${escapeHTML(url)}" target="_blank" rel="noopener"><svg><use href="#icon-link"></use></svg>${escapeHTML(url)}</a>` : ""}
      </div>
      <button class="icon-btn remove-row" type="button" data-id="${note.id}" aria-label="메모 삭제"><svg><use href="#icon-trash"></use></svg></button>
    `;
    els.infoNoteList.append(item);
  });
}

function renderCalendar() {
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  els.monthLabel.textContent = `${year}년 ${month + 1}월`;
  els.calendarGrid.innerHTML = "";

  const first = new Date(year, month, 1);
  const start = addDays(first, -first.getDay());
  for (let i = 0; i < 42; i += 1) {
    const date = addDays(start, i);
    const dateString = toISODate(date);
    const entry = state.entries[dateString] || blankEntry();
    const hasBody = state.bodyRecords.some((record) => record.date === dateString);
    const hasNote = state.infoNotes.some((note) => note.date === dateString);
    const totals = summarizeEntry(entry);
    const day = document.createElement("button");
    day.type = "button";
    day.className = "calendar-day";
    day.dataset.date = dateString;
    day.classList.toggle("is-outside", date.getMonth() !== month);
    day.classList.toggle("is-today", dateString === toISODate(new Date()));
    day.classList.toggle("is-selected", dateString === selectedDate);
    day.innerHTML = `<span>${date.getDate()}</span><small>${totals.calories ? `${formatCompact(totals.calories)}k` : ""}</small>`;
    const dots = document.createElement("div");
    dots.className = "day-dots";
    if (hasWorkout(entry)) dots.append(dot("workout"));
    if ((entry.meals || []).length) dots.append(dot("food"));
    if (hasBody) dots.append(dot("body"));
    if (hasNote || (entry.workoutMemo || "").trim()) dots.append(dot("note"));
    day.append(dots);
    els.calendarGrid.append(day);
  }

  const monthWorkoutDays = Object.entries(state.entries).filter(([date, entry]) => {
    const parsed = parseISODate(date);
    return parsed.getFullYear() === year && parsed.getMonth() === month && hasWorkout(entry);
  }).length;
  els.monthCount.textContent = `${monthWorkoutDays}일 운동`;
}

function renderSelectedSummary() {
  const entry = currentEntry();
  const totals = summarizeEntry(entry);
  const body = state.bodyRecords.filter((record) => record.date === selectedDate).at(-1);
  const notes = state.infoNotes.filter((note) => note.date === selectedDate);
  els.selectedSummaryTitle.textContent = formatShortDate(parseISODate(selectedDate));
  els.selectedSummaryBody.innerHTML = "";
  if (!hasDayContent(selectedDate)) {
    els.selectedSummaryBody.append(emptyMessage("선택한 날짜 기록이 없어요."));
    return;
  }
  if (hasWorkout(entry)) {
    const duration = workoutDurationText(entry);
    els.selectedSummaryBody.append(summaryItem("운동", `${totals.sets}세트 · ${formatNumber(totals.volume)}kg${duration ? ` · ${duration}` : ""}`));
  }
  if ((entry.meals || []).length) {
    els.selectedSummaryBody.append(summaryItem("식단", `${entry.meals.length}끼 · ${formatNumber(totals.calories)}kcal`));
  }
  if (body) {
    els.selectedSummaryBody.append(summaryItem("인바디", `${emptyDash(body.weight)}kg · 근육 ${emptyDash(body.muscle)}kg · 지방 ${emptyDash(body.fatPercent)}%`));
  }
  if (notes.length || entry.workoutMemo) {
    els.selectedSummaryBody.append(summaryItem("메모", `${notes.length}개${entry.workoutMemo ? " · 운동 메모 있음" : ""}`));
  }
}

function addWorkout(values = {}) {
  const entry = currentEntry();
  entry.workouts.push({ id: cryptoId(), name: values.name || "", weight: values.weight || "", reps: values.reps || "", sets: values.sets || 1 });
  scheduleSave();
  renderWorkoutList(entry.workouts);
  renderHome();
  focusLastInput(els.workoutList, '[data-field="name"]');
}

function handleWorkoutInput(event) {
  const row = event.target.closest(".workout-row");
  if (!row) return;
  const item = currentEntry().workouts.find((workout) => workout.id === row.dataset.id);
  if (!item) return;
  item[event.target.dataset.field] = parseFieldValue(event.target);
  scheduleSave();
}

function handleWorkoutClick(event) {
  const remove = event.target.closest(".remove-row");
  if (!remove) return;
  const row = remove.closest(".workout-row");
  const entry = currentEntry();
  entry.workouts = entry.workouts.filter((workout) => workout.id !== row.dataset.id);
  scheduleSave();
  renderWorkoutList(entry.workouts);
}

function updateWorkoutMeta() {
  const entry = currentEntry();
  entry.workoutStart = els.workoutStartInput.value;
  entry.workoutEnd = els.workoutEndInput.value;
  renderWorkoutDuration();
  scheduleSave();
}

function renderWorkoutDuration() {
  els.workoutDuration.textContent = workoutDurationText(currentEntry()) || "0분";
}

function deleteWorkoutForDay() {
  const entry = currentEntry();
  if (!hasWorkout(entry) && !entry.workoutStart && !entry.workoutEnd && !entry.workoutMemo) {
    showToast("삭제할 운동 기록이 없어요.");
    return;
  }
  if (!window.confirm("선택한 날짜의 운동 기록을 삭제할까요?")) return;
  entry.workouts = [];
  entry.workoutStart = "";
  entry.workoutEnd = "";
  entry.workoutMemo = "";
  entry.mood = "";
  entry.intensity = 5;
  persistNow();
  renderAll();
  showToast("운동 기록을 삭제했어요.");
}

function addMeal(values = {}) {
  const entry = currentEntry();
  entry.meals.push({ id: cryptoId(), type: values.type || "간식", time: values.time || "", name: values.name || "", calories: values.calories || "" });
  scheduleSave();
  renderMealList(entry.meals);
  renderMealsPage();
  focusLastInput(els.mealList, '[data-field="name"]');
}

function handleMealInput(event) {
  const row = event.target.closest(".meal-row");
  if (!row) return;
  const item = currentEntry().meals.find((meal) => meal.id === row.dataset.id);
  if (!item) return;
  item[event.target.dataset.field] = parseFieldValue(event.target);
  scheduleSave();
  renderMealTotal();
}

function handleMealClick(event) {
  const remove = event.target.closest(".remove-row");
  if (!remove) return;
  const row = remove.closest(".meal-row");
  const entry = currentEntry();
  entry.meals = entry.meals.filter((meal) => meal.id !== row.dataset.id);
  scheduleSave();
  renderMealList(entry.meals);
  renderMealsPage();
}

function deleteMealsForDay() {
  const entry = currentEntry();
  if (!entry.meals.length) {
    showToast("삭제할 식단 기록이 없어요.");
    return;
  }
  if (!window.confirm("선택한 날짜의 식단 기록을 삭제할까요?")) return;
  entry.meals = [];
  persistNow();
  renderAll();
  showToast("식단 기록을 삭제했어요.");
}

function addBodyRecord() {
  const date = els.bodyDateInput.value || selectedDate;
  const record = {
    id: cryptoId(),
    date,
    weight: parseOptionalNumber(els.bodyWeightInput.value),
    muscle: parseOptionalNumber(els.bodyMuscleInput.value),
    fat: parseOptionalNumber(els.bodyFatInput.value),
    fatPercent: parseOptionalNumber(els.bodyFatPercentInput.value),
    memo: els.bodyMemoInput.value.trim()
  };
  if (!record.weight && !record.muscle && !record.fat && !record.fatPercent && !record.memo) {
    showToast("인바디 값을 하나 이상 입력해 주세요.");
    return;
  }
  state.bodyRecords.push(record);
  els.bodyWeightInput.value = "";
  els.bodyMuscleInput.value = "";
  els.bodyFatInput.value = "";
  els.bodyFatPercentInput.value = "";
  els.bodyMemoInput.value = "";
  persistNow();
  renderAll();
  showToast("인바디를 추가했어요.");
}

function handleBodyDelete(event) {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  state.bodyRecords = state.bodyRecords.filter((record) => record.id !== button.dataset.id);
  persistNow();
  renderAll();
  showToast("인바디 기록을 삭제했어요.");
}

function addInfoNote() {
  const title = els.infoTitleInput.value.trim();
  const memo = els.infoMemoInput.value.trim();
  const url = els.infoUrlInput.value.trim();
  if (!title && !memo && !url) {
    showToast("메모 내용을 입력해 주세요.");
    return;
  }
  state.infoNotes.push({
    id: cryptoId(),
    date: els.infoDateInput.value || selectedDate,
    category: els.infoCategoryInput.value,
    title,
    url,
    memo
  });
  els.infoTitleInput.value = "";
  els.infoUrlInput.value = "";
  els.infoMemoInput.value = "";
  persistNow();
  renderAll();
  showToast("메모를 추가했어요.");
}

function handleInfoNoteDelete(event) {
  const button = event.target.closest("[data-id]");
  if (!button) return;
  state.infoNotes = state.infoNotes.filter((note) => note.id !== button.dataset.id);
  persistNow();
  renderAll();
  showToast("메모를 삭제했어요.");
}

function currentEntry() {
  return ensureEntry(selectedDate);
}

function ensureEntry(date) {
  if (!state.entries[date]) state.entries[date] = blankEntry();
  const entry = state.entries[date];
  entry.workouts ||= [];
  entry.meals ||= [];
  entry.mood ||= "";
  entry.intensity ||= 5;
  entry.workoutMemo ||= entry.note || "";
  entry.workoutStart ||= "";
  entry.workoutEnd ||= "";
  return entry;
}

function blankEntry() {
  return { workouts: [], meals: [], workoutStart: "", workoutEnd: "", mood: "", intensity: 5, workoutMemo: "" };
}

function summarizeEntry(entry) {
  const workouts = entry.workouts || [];
  const meals = entry.meals || [];
  return {
    volume: workouts.reduce((sum, item) => sum + (Number(item.weight) || 0) * (Number(item.reps) || 0) * (Number(item.sets) || 0), 0),
    sets: workouts.reduce((sum, item) => sum + (Number(item.sets) || 0), 0),
    calories: meals.reduce((sum, item) => sum + (Number(item.calories) || 0), 0)
  };
}

function hasWorkout(entry) {
  return (entry.workouts || []).some((item) => item.name || item.weight || item.reps || item.sets);
}

function hasDayContent(date) {
  const entry = state.entries[date] || blankEntry();
  return hasWorkout(entry) || (entry.meals || []).length > 0 || Boolean(entry.workoutMemo) || state.bodyRecords.some((record) => record.date === date) || state.infoNotes.some((note) => note.date === date);
}

function findLatestWorkout() {
  return Object.entries(state.entries)
    .filter(([, entry]) => hasWorkout(entry))
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, entry]) => ({
      date,
      names: entry.workouts.map((workout) => workout.name).filter(Boolean).slice(0, 2).join(", ")
    }))[0];
}

function latestBodyRecord() {
  return [...state.bodyRecords].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))[0];
}

function scheduleSave() {
  els.saveState.textContent = "저장 중";
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    persistNow();
    renderHome();
    renderMealTotal();
    renderCalendar();
    renderSelectedSummary();
  }, 250);
}

function persistNow(options = {}) {
  pruneEmptyEntries();
  state.selectedDate = selectedDate;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (!options.quiet) els.saveState.textContent = "저장됨";
}

function pruneEmptyEntries() {
  Object.keys(state.entries).forEach((date) => {
    const entry = state.entries[date];
    if (date === selectedDate) return;
    if (!hasDayContent(date)) delete state.entries[date];
  });
}

function loadState() {
  const fresh = safeJSON(localStorage.getItem(STORAGE_KEY));
  if (fresh) return normalizeState(fresh);
  const legacy = safeJSON(localStorage.getItem(LEGACY_KEY));
  if (legacy) return normalizeState(legacy);
  return normalizeState({});
}

function normalizeState(raw) {
  const entries = {};
  Object.entries(raw.entries || {}).forEach(([date, entry]) => {
    entries[date] = {
      workouts: (entry.workouts || []).map((workout) => ({ id: workout.id || cryptoId(), name: workout.name || "", weight: workout.weight || "", reps: workout.reps || "", sets: workout.sets || 1 })),
      meals: (entry.meals || []).map((meal) => ({ id: meal.id || cryptoId(), type: meal.type || "간식", time: meal.time || "", name: meal.name || "", calories: meal.calories || "" })),
      workoutStart: entry.workoutStart || "",
      workoutEnd: entry.workoutEnd || "",
      mood: entry.mood || "",
      intensity: entry.intensity || 5,
      workoutMemo: entry.workoutMemo || entry.note || ""
    };
  });
  return {
    selectedDate: raw.selectedDate || toISODate(new Date()),
    entries,
    bodyRecords: Array.isArray(raw.bodyRecords) ? raw.bodyRecords : [],
    infoNotes: Array.isArray(raw.infoNotes) ? raw.infoNotes : []
  };
}

function exportData() {
  persistNow({ quiet: true });
  const blob = new Blob([JSON.stringify({ ...state, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cute-workout-log-${toISODate(new Date())}.json`;
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
    const parsed = safeJSON(String(reader.result));
    if (!parsed || !parsed.entries) {
      showToast("가져올 수 없는 파일이에요.");
      event.target.value = "";
      return;
    }
    state = normalizeState(parsed);
    selectedDate = state.selectedDate;
    calendarCursor = firstDayOfMonth(parseISODate(selectedDate));
    persistNow();
    renderAll();
    showToast("백업을 불러왔어요.");
    event.target.value = "";
  };
  reader.readAsText(file);
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

function workoutDurationText(entry) {
  if (!entry.workoutStart || !entry.workoutEnd) return "";
  const start = minutesFromTime(entry.workoutStart);
  let end = minutesFromTime(entry.workoutEnd);
  if (end < start) end += 24 * 60;
  const minutes = end - start;
  if (!minutes) return "0분";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}시간 ${m ? `${m}분` : ""}`.trim() : `${m}분`;
}

function minutesFromTime(value) {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
}

function parseFieldValue(input) {
  if (input.type === "number") return input.value === "" ? "" : Number(input.value);
  return input.value;
}

function parseOptionalNumber(value) {
  return value === "" ? "" : Number(value);
}

function focusLastInput(container, selector) {
  const input = $$(selector, container).at(-1);
  if (input) input.focus();
}

function safeJSON(raw) {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function cryptoId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toISODate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit", weekday: "short" }).format(date);
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(date);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric", weekday: "short" }).format(date);
}

function daysBetween(from, to) {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.max(0, Math.round((b - a) / 86400000));
}

function formatNumber(value) {
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 1 }).format(value || 0);
}

function formatCompact(value) {
  return Math.round((value || 0) / 100) / 10;
}

function emptyDash(value) {
  return value === "" || value === undefined || value === null ? "-" : value;
}

function cleanNumber(value) {
  return value === "" || value === undefined || value === null ? "" : value;
}

function normalizeUrl(url) {
  if (!url) return "";
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
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
  showToast.timer = window.setTimeout(() => els.toast.classList.remove("is-visible"), 1800);
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") return;
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
