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

  function syncBodyScrollLock() {
    if (hasAnyModalOpen()) {
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
    // Обновляем переменную --app-vh для корректной высоты на мобильных браузерах
    const setAppVh = () => {
      const h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      document.documentElement.style.setProperty("--app-vh", `${h * 0.01}px`);
    };
    setAppVh();
    window.addEventListener("resize", setAppVh, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", setAppVh, { passive: true });
    }

    // Следим за открытием/закрытием модалок, чтобы не прокручивался фон
    const observer = new MutationObserver(() => {
      syncBodyScrollLock();
      enhanceMobilePassages();
    });
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["class"]
    });

    // При переключении вопросов или вкладок возвращаем прокрутку вверх на мобильных
    document.addEventListener("click", e => {
      const navOrStepBtn = e.target.closest(
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
      setTimeout(syncBodyScrollLock, 20);
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    initMobileViewportFixes();
    enhanceMobilePassages();
    syncBodyScrollLock();
  });
})();
