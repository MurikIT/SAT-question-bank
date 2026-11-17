let allQuestions = [];
let filteredQuestions = [];
let currentIndex = 0;

const sessionState = {};
let isPostTestReview = false;
let summaryReviewFilter = "all";

let activeSection = "RW";
let activeDomainFilter = "all";
let activeDifficultyFilter = "all";
let activeCountFilter = "all";
let activeTimerSetting = "off";

let timerInterval = null;
let remainingSeconds = 0;
let isTimerPaused = false;
let currentTimerMode = "none";

const DOMAIN_META = {
  INI: { label: "Information and Ideas", section: "RW" },
  CAS: { label: "Craft and Structure", section: "RW" },
  EOI: { label: "Expression of Ideas", section: "RW" },
  SEC: { label: "Standard English Conventions", section: "SEC" },
  ALG: { label: "Algebra", section: "Math" },
  ADV: { label: "Advanced Math", section: "Math" },
  PSD: { label: "Problem-Solving and Data Analysis", section: "Math" },
  GEO: { label: "Geometry and Trigonometry", section: "Math" }
};

const menuScreen = document.getElementById("menu-screen");
const testScreen = document.getElementById("test-screen");
const summaryScreen = document.getElementById("summary-screen");

const domainSelect = document.getElementById("domain-select");
const difficultySelect = document.getElementById("difficulty-select");
const countSelect = document.getElementById("count-select");
const timerSelect = document.getElementById("timer-select");
const filterStatus = document.getElementById("filter-status");

const backBtn = document.getElementById("back-btn");
const sectionLabel = document.getElementById("current-section-label");
const qNumEl = document.getElementById("q-num");
const qTotalEl = document.getElementById("q-total");
const qDiffBadge = document.getElementById("q-diff-badge");
const flagBtn = document.getElementById("flag-btn");

const timerBox = document.getElementById("timer-box");
const timerDisplay = document.getElementById("timer-display");
const timerToggleBtn = document.getElementById("timer-toggle-btn");

const passagePanel = document.getElementById("passage-panel");
const passageEl = document.getElementById("passage-text");
const questionEl = document.getElementById("question-text");
const optionsEl = document.getElementById("options-container");
const checkBtn = document.getElementById("check-btn");
const explanationEl = document.getElementById("explanation-box");
const prevBtn = document.getElementById("prev-btn");
const nextBtn = document.getElementById("next-btn");

const pickerToggleBtn = document.getElementById("question-picker-toggle");
const pickerPopup = document.getElementById("question-picker-popup");
const closePickerBtn = document.getElementById("close-picker-btn");
const pickerQNumEl = document.getElementById("picker-q-num");
const pickerQTotalEl = document.getElementById("picker-q-total");
const questionSquaresEl = document.getElementById("question-squares");

const exitModal = document.getElementById("exit-confirm-modal");
const cancelExitBtn = document.getElementById("cancel-exit-btn");
const confirmExitBtn = document.getElementById("confirm-exit-btn");

const statCorrectEl = document.getElementById("stat-correct");
const statWrongEl = document.getElementById("stat-wrong");
const statSkippedEl = document.getElementById("stat-skipped");
const statAccuracyEl = document.getElementById("stat-accuracy");
const summarySubtitleEl = document.getElementById("summary-subtitle");
const domainBreakdownEl = document.getElementById("domain-breakdown");
const mistakesReviewEl = document.getElementById("mistakes-review");
const restartSessionBtn = document.getElementById("restart-session-btn");
const summaryMenuBtn = document.getElementById("summary-menu-btn");

function formatOptionText(optText, idx) {
  const letters = ["A", "B", "C", "D"];
  const raw = String(optText ?? "").trim();
  if (/^[A-Da-d]\s*\)/.test(raw)) {
    return raw.replace(/^([A-Da-d])\s*\)\s*/, (_, l) => `${l.toUpperCase()}) `);
  }
  const cleaned = raw.replace(/^[A-Da-d]\s*[).:-]\s*/, "");
  const letter = letters[idx] || String(idx + 1);
  return `${letter}) ${cleaned}`;
}

