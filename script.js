let allQuestions = [];
let filteredQuestions = [];
let currentIndex = 0;

const sessionState = {};
let isPostTestReview = false;
let summaryReviewFilter = "all";
let activeModuleRun = null;
let lastAdaptiveConfig = null;

let activeSection = "RW";
let activeDomainFilter = "all";
let activeDifficultyFilter = "all";
let activeCountFilter = "all";
let activeTimerSetting = "off";

let timerInterval = null;
let remainingSeconds = 0;
let isTimerPaused = false;
let currentTimerMode = "none";

const HISTORY_STORAGE_KEY = "sat_question_bank_history_v1";

const DOMAIN_META = {
  INI: { label: "Information and Ideas", section: "RW" },
  CAS: { label: "Craft and Structure", section: "RW" },
  EOI: { label: "Expression of Ideas", section: "RW" },
  SEC: { label: "Standard English Conventions", section: "RW" },
  ALG: { label: "Algebra", section: "Math" },
  ADV: { label: "Advanced Math", section: "Math" },
  PSD: { label: "Problem-Solving and Data Analysis", section: "Math" },
  GEO: { label: "Geometry and Trigonometry", section: "Math" }
};

/* Официальная инструкция Bluebook слева для открытых вопросов (Student-Produced Response) */
const SPR_DIRECTIONS_HTML = `
  <div class="spr-directions">
    <h3 class="spr-title">Student-produced response directions</h3>
    <ul class="spr-list">
      <li>If you find <strong>more than one correct answer</strong>, enter only one answer.</li>
      <li>You can enter up to 5 characters for a <strong>positive</strong> answer and up to 6 characters (including the negative sign) for a <strong>negative</strong> answer.</li>
      <li>If your answer is a <strong>fraction</strong> that doesn’t fit in the provided space, enter the decimal equivalent.</li>
      <li>If your answer is a <strong>decimal</strong> that doesn’t fit in the provided space, round it to 4 decimal places.</li>
      <li>If your answer is a <strong>mixed number</strong> (such as $3\\frac{1}{2}$), enter it as an improper fraction ($7/2$) or its decimal equivalent ($3.5$).</li>
      <li>Don’t enter <strong>symbols</strong> such as a percent sign, comma, or dollar sign.</li>
    </ul>
    <div class="spr-examples-title">Examples</div>
    <table class="spr-table">
      <thead>
        <tr>
          <th>Answer</th>
          <th>Acceptable ways to enter answer</th>
          <th>Unacceptable: will NOT receive credit</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>$3.5$</td>
          <td><code>3.5</code><br><code>3.50</code><br><code>7/2</code></td>
          <td><code>31/2</code><br><code>3 1/2</code></td>
        </tr>
        <tr>
          <td>$\\frac{2}{3}$</td>
          <td><code>2/3</code><br><code>.6666</code><br><code>.6667</code><br><code>0.666</code><br><code>0.667</code></td>
          <td><code>0.66</code><br><code>.66</code><br><code>0.67</code><br><code>.67</code></td>
        </tr>
        <tr>
          <td>$-\\frac{1}{3}$</td>
          <td><code>-1/3</code><br><code>-.3333</code><br><code>-0.333</code></td>
          <td><code>-.33</code><br><code>-0.33</code></td>
        </tr>
      </tbody>
    </table>
  </div>
`;

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
const controlsBar = document.querySelector(".controls-bar");
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

const moduleTransitionModal = document.getElementById("module-transition-modal");
const modTransPill = document.getElementById("mod-trans-pill");
const modTransTitle = document.getElementById("mod-trans-title");
const modTransDesc = document.getElementById("mod-trans-desc");
const modTransStats = document.getElementById("mod-trans-stats");
const startModule2Btn = document.getElementById("start-module2-btn");
const adaptiveScoreBanner = document.getElementById("adaptive-score-banner");

/* ---------- Конвертер мыльных картинок-формул College Board в четкий LaTeX (KaTeX) ---------- */

function spokenAltToLatex(altText) {
  if (!altText) return "";
  let s = String(altText)
    .replace(/\r\n/g, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/&ndash;|&#8211;/gi, "-")
    .replace(/&mdash;|&#8212;/gi, "-")
    .replace(/&minus;|&#8722;/gi, "-")
    .replace(/<\/?[a-z][^>]*>/gi, " ")
    .trim();

  s = s.replace(
    /^(?:the\s+)?(?:system\s+of\s+equations|system\s+of\s+inequalities|expression|equation|inequality|function|polynomial|value|number)\s*,?\s*/i,
    ""
  ).trim();

  if (s.includes("\n")) {
    const lines = s
      .split(/\n+(?:\s*and\b\s*,?\s*\n*)?/i)
      .map(ln => ln.trim().replace(/^,+|,+$/g, "").trim())
      .filter(Boolean);
    if (lines.length > 1) {
      const parts = lines.map(p => spokenAltToLatex(p));
      if (parts.every(Boolean)) {
        return parts.join(" \\\\ ");
      }
    }
  }

  if (/equals[\s\S]+?\b(?:,?\s*and|;)\s+[\s\S]+?equals/i.test(s)) {
    const eqParts = s
      .split(/\b(?:,?\s*and|;)\s+(?=[^=]+?\bequals\b)/i)
      .map(p => p.trim().replace(/^,+|,+$/g, "").trim())
      .filter(Boolean);
    if (eqParts.length > 1) {
      const parts = eqParts.map(p => spokenAltToLatex(p));
      if (parts.every(Boolean)) {
        return parts.join(" \\\\ ");
      }
    }
  }

  s = s.replace(/(\d),(\d{3})\b/g, "$1__THOUSAND__$2");
  s = s.replace(/,/g, " ");
  s = s.replace(/__THOUSAND__/g, ",");

  s = s.replace(/(\d+)\s+point\s+(\d+)/gi, "$1.$2");

  s = s.replace(
    /^(?:the\s+)?ordered\s+pair\s+([\s\S]+?)\s+\bcomma\b\s+([\s\S]+?)$/i,
    "left parenthesis $1 comma $2 right parenthesis"
  );
  s = s.replace(
    /\b(?:the\s+)?ordered\s+pair\s+([a-zA-Z0-9.+-]+)\s+\bcomma\b\s+([a-zA-Z0-9.+-]+)\b/gi,
    "($1, $2)"
  );

  s = s.replace(
    /\b(?:the\s+)?absolute\s+value\s+of\s+([\s\S]+?)\s+end\s+absolute\s+value\b/gi,
    "|$1|"
  );
  s = s.replace(
    /\b(?:the\s+)?absolute\s+value\s+of\s+([a-zA-Z0-9.+-]+(?:\s+(?:plus|minus)\s+[a-zA-Z0-9.+-]+)?)\b/gi,
    "|$1|"
  );

  const ordinals = {
    second: "2", third: "3", fourth: "4", fifth: "5",
    sixth: "6", seventh: "7", eighth: "8", ninth: "9", tenth: "10"
  };

  for (const [word, num] of Object.entries(ordinals)) {
    const rootRe = new RegExp(`\\b(?:the\\s+)?${word}\\s+root\\s+of\\b`, "gi");
    s = s.replace(rootRe, `StartNthRoot ${num} Of `);
    const powRe = new RegExp(`\\b(?:raised\\s+)?to\\s+the\\s+${word}\\s+power\\b`, "gi");
    s = s.replace(powRe, `^{${num}}`);
    const expRe = new RegExp(`\\b(?:with\\s+)?an?\\s+exponent\\s+of\\s+${word}\\b`, "gi");
    s = s.replace(expRe, `^{${num}}`);
  }

  s = s.replace(/\b(?:the\s+)?square\s+root\s+of\b/gi, "StartRoot ");
  s = s.replace(/\b(?:the\s+)?cube\s+root\s+of\b/gi, "StartNthRoot 3 Of ");
  s = s.replace(/\b(?:the\s+)?radical\b/gi, "StartRoot ");
  s = s.replace(/\bend\s+root\b|\bend\s+radical\b/gi, " EndRoot ");

  s = s.replace(/\b(?:the\s+)?fraction\s+with\s+numerator\b/gi, "StartFraction ");
  s = s.replace(/\band\s+denominator\b/gi, " Over ");
  s = s.replace(/\bend\s+fraction\b/gi, " EndFraction ");

  s = s.replace(
    /\b(?:raised\s+)?to\s+the\s+fraction\s+([a-zA-Z0-9.+-]+)\s+over\s+([a-zA-Z0-9.+-]+)\s+power\b/gi,
    "^{\\frac{$1}{$2}}"
  );
  s = s.replace(
    /\b(?:raised\s+)?to\s+the\s+([a-zA-Z0-9.+-]+)\s+over\s+([a-zA-Z0-9.+-]+)\s+power\b/gi,
    "^{\\frac{$1}{$2}}"
  );

  s = s.replace(/\b(?:the\s+)?fraction\s+([a-zA-Z0-9.+-]+)\s+over\s+([a-zA-Z0-9.+-]+)\b/gi, "\\frac{$1}{$2}");

  s = s.replace(/\b(?:raised\s+)?to\s+the\s+([a-zA-Z0-9.+-]+)\s+power\b/gi, "^{$1}");
  s = s.replace(/\b(?:raised\s+)?to\s+the\s+power\s+of\s+([a-zA-Z0-9.+-]+)\b/gi, "^{$1}");

  s = s.replace(/\b(?:open|left)\s+parenthesis\b|\b(?:the\s+)?quantity\b/gi, "(");
  s = s.replace(/\b(?:close|right)\s+parenthesis\b|\bend\s+quantity\b/gi, ")");
  s = s.replace(/\b(?:open|left)\s+bracket\b/gi, "[");
  s = s.replace(/\b(?:close|right)\s+bracket\b/gi, "]");
  s = s.replace(/\bstart\s+absolute\s+value\b|\bleft\s+vertical\s+bar\b/gi, "|");
  s = s.replace(/\bend\s+absolute\s+value\b|\bright\s+vertical\s+bar\b/gi, "|");

  s = s.replace(/\bsquared\b/gi, "^2");
  s = s.replace(/\bcubed\b/gi, "^3");
  s = s.replace(/\bsuperscript\s+([a-zA-Z0-9.+-]+)\s+baseline\b/gi, "^{$1}");
  s = s.replace(/\bsubscript\s+([a-zA-Z0-9.+-]+)\s+baseline\b/gi, "_{$1}");
  s = s.replace(/\bsub\s+([a-zA-Z0-9]+)\b/gi, "_{$1}");

  s = s.replace(/\bis\s+greater\s+than\s+or\s+equal\s+to\b|\bgreater\s+than\s+or\s+equal\s+to\b/gi, "\\ge ");
  s = s.replace(/\bis\s+less\s+than\s+or\s+equal\s+to\b|\bless\s+than\s+or\s+equal\s+to\b/gi, "\\le ");
  s = s.replace(/\bis\s+not\s+equal\s+to\b|\bnot\s+equal\s+to\b/gi, "\\ne ");
  s = s.replace(/\bis\s+approximately\s+equal\s+to\b|\bapproximately\s+equal\s+to\b/gi, "\\approx ");
  s = s.replace(/\bis\s+congruent\s+to\b|\bcongruent\s+to\b/gi, "\\cong ");
  s = s.replace(/\bis\s+similar\s+to\b|\bsimilar\s+to\b/gi, "\\sim ");
  s = s.replace(/\bis\s+parallel\s+to\b|\bparallel\s+to\b/gi, "\\parallel ");
  s = s.replace(/\bis\s+perpendicular\s+to\b|\bperpendicular\s+to\b/gi, "\\perp ");
  s = s.replace(/\bis\s+greater\s+than\b|\bgreater\s+than\b/gi, ">");
  s = s.replace(/\bis\s+less\s+than\b|\bless\s+than\b/gi, "<");
  s = s.replace(/\bequals\b|\bis\s+equal\s+to\b/gi, "=");
  s = s.replace(/\bplus\s+or\s+minus\b/gi, "\\pm ");
  s = s.replace(/\bplus\b/gi, "+");
  s = s.replace(/\bminus\b/gi, "-");
  s = s.replace(/\bnegative\s+/gi, "-");
  s = s.replace(/\bpositive\s+/gi, "+");
  s = s.replace(/\btimes\b|\bmultiplied\s+by\b/gi, "\\cdot ");
  s = s.replace(/\bdivided\s+by\b/gi, "\\div ");
  s = s.replace(/\bdollar\s+sign\b/gi, "\\$");
  s = s.replace(/\bpercent\b/gi, "\\%");
  s = s.replace(/\bcomma\b/gi, ", ");

  for (let iter = 0; iter < 8; iter++) {
    const prev = s;
    s = s.replace(
      /StartNthRoot\s+(\d+)\s+Of\s+((?:(?!StartNthRoot|StartRoot|StartFraction|EndRoot).)*?)\s*EndRoot/gi,
      "\\sqrt[$1]{$2}"
    );
    s = s.replace(
      /StartRoot\s+((?:(?!StartNthRoot|StartRoot|StartFraction|EndRoot).)*?)\s*EndRoot/gi,
      "\\sqrt{$1}"
    );
    s = s.replace(
      /StartFraction\s+((?:(?!StartFraction|EndFraction).)*?)\s+Over\s+((?:(?!StartFraction|EndFraction).)*?)\s*EndFraction/gi,
      "\\frac{$1}{$2}"
    );
    if (s === prev) break;
  }

  s = s.replace(
    /StartFraction\s+([^=<>]+?)\s+Over\s+([^=<>]+?)(?=\s*(?:[=<>]|$))/gi,
    "\\frac{$1}{$2}"
  );

  s = s.replace(/StartNthRoot\s+(\d+)\s+Of\s*\(([^)]+)\)/gi, "\\sqrt[$1]{$2}");
  s = s.replace(/StartRoot\s*\(([^)]+)\)/gi, "\\sqrt{$1}");
  s = s.replace(/StartNthRoot\s+(\d+)\s+Of\s+([a-zA-Z0-9.^{}+-]+)/gi, "\\sqrt[$1]{$2}");
  s = s.replace(/StartRoot\s+([a-zA-Z0-9.^{}+-]+)/gi, "\\sqrt{$1}");

  s = s.replace(/\bdegrees?\b/gi, "^\\circ");
  s = s.replace(/\bpi\b/gi, "\\pi ");
  s = s.replace(/\bsine\b/gi, "\\sin ");
  s = s.replace(/\bcosine\b/gi, "\\cos ");
  s = s.replace(/\btangent\b/gi, "\\tan ");
  s = s.replace(/\bangle\s+([A-Z]{1,3})\b/g, "\\angle $1");
  s = s.replace(/\btriangle\s+([A-Z]{1,3})\b/g, "\\triangle $1");
  s = s.replace(/\b(?:line\s+segment|segment)\s+([A-Z]{2})\b/gi, "\\overline{$1}");
  s = s.replace(/\bline\s+([A-Z]{2})\b/gi, "\\overleftrightarrow{$1}");
  s = s.replace(/\barc\s+([A-Z]{2,3})\b/gi, "\\widehat{$1}");

  s = s.replace(/\b([a-zA-Z])\s+of\s+\(([^)]+)\)/g, "$1($2)");
  s = s.replace(/\b([a-zA-Z])\s+of\s+(-?[a-zA-Z0-9.]+(?:\s*[+-]\s*[a-zA-Z0-9.]+)?)/g, "$1($2)");

  if (/\bover\b/i.test(s) && !s.includes("\\frac")) {
    const eqSides = s.split("=");
    const convertSideOver = side => {
      if (/\bover\b/i.test(side)) {
        const mSimple = side.trim().match(/^([^+=-]+?)\s+over\s+([^=]+?)$/i);
        if (mSimple) {
          return `\\frac{${mSimple[1].trim()}}{${mSimple[2].trim()}}`;
        }
        return side.replace(/([a-zA-Z0-9.()+^-]+)\s+over\s+([a-zA-Z0-9.()+^-]+)/gi, "\\frac{$1}{$2}");
      }
      return side;
    };
    s = eqSides.map(convertSideOver).join(" = ");
  }

  s = s.replace(/(\d)\s+([a-zA-Z])\b/g, "$1$2");
  s = s.replace(/\b([a-zA-Z])\s+\^/g, "$1^");
  s = s.replace(/\)\s+\^/g, ")^");
  s = s.replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");
  s = s.replace(/\s*,\s*/g, ", ");
  s = s.replace(/\s+/g, " ").trim();

  const strippedCommands = s.replace(/\\[a-zA-Z]+/g, " ");
  if (/\b(?:[a-zA-Z]{3,}|of|to|in|is|or|by|at|on|as|an|if|be)\b/i.test(strippedCommands)) {
    return "";
  }

  return s;
}

