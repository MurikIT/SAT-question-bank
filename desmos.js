(function () {
  let calculatorInstance = null;
  let initialized = false;

  function createModalIfMissing() {
    if (document.getElementById("sat-desmos-modal")) return;

    const backdrop = document.createElement("div");
    backdrop.id = "sat-desmos-modal";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.setAttribute("aria-label", "Desmos Graphing Calculator");
    backdrop.style.cssText = [
      "display:none",
      "position:fixed",
      "inset:0",
      "background:rgba(15,23,42,0.55)",
      "z-index:9999",
      "align-items:center",
      "justify-content:center",
      "padding:16px"
    ].join(";");

    const win = document.createElement("div");
    win.style.cssText = [
      "width:100%",
      "max-width:860px",
      "height:76vh",
      "background:#ffffff",
      "border-radius:12px",
      "border:1px solid #cbd5e1",
      "display:flex",
      "flex-direction:column",
      "overflow:hidden",
      "box-shadow:0 20px 50px rgba(0,0,0,0.28)"
    ].join(";");

    const header = document.createElement("div");
    header.style.cssText = [
      "padding:10px 16px",
      "border-bottom:1px solid #e2e8f0",
      "display:flex",
      "align-items:center",
      "justify-content:space-between",
      "font-family:system-ui,-apple-system,sans-serif",
      "font-weight:700",
      "font-size:14px",
      "color:#0f172a"
    ].join(";");

    const title = document.createElement("span");
    title.textContent = "Desmos Graphing Calculator";

    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.textContent = "Close";
    closeBtn.style.cssText = [
      "padding:6px 12px",
      "border-radius:8px",
      "border:1px solid #cbd5e1",
      "background:#f8fafc",
      "color:#0f172a",
      "font-weight:600",
      "cursor:pointer"
    ].join(";");
    closeBtn.addEventListener("click", closeDesmos);

    header.appendChild(title);
    header.appendChild(closeBtn);

    const body = document.createElement("div");
    body.style.cssText = "flex:1;position:relative;";

    const calcEl = document.createElement("div");
    calcEl.id = "sat-desmos-calculator";
    calcEl.style.cssText = "width:100%;height:100%;";

    body.appendChild(calcEl);
    win.appendChild(header);
    win.appendChild(body);
    backdrop.appendChild(win);

    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) closeDesmos();
    });

    document.body.appendChild(backdrop);
  }

  function mountCalculator() {
    const container = document.getElementById("sat-desmos-calculator");
    if (!container || initialized) return;
    initialized = true;

    if (window.Desmos && typeof window.Desmos.GraphingCalculator === "function") {
      calculatorInstance = window.Desmos.GraphingCalculator(container, {
        keypad: true,
        expressions: true,
        settingsMenu: true
      });
    } else {
      container.innerHTML =
        '<iframe src="https://www.desmos.com/calculator" title="Desmos Graphing Calculator" style="width:100%;height:100%;border:0;"></iframe>';
    }
  }

  function ensureApiScript() {
    if (window.Desmos || document.getElementById("sat-desmos-api-script")) return;
    const script = document.createElement("script");
    script.id = "sat-desmos-api-script";
    script.src = "https://www.desmos.com/api/v1.9/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6";
    script.async = true;
    script.onload = function () {
      if (initialized) {
        const container = document.getElementById("sat-desmos-calculator");
        if (container && !calculatorInstance && window.Desmos && typeof window.Desmos.GraphingCalculator === "function") {
          container.innerHTML = "";
          calculatorInstance = window.Desmos.GraphingCalculator(container, {
            keypad: true,
            expressions: true,
            settingsMenu: true
          });
        }
      }
    };
    document.head.appendChild(script);
  }

  function openDesmos(expressions) {
    ensureApiScript();
    createModalIfMissing();
    const modal = document.getElementById("sat-desmos-modal");
    if (modal) modal.style.display = "flex";
    mountCalculator();

    if (calculatorInstance && Array.isArray(expressions)) {
      calculatorInstance.setBlank();
      expressions.forEach(function (latex, i) {
        if (typeof latex === "string" && latex.trim()) {
          calculatorInstance.setExpression({ id: "expr_" + i, latex: latex });
        }
      });
    }
  }

  function closeDesmos() {
    const modal = document.getElementById("sat-desmos-modal");
    if (modal) modal.style.display = "none";
  }

  function toggleDesmos(expressions) {
    const modal = document.getElementById("sat-desmos-modal");
    const isOpen = modal && modal.style.display === "flex";
    if (isOpen) {
      closeDesmos();
    } else {
      openDesmos(expressions);
    }
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeDesmos();
  });

  window.DesmosModule = {
    open: openDesmos,
    close: closeDesmos,
    toggle: toggleDesmos,
    getCalculator: function () {
      return calculatorInstance;
    }
  };
})();