function renderMath(targetEl) {
  if (!targetEl || typeof window.renderMathInElement !== "function") return;
  window.renderMathInElement(targetEl, {
    delimiters: [
      { left: "$$", right: "$$", display: true },
      { left: "\\[", right: "\\]", display: true },
      { left: "\\(", right: "\\)", display: false },
      { left: "$", right: "$", display: false }
    ],
    throwOnError: false,
    ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code"]
  });
}

function renderAllMath() {
  renderMath(testScreen);
  renderMath(summaryScreen);
}

function getQuestionId(q, fallbackIndex = 0) {
  return String(q.id ?? q.questionId ?? q.uuid ?? `q_${fallbackIndex}`);
}

function getDomainCode(q) {
  const raw = String(q.domain || q.topic || q.skill_cd || "").trim().toUpperCase();
  if (DOMAIN_META[raw]) return raw;
  const section = getSectionFromQuestion(q);
  if (section === "Math") return "ALG";
  if (raw.includes("CRAFT") || raw.includes("STRUCTURE")) return "CAS";
  if (raw.includes("EXPRESSION")) return "EOI";
  if (raw.includes("CONVENTION") || raw.includes("GRAMMAR")) return "SEC";
  return "INI";
}

function getDomainLabel(code) {
  return DOMAIN_META[code]?.label || code;
}

function getSectionFromQuestion(q) {
  const sec = String(q.section || q.module || "").trim().toLowerCase();
  if (sec === "math" || sec.includes("math")) return "Math";
  if (sec === "rw" || sec.includes("read") || sec.includes("writ")) return "RW";
  const dom = String(q.domain || "").trim().toUpperCase();
  if (["ALG", "ADV", "PSD", "GEO"].includes(dom)) return "Math";
  return "RW";
}

function populateDomainOptions(section) {
  if (!domainSelect) return;
  const previous = domainSelect.value || "all";
  const entries = Object.entries(DOMAIN_META).filter(([, meta]) => meta.section === section);
  domainSelect.innerHTML =
    '<option value="all">All Topics</option>' +
    entries.map(([code, meta]) => `<option value="${code}">${meta.label}</option>`).join("");
  domainSelect.value = entries.some(([code]) => code === previous) ? previous : "all";
  activeDomainFilter = domainSelect.value;
}

