(function () {
  const STUDY_META_KEY = "sat_study_meta_v1";
  const DAILY_PLAN_KEY = "sat_daily_plan_v1";

  function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function formatMinutes(totalSec) {
    const mins = Math.floor(totalSec / 60);
    if (mins < 60) return `${mins} min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  }

  /* ---------- Переключение вкладок слева ---------- */
  function switchTab(tabName) {
    document.querySelectorAll(".nav-tab-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.tab === tabName);
    });
    document.querySelectorAll(".tab-panel").forEach(panel => {
      panel.classList.toggle("hidden", panel.id !== `tab-${tabName}`);
      panel.classList.toggle("active", panel.id === `tab-${tabName}`);
    });
  }

  function initTabs() {
    document.querySelectorAll(".nav-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    document.querySelectorAll("[data-goto-tab]").forEach(btn => {
      btn.addEventListener("click", () => switchTab(btn.dataset.gotoTab));
    });
  }

  /* ---------- Время посещения и стрик ---------- */
  function loadStudyMeta() {
    const today = getTodayKey();
    let meta = {
      lastVisitDate: today,
      streak: 1,
      visits: 0,
      totalSeconds: 0,
      todayDate: today,
      todaySeconds: 0
    };

    try {
      const saved = JSON.parse(localStorage.getItem(STUDY_META_KEY) || "null");
      if (saved && typeof saved === "object") {
        meta = { ...meta, ...saved };
      }
    } catch (e) {}

    if (meta.todayDate !== today) {
      const prev = new Date(meta.lastVisitDate);
      const curr = new Date(today);
      const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        meta.streak = (meta.streak || 1) + 1;
      } else if (diffDays > 1) {
        meta.streak = 1;
      }
      meta.todayDate = today;
      meta.todaySeconds = 0;
    }

    meta.lastVisitDate = today;
    meta.visits = (meta.visits || 0) + 1;
    localStorage.setItem(STUDY_META_KEY, JSON.stringify(meta));
    return meta;
  }

  function renderStudyMeta(meta) {
    const todayStr = formatMinutes(meta.todaySeconds);
    const totalStr = formatMinutes(meta.totalSeconds);
    const streakLabel = `${meta.streak} ${meta.streak === 1 ? "day" : "days"}`;

    const elToday = document.getElementById("dash-today-time");
    const elTotal = document.getElementById("dash-total-time");
    const elVisits = document.getElementById("dash-visits-count");
    const elStreakBadge = document.getElementById("dash-streak-badge");
    const elSideTime = document.getElementById("sidebar-today-time");
    const elSideStreak = document.getElementById("sidebar-streak");

    if (elToday) elToday.textContent = todayStr;
    if (elTotal) elTotal.textContent = totalStr;
    if (elVisits) elVisits.textContent = String(meta.visits);
    if (elStreakBadge) elStreakBadge.textContent = `🔥 ${streakLabel} streak`;
    if (elSideTime) elSideTime.textContent = todayStr;
    if (elSideStreak) elSideStreak.textContent = streakLabel;
  }

  function initStudyTracker() {
    const dateLabel = document.getElementById("dashboard-date-label");
    if (dateLabel) {
      const formatted = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric"
      });
      dateLabel.textContent = `${formatted} · Track your daily plan and overall SAT progress.`;
    }

    const meta = loadStudyMeta();
    renderStudyMeta(meta);

    setInterval(() => {
      if (document.visibilityState !== "visible") return;
      meta.todaySeconds += 10;
      meta.totalSeconds += 10;
      localStorage.setItem(STUDY_META_KEY, JSON.stringify(meta));
      renderStudyMeta(meta);
    }, 10000);
  }

  /* ---------- Повседневный план (чек-лист) ---------- */
  function loadDailyPlan() {
    try {
      const saved = JSON.parse(localStorage.getItem(DAILY_PLAN_KEY) || "null");
      if (Array.isArray(saved) && saved.length > 0) return saved;
    } catch (e) {}
    return [
      { id: "p1", text: "Solve 15 Reading & Writing questions", done: false },
      { id: "p2", text: "Solve 15 Math questions", done: false },
      { id: "p3", text: "Complete 1 Adaptive Practice Module", done: false }
    ];
  }

  function saveDailyPlan(items) {
    localStorage.setItem(DAILY_PLAN_KEY, JSON.stringify(items));
  }

  function initDailyPlan() {
    const listEl = document.getElementById("daily-plan-list");
    const formEl = document.getElementById("daily-plan-form");
    const inputEl = document.getElementById("daily-plan-input");
    const progressEl = document.getElementById("plan-progress-label");
    if (!listEl) return;

    let items = loadDailyPlan();

    function render() {
      const doneCount = items.filter(i => i.done).length;
      if (progressEl) progressEl.textContent = `${doneCount} / ${items.length} done`;

      listEl.innerHTML = items
        .map(
          item => `
          <li class="daily-plan-item ${item.done ? "done" : ""}">
            <label>
              <input type="checkbox" data-plan-id="${item.id}" ${item.done ? "checked" : ""} />
              <span>${item.text}</span>
            </label>
            <button type="button" class="plan-del-btn" data-del-id="${item.id}" aria-label="Remove">✕</button>
          </li>
        `
        )
        .join("");

      listEl.querySelectorAll("input[type='checkbox']").forEach(cb => {
        cb.addEventListener("change", () => {
          const target = items.find(i => i.id === cb.dataset.planId);
          if (target) target.done = cb.checked;
          saveDailyPlan(items);
          render();
        });
      });

      listEl.querySelectorAll(".plan-del-btn").forEach(btn => {
        btn.addEventListener("click", () => {
          items = items.filter(i => i.id !== btn.dataset.delId);
          saveDailyPlan(items);
          render();
        });
      });
    }

    if (formEl && inputEl) {
      formEl.addEventListener("submit", e => {
        e.preventDefault();
        const text = inputEl.value.trim();
        if (!text) return;
        items.push({ id: `p_${Date.now()}`, text, done: false });
        inputEl.value = "";
        saveDailyPlan(items);
        render();
      });
    }

    render();
  }

  /* ---------- Фильтр и запуск Адаптивных Модулей ---------- */
  function initPracticeModules() {
    document.querySelectorAll("#modules-filter-pills .mod-filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const filter = btn.dataset.modFilter || "all";
        document.querySelectorAll("#modules-filter-pills .mod-filter-btn").forEach(b => {
          b.classList.toggle("active", b === btn);
        });
        document.querySelectorAll("#preset-modules-grid .module-card").forEach(card => {
          const sec = card.dataset.modSection || "";
          card.classList.toggle("hidden", filter !== "all" && sec !== filter);
        });
      });
    });

    const lenModal = document.getElementById("module-length-modal");
    const lenPill = document.getElementById("mod-len-pill");
    const lenModeBadge = document.getElementById("mod-len-mode-badge");
    const lenTitle = document.getElementById("mod-len-title");
    const lenOneSub = document.getElementById("mod-len-one-sub");
    const lenTwoSub = document.getElementById("mod-len-two-sub");
    const lenCheck1 = document.getElementById("mod-len-check-1");
    const lenCheck2 = document.getElementById("mod-len-check-2");
    const lenCard1 = document.getElementById("mod-len-card-1");
    const lenCard2 = document.getElementById("mod-len-card-2");
    const lenStartBtn = document.getElementById("mod-len-start-btn");
    const lenCancelBtn = document.getElementById("mod-len-cancel-btn");

    let pendingModuleConfig = null;

    function updateLenSelectionUI() {
      const m1 = Boolean(lenCheck1 && lenCheck1.checked);
      const m2 = Boolean(lenCheck2 && lenCheck2.checked);
      if (lenCard1) lenCard1.classList.toggle("is-checked", m1);
      if (lenCard2) lenCard2.classList.toggle("is-checked", m2);

      if (lenModeBadge) {
        if (m1 && m2) {
          lenModeBadge.textContent = "2 Modules Adaptive";
          lenModeBadge.className = "mod-mode-badge is-both";
        } else if (m1) {
          lenModeBadge.textContent = "Module 1";
          lenModeBadge.className = "mod-mode-badge";
        } else if (m2) {
          lenModeBadge.textContent = "Module 2";
          lenModeBadge.className = "mod-mode-badge";
        } else {
          lenModeBadge.textContent = "Select a module";
          lenModeBadge.className = "mod-mode-badge is-empty";
        }
      }

      if (lenStartBtn) {
        lenStartBtn.disabled = !m1 && !m2;
      }
    }

    function closeLenModal() {
      if (lenModal) lenModal.classList.add("hidden");
      pendingModuleConfig = null;
    }

    function openLenModal(config) {
      pendingModuleConfig = config;
      const mins = Math.round(config.timerSeconds / 60);
      const secLabel = config.section === "Math" ? "SAT Math" : "SAT Reading & Writing";
      if (lenPill) lenPill.textContent = secLabel;
      if (lenTitle) lenTitle.textContent = config.title;
      if (lenOneSub) lenOneSub.textContent = `${config.countPerModule} Qs · ⏱ ${mins} min · Baseline mix`;
      if (lenTwoSub) lenTwoSub.textContent = `${config.countPerModule} Qs · ⏱ ${mins} min · Adaptive / Upper mix`;
      if (lenCheck1) lenCheck1.checked = true;
      if (lenCheck2) lenCheck2.checked = true;
      updateLenSelectionUI();

      if (lenModal) {
        lenModal.classList.remove("hidden");
      } else if (typeof window.startAdaptiveModule === "function") {
        window.startAdaptiveModule({ ...config, totalModules: 2, selectedModule: "both" });
      }
    }

    if (lenCheck1) lenCheck1.addEventListener("change", updateLenSelectionUI);
    if (lenCheck2) lenCheck2.addEventListener("change", updateLenSelectionUI);

    if (lenStartBtn) {
      lenStartBtn.addEventListener("click", () => {
        if (!pendingModuleConfig) return;
        const m1 = Boolean(lenCheck1 && lenCheck1.checked);
        const m2 = Boolean(lenCheck2 && lenCheck2.checked);
        if (!m1 && !m2) return;

        const selectedModule = m1 && m2 ? "both" : m1 ? "m1" : "m2";
        const totalModules = m1 && m2 ? 2 : 1;
        const cfg = { ...pendingModuleConfig, totalModules, selectedModule };
        closeLenModal();
        if (typeof window.startAdaptiveModule === "function") {
          window.startAdaptiveModule(cfg);
        }
      });
    }

    if (lenCancelBtn) {
      lenCancelBtn.addEventListener("click", closeLenModal);
    }

    if (lenModal) {
      lenModal.addEventListener("click", e => {
        if (e.target === lenModal) closeLenModal();
      });
    }

    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && lenModal && !lenModal.classList.contains("hidden")) {
        closeLenModal();
      }
    });

    document.querySelectorAll(".module-start-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const domainsRaw = (btn.dataset.domains || "").trim();
        const config = {
          section: btn.dataset.section === "Math" ? "Math" : "RW",
          domains: domainsRaw ? domainsRaw.split(",").map(s => s.trim()).filter(Boolean) : null,
          countPerModule: Number(btn.dataset.count) || (btn.dataset.section === "Math" ? 22 : 27),
          timerSeconds: Number(btn.dataset.timer) || (btn.dataset.section === "Math" ? 2100 : 1920),
          mode: btn.dataset.mode === "preset" ? "preset" : "random",
          seed: btn.dataset.seed || null,
          title: btn.dataset.title || "Adaptive Practice Module"
        };

        openLenModal(config);
      });
    });
  }


  /* ---------- Question Bank: счётчики, Smart Practice, 8 доменов и поиск по ID ---------- */
  function renderQuestionBankUI() {
    if (typeof window.getQuestionBankStats !== "function") return;
    const stats = window.getQuestionBankStats();

    const rwStatsEl = document.getElementById("qbank-rw-stats");
    const mathStatsEl = document.getElementById("qbank-math-stats");
    if (rwStatsEl) {
      rwStatsEl.textContent = stats.rwTotal
        ? `${stats.rwTotal.toLocaleString()} Qs · ${stats.rwSolved} solved`
        : "No questions";
    }
    if (mathStatsEl) {
      mathStatsEl.textContent = stats.mathTotal
        ? `${stats.mathTotal.toLocaleString()} Qs · ${stats.mathSolved} solved`
        : "No questions";
    }

    const missedCountEl = document.getElementById("smart-missed-count");
    const missedBtn = document.getElementById("smart-missed-btn");
    if (missedCountEl) missedCountEl.textContent = `${stats.missedCount} Qs`;
    if (missedBtn) missedBtn.disabled = stats.missedCount === 0;

    const unsolvedCountEl = document.getElementById("smart-unsolved-count");
    const unsolvedBtn = document.getElementById("smart-unsolved-btn");
    if (unsolvedCountEl) unsolvedCountEl.textContent = `${stats.unsolvedCount.toLocaleString()} left`;
    if (unsolvedBtn) unsolvedBtn.disabled = stats.unsolvedCount === 0;

    const weakestLabelEl = document.getElementById("smart-weakest-label");
    const weakestBtn = document.getElementById("smart-weakest-btn");
    if (stats.weakestDomain) {
      if (weakestLabelEl) weakestLabelEl.textContent = `${stats.weakestDomain.code} · ${stats.weakestDomain.acc}%`;
      if (weakestBtn) {
        weakestBtn.disabled = false;
        weakestBtn.dataset.weakSection = stats.weakestDomain.section;
        weakestBtn.dataset.weakDomain = stats.weakestDomain.code;
      }
    } else {
      if (weakestLabelEl) weakestLabelEl.textContent = "Solve some Qs";
      if (weakestBtn) weakestBtn.disabled = true;
    }

    const rwContainer = document.getElementById("qbank-rw-topics");
    const mathContainer = document.getElementById("qbank-math-topics");

    const buildTopicCard = d => {
      const hasAcc = d.acc !== null;
      const pct = hasAcc ? d.acc : 0;
      const barTone = !hasAcc ? "" : pct >= 75 ? "good" : pct < 50 ? "weak" : "";
      const metaRight = hasAcc ? `${pct}% acc` : `${d.solved}/${d.total} solved`;
      return `
        <button type="button" class="topic-mini-card" data-topic-sec="${d.section}" data-topic-code="${d.code}" ${d.total === 0 ? "disabled" : ""}>
          <div class="topic-mini-top">
            <span class="topic-mini-name">${d.label}</span>
            <span class="topic-mini-count">${d.total} Qs</span>
          </div>
          <div class="topic-mini-bar">
            <div class="topic-mini-fill ${barTone}" style="width: ${hasAcc ? pct : (d.total ? Math.round((d.solved / d.total) * 100) : 0)}%"></div>
          </div>
          <div class="topic-mini-foot">
            <span>${d.code}</span>
            <strong>${metaRight}</strong>
          </div>
        </button>
      `;
    };

    const allDomains = Object.values(stats.domains || {});
    if (rwContainer) {
      rwContainer.innerHTML = allDomains
        .filter(d => d.section === "RW")
        .map(buildTopicCard)
        .join("");
    }
    if (mathContainer) {
      mathContainer.innerHTML = allDomains
        .filter(d => d.section === "Math")
        .map(buildTopicCard)
        .join("");
    }

    document.querySelectorAll(".topic-mini-card").forEach(btn => {
      btn.addEventListener("click", () => {
        if (typeof window.startTopicQuickSession === "function") {
          window.startTopicQuickSession(btn.dataset.topicSec, btn.dataset.topicCode, 20);
        }
      });
    });
  }

  function initQuestionBankEnhancements() {
    const missedBtn = document.getElementById("smart-missed-btn");
    const unsolvedBtn = document.getElementById("smart-unsolved-btn");
    const hardBtn = document.getElementById("smart-hard-btn");
    const weakestBtn = document.getElementById("smart-weakest-btn");

    if (missedBtn) {
      missedBtn.addEventListener("click", () => {
        if (typeof window.startMissedQuestionsSession === "function") {
          window.startMissedQuestionsSession();
        }
      });
    }

    if (unsolvedBtn) {
      unsolvedBtn.addEventListener("click", () => {
        if (typeof window.startUnsolvedQuestionsSession === "function") {
          window.startUnsolvedQuestionsSession(20);
        }
      });
    }

    if (hardBtn) {
      hardBtn.addEventListener("click", () => {
        if (typeof window.startHardestDrillsSession === "function") {
          window.startHardestDrillsSession(15);
        }
      });
    }

    if (weakestBtn) {
      weakestBtn.addEventListener("click", () => {
        const sec = weakestBtn.dataset.weakSection;
        const dom = weakestBtn.dataset.weakDomain;
        if (sec && dom && typeof window.startTopicQuickSession === "function") {
          window.startTopicQuickSession(sec, dom, 20);
        }
      });
    }

    window.addEventListener("sat:bank-updated", renderQuestionBankUI);
    renderQuestionBankUI();
  }


  /* ---------- Тёмная тема (Dark Mode) ---------- */
  const THEME_STORAGE_KEY = "sat_theme_v1";

  function applyTheme(isDark) {
    document.body.classList.toggle("dark-theme", isDark);
    const sideBtn = document.getElementById("theme-toggle-btn");
    const testBtn = document.getElementById("test-theme-toggle-btn");

    if (sideBtn) {
      const icon = sideBtn.querySelector(".theme-toggle-icon");
      const text = sideBtn.querySelector(".theme-toggle-text");
      if (icon) icon.textContent = isDark ? "☀️" : "🌙";
      if (text) text.textContent = isDark ? "Light Mode" : "Dark Mode";
    }
    if (testBtn) {
      testBtn.textContent = isDark ? "☀️" : "🌙";
      testBtn.title = isDark ? "Switch to Light Mode" : "Switch to Dark Mode";
    }
  }

  function initThemeToggle() {
    let isDark = false;
    try {
      isDark = localStorage.getItem(THEME_STORAGE_KEY) === "dark";
    } catch (e) {}

    applyTheme(isDark);

    const toggle = () => {
      isDark = !document.body.classList.contains("dark-theme");
      applyTheme(isDark);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, isDark ? "dark" : "light");
      } catch (e) {}
    };

    const sideBtn = document.getElementById("theme-toggle-btn");
    const testBtn = document.getElementById("test-theme-toggle-btn");
    if (sideBtn) sideBtn.addEventListener("click", toggle);
    if (testBtn) testBtn.addEventListener("click", toggle);
  }

  window.addEventListener("DOMContentLoaded", () => {
    initThemeToggle();
    initTabs();
    initStudyTracker();
    initDailyPlan();
    initPracticeModules();
    initQuestionBankEnhancements();
  });
})();
