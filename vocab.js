(function () {
  const VOCAB_PROGRESS_KEY = "sat_vocab_progress_v1";
  const VOCAB_CUSTOM_KEY = "sat_vocab_custom_v1";
  const MATCH_BEST_KEY = "sat_vocab_match_best_v1";
  const BLITZ_BEST_KEY = "sat_vocab_blitz_best_v1";

  let bankWords = [];
  let isLoaded = false;
  let loadError = false;

  let activeMode = "bank"; // bank | flashcards | match | blitz
  let statusFilter = "all";
  let searchQuery = "";
  let lastVisibleWords = [];

  /* ---------- Storage Helpers ---------- */
  function loadProgress() {
    try {
      const raw = localStorage.getItem(VOCAB_PROGRESS_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function saveProgress(map) {
    try {
      localStorage.setItem(VOCAB_PROGRESS_KEY, JSON.stringify(map));
    } catch (e) {}
  }

  function loadCustomWords() {
    try {
      const raw = localStorage.getItem(VOCAB_CUSTOM_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveCustomWords(list) {
    try {
      localStorage.setItem(VOCAB_CUSTOM_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  function getAllWords() {
    const custom = loadCustomWords().map(w => ({ ...w, isCustom: true }));
    return [...custom, ...bankWords];
  }

  function getWordStatus(wordId, progressMap) {
    const p = progressMap || loadProgress();
    const st = p[wordId];
    return st === "mastered" || st === "learning" ? st : "new";
  }

  function setWordStatus(wordId, nextStatus) {
    const map = loadProgress();
    if (!nextStatus || nextStatus === "new") {
      delete map[wordId];
    } else {
      map[wordId] = nextStatus;
    }
    saveProgress(map);
    renderVocabTab();
    if (zoomModalOpen && zoomCurrentWordId === wordId) {
      renderZoomModalContent();
    }
  }

  function speakWord(wordText) {
    if (!wordText || typeof window.speechSynthesis === "undefined") return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(wordText);
      utter.lang = "en-US";
      utter.rate = 0.94;
      window.speechSynthesis.speak(utter);
    } catch (e) {}
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function shuffle(arr) {
    const copy = arr.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function highlightWordInExample(example, word) {
    const safeEx = escapeHtml(example || "");
    if (!safeEx || !word) return safeEx;
    const escapedWord = word.replace(/[. *+?^${}()|[\]\\]/g, "\\$&");
    const root = escapedWord.length > 5 ? escapedWord.slice(0, -1) : escapedWord;
    const re = new RegExp(`\\b(${root}[a-z]*)\\b`, "gi");
    return safeEx.replace(re, "<strong>$1</strong>");
  }

  function blankWordInExample(example, word) {
    const safeEx = escapeHtml(example || "");
    if (!safeEx || !word) return safeEx;
    const escapedWord = word.replace(/[. *+?^${}()|[\]\\]/g, "\\$&");
    const root = escapedWord.length > 5 ? escapedWord.slice(0, -1) : escapedWord;
    const re = new RegExp(`\\b(${root}[a-z]*)\\b`, "gi");
    return safeEx.replace(re, '<span class="blitz-blank" aria-label="blank">&nbsp;</span>');
  }

  /* ---------- Mode Switching ---------- */
  function switchVocabMode(mode) {
    activeMode = mode;
    if (typeof stopMatchTimer === "function") stopMatchTimer();
    if (typeof stopBlitzTimer === "function") stopBlitzTimer();

    document.querySelectorAll("#vocab-mode-tabs .vocab-mode-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.vmode === mode);
    });

    ["bank", "flashcards", "match", "blitz"].forEach(m => {
      const el = document.getElementById(`vocab-view-${m}`);
      if (!el) return;
      el.classList.toggle("hidden", m !== mode);
      el.classList.toggle("active", m === mode);
    });

    if (mode === "flashcards") {
      buildFlashcardDeck(false);
    } else if (mode === "match") {
      if (typeof showMatchStartScreen === "function") showMatchStartScreen();
    } else if (mode === "blitz") {
      if (typeof showBlitzStartScreen === "function") showBlitzStartScreen();
    } else {
      renderVocabTab();
    }
  }

  /* ---------- Карточка статистики Vocabulary на Dashboard ---------- */
  function renderDashboardVocabCard() {
    const card = document.getElementById("dashboard-vocab-card");
    if (!card) return;

    const allWords = getAllWords();
    const progress = loadProgress();

    let mastered = 0;
    let learning = 0;
    let fresh = 0;

    allWords.forEach(w => {
      const st = getWordStatus(w.id, progress);
      if (st === "mastered") mastered += 1;
      else if (st === "learning") learning += 1;
      else fresh += 1;
    });

    const total = allWords.length;
    const masteryPct = total > 0 ? Math.round((mastered / total) * 100) : 0;
    const learningPct = total > 0 ? Math.round((learning / total) * 100) : 0;

    const matchBestRaw = localStorage.getItem(MATCH_BEST_KEY);
    const matchBestStr = matchBestRaw ? `${Number(matchBestRaw).toFixed(1)}s` : "—";
    const blitzBestStr = localStorage.getItem(BLITZ_BEST_KEY) || "—";

    const masteryTone = mastered === 0 ? "" : masteryPct >= 75 ? "good" : masteryPct < 25 ? "weak" : "";

    card.innerHTML = `
      <div class="history-menu-header">
        <h3 class="history-menu-title">Vocabulary Progress</h3>
        <div class="history-menu-actions">
          <button type="button" id="dash-open-vocab-btn" class="history-action-btn">Open Vocabulary →</button>
          <button type="button" id="dash-open-flashcards-btn" class="history-action-btn">Flashcards</button>
        </div>
      </div>

      <div class="history-kpis">
        <div class="history-kpi">
          <div class="history-kpi-val">${total > 0 ? masteryPct + "%" : "—"}</div>
          <div class="history-kpi-label">Mastery Rate</div>
        </div>
        <div class="history-kpi">
          <div class="history-kpi-val">${mastered}${total ? ` / ${total}` : ""}</div>
          <div class="history-kpi-label">Words Mastered</div>
        </div>
        <div class="history-kpi">
          <div class="history-kpi-val">${learning}</div>
          <div class="history-kpi-label">In Learning</div>
        </div>
        <div class="history-kpi">
          <div class="history-kpi-val">${matchBestStr} / ${blitzBestStr}</div>
          <div class="history-kpi-label">Match Best / Blitz Best</div>
        </div>
      </div>

      <div class="history-domains-grid">
        <div class="history-dom-item">
          <div class="history-dom-top">
            <span>Mastered Words</span>
            <strong>${mastered} / ${total} (${masteryPct}%)</strong>
          </div>
          <div class="history-dom-bar">
            <div class="history-dom-fill ${masteryTone || "good"}" style="width: ${masteryPct}%"></div>
          </div>
        </div>
        <div class="history-dom-item">
          <div class="history-dom-top">
            <span>Learning Queue</span>
            <strong>${learning} learning · ${fresh} new</strong>
          </div>
          <div class="history-dom-bar">
            <div class="history-dom-fill" style="width: ${learningPct}%"></div>
          </div>
        </div>
      </div>
    `;

    const openVocabBtn = document.getElementById("dash-open-vocab-btn");
    if (openVocabBtn) {
      openVocabBtn.onclick = () => {
        const navBtn = document.querySelector('.nav-tab-btn[data-tab="vocab"]');
        if (navBtn) navBtn.click();
        switchVocabMode("bank");
      };
    }

    const openFcBtn = document.getElementById("dash-open-flashcards-btn");
    if (openFcBtn) {
      openFcBtn.onclick = () => {
        const navBtn = document.querySelector('.nav-tab-btn[data-tab="vocab"]');
        if (navBtn) navBtn.click();
        switchVocabMode("flashcards");
      };
    }
  }

  /* ---------- Mode 1: Word Bank ---------- */
  function renderVocabTab() {
    renderDashboardVocabCard();
    const gridEl = document.getElementById("vocab-cards-grid");
    if (!gridEl) return;

    const allWords = getAllWords();
    const progress = loadProgress();

    let masteredCount = 0;
    let learningCount = 0;
    let newCount = 0;

    allWords.forEach(w => {
      const st = getWordStatus(w.id, progress);
      if (st === "mastered") masteredCount += 1;
      else if (st === "learning") learningCount += 1;
      else newCount += 1;
    });

    const total = allWords.length;
    const masteryPct = total > 0 ? Math.round((masteredCount / total) * 100) : 0;

    const elTotal = document.getElementById("vocab-stat-total");
    const elMastered = document.getElementById("vocab-stat-mastered");
    const elLearning = document.getElementById("vocab-stat-learning");
    const elNew = document.getElementById("vocab-stat-new");
    const elPct = document.getElementById("vocab-mastery-pct");
    const elFill = document.getElementById("vocab-mastery-fill");

    if (elTotal) elTotal.textContent = String(total);
    if (elMastered) elMastered.textContent = String(masteredCount);
    if (elLearning) elLearning.textContent = String(learningCount);
    if (elNew) elNew.textContent = String(newCount);
    if (elPct) elPct.textContent = `${masteryPct}%`;
    if (elFill) elFill.style.width = `${masteryPct}%`;

    if (!isLoaded && !allWords.length) {
      gridEl.innerHTML = `<div class="vocab-empty-state">Loading vocabulary bank...</div>`;
      return;
    }

    if (loadError && !allWords.length) {
      gridEl.innerHTML = `<div class="vocab-empty-state">Could not load <strong>vocab.json</strong>. Make sure it is in the project folder and opened via a local server (Live Server).</div>`;
      return;
    }

    const q = searchQuery.trim().toLowerCase();
    const visible = allWords.filter(w => {
      const st = getWordStatus(w.id, progress);
      if (statusFilter !== "all" && st !== statusFilter) return false;
      if (q) {
        const hay = `${w.word} ${w.definition} ${(w.synonyms || []).join(" ")}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    lastVisibleWords = visible;

    if (!visible.length) {
      gridEl.innerHTML = `<div class="vocab-empty-state">No words match your current filter. Try clearing the search or adding a custom word.</div>`;
      return;
    }

    gridEl.innerHTML = visible
      .map(w => {
        const st = getWordStatus(w.id, progress);
        const synHtml = (w.synonyms || [])
          .filter(Boolean)
          .map(s => `<span class="vocab-syn-tag">${escapeHtml(s)}</span>`)
          .join("");
        const exampleHtml = w.example
          ? `<div class="vocab-example">“${highlightWordInExample(w.example, w.word)}”</div>`
          : "";

        return `
          <article class="vocab-card status-${st} is-zoomable" data-word-id="${escapeHtml(w.id)}" title="Click to zoom in">
            <div class="vocab-card-head">
              <div class="vocab-word-group">
                <h3 class="vocab-word-title">${escapeHtml(w.word)}</h3>
                <span class="vocab-pos">${escapeHtml(w.pos || "")}</span>
                <button type="button" class="vocab-speak-btn" data-speak="${escapeHtml(w.word)}" title="Listen to pronunciation" aria-label="Pronounce ${escapeHtml(w.word)}">🔊</button>
              </div>
              <div class="vocab-card-head-right">
                ${w.isCustom ? `<span class="vocab-cat-pill">Custom</span>` : ""}
                <span class="vocab-zoom-hint">⤢</span>
              </div>
            </div>

            <p class="vocab-definition">${escapeHtml(w.definition)}</p>

            ${synHtml ? `<div class="vocab-syns">${synHtml}</div>` : ""}
            ${exampleHtml}

            <div class="vocab-card-footer">
              <div class="vocab-status-actions">
                <button type="button" class="vocab-st-btn ${st === "learning" ? "active-learning" : ""}" data-set-status="learning" data-wid="${escapeHtml(w.id)}">
                  ${st === "learning" ? "● Learning" : "Mark Learning"}
                </button>
                <button type="button" class="vocab-st-btn ${st === "mastered" ? "active-mastered" : ""}" data-set-status="mastered" data-wid="${escapeHtml(w.id)}">
                  ${st === "mastered" ? "✓ Mastered" : "Mark Mastered"}
                </button>
              </div>
              ${w.isCustom ? `<button type="button" class="vocab-del-btn" data-del-custom="${escapeHtml(w.id)}" title="Delete custom word">✕</button>` : ""}
            </div>
          </article>
        `;
      })
      .join("");

    gridEl.querySelectorAll(".vocab-speak-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        speakWord(btn.dataset.speak);
      });
    });

    gridEl.querySelectorAll(".vocab-st-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const wid = btn.dataset.wid;
        const targetStatus = btn.dataset.setStatus;
        const current = getWordStatus(wid);
        setWordStatus(wid, current === targetStatus ? "new" : targetStatus);
      });
    });

    gridEl.querySelectorAll(".vocab-del-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const wid = btn.dataset.delCustom;
        const nextCustom = loadCustomWords().filter(item => item.id !== wid);
        saveCustomWords(nextCustom);
        const prog = loadProgress();
        delete prog[wid];
        saveProgress(prog);
        renderVocabTab();
      });
    });

    gridEl.querySelectorAll(".vocab-card").forEach(card => {
      card.addEventListener("click", () => {
        openZoomModal(card.dataset.wordId);
      });
    });
  }

  /* ---------- Word Card Zoom Modal ---------- */
  let zoomModalOpen = false;
  let zoomCurrentWordId = null;
  let zoomLastKnownIndex = 0;

  function openZoomModal(wordId) {
    const modal = document.getElementById("vocab-zoom-modal");
    if (!modal) return;
    zoomCurrentWordId = wordId;
    const list = lastVisibleWords.length ? lastVisibleWords : getAllWords();
    const foundIdx = list.findIndex(w => w.id === wordId);
    if (foundIdx >= 0) zoomLastKnownIndex = foundIdx;
    zoomModalOpen = true;
    renderZoomModalContent();
    modal.classList.remove("hidden");
  }

  function closeZoomModal() {
    const modal = document.getElementById("vocab-zoom-modal");
    if (modal) modal.classList.add("hidden");
    zoomModalOpen = false;
    zoomCurrentWordId = null;
  }

  function renderZoomModalContent() {
    const all = getAllWords();
    const list = lastVisibleWords.length ? lastVisibleWords : all;

    let idx = list.findIndex(w => w.id === zoomCurrentWordId);
    let wordObj = idx >= 0 ? list[idx] : null;

    if (!wordObj) {
      if (list.length > 0) {
        idx = Math.min(Math.max(zoomLastKnownIndex, 0), list.length - 1);
        wordObj = list[idx];
        zoomCurrentWordId = wordObj.id;
      } else {
        wordObj = all.find(w => w.id === zoomCurrentWordId) || all[0];
        idx = -1;
      }
    }

    if (!wordObj) return;
    if (idx >= 0) zoomLastKnownIndex = idx;

    const st = getWordStatus(wordObj.id);

    const elWord = document.getElementById("vz-word");
    const elPos = document.getElementById("vz-pos");
    const elDef = document.getElementById("vz-def");
    const elSyns = document.getElementById("vz-syns");
    const elSynSec = document.getElementById("vz-syn-section");
    const elEx = document.getElementById("vz-example");
    const elExSec = document.getElementById("vz-ex-section");
    const elSpeak = document.getElementById("vz-speak-btn");
    const elLearn = document.getElementById("vz-learning-btn");
    const elMaster = document.getElementById("vz-mastered-btn");
    const elPrev = document.getElementById("vz-prev-btn");
    const elNext = document.getElementById("vz-next-btn");

    if (elWord) elWord.textContent = wordObj.word;
    if (elPos) elPos.textContent = wordObj.pos || "";
    if (elDef) elDef.textContent = wordObj.definition;

    const syns = (wordObj.synonyms || []).filter(Boolean);
    if (elSynSec) elSynSec.classList.toggle("hidden", syns.length === 0);
    if (elSyns) {
      elSyns.innerHTML = syns.map(s => `<span class="vocab-syn-tag">${escapeHtml(s)}</span>`).join("");
    }

    if (elExSec) elExSec.classList.toggle("hidden", !wordObj.example);
    if (elEx) {
      elEx.innerHTML = wordObj.example ? `“${highlightWordInExample(wordObj.example, wordObj.word)}”` : "";
    }

    if (elSpeak) {
      elSpeak.onclick = () => speakWord(wordObj.word);
    }

    if (elLearn) {
      elLearn.className = `vocab-st-btn ${st === "learning" ? "active-learning" : ""}`;
      elLearn.textContent = st === "learning" ? "● Learning" : "Mark Learning";
      elLearn.onclick = () => setWordStatus(wordObj.id, st === "learning" ? "new" : "learning");
    }

    if (elMaster) {
      elMaster.className = `vocab-st-btn ${st === "mastered" ? "active-mastered" : ""}`;
      elMaster.textContent = st === "mastered" ? "✓ Mastered" : "Mark Mastered";
      elMaster.onclick = () => setWordStatus(wordObj.id, st === "mastered" ? "new" : "mastered");
    }

    if (elPrev) {
      elPrev.disabled = idx <= 0;
      elPrev.onclick = () => {
        if (idx > 0) {
          zoomCurrentWordId = list[idx - 1].id;
          zoomLastKnownIndex = idx - 1;
          renderZoomModalContent();
        }
      };
    }

    if (elNext) {
      elNext.disabled = idx < 0 || idx >= list.length - 1;
      elNext.onclick = () => {
        if (idx >= 0 && idx < list.length - 1) {
          zoomCurrentWordId = list[idx + 1].id;
          zoomLastKnownIndex = idx + 1;
          renderZoomModalContent();
        }
      };
    }
  }

  /* ---------- Mode 2: 3D Flashcards ---------- */
  let fcDeck = [];
  let fcIndex = 0;
  let fcDeckFilter = "all";

  function buildFlashcardDeck(doShuffle = false) {
    const all = getAllWords();
    const prog = loadProgress();
    let pool = all.filter(w => {
      const st = getWordStatus(w.id, prog);
      if (fcDeckFilter === "unmastered") return st !== "mastered";
      if (fcDeckFilter === "learning") return st === "learning";
      return true;
    });
    if (!pool.length) pool = all;
    fcDeck = doShuffle ? shuffle(pool) : pool.slice();
    fcIndex = 0;
    renderFlashcard();
  }

  function renderFlashcard() {
    const card3d = document.getElementById("fc-card-3d");
    const elCounter = document.getElementById("fc-counter");
    const elWord = document.getElementById("fc-word");
    const elPos = document.getElementById("fc-pos");
    const elBackWord = document.getElementById("fc-back-word");
    const elDef = document.getElementById("fc-def");
    const elSyns = document.getElementById("fc-syns");
    const elEx = document.getElementById("fc-example");
    const elBadge = document.getElementById("fc-status-badge");
    const elPrev = document.getElementById("fc-prev-btn");
    const elNext = document.getElementById("fc-next-btn");

    if (!fcDeck.length) {
      if (elWord) elWord.textContent = "No words";
      if (elCounter) elCounter.textContent = "0 / 0";
      return;
    }

    if (fcIndex < 0) fcIndex = 0;
    if (fcIndex >= fcDeck.length) fcIndex = fcDeck.length - 1;

    const w = fcDeck[fcIndex];
    const st = getWordStatus(w.id);

    if (card3d) card3d.classList.remove("is-flipped");
    if (elCounter) elCounter.textContent = `${fcIndex + 1} / ${fcDeck.length}`;
    if (elWord) elWord.textContent = w.word;
    if (elPos) elPos.textContent = w.pos || "";
    if (elBackWord) elBackWord.textContent = `${w.word} (${w.pos || ""})`;
    if (elDef) elDef.textContent = w.definition;

    if (elSyns) {
      elSyns.innerHTML = (w.synonyms || [])
        .filter(Boolean)
        .map(s => `<span class="vocab-syn-tag">${escapeHtml(s)}</span>`)
        .join("");
    }

    if (elEx) {
      elEx.innerHTML = w.example ? `“${highlightWordInExample(w.example, w.word)}”` : "";
      elEx.classList.toggle("hidden", !w.example);
    }

    if (elBadge) {
      elBadge.className = `fc-status-badge st-${st}`;
      elBadge.textContent = st === "mastered" ? "✓ Mastered" : st === "learning" ? "● Learning" : "New";
    }

    if (elPrev) elPrev.disabled = fcIndex === 0;
    if (elNext) elNext.disabled = fcIndex >= fcDeck.length - 1;
  }

  /* ---------- Mode 3: Match Sprint ---------- */
  let matchTimerInterval = null;

  function stopMatchTimer() {
    if (matchTimerInterval) {
      clearInterval(matchTimerInterval);
      matchTimerInterval = null;
    }
  }

  function updateMatchBestUI() {
    const bestEl = document.getElementById("match-best");
    if (!bestEl) return;
    const saved = localStorage.getItem(MATCH_BEST_KEY);
    bestEl.textContent = saved ? `${Number(saved).toFixed(1)}s` : "—";
  }

  function showMatchStartScreen() {
    stopMatchTimer();
    updateMatchBestUI();
    document.getElementById("match-start-screen")?.classList.remove("hidden");
    document.getElementById("match-sub")?.classList.add("hidden");
    document.getElementById("match-board")?.classList.add("hidden");
    document.getElementById("match-win-banner")?.classList.add("hidden");
    document.getElementById("match-restart-btn")?.classList.add("hidden");
  }

  function startMatchRound() {
    stopMatchTimer();
    const all = getAllWords();
    const startScreen = document.getElementById("match-start-screen");
    const board = document.getElementById("match-board");
    const sub = document.getElementById("match-sub");
    const restartBtn = document.getElementById("match-restart-btn");
    const wordsCol = document.getElementById("match-words-col");
    const defsCol = document.getElementById("match-defs-col");
    const winBanner = document.getElementById("match-win-banner");
    const timerEl = document.getElementById("match-timer");
    const comboEl = document.getElementById("match-combo");

    if (!all.length || !wordsCol || !defsCol) return;

    if (startScreen) startScreen.classList.add("hidden");
    if (sub) sub.classList.remove("hidden");
    if (board) board.classList.remove("hidden");
    if (restartBtn) restartBtn.classList.remove("hidden");
    if (winBanner) winBanner.classList.add("hidden");

    const pairs = shuffle(all).slice(0, Math.min(6, all.length));
    const totalPairs = pairs.length;
    let selectedWordId = null;
    let selectedDefId = null;
    let matchedCount = 0;
    let combo = 0;
    const startTime = performance.now();

    if (comboEl) comboEl.textContent = "0";
    if (timerEl) timerEl.textContent = "0.0s";

    matchTimerInterval = setInterval(() => {
      if (timerEl) {
        timerEl.textContent = `${((performance.now() - startTime) / 1000).toFixed(1)}s`;
      }
    }, 100);

    wordsCol.innerHTML = shuffle(pairs)
      .map(item => `<button type="button" class="match-tile" data-match-word="${escapeHtml(item.id)}">${escapeHtml(item.word)}</button>`)
      .join("");

    defsCol.innerHTML = shuffle(pairs)
      .map(item => `<button type="button" class="match-tile" data-match-def="${escapeHtml(item.id)}">${escapeHtml(item.definition)}</button>`)
      .join("");

    function finishMatchIfDone() {
      if (matchedCount < totalPairs) return;
      stopMatchTimer();
      const elapsed = Number(((performance.now() - startTime) / 1000).toFixed(1));
      const prevBest = Number(localStorage.getItem(MATCH_BEST_KEY) || "0");
      if (!prevBest || elapsed < prevBest) {
        localStorage.setItem(MATCH_BEST_KEY, String(elapsed));
      }
      updateMatchBestUI();
      if (winBanner) {
        winBanner.classList.remove("hidden");
        winBanner.innerHTML = `<h3>Round Complete!</h3><p>Time: <strong>${elapsed.toFixed(1)}s</strong> · Best Combo: <strong>${combo}</strong></p>`;
      }
      renderDashboardVocabCard();
    }

    function checkMatchSelection() {
      if (!selectedWordId || !selectedDefId) return;
      const wBtn = wordsCol.querySelector(`[data-match-word="${CSS.escape(selectedWordId)}"]`);
      const dBtn = defsCol.querySelector(`[data-match-def="${CSS.escape(selectedDefId)}"]`);
      if (!wBtn || !dBtn) return;

      if (selectedWordId === selectedDefId) {
        wBtn.classList.remove("selected");
        dBtn.classList.remove("selected");
        wBtn.classList.add("matched");
        dBtn.classList.add("matched");
        wBtn.disabled = true;
        dBtn.disabled = true;
        matchedCount += 1;
        combo += 1;
        if (comboEl) comboEl.textContent = String(combo);
        selectedWordId = null;
        selectedDefId = null;
        finishMatchIfDone();
      } else {
        combo = 0;
        if (comboEl) comboEl.textContent = "0";
        wBtn.classList.add("wrong");
        dBtn.classList.add("wrong");
        setTimeout(() => {
          wBtn.classList.remove("wrong", "selected");
          dBtn.classList.remove("wrong", "selected");
        }, 320);
        selectedWordId = null;
        selectedDefId = null;
      }
    }

    wordsCol.querySelectorAll("[data-match-word]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        wordsCol.querySelectorAll("[data-match-word]").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedWordId = btn.dataset.matchWord;
        checkMatchSelection();
      });
    });

    defsCol.querySelectorAll("[data-match-def]").forEach(btn => {
      btn.addEventListener("click", () => {
        if (btn.disabled) return;
        defsCol.querySelectorAll("[data-match-def]").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        selectedDefId = btn.dataset.matchDef;
        checkMatchSelection();
      });
    });
  }

  /* ---------- Mode 4: Context Blitz ---------- */
  let blitzTimerInterval = null;

  function stopBlitzTimer() {
    if (blitzTimerInterval) {
      clearInterval(blitzTimerInterval);
      blitzTimerInterval = null;
    }
  }

  function updateBlitzBestUI() {
    const bestEl = document.getElementById("blitz-best");
    if (!bestEl) return;
    const saved = localStorage.getItem(BLITZ_BEST_KEY);
    bestEl.textContent = saved || "0";
  }

  function showBlitzStartScreen() {
    stopBlitzTimer();
    updateBlitzBestUI();
    document.getElementById("blitz-start-screen")?.classList.remove("hidden");
    document.getElementById("blitz-stage")?.classList.add("hidden");
    document.getElementById("blitz-gameover")?.classList.add("hidden");
    document.getElementById("blitz-restart-btn")?.classList.add("hidden");
  }

  function startBlitzGame() {
    stopBlitzTimer();
    const candidates = getAllWords().filter(w => w.example && String(w.example).trim().length > 10);
    const pool = candidates.length >= 4 ? candidates : getAllWords();
    if (!pool.length) return;

    document.getElementById("blitz-start-screen")?.classList.add("hidden");
    document.getElementById("blitz-gameover")?.classList.add("hidden");
    document.getElementById("blitz-stage")?.classList.remove("hidden");
    document.getElementById("blitz-restart-btn")?.classList.remove("hidden");

    let timeLeft = 60;
    let lives = 3;
    let score = 0;
    let streak = 0;
    let locked = false;

    const timerEl = document.getElementById("blitz-timer");
    const livesEl = document.getElementById("blitz-lives");
    const scoreEl = document.getElementById("blitz-score");
    const streakEl = document.getElementById("blitz-streak");
    const sentenceEl = document.getElementById("blitz-sentence");
    const optionsEl = document.getElementById("blitz-options");
    const feedbackEl = document.getElementById("blitz-feedback");
    const gameOverEl = document.getElementById("blitz-gameover");

    updateBlitzBestUI();

    function syncHud() {
      if (timerEl) timerEl.textContent = `${timeLeft}s`;
      if (livesEl) livesEl.textContent = String(lives);
      if (scoreEl) scoreEl.textContent = String(score);
      if (streakEl) streakEl.textContent = String(streak);
    }

    function endBlitz(reasonText) {
      stopBlitzTimer();
      locked = true;
      const prevBest = Number(localStorage.getItem(BLITZ_BEST_KEY) || "0");
      if (score > prevBest) {
        localStorage.setItem(BLITZ_BEST_KEY, String(score));
      }
      updateBlitzBestUI();
      document.getElementById("blitz-stage")?.classList.add("hidden");
      if (gameOverEl) {
        gameOverEl.classList.remove("hidden");
        gameOverEl.innerHTML = `<h3>${escapeHtml(reasonText)}</h3><p>Final Score: <strong>${score}</strong> · Best: <strong>${localStorage.getItem(BLITZ_BEST_KEY) || score}</strong></p>`;
      }
      renderDashboardVocabCard();
    }

    function nextQuestion() {
      locked = false;
      if (feedbackEl) {
        feedbackEl.classList.add("hidden");
        feedbackEl.textContent = "";
      }
      const target = shuffle(pool)[0];
      const distractors = shuffle(pool.filter(w => w.id !== target.id)).slice(0, 3);
      const choices = shuffle([target, ...distractors]);

      if (sentenceEl) {
        sentenceEl.innerHTML = blankWordInExample(target.example, target.word);
      }

      if (optionsEl) {
        optionsEl.innerHTML = choices
          .map(c => `<button type="button" class="blitz-opt-btn" data-blitz-ans="${escapeHtml(c.id)}">${escapeHtml(c.word)}</button>`)
          .join("");

        optionsEl.querySelectorAll("[data-blitz-ans]").forEach(btn => {
          btn.addEventListener("click", () => {
            if (locked) return;
            locked = true;
            const pickedId = btn.dataset.blitzAns;
            const isCorrect = pickedId === target.id;

            optionsEl.querySelectorAll("[data-blitz-ans]").forEach(b => {
              b.disabled = true;
              if (b.dataset.blitzAns === target.id) b.classList.add("correct");
            });

            if (isCorrect) {
              streak += 1;
              score += 10 + Math.min(streak * 2, 10);
              if (feedbackEl) {
                feedbackEl.className = "blitz-feedback ok";
                feedbackEl.textContent = `✓ ${target.word} — ${target.definition}`;
                feedbackEl.classList.remove("hidden");
              }
            } else {
              btn.classList.add("wrong");
              streak = 0;
              lives -= 1;
              if (feedbackEl) {
                feedbackEl.className = "blitz-feedback err";
                feedbackEl.textContent = `✕ Answer: ${target.word} — ${target.definition}`;
                feedbackEl.classList.remove("hidden");
              }
            }

            syncHud();

            if (lives <= 0) {
              setTimeout(() => endBlitz("Out of Lives!"), 650);
            } else {
              setTimeout(nextQuestion, 850);
            }
          });
        });
      }
    }

    syncHud();
    nextQuestion();

    blitzTimerInterval = setInterval(() => {
      timeLeft -= 1;
      syncHud();
      if (timeLeft <= 0) {
        endBlitz("Time's Up!");
      }
    }, 1000);
  }

  /* ---------- Load vocab.json ---------- */
  async function loadVocabBank() {
    try {
      const res = await fetch("vocab.json");
      if (!res.ok) throw new Error(`vocab.json HTTP ${res.status}`);
      const data = await res.json();
      const rawList = Array.isArray(data) ? data : (Array.isArray(data?.words) ? data.words : []);
      bankWords = rawList
        .filter(item => item && item.word && item.definition)
        .map((item, idx) => ({
          id: item.id || `v_${idx + 1}`,
          word: String(item.word).trim(),
          pos: String(item.pos || "").trim(),
          definition: String(item.definition).trim(),
          synonyms: Array.isArray(item.synonyms) ? item.synonyms.map(String).filter(Boolean) : [],
          example: String(item.example || "").trim()
        }));
      loadError = false;
    } catch (e) {
      console.warn("Could not load vocab.json:", e);
      loadError = true;
    } finally {
      isLoaded = true;
      renderVocabTab();
      window.dispatchEvent(new CustomEvent("sat:vocab-loaded"));
    }
  }

  /* ---------- Init Events ---------- */
  function initVocabEvents() {
    document.querySelectorAll("#vocab-mode-tabs .vocab-mode-btn").forEach(btn => {
      btn.addEventListener("click", () => switchVocabMode(btn.dataset.vmode || "bank"));
    });

    const searchInput = document.getElementById("vocab-search-input");
    const statusPills = document.querySelectorAll("#vocab-status-pills .mod-filter-btn");
    const addToggleBtn = document.getElementById("vocab-add-toggle-btn");
    const addForm = document.getElementById("vocab-add-form");
    const addCancelBtn = document.getElementById("vocab-add-cancel-btn");

    if (searchInput) {
      searchInput.addEventListener("input", () => {
        searchQuery = searchInput.value;
        renderVocabTab();
      });
    }

    statusPills.forEach(btn => {
      btn.addEventListener("click", () => {
        statusFilter = btn.dataset.vstatus || "all";
        statusPills.forEach(b => b.classList.toggle("active", b === btn));
        renderVocabTab();
      });
    });

    if (addToggleBtn && addForm) {
      addToggleBtn.addEventListener("click", () => {
        addForm.classList.toggle("hidden");
        if (!addForm.classList.contains("hidden")) {
          const inp = document.getElementById("vocab-new-word");
          if (inp) inp.focus();
        }
      });
    }

    if (addCancelBtn && addForm) {
      addCancelBtn.addEventListener("click", () => {
        addForm.classList.add("hidden");
        addForm.reset();
      });
    }

    if (addForm) {
      addForm.addEventListener("submit", e => {
        e.preventDefault();
        const word = (document.getElementById("vocab-new-word")?.value || "").trim();
        const pos = document.getElementById("vocab-new-pos")?.value || "adj.";
        const definition = (document.getElementById("vocab-new-def")?.value || "").trim();
        const synRaw = document.getElementById("vocab-new-syn")?.value || "";
        const example = (document.getElementById("vocab-new-ex")?.value || "").trim();

        if (!word || !definition) return;
        const synonyms = synRaw.split(",").map(s => s.trim()).filter(Boolean);

        const customList = loadCustomWords();
        customList.unshift({
          id: `custom_${Date.now()}`,
          word,
          pos,
          definition,
          synonyms,
          example
        });
        saveCustomWords(customList);
        addForm.reset();
        addForm.classList.add("hidden");
        renderVocabTab();
      });
    }

    const zoomModal = document.getElementById("vocab-zoom-modal");
    const zoomClose = document.getElementById("vz-close-btn");
    if (zoomClose) zoomClose.addEventListener("click", closeZoomModal);
    if (zoomModal) {
      zoomModal.addEventListener("click", e => {
        if (e.target === zoomModal) closeZoomModal();
      });
    }

    const card3d = document.getElementById("fc-card-3d");
    const fcSpeak = document.getElementById("fc-speak-btn");
    const fcPrev = document.getElementById("fc-prev-btn");
    const fcNext = document.getElementById("fc-next-btn");
    const fcLearn = document.getElementById("fc-learning-btn");
    const fcMaster = document.getElementById("fc-mastered-btn");
    const fcShuffle = document.getElementById("fc-shuffle-btn");

    if (card3d) {
      card3d.addEventListener("click", () => card3d.classList.toggle("is-flipped"));
    }
    if (fcSpeak) {
      fcSpeak.addEventListener("click", e => {
        e.stopPropagation();
        if (fcDeck[fcIndex]) speakWord(fcDeck[fcIndex].word);
      });
    }
    if (fcPrev) {
      fcPrev.addEventListener("click", () => {
        if (fcIndex > 0) {
          fcIndex -= 1;
          renderFlashcard();
        }
      });
    }
    if (fcNext) {
      fcNext.addEventListener("click", () => {
        if (fcIndex < fcDeck.length - 1) {
          fcIndex += 1;
          renderFlashcard();
        }
      });
    }
    if (fcLearn) {
      fcLearn.addEventListener("click", () => {
        if (!fcDeck[fcIndex]) return;
        setWordStatus(fcDeck[fcIndex].id, "learning");
        if (fcIndex < fcDeck.length - 1) fcIndex += 1;
        renderFlashcard();
      });
    }
    if (fcMaster) {
      fcMaster.addEventListener("click", () => {
        if (!fcDeck[fcIndex]) return;
        setWordStatus(fcDeck[fcIndex].id, "mastered");
        if (fcIndex < fcDeck.length - 1) fcIndex += 1;
        renderFlashcard();
      });
    }
    if (fcShuffle) {
      fcShuffle.addEventListener("click", () => buildFlashcardDeck(true));
    }

    document.querySelectorAll("#fc-deck-pills .mod-filter-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        fcDeckFilter = btn.dataset.fcDeck || "all";
        document.querySelectorAll("#fc-deck-pills .mod-filter-btn").forEach(b => b.classList.toggle("active", b === btn));
        buildFlashcardDeck(false);
      });
    });

    const matchStartBtn = document.getElementById("match-start-btn");
    if (matchStartBtn) matchStartBtn.addEventListener("click", startMatchRound);

    const matchRestart = document.getElementById("match-restart-btn");
    if (matchRestart) matchRestart.addEventListener("click", startMatchRound);

    const blitzStartBtn = document.getElementById("blitz-start-btn");
    if (blitzStartBtn) blitzStartBtn.addEventListener("click", startBlitzGame);

    const blitzRestart = document.getElementById("blitz-restart-btn");
    if (blitzRestart) blitzRestart.addEventListener("click", startBlitzGame);

    document.addEventListener("keydown", e => {
      if (zoomModalOpen) {
        if (e.key === "Escape") closeZoomModal();
        if (e.key === "ArrowLeft") document.getElementById("vz-prev-btn")?.click();
        if (e.key === "ArrowRight") document.getElementById("vz-next-btn")?.click();
        return;
      }

      const vocabTab = document.getElementById("tab-vocab");
      if (!vocabTab || vocabTab.classList.contains("hidden")) return;
      if (activeMode !== "flashcards") return;
      if (e.target && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;

      if (e.code === "Space") {
        e.preventDefault();
        card3d?.classList.toggle("is-flipped");
      } else if (e.key === "ArrowRight") {
        fcNext?.click();
      } else if (e.key === "ArrowLeft") {
        fcPrev?.click();
      }
    });

    renderVocabTab();
    loadVocabBank();
  }

  window.VocabStore = {
    getAllWords,
    getProgress: loadProgress,
    getWordStatus,
    setWordStatus,
    speakWord,
    refresh: renderVocabTab
  };

  window.addEventListener("DOMContentLoaded", initVocabEvents);
})();