function shuffleArray(items) {
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatSeconds(totalSec) {
  const safe = Math.max(0, Math.floor(totalSec));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimerUI() {
  if (!timerBox || !timerDisplay) return;
  if (currentTimerMode === "none") {
    timerBox.classList.add("hidden");
    timerBox.classList.remove("warning");
    return;
  }
  timerBox.classList.remove("hidden");
  timerDisplay.textContent = formatSeconds(remainingSeconds);
  timerBox.classList.toggle("warning", remainingSeconds <= 15);
  if (timerToggleBtn) {
    timerToggleBtn.textContent = isTimerPaused ? "Resume" : "Pause";
  }
}

function handleTimerExpired() {
  stopTimer();
  if (currentTimerMode === "per_question") {
    const q = filteredQuestions[currentIndex];
    const qId = q ? getQuestionId(q, currentIndex) : null;
    if (qId && sessionState[qId] && sessionState[qId].selectedIndex !== null && !sessionState[qId].checked) {
      sessionState[qId].checked = true;
      sessionState[qId].isCorrect = sessionState[qId].selectedIndex === q.correctIndex;
    }
    if (currentIndex < filteredQuestions.length - 1) {
      currentIndex += 1;
      loadQuestion(currentIndex);
    } else {
      showSessionSummary();
    }
  } else if (currentTimerMode === "session") {
    showSessionSummary();
  }
}

function startTimerLoop() {
  stopTimer();
  if (currentTimerMode === "none" || isPostTestReview) return;
  timerInterval = setInterval(() => {
    if (isTimerPaused) return;
    remainingSeconds -= 1;
    updateTimerUI();
    if (remainingSeconds <= 0) {
      remainingSeconds = 0;
      updateTimerUI();
      handleTimerExpired();
    }
  }, 1000);
}

function configureTimerForQuestion(resetPerQuestion = true) {
  const raw = activeTimerSetting;
  if (!raw || raw === "off") {
    currentTimerMode = "none";
    isTimerPaused = false;
    stopTimer();
    updateTimerUI();
    return;
  }
  const sec = Number(raw);
  if (raw === "60" || raw === "90") {
    currentTimerMode = "per_question";
    if (resetPerQuestion) {
      remainingSeconds = sec;
      isTimerPaused = false;
    }
    updateTimerUI();
    startTimerLoop();
  } else {
    currentTimerMode = "session";
    if (resetPerQuestion) {
      remainingSeconds = sec;
      isTimerPaused = false;
    }
    updateTimerUI();
    startTimerLoop();
  }
}

function setPickerOpen(open) {
  if (!pickerPopup || !pickerToggleBtn) return;
  pickerPopup.classList.toggle("hidden", !open);
  pickerToggleBtn.setAttribute("aria-expanded", String(open));
}

function renderQuestionSquares() {
  if (!questionSquaresEl) return;
  questionSquaresEl.innerHTML = "";
  const total = filteredQuestions.length;
  if (pickerQTotalEl) pickerQTotalEl.textContent = String(total);
  if (pickerQNumEl) pickerQNumEl.textContent = String(Math.min(currentIndex + 1, Math.max(total, 1)));

  filteredQuestions.forEach((q, idx) => {
    const qId = getQuestionId(q, idx);
    const st = sessionState[qId] || {};
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "q-square-btn";
    btn.textContent = String(idx + 1);

    if (st.checked) {
      btn.classList.add(st.isCorrect ? "answered-correct" : "answered-wrong");
    } else if (st.selectedIndex !== null && st.selectedIndex !== undefined) {
      btn.classList.add("answered-draft");
    }

    if (st.flagged) {
      btn.classList.add("flagged");
    }

    if (idx === currentIndex) {
      btn.classList.add("active");
    }

    btn.onclick = () => {
      if (idx !== currentIndex) {
        currentIndex = idx;
        loadQuestion(currentIndex, { forceShowExplanation: isPostTestReview });
      }
      setPickerOpen(false);
    };

    questionSquaresEl.appendChild(btn);
  });
}

function updateFlagButtonUI(qId) {
  if (!flagBtn) return;
  const flagged = Boolean(sessionState[qId]?.flagged);
  flagBtn.classList.toggle("flagged", flagged);
  flagBtn.setAttribute("aria-pressed", String(flagged));
  flagBtn.textContent = flagged ? "⚑ Flagged" : "⚑ Mark for Review";
}

function updatePostTestReviewUI() {
  if (backBtn) {
    backBtn.textContent = isPostTestReview ? "← Back to Summary" : "← Back to Menu";
  }
  if (isPostTestReview) {
    stopTimer();
    if (timerBox) timerBox.classList.add("hidden");
  }
}

function renderPassage(q) {
  if (!passageEl) return;
  const rawPassage = q.passage ?? q.stimulus ?? "";
  passageEl.innerHTML = "";

  if (typeof rawPassage === "string" && rawPassage.trim()) {
    const hasHtml = /<[a-z][\s\S]*>/i.test(rawPassage);
    if (hasHtml) {
      passageEl.innerHTML = rawPassage;
    } else {
      passageEl.textContent = rawPassage;
    }
  }

  const visualHtml = q.visual || q.chart || q.table || q.svg || "";
  if (typeof visualHtml === "string" && visualHtml.trim()) {
    const holder = document.createElement("div");
    holder.innerHTML = visualHtml;
    passageEl.appendChild(holder);
  } else if (q.image || q.img) {
    const src = q.image || q.img;
    const img = document.createElement("img");
    img.src = src;
    img.alt = "Question visual";
    passageEl.appendChild(img);
  }

  if (window.innerWidth <= 860) {
    passageEl.querySelectorAll("svg, img, canvas").forEach(visual => {
      visual.style.cursor = "zoom-in";
      visual.onclick = e => {
        e.stopPropagation();
        visual.classList.toggle("mobile-expanded");
      };
    });
  }
}

function formatExplanation(exp) {
  if (!exp) return "No explanation provided.";
  const lines = String(exp)
    .split(/\n+/)
    .map(s => s.trim())
    .filter(Boolean);
  return lines.map(line => `<p class="exp-line">${line}</p>`).join("");
}

function loadQuestion(index, opts = {}) {
  if (!filteredQuestions.length) return;
  const q = filteredQuestions[index];
  const qId = getQuestionId(q, index);

  if (!sessionState[qId]) {
    sessionState[qId] = {
      selectedIndex: null,
      checked: false,
      isCorrect: false,
      flagged: false
    };
  }

  const st = sessionState[qId];
  const showExplanation = Boolean(st.checked || opts.forceShowExplanation);

  qNumEl.textContent = String(index + 1);
  qTotalEl.textContent = String(filteredQuestions.length);
  qDiffBadge.textContent = q.difficulty || "Medium";

  updateFlagButtonUI(qId);
  updatePostTestReviewUI();
  renderPassage(q);

  questionEl.textContent = q.question || q.prompt || "";
  optionsEl.innerHTML = "";

  const options = Array.isArray(q.options) ? q.options : [];

  options.forEach((optText, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-btn";
    btn.textContent = formatOptionText(optText, idx);

    if (st.selectedIndex === idx) {
      btn.classList.add("selected");
    }

    if (showExplanation) {
      btn.disabled = true;
      btn.classList.add("locked");
      if (idx === q.correctIndex) {
        btn.classList.add("correct");
      } else if (st.selectedIndex === idx && idx !== q.correctIndex) {
        btn.classList.add("wrong");
      }
    } else {
      btn.onclick = () => {
        st.selectedIndex = idx;
        optionsEl.querySelectorAll(".option-btn").forEach((b, i) => {
          b.classList.toggle("selected", i === idx);
        });
        checkBtn.disabled = false;
      };
    }

    optionsEl.appendChild(btn);
  });

  if (showExplanation) {
    checkBtn.disabled = true;
    explanationEl.innerHTML = formatExplanation(q.explanation);
    explanationEl.classList.remove("hidden");
  } else {
    checkBtn.disabled = st.selectedIndex === null;
    explanationEl.innerHTML = "";
    explanationEl.classList.add("hidden");
  }

  prevBtn.disabled = index === 0;
  nextBtn.textContent = index === filteredQuestions.length - 1 ? "Finish & Summary" : "Next →";

  if (!isPostTestReview && currentTimerMode === "per_question") {
    configureTimerForQuestion(true);
  }

  renderQuestionSquares();
  renderAllMath();
}

function buildRandomizedSession(section, domain, difficulty, rawCount) {
  const pool = allQuestions.filter(q => {
    const qSec = getSectionFromQuestion(q);
    if (section && qSec !== section) return false;
    if (domain && domain !== "all" && getDomainCode(q) !== domain) return false;
    if (difficulty && difficulty !== "all") {
      const qDiff = String(q.difficulty || "").trim().toLowerCase();
      if (qDiff !== difficulty.toLowerCase()) return false;
    }
    return true;
  });

  const shuffled = shuffleArray(pool);
  if (rawCount === "all") return shuffled;
  const limit = Number(rawCount);
  if (!Number.isFinite(limit) || limit <= 0) return shuffled;
  return shuffled.slice(0, Math.min(limit, shuffled.length));
}

function startSession({ keepTimerSession = false } = {}) {
  const sessionList = buildRandomizedSession(
    activeSection,
    activeDomainFilter,
    activeDifficultyFilter,
    activeCountFilter
  );

  if (!sessionList.length) {
    if (filterStatus) {
      filterStatus.textContent = "No questions match the selected filters.";
      filterStatus.classList.remove("hidden");
    }
    return;
  }

  if (filterStatus) {
    filterStatus.classList.add("hidden");
    filterStatus.textContent = "";
  }

  filteredQuestions = sessionList;
  currentIndex = 0;
  isPostTestReview = false;
  summaryReviewFilter = "all";

  Object.keys(sessionState).forEach(k => delete sessionState[k]);
  filteredQuestions.forEach((q, idx) => {
    const qId = getQuestionId(q, idx);
    sessionState[qId] = {
      selectedIndex: null,
      checked: false,
      isCorrect: false,
      flagged: false
    };
  });

  menuScreen.classList.add("hidden");
  summaryScreen.classList.add("hidden");
  testScreen.classList.remove("hidden");
  setPickerOpen(false);

  sectionLabel.textContent = activeSection === "Math" ? "Math" : "Reading & Writing";

  if (!keepTimerSession || currentTimerMode === "none") {
    configureTimerForQuestion(true);
  } else {
    isTimerPaused = false;
    updateTimerUI();
    startTimerLoop();
  }

  loadQuestion(0);
}

function renderDomainBreakdown() {
  if (!domainBreakdownEl) return;
  const statsByDomain = {};

  filteredQuestions.forEach((q, idx) => {
    const code = getDomainCode(q);
    if (!statsByDomain[code]) {
      statsByDomain[code] = {
        code,
        label: getDomainLabel(code),
        total: 0,
        correct: 0,
        wrong: 0,
        skipped: 0
      };
    }
    const qId = getQuestionId(q, idx);
    const st = sessionState[qId] || {};
    statsByDomain[code].total += 1;

    if (st.checked) {
      if (st.isCorrect) statsByDomain[code].correct += 1;
      else statsByDomain[code].wrong += 1;
    } else if (st.selectedIndex !== null && st.selectedIndex !== undefined) {
      const correct = st.selectedIndex === q.correctIndex;
      if (correct) statsByDomain[code].correct += 1;
      else statsByDomain[code].wrong += 1;
    } else {
      statsByDomain[code].skipped += 1;
    }
  });

  const rows = Object.values(statsByDomain);
  if (!rows.length) {
    domainBreakdownEl.innerHTML = "";
    return;
  }

  const html = rows
    .map(item => {
      const answered = item.correct + item.wrong;
      const accuracy = answered > 0 ? Math.round((item.correct / answered) * 100) : 0;
      let toneClass = "is-mid";
      if (answered === 0) toneClass = "";
      else if (accuracy >= 75) toneClass = "is-strong";
      else if (accuracy < 50) toneClass = "is-weak";

      return `
        <div class="domain-row ${toneClass}">
          <div class="domain-row-header">
            <span class="domain-title">${item.label}</span>
            <span class="domain-metrics">
              <strong>${answered > 0 ? accuracy + "%" : "—"}</strong>
              <span>(${item.correct}/${item.total} correct${item.skipped ? `, ${item.skipped} skipped` : ""})</span>
            </span>
          </div>
          <div class="domain-bar-track">
            <div class="domain-bar-fill" style="width: ${answered > 0 ? accuracy : 0}%"></div>
          </div>
        </div>
      `;
    })
    .join("");

  domainBreakdownEl.innerHTML = `
    <h3 class="domain-section-title">Accuracy by Topic</h3>
    <div class="domain-list">${html}</div>
  `;
}

function renderSummaryReviewList() {
  if (!mistakesReviewEl) return;

  const items = filteredQuestions.map((q, idx) => {
    const qId = getQuestionId(q, idx);
    const st = sessionState[qId] || {};
    let status = "skipped";
    if (st.checked) {
      status = st.isCorrect ? "correct" : "wrong";
    } else if (st.selectedIndex !== null && st.selectedIndex !== undefined) {
      status = st.selectedIndex === q.correctIndex ? "correct" : "wrong";
    }

    const userAns =
      st.selectedIndex !== null && st.selectedIndex !== undefined
        ? formatOptionText(q.options?.[st.selectedIndex] ?? "", st.selectedIndex)
        : "Skipped";
    const rightAns = formatOptionText(q.options?.[q.correctIndex] ?? "", q.correctIndex);

    return { q, idx, status, userAns, rightAns };
  });

  const visibleItems = items.filter(entry => {
    if (summaryReviewFilter === "wrong") return entry.status === "wrong";
    if (summaryReviewFilter === "correct") return entry.status === "correct";
    return true;
  });

  const tabsHtml = `
    <div class="summary-review-tabs">
      <button type="button" class="summary-tab-btn ${summaryReviewFilter === "all" ? "active" : ""}" data-filter="all">
        All (${items.length})
      </button>
      <button type="button" class="summary-tab-btn ${summaryReviewFilter === "wrong" ? "active" : ""}" data-filter="wrong">
        Incorrect (${items.filter(i => i.status === "wrong").length})
      </button>
      <button type="button" class="summary-tab-btn ${summaryReviewFilter === "correct" ? "active" : ""}" data-filter="correct">
        Correct (${items.filter(i => i.status === "correct").length})
      </button>
    </div>
  `;

  const cardsHtml = visibleItems.length
    ? visibleItems
        .map(({ q, idx, status, userAns, rightAns }) => {
          const isOk = status === "correct";
          const tag = isOk ? "✓ Correct" : status === "wrong" ? "✕ Incorrect" : "• Skipped";
          return `
            <div class="mistake-item ${isOk ? "is-correct" : ""}">
              <div>
                <div class="mistake-top-row">
                  <span class="mistake-meta">Q${idx + 1} · ${getDomainLabel(getDomainCode(q))} · ${tag}</span>
                  <button type="button" class="secondary-btn review-open-btn" data-q-index="${idx}">Review Question →</button>
                </div>
                <div class="mistake-question">${q.question || q.prompt || ""}</div>
              </div>
              <div>
                <div class="mistake-answers"><strong>Your answer:</strong> ${userAns}</div>
                <div class="mistake-answers"><strong>Correct answer:</strong> ${rightAns}</div>
              </div>
            </div>
          `;
        })
        .join("")
    : `<p class="exp-line">No questions in this filter.</p>`;

  mistakesReviewEl.innerHTML = tabsHtml + cardsHtml;

  mistakesReviewEl.querySelectorAll(".summary-tab-btn").forEach(btn => {
    btn.onclick = () => {
      summaryReviewFilter = btn.dataset.filter || "all";
      renderSummaryReviewList();
      renderAllMath();
    };
  });

  mistakesReviewEl.querySelectorAll(".review-open-btn").forEach(btn => {
    btn.onclick = () => {
      const targetIdx = Number(btn.dataset.qIndex);
      if (!Number.isFinite(targetIdx) || targetIdx < 0 || targetIdx >= filteredQuestions.length) return;
      isPostTestReview = true;
      currentIndex = targetIdx;
      summaryScreen.classList.add("hidden");
      testScreen.classList.remove("hidden");
      setPickerOpen(false);
      loadQuestion(currentIndex, { forceShowExplanation: true });
    };
  });
}

function showSessionSummary() {
  stopTimer();
  setPickerOpen(false);

  let correct = 0;
  let wrong = 0;
  let skipped = 0;

  filteredQuestions.forEach((q, idx) => {
    const qId = getQuestionId(q, idx);
    const st = sessionState[qId] || {};
    if (st.checked) {
      if (st.isCorrect) correct += 1;
      else wrong += 1;
    } else if (st.selectedIndex !== null && st.selectedIndex !== undefined) {
      if (st.selectedIndex === q.correctIndex) correct += 1;
      else wrong += 1;
    } else {
      skipped += 1;
    }
  });

  const answered = correct + wrong;
  const accuracy = answered > 0 ? Math.round((correct / answered) * 100) : 0;

  statCorrectEl.textContent = String(correct);
  statWrongEl.textContent = String(wrong);
  statSkippedEl.textContent = String(skipped);
  statAccuracyEl.textContent = `${accuracy}%`;

  const secName = activeSection === "Math" ? "Math" : "Reading & Writing";
  const domName = activeDomainFilter === "all" ? "All Topics" : getDomainLabel(activeDomainFilter);
  summarySubtitleEl.textContent = `${secName} · ${domName} · ${filteredQuestions.length} questions`;

  renderDomainBreakdown();
  renderSummaryReviewList();

  testScreen.classList.add("hidden");
  menuScreen.classList.add("hidden");
  summaryScreen.classList.remove("hidden");

  renderAllMath();
}

function returnToMenu() {
  stopTimer();
  isPostTestReview = false;
  setPickerOpen(false);
  if (exitModal) exitModal.classList.add("hidden");
  testScreen.classList.add("hidden");
  summaryScreen.classList.add("hidden");
  menuScreen.classList.remove("hidden");
}

function initEvents() {
  document.querySelectorAll(".start-btn").forEach(btn => {
    btn.onclick = () => {
      activeSection = btn.dataset.section || "RW";
      populateDomainOptions(activeSection);
      activeDifficultyFilter = difficultySelect ? difficultySelect.value : "all";
      activeCountFilter = countSelect ? countSelect.value : "all";
      activeTimerSetting = timerSelect ? timerSelect.value : "off";
      startSession();
    };
  });

  if (domainSelect) {
    domainSelect.onchange = () => {
      activeDomainFilter = domainSelect.value;
    };
  }

  if (difficultySelect) {
    difficultySelect.onchange = () => {
      activeDifficultyFilter = difficultySelect.value;
    };
  }

  if (countSelect) {
    countSelect.onchange = () => {
      activeCountFilter = countSelect.value;
    };
  }

  if (timerSelect) {
    timerSelect.onchange = () => {
      activeTimerSetting = timerSelect.value;
    };
  }

  if (backBtn) {
    backBtn.onclick = () => {
      if (isPostTestReview) {
        isPostTestReview = false;
        testScreen.classList.add("hidden");
        summaryScreen.classList.remove("hidden");
        renderAllMath();
        return;
      }
      if (exitModal) {
        exitModal.classList.remove("hidden");
      } else {
        returnToMenu();
      }
    };
  }

  if (cancelExitBtn) {
    cancelExitBtn.onclick = () => {
      if (exitModal) exitModal.classList.add("hidden");
    };
  }

  if (confirmExitBtn) {
    confirmExitBtn.onclick = () => {
      returnToMenu();
    };
  }

  if (flagBtn) {
    flagBtn.onclick = () => {
      const q = filteredQuestions[currentIndex];
      if (!q) return;
      const qId = getQuestionId(q, currentIndex);
      if (!sessionState[qId]) return;
      sessionState[qId].flagged = !sessionState[qId].flagged;
      updateFlagButtonUI(qId);
      renderQuestionSquares();
    };
  }

  if (timerToggleBtn) {
    timerToggleBtn.onclick = () => {
      isTimerPaused = !isTimerPaused;
      updateTimerUI();
    };
  }

  if (checkBtn) {
    checkBtn.onclick = () => {
      const q = filteredQuestions[currentIndex];
      if (!q) return;
      const qId = getQuestionId(q, currentIndex);
      const st = sessionState[qId];
      if (!st || st.selectedIndex === null) return;

      st.checked = true;
      st.isCorrect = st.selectedIndex === q.correctIndex;
      loadQuestion(currentIndex, { forceShowExplanation: isPostTestReview });
    };
  }

  if (prevBtn) {
    prevBtn.onclick = () => {
      if (currentIndex > 0) {
        currentIndex -= 1;
        loadQuestion(currentIndex, { forceShowExplanation: isPostTestReview });
      }
    };
  }

  if (nextBtn) {
    nextBtn.onclick = () => {
      if (currentIndex < filteredQuestions.length - 1) {
        currentIndex += 1;
        loadQuestion(currentIndex, { forceShowExplanation: isPostTestReview });
      } else {
        showSessionSummary();
      }
    };
  }

  if (pickerToggleBtn) {
    pickerToggleBtn.onclick = e => {
      e.stopPropagation();
      const isHidden = pickerPopup ? pickerPopup.classList.contains("hidden") : true;
      setPickerOpen(isHidden);
    };
  }

  if (closePickerBtn) {
    closePickerBtn.onclick = () => setPickerOpen(false);
  }

  document.addEventListener("click", e => {
    if (!pickerPopup || pickerPopup.classList.contains("hidden")) return;
    if (!pickerPopup.contains(e.target) && e.target !== pickerToggleBtn) {
      setPickerOpen(false);
    }
  });

  if (restartSessionBtn) {
    restartSessionBtn.onclick = () => {
      startSession();
    };
  }

  if (summaryMenuBtn) {
    summaryMenuBtn.onclick = () => {
      returnToMenu();
    };
  }
}

async function initApp() {
  initEvents();
  populateDomainOptions(activeSection);

  try {
    const res = await fetch("questions.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    allQuestions = Array.isArray(data) ? data : Array.isArray(data.questions) ? data.questions : [];
  } catch (err) {
    console.error("Failed to load questions.json:", err);
    if (filterStatus) {
      filterStatus.textContent = "Could not load questions.json. Run via a local server.";
      filterStatus.classList.remove("hidden");
    }
  }
}

window.addEventListener("DOMContentLoaded", initApp);