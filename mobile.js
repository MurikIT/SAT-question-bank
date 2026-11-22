/* ==========================================================================
   SAT Tutor — Mobile UI Fixes & Branding (mobile.js)
   Подключается в index.html ПОСЛЕ всех остальных скриптов перед </body>:
     <script src="mobile.js"></script>
   ========================================================================== */

(function () {
  /* ---------- 1. Переименование SAT Prep -> SAT Tutor ---------- */
  function updateBranding() {
    document.querySelectorAll(".brand-title").forEach(el => {
      if (el.textContent.trim() === "SAT Prep") {
        el.textContent = "SAT Tutor";
      }
    });
    if (document.title && /SAT\s*Prep/i.test(document.title)) {
      document.title = document.title.replace(/SAT\s*Prep/gi, "SAT Tutor");
    }
  }

  /* ---------- 2. Позиционирование #auth-widget на мобильных и скрытие во время теста ---------- */
  function syncAuthPlacement() {
    const widget = document.getElementById("auth-widget");
    const sidebar = document.querySelector(".sidebar");
    const brand = document.querySelector(".sidebar-brand");
    if (!widget) return;

    const isLoggedIn = Boolean(widget.querySelector(".auth-user-pill"));
    widget.classList.toggle("is-logged-in", isLoggedIn);
    document.body.classList.toggle("sat-auth-logged-in", isLoggedIn);

    const isMobile = window.innerWidth <= 860;
    if (isMobile && sidebar && brand) {
      if (widget.parentElement !== sidebar) {
        brand.insertAdjacentElement("afterend", widget);
      }
    } else if (!isMobile && widget.parentElement !== document.body) {
      document.body.appendChild(widget);
    }
  }

  function syncAuthWidgetVisibility() {
    const testScreen = document.getElementById("test-screen");
    const setupScreen = document.getElementById("section-setup-screen");
    const summaryScreen = document.getElementById("summary-screen");

    const isVisible = el => Boolean(el && !el.classList.contains("hidden"));
    const hideAuth = isVisible(testScreen) || isVisible(setupScreen) || isVisible(summaryScreen);
    document.body.classList.toggle("sat-hide-auth", hideAuth);
  }

  function observeScreensAndAuth() {
    const screenObserver = new MutationObserver(syncAuthWidgetVisibility);
    const classConfig = { attributes: true, attributeFilter: ["class"] };

    ["test-screen", "summary-screen", "menu-screen"].forEach(id => {
      const el = document.getElementById(id);
      if (el) screenObserver.observe(el, classConfig);
    });

    const authContentObserver = new MutationObserver(syncAuthPlacement);

    const attachAuthObserver = () => {
      const widget = document.getElementById("auth-widget");
      if (widget && !widget.dataset.mobileAuthObserved) {
        widget.dataset.mobileAuthObserved = "1";
        authContentObserver.observe(widget, { childList: true, subtree: true });
        syncAuthPlacement();
      }
    };

    const bodyObserver = new MutationObserver(() => {
      const setupScreen = document.getElementById("section-setup-screen");
      if (setupScreen && !setupScreen.dataset.mobileObserved) {
        setupScreen.dataset.mobileObserved = "1";
        screenObserver.observe(setupScreen, classConfig);
      }
      attachAuthObserver();
      syncAuthWidgetVisibility();
    });
    bodyObserver.observe(document.body, { childList: true });

    window.addEventListener("resize", syncAuthPlacement);

    attachAuthObserver();
    syncAuthPlacement();
    syncAuthWidgetVisibility();
  }

  /* ---------- 3. Мобильные стили ---------- */
  function injectMobileStyles() {
    if (document.getElementById("sat-mobile-styles")) return;
    const style = document.createElement("style");
    style.id = "sat-mobile-styles";
    style.textContent = `
      /* Прячем плавающую кнопку Sign In / Sync, когда открыт тест, настройка или итоги */
      body.sat-hide-auth #auth-widget {
        display: none !important;
      }

      /* Поддержка body.dark-theme для модалки и кнопки auth.css */
      body.dark-theme .auth-modal {
        background: #1e293b;
        color: #f8fafc;
      }
      body.dark-theme .auth-field label {
        color: #cbd5e1;
      }
      body.dark-theme .auth-field input {
        background: #0f172a;
        color: #f8fafc;
        border-color: #334155;
      }
      body.dark-theme .auth-tabs {
        background: #0f172a;
      }
      body.dark-theme .auth-tab.active {
        background: #334155;
        color: #ffffff;
      }
      body.dark-theme .auth-user-pill {
        background: #1e293b;
        color: #f8fafc;
        border-color: #334155;
      }
      body.dark-theme .auth-google-btn {
        background: #0f172a;
        border-color: #334155;
        color: #f8fafc;
      }

      @media (max-width: 860px) {
        /* 1. Убираем лишние внешние отступы на телефоне */
        body {
          padding: 0 !important;
        }

        /* 2. Шапка + навигация */
        .sidebar {
          padding: 12px 12px 8px !important;
          gap: 10px !important;
          position: relative;
        }

        .sidebar-brand {
          padding-right: 124px; /* место под Sign In / Sync, когда пользователь не вошёл */
          min-height: 40px;
        }

        body.sat-auth-logged-in .sidebar-brand {
          padding-right: 0 !important;
        }

        .sidebar-nav {
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: nowrap !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          gap: 6px !important;
          padding: 2px 2px 6px !important;
          margin: 0 -4px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }

        .sidebar-nav::-webkit-scrollbar {
          display: none;
        }

        .sidebar-nav .nav-tab-btn {
          flex: 0 0 auto !important;
          width: auto !important;
          min-width: max-content !important;
          padding: 8px 12px !important;
          font-size: 13px !important;
          gap: 6px !important;
          white-space: nowrap !important;
          border-radius: 11px !important;
        }

        .sidebar-nav .nav-icon {
          font-size: 15px !important;
        }

        /* 3. Кнопка аккаунта (когда НЕ вошёл — справа в шапке) */
        #auth-widget {
          position: absolute !important;
          top: 12px !important;
          right: 12px !important;
          gap: 8px !important;
          max-width: none !important;
          z-index: 30 !important;
        }

        /* Когда ВОШЁЛ — отдельная аккуратная строка во всю ширину, чтобы Gmail был виден полностью */
        #auth-widget.is-logged-in {
          position: static !important;
          width: 100% !important;
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 8px !important;
          margin: 0 !important;
        }

        #auth-widget.is-logged-in .auth-user-pill {
          flex: 1 1 auto !important;
          min-width: 0 !important;
          max-width: none !important;
          display: flex !important;
          align-items: center !important;
          gap: 7px !important;
          padding: 6px 11px !important;
          font-size: 12.5px !important;
          border-radius: 10px !important;
        }

        #auth-widget.is-logged-in .auth-sync-dot {
          flex-shrink: 0 !important;
        }

        #auth-widget.is-logged-in .auth-user-pill > span:last-child {
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
          min-width: 0 !important;
          display: block !important;
        }

        #auth-widget .auth-btn {
          padding: 7px 12px !important;
          font-size: 12.5px !important;
          border-radius: 10px !important;
          white-space: nowrap !important;
          flex-shrink: 0 !important;
        }

        /* 4. Dashboard: убираем внутренний скролл в Daily Study Plan */
        .main-content {
          padding: 16px 12px 28px !important;
        }

        .page-header {
          margin-bottom: 16px !important;
          gap: 10px !important;
        }

        .page-header h1 {
          font-size: 24px !important;
        }

        .dash-card {
          padding: 16px !important;
          border-radius: 18px !important;
        }

        #daily-plan-list {
          max-height: none !important;
          overflow: visible !important;
        }

        #daily-plan-list .daily-plan-item.sp-dash-item {
          padding: 9px 10px !important;
        }

        #daily-plan-list .sp-dash-text {
          font-size: 13px !important;
          white-space: normal !important;
        }

        /* 5. Экран теста на телефоне */
        .test-container {
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important;
          height: 100dvh !important;
          padding: 10px 10px 84px !important;
          overflow-y: auto !important;
          overflow-x: hidden !important;
          -webkit-overflow-scrolling: touch;
        }

        .top-bar {
          gap: 6px 8px !important;
          margin-bottom: 10px !important;
          padding-bottom: 10px !important;
          flex-wrap: wrap !important;
          align-items: center !important;
        }

        #current-section-label {
          font-size: 14.5px !important;
          max-width: 100%;
        }

        .bluebook-workspace {
          display: flex !important;
          flex-direction: column !important;
          gap: 12px !important;
          height: auto !important;
          min-height: auto !important;
          overflow: visible !important;
        }

        .passage-panel {
          max-height: none !important;
          height: auto !important;
          overflow: visible !important;
          padding: 14px 15px !important;
          border-radius: 16px !important;
        }

        .passage-text {
          font-size: 15.5px !important;
          line-height: 1.62 !important;
        }

        .rw-highlighter-bar {
          gap: 6px !important;
          margin-bottom: 10px !important;
          padding-bottom: 10px !important;
        }

        .answer-panel {
          padding: 16px 14px !important;
          border-radius: 18px !important;
          overflow: visible !important;
          height: auto !important;
        }

        .bluebook-workspace.math-centered-mode .answer-panel {
          padding: 16px 14px !important;
        }

        .question-header {
          margin-bottom: 10px !important;
        }

        .question-box,
        .math-prompt-text,
        .math-stimulus-block {
          font-size: 16px !important;
          line-height: 1.55 !important;
          margin-bottom: 14px !important;
        }

        .options-grid {
          gap: 10px !important;
          margin-bottom: 16px !important;
        }

        .option-btn {
          padding: 12px 13px !important;
          font-size: 15px !important;
          border-radius: 14px !important;
        }

        .eliminate-btn {
          width: 34px !important;
          border-radius: 13px !important;
        }

        .explanation-box {
          padding: 14px 15px !important;
          font-size: 14.5px !important;
          border-radius: 16px !important;
        }

        .nav-arrows-bar {
          padding-top: 14px !important;
          gap: 10px !important;
        }

        .nav-arrows-bar #prev-btn,
        .nav-arrows-bar #next-btn {
          padding: 11px 14px !important;
          font-size: 14px !important;
        }

        .question-nav-bottom {
          padding: 8px 12px calc(10px + env(safe-area-inset-bottom, 0px)) !important;
        }

        body.dark-theme .question-nav-bottom {
          background: #0f172a !important;
          border-top-color: #334155 !important;
        }

        /* 6. Vocabulary и игры на телефоне */
        .vocab-mode-tabs {
          max-width: 100%;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .vocab-mode-tabs::-webkit-scrollbar {
          display: none;
        }
        .vocab-mode-btn {
          white-space: nowrap;
          font-size: 12.5px !important;
          padding: 6px 11px !important;
        }
        .blitz-options {
          grid-template-columns: 1fr !important;
        }
        .fc-controls {
          justify-content: center !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function initMobileEnhancements() {
    updateBranding();
    injectMobileStyles();
    observeScreensAndAuth();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMobileEnhancements);
  } else {
    initMobileEnhancements();
  }
})();
