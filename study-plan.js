/* ==========================================================================
   SAT Prep — Personalized Study Plan Generator, Test Day Planner & Dashboard Launcher
   Подключается в index.html ПОСЛЕ dashboard.js и script.js:
     <script src="study-plan.js"></script>
   ========================================================================== */

(function () {
  const PLAN_STORAGE_KEY = "sat_custom_study_plan_v1";
  const DAILY_PLAN_KEY = "sat_daily_plan_v1";

  const RW_DOMAINS = [
    { code: "CAS", label: "Craft and Structure" },
    { code: "INI", label: "Information and Ideas" },
    { code: "SEC", label: "Standard English Conventions" },
    { code: "EOI", label: "Expression of Ideas" }
  ];

  const MATH_DOMAINS = [
    { code: "ALG", label: "Algebra" },
    { code: "ADV", label: "Advanced Math" },
    { code: "PSD", label: "Problem-Solving & Data Analysis" },
    { code: "GEO", label: "Geometry & Trigonometry" }
  ];

  let selectedDayIndex = 0;
  let isEditingConfig = false;

  /* ---------- 1. Стили (Study Plan + обновлённый виджет Dashboard) ---------- */
  function injectStudyPlanStyles() {
    if (document.getElementById("study-plan-styles")) return;
    const style = document.createElement("style");
    style.id = "study-plan-styles";
    style.textContent = `
      /* Убираем форму с кнопкой Add на Dashboard */
      #daily-plan-form {
        display: none !important;
      }

      /* Кликабельные задачи на Dashboard */
      #daily-plan-list .daily-plan-item.sp-dash-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 9px 11px;
        border-radius: 12px;
        cursor: pointer;
        transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.12s ease;
      }

      #daily-plan-list .daily-plan-item.sp-dash-item:hover {
        border-color: #93c5fd;
        background: #eff6ff;
        transform: translateX(2px);
      }

      #daily-plan-list .sp-dash-left {
        display: flex;
        align-items: center;
        gap: 9px;
        min-width: 0;
        flex: 1;
      }

      #daily-plan-list .sp-dash-check {
        width: 17px;
        height: 17px;
        accent-color: #16a34a;
        cursor: pointer;
        flex-shrink: 0;
      }

      #daily-plan-list .sp-dash-text {
        font-size: 13.5px;
        font-weight: 600;
        color: #1e293b;
        line-height: 1.35;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      #daily-plan-list .daily-plan-item.done .sp-dash-text {
        text-decoration: line-through;
        color: #94a3b8;
      }

      #daily-plan-list .sp-dash-go {
        padding: 5px 11px;
        border-radius: 9px;
        border: none;
        background: #2563eb;
        color: #ffffff;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
      }

      #daily-plan-list .daily-plan-item.done .sp-dash-go {
        background: #e2e8f0;
        color: #475569;
      }

      .sp-dash-footer {
        margin-top: 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
        font-size: 12.5px;
        color: #64748b;
      }

      .sp-dash-open-btn {
        border: 1px solid #cbd5e1;
        background: #f8fafc;
        color: #1d4ed8;
        font-size: 12.5px;
        font-weight: 700;
        padding: 6px 12px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .sp-dash-open-btn:hover {
        background: #eff6ff;
        border-color: #93c5fd;
      }

      /* Вкладка Study Plan */
      #tab-studyplan.active {
        height: 100%;
        overflow-y: auto;
        padding-right: 4px;
      }

      .sp-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 14px;
        flex-wrap: wrap;
        margin-bottom: 18px;
      }

      .sp-header-actions {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
      }

      .sp-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 22px;
        padding: 22px 24px;
        box-shadow: 0 4px 16px rgba(15, 23, 42, 0.04);
        margin-bottom: 18px;
      }

      .sp-card-title {
        margin: 0 0 6px;
        font-size: 19px;
        font-weight: 800;
        color: #0f172a;
      }

      .sp-card-sub {
        margin: 0 0 18px;
        font-size: 13.5px;
        color: #64748b;
      }

      .sp-mode-switch {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
        margin-bottom: 20px;
      }

      .sp-mode-btn {
        text-align: left;
        padding: 13px 16px;
        border-radius: 14px;
        border: 1.5px solid #cbd5e1;
        background: #f8fafc;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .sp-mode-btn:hover {
        border-color: #93c5fd;
      }

      .sp-mode-btn.active {
        border-color: #2563eb;
        background: #eff6ff;
        box-shadow: 0 4px 14px rgba(37, 99, 235, 0.14);
      }

      .sp-mode-title {
        display: block;
        font-size: 14px;
        font-weight: 800;
        color: #0f172a;
        margin-bottom: 2px;
      }

      .sp-mode-desc {
        display: block;
        font-size: 12px;
        color: #64748b;
      }

      .sp-auto-banner {
        padding: 14px 16px;
        border-radius: 14px;
        background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%);
        border: 1px solid #bfdbfe;
        margin-bottom: 18px;
        font-size: 13.5px;
        color: #1e293b;
        line-height: 1.5;
      }

      .sp-auto-banner strong {
        color: #1d4ed8;
      }

      .sp-form-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 18px 24px;
        margin-bottom: 18px;
      }

      .sp-field {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .sp-field.full-span {
        grid-column: 1 / -1;
      }

      .sp-field.is-hidden {
        display: none;
      }

      .sp-label {
        font-size: 13px;
        font-weight: 700;
        color: #334155;
      }

      .sp-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .sp-chip {
        padding: 8px 14px;
        border-radius: 12px;
        border: 1px solid #cbd5e1;
        background: #f8fafc;
        color: #334155;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .sp-chip:hover {
        border-color: #94a3b8;
        background: #f1f5f9;
      }

      .sp-chip.active {
        background: #2563eb;
        border-color: #1d4ed8;
        color: #ffffff;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.24);
      }

      .sp-select,
      .sp-date-input {
        width: 100%;
        padding: 10px 14px;
        border-radius: 12px;
        border: 1px solid #cbd5e1;
        background: #f8fafc;
        color: #0f172a;
        font-size: 13.5px;
        font-weight: 600;
        outline: none;
        cursor: pointer;
      }

      .sp-toggles {
        display: flex;
        flex-wrap: wrap;
        gap: 12px 22px;
        padding: 14px 16px;
        border-radius: 14px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
      }

      .sp-toggle-item {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 13.5px;
        font-weight: 600;
        color: #1e293b;
        cursor: pointer;
        user-select: none;
      }

      .sp-toggle-item input {
        width: 16px;
        height: 16px;
        accent-color: #2563eb;
        cursor: pointer;
      }

      .sp-form-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding-top: 14px;
        border-top: 1px solid #e2e8f0;
      }

      /* KPI Bar */
      .sp-summary-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
        margin-bottom: 16px;
      }

      .sp-kpi {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 14px 16px;
      }

      .sp-kpi-val {
        font-size: 20px;
        font-weight: 800;
        color: #0f172a;
        line-height: 1.2;
      }

      .sp-kpi-lbl {
        margin-top: 4px;
        font-size: 12px;
        color: #64748b;
        font-weight: 600;
      }

      .sp-progress-bar {
        width: 100%;
        height: 9px;
        border-radius: 999px;
        background: #e2e8f0;
        overflow: hidden;
      }

      .sp-progress-fill {
        height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, #2563eb, #16a34a);
        transition: width 0.25s ease;
      }

      /* Day selector strip */
      .sp-days-strip {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding: 4px 2px 12px;
        margin-bottom: 14px;
        scrollbar-width: thin;
      }

      .sp-day-pill {
        flex: 0 0 auto;
        min-width: 82px;
        padding: 10px 12px;
        border-radius: 14px;
        border: 1px solid #cbd5e1;
        background: #ffffff;
        color: #334155;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 3px;
        transition: all 0.15s ease;
      }

      .sp-day-pill:hover {
        border-color: #94a3b8;
        transform: translateY(-1px);
      }

      .sp-day-pill.active {
        background: #2563eb;
        border-color: #1d4ed8;
        color: #ffffff;
        box-shadow: 0 6px 16px rgba(37, 99, 235, 0.25);
      }

      .sp-day-pill.is-complete:not(.active) {
        background: #f0fdf4;
        border-color: #86efac;
        color: #166534;
      }

      .sp-day-num {
        font-size: 13px;
        font-weight: 800;
      }

      .sp-day-meta {
        font-size: 11px;
        opacity: 0.85;
        font-weight: 600;
      }

      /* Task list */
      .sp-day-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
        margin-bottom: 14px;
      }

      .sp-day-title {
        margin: 0;
        font-size: 18px;
        font-weight: 800;
        color: #0f172a;
      }

      .sp-day-sub {
        font-size: 13px;
        color: #64748b;
        margin-top: 2px;
      }

      .sp-tasks-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .sp-task-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        padding: 14px 16px;
        border-radius: 16px;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
        transition: border-color 0.15s, background-color 0.15s;
      }

      .sp-task-row.is-done {
        background: #f0fdf4;
        border-color: #bbf7d0;
      }

      .sp-task-left {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        min-width: 0;
        flex: 1;
      }

      .sp-task-check {
        width: 19px;
        height: 19px;
        margin-top: 2px;
        accent-color: #16a34a;
        cursor: pointer;
        flex-shrink: 0;
      }

      .sp-task-info {
        min-width: 0;
        flex: 1;
      }

      .sp-task-badges {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
        margin-bottom: 4px;
      }

      .sp-badge {
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 999px;
      }

      .sp-badge.rw { background: #dbeafe; color: #1d4ed8; }
      .sp-badge.math { background: #ede9fe; color: #6d28d9; }
      .sp-badge.module { background: #fef3c7; color: #92400e; }
      .sp-badge.vocab { background: #dcfce7; color: #15803d; }
      .sp-badge.review { background: #fee2e2; color: #b91c1c; }

      .sp-task-time {
        font-size: 11.5px;
        font-weight: 600;
        color: #64748b;
      }

      .sp-task-title {
        font-size: 14.5px;
        font-weight: 700;
        color: #0f172a;
        line-height: 1.35;
      }

      .sp-task-row.is-done .sp-task-title {
        text-decoration: line-through;
        color: #64748b;
      }

      .sp-task-desc {
        font-size: 12.5px;
        color: #64748b;
        margin-top: 2px;
      }

      .sp-launch-btn {
        padding: 8px 15px;
        border-radius: 12px;
        border: none;
        background: #2563eb;
        color: #ffffff;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
        flex-shrink: 0;
        transition: filter 0.15s, transform 0.15s;
      }

      .sp-launch-btn:hover {
        filter: brightness(1.06);
        transform: translateY(-1px);
      }

      .sp-task-row.is-done .sp-launch-btn {
        background: #e2e8f0;
        color: #334155;
      }

      .sp-toast {
        font-size: 12.5px;
        font-weight: 700;
        color: #15803d;
        background: #dcfce7;
        border: 1px solid #86efac;
        padding: 6px 12px;
        border-radius: 999px;
      }

      /* Dark theme */
      body.dark-theme .sp-card {
        background: #1e293b;
        border-color: #334155;
      }
      body.dark-theme .sp-card-title,
      body.dark-theme .sp-day-title,
      body.dark-theme .sp-kpi-val,
      body.dark-theme .sp-task-title,
      body.dark-theme .sp-mode-title,
      body.dark-theme #daily-plan-list .sp-dash-text {
        color: #f8fafc;
      }
      body.dark-theme .sp-label,
      body.dark-theme .sp-toggle-item,
      body.dark-theme .sp-auto-banner {
        color: #e2e8f0;
      }
      body.dark-theme .sp-card-sub,
      body.dark-theme .sp-day-sub,
      body.dark-theme .sp-kpi-lbl,
      body.dark-theme .sp-task-desc,
      body.dark-theme .sp-task-time,
      body.dark-theme .sp-mode-desc,
      body.dark-theme .sp-dash-footer {
        color: #94a3b8;
      }
      body.dark-theme .sp-kpi,
      body.dark-theme .sp-toggles,
      body.dark-theme .sp-task-row,
      body.dark-theme .sp-mode-btn {
        background: #0f172a;
        border-color: #334155;
      }
      body.dark-theme .sp-mode-btn.active {
        background: #172554;
        border-color: #3b82f6;
      }
      body.dark-theme .sp-auto-banner {
        background: linear-gradient(135deg, #172554 0%, #0f291e 100%);
        border-color: #1d4ed8;
      }
      body.dark-theme .sp-auto-banner strong {
        color: #93c5fd;
      }
      body.dark-theme .sp-task-row.is-done {
        background: #0f291e;
        border-color: #166534;
      }
      body.dark-theme .sp-chip,
      body.dark-theme .sp-select,
      body.dark-theme .sp-date-input,
      body.dark-theme .sp-day-pill,
      body.dark-theme .sp-dash-open-btn {
        background: #0f172a;
        border-color: #334155;
        color: #e2e8f0;
      }
      body.dark-theme .sp-chip.active,
      body.dark-theme .sp-day-pill.active {
        background: #2563eb;
        border-color: #3b82f6;
        color: #ffffff;
      }
      body.dark-theme .sp-day-pill.is-complete:not(.active) {
        background: #0f291e;
        border-color: #166534;
        color: #86efac;
      }
      body.dark-theme .sp-progress-bar {
        background: #334155;
      }
      body.dark-theme .sp-form-footer {
        border-top-color: #334155;
      }
      body.dark-theme .sp-task-row.is-done .sp-launch-btn,
      body.dark-theme #daily-plan-list .daily-plan-item.done .sp-dash-go {
        background: #334155;
        color: #e2e8f0;
      }
      body.dark-theme #daily-plan-list .daily-plan-item.sp-dash-item:hover {
        background: #1e293b;
        border-color: #3b82f6;
      }

      @media (max-width: 860px) {
        .sp-form-grid,
        .sp-summary-grid,
        .sp-mode-switch {
          grid-template-columns: 1fr 1fr;
        }
        .sp-task-row {
          flex-direction: column;
          align-items: stretch;
        }
        .sp-launch-btn {
          width: 100%;
        }
      }
      @media (max-width: 560px) {
        .sp-form-grid,
        .sp-summary-grid,
        .sp-mode-switch {
          grid-template-columns: 1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /* ---------- 2. Даты и хранилище ---------- */
  function getTodayIso() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function addDaysIso(startIso, offset) {
    const parts = startIso.split("-").map(Number);
    const d = new Date(parts[0], (parts[1] || 1) - 1, (parts[2] || 1) + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function diffDaysIso(fromIso, toIso) {
    if (!fromIso || !toIso) return 0;
    const a = fromIso.split("-").map(Number);
    const b = toIso.split("-").map(Number);
    const d1 = new Date(a[0], (a[1] || 1) - 1, a[2] || 1);
    const d2 = new Date(b[0], (b[1] || 1) - 1, b[2] || 1);
    return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
  }

  function formatShortDate(iso) {
    if (!iso) return "";
    const parts = iso.split("-").map(Number);
    const d = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  function loadPlan() {
    try {
      const raw = localStorage.getItem(PLAN_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.days) && parsed.days.length > 0) {
        return parsed;
      }
    } catch (e) {}
    return null;
  }

  function savePlan(plan) {
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plan));
  }

  /* ---------- 3. Авто-расчёт интенсивности по Test Day и целевому росту балла ---------- */
  function computeAutoRecommendation(testDateIso, scoreBoost) {
    const today = getTodayIso();
    const rawDays = diffDaysIso(today, testDateIso);
    const daysUntilTest = Math.max(3, rawDays || 14);
    const planDays = Math.min(45, Math.max(3, daysUntilTest));
    const boost = Number(scoreBoost) || 100;
    const weeks = Math.max(daysUntilTest / 7, 0.5);
    const ptsPerWeek = Math.round(boost / weeks);

    let intensity = "standard";
    let moduleFreq = "every2";
    let moduleFormat = "mixed";
    let paceLabel = "Standard (~60m/day)";
    let modLabel = "Modules every 2 days";

    if (ptsPerWeek >= 55) {
      intensity = "intensive";
      moduleFreq = "daily";
      moduleFormat = "mixed";
      paceLabel = "Intensive (~90m+/day)";
      modLabel = "Daily adaptive modules";
    } else if (ptsPerWeek >= 25) {
      intensity = "standard";
      moduleFreq = "every2";
      moduleFormat = "mixed";
      paceLabel = "Standard (~60m/day)";
      modLabel = "Adaptive module every 2 days";
    } else {
      intensity = "light";
      moduleFreq = "weekly";
      moduleFormat = "full";
      paceLabel = "Light (~30m/day)";
      modLabel = "Weekly full adaptive mock";
    }

    return {
      daysUntilTest,
      planDays,
      ptsPerWeek,
      intensity,
      moduleFreq,
      moduleFormat,
      paceLabel,
      modLabel
    };
  }

  /* ---------- 4. Генератор Study Plan ---------- */
  function getOrderedDomains(section, prioritizeWeak) {
    const base = section === "Math" ? MATH_DOMAINS.slice() : RW_DOMAINS.slice();
    if (!prioritizeWeak || typeof window.getQuestionBankStats !== "function") {
      return base;
    }
    try {
      const stats = window.getQuestionBankStats();
      const domMap = stats?.domains || {};
      return base.sort((a, b) => {
        const accA = domMap[a.code]?.acc;
        const accB = domMap[b.code]?.acc;
        const scoreA = accA === null || accA === undefined ? 101 : accA;
        const scoreB = accB === null || accB === undefined ? 101 : accB;
        return scoreA - scoreB;
      });
    } catch (e) {
      return base;
    }
  }

  function generateStudyPlan(rawPrefs) {
    const startDate = getTodayIso();
    const prefs = { ...rawPrefs };

    // Если включён Auto-режим — подставляем рекомендованные параметры
    if (prefs.planMode === "auto") {
      const rec = computeAutoRecommendation(prefs.testDate, prefs.scoreBoost);
      prefs.duration = rec.planDays;
      prefs.intensity = rec.intensity;
      prefs.moduleFreq = rec.moduleFreq;
      prefs.moduleFormat = rec.moduleFormat;
    }

    const totalDays = Math.min(45, Math.max(3, Number(prefs.duration) || 14));
    const focus = prefs.focus || "balanced";
    const intensity = prefs.intensity || "standard";
    const moduleFreq = prefs.moduleFreq || "daily";
    const moduleFormat = prefs.moduleFormat || "mixed";
    const includeVocab = Boolean(prefs.includeVocab);
    const includeMissed = Boolean(prefs.includeMissed);
    const prioritizeWeak = Boolean(prefs.prioritizeWeak);

    const rwOrder = getOrderedDomains("RW", prioritizeWeak);
    const mathOrder = getOrderedDomains("Math", prioritizeWeak);

    const qCountMap = { light: 10, standard: 15, intensive: 20 };
    const qPerDrill = qCountMap[intensity] || 15;

    const days = [];
    let rwCursor = 0;
    let mathCursor = 0;
    let modSectionToggle = focus === "math_heavy" || focus === "math_only" ? "Math" : "RW";

    const nextRwDomain = () => {
      const d = rwOrder[rwCursor % rwOrder.length];
      rwCursor += 1;
      return d;
    };
    const nextMathDomain = () => {
      const d = mathOrder[mathCursor % mathOrder.length];
      mathCursor += 1;
      return d;
    };

    const pickModuleSection = (dayNum) => {
      if (focus === "rw_only") return "RW";
      if (focus === "math_only") return "Math";
      if (focus === "rw_heavy") return dayNum % 3 === 0 ? "Math" : "RW";
      if (focus === "math_heavy") return dayNum % 3 === 0 ? "RW" : "Math";
      const sec = modSectionToggle;
      modSectionToggle = modSectionToggle === "RW" ? "Math" : "RW";
      return sec;
    };

    for (let i = 0; i < totalDays; i++) {
      const dayNum = i + 1;
      const dateIso = addDaysIso(startDate, i);
      const tasks = [];

      const isWeeklyMockDay = dayNum % 7 === 0 || (dayNum === totalDays && totalDays >= 5);
      const shouldAddModule =
        moduleFreq === "daily" ||
        (moduleFreq === "every2" && dayNum % 2 === 1) ||
        (moduleFreq === "weekly" && isWeeklyMockDay);

      if (shouldAddModule) {
        const modSec = pickModuleSection(dayNum);
        const useFull =
          moduleFormat === "full" ||
          (moduleFormat === "mixed" && isWeeklyMockDay);

        if (useFull) {
          const cnt = modSec === "Math" ? 22 : 27;
          const timerSec = modSec === "Math" ? 2100 : 1920;
          const mins = modSec === "Math" ? "2 × 35 min" : "2 × 32 min";
          tasks.push({
            id: `d${dayNum}_mod`,
            category: "module",
            badge: "Adaptive Module",
            title: `Full ${modSec === "Math" ? "Math" : "R&W"} Adaptive Module`,
            desc: `${cnt} + ${cnt} Qs · ${mins} · Bluebook exam mode`,
            minutes: modSec === "Math" ? 70 : 64,
            done: false,
            action: {
              type: "module",
              section: modSec,
              countPerModule: cnt,
              timerSeconds: timerSec,
              title: `Day ${dayNum} · ${modSec === "Math" ? "Math" : "R&W"} Adaptive Module`
            }
          });
        } else {
          const cnt = modSec === "Math" ? 10 : 12;
          const timerSec = modSec === "Math" ? 960 : 840;
          const mins = modSec === "Math" ? "2 × 16 min" : "2 × 14 min";
          tasks.push({
            id: `d${dayNum}_mod`,
            category: "module",
            badge: "Express Module",
            title: `Express ${modSec === "Math" ? "Math" : "R&W"} Adaptive Sprint`,
            desc: `${cnt} + ${cnt} Qs · ${mins} · Quick 2-stage adaptive routing`,
            minutes: modSec === "Math" ? 32 : 28,
            done: false,
            action: {
              type: "module",
              section: modSec,
              countPerModule: cnt,
              timerSeconds: timerSec,
              title: `Day ${dayNum} · Express ${modSec === "Math" ? "Math" : "R&W"} Sprint`
            }
          });
        }
      }

      const drillSections = [];
      if (focus === "rw_only") {
        drillSections.push("RW");
        if (intensity !== "light") drillSections.push("RW");
      } else if (focus === "math_only") {
        drillSections.push("Math");
        if (intensity !== "light") drillSections.push("Math");
      } else if (focus === "rw_heavy") {
        drillSections.push("RW");
        if (intensity === "intensive") {
          drillSections.push("RW", "Math");
        } else if (intensity === "standard") {
          drillSections.push(dayNum % 2 === 1 ? "Math" : "RW");
        } else if (dayNum % 3 === 0) {
          drillSections[0] = "Math";
        }
      } else if (focus === "math_heavy") {
        drillSections.push("Math");
        if (intensity === "intensive") {
          drillSections.push("Math", "RW");
        } else if (intensity === "standard") {
          drillSections.push(dayNum % 2 === 1 ? "RW" : "Math");
        } else if (dayNum % 3 === 0) {
          drillSections[0] = "RW";
        }
      } else {
        if (intensity === "light") {
          drillSections.push(dayNum % 2 === 1 ? "RW" : "Math");
        } else if (intensity === "standard") {
          drillSections.push("RW", "Math");
        } else {
          drillSections.push("RW", "Math", dayNum % 2 === 1 ? "RW" : "Math");
        }
      }

      drillSections.forEach((sec, idx) => {
        const dom = sec === "Math" ? nextMathDomain() : nextRwDomain();
        const mins = Math.round(qPerDrill * (sec === "Math" ? 1.5 : 1.2));
        tasks.push({
          id: `d${dayNum}_drill_${idx}`,
          category: sec === "Math" ? "math" : "rw",
          badge: sec === "Math" ? "Math Drill" : "R&W Drill",
          title: `${dom.label} · ${qPerDrill} Qs`,
          desc: `Targeted ${sec === "Math" ? "SAT Math" : "Reading & Writing"} practice with instant explanations`,
          minutes: mins,
          done: false,
          action: {
            type: "topic",
            section: sec,
            domain: dom.code,
            limit: qPerDrill
          }
        });
      });

      if (includeMissed && (intensity === "intensive" || dayNum % 2 === 0)) {
        tasks.push({
          id: `d${dayNum}_missed`,
          category: "review",
          badge: "Error Review",
          title: "Review Missed Questions",
          desc: "Retry questions you previously answered incorrectly to lock in concepts",
          minutes: 10,
          done: false,
          action: { type: "missed" }
        });
      }

      if (includeVocab && focus !== "math_only") {
        const useBlitz = dayNum % 2 === 0;
        tasks.push({
          id: `d${dayNum}_vocab`,
          category: "vocab",
          badge: "Vocabulary",
          title: useBlitz ? "Context Blitz · 2 Rounds" : "SAT Vocab Flashcards · 15 Words",
          desc: useBlitz
            ? "Practice high-frequency SAT words in sentence context"
            : "Review new & learning words using 3D flashcards",
          minutes: 10,
          done: false,
          action: { type: "vocab", mode: useBlitz ? "blitz" : "flashcards" }
        });
      }

      days.push({
        day: dayNum,
        date: dateIso,
        tasks
      });
    }

    return {
      createdAt: startDate,
      syncedDayIndex: 0,
      prefs,
      days
    };
  }

  /* ---------- 5. Запуск задачи (из Study Plan и с Dashboard) ---------- */
  function launchTask(task) {
    if (!task || !task.action) return;
    const act = task.action;

    if (act.type === "module" && typeof window.startAdaptiveModule === "function") {
      window.startAdaptiveModule({
        section: act.section,
        domains: null,
        countPerModule: act.countPerModule,
        timerSeconds: act.timerSeconds,
        mode: "random",
        seed: null,
        totalModules: 2,
        selectedModule: "both",
        title: act.title
      });
      return;
    }

    if (act.type === "topic" && typeof window.startTopicQuickSession === "function") {
      window.startTopicQuickSession(act.section, act.domain, act.limit || 15);
      return;
    }

    if (act.type === "section" && typeof window.openSectionSetup === "function") {
      window.openSectionSetup(act.section);
      return;
    }

    if (act.type === "missed" && typeof window.startMissedQuestionsSession === "function") {
      const stats = typeof window.getQuestionBankStats === "function" ? window.getQuestionBankStats() : null;
      if (stats && stats.missedCount === 0 && typeof window.startUnsolvedQuestionsSession === "function") {
        window.startUnsolvedQuestionsSession(15);
      } else {
        window.startMissedQuestionsSession();
      }
      return;
    }

    if (act.type === "vocab") {
      const vocabTabBtn = document.querySelector('.nav-tab-btn[data-tab="vocab"]');
      if (vocabTabBtn) vocabTabBtn.click();
      setTimeout(() => {
        const modeBtn = document.querySelector(`#vocab-mode-tabs .vocab-mode-btn[data-vmode="${act.mode || "flashcards"}"]`);
        if (modeBtn) modeBtn.click();
      }, 60);
    }
  }

  /* ---------- 6. Интерактивный виджет Daily Study Plan на Dashboard ---------- */
  function getDefaultDashboardTasks() {
    let savedDone = {};
    try {
      const raw = JSON.parse(localStorage.getItem(DAILY_PLAN_KEY) || "[]");
      if (Array.isArray(raw)) {
        raw.forEach(item => {
          if (item && item.id) savedDone[item.id] = Boolean(item.done);
        });
      }
    } catch (e) {}

    return [
      {
        id: "def_rw",
        title: "Solve 15 Reading & Writing questions",
        minutes: 18,
        done: Boolean(savedDone["def_rw"]),
        action: { type: "section", section: "RW" }
      },
      {
        id: "def_math",
        title: "Solve 15 Math questions",
        minutes: 22,
        done: Boolean(savedDone["def_math"]),
        action: { type: "section", section: "Math" }
      },
      {
        id: "def_mod",
        title: "Complete 1 Adaptive Practice Module",
        minutes: 30,
        done: Boolean(savedDone["def_mod"]),
        action: {
          type: "module",
          section: "RW",
          countPerModule: 12,
          timerSeconds: 840,
          title: "Express R&W Adaptive Sprint"
        }
      }
    ];
  }

  function renderDashboardDailyPlan() {
    const listEl = document.getElementById("daily-plan-list");
    const progressEl = document.getElementById("plan-progress-label");
    if (!listEl) return;

    const plan = loadPlan();
    let tasks = [];
    let activeDayObj = null;
    let footerMeta = "Click any task to start practicing";

    if (plan) {
      const todayIso = getTodayIso();
      const todayIdx = plan.days.findIndex(d => d.date === todayIso);
      const dayIdx =
        typeof plan.syncedDayIndex === "number" && plan.days[plan.syncedDayIndex]
          ? plan.syncedDayIndex
          : todayIdx >= 0
          ? todayIdx
          : 0;
      activeDayObj = plan.days[dayIdx] || plan.days[0];
      tasks = activeDayObj.tasks || [];

      const daysLeft = plan.prefs?.testDate ? diffDaysIso(todayIso, plan.prefs.testDate) : null;
      const countdown = daysLeft !== null && daysLeft >= 0 ? ` · ${daysLeft}d to SAT` : "";
      const boostTxt = plan.prefs?.scoreBoost ? ` · +${plan.prefs.scoreBoost} pts goal` : "";
      footerMeta = `Day ${activeDayObj.day}/${plan.days.length}${countdown}${boostTxt}`;
    } else {
      tasks = getDefaultDashboardTasks();
    }

    const doneCount = tasks.filter(t => t.done).length;
    if (progressEl) {
      progressEl.textContent = `${doneCount} / ${tasks.length} done`;
    }

    listEl.innerHTML = tasks
      .map(
        t => `
        <li class="daily-plan-item sp-dash-item ${t.done ? "done" : ""}" data-dash-task-id="${t.id}" title="Click to start">
          <div class="sp-dash-left">
            <input type="checkbox" class="sp-dash-check" data-dash-check-id="${t.id}" ${t.done ? "checked" : ""} />
            <span class="sp-dash-text">${t.title}${t.minutes ? ` (~${t.minutes}m)` : ""}</span>
          </div>
          <button type="button" class="sp-dash-go" data-dash-go-id="${t.id}">
            ${t.done ? "Redo" : "Start →"}
          </button>
        </li>
      `
      )
      .join("");

    // Футер карточки с переходом во вкладку Study Plan
    const card = listEl.closest(".dash-card");
    if (card) {
      let footer = card.querySelector(".sp-dash-footer");
      if (!footer) {
        footer = document.createElement("div");
        footer.className = "sp-dash-footer";
        listEl.insertAdjacentElement("afterend", footer);
      }
      footer.innerHTML = `
        <span>${footerMeta}</span>
        <button type="button" class="sp-dash-open-btn" id="sp-dash-open-plan-btn">
          ${plan ? "Open Full Plan →" : "✨ Generate Study Plan →"}
        </button>
      `;
      const openBtn = document.getElementById("sp-dash-open-plan-btn");
      if (openBtn) {
        openBtn.addEventListener("click", () => {
          activateTab("studyplan");
          renderStudyPlanTab();
        });
      }
    }

    // Обработчики чекбоксов (синхронизируются с Study Plan)
    listEl.querySelectorAll(".sp-dash-check").forEach(cb => {
      cb.addEventListener("click", e => e.stopPropagation());
      cb.addEventListener("change", () => {
        const tid = cb.dataset.dashCheckId;
        if (plan && activeDayObj) {
          const target = activeDayObj.tasks.find(t => t.id === tid);
          if (target) target.done = cb.checked;
          savePlan(plan);
          renderStudyPlanTab();
        } else {
          const updated = tasks.map(t => (t.id === tid ? { id: t.id, text: t.title, done: cb.checked } : { id: t.id, text: t.title, done: t.done }));
          localStorage.setItem(DAILY_PLAN_KEY, JSON.stringify(updated));
        }
        renderDashboardDailyPlan();
      });
    });

    // Клик по строке задачи или кнопке Start → сразу запускает работу
    listEl.querySelectorAll(".sp-dash-item").forEach(li => {
      li.addEventListener("click", e => {
        if (e.target.closest(".sp-dash-check")) return;
        const tid = li.dataset.dashTaskId;
        const target = tasks.find(t => t.id === tid);
        if (target) launchTask(target);
      });
    });
  }

  /* ---------- 7. Рендеринг вкладки Study Plan ---------- */
  const FOCUS_LABELS = {
    balanced: "Balanced (50/50)",
    rw_heavy: "R&W Focus (70/30)",
    math_heavy: "Math Focus (70/30)",
    rw_only: "R&W Only",
    math_only: "Math Only"
  };

  function getDefaultPrefs() {
    return {
      planMode: "auto", // auto | manual
      testDate: addDaysIso(getTodayIso(), 21),
      scoreBoost: 150,
      focus: "balanced",
      duration: 14,
      intensity: "standard",
      moduleFreq: "daily",
      moduleFormat: "mixed",
      includeVocab: true,
      includeMissed: true,
      prioritizeWeak: true
    };
  }

  function renderGeneratorForm(container, existingPlan) {
    const prefs = existingPlan?.prefs ? { ...getDefaultPrefs(), ...existingPlan.prefs } : getDefaultPrefs();
    const minTestDate = addDaysIso(getTodayIso(), 3);
    if (!prefs.testDate || diffDaysIso(getTodayIso(), prefs.testDate) < 3) {
      prefs.testDate = addDaysIso(getTodayIso(), 21);
    }

    const makeChips = (name, options, currentVal) =>
      options
        .map(
          opt => `
          <button type="button" class="sp-chip ${String(currentVal) === String(opt.value) ? "active" : ""}" data-sp-group="${name}" data-sp-val="${opt.value}">
            ${opt.label}
          </button>`
        )
        .join("");

    const isManual = prefs.planMode === "manual";

    container.innerHTML = `
      <header class="page-header sp-header">
        <div>
          <h1>Study Plan</h1>
          <p>Set your SAT Test Day and target score boost — let Auto Mode build your schedule or customize everything yourself</p>
        </div>
        ${existingPlan ? `<button type="button" id="sp-cancel-edit-btn" class="secondary-btn">← Back to Current Plan</button>` : ""}
      </header>

      <div class="sp-card">
        <h2 class="sp-card-title">Generate Your SAT Study Plan</h2>
        <p class="sp-card-sub">Choose Auto Mode to calculate workload from your Test Day & score goal, or Manual Mode for full control.</p>

        <div class="sp-mode-switch">
          <button type="button" class="sp-mode-btn ${!isManual ? "active" : ""}" data-sp-mode="auto">
            <span class="sp-mode-title">⚡ Auto-Calculated Plan</span>
            <span class="sp-mode-desc">Sets intensity & module frequency from your Test Day and score goal</span>
          </button>
          <button type="button" class="sp-mode-btn ${isManual ? "active" : ""}" data-sp-mode="manual">
            <span class="sp-mode-title">🛠️ Manual Custom Setup</span>
            <span class="sp-mode-desc">Pick your own plan length, daily workload, and module schedule</span>
          </button>
        </div>

        <div class="sp-form-grid">
          <div class="sp-field">
            <label for="sp-test-date" class="sp-label">1. SAT Test Day</label>
            <input type="date" id="sp-test-date" class="sp-date-input" min="${minTestDate}" value="${prefs.testDate}" />
          </div>

          <div class="sp-field">
            <span class="sp-label">2. Target Score Increase</span>
            <div class="sp-chips">
              ${makeChips("scoreBoost", [
                { value: 50, label: "+50 pts" },
                { value: 100, label: "+100 pts" },
                { value: 150, label: "+150 pts" },
                { value: 200, label: "+200 pts" },
                { value: 300, label: "+300+ pts" }
              ], prefs.scoreBoost)}
            </div>
          </div>

          <div class="sp-field full-span">
            <div id="sp-auto-banner" class="sp-auto-banner"></div>
          </div>

          <div class="sp-field full-span">
            <span class="sp-label">3. Section Focus</span>
            <div class="sp-chips">
              ${makeChips("focus", [
                { value: "balanced", label: "⚖️ Balanced (50/50)" },
                { value: "rw_heavy", label: "📖 More R&W (70/30)" },
                { value: "math_heavy", label: "📐 More Math (70/30)" },
                { value: "rw_only", label: "R&W Only" },
                { value: "math_only", label: "Math Only" }
              ], prefs.focus)}
            </div>
          </div>

          <div class="sp-field sp-manual-only ${isManual ? "" : "is-hidden"}">
            <span class="sp-label">4. Plan Length</span>
            <div class="sp-chips">
              ${makeChips("duration", [
                { value: 7, label: "7 Days" },
                { value: 14, label: "14 Days" },
                { value: 30, label: "30 Days" }
              ], prefs.duration)}
            </div>
          </div>

          <div class="sp-field sp-manual-only ${isManual ? "" : "is-hidden"}">
            <span class="sp-label">5. Daily Workload</span>
            <div class="sp-chips">
              ${makeChips("intensity", [
                { value: "light", label: "Light (~30m)" },
                { value: "standard", label: "Standard (~60m)" },
                { value: "intensive", label: "Intensive (~90m+)" }
              ], prefs.intensity)}
            </div>
          </div>

          <div class="sp-field sp-manual-only ${isManual ? "" : "is-hidden"}">
            <label for="sp-mod-freq" class="sp-label">6. Adaptive Practice Modules</label>
            <select id="sp-mod-freq" class="sp-select">
              <option value="daily" ${prefs.moduleFreq === "daily" ? "selected" : ""}>Every Day (Daily Module)</option>
              <option value="every2" ${prefs.moduleFreq === "every2" ? "selected" : ""}>Every 2 Days</option>
              <option value="weekly" ${prefs.moduleFreq === "weekly" ? "selected" : ""}>Weekly Mock Only (Day 7, 14...)</option>
              <option value="none" ${prefs.moduleFreq === "none" ? "selected" : ""}>No Modules (Drills Only)</option>
            </select>
          </div>

          <div class="sp-field sp-manual-only ${isManual ? "" : "is-hidden"}">
            <label for="sp-mod-format" class="sp-label">7. Module Length</label>
            <select id="sp-mod-format" class="sp-select" ${prefs.moduleFreq === "none" ? "disabled" : ""}>
              <option value="mixed" ${prefs.moduleFormat === "mixed" ? "selected" : ""}>Mixed (Express daily + Full on Day 7/14)</option>
              <option value="express" ${prefs.moduleFormat === "express" ? "selected" : ""}>Express Adaptive Sprints (~30 min)</option>
              <option value="full" ${prefs.moduleFormat === "full" ? "selected" : ""}>Full Bluebook Modules (~65 min)</option>
            </select>
          </div>

          <div class="sp-field full-span">
            <span class="sp-label">Smart Options</span>
            <div class="sp-toggles">
              <label class="sp-toggle-item">
                <input type="checkbox" id="sp-opt-vocab" ${prefs.includeVocab ? "checked" : ""} />
                <span>Include SAT Vocabulary drills</span>
              </label>
              <label class="sp-toggle-item">
                <input type="checkbox" id="sp-opt-missed" ${prefs.includeMissed ? "checked" : ""} />
                <span>Include Missed Questions review</span>
              </label>
              <label class="sp-toggle-item">
                <input type="checkbox" id="sp-opt-weak" ${prefs.prioritizeWeak ? "checked" : ""} />
                <span>Prioritize my weakest domains first</span>
              </label>
            </div>
          </div>
        </div>

        <div class="sp-form-footer">
          <button type="button" id="sp-generate-btn" class="primary-btn">✨ Generate Study Plan</button>
        </div>
      </div>
    `;

    const state = { ...prefs };
    const bannerEl = document.getElementById("sp-auto-banner");
    const dateInput = document.getElementById("sp-test-date");

    const updateAutoBanner = () => {
      if (!bannerEl) return;
      const rec = computeAutoRecommendation(state.testDate, state.scoreBoost);
      if (state.planMode === "auto") {
        bannerEl.innerHTML = `
          📅 <strong>${rec.daysUntilTest} days</strong> until Test Day (${formatShortDate(state.testDate)}) ·
          🎯 Goal: <strong>+${state.scoreBoost} pts</strong> (~${rec.ptsPerWeek} pts/week)<br/>
          ⚡ Auto Recommendation: <strong>${rec.paceLabel}</strong> · <strong>${rec.modLabel}</strong> · ${rec.planDays}-day roadmap
        `;
      } else {
        bannerEl.innerHTML = `
          📅 <strong>${rec.daysUntilTest} days</strong> until Test Day (${formatShortDate(state.testDate)}) ·
          🎯 Goal: <strong>+${state.scoreBoost} pts</strong> ·
          🛠️ Manual mode active — customize duration, workload, and modules below.
        `;
      }
    };

    updateAutoBanner();

    container.querySelectorAll(".sp-mode-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        state.planMode = btn.dataset.spMode === "manual" ? "manual" : "auto";
        container.querySelectorAll(".sp-mode-btn").forEach(b => {
          b.classList.toggle("active", b === btn);
        });
        const showManual = state.planMode === "manual";
        container.querySelectorAll(".sp-manual-only").forEach(el => {
          el.classList.toggle("is-hidden", !showManual);
        });
        updateAutoBanner();
      });
    });

    if (dateInput) {
      dateInput.addEventListener("change", () => {
        if (dateInput.value) {
          state.testDate = dateInput.value;
          updateAutoBanner();
        }
      });
    }

    container.querySelectorAll(".sp-chip").forEach(btn => {
      btn.addEventListener("click", () => {
        const grp = btn.dataset.spGroup;
        const val = btn.dataset.spVal;
        state[grp] = grp === "duration" || grp === "scoreBoost" ? Number(val) : val;
        container.querySelectorAll(`.sp-chip[data-sp-group="${grp}"]`).forEach(b => {
          b.classList.toggle("active", b === btn);
        });
        if (grp === "scoreBoost") updateAutoBanner();
      });
    });

    const freqEl = document.getElementById("sp-mod-freq");
    const fmtEl = document.getElementById("sp-mod-format");
    if (freqEl && fmtEl) {
      freqEl.addEventListener("change", () => {
        state.moduleFreq = freqEl.value;
        fmtEl.disabled = freqEl.value === "none";
      });
      fmtEl.addEventListener("change", () => {
        state.moduleFormat = fmtEl.value;
      });
    }

    const cancelBtn = document.getElementById("sp-cancel-edit-btn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", () => {
        isEditingConfig = false;
        renderStudyPlanTab();
      });
    }

    const genBtn = document.getElementById("sp-generate-btn");
    if (genBtn) {
      genBtn.addEventListener("click", () => {
        state.includeVocab = Boolean(document.getElementById("sp-opt-vocab")?.checked);
        state.includeMissed = Boolean(document.getElementById("sp-opt-missed")?.checked);
        state.prioritizeWeak = Boolean(document.getElementById("sp-opt-weak")?.checked);

        const newPlan = generateStudyPlan(state);
        savePlan(newPlan);
        selectedDayIndex = 0;
        isEditingConfig = false;
        renderStudyPlanTab();
        renderDashboardDailyPlan();
      });
    }
  }

  function renderActivePlan(container, plan) {
    const todayIso = getTodayIso();
    const todayIdx = plan.days.findIndex(d => d.date === todayIso);
    if (selectedDayIndex < 0 || selectedDayIndex >= plan.days.length) {
      selectedDayIndex = todayIdx >= 0 ? todayIdx : 0;
    }

    let totalTasks = 0;
    let doneTasks = 0;
    let completedDays = 0;

    plan.days.forEach(d => {
      const dTotal = d.tasks.length;
      const dDone = d.tasks.filter(t => t.done).length;
      totalTasks += dTotal;
      doneTasks += dDone;
      if (dTotal > 0 && dDone === dTotal) completedDays += 1;
    });

    const pct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const activeDay = plan.days[selectedDayIndex];
    const dayMinutes = activeDay.tasks.reduce((sum, t) => sum + (t.minutes || 0), 0);
    const dayDone = activeDay.tasks.filter(t => t.done).length;

    const daysLeft = plan.prefs?.testDate ? Math.max(0, diffDaysIso(todayIso, plan.prefs.testDate)) : null;
    const boostLabel = plan.prefs?.scoreBoost ? `+${plan.prefs.scoreBoost} pts goal` : "";
    const testMeta =
      daysLeft !== null
        ? ` · Test Day: ${formatShortDate(plan.prefs.testDate)} (${daysLeft}d left)`
        : "";

    const daysStripHtml = plan.days
      .map((d, idx) => {
        const allDone = d.tasks.length > 0 && d.tasks.every(t => t.done);
        const isToday = d.date === todayIso;
        const isActive = idx === selectedDayIndex;
        return `
          <button type="button" class="sp-day-pill ${isActive ? "active" : ""} ${allDone ? "is-complete" : ""}" data-day-idx="${idx}">
            <span class="sp-day-num">${allDone ? "✓ " : ""}Day ${d.day}</span>
            <span class="sp-day-meta">${isToday ? "Today" : formatShortDate(d.date)}</span>
          </button>
        `;
      })
      .join("");

    const tasksHtml = activeDay.tasks
      .map(
        t => `
        <div class="sp-task-row ${t.done ? "is-done" : ""}">
          <div class="sp-task-left">
            <input type="checkbox" class="sp-task-check" data-task-id="${t.id}" ${t.done ? "checked" : ""} />
            <div class="sp-task-info">
              <div class="sp-task-badges">
                <span class="sp-badge ${t.category}">${t.badge}</span>
                <span class="sp-task-time">⏱ ~${t.minutes} min</span>
              </div>
              <div class="sp-task-title">${t.title}</div>
              <div class="sp-task-desc">${t.desc}</div>
            </div>
          </div>
          <button type="button" class="sp-launch-btn" data-launch-id="${t.id}">
            ${t.done ? "Redo →" : "Start →"}
          </button>
        </div>
      `
      )
      .join("");

    container.innerHTML = `
      <header class="page-header sp-header">
        <div>
          <h1>Study Plan</h1>
          <p>${FOCUS_LABELS[plan.prefs?.focus] || "Balanced"}${boostLabel ? " · " + boostLabel : ""}${testMeta}</p>
        </div>
        <div class="sp-header-actions">
          <button type="button" id="sp-sync-today-btn" class="secondary-btn">📌 Pin Day ${activeDay.day} on Dashboard</button>
          <button type="button" id="sp-customize-btn" class="primary-btn">⚙️ Customize / New Plan</button>
        </div>
      </header>

      <div class="sp-card">
        <div class="sp-summary-grid">
          <div class="sp-kpi">
            <div class="sp-kpi-val">${pct}%</div>
            <div class="sp-kpi-lbl">Overall Progress</div>
          </div>
          <div class="sp-kpi">
            <div class="sp-kpi-val">${doneTasks} / ${totalTasks}</div>
            <div class="sp-kpi-lbl">Tasks Completed</div>
          </div>
          <div class="sp-kpi">
            <div class="sp-kpi-val">${daysLeft !== null ? `${daysLeft} days` : `${completedDays}/${plan.days.length}`}</div>
            <div class="sp-kpi-lbl">${daysLeft !== null ? "Until SAT Test Day" : "Days Completed"}</div>
          </div>
          <div class="sp-kpi">
            <div class="sp-kpi-val">~${dayMinutes} min</div>
            <div class="sp-kpi-lbl">Day ${activeDay.day} Estimate</div>
          </div>
        </div>
        <div class="sp-progress-bar">
          <div class="sp-progress-fill" style="width: ${pct}%;"></div>
        </div>
      </div>

      <div class="sp-days-strip" id="sp-days-strip">
        ${daysStripHtml}
      </div>

      <div class="sp-card">
        <div class="sp-day-header">
          <div>
            <h2 class="sp-day-title">Day ${activeDay.day} · ${formatShortDate(activeDay.date)}${activeDay.date === todayIso ? " (Today)" : ""}</h2>
            <div class="sp-day-sub">${dayDone} of ${activeDay.tasks.length} tasks done · Estimated time: ~${dayMinutes} min</div>
          </div>
          <span id="sp-sync-toast" class="sp-toast hidden">✓ Pinned on Dashboard</span>
        </div>

        <div class="sp-tasks-list">
          ${tasksHtml}
        </div>
      </div>
    `;

    container.querySelectorAll(".sp-day-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedDayIndex = Number(btn.dataset.dayIdx) || 0;
        renderStudyPlanTab();
      });
    });

    container.querySelectorAll(".sp-task-check").forEach(cb => {
      cb.addEventListener("change", () => {
        const target = activeDay.tasks.find(t => t.id === cb.dataset.taskId);
        if (target) target.done = cb.checked;
        savePlan(plan);
        renderStudyPlanTab();
        renderDashboardDailyPlan();
      });
    });

    container.querySelectorAll(".sp-launch-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const target = activeDay.tasks.find(t => t.id === btn.dataset.launchId);
        if (target) launchTask(target);
      });
    });

    const customizeBtn = document.getElementById("sp-customize-btn");
    if (customizeBtn) {
      customizeBtn.addEventListener("click", () => {
        isEditingConfig = true;
        renderStudyPlanTab();
      });
    }

    const syncBtn = document.getElementById("sp-sync-today-btn");
    if (syncBtn) {
      syncBtn.addEventListener("click", () => {
        plan.syncedDayIndex = selectedDayIndex;
        savePlan(plan);
        renderDashboardDailyPlan();
        const toast = document.getElementById("sp-sync-toast");
        if (toast) {
          toast.classList.remove("hidden");
          setTimeout(() => toast.classList.add("hidden"), 2200);
        }
      });
    }
  }

  function renderStudyPlanTab() {
    const panel = document.getElementById("tab-studyplan");
    if (!panel) return;
    const plan = loadPlan();
    if (!plan || isEditingConfig) {
      renderGeneratorForm(panel, plan);
    } else {
      renderActivePlan(panel, plan);
    }
  }

  /* ---------- 8. Монтирование вкладки ---------- */
  function activateTab(tabName) {
    document.querySelectorAll(".nav-tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });
    document.querySelectorAll(".tab-panel").forEach(panel => {
      const match = panel.id === `tab-${tabName}`;
      panel.classList.toggle("hidden", !match);
      panel.classList.toggle("active", match);
    });
  }

  function mountStudyPlanTab() {
    injectStudyPlanStyles();

    const sidebarNav = document.querySelector(".sidebar-nav");
    const mainContent = document.querySelector(".main-content");
    if (!sidebarNav || !mainContent) return;

    if (!sidebarNav.querySelector('.nav-tab-btn[data-tab="studyplan"]')) {
      const navBtn = document.createElement("button");
      navBtn.type = "button";
      navBtn.className = "nav-tab-btn";
      navBtn.dataset.tab = "studyplan";
      navBtn.innerHTML = `<span class="nav-icon">🗓️</span><span>Study Plan</span>`;

      const dashBtn = sidebarNav.querySelector('.nav-tab-btn[data-tab="dashboard"]');
      if (dashBtn) {
        dashBtn.insertAdjacentElement("afterend", navBtn);
      } else {
        sidebarNav.appendChild(navBtn);
      }

      navBtn.addEventListener("click", () => {
        activateTab("studyplan");
        renderStudyPlanTab();
      });
    }

    if (!document.getElementById("tab-studyplan")) {
      const section = document.createElement("section");
      section.id = "tab-studyplan";
      section.className = "tab-panel hidden";
      mainContent.appendChild(section);
    }

    sidebarNav.querySelectorAll(".nav-tab-btn").forEach(btn => {
      if (btn.dataset.tab === "studyplan" || btn.dataset.spBound) return;
      btn.dataset.spBound = "1";
      btn.addEventListener("click", () => {
        const spPanel = document.getElementById("tab-studyplan");
        const spBtn = sidebarNav.querySelector('.nav-tab-btn[data-tab="studyplan"]');
        if (spPanel) {
          spPanel.classList.add("hidden");
          spPanel.classList.remove("active");
        }
        if (spBtn) spBtn.classList.remove("active");
        if (btn.dataset.tab === "dashboard") {
          renderDashboardDailyPlan();
        }
      });
    });

    const existing = loadPlan();
    if (existing) {
      const todayIdx = existing.days.findIndex(d => d.date === getTodayIso());
      if (todayIdx >= 0) selectedDayIndex = todayIdx;
    }

    renderStudyPlanTab();
    renderDashboardDailyPlan();
    // Повторный рендер после initDailyPlan() из dashboard.js
    setTimeout(renderDashboardDailyPlan, 0);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountStudyPlanTab);
  } else {
    mountStudyPlanTab();
  }
})();
