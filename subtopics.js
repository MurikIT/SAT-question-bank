/* ==========================================================================
   SAT Question Bank — Subtopics / Skills Filter Add-on (subtopics.js)
   Подключается в index.html ПОСЛЕ script.js и dashboard.js:
     <script src="subtopics.js"></script>
   ========================================================================== */

(function () {
  window.activeSkillFilter = "all";

  function getQuestionSkill(q) {
    if (!q) return "General";
    const sec = typeof getSectionFromQuestion === "function"
      ? getSectionFromQuestion(q)
      : (q.section === "Math" ? "Math" : "RW");

    // 1. Math: официальные 19 подтипов уже есть в поле topic (questions_math.json)
    if (sec === "Math") {
      const mathTopic = String(q.topic || q.skill_desc || q.skill || "").trim();
      return mathTopic || "General Math";
    }

    // 2. Reading & Writing: если в JSON появится явное поле, используем его
    const explicit = String(q.skill_desc || q.skill || q.subtopic || "").trim();
    if (explicit) return explicit;

    // Автоопределение официальных подтипов Digital SAT R&W
    const dom = typeof getDomainCode === "function"
      ? getDomainCode(q)
      : String(q.domain || "INI").trim().toUpperCase();
    const prompt = String(q.question || q.prompt || "").toLowerCase();
    const passage = String(q.passageHtml || q.passage || q.stimulus || "");
    const exp = String(q.explanation || "").toLowerCase();

    if (dom === "CAS") {
      if (typeof isVocabQuestion === "function" && isVocabQuestion(q)) {
        return "Words in Context";
      }
      if (
        /most logical and precise word|most nearly means|closest in meaning|best completes the text with the most logical/i.test(prompt)
      ) {
        return "Words in Context";
      }
      if (
        (/\bText\s*1\b/i.test(passage) && /\bText\s*2\b/i.test(passage)) ||
        /\btext\s*1\b|\btext\s*2\b|both texts/i.test(prompt)
      ) {
        return "Cross-Text Connections";
      }
      return "Text Structure and Purpose";
    }

    if (dom === "INI") {
      if (/most logically completes the text/i.test(prompt)) {
        return "Inferences";
      }
      if (
        /illustrates the|support(?:s|ing)? the|weaken(?:s|ing)?|undermine(?:s|ing)?|challenge(?:s|ing)?|directly supports|uses data from|describes data from|quotation from/i.test(prompt) ||
        /<(?:table|svg|img)\b/i.test(passage)
      ) {
        return "Command of Evidence";
      }
      return "Central Ideas and Details";
    }

    if (dom === "EOI") {
      if (/most logical transition/i.test(prompt)) {
        return "Transitions";
      }
      return "Rhetorical Synthesis";
    }

    if (dom === "SEC") {
      if (
        /punctuation|boundar(?:y|ies)|independent clause|subordinat|comma|semicolon|colon|dash|period|supplement|nonessential|splice|fragment/i.test(exp)
      ) {
        return "Boundaries";
      }
      return "Form, Structure, and Sense";
    }

    return "General";
  }

  function getSkillsForDomain(section, domain) {
    if (!domain || domain === "all" || typeof allQuestions === "undefined") return [];
    const counts = {};
    allQuestions.forEach(q => {
      if (getSectionFromQuestion(q) !== section) return;
      if (getDomainCode(q) !== domain) return;
      const skill = getQuestionSkill(q);
      counts[skill] = (counts[skill] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  window.getQuestionSkill = getQuestionSkill;
  window.getSkillsForDomain = getSkillsForDomain;

  function patchQuestionBankSubtopics() {
    if (typeof window.openSectionSetup !== "function") return;
    if (window.__satSubtopicsPatched) return;
    window.__satSubtopicsPatched = true;

    // 1. Расширяем countMatchingPool учётом выбранного подтипа
    window.countMatchingPool = function (section, domain, difficulty, skill) {
      const targetSkill = skill !== undefined ? skill : window.activeSkillFilter;
      const effectiveSkill = !domain || domain === "all" ? "all" : targetSkill;

      return allQuestions.filter(q => {
        const qSec = getSectionFromQuestion(q);
        if (section && qSec !== section) return false;
        if (domain && domain !== "all" && getDomainCode(q) !== domain) return false;
        if (effectiveSkill && effectiveSkill !== "all" && getQuestionSkill(q) !== effectiveSkill) {
          return false;
        }
        if (difficulty && difficulty !== "all") {
          const qDiff = String(q.difficulty || "").trim().toLowerCase();
          if (qDiff !== difficulty.toLowerCase()) return false;
        }
        return true;
      }).length;
    };

    // 2. Расширяем buildRandomizedSession учётом выбранного подтипа
    window.buildRandomizedSession = function (section, domain, difficulty, rawCount, skill) {
      const targetSkill = skill !== undefined ? skill : window.activeSkillFilter;
      const effectiveSkill = !domain || domain === "all" ? "all" : targetSkill;

      const pool = allQuestions.filter(q => {
        const qSec = getSectionFromQuestion(q);
        if (section && qSec !== section) return false;
        if (domain && domain !== "all" && getDomainCode(q) !== domain) return false;
        if (effectiveSkill && effectiveSkill !== "all" && getQuestionSkill(q) !== effectiveSkill) {
          return false;
        }
        if (difficulty && difficulty !== "all") {
          const qDiff = String(q.difficulty || "").trim().toLowerCase();
          if (qDiff !== difficulty.toLowerCase()) return false;
        }
        return true;
      });

      const shuffled = typeof shuffleArray === "function" ? shuffleArray(pool) : pool.slice();
      if (rawCount === "all") return shuffled;
      const limit = Number(rawCount);
      if (!Number.isFinite(limit) || limit <= 0) return shuffled;
      return shuffled.slice(0, Math.min(limit, shuffled.length));
    };

    // 3. Оборачиваем openSectionSetup: добавляем поле Subtopic / Skill и поддержку preselectedDomain
    const origOpenSectionSetup = window.openSectionSetup;
    window.openSectionSetup = function (section, preselectedDomain = null) {
      window.activeSkillFilter = "all";
      origOpenSectionSetup(section);

      const setupDomainEl = document.getElementById("setup-domain-select");
      const setupPoolInfoEl = document.getElementById("setup-pool-info");
      const setupStartBtn = document.getElementById("setup-start-btn");
      if (!setupDomainEl) return;

      if (preselectedDomain) {
        activeDomainFilter = preselectedDomain;
        setupDomainEl.value = preselectedDomain;
        if (typeof domainSelect !== "undefined" && domainSelect) {
          domainSelect.value = preselectedDomain;
        }
      }

      // Вставляем поле выбора подтипа сразу после Topic / Domain
      let skillField = document.getElementById("setup-skill-field");
      if (!skillField) {
        skillField = document.createElement("div");
        skillField.className = "setup-field";
        skillField.id = "setup-skill-field";
        skillField.innerHTML = `
          <label for="setup-skill-select" class="setup-label">Subtopic / Skill</label>
          <select id="setup-skill-select" class="setup-select"></select>
        `;
        const domainField = setupDomainEl.closest(".setup-field");
        if (domainField) {
          domainField.insertAdjacentElement("afterend", skillField);
        }
      }

      const setupSkillEl = document.getElementById("setup-skill-select");

      const updateSummary = () => {
        const avail = window.countMatchingPool(
          activeSection,
          activeDomainFilter,
          activeDifficultyFilter,
          window.activeSkillFilter
        );
        const chosen =
          activeCountFilter === "all"
            ? avail
            : Math.min(Number(activeCountFilter) || avail, avail);
        if (setupPoolInfoEl) {
          setupPoolInfoEl.innerHTML = `Matching bank: <strong>${avail}</strong> · Session size: <strong>${chosen}</strong>`;
        }
        if (setupStartBtn) {
          setupStartBtn.disabled = avail === 0;
        }
      };

      const populateSetupSkills = () => {
        if (!setupSkillEl) return;
        if (activeDomainFilter === "all") {
          window.activeSkillFilter = "all";
          setupSkillEl.disabled = true;
          setupSkillEl.innerHTML = `<option value="all">Select a topic first</option>`;
          return;
        }

        const skills = getSkillsForDomain(activeSection, activeDomainFilter);
        setupSkillEl.disabled = skills.length === 0;
        setupSkillEl.innerHTML =
          `<option value="all">All Subtopics</option>` +
          skills
            .map(
              s =>
                `<option value="${s.name.replace(/"/g, "&quot;")}" ${
                  window.activeSkillFilter === s.name ? "selected" : ""
                }>${s.name} (${s.count})</option>`
            )
            .join("");
      };

      populateSetupSkills();
      updateSummary();

      setupDomainEl.onchange = () => {
        activeDomainFilter = setupDomainEl.value;
        window.activeSkillFilter = "all";
        if (typeof domainSelect !== "undefined" && domainSelect) {
          domainSelect.value = activeDomainFilter;
        }
        populateSetupSkills();
        updateSummary();
      };

      if (setupSkillEl) {
        setupSkillEl.onchange = () => {
          window.activeSkillFilter = setupSkillEl.value;
          updateSummary();
        };
      }
    };

    // 4. Отображаем выбранный подтип в заголовке экрана Summary
    if (typeof window.showSessionSummary === "function") {
      const origShowSessionSummary = window.showSessionSummary;
      window.showSessionSummary = function () {
        origShowSessionSummary();
        if (
          !activeModuleRun &&
          activeDomainFilter &&
          activeDomainFilter !== "all" &&
          window.activeSkillFilter &&
          window.activeSkillFilter !== "all" &&
          typeof summarySubtitleEl !== "undefined" &&
          summarySubtitleEl
        ) {
          const secName = activeSection === "Math" ? "Math" : "Reading & Writing";
          const domName = getDomainLabel(activeDomainFilter);
          summarySubtitleEl.textContent = `${secName} · ${domName} · ${window.activeSkillFilter} · ${filteredQuestions.length} questions`;
        }
      };
    }

    // 5. Клик по карточке домена в Question Bank (Craft and Structure и др.) открывает выбор подтипа
    document.addEventListener(
      "click",
      e => {
        const cardBtn = e.target.closest(".topic-mini-card");
        if (!cardBtn || cardBtn.disabled) return;
        const sec = cardBtn.dataset.topicSec;
        const code = cardBtn.dataset.topicCode;
        if (!sec || !code) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        window.openSectionSetup(sec, code);
      },
      true
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", patchQuestionBankSubtopics);
  } else {
    patchQuestionBankSubtopics();
  }
})();