/* Удаление скрытых голосовых описаний графиков для скринридеров и артефакта ______blank */
function stripScreenReaderGraphDescriptions(html) {
  if (!html || typeof html !== "string") return "";
  let out = html;

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${out}</div>`, "text/html");
    const root = doc.body.firstElementChild;

    if (root) {
      // 1. Удаляем все скрытые элементы скринридеров (включая <span class="sr-only">blank</span>)
      root
        .querySelectorAll(
          ".sr-only, .visually-hidden, .screen-reader-only, .assistive-text, [class*='sr-only'], [class*='visually-hidden'], [class*='screen-reader'], [class*='longdesc']"
        )
        .forEach(el => el.remove());

      // 2. Удаляем списки <ul>/<ol> (в том числе вложенные), описывающие графики/диаграммы словами
      const srListPattern =
        /For each data category|following \d*\s*(?:bars|lines|curves|points|data|categories) are shown|data for the \d+ categories are as follows|For the (?:first|second|third) (?:line|curve|parabola|function)|(?:slants|falls|rises|increases|decreases)\s+(?:gradually|sharply|steeply|slightly)|remains\s+(?:level|constant|steady)\s+to|passes through the following points|\(\s*-?\d+\s+comma\s+-?\d+\s*\)|The x-axis ranges from|The y-axis ranges from|The horizontal axis is labeled|The vertical axis is labeled|begins at (?:the point|\d+)|shaded region|line:\s*begins at/i;

      root.querySelectorAll("ul, ol").forEach(listEl => {
        if (srListPattern.test(listEl.textContent || "")) {
          listEl.remove();
        }
      });

      // Также удаляем отдельные абзацы-заголовки описаний графиков для скринридеров
      const srParaPattern =
        /^(?:The following \d+ (?:lines|bars|curves|data sets) are shown|The graph (?:shows|displays)|The (?:horizontal|vertical|x-|y-)axis (?:is labeled|ranges from)):/i;
      root.querySelectorAll("p, div").forEach(el => {
        if (el.children.length === 0 && srParaPattern.test((el.textContent || "").trim())) {
          el.remove();
        }
      });

      out = root.innerHTML;
    }
  } catch (e) {}

  // 3. Убираем слово "blank" сразу после подчёркиваний (даже если между ними есть HTML-теги или пробелы)
  out = out.replace(/([_\u2014\u2013\u2500]{2,})(?:\s|&nbsp;|<[^>]+>)*blank\b/gi, "$1");

  // 4. Если где-то в обычном тексте осталось "(0 comma 5)" или "(x comma y)", превращаем в нормальные координаты
  out = out.replace(/\(\s*([a-zA-Z0-9.+-]+)\s+comma\s+([a-zA-Z0-9.+-]+)\s*\)/gi, "($1, $2)");

  return out;
}

function mathmlNodeToLatex(node) {
  if (!node) return "";
  if (node.nodeType === 3) {
    return node.nodeValue || "";
  }
  if (node.nodeType !== 1) return "";

  const tag = node.tagName.toLowerCase().replace(/^m:/, "");
  const children = Array.from(node.childNodes);
  const childrenLatex = () => children.map(mathmlNodeToLatex).join("");

  switch (tag) {
    case "math":
    case "mrow":
    case "mstyle":
    case "mpadded":
      return childrenLatex();
    case "mtable": {
      const rows = Array.from(node.children)
        .map(mathmlNodeToLatex)
        .map(r => r.trim())
        .filter(Boolean);
      return rows.join(" \\\\ ");
    }
    case "mtr": {
      const cells = Array.from(node.children)
        .map(mathmlNodeToLatex)
        .map(c => c.trim())
        .filter(Boolean);
      return cells.join(" ");
    }
    case "mtd":
      return childrenLatex();
    case "mi":
    case "mn":
      return (node.textContent || "").trim();
    case "mtext": {
      const rawT = (node.textContent || "").replace(/\s+/g, " ");
      const t = rawT.trim();
      return t ? ` \\text{ ${t} } ` : " ";
    }
    case "mo": {
      const op = (node.textContent || "").trim();
      if (op === "−" || op === "–") return "-";
      if (op === "×") return "\\times ";
      if (op === "÷") return "\\div ";
      if (op === "⋅" || op === "·") return "\\cdot ";
      if (op === "≤") return "\\le ";
      if (op === "≥") return "\\ge ";
      if (op === "≠") return "\\ne ";
      if (op === "±") return "\\pm ";
      if (op === "≈") return "\\approx ";
      if (op === "°") return "^\\circ ";
      return op;
    }
    case "mfenced": {
      const open = node.getAttribute("open") ?? "(";
      const close = node.getAttribute("close") ?? ")";
      const seps = node.getAttribute("separators") ?? ",";
      const sep = seps.length > 0 ? seps[0] : ",";
      const elemChildren = Array.from(node.children);
      const inner = elemChildren.map(mathmlNodeToLatex).join(`${sep} `);
      return `${open}${inner}${close}`;
    }
    case "mfrac": {
      const elems = Array.from(node.children);
      if (elems.length >= 2) {
        return `\\frac{${mathmlNodeToLatex(elems[0])}}{${mathmlNodeToLatex(elems[1])}}`;
      }
      return childrenLatex();
    }
    case "msqrt":
      return `\\sqrt{${childrenLatex()}}`;
    case "mroot": {
      const elems = Array.from(node.children);
      if (elems.length >= 2) {
        return `\\sqrt[${mathmlNodeToLatex(elems[1])}]{${mathmlNodeToLatex(elems[0])}}`;
      }
      return `\\sqrt{${childrenLatex()}}`;
    }
    case "msup": {
      const elems = Array.from(node.children);
      if (elems.length >= 2) {
        return `${mathmlNodeToLatex(elems[0])}^{${mathmlNodeToLatex(elems[1])}}`;
      }
      return childrenLatex();
    }
    case "msub": {
      const elems = Array.from(node.children);
      if (elems.length >= 2) {
        return `${mathmlNodeToLatex(elems[0])}_{${mathmlNodeToLatex(elems[1])}}`;
      }
      return childrenLatex();
    }
    case "msubsup": {
      const elems = Array.from(node.children);
      if (elems.length >= 3) {
        return `${mathmlNodeToLatex(elems[0])}_{${mathmlNodeToLatex(elems[1])}}^{${mathmlNodeToLatex(elems[2])}}`;
      }
      return childrenLatex();
    }
    case "mover": {
      const elems = Array.from(node.children);
      if (elems.length >= 2) {
        const base = mathmlNodeToLatex(elems[0]);
        const over = (elems[1].textContent || "").trim();
        if (over === "¯" || over === "—" || over === "-") return `\\overline{${base}}`;
        if (over === "⌒" || over === "^") return `\\widehat{${base}}`;
        return `${base}`;
      }
      return childrenLatex();
    }
    default:
      return childrenLatex();
  }
}

function convertMathmlTagsToLatex(html) {
  if (!html || typeof html !== "string" || !/<math\b/i.test(html)) return html;

  return html.replace(/<math\b[^>]*>[\s\S]*?<\/math>/gi, mathBlock => {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(mathBlock, "text/html");
      const mathEl = doc.querySelector("math");
      if (mathEl) {
        let tex = mathmlNodeToLatex(mathEl).replace(/\s+/g, " ").trim();
        if (tex) {
          if (tex.includes("\\\\")) {
            return `$$\\begin{aligned} ${tex} \\end{aligned}$$`;
          }
          return `$${tex}$`;
        }
      }
    } catch (e) {}

    const altMatch = mathBlock.match(/\balttext=["']([\s\S]*?)["']/i);
    if (altMatch && altMatch[1]) {
      const fromAlt = spokenAltToLatex(altMatch[1]);
      if (fromAlt) {
        if (fromAlt.includes("\\\\")) {
          return `$$\\begin{aligned} ${fromAlt} \\end{aligned}$$`;
        }
        return `$${fromAlt}$`;
      }
    }
    return mathBlock;
  });
}

function convertHtmlMathTagsToLatex(html) {
  if (!html || typeof html !== "string") return "";
  let out = stripScreenReaderGraphDescriptions(html);
  out = convertMathmlTagsToLatex(out);

  out = out
    .replace(/&#65024;/g, "")
    .replace(/&#62;/g, ">")
    .replace(/&#60;/g, "<")
    .replace(/&ndash;|&#8211;/gi, "-")
    .replace(/&mdash;|&#8212;/gi, "—")
    .replace(/&minus;|&#8722;/gi, "-");

  out = out.replace(
    /(?:<span\s+class=["'][^"']*italic[^"']*["'][^>]*>([a-zA-Z0-9]+)<\/span>|<i>([a-zA-Z0-9]+)<\/i>)\s*(?:<sup>([^<]+)<\/sup>|<sub>([^<]+)<\/sub>)?/gi,
    (_, v1, v2, sup, sub) => {
      const v = (v1 || v2 || "").trim();
      if (!v) return _;
      if (sup) return `$${v}^{${sup.trim()}}$`;
      if (sub) return `$${v}_{${sub.trim()}}$`;
      return `$${v}$`;
    }
  );

  out = out.replace(/(\b\d+(?:\.\d+)?|\))\s*<sup>([^<]+)<\/sup>/gi, (_, base, sup) => `$${base}^{${sup.trim()}}$`);

  out = out
    .replace(/<\/?span[^>]*>/gi, "")
    .replace(/&lt;\/?span[^&]*&gt;/gi, "");

  out = out.replace(/\b(solution|point|pair|coordinates?)\s+\$?x\$?\s*,\s*\$?y\$?/gi, "$1 $(x, y)$");

  out = out.replace(
    /(?:[-+−]\s*\d+(?:\.\d+)?\s*|\b\d+(?:\.\d+)?\s*)?\$[^$\n<>]+\$(?:\s*(?:[-+−=]\s*(?:\d+(?:\.\d+)?\s*)?|\$[^$\n<>]+\$))+/g,
    match => {
      if (/<|>/i.test(match)) return match;
      const stripped = match.replace(/\$+/g, "").replace(/\\[a-zA-Z]+/g, " ");
      if (/\b[a-zA-Z]{3,}\b/.test(stripped)) return match;
      const merged = match.replace(/\$/g, "").replace(/\s+/g, " ").trim();
      return `$${merged}$`;
    }
  );

  out = out.replace(/\$\$([^$\n]+)\$(?!\$)/g, '<code class="currency-dollar">$</code>$$$1$$');

  out = out.replace(/(<img\b[^>]*\bsrc=["'])\/(?!\/)/gi, '$1https://satsuitequestionbank.collegeboard.org/');

  out = out
    .replace(/<\$\/p>/gi, "$")
    .replace(/<\/p>\$/gi, "$")
    .replace(/&lt;\/?p[^&]*&gt;/gi, "")
    .replace(/([_\u2014\u2013\u2500]{2,})\s*blank\b/gi, "$1");

  return out;
}

function replaceBlurryMathImagesWithLatex(html) {
  if (!html || typeof html !== "string") return "";
  let out = stripScreenReaderGraphDescriptions(html);

  out = out.replace(/(?:\\?\$|&#36;)(?=\s*(?:\d|<(?:math|img|span|i|b|strong)\b))/gi, '<code class="currency-dollar">$</code>');

  out = out.replace(/<img\b[^>]*>/gi, imgTag => {
    const isMathImg = /role=["']math["']|class=["'][^"']*math-img[^"']*["']/i.test(imgTag);
    if (!isMathImg) return imgTag;

    const altMatch = imgTag.match(/\balt=["']([\s\S]*?)["']/i);
    if (!altMatch || !altMatch[1].trim()) return imgTag;

    const rawAlt = altMatch[1].trim();
    const latex = spokenAltToLatex(rawAlt);

    if (!latex) {
      return imgTag.replace(
        /<img\b/i,
        '<img style="display:inline-block;vertical-align:middle;max-height:2.4em;width:auto;margin:0 3px;filter:contrast(1.25);"'
      );
    }

    if (latex.includes("\\\\")) {
      return `$$\\begin{aligned} ${latex} \\end{aligned}$$`;
    }
    return `$${latex}$`;
  });

  out = convertHtmlMathTagsToLatex(out);

  return out;
}

/* ---------- Управление кнопками и плавающим окном калькулятора Desmos ---------- */

function getAllDesmosTriggerButtons() {
  const btns = new Set(
    document.querySelectorAll("#open-desmos-btn, #desmosBtn, [data-desmos], [data-action='desmos']")
  );
  document.querySelectorAll(".top-bar button, .top-bar a").forEach(el => {
    if (/\b(?:desmos|calculator)\b/i.test((el.textContent || "").trim())) {
      btns.add(el);
    }
  });
  return Array.from(btns);
}

function setDesmosVisibilityForSection(isMathSection) {
  const triggers = getAllDesmosTriggerButtons();
  triggers.forEach(btn => {
    btn.classList.toggle("hidden", !isMathSection);
    btn.style.display = isMathSection ? "" : "none";
  });
  const refBtn = document.getElementById("open-ref-sheet-btn");
  if (refBtn) {
    refBtn.classList.toggle("hidden", !isMathSection);
    refBtn.style.display = isMathSection ? "" : "none";
  }
  if (!isMathSection) {
    if (window.DesmosModule && typeof window.DesmosModule.close === "function") {
      window.DesmosModule.close();
    }
    if (window.RefSheetModule && typeof window.RefSheetModule.close === "function") {
      window.RefSheetModule.close();
    }
  }
}

function initDraggableDesmosWindow() {
  if (document.getElementById("desmos-floating-window")) return;

  const topBar = document.querySelector(".top-bar");
  const existingTriggers = getAllDesmosTriggerButtons();
  if (existingTriggers.length === 0 && topBar) {
    const calcTriggerBtn = document.createElement("button");
    calcTriggerBtn.type = "button";
    calcTriggerBtn.id = "open-desmos-btn";
    calcTriggerBtn.className = "desmos-topbar-btn hidden";
    calcTriggerBtn.innerHTML = "🖩 Desmos";
    topBar.appendChild(calcTriggerBtn);
  }

  const win = document.createElement("div");
  win.id = "desmos-floating-window";
  win.className = "desmos-floating-window hidden";
  win.innerHTML = `
    <div class="desmos-window-header" id="desmos-drag-handle">
      <div class="desmos-window-title">
        <span class="desmos-drag-dots">⋮⋮</span>
        <span>Graphing Calculator (Desmos)</span>
      </div>
      <div class="desmos-window-controls">
        <button type="button" id="desmos-size-btn" class="desmos-ctrl-btn" title="Expand / Standard Size">⤢</button>
        <button type="button" id="desmos-close-btn" class="desmos-ctrl-btn desmos-close" title="Close Calculator">✕</button>
      </div>
    </div>
    <div class="desmos-window-body">
      <iframe
        id="desmos-iframe"
        src="https://www.desmos.com/calculator"
        title="Desmos Graphing Calculator"
        allow="clipboard-write"
      ></iframe>
      <div id="desmos-drag-shield" class="desmos-drag-shield hidden"></div>
    </div>
  `;
  document.body.appendChild(win);

  const handle = document.getElementById("desmos-drag-handle");
  const shield = document.getElementById("desmos-drag-shield");
  const sizeBtn = document.getElementById("desmos-size-btn");
  const closeBtn = document.getElementById("desmos-close-btn");

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  const startDrag = (clientX, clientY) => {
    isDragging = true;
    if (shield) shield.classList.remove("hidden");
    const rect = win.getBoundingClientRect();
    win.style.right = "auto";
    win.style.bottom = "auto";
    win.style.left = `${rect.left}px`;
    win.style.top = `${rect.top}px`;
    startX = clientX;
    startY = clientY;
    initialLeft = rect.left;
    initialTop = rect.top;
    document.body.style.userSelect = "none";
  };

  const moveDrag = (clientX, clientY) => {
    if (!isDragging) return;
    const dx = clientX - startX;
    const dy = clientY - startY;
    const maxLeft = Math.max(0, window.innerWidth - 120);
    const maxTop = Math.max(0, window.innerHeight - 60);
    const newLeft = Math.min(Math.max(0, initialLeft + dx), maxLeft);
    const newTop = Math.min(Math.max(0, initialTop + dy), maxTop);
    win.style.left = `${newLeft}px`;
    win.style.top = `${newTop}px`;
  };

  const stopDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    if (shield) shield.classList.add("hidden");
    document.body.style.userSelect = "";
  };

  if (handle) {
    handle.addEventListener("mousedown", e => {
      if (e.target.closest("button")) return;
      startDrag(e.clientX, e.clientY);
    });
    handle.addEventListener(
      "touchstart",
      e => {
        if (e.target.closest("button")) return;
        const t = e.touches[0];
        if (t) startDrag(t.clientX, t.clientY);
      },
      { passive: true }
    );
  }

  window.addEventListener("mousemove", e => moveDrag(e.clientX, e.clientY));
  window.addEventListener(
    "touchmove",
    e => {
      if (!isDragging) return;
      const t = e.touches[0];
      if (t) moveDrag(t.clientX, t.clientY);
    },
    { passive: true }
  );
  window.addEventListener("mouseup", stopDrag);
  window.addEventListener("touchend", stopDrag);

  if (sizeBtn) {
    sizeBtn.onclick = () => {
      win.classList.toggle("is-expanded");
    };
  }

  if (closeBtn) {
    closeBtn.onclick = () => {
      win.classList.add("hidden");
    };
  }

  window.DesmosModule = {
    open() {
      document.querySelectorAll(".desmos-modal, #desmos-modal, #desmosModal").forEach(el => {
        if (el !== win) el.classList.add("hidden");
      });
      win.classList.remove("hidden");
    },
    close() {
      win.classList.add("hidden");
      document.querySelectorAll(".desmos-modal, #desmos-modal, #desmosModal").forEach(el => {
        el.classList.add("hidden");
      });
    },
    toggle() {
      if (win.classList.contains("hidden")) {
        this.open();
      } else {
        this.close();
      }
    }
  };
}


/* ---------- Плавающее окно Math Reference Sheet (официальные формулы Digital SAT) ---------- */

function initDraggableRefSheetWindow() {
  if (document.getElementById("ref-sheet-floating-window")) return;

  const win = document.createElement("div");
  win.id = "ref-sheet-floating-window";
  win.className = "ref-sheet-floating-window hidden";
  win.innerHTML = `
    <div class="ref-sheet-header" id="ref-sheet-drag-handle">
      <div class="desmos-window-title">
        <span class="desmos-drag-dots">⋮⋮</span>
        <span>SAT Math Reference Sheet</span>
      </div>
      <div class="desmos-window-controls">
        <button type="button" id="ref-sheet-close-btn" class="desmos-ctrl-btn desmos-close" title="Close Reference Sheet">✕</button>
      </div>
    </div>
    <div class="ref-sheet-body" id="ref-sheet-body">
      <div class="ref-section-title">2D Geometry</div>
      <div class="ref-grid">
        <div class="ref-card">
          <div class="ref-card-name">Circle</div>
          <div class="ref-formula">$A = \\pi r^2$</div>
          <div class="ref-formula">$C = 2\\pi r$</div>
        </div>
        <div class="ref-card">
          <div class="ref-card-name">Rectangle</div>
          <div class="ref-formula">$A = lw$</div>
        </div>
        <div class="ref-card">
          <div class="ref-card-name">Triangle</div>
          <div class="ref-formula">$A = \\frac{1}{2}bh$</div>
        </div>
        <div class="ref-card">
          <div class="ref-card-name">Pythagorean Theorem</div>
          <div class="ref-formula">$c^2 = a^2 + b^2$</div>
        </div>
      </div>

      <div class="ref-section-title">Special Right Triangles</div>
      <div class="ref-grid">
        <div class="ref-card">
          <div class="ref-card-name">$30^\\circ\\text{–}60^\\circ\\text{–}90^\\circ$</div>
          <div class="ref-formula">Sides: $x : x\\sqrt{3} : 2x$</div>
        </div>
        <div class="ref-card">
          <div class="ref-card-name">$45^\\circ\\text{–}45^\\circ\\text{–}90^\\circ$</div>
          <div class="ref-formula">Sides: $s : s : s\\sqrt{2}$</div>
        </div>
      </div>

      <div class="ref-section-title">3D Volumes</div>
      <div class="ref-grid">
        <div class="ref-card">
          <div class="ref-card-name">Rectangular Prism</div>
          <div class="ref-formula">$V = lwh$</div>
        </div>
        <div class="ref-card">
          <div class="ref-card-name">Cylinder</div>
          <div class="ref-formula">$V = \\pi r^2 h$</div>
        </div>
        <div class="ref-card">
          <div class="ref-card-name">Sphere</div>
          <div class="ref-formula">$V = \\frac{4}{3}\\pi r^3$</div>
        </div>
        <div class="ref-card">
          <div class="ref-card-name">Cone</div>
          <div class="ref-formula">$V = \\frac{1}{3}\\pi r^2 h$</div>
        </div>
        <div class="ref-card">
          <div class="ref-card-name">Pyramid</div>
          <div class="ref-formula">$V = \\frac{1}{3}lwh$</div>
        </div>
      </div>

      <div class="ref-notes">
        <div>• The number of degrees of arc in a circle is $360$.</div>
        <div>• The number of radians of arc in a circle is $2\\pi$.</div>
        <div>• The sum of the measures in degrees of the angles of a triangle is $180$.</div>
      </div>
    </div>
  `;
  document.body.appendChild(win);

  const handle = document.getElementById("ref-sheet-drag-handle");
  const closeBtn = document.getElementById("ref-sheet-close-btn");

  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;

  const startDrag = (clientX, clientY) => {
    isDragging = true;
    const rect = win.getBoundingClientRect();
    win.style.right = "auto";
    win.style.bottom = "auto";
    win.style.left = `${rect.left}px`;
    win.style.top = `${rect.top}px`;
    startX = clientX;
    startY = clientY;
    initialLeft = rect.left;
    initialTop = rect.top;
    document.body.style.userSelect = "none";
  };

  const moveDrag = (clientX, clientY) => {
    if (!isDragging) return;
    const dx = clientX - startX;
    const dy = clientY - startY;
    const maxLeft = Math.max(0, window.innerWidth - 120);
    const maxTop = Math.max(0, window.innerHeight - 60);
    win.style.left = `${Math.min(Math.max(0, initialLeft + dx), maxLeft)}px`;
    win.style.top = `${Math.min(Math.max(0, initialTop + dy), maxTop)}px`;
  };

  const stopDrag = () => {
    if (!isDragging) return;
    isDragging = false;
    document.body.style.userSelect = "";
  };

  if (handle) {
    handle.addEventListener("mousedown", e => {
      if (e.target.closest("button")) return;
      startDrag(e.clientX, e.clientY);
    });
    handle.addEventListener("touchstart", e => {
      if (e.target.closest("button")) return;
      const t = e.touches[0];
      if (t) startDrag(t.clientX, t.clientY);
    }, { passive: true });
  }

  window.addEventListener("mousemove", e => moveDrag(e.clientX, e.clientY));
  window.addEventListener("touchmove", e => {
    if (!isDragging) return;
    const t = e.touches[0];
    if (t) moveDrag(t.clientX, t.clientY);
  }, { passive: true });
  window.addEventListener("mouseup", stopDrag);
  window.addEventListener("touchend", stopDrag);

  if (closeBtn) {
    closeBtn.onclick = () => win.classList.add("hidden");
  }

  window.RefSheetModule = {
    open() {
      win.classList.remove("hidden");
      renderMath(win);
    },
    close() {
      win.classList.add("hidden");
    },
    toggle() {
      if (win.classList.contains("hidden")) {
        this.open();
      } else {
        this.close();
      }
    }
  };

  const triggerBtn = document.getElementById("open-ref-sheet-btn");
  if (triggerBtn) {
    triggerBtn.addEventListener("click", () => {
      window.RefSheetModule.toggle();
    });
  }
}

/* ---------- Маркер для Reading & Writing (Highlighter) ---------- */

let rwHighlightMode = false;
let rwHighlightColor = "yellow";

function saveCurrentPassageHighlights() {
  const q = filteredQuestions[currentIndex];
  if (!q || !passageEl) return;
  const qId = getQuestionId(q, currentIndex);
  if (sessionState[qId]) {
    sessionState[qId].highlightedHtml = passageEl.innerHTML;
  }
}

function unwrapHighlightMark(markEl) {
  if (!markEl || !markEl.parentNode) return;
  const parent = markEl.parentNode;
  while (markEl.firstChild) {
    parent.insertBefore(markEl.firstChild, markEl);
  }
  parent.removeChild(markEl);
  parent.normalize();
}

function initRwHighlighter() {
  const modeBtn = document.getElementById("hl-mode-btn");
  const clearBtn = document.getElementById("hl-clear-btn");
  const swatches = document.querySelectorAll(".hl-swatch");

  if (modeBtn) {
    modeBtn.addEventListener("click", () => {
      rwHighlightMode = !rwHighlightMode;
      modeBtn.classList.toggle("active", rwHighlightMode);
      modeBtn.setAttribute("aria-pressed", String(rwHighlightMode));
      modeBtn.textContent = rwHighlightMode ? "🖍 Highlight: ON" : "🖍 Highlight: OFF";
      if (passagePanel) {
        passagePanel.classList.toggle("hl-cursor-active", rwHighlightMode);
      }
    });
  }

  swatches.forEach(btn => {
    btn.addEventListener("click", () => {
      rwHighlightColor = btn.dataset.hlColor || "yellow";
      swatches.forEach(s => s.classList.toggle("active", s === btn));
      if (!rwHighlightMode && modeBtn) {
        modeBtn.click();
      }
    });
  });

  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (!passageEl) return;
      passageEl.querySelectorAll("mark.rw-hl").forEach(unwrapHighlightMark);
      const q = filteredQuestions[currentIndex];
      if (q) {
        const qId = getQuestionId(q, currentIndex);
        if (sessionState[qId]) sessionState[qId].highlightedHtml = null;
      }
    });
  }

  if (passageEl) {
    // Клик по уже выделенному фрагменту снимает выделение
    passageEl.addEventListener("click", e => {
      const mark = e.target.closest("mark.rw-hl");
      if (mark && passageEl.contains(mark)) {
        const sel = window.getSelection();
        if (sel && sel.toString().trim().length > 0) return;
        unwrapHighlightMark(mark);
        saveCurrentPassageHighlights();
      }
    });

    // Выделение текста мышкой при включённом режиме маркера
    passageEl.addEventListener("mouseup", () => {
      if (!rwHighlightMode) return;
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
      const selectedText = sel.toString();
      if (!selectedText || !selectedText.trim()) return;

      const range = sel.getRangeAt(0);
      if (!passageEl.contains(range.commonAncestorContainer)) return;

      const mark = document.createElement("mark");
      mark.className = `rw-hl hl-${rwHighlightColor}`;
      mark.title = "Click to remove highlight";

      try {
        range.surroundContents(mark);
      } catch (err) {
        const frag = range.extractContents();
        mark.appendChild(frag);
        range.insertNode(mark);
      }

      sel.removeAllRanges();
      saveCurrentPassageHighlights();
    });
  }
}

/* ---------- Persistent History (localStorage) ---------- */

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return { questions: {} };
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && parsed.questions) {
      return parsed;
    }
  } catch (e) {
    console.warn("Could not read history from localStorage:", e);
  }
  return { questions: {} };
}

function saveHistory(historyObj) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyObj));
  } catch (e) {
    console.warn("Could not save history to localStorage:", e);
  }
}

function getStableQuestionKey(q, fallbackIndex = 0) {
  if (q.id !== undefined && q.id !== null && String(q.id).trim() !== "") {
    return `id:${String(q.id).trim()}`;
  }
  if (q.questionId || q.uuid) {
    return `id:${String(q.questionId || q.uuid).trim()}`;
  }
  const promptSnippet = String(q.question || q.prompt || "").trim().slice(0, 100);
  if (promptSnippet) {
    return `txt:${getDomainCode(q)}:${promptSnippet}`;
  }
  return `idx:${fallbackIndex}`;
}

function recordAttemptInHistory(q, isCorrect, fallbackIndex = 0) {
  const history = loadHistory();
  const key = getStableQuestionKey(q, fallbackIndex);
  const existing = history.questions[key] || {
    attempts: 0,
    correct: 0,
    wrong: 0,
    everMissed: false,
    lastResult: null,
    domain: getDomainCode(q),
    section: getSectionFromQuestion(q),
    updatedAt: 0
  };

  existing.attempts += 1;
  if (isCorrect) {
    existing.correct += 1;
    existing.lastResult = "correct";
  } else {
    existing.wrong += 1;
    existing.everMissed = true;
    existing.lastResult = "wrong";
  }
  existing.domain = getDomainCode(q);
  existing.section = getSectionFromQuestion(q);
  existing.updatedAt = Date.now();

  history.questions[key] = existing;
  saveHistory(history);
}

function getQuestionHistoryRecord(q, fallbackIndex = 0) {
  const history = loadHistory();
  const key = getStableQuestionKey(q, fallbackIndex);
  return history.questions[key] || null;
}

function injectAppStyles() {
  if (document.getElementById("app-enhancements-styles")) return;
  const style = document.createElement("style");
  style.id = "app-enhancements-styles";
  style.textContent = `
    .q-history-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      font-weight: 600;
      padding: 3px 9px;
      border-radius: 999px;
      margin-left: 6px;
      vertical-align: middle;
    }
    .q-history-badge.is-new {
      background: #f1f5f9;
      color: #475569;
      border: 1px solid #cbd5e1;
    }
    .q-history-badge.is-solved {
      background: #dcfce7;
      color: #166534;
      border: 1px solid #86efac;
    }
    .q-history-badge.is-missed {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fca5a5;
    }
    .history-menu-card {
      margin-top: 20px;
      padding: 18px 20px;
      border-radius: 14px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
      text-align: left;
    }
    .history-menu-header {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 14px;
    }
    .history-menu-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .history-menu-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .history-action-btn {
      font-size: 13px;
      font-weight: 600;
      padding: 7px 12px;
      border-radius: 8px;
      cursor: pointer;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      color: #1e293b;
      transition: all 0.15s ease;
    }
    .history-action-btn:hover:not(:disabled) {
      background: #e2e8f0;
    }
    .history-action-btn.primary-missed {
      background: #fef2f2;
      border-color: #fca5a5;
      color: #991b1b;
    }
    .history-action-btn.primary-missed:hover:not(:disabled) {
      background: #fee2e2;
    }
    .history-action-btn:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }
    .history-kpis {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 10px;
      margin-bottom: 14px;
    }
    .history-kpi {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 10px 12px;
    }
    .history-kpi-val {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.2;
    }
    .history-kpi-label {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }
    .history-domains-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 8px 16px;
    }
    .history-dom-item {
      font-size: 13px;
    }
    .history-dom-top {
      display: flex;
      justify-content: space-between;
      color: #334155;
      margin-bottom: 4px;
    }
    .history-dom-bar {
      height: 6px;
      background: #e2e8f0;
      border-radius: 999px;
      overflow: hidden;
    }
    .history-dom-fill {
      height: 100%;
      background: #2563eb;
      border-radius: 999px;
      transition: width 0.25s ease;
    }
    .history-dom-fill.good { background: #16a34a; }
    .history-dom-fill.weak { background: #dc2626; }
    .reset-modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      z-index: 9999;
    }
    .reset-modal-backdrop.hidden {
      display: none;
    }
    .reset-modal-card {
      width: 100%;
      max-width: 400px;
      background: #ffffff;
      border-radius: 14px;
      padding: 20px;
      box-shadow: 0 16px 40px rgba(15, 23, 42, 0.22);
      border: 1px solid #e2e8f0;
      text-align: left;
    }
    .reset-modal-title {
      margin: 0 0 8px;
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
    }
    .reset-modal-text {
      margin: 0 0 18px;
      font-size: 14px;
      line-height: 1.45;
      color: #475569;
    }
    .reset-modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }
    .reset-modal-danger-btn {
      font-size: 13px;
      font-weight: 600;
      padding: 8px 14px;
      border-radius: 8px;
      cursor: pointer;
      border: 1px solid #dc2626;
      background: #dc2626;
      color: #ffffff;
    }
    .reset-modal-danger-btn:hover {
      background: #b91c1c;
    }
  `;
  document.head.appendChild(style);
}

function getOrCreateSetupScreen() {
  let screen = document.getElementById("section-setup-screen");
  if (!screen) {
    screen = document.createElement("section");
    screen.id = "section-setup-screen";
    screen.className = "setup-screen hidden";
    const anchor = menuScreen || document.body;
    anchor.insertAdjacentElement("afterend", screen);
  }
  return screen;
}

function getTimerOptionsList() {
  if (timerSelect && timerSelect.options && timerSelect.options.length > 0) {
    return Array.from(timerSelect.options)
      .filter(opt => opt.value !== "60" && opt.value !== "90" && !/per\s+question|\/\s*question/i.test(opt.textContent))
      .map(opt => ({
        value: opt.value,
        label: opt.textContent.trim()
      }));
  }
  return [
    { value: "off", label: "No Timer (Untimed)" },
    { value: "900", label: "15 min session" },
    { value: "2100", label: "35 min session" }
  ];
}

function countMatchingPool(section, domain, difficulty) {
  return allQuestions.filter(q => {
    const qSec = getSectionFromQuestion(q);
    if (section && qSec !== section) return false;
    if (domain && domain !== "all" && getDomainCode(q) !== domain) return false;
    if (difficulty && difficulty !== "all") {
      const qDiff = String(q.difficulty || "").trim().toLowerCase();
      if (qDiff !== difficulty.toLowerCase()) return false;
    }
    return true;
  }).length;
}

function openSectionSetup(section) {
  injectAppStyles();
  if (window.DesmosModule && typeof window.DesmosModule.close === 'function') window.DesmosModule.close();
  if (window.RefSheetModule && typeof window.RefSheetModule.close === 'function') window.RefSheetModule.close();
  activeSection = section === "Math" ? "Math" : "RW";
  populateDomainOptions(activeSection);

  if (difficultySelect && difficultySelect.value) {
    activeDifficultyFilter = difficultySelect.value;
  }
  if (countSelect && countSelect.value) {
    activeCountFilter = countSelect.value;
  }
  if (timerSelect && timerSelect.value) {
    activeTimerSetting = timerSelect.value;
  }
  if (activeTimerSetting === "60" || activeTimerSetting === "90") {
    activeTimerSetting = "off";
  }

  const setupScreen = getOrCreateSetupScreen();
  const isMath = activeSection === "Math";
  const sectionTitle = isMath ? "Math Practice Setup" : "Reading & Writing Setup";
  const sectionBadge = isMath ? "SAT Math" : "SAT Reading & Writing";
  const sectionDesc = isMath
    ? "Choose topic, difficulty, question count, and timer before starting."
    : "Choose domain, difficulty, question count, and timer before starting.";

  const domainEntries = Object.entries(DOMAIN_META).filter(([, meta]) => meta.section === activeSection);
  const domainOptionsHtml =
    `<option value="all" ${activeDomainFilter === "all" ? "selected" : ""}>All Topics</option>` +
    domainEntries
      .map(
        ([code, meta]) =>
          `<option value="${code}" ${activeDomainFilter === code ? "selected" : ""}>${meta.label}</option>`
      )
      .join("");

  const difficulties = ["all", "Easy", "Medium", "Hard"];
  const diffChipsHtml = difficulties
    .map(diff => {
      const val = diff.toLowerCase();
      const isActive = activeDifficultyFilter.toLowerCase() === val;
      const label = diff === "all" ? "All" : diff;
      return `<button type="button" class="setup-chip-btn ${isActive ? "active" : ""}" data-diff="${diff}">${label}</button>`;
    })
    .join("");

  const counts = ["10", "20", "35", "50", "all"];
  const countChipsHtml = counts
    .map(cnt => {
      const isActive = String(activeCountFilter) === cnt;
      const label = cnt === "all" ? "All" : `${cnt} Qs`;
      return `<button type="button" class="setup-chip-btn ${isActive ? "active" : ""}" data-count="${cnt}">${label}</button>`;
    })
    .join("");

  const timerOpts = getTimerOptionsList();
  const timerOptionsHtml = timerOpts
    .map(
      opt =>
        `<option value="${opt.value}" ${String(activeTimerSetting) === String(opt.value) ? "selected" : ""}>${opt.label}</option>`
    )
    .join("");

  const availableCount = countMatchingPool(activeSection, activeDomainFilter, activeDifficultyFilter);
  const selectedLimit = activeCountFilter === "all" ? availableCount : Math.min(Number(activeCountFilter) || availableCount, availableCount);

  setupScreen.innerHTML = `
    <div class="setup-topbar">
      <button type="button" id="setup-back-btn" class="setup-back-btn">← Back to Menu</button>
      <span class="setup-pill">${sectionBadge}</span>
    </div>
    <div class="setup-card">
      <div>
        <h2 class="setup-title">${sectionTitle}</h2>
        <p class="setup-subtitle">${sectionDesc}</p>
      </div>

      <div class="setup-grid">
        <div class="setup-field">
          <label for="setup-domain-select" class="setup-label">Topic / Domain</label>
          <select id="setup-domain-select" class="setup-select">${domainOptionsHtml}</select>
        </div>

        <div class="setup-field">
          <label for="setup-timer-select" class="setup-label">Timer</label>
          <select id="setup-timer-select" class="setup-select">${timerOptionsHtml}</select>
        </div>

        <div class="setup-field">
          <span class="setup-label">Difficulty</span>
          <div class="setup-chips" id="setup-diff-chips">${diffChipsHtml}</div>
        </div>

        <div class="setup-field">
          <span class="setup-label">Number of Questions</span>
          <div class="setup-chips" id="setup-count-chips">${countChipsHtml}</div>
        </div>
      </div>

      <div class="setup-footer">
        <div class="setup-pool-info" id="setup-pool-info">
          Matching bank: <strong>${availableCount}</strong> · Session size: <strong>${selectedLimit}</strong>
        </div>
        <button type="button" id="setup-start-btn" class="setup-start-btn" ${availableCount === 0 ? "disabled" : ""}>
          Start Practice →
        </button>
      </div>
    </div>
  `;

  if (menuScreen) menuScreen.classList.add("hidden");
  if (summaryScreen) summaryScreen.classList.add("hidden");
  if (testScreen) testScreen.classList.add("hidden");
  setupScreen.classList.remove("hidden");

  const setupDomainEl = document.getElementById("setup-domain-select");
  const setupTimerEl = document.getElementById("setup-timer-select");
  const setupPoolInfoEl = document.getElementById("setup-pool-info");
  const setupStartBtn = document.getElementById("setup-start-btn");
  const setupBackBtn = document.getElementById("setup-back-btn");

  const refreshSetupSummary = () => {
    const avail = countMatchingPool(activeSection, activeDomainFilter, activeDifficultyFilter);
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

  if (setupDomainEl) {
    setupDomainEl.onchange = () => {
      activeDomainFilter = setupDomainEl.value;
      if (domainSelect) domainSelect.value = activeDomainFilter;
      refreshSetupSummary();
    };
  }

  if (setupTimerEl) {
    setupTimerEl.onchange = () => {
      activeTimerSetting = setupTimerEl.value;
      if (timerSelect) timerSelect.value = activeTimerSetting;
    };
  }

  document.querySelectorAll("#setup-diff-chips .setup-chip-btn").forEach(chip => {
    chip.onclick = () => {
      activeDifficultyFilter = chip.dataset.diff || "all";
      if (difficultySelect) difficultySelect.value = activeDifficultyFilter;
      document.querySelectorAll("#setup-diff-chips .setup-chip-btn").forEach(c => {
        c.classList.toggle("active", c === chip);
      });
      refreshSetupSummary();
    };
  });

  document.querySelectorAll("#setup-count-chips .setup-chip-btn").forEach(chip => {
    chip.onclick = () => {
      activeCountFilter = chip.dataset.count || "all";
      if (countSelect) countSelect.value = activeCountFilter;
      document.querySelectorAll("#setup-count-chips .setup-chip-btn").forEach(c => {
        c.classList.toggle("active", c === chip);
      });
      refreshSetupSummary();
    };
  });

  if (setupBackBtn) {
    setupBackBtn.onclick = () => {
      returnToMenu();
    };
  }

  if (setupStartBtn) {
    setupStartBtn.onclick = () => {
      startSession();
    };
  }
}

function showResetHistoryModal(onConfirmReset) {
  let modal = document.getElementById("reset-history-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "reset-history-modal";
    modal.className = "reset-modal-backdrop";
    modal.innerHTML = `
      <div class="reset-modal-card" role="dialog" aria-modal="true" aria-labelledby="reset-modal-title">
        <h4 id="reset-modal-title" class="reset-modal-title">Reset All-Time History?</h4>
        <p class="reset-modal-text">
          All saved progress, topic accuracy, and missed questions will be permanently deleted from this browser.
        </p>
        <div class="reset-modal-actions">
          <button type="button" id="cancel-reset-history-btn" class="history-action-btn">Cancel</button>
          <button type="button" id="confirm-reset-history-btn" class="reset-modal-danger-btn">Reset History</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  modal.classList.remove("hidden");

  const cancelBtn = document.getElementById("cancel-reset-history-btn");
  const confirmBtn = document.getElementById("confirm-reset-history-btn");

  const closeModal = () => {
    modal.classList.add("hidden");
  };

  modal.onclick = e => {
    if (e.target === modal) closeModal();
  };

  if (cancelBtn) {
    cancelBtn.onclick = closeModal;
  }

  if (confirmBtn) {
    confirmBtn.onclick = () => {
      closeModal();
      if (typeof onConfirmReset === "function") {
        onConfirmReset();
      }
    };
  }
}

