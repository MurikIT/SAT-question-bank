(function () {
  const STUDY_META_KEY = "sat_study_meta_v1";
  const DAILY_PLAN_KEY = "sat_daily_plan_v1";
  const ACTIVE_TAB_KEY = "sat_active_tab_v1";
  const HOME_DISMISSED_KEY = "sat_home_dismissed_v1";

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

  /* ---------- Переключение вкладок слева + сохранение при обновлении ---------- */
  function switchTab(tabName, persist = true) {
    if (!tabName) tabName = "dashboard";
    const targetPanel = document.getElementById(`tab-${tabName}`);
    const resolvedTab = targetPanel ? tabName : "dashboard";

    document.querySelectorAll(".nav-tab-btn").forEach(btn => {
      const isMatch = btn.dataset.tab === resolvedTab;
      btn.classList.toggle("active", isMatch);
      btn.setAttribute("aria-selected", String(isMatch));
    });

    document.querySelectorAll(".tab-panel").forEach(panel => {
      const isTarget = panel.id === `tab-${resolvedTab}`;
      panel.classList.toggle("hidden", !isTarget);
      panel.classList.toggle("active", isTarget);
    });

    if (persist) {
      try {
        localStorage.setItem(ACTIVE_TAB_KEY, resolvedTab);
      } catch (e) {}
    }

    if (resolvedTab === "qbank") {
      renderQuestionBankUI();
    }
  }

  function initTabs() {
    document.querySelectorAll(".nav-tab-btn").forEach(btn => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab, true));
    });

    document.querySelectorAll("[data-goto-tab]").forEach(btn => {
      btn.addEventListener("click", () => switchTab(btn.dataset.gotoTab, true));
    });

    let savedTab = "dashboard";
    try {
      const stored = localStorage.getItem(ACTIVE_TAB_KEY);
      if (stored && document.getElementById(`tab-${stored}`)) {
        savedTab = stored;
      }
    } catch (e) {}

    switchTab(savedTab, false);
  }

  /* ---------- Home Page (Лендинг с кнопкой Get Started -> Sign Up) ---------- */
  const AUTH_HINT_KEY = "sat_was_logged_in_v1";
  let manualHomeOpen = false;

  function getAuthState() {
    const widget = document.getElementById("auth-widget");
    if (!widget || widget.children.length === 0) return "pending";
    if (widget.querySelector(".auth-user-pill") || widget.querySelector("#auth-logout-btn")) {
      return "logged-in";
    }
    if (widget.querySelector("#auth-open-btn")) {
      return "guest";
    }
    return "pending";
  }

  function updateHomeButtonsForAuthState(state) {
    const loggedIn = state === "logged-in";
    const signInBtn = document.getElementById("home-signin-btn");
    const navStartBtn = document.getElementById("home-nav-start-btn");
    const heroStartBtn = document.getElementById("home-get-started-btn");
    const guestBtn = document.getElementById("home-guest-btn");
    const bottomStartBtn = document.getElementById("home-bottom-start-btn");

    if (signInBtn) signInBtn.classList.toggle("hidden", loggedIn);
    if (navStartBtn) {
      navStartBtn.textContent = loggedIn ? "Open Dashboard →" : "Get Started";
      navStartBtn.dataset.action = loggedIn ? "enter-app" : "signup";
    }
    if (heroStartBtn) {
      heroStartBtn.textContent = loggedIn ? "Open Dashboard →" : "Get Started →";
      heroStartBtn.dataset.action = loggedIn ? "enter-app" : "signup";
    }
    if (guestBtn) {
      guestBtn.classList.toggle("hidden", loggedIn);
    }
    if (bottomStartBtn) {
      bottomStartBtn.textContent = loggedIn ? "Return to Dashboard →" : "Get Started Free →";
      bottomStartBtn.dataset.action = loggedIn ? "enter-app" : "signup";
    }
  }

  function hideHomePage(markDismissed = false, pushAppHistory = false) {
    manualHomeOpen = false;
    const overlay = document.getElementById("sat-home-page");
    if (overlay) overlay.classList.add("hidden");
    document.body.classList.remove("home-page-open");
    if (markDismissed) {
      try {
        sessionStorage.setItem(HOME_DISMISSED_KEY, "1");
      } catch (e) {}
    }
    if (pushAppHistory && window.location.hash !== "#app") {
      try {
        window.history.pushState({ view: "app" }, "", "#app");
      } catch (e) {}
    }
  }

  function showHomePage(isManual = false, pushHomeHistory = false) {
    if (isManual) manualHomeOpen = true;
    const overlay = document.getElementById("sat-home-page");
    if (overlay) {
      overlay.classList.remove("hidden");
      overlay.scrollTop = 0;
    }
    document.body.classList.add("home-page-open");
    updateHomeButtonsForAuthState(getAuthState());
    if (pushHomeHistory && window.location.hash !== "#home") {
      try {
        window.history.pushState({ view: "home" }, "", "#home");
      } catch (e) {}
    }
  }

  function initHomePage() {
    if (document.getElementById("sat-home-page")) return;

    const homeEl = document.createElement("div");
    homeEl.id = "sat-home-page";
    homeEl.className = "sat-home-page hidden";
    homeEl.innerHTML = `
      <header class="sat-home-nav">
        <div class="sat-home-brand">
          <div class="brand-logo">SAT</div>
          <div>
            <div class="sat-home-brand-title">SAT Tutor</div>
            <div class="sat-home-brand-sub">Digital SAT Study Workspace</div>
          </div>
        </div>
        <div class="sat-home-nav-actions">
          <button type="button" class="sat-home-signin-btn" id="home-signin-btn">Sign In</button>
          <button type="button" class="sat-home-cta-sm" id="home-nav-start-btn" data-action="signup">Get Started</button>
        </div>
      </header>

      <main class="sat-home-main">
        <section class="sat-home-hero">
          <span class="sat-home-badge">100% Free Digital SAT Prep</span>
          <h1 class="sat-home-title">Everything you need to score 1500+ on the Digital SAT</h1>
          <p class="sat-home-lead">
            Practice with thousands of realistic Reading &amp; Writing and Math questions, adaptive Bluebook-style modules, interactive vocabulary games, and detailed step-by-step explanations — synced across all your devices.
          </p>
          <div class="sat-home-hero-actions">
            <button type="button" class="sat-home-cta-primary" id="home-get-started-btn" data-action="signup">Get Started →</button>
            <button type="button" class="sat-home-cta-secondary" id="home-guest-btn">Try without account</button>
          </div>
          <div class="sat-home-stats">
            <div class="sat-home-stat">
              <strong>3,700+</strong>
              <span>SAT Questions</span>
            </div>
            <div class="sat-home-stat">
              <strong>1,860+</strong>
              <span>High-Yield Vocab Words</span>
            </div>
            <div class="sat-home-stat">
              <strong>2-Module</strong>
              <span>Adaptive Practice Tests</span>
            </div>
          </div>
        </section>

        <section class="sat-home-features">
          <div class="sat-home-feature-card">
            <div class="sat-home-feat-icon">📚</div>
            <h3>Full Question Bank</h3>
            <p>Filter Reading &amp; Writing and Math questions by domain, subtopic, and difficulty. Built-in Desmos graphing calculator and SAT reference sheet included.</p>
          </div>
          <div class="sat-home-feature-card">
            <div class="sat-home-feat-icon">⚡</div>
            <h3>Adaptive Practice Modules</h3>
            <p>Take timed 2-module tests that mirror the real Digital SAT format — Module 2 adapts automatically based on your Module 1 performance.</p>
          </div>
          <div class="sat-home-feature-card">
            <div class="sat-home-feat-icon">🧠</div>
            <h3>SAT Vocabulary &amp; Games</h3>
            <p>Master essential SAT words using 3D Flashcards, Match Sprint, and Context Blitz with instant audio pronunciation and progress tracking.</p>
          </div>
          <div class="sat-home-feature-card">
            <div class="sat-home-feat-icon">📈</div>
            <h3>Smart Analytics &amp; Cloud Sync</h3>
            <p>Track accuracy by topic, drill your missed questions in one click, build a daily study plan, and keep your progress synced between phone and desktop.</p>
          </div>
        </section>

        <section class="sat-home-bottom-cta">
          <h2>Ready to boost your SAT score?</h2>
          <p>Create your free account in seconds to save your progress and unlock full cloud sync.</p>
          <button type="button" class="sat-home-cta-primary" id="home-bottom-start-btn" data-action="signup">Get Started Free →</button>
        </section>
      </main>
    `;

    document.body.appendChild(homeEl);

    const openSignUp = () => {
      if (typeof window.openAuthModal === "function") {
        window.openAuthModal("register");
      } else {
        const authBtn = document.getElementById("auth-open-btn");
        if (authBtn) authBtn.click();
      }
    };

    const openSignIn = () => {
      if (typeof window.openAuthModal === "function") {
        window.openAuthModal("login");
      } else {
        const authBtn = document.getElementById("auth-open-btn");
        if (authBtn) authBtn.click();
      }
    };

    const handlePrimaryAction = btn => {
      if (btn.dataset.action === "enter-app") {
        hideHomePage(true, true);
      } else {
        openSignUp();
      }
    };

    ["home-get-started-btn", "home-nav-start-btn", "home-bottom-start-btn"].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener("click", () => handlePrimaryAction(btn));
    });

    const signInBtn = document.getElementById("home-signin-btn");
    if (signInBtn) signInBtn.addEventListener("click", openSignIn);

    const guestBtn = document.getElementById("home-guest-btn");
    if (guestBtn) {
      guestBtn.addEventListener("click", () => hideHomePage(true, true));
    }

    // Клик по логотипу "SAT Tutor" в сайдбаре возвращает на Home Page
    const sidebarBrand = document.querySelector(".sidebar .sidebar-brand");
    if (sidebarBrand) {
      sidebarBrand.classList.add("is-home-link");
      sidebarBrand.title = "Go to Home Page";
      sidebarBrand.setAttribute("role", "button");
      sidebarBrand.setAttribute("tabindex", "0");
      sidebarBrand.addEventListener("click", () => showHomePage(true, true));
      sidebarBrand.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          showHomePage(true, true);
        }
      });
    }

    // Поддержка кнопки "Назад" / "Вперёд" в браузере
    window.addEventListener("popstate", () => {
      const h = window.location.hash;
      if (h === "#home" || (h === "" && getAuthState() === "guest")) {
        showHomePage(true, false);
      } else {
        hideHomePage(false, false);
      }
    });

    let authResolvedOnce = false;

    const handleAuthStateChange = () => {
      const state = getAuthState();
      if (state === "pending") return;

      updateHomeButtonsForAuthState(state);

      if (state === "logged-in") {
        try {
          localStorage.setItem(AUTH_HINT_KEY, "1");
        } catch (e) {}
        // Если пользователь только что вошёл с Home Page (или при старте), скрываем Home Page
        if (!manualHomeOpen || !authResolvedOnce) {
          hideHomePage(false, false);
        }
        authResolvedOnce = true;
        return;
      }

      if (state === "guest") {
        try {
          localStorage.removeItem(AUTH_HINT_KEY);
        } catch (e) {}

        if (!authResolvedOnce) {
          authResolvedOnce = true;
          let dismissed = false;
          try {
            dismissed = sessionStorage.getItem(HOME_DISMISSED_KEY) === "1";
          } catch (e) {}

          if (window.location.hash === "#home" || (!dismissed && window.location.hash !== "#app")) {
            showHomePage(false, false);
          }
        }
      }
    };

    const attachAuthObserver = widget => {
      const obs = new MutationObserver(handleAuthStateChange);
      obs.observe(widget, { childList: true, subtree: true });
      handleAuthStateChange();
    };

    const existingWidget = document.getElementById("auth-widget");
    if (existingWidget) {
      attachAuthObserver(existingWidget);
    } else {
      const bodyObs = new MutationObserver(() => {
        const w = document.getElementById("auth-widget");
        if (w) {
          bodyObs.disconnect();
          attachAuthObserver(w);
        }
      });
      bodyObs.observe(document.body, { childList: true });
    }
  }

  /* ---------- Время посещения и стрик (без Visits) ---------- */
  function loadStudyMeta() {
    const today = getTodayKey();
    let meta = {
      lastVisitDate: today,
      streak: 1,
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
    localStorage.setItem(STUDY_META_KEY, JSON.stringify(meta));
    return meta;
  }

  function removeVisitsCardFromDashboard() {
    const elVisits = document.getElementById("dash-visits-count");
    if (!elVisits) return;
    const card = elVisits.closest(".activity-stat, .stat-card, .history-kpi, div");
    if (card && card.parentElement) {
      card.remove();
    }
  }

  function renderStudyMeta(meta) {
    const todayStr = formatMinutes(meta.todaySeconds);
    const totalStr = formatMinutes(meta.totalSeconds);
    const streakLabel = `${meta.streak} ${meta.streak === 1 ? "day" : "days"}`;

    const elToday = document.getElementById("dash-today-time");
    const elTotal = document.getElementById("dash-total-time");
    const elStreakBadge = document.getElementById("dash-streak-badge");
    const elSideTime = document.getElementById("sidebar-today-time");
    const elSideStreak = document.getElementById("sidebar-streak");

    if (elToday) elToday.textContent = todayStr;
    if (elTotal) elTotal.textContent = totalStr;
    if (elStreakBadge) elStreakBadge.textContent = `🔥 ${streakLabel} streak`;
    if (elSideTime) elSideTime.textContent = todayStr;
    if (elSideStreak) elSideStreak.textContent = streakLabel;
  }

  function initStudyTracker() {
    removeVisitsCardFromDashboard();

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

  /* ---------- Question Bank: счётчики, Smart Practice, 8 доменов ---------- */
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
    initHomePage();
  });
})();
