(function () {
  function isMobileViewport() {
    return window.matchMedia("(max-width: 860px)").matches;
  }

  function hasAnyModalOpen() {
    const selectors = [
      "#vocab-zoom-modal:not(.hidden)",
      "#exit-confirm-modal:not(.hidden)",
      "#module-transition-modal:not(.hidden)",
      "#module-length-modal:not(.hidden)",
      "#reset-history-modal:not(.hidden)",
      "#auth-modal-overlay.open"
    ];
    return selectors.some(sel => Boolean(document.querySelector(sel)));
  }

  let lastLockedState = null;

  function syncBodyScrollLock() {
    const locked = hasAnyModalOpen();
    if (locked === lastLockedState) return;
    lastLockedState = locked;

    if (locked) {
      document.body.classList.add("mobile-modal-open");
      document.body.style.overflow = "hidden";
    } else {
      document.body.classList.remove("mobile-modal-open");
      document.body.style.overflow = "";
    }
  }

  function enhanceMobilePassages() {
    if (!isMobileViewport()) return;
    const targets = document.querySelectorAll(
      ".passage-panel svg:not(.katex svg), .passage-panel img, .passage-panel canvas"
    );
    targets.forEach(el => {
      if (el.dataset.mobileZoomBound) return;
      el.dataset.mobileZoomBound = "1";
      el.style.cursor = "zoom-in";
      el.addEventListener("click", e => {
        if (!isMobileViewport()) return;
        e.stopPropagation();
        const expanded = el.classList.toggle("mobile-expanded");
        el.style.cursor = expanded ? "zoom-out" : "zoom-in";
      });
    });
  }

  function initMobileViewportFixes() {
    // Обновляем переменную --app-vh только при реальном изменении высоты
    let lastVh = null;
    const setAppVh = () => {
      const rawH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      const vh = Math.round(rawH * 0.01 * 100) / 100;
      if (vh === lastVh) return;
      lastVh = vh;
      document.documentElement.style.setProperty("--app-vh", `${vh}px`);
    };
    setAppVh();

    window.addEventListener("resize", setAppVh, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", setAppVh, { passive: true });
    }

    // Безопасный наблюдатель за модалками (без каскада мутаций на каждый чих)
    let rafId = null;
    const scheduleSync = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        syncBodyScrollLock();
        if (isMobileViewport()) {
          enhanceMobilePassages();
        }
      });
    };

    const observer = new MutationObserver(mutations => {
      // Игнорируем изменения, вызванные самим mobile.js на body
      const hasRelevantChange = mutations.some(m => m.target !== document.body);
      if (hasRelevantChange) {
        scheduleSync();
      }
    });

    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["class"]
    });

    // При переключении вопросов или вкладок возвращаем прокрутку вверх на мобильных
    document.addEventListener("click", e => {
      const targetEl = e.target && e.target.closest ? e.target : null;
      if (!targetEl) return;

      const navOrStepBtn = targetEl.closest(
        ".nav-tab-btn, #prev-btn, #next-btn, .q-square-btn, .start-btn, .module-start-btn, .topic-mini-card"
      );
      if (navOrStepBtn && isMobileViewport()) {
        setTimeout(() => {
          enhanceMobilePassages();
          const testContainer = document.querySelector(".test-container");
          if (testContainer && !testContainer.classList.contains("hidden")) {
            testContainer.scrollTop = 0;
          }
        }, 60);
      }
      scheduleSync();
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    initMobileViewportFixes();
    enhanceMobilePassages();
    syncBodyScrollLock();
  });
})();