function updateQuestionHistoryBadge(q, index) {
  const existingBadge = document.getElementById("q-history-badge");
  if (existingBadge) {
    existingBadge.remove();
  }
}

function renderMenuHistoryDashboard() {
  if (!menuScreen) return;
  injectAppStyles();

  let card = document.getElementById("history-menu-card");
  if (!card) {
    card = document.createElement("div");
    card.id = "history-menu-card";
    card.className = "history-menu-card";
    const container = menuScreen.querySelector(".menu-container, .menu-card, .container") || menuScreen;
    container.appendChild(card);
  }

  const history = loadHistory();
  const entries = Object.values(history.questions || {});

  let totalAttempts = 0;
  let totalCorrect = 0;
  let uniqueSolved = 0;
  let missedCount = 0;

  const domainStats = {};
  Object.entries(DOMAIN_META).forEach(([code, meta]) => {
    domainStats[code] = { code, label: meta.label, attempts: 0, correct: 0 };
  });

  entries.forEach(rec => {
    if (!rec || !rec.attempts) return;
    uniqueSolved += 1;
    totalAttempts += rec.attempts;
    totalCorrect += rec.correct || 0;
    if (rec.everMissed || rec.lastResult === "wrong") {
      missedCount += 1;
    }
    if (rec.domain && domainStats[rec.domain]) {
      domainStats[rec.domain].attempts += rec.attempts;
      domainStats[rec.domain].correct += rec.correct || 0;
    }
  });

  const overallAcc = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;
  const totalBankSize = allQuestions.length;

  const domainRowsHtml = Object.values(domainStats)
    .map(d => {
      const hasData = d.attempts > 0;
      const pct = hasData ? Math.round((d.correct / d.attempts) * 100) : 0;
      const cls = !hasData ? "" : pct >= 75 ? "good" : pct < 50 ? "weak" : "";
      return `
        <div class="history-dom-item">
          <div class="history-dom-top">
            <span>${d.label}</span>
            <strong>${hasData ? `${pct}% (${d.correct}/${d.attempts})` : "—"}</strong>
          </div>
          <div class="history-dom-bar">
            <div class="history-dom-fill ${cls}" style="width: ${hasData ? pct : 0}%"></div>
          </div>
        </div>
      `;
    })
    .join("");

  card.innerHTML = `
    <div class="history-menu-header">
      <h3 class="history-menu-title">All-Time Progress</h3>
      <div class="history-menu-actions">
        <button type="button" id="practice-missed-btn" class="history-action-btn primary-missed" ${missedCount === 0 ? "disabled" : ""}>
          Practice Missed (${missedCount})
        </button>
        <button type="button" id="reset-history-btn" class="history-action-btn" ${uniqueSolved === 0 ? "disabled" : ""}>
          Reset History
        </button>
      </div>
    </div>
    <div class="history-kpis">
      <div class="history-kpi">
        <div class="history-kpi-val">${totalAttempts > 0 ? overallAcc + "%" : "—"}</div>
        <div class="history-kpi-label">All-Time Accuracy</div>
      </div>
      <div class="history-kpi">
        <div class="history-kpi-val">${uniqueSolved}${totalBankSize ? ` / ${totalBankSize}` : ""}</div>
        <div class="history-kpi-label">Questions Practiced</div>
      </div>
      <div class="history-kpi">
        <div class="history-kpi-val">${missedCount}</div>
        <div class="history-kpi-label">Missed Questions</div>
      </div>
    </div>
    <div class="history-domains-grid">${domainRowsHtml}</div>
  `;

  const practiceMissedBtn = document.getElementById("practice-missed-btn");
  if (practiceMissedBtn) {
    practiceMissedBtn.onclick = () => {
      startMissedQuestionsSession();
    };
  }

  const resetHistoryBtn = document.getElementById("reset-history-btn");
  if (resetHistoryBtn) {
    resetHistoryBtn.onclick = () => {
      showResetHistoryModal(() => {
        localStorage.removeItem(HISTORY_STORAGE_KEY);
        renderMenuHistoryDashboard();
      });
    };
  }

  window.dispatchEvent(new CustomEvent("sat:bank-updated"));
}

