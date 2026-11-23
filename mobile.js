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

  function syncMobileAuthPlacement() {
    const widget = document.getElementById("auth-widget");
    if (!widget) return;

    const mobile = isMobileViewport();
    const isLoggedIn = Boolean(
      widget.querySelector(".auth-user-pill") || widget.querySelector("#auth-logout-btn")
    );

    if (mobile && isLoggedIn) {
      const brand = document.querySelector(".sidebar .sidebar-brand");
      if (brand && widget.previousElementSibling !== brand) {
        brand.insertAdjacentElement("afterend", widget);
      }
      if (!widget.classList.contains("is-mobile-inline")) {
        widget.classList.add("is-mobile-inline");
      }
      if (widget.classList.contains("is-mobile-floating")) {
        widget.classList.remove("is-mobile-floating");
      }
    } else {
      if (widget.parentElement !== document.body) {
        document.body.appendChild(widget);
      }
      if (widget.classList.contains("is-mobile-inline")) {
        widget.classList.remove("is-mobile-inline");
      }
      if (mobile) {
        if (!widget.classList.contains("is-mobile-floating")) {
          widget.classList.add("is-mobile-floating");
        }
      } else if (widget.classList.contains("is-mobile-floating")) {
        widget.classList.remove("is-mobile-floating");
      }
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
    let lastVh = null;
    const setAppVh = () => {
      const rawH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      const vh = Math.round(rawH * 0.01 * 100) / 100;
      if (vh !== lastVh) {
        lastVh = vh;
        document.documentElement.style.setProperty("--app-vh", `${vh}px`);
      }
      syncMobileAuthPlacement();
    };
    setAppVh();

    window.addEventListener("resize", setAppVh, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", setAppVh, { passive: true });
    }

    let rafId = null;
    const scheduleSync = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        syncBodyScrollLock();
        syncMobileAuthPlacement();
        if (isMobileViewport()) {
          enhanceMobilePassages();
        }
      });
    };

    const observer = new MutationObserver(mutations => {
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
          } else {
            window.scrollTo({ top: 0, behavior: "instant" });
          }
        }, 50);
      }
      scheduleSync();
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    initMobileViewportFixes();
    enhanceMobilePassages();
    syncBodyScrollLock();
    syncMobileAuthPlacement();
  });
})();