function startMissedQuestionsSession() {
  const history = loadHistory();
  const missedPool = allQuestions.filter((q, idx) => {
    const key = getStableQuestionKey(q, idx);
    const rec = history.questions[key];
    return rec && (rec.everMissed || rec.lastResult === "wrong");
  });

  if (!missedPool.length) {
    if (filterStatus) {
      filterStatus.textContent = "No missed questions saved yet.";
      filterStatus.classList.remove("hidden");
    }
    return;
  }

  if (filterStatus) {
    filterStatus.classList.add("hidden");
    filterStatus.textContent = "";
  }

  activeModuleRun = null;
  lastAdaptiveConfig = null;
  filteredQuestions = shuffleArray(missedPool);
  currentIndex = 0;
  isPostTestReview = false;
  summaryReviewFilter = "all";

  Object.keys(sessionState).forEach(k => delete sessionState[k]);
  filteredQuestions.forEach((q, idx) => {
    const qId = getQuestionId(q, idx);
    sessionState[qId] = {
      selectedIndex: null,
      textAnswer: "",
      checked: false,
      isCorrect: false,
      flagged: false,
      recordedInHistory: false
    };
  });

  const setupScreen = document.getElementById("section-setup-screen");
  if (setupScreen) setupScreen.classList.add("hidden");
  menuScreen.classList.add("hidden");
  summaryScreen.classList.add("hidden");
  testScreen.classList.remove("hidden");
  setPickerOpen(false);

  sectionLabel.textContent = "Missed Questions Review";
  configureTimerForQuestion(true);
  loadQuestion(0);
}

/* ---------- Core Formatting & Math ---------- */

function formatOptionText(optText, idx) {
  const letters = ["A", "B", "C", "D"];
  let raw = String(optText ?? "").trim();
  raw = replaceBlurryMathImagesWithLatex(raw);
  raw = raw
    .replace(/<\/?p[^>]*>/gi, " ")
    .replace(/<\$\/p>/gi, "$")
    .replace(/&lt;\/?p[^&]*&gt;/gi, " ")
    .trim();
  let cleaned = raw.replace(/^[A-Da-d]\s*[).:-]\s*/, "").trim();

  if (
    activeSection === "Math" &&
    cleaned &&
    !cleaned.includes("$") &&
    !/<(?:img|svg|table|div)\b/i.test(cleaned) &&
    !/\b[a-zA-Z]{4,}\b/.test(cleaned.replace(/<[^>]+>/g, " "))
  ) {
    const plainMath = cleaned.replace(/<[^>]+>/g, "").trim();
    if (plainMath) {
      cleaned = `$${plainMath}$`;
    }
  }

  const letter = letters[idx] || String(idx + 1);
  return `<strong>${letter})</strong> ${cleaned}`;
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

function enhanceVisualGraphs(rootEl) {
  if (!rootEl) return;
  rootEl.querySelectorAll(".option-btn svg:not(.katex svg), .math-visual-holder svg:not(.katex svg), .math-stimulus-block svg:not(.katex svg)").forEach(svg => {
    if (!svg.getAttribute("viewBox") && svg.getAttribute("width") && svg.getAttribute("height")) {
      const w = parseFloat(svg.getAttribute("width"));
      const h = parseFloat(svg.getAttribute("height"));
      if (w > 0 && h > 0) svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    }
    svg.style.display = "block";
    svg.style.maxWidth = "260px";
    svg.style.maxHeight = "240px";
    svg.style.width = "100%";
    svg.style.height = "auto";
  });

  rootEl.querySelectorAll(".option-btn img, .math-visual-holder img, .math-stimulus-block img").forEach(img => {
    img.onerror = function() {
      const altTxt = (this.getAttribute("alt") || "").trim();
      if (altTxt && !this.dataset.fallbackApplied) {
        this.dataset.fallbackApplied = "1";
        const note = document.createElement("div");
        note.className = "img-alt-fallback";
        note.textContent = altTxt;
        this.replaceWith(note);
      }
    };
  });
}

function renderAllMath() {
  renderMath(testScreen);
  renderMath(summaryScreen);
  enhanceVisualGraphs(testScreen);
  enhanceVisualGraphs(summaryScreen);
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

/* ---------- Timer ---------- */

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
    if (qId && sessionState[qId] && !sessionState[qId].checked) {
      sessionState[qId].checked = true;
      const hasOpts = Array.isArray(q.options) && q.options.length > 0;
      if (hasOpts) {
        sessionState[qId].isCorrect = sessionState[qId].selectedIndex === q.correctIndex;
      } else {
        const userVal = String(sessionState[qId].textAnswer || "").trim().toLowerCase();
        sessionState[qId].isCorrect = (q.acceptedAnswers || []).some(a => a.trim().toLowerCase() === userVal);
      }
      if (!sessionState[qId].recordedInHistory) {
        recordAttemptInHistory(q, sessionState[qId].isCorrect, currentIndex);
        sessionState[qId].recordedInHistory = true;
      }
    }
    if (currentIndex < filteredQuestions.length - 1) {
      currentIndex += 1;
      loadQuestion(currentIndex);
    } else {
      showSessionSummary();
    }
  } else if (currentTimerMode === "session") {
    if (isAdaptiveExamMode()) {
      if (activeModuleRun.totalModules === 1) {
        finishSingleModuleAndShowSummary();
      } else if (activeModuleRun.stage === 1) {
        finishModule1();
      } else {
        finishModule2AndShowSummary();
      }
      return;
    }
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

/* ---------- Navigation & Question Rendering ---------- */

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
    } else if ((st.selectedIndex !== null && st.selectedIndex !== undefined) || (st.textAnswer && st.textAnswer.trim() !== "")) {
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

function buildMathStimulusHtml(q) {
  const parts = [];
  const rawPassage = q.passageHtml ?? q.passage ?? q.stimulus ?? "";
  if (typeof rawPassage === "string" && rawPassage.trim()) {
    const cleaned = replaceBlurryMathImagesWithLatex(cleanScrapedMathText(rawPassage));
    if (cleaned) {
      parts.push(`<div class="math-stimulus-block">${cleaned}</div>`);
    }
  }

  const visualHtml = q.visual || q.chart || q.table || q.svg || "";
  if (typeof visualHtml === "string" && visualHtml.trim()) {
    const trimmed = replaceBlurryMathImagesWithLatex(visualHtml.trim());
    if (trimmed.startsWith("<")) {
      parts.push(`<div class="math-visual-holder">${trimmed}</div>`);
    } else {
      parts.push(`<div class="math-visual-holder"><img src="${trimmed}" alt="Question visual"></div>`);
    }
  } else if (q.image || q.img) {
    const src = q.image || q.img;
    parts.push(`<div class="math-visual-holder"><img src="${src}" alt="Question visual"></div>`);
  }

  return parts.join("");
}

function formatRwPassage(cleanedPassage) {
  if (!cleanedPassage) return null;
  const text = cleanedPassage.trim();

  // 1. Cross-Text Connections (Text 1 ... Text 2 ...)
  if (/\bText\s*1\b/.test(text) && /\bText\s*2\b/.test(text)) {
    const parts = text.split(/(?=(?:<p[^>]*>\s*)?\bText\s*2\b)/);
    return parts
      .map((part) => {
        const cleaned = part
          .trim()
          .replace(/^(?:<p[^>]*>\s*)?(Text\s*[12])[:\s]*/i, '<span class="cross-text-label">$1</span> ');
        return `<div class="cross-text-block">${cleaned}</div>`;
      })
      .join("");
  }

  // 2. Rhetorical Synthesis (While researching a topic, a student has taken the following notes:)
  const rsMatch = text.match(/^(.*?following notes:)\s*([\s\S]+)$/i);
  if (rsMatch) {
    const intro = rsMatch[1].replace(/<\/?p[^>]*>/gi, "").trim();
    const notesBody = rsMatch[2].replace(/<\/?p[^>]*>/gi, "\n").trim();

    let items = [];
    if (notesBody.includes("\n") || notesBody.includes("•") || /<li\b/i.test(notesBody)) {
      items = notesBody
        .replace(/<\/?(?:ul|ol)[^>]*>/gi, "")
        .split(/\n+|•+|<li>|<\/li>/i)
        .map((s) => s.replace(/^[-–—•\s]+/, "").trim())
        .filter(Boolean);
    } else {
      const protectedText = notesBody
        .replace(/\b(Mr|Mrs|Ms|Dr|Prof|St|Jr|Sr|vs|etc)\./g, "$1___DOT___")
        .replace(/\b([A-Z])\./g, "$1___DOT___");

      items = protectedText
        .split(/(?<=[.!?])\s+(?=[A-Z"“‘(\d])/)
        .map((s) => s.replace(/___DOT___/g, ".").trim())
        .filter(Boolean);
    }

    const listHtml = items.map((item) => `<li>${item}</li>`).join("");
    return `<p class="rs-intro">${intro}</p><ul class="rs-notes">${listHtml}</ul>`;
  }

  return null;
}

function renderPassage(q, { isMath = false, isOpenMath = false } = {}) {
  const workspace = document.querySelector(".bluebook-workspace");
  const hlBar = document.getElementById("rw-highlighter-bar");
  if (!passageEl || !passagePanel) return;

  if (hlBar) {
    hlBar.classList.toggle("hidden", isMath);
  }

  if (isMath && !isOpenMath) {
    passagePanel.classList.add("hidden");
    if (workspace) {
      workspace.classList.add("math-centered-mode");
      workspace.classList.remove("math-spr-mode");
    }
    passageEl.innerHTML = "";
    return;
  }

  if (isMath && isOpenMath) {
    passagePanel.classList.remove("hidden");
    if (workspace) {
      workspace.classList.remove("math-centered-mode");
      workspace.classList.add("math-spr-mode");
    }
    passageEl.style.whiteSpace = "normal";
    passageEl.innerHTML = SPR_DIRECTIONS_HTML;
    return;
  }

  passagePanel.classList.remove("hidden");
  if (workspace) {
    workspace.classList.remove("math-centered-mode");
    workspace.classList.remove("math-spr-mode");
  }
  passageEl.style.wordBreak = "break-word";

  const rawPassage = q.passageHtml ?? q.passage ?? q.stimulus ?? "";
  passageEl.innerHTML = "";

  if (typeof rawPassage === "string" && rawPassage.trim()) {
    const cleanedPassage = replaceBlurryMathImagesWithLatex(cleanScrapedMathText(rawPassage));
    const specialHtml = formatRwPassage(cleanedPassage);

    if (specialHtml) {
      passageEl.style.whiteSpace = "normal";
      passageEl.innerHTML = specialHtml;
    } else if (/<[a-z][\s\S]*>/i.test(cleanedPassage)) {
      passageEl.style.whiteSpace = "normal";
      passageEl.innerHTML = cleanedPassage;
    } else {
      passageEl.style.whiteSpace = "pre-wrap";
      passageEl.textContent = cleanedPassage;
    }
  } else {
    passageEl.style.whiteSpace = "normal";
  }

  const visualHtml = q.visual || q.chart || q.table || q.svg || "";
  if (typeof visualHtml === "string" && visualHtml.trim()) {
    const holder = document.createElement("div");
    const trimmedVisual = visualHtml.trim();
    if (trimmedVisual.startsWith("<")) {
      holder.innerHTML = trimmedVisual;
    } else {
      holder.innerHTML = `<img src="${trimmedVisual}" alt="Question visual" style="max-width:100%;height:auto;border-radius:8px;display:block;margin:0 auto;">`;
    }
    passageEl.appendChild(holder);
  } else if (q.image || q.img) {
    const src = q.image || q.img;
    const img = document.createElement("img");
    img.src = src;
    img.alt = "Question visual";
    passageEl.appendChild(img);
  }
}

function cleanMergedExplanation(exp) {
  let text = String(exp || "").replace(/\r\n/g, "\n").trim();
  if (!text) return "";
  text = replaceBlurryMathImagesWithLatex(text);
  const secondCorrectHeaderIdx = text.slice(25).search(/\n+Correct\s+Answer\s*:/i);
  if (secondCorrectHeaderIdx !== -1) {
    text = text.slice(0, 25 + secondCorrectHeaderIdx).trim();
  }
  return text;
}

function formatExplanation(exp, correctIndex = 0) {
  const cleaned = cleanMergedExplanation(exp, correctIndex);
  if (!cleaned) return "No explanation provided.";

  let html = cleaned;

  // Разбиваем слипшиеся предложения перед Choice A–D / Answer A–D / Option A–D на отдельные абзацы
  html = html.replace(
    /([^\n>])(\s*)((?:Choice|Answer|Option)\s+[A-D]\b(?:\s+is\b|\s+are\b|[:.,]))/gi,
    "$1\n\n$3"
  );

  // Делаем жирным "Choice A/B/C/D", "Answer A/B/C/D", "Option A/B/C/D"
  html = html.replace(
    /\b((?:Choice|Answer|Option)\s+[A-D])\b/gi,
    '<strong class="exp-choice-label">$1</strong>'
  );

  if (/<p[\s>]/i.test(html)) {
    return html.replace(/\n{2,}/g, '</p><p class="exp-line">');
  }

  const lines = html
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
      textAnswer: "",
      checked: false,
      isCorrect: false,
      flagged: false,
      recordedInHistory: false
    };
  }

  const st = sessionState[qId];
  const examMode = isAdaptiveExamMode();
  const showExplanation = examMode ? false : Boolean(st.checked || opts.forceShowExplanation);

  if (controlsBar) {
    controlsBar.classList.toggle("hidden", examMode);
  }

  const options = Array.isArray(q.options) ? q.options : [];
  const isMath = getSectionFromQuestion(q) === "Math";
  const isOpenMath = isMath && options.length === 0;
  setDesmosVisibilityForSection(isMath);

  qNumEl.textContent = String(index + 1);
  qTotalEl.textContent = String(filteredQuestions.length);
  qDiffBadge.textContent = q.difficulty || "Medium";
  updateQuestionHistoryBadge(q, index);

  updateFlagButtonUI(qId);
  updatePostTestReviewUI();
  renderPassage(q, { isMath, isOpenMath });
  if (!isMath && st.highlightedHtml && passageEl) {
    passageEl.innerHTML = st.highlightedHtml;
  }

  const rawQ = replaceBlurryMathImagesWithLatex(q.question || q.prompt || "");
  const mathStimulus = isMath ? buildMathStimulusHtml(q) : "";

  if (isMath) {
    questionEl.innerHTML = `${mathStimulus}<div class="math-prompt-text">${rawQ}</div>`;
  } else if (/<[a-z][\s\S]*>/i.test(rawQ)) {
    questionEl.innerHTML = rawQ;
  } else {
    questionEl.textContent = rawQ;
  }

  optionsEl.innerHTML = "";

  if (options.length === 0) {
    const sprBox = document.createElement("div");
    sprBox.className = "spr-input-container";

    const label = document.createElement("label");
    label.className = "spr-field-label";
    label.textContent = "Your answer";

    const inp = document.createElement("input");
    inp.type = "text";
    inp.className = "spr-blank-input";
    inp.maxLength = 6;
    inp.placeholder = "";
    inp.value = st.textAnswer ?? "";
    inp.disabled = showExplanation;

    const previewRow = document.createElement("div");
    previewRow.className = "spr-preview-row";
    previewRow.innerHTML = `<span class="spr-preview-label">Answer Preview:</span> <span class="spr-preview-val">${st.textAnswer || "—"}</span>`;

    inp.oninput = () => {
      st.textAnswer = inp.value.trim();
      const valSpan = previewRow.querySelector(".spr-preview-val");
      if (valSpan) valSpan.textContent = st.textAnswer || "—";
      checkBtn.disabled = st.textAnswer === "";
    };

    inp.addEventListener("keydown", e => {
      if (e.key === "Enter" && !isAdaptiveExamMode() && !checkBtn.disabled && !showExplanation) {
        checkBtn.click();
      }
    });

    sprBox.appendChild(label);
    sprBox.appendChild(inp);
    sprBox.appendChild(previewRow);

    if (showExplanation) {
      inp.classList.add(st.isCorrect ? "spr-correct" : "spr-wrong");
      const ansNote = document.createElement("div");
      ansNote.className = `spr-result-banner ${st.isCorrect ? "is-ok" : "is-bad"}`;
      const corrList = (q.acceptedAnswers && q.acceptedAnswers.length)
        ? q.acceptedAnswers.join(" or ")
        : "See explanation below";
      ansNote.innerHTML = st.isCorrect
        ? `✓ Correct! Accepted answer: <strong>${corrList}</strong>`
        : `✕ Incorrect. Correct answer: <strong>${corrList}</strong>`;
      sprBox.appendChild(ansNote);
    }

    optionsEl.appendChild(sprBox);
  } else {
    if (!Array.isArray(st.eliminated)) st.eliminated = [];

    options.forEach((optText, idx) => {
      const row = document.createElement("div");
      row.className = "option-row";
      const isElim = st.eliminated.includes(idx);
      if (isElim && !showExplanation) {
        row.classList.add("is-eliminated");
      }

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option-btn";
      btn.innerHTML = formatOptionText(optText, idx);

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
          if (st.eliminated.includes(idx)) {
            st.eliminated = st.eliminated.filter(i => i !== idx);
            row.classList.remove("is-eliminated");
            if (elimBtn) {
              elimBtn.textContent = "✕";
              elimBtn.title = "Cross out option";
            }
          }
          st.selectedIndex = idx;
          optionsEl.querySelectorAll(".option-btn").forEach((b, i) => {
            b.classList.toggle("selected", i === idx);
          });
          checkBtn.disabled = false;
        };
      }

      row.appendChild(btn);

      let elimBtn = null;
      if (!showExplanation) {
        elimBtn = document.createElement("button");
        elimBtn.type = "button";
        elimBtn.className = "eliminate-btn";
        elimBtn.textContent = isElim ? "↩" : "✕";
        elimBtn.title = isElim ? "Undo cross-out" : "Cross out option";
        elimBtn.setAttribute("aria-label", elimBtn.title);

        elimBtn.onclick = e => {
          e.stopPropagation();
          const already = st.eliminated.includes(idx);
          if (already) {
            st.eliminated = st.eliminated.filter(i => i !== idx);
            row.classList.remove("is-eliminated");
            elimBtn.textContent = "✕";
            elimBtn.title = "Cross out option";
          } else {
            st.eliminated.push(idx);
            row.classList.add("is-eliminated");
            elimBtn.textContent = "↩";
            elimBtn.title = "Undo cross-out";
            if (st.selectedIndex === idx) {
              st.selectedIndex = null;
              btn.classList.remove("selected");
              checkBtn.disabled = true;
            }
          }
        };
        row.appendChild(elimBtn);
      }

      optionsEl.appendChild(row);
    });
  }

  if (showExplanation) {
    checkBtn.disabled = true;
    explanationEl.innerHTML = formatExplanation(q.explanation, q.correctIndex);
    explanationEl.classList.remove("hidden");
  } else {
    if (options.length === 0) {
      checkBtn.disabled = !(st.textAnswer && st.textAnswer.trim() !== "");
    } else {
      checkBtn.disabled = st.selectedIndex === null;
    }
    explanationEl.innerHTML = "";
    explanationEl.classList.add("hidden");
  }

  prevBtn.disabled = index === 0;
  if (examMode && index === filteredQuestions.length - 1) {
    if (activeModuleRun.totalModules === 1) {
      nextBtn.textContent = "Finish & Summary";
    } else {
      nextBtn.textContent = activeModuleRun.stage === 1 ? "Finish Module 1 →" : "Finish & Summary";
    }
  } else {
    nextBtn.textContent = index === filteredQuestions.length - 1 ? "Finish & Summary" : "Next →";
  }

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

  activeModuleRun = null;
  lastAdaptiveConfig = null;
  filteredQuestions = sessionList;
  currentIndex = 0;
  isPostTestReview = false;
  summaryReviewFilter = "all";

  Object.keys(sessionState).forEach(k => delete sessionState[k]);
  filteredQuestions.forEach((q, idx) => {
    const qId = getQuestionId(q, idx);
    sessionState[qId] = {
      selectedIndex: null,
      textAnswer: "",
      checked: false,
      isCorrect: false,
      flagged: false,
      recordedInHistory: false
    };
  });

  const setupScreen = document.getElementById("section-setup-screen");
  if (setupScreen) setupScreen.classList.add("hidden");
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


/* ---------- 2-Stage Adaptive Modules Engine (Bluebook Exam Mode) ---------- */

function isAdaptiveExamMode() {
  return Boolean(activeModuleRun && !isPostTestReview);
}

function hashSeedString(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createSeededRng(seedStr) {
  let a = hashSeedString(String(seedStr || "sat-seed"));
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffleArray(items, seedStr) {
  const arr = items.slice();
  const rng = createSeededRng(seedStr);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getDifficultyBucket(q) {
  const d = String(q.difficulty || "Medium").trim().toLowerCase();
  if (d === "easy") return "easy";
  if (d === "hard") return "hard";
  return "medium";
}

function selectQuestionsByMix(pool, count, weights, shuffleFn) {
  const buckets = { easy: [], medium: [], hard: [] };
  pool.forEach(q => {
    buckets[getDifficultyBucket(q)].push(q);
  });

  buckets.easy = shuffleFn(buckets.easy, "easy");
  buckets.medium = shuffleFn(buckets.medium, "medium");
  buckets.hard = shuffleFn(buckets.hard, "hard");

  const target = Math.min(count, pool.length);
  const picked = [];
  const usedIds = new Set();

  const takeFrom = (bucketName, n) => {
    const list = buckets[bucketName];
    let taken = 0;
    while (list.length > 0 && taken < n && picked.length < target) {
      const item = list.shift();
      const id = getQuestionId(item);
      if (!usedIds.has(id)) {
        usedIds.add(id);
        picked.push(item);
        taken += 1;
      }
    }
  };

  const wantEasy = Math.round(target * (weights.easy || 0));
  const wantHard = Math.round(target * (weights.hard || 0));
  const wantMed = Math.max(0, target - wantEasy - wantHard);

  takeFrom("hard", wantHard);
  takeFrom("medium", wantMed);
  takeFrom("easy", wantEasy);

  // Fill any remainder from remaining pool
  const leftovers = shuffleFn([...buckets.medium, ...buckets.hard, ...buckets.easy], "leftovers");
  for (const item of leftovers) {
    if (picked.length >= target) break;
    const id = getQuestionId(item);
    if (!usedIds.has(id)) {
      usedIds.add(id);
      picked.push(item);
    }
  }

  return shuffleFn(picked, "final");
}

function getModulePool(section, domains) {
  return allQuestions.filter(q => {
    if (getSectionFromQuestion(q) !== section) return false;
    if (Array.isArray(domains) && domains.length > 0) {
      return domains.includes(getDomainCode(q));
    }
    return true;
  });
}

function isVocabQuestion(q) {
  const skill = String(q.skill || q.skill_desc || q.skill_cd || q.topic || "").toLowerCase();
  if (skill.includes("words in context") || skill === "wic") return true;
  const prompt = String(q.question || q.prompt || "").toLowerCase();
  if (
    /most logical and precise word|most nearly means|closest in meaning|best completes the text with the most logical/i.test(prompt)
  ) {
    return true;
  }
  return false;
}

function getRwBluebookOrderRank(q) {
  const dom = getDomainCode(q);
  const skill = String(q.skill || q.skill_desc || q.skill_cd || "").toLowerCase();
  const prompt = String(q.question || q.prompt || "").toLowerCase();

  // 1. Vocabulary (Words in Context)
  if (isVocabQuestion(q)) return 1;

  // 2. Reading — Craft & Structure (Text Structure and Purpose, Cross-Text Connections)
  if (dom === "CAS") return 2;

  // 3. Reading — Information and Ideas
  if (dom === "INI") return 3;

  // 4. Writing — Standard English Conventions (Grammar & Punctuation)
  if (dom === "SEC") return 4;

  // 5. Writing — Expression of Ideas (Transitions -> Rhetorical Synthesis)
  if (dom === "EOI") {
    if (skill.includes("transition") || skill === "tra" || /most logical transition/i.test(prompt)) {
      return 5;
    }
    return 6;
  }

  return 7;
}

function getDifficultyOrderRank(q) {
  const d = getDifficultyBucket(q);
  if (d === "easy") return 1;
  if (d === "medium") return 2;
  return 3;
}

function sortModuleQuestionsLikeBluebook(questions, section) {
  return questions
    .map((q, originalIdx) => ({ q, originalIdx }))
    .sort((a, b) => {
      if (section === "RW") {
        const rA = getRwBluebookOrderRank(a.q);
        const rB = getRwBluebookOrderRank(b.q);
        if (rA !== rB) return rA - rB;
      }
      const dA = getDifficultyOrderRank(a.q);
      const dB = getDifficultyOrderRank(b.q);
      if (dA !== dB) return dA - dB;
      return a.originalIdx - b.originalIdx;
    })
    .map(item => item.q);
}

function scoreQuestionList(questions) {
  let correct = 0;
  let answered = 0;
  questions.forEach((q, idx) => {
    const qId = getQuestionId(q, idx);
    const st = sessionState[qId] || {};
    const hasOpts = Array.isArray(q.options) && q.options.length > 0;
    const hasAns = hasOpts
      ? (st.selectedIndex !== null && st.selectedIndex !== undefined)
      : (st.textAnswer && st.textAnswer.trim() !== "");
    if (!hasAns) return;
    answered += 1;
    const isCorr = hasOpts
      ? st.selectedIndex === q.correctIndex
      : evaluateOpenAnswer(st.textAnswer, q.acceptedAnswers);
    if (isCorr) correct += 1;
  });
  return { correct, answered, total: questions.length };
}

function estimateSatSectionScore(mod1Correct, mod1Total, mod2Correct, mod2Total, track) {
  const totalQ = Math.max(1, mod1Total + mod2Total);
  const totalCorrect = mod1Correct + mod2Correct;
  const ratio = totalCorrect / totalQ;

  let rawScore;
  if (track === "hard") {
    // Upper (Hard) Module 2: scales from ~460 up to 800
    rawScore = 440 + ratio * 360;
  } else {
    // Lower (Easier) Module 2: caps around ~610 like Digital SAT adaptive routing
    rawScore = 200 + ratio * 410;
  }

  const clamped = Math.max(200, Math.min(800, rawScore));
  return Math.round(clamped / 10) * 10;
}

function startAdaptiveModule(config) {
  const section = config.section === "Math" ? "Math" : "RW";
  const domains = Array.isArray(config.domains) && config.domains.length ? config.domains : null;
  const countPerModule = Number(config.countPerModule) || (section === "Math" ? 22 : 27);
  const timerSeconds = Number(config.timerSeconds) || (section === "Math" ? 2100 : 1920);
  const mode = config.mode === "preset" ? "preset" : "random";
  const seed = config.seed || null;
  const selectedModule = config.selectedModule || (config.totalModules === 1 ? "m1" : "both");
  const totalModules = selectedModule === "both" ? 2 : 1;
  const title = config.title || (section === "Math" ? "Math Adaptive Module" : "R&W Adaptive Module");

  const pool = getModulePool(section, domains);
  if (!pool.length) {
    if (filterStatus) {
      filterStatus.textContent = "No questions available in your Question Bank for this module.";
      filterStatus.classList.remove("hidden");
    }
    return;
  }

  if (filterStatus) {
    filterStatus.classList.add("hidden");
    filterStatus.textContent = "";
  }

  activeSection = section;
  activeDomainFilter = domains ? domains.join(",") : "all";
  activeDifficultyFilter = "all";
  activeTimerSetting = String(timerSeconds);

  const isSingleM2 = selectedModule === "m2";
  const shuffleM1 = (arr, salt) =>
    mode === "preset" && seed
      ? seededShuffleArray(arr, `${seed}-${isSingleM2 ? "m2-hard" : "m1"}-${salt}`)
      : shuffleArray(arr);

  const actualM1Count = Math.min(countPerModule, Math.max(1, Math.floor(pool.length / 2)) || pool.length);
  const firstMixWeights = isSingleM2
    ? { hard: 0.65, medium: 0.30, easy: 0.05 }
    : { easy: 0.35, medium: 0.40, hard: 0.25 };

  const mod1Questions = sortModuleQuestionsLikeBluebook(
    selectQuestionsByMix(
      pool,
      pool.length >= countPerModule * 2 ? countPerModule : actualM1Count,
      firstMixWeights,
      shuffleM1
    ),
    section
  );

  activeModuleRun = {
    section,
    domains,
    countPerModule,
    timerSeconds,
    mode,
    seed,
    totalModules,
    selectedModule,
    title,
    stage: 1,
    module2Track: null,
    module1Questions: mod1Questions,
    module2Questions: [],
    module1Correct: 0,
    module1Total: mod1Questions.length,
    module2Correct: 0,
    module2Total: 0
  };
  lastAdaptiveConfig = { ...config };

  filteredQuestions = mod1Questions;
  currentIndex = 0;
  isPostTestReview = false;
  summaryReviewFilter = "all";

  Object.keys(sessionState).forEach(k => delete sessionState[k]);
  mod1Questions.forEach((q, idx) => {
    const qId = getQuestionId(q, idx);
    sessionState[qId] = {
      selectedIndex: null,
      textAnswer: "",
      checked: false,
      isCorrect: false,
      flagged: false,
      recordedInHistory: false
    };
  });

  const setupScreen = document.getElementById("section-setup-screen");
  if (setupScreen) setupScreen.classList.add("hidden");
  if (moduleTransitionModal) moduleTransitionModal.classList.add("hidden");
  menuScreen.classList.add("hidden");
  summaryScreen.classList.add("hidden");
  testScreen.classList.remove("hidden");
  setPickerOpen(false);

  sectionLabel.textContent =
    selectedModule === "m2"
      ? `${title} · Module 2`
      : selectedModule === "m1"
        ? `${title} · Module 1`
        : `${title} · Module 1`;
  configureTimerForQuestion(true);
  loadQuestion(0);
}

function finishModule1() {
  if (!activeModuleRun || activeModuleRun.stage !== 1) return;
  stopTimer();
  if (window.DesmosModule && typeof window.DesmosModule.close === "function") {
    window.DesmosModule.close();
  }
  setPickerOpen(false);

  const m1Score = scoreQuestionList(activeModuleRun.module1Questions);
  activeModuleRun.module1Correct = m1Score.correct;
  activeModuleRun.module1Total = m1Score.total;

  // Digital SAT adaptive routing threshold (~60% on Module 1 -> Hard Module 2)
  const m1Ratio = m1Score.total > 0 ? m1Score.correct / m1Score.total : 0;
  const track = m1Ratio >= 0.6 ? "hard" : "easier";
  activeModuleRun.module2Track = track;

  const m1Ids = new Set(activeModuleRun.module1Questions.map((q, idx) => getQuestionId(q, idx)));
  const fullPool = getModulePool(activeModuleRun.section, activeModuleRun.domains);
  const remainingPool = fullPool.filter(q => !m1Ids.has(getQuestionId(q)));
  const sourcePool = remainingPool.length > 0 ? remainingPool : fullPool;

  const shuffleM2 = (arr, salt) =>
    activeModuleRun.mode === "preset" && activeModuleRun.seed
      ? seededShuffleArray(arr, `${activeModuleRun.seed}-m2-${track}-${salt}`)
      : shuffleArray(arr);

  const weights =
    track === "hard"
      ? { hard: 0.65, medium: 0.30, easy: 0.05 }
      : { easy: 0.55, medium: 0.40, hard: 0.05 };

  const mod2Questions = sortModuleQuestionsLikeBluebook(
    selectQuestionsByMix(
      sourcePool,
      Math.min(activeModuleRun.countPerModule, sourcePool.length),
      weights,
      shuffleM2
    ),
    activeModuleRun.section
  );

  activeModuleRun.module2Questions = mod2Questions;
  activeModuleRun.module2Total = mod2Questions.length;

  mod2Questions.forEach((q, idx) => {
    const qId = getQuestionId(q, idx);
    if (!sessionState[qId]) {
      sessionState[qId] = {
        selectedIndex: null,
        textAnswer: "",
        checked: false,
        isCorrect: false,
        flagged: false,
        recordedInHistory: false
      };
    }
  });

  if (moduleTransitionModal) {
    if (modTransPill) modTransPill.textContent = "Module 1 Complete";
    if (modTransTitle) modTransTitle.textContent = "Ready for Adaptive Module 2?";
    if (modTransDesc) {
      modTransDesc.textContent =
        "Your Module 1 answers are locked. Module 2 has been adaptively generated based on your performance. Full results and explanations will appear after Module 2.";
    }
    if (modTransStats) {
      const mins = Math.round(activeModuleRun.timerSeconds / 60);
      modTransStats.innerHTML = `
        <div><strong>Module 2 Length:</strong> ${mod2Questions.length} questions · ⏱ ${mins} min</div>
      `;
    }
    moduleTransitionModal.classList.remove("hidden");
  } else {
    startModule2();
  }
}

function startModule2() {
  if (!activeModuleRun) return;
  if (moduleTransitionModal) moduleTransitionModal.classList.add("hidden");

  activeModuleRun.stage = 2;
  filteredQuestions = activeModuleRun.module2Questions;
  currentIndex = 0;

  sectionLabel.textContent = `${activeModuleRun.title} · Module 2`;
  activeTimerSetting = String(activeModuleRun.timerSeconds);
  configureTimerForQuestion(true);
  loadQuestion(0);
}

function finishSingleModuleAndShowSummary() {
  if (!activeModuleRun) {
    showSessionSummary();
    return;
  }
  const m1Score = scoreQuestionList(activeModuleRun.module1Questions);
  activeModuleRun.module1Correct = m1Score.correct;
  activeModuleRun.module1Total = m1Score.total;
  filteredQuestions = activeModuleRun.module1Questions;
  showSessionSummary();
}

function finishModule2AndShowSummary() {
  if (!activeModuleRun) {
    showSessionSummary();
    return;
  }
  const m2Score = scoreQuestionList(activeModuleRun.module2Questions);
  activeModuleRun.module2Correct = m2Score.correct;
  activeModuleRun.module2Total = m2Score.total;

  // Объединяем вопросы Module 1 и Module 2 для общего экрана Summary и полного разбора
  filteredQuestions = [
    ...activeModuleRun.module1Questions,
    ...activeModuleRun.module2Questions
  ];
  showSessionSummary();
}

window.startAdaptiveModule = startAdaptiveModule;

/* ---------- Session Summary ---------- */

function evaluateOpenAnswer(userAnswer, acceptedAnswers) {
  if (!userAnswer || !Array.isArray(acceptedAnswers) || !acceptedAnswers.length) return false;
  const evalFrac = s => {
    const clean = String(s).replace(/\s+/g, "").replace(/^[–—−]/, "-");
    if (/^-?\d+\/\d+$/.test(clean)) {
      const [n, d] = clean.split("/").map(Number);
      return d !== 0 ? n / d : NaN;
    }
    return Number(clean);
  };
  const uClean = String(userAnswer).trim().toLowerCase().replace(/^[–—−]/, "-");
  const uNum = evalFrac(uClean);
  return acceptedAnswers.some(ans => {
    const aClean = String(ans).trim().toLowerCase().replace(/^[–—−]/, "-");
    if (aClean === uClean) return true;
    const tNum = evalFrac(aClean);
    return Number.isFinite(uNum) && Number.isFinite(tNum) && Math.abs(uNum - tNum) < 1e-3;
  });
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

    const hasOpts = Array.isArray(q.options) && q.options.length > 0;
    const hasAnswered = hasOpts ? (st.selectedIndex !== null && st.selectedIndex !== undefined) : (st.textAnswer && st.textAnswer.trim() !== "");

    if (st.checked) {
      if (st.isCorrect) statsByDomain[code].correct += 1;
      else statsByDomain[code].wrong += 1;
    } else if (hasAnswered) {
      const isCorr = hasOpts
        ? st.selectedIndex === q.correctIndex
        : evaluateOpenAnswer(st.textAnswer, q.acceptedAnswers);
      if (isCorr) statsByDomain[code].correct += 1;
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
    const hasOpts = Array.isArray(q.options) && q.options.length > 0;
    const hasAnswered = hasOpts ? (st.selectedIndex !== null && st.selectedIndex !== undefined) : (st.textAnswer && st.textAnswer.trim() !== "");

    let status = "skipped";
    if (st.checked) {
      status = st.isCorrect ? "correct" : "wrong";
    } else if (hasAnswered) {
      const isCorr = hasOpts
        ? st.selectedIndex === q.correctIndex
        : evaluateOpenAnswer(st.textAnswer, q.acceptedAnswers);
      status = isCorr ? "correct" : "wrong";
    }

    let userAns = "Skipped";
    if (hasOpts) {
      if (st.selectedIndex !== null && st.selectedIndex !== undefined) {
        userAns = formatOptionText(q.options?.[st.selectedIndex] ?? "", st.selectedIndex);
      }
    } else if (st.textAnswer) {
      userAns = st.textAnswer;
    }

    const rightAns = hasOpts ? formatOptionText(q.options?.[q.correctIndex] ?? "", q.correctIndex) : ((q.acceptedAnswers || []).join(" or ") || "N/A");

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
          const qText = replaceBlurryMathImagesWithLatex(q.question || q.prompt || "");
          return `
            <div class="mistake-item ${isOk ? "is-correct" : ""}">
              <div>
                <div class="mistake-top-row">
                  <span class="mistake-meta">Q${idx + 1} · ${getDomainLabel(getDomainCode(q))} · ${tag}</span>
                  <button type="button" class="secondary-btn review-open-btn" data-q-index="${idx}">Review Question →</button>
                </div>
                <div class="mistake-question">${qText}</div>
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
  if (window.DesmosModule && typeof window.DesmosModule.close === 'function') window.DesmosModule.close();
  if (window.RefSheetModule && typeof window.RefSheetModule.close === 'function') window.RefSheetModule.close();
  setPickerOpen(false);

  let correct = 0;
  let wrong = 0;
  let skipped = 0;

  filteredQuestions.forEach((q, idx) => {
    const qId = getQuestionId(q, idx);
    const st = sessionState[qId] || {};
    const hasOpts = Array.isArray(q.options) && q.options.length > 0;
    const hasAnswered = hasOpts ? (st.selectedIndex !== null && st.selectedIndex !== undefined) : (st.textAnswer && st.textAnswer.trim() !== "");

    if (st.checked) {
      if (st.isCorrect) correct += 1;
      else wrong += 1;
    } else if (hasAnswered) {
      const isCorrect = hasOpts
        ? st.selectedIndex === q.correctIndex
        : evaluateOpenAnswer(st.textAnswer, q.acceptedAnswers);
      if (isCorrect) correct += 1;
      else wrong += 1;
      if (!st.recordedInHistory) {
        recordAttemptInHistory(q, isCorrect, idx);
        st.recordedInHistory = true;
      }
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
  if (activeModuleRun) {
    summarySubtitleEl.textContent = `${activeModuleRun.title} · ${filteredQuestions.length} questions total`;
    if (adaptiveScoreBanner) {
      adaptiveScoreBanner.classList.remove("hidden");
      if (activeModuleRun.totalModules === 1) {
        const singleLbl = activeModuleRun.selectedModule === "m2" ? "Module 2" : "Module 1";
        adaptiveScoreBanner.innerHTML = `
          <div class="adaptive-track-pills">
            <span class="adaptive-track-pill">${singleLbl}: ${activeModuleRun.module1Correct}/${activeModuleRun.module1Total}</span>
          </div>
        `;
      } else {
        const trackLabel =
          activeModuleRun.module2Track === "hard"
            ? "Upper (Hard) Module 2"
            : "Lower (Standard) Module 2";
        adaptiveScoreBanner.innerHTML = `
          <div class="adaptive-track-pills">
            <span class="adaptive-track-pill">Module 1: ${activeModuleRun.module1Correct}/${activeModuleRun.module1Total}</span>
            <span class="adaptive-track-pill">Module 2: ${activeModuleRun.module2Correct}/${activeModuleRun.module2Total}</span>
            <span class="adaptive-track-pill ${activeModuleRun.module2Track === "hard" ? "upper" : "lower"}">Route: ${trackLabel}</span>
          </div>
        `;
      }
    }
  } else {
    const domName = activeDomainFilter === "all" ? "All Topics" : getDomainLabel(activeDomainFilter);
    summarySubtitleEl.textContent = `${secName} · ${domName} · ${filteredQuestions.length} questions`;
    if (adaptiveScoreBanner) {
      adaptiveScoreBanner.classList.add("hidden");
      adaptiveScoreBanner.innerHTML = "";
    }
  }

  renderDomainBreakdown();
  renderSummaryReviewList();

  testScreen.classList.add("hidden");
  menuScreen.classList.add("hidden");
  summaryScreen.classList.remove("hidden");

  renderAllMath();
}

function returnToMenu() {
  stopTimer();
  if (window.DesmosModule && typeof window.DesmosModule.close === 'function') window.DesmosModule.close();
  if (window.RefSheetModule && typeof window.RefSheetModule.close === 'function') window.RefSheetModule.close();
  isPostTestReview = false;
  activeModuleRun = null;
  setPickerOpen(false);
  if (exitModal) exitModal.classList.add("hidden");
  if (moduleTransitionModal) moduleTransitionModal.classList.add("hidden");
  const setupScreen = document.getElementById("section-setup-screen");
  if (setupScreen) setupScreen.classList.add("hidden");
  testScreen.classList.add("hidden");
  summaryScreen.classList.add("hidden");
  menuScreen.classList.remove("hidden");
  renderMenuHistoryDashboard();
}

/* ---------- Events & Init ---------- */

function initEvents() {
  document.querySelectorAll(".start-btn").forEach(btn => {
    btn.onclick = () => {
      const sec = btn.dataset.section || "RW";
      openSectionSetup(sec);
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
        if (window.DesmosModule && typeof window.DesmosModule.close === 'function') window.DesmosModule.close();
  if (window.RefSheetModule && typeof window.RefSheetModule.close === 'function') window.RefSheetModule.close();
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
      if (isAdaptiveExamMode()) return;
      const q = filteredQuestions[currentIndex];
      if (!q) return;
      const qId = getQuestionId(q, currentIndex);
      const st = sessionState[qId];
      if (!st) return;

      const hasOpts = Array.isArray(q.options) && q.options.length > 0;
      if (hasOpts) {
        if (st.selectedIndex === null) return;
        st.isCorrect = st.selectedIndex === q.correctIndex;
      } else {
        if (!st.textAnswer) return;
        st.isCorrect = evaluateOpenAnswer(st.textAnswer, q.acceptedAnswers);
      }

      st.checked = true;
      if (!st.recordedInHistory) {
        recordAttemptInHistory(q, st.isCorrect, currentIndex);
        st.recordedInHistory = true;
      }
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
      } else if (isAdaptiveExamMode()) {
        if (activeModuleRun.totalModules === 1) {
          finishSingleModuleAndShowSummary();
        } else if (activeModuleRun.stage === 1) {
          finishModule1();
        } else {
          finishModule2AndShowSummary();
        }
      } else {
        showSessionSummary();
      }
    };
  }

  if (startModule2Btn) {
    startModule2Btn.onclick = () => {
      startModule2();
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
      if (lastAdaptiveConfig) {
        startAdaptiveModule(lastAdaptiveConfig);
      } else {
        startSession();
      }
    };
  }

  if (summaryMenuBtn) {
    summaryMenuBtn.onclick = () => {
      returnToMenu();
    };
  }

  document.addEventListener("click", e => {
    const btnEl = e.target.closest("button, a");
    const isTopBarDesmos = btnEl && btnEl.closest(".top-bar") && /\b(?:desmos|calculator)\b/i.test((btnEl.textContent || "").trim());
    const desmosTrigger = e.target.closest("#open-desmos-btn, #desmosBtn, [data-desmos], [data-action='desmos']") || (isTopBarDesmos ? btnEl : null);
    if (desmosTrigger && window.DesmosModule) {
      e.preventDefault();
      const currentQ = Array.isArray(filteredQuestions) ? filteredQuestions[currentIndex] : null;
      if (typeof window.DesmosModule.toggle === 'function') window.DesmosModule.toggle();
      else window.DesmosModule.open(currentQ?.desmosExpressions);
    }
  });
}

function parseQuestionsPayload(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.questions)) return data.questions;
  return [];
}

function mapMathDomainCode(domain) {
  const d = String(domain || "").trim().toLowerCase();
  if (d === "alg" || (d.includes("algebra") && !d.includes("advanced"))) return "ALG";
  if (d === "adv" || d.includes("advanced math")) return "ADV";
  if (d === "psd" || d.includes("problem-solving") || d.includes("data analysis")) return "PSD";
  if (d === "geo" || d.includes("geometry") || d.includes("trigonometry")) return "GEO";
  return domain || "ALG";
}

function cleanScrapedMathText(raw) {
  let text = String(raw ?? "").replace(/\r\n/g, "\n").replace(/\u00a0/g, " ");
  text = text.replace(/^Exclude Active Questions\s+Skill filter tooltip\s*/i, "");
  text = text.replace(/\n?\s*Back\s*\n\s*Show correct answer and explanation[\s\S]*$/i, "");
  text = text.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return text;
}

function normalizeScrapedOptions(rawOptions) {
  if (!Array.isArray(rawOptions)) return [];
  const result = [];

  for (const rawOpt of rawOptions) {
    const rawStr = String(typeof rawOpt === "string" ? rawOpt : (rawOpt?.text ?? rawOpt?.label ?? "")).trim();
    if (!rawStr) continue;

    if (/<[a-z][\s\S]*>/i.test(rawStr)) {
      result.push(rawStr);
      continue;
    }

    const chunks = rawStr
      .split(/\r?\n+/)
      .map(s => s.replace(/^[A-Da-d]\s*[).:-]\s*/, "").trim())
      .filter(Boolean);

    for (let val of chunks) {
      if (!val || /^[A-Da-d][).:-]?$/i.test(val)) continue;
      if (!result.includes(val)) {
        result.push(val);
      }
    }
  }

  return result.slice(0, 4);
}

function extractAcceptedAnswersFromExplanation(expHtml) {
  if (!expHtml) return [];
  const plain = replaceBlurryMathImagesWithLatex(expHtml)
    .replace(/<[^>]+>/g, " ")
    .replace(/&ndash;|&#8211;/gi, "-")
    .replace(/&minus;|&#8722;/gi, "-")
    .replace(/\s+/g, " ")
    .trim();

  const list = [];
  const m1 = plain.match(/The correct answer is\s+\$?([^\s$.,;]+)\$?/i);
  if (m1 && m1[1]) {
    const ans = m1[1].replace(/^\$+|\$+$/g, "").trim();
    if (ans) list.push(ans);
  }
  const m2 = plain.match(/Note that\s+(.+?)\s+are examples of ways to enter a correct answer/i);
  if (m2 && m2[1]) {
    m2[1]
      .split(/,|and|\bor\b/i)
      .map(s => s.replace(/\$+/g, "").trim())
      .filter(Boolean)
      .forEach(v => {
        if (!list.includes(v)) list.push(v);
      });
  }
  return list;
}

function normalizeQuestionItem(rawItem, index = 0) {
  if (!rawItem || typeof rawItem !== "object") return null;

  const hasContent =
    String(rawItem.question || rawItem.prompt || rawItem.passage || rawItem.passageHtml || rawItem.stimulus || "").trim().length > 0 ||
    (Array.isArray(rawItem.options) && rawItem.options.length > 0) ||
    (Array.isArray(rawItem.choices) && rawItem.choices.length > 0);

  if (!hasContent) return null;

  const base = { ...rawItem };
  const section = base.section === "Math" ? "Math" : "RW";
  const mappedDomain = section === "Math" ? mapMathDomainCode(base.domain) : (base.domain || "INI");

  const rawOptsSource = Array.isArray(base.options)
    ? base.options
    : Array.isArray(base.choices)
      ? base.choices
      : [];
  const normalizedOptions = normalizeScrapedOptions(rawOptsSource);

  const resolvedCorrect =
    typeof base.correctIndex === "number"
      ? base.correctIndex
      : typeof base.correct === "number"
        ? base.correct
        : 0;

  let rawAccepted =
    base.acceptedAnswers ||
    base.accepted_answers ||
    (base.correct_answer && !["A", "B", "C", "D"].includes(String(base.correct_answer).toUpperCase())
      ? [String(base.correct_answer)]
      : []);
  let acceptedAnswers = Array.isArray(rawAccepted) ? rawAccepted.map(String).filter(Boolean) : [];

  if (section === "Math" && normalizedOptions.length === 0 && acceptedAnswers.length === 0) {
    acceptedAnswers = extractAcceptedAnswersFromExplanation(base.explanation || base.rationale || "");
  }

  return {
    ...base,
    id: base.id || `q_${index}`,
    section,
    domain: mappedDomain,
    difficulty: base.difficulty || "Medium",
    options: normalizedOptions,
    correctIndex: resolvedCorrect,
    acceptedAnswers
  };
}

async function initApp() {
  injectAppStyles();
  initDraggableDesmosWindow();
  initDraggableRefSheetWindow();
  initRwHighlighter();
  initEvents();
  populateDomainOptions(activeSection);
  renderMenuHistoryDashboard();

  const [rwRes, mathRes] = await Promise.allSettled([
    fetch("questions.json").then(r =>
      r.ok ? r.json() : Promise.reject(new Error(`questions.json HTTP ${r.status}`))
    ),
    fetch("questions_math.json").then(r =>
      r.ok ? r.json() : Promise.reject(new Error(`questions_math.json HTTP ${r.status}`))
    )
  ]);

  let loadedAny = false;
  const rwQuestions = [];
  if (rwRes.status === "fulfilled") {
    loadedAny = true;
    const rwSeen = new Set();
    parseQuestionsPayload(rwRes.value).forEach((item, i) => {
      const norm = normalizeQuestionItem(item, i);
      if (!norm) return;
      if (getSectionFromQuestion(norm) !== "RW") return;
      if (rwSeen.has(norm.id)) return;
      rwSeen.add(norm.id);
      rwQuestions.push(norm);
    });
  }

  const mathQuestions = [];
  if (mathRes.status === "fulfilled") {
    loadedAny = true;
    const mathSeen = new Set();
    parseQuestionsPayload(mathRes.value).forEach((item, i) => {
      const forcedMathItem = { ...item, section: "Math" };
      const norm = normalizeQuestionItem(forcedMathItem, i);
      if (!norm) return;
      if (mathSeen.has(norm.id)) return;
      mathSeen.add(norm.id);
      mathQuestions.push(norm);
    });
  }

  allQuestions = [...rwQuestions, ...mathQuestions];

  if (!loadedAny && filterStatus) {
    filterStatus.textContent = "Could not load questions JSON files. Run via a local server.";
    filterStatus.classList.add("hidden");
  }

  renderMenuHistoryDashboard();
}


/* ---------- Question Bank Smart Practice, Domain Launch & ID Search ---------- */

function startCustomQuestionSession(questionsList, labelText, sectionOverride = null) {
  if (!Array.isArray(questionsList) || !questionsList.length) {
    if (filterStatus) {
      filterStatus.textContent = "No matching questions available for this set.";
      filterStatus.classList.remove("hidden");
    }
    return false;
  }

  if (filterStatus) {
    filterStatus.classList.add("hidden");
    filterStatus.textContent = "";
  }

  activeModuleRun = null;
  lastAdaptiveConfig = null;
  activeSection = sectionOverride || getSectionFromQuestion(questionsList[0]);
  activeTimerSetting = "off";
  filteredQuestions = questionsList;
  currentIndex = 0;
  isPostTestReview = false;
  summaryReviewFilter = "all";

  Object.keys(sessionState).forEach(k => delete sessionState[k]);
  filteredQuestions.forEach((q, idx) => {
    const qId = getQuestionId(q, idx);
    sessionState[qId] = {
      selectedIndex: null,
      textAnswer: "",
      checked: false,
      isCorrect: false,
      flagged: false,
      recordedInHistory: false
    };
  });

  const setupScreen = document.getElementById("section-setup-screen");
  if (setupScreen) setupScreen.classList.add("hidden");
  if (moduleTransitionModal) moduleTransitionModal.classList.add("hidden");
  menuScreen.classList.add("hidden");
  summaryScreen.classList.add("hidden");
  testScreen.classList.remove("hidden");
  setPickerOpen(false);

  sectionLabel.textContent = labelText || (activeSection === "Math" ? "Math" : "Reading & Writing");
  configureTimerForQuestion(true);
  loadQuestion(0);
  return true;
}

function getQuestionBankStats() {
  const history = loadHistory();
  const hMap = history.questions || {};

  let rwTotal = 0;
  let rwSolved = 0;
  let mathTotal = 0;
  let mathSolved = 0;
  let missedCount = 0;
  let unsolvedCount = 0;

  const domains = {};
  Object.entries(DOMAIN_META).forEach(([code, meta]) => {
    domains[code] = {
      code,
      label: meta.label,
      section: meta.section,
      total: 0,
      solved: 0,
      attempts: 0,
      correct: 0,
      acc: null
    };
  });

  allQuestions.forEach((q, idx) => {
    const sec = getSectionFromQuestion(q);
    const dom = getDomainCode(q);
    const key = getStableQuestionKey(q, idx);
    const rec = hMap[key];
    const isSolved = Boolean(rec && rec.attempts > 0);
    const isMissed = Boolean(rec && (rec.everMissed || rec.lastResult === "wrong"));

    if (sec === "Math") {
      mathTotal += 1;
      if (isSolved) mathSolved += 1;
    } else {
      rwTotal += 1;
      if (isSolved) rwSolved += 1;
    }

    if (isMissed) missedCount += 1;
    if (!isSolved) unsolvedCount += 1;

    if (domains[dom]) {
      domains[dom].total += 1;
      if (isSolved) {
        domains[dom].solved += 1;
        domains[dom].attempts += rec.attempts || 0;
        domains[dom].correct += rec.correct || 0;
      }
    }
  });

  let weakestDomain = null;
  Object.values(domains).forEach(d => {
    if (d.attempts > 0) {
      d.acc = Math.round((d.correct / d.attempts) * 100);
      if (!weakestDomain || d.acc < weakestDomain.acc) {
        weakestDomain = d;
      }
    }
  });

  return {
    rwTotal,
    rwSolved,
    mathTotal,
    mathSolved,
    missedCount,
    unsolvedCount,
    weakestDomain,
    domains
  };
}

function startUnsolvedQuestionsSession(limit = 20) {
  const history = loadHistory();
  const hMap = history.questions || {};
  const pool = allQuestions.filter((q, idx) => {
    const rec = hMap[getStableQuestionKey(q, idx)];
    return !rec || !rec.attempts;
  });
  const picked = shuffleArray(pool).slice(0, Math.min(limit, pool.length));
  return startCustomQuestionSession(picked, "Unsolved Questions");
}

function startHardestDrillsSession(limit = 15) {
  const pool = allQuestions.filter(
    q => String(q.difficulty || "").trim().toLowerCase() === "hard"
  );
  const picked = shuffleArray(pool).slice(0, Math.min(limit, pool.length));
  return startCustomQuestionSession(picked, "Hardest Drills");
}

function startTopicQuickSession(section, domainCode, limit = 20) {
  const sec = section === "Math" ? "Math" : "RW";
  activeSection = sec;
  activeDomainFilter = domainCode;
  activeDifficultyFilter = "all";
  activeCountFilter = String(limit);
  activeTimerSetting = "off";

  const pool = allQuestions.filter(
    q => getSectionFromQuestion(q) === sec && getDomainCode(q) === domainCode
  );
  const picked = shuffleArray(pool).slice(0, Math.min(limit, pool.length));
  return startCustomQuestionSession(picked, `${sec === "Math" ? "Math" : "R&W"} · ${getDomainLabel(domainCode)}`, sec);
}

function openQuestionById(rawQuery) {
  const qStr = String(rawQuery || "").trim().toLowerCase();
  if (!qStr) return { found: false };

  let match = allQuestions.find(q => String(q.id || "").trim().toLowerCase() === qStr);
  if (!match) {
    match = allQuestions.find(q => String(q.id || "").trim().toLowerCase().includes(qStr));
  }
  if (!match) return { found: false };

  const sec = getSectionFromQuestion(match);
  startCustomQuestionSession([match], `Question ID: ${match.id}`, sec);
  return { found: true, id: match.id };
}

window.getQuestionBankStats = getQuestionBankStats;
window.startMissedQuestionsSession = startMissedQuestionsSession;
window.startUnsolvedQuestionsSession = startUnsolvedQuestionsSession;
window.startHardestDrillsSession = startHardestDrillsSession;
window.startTopicQuickSession = startTopicQuickSession;
window.openQuestionById = openQuestionById;

window.addEventListener("DOMContentLoaded", initApp);
