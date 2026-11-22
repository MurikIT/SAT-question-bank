import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDAbxgbFQAnMntaPXzgsB5glxhmw3k4S8g",
  authDomain: "sattutor-1600.firebaseapp.com",
  projectId: "sattutor-1600",
  storageBucket: "sattutor-1600.firebasestorage.app",
  messagingSenderId: "442722499159",
  appId: "1:442722499159:web:a347920a6c9a39f6874112"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

let currentUser = null;
let authReady = false;
let syncTimer = null;
let isRestoring = false;

// Временное хранилище в памяти для гостей (сбрасывается при перезагрузке страницы)
const guestMemory = new Map();

const originalGetItem = localStorage.getItem.bind(localStorage);
const originalSetItem = localStorage.setItem.bind(localStorage);
const originalRemoveItem = localStorage.removeItem.bind(localStorage);
const originalClear = localStorage.clear.bind(localStorage);

// Ключи, которые не относятся к прогрессу (служебные Firebase и тема оформления)
function isPreservedKey(key) {
  if (!key) return true;
  return key.startsWith("firebase:") || /theme/i.test(key);
}

// --- 1. Сбор, очистка и восстановление localStorage ---
function collectLocalProgress() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !isPreservedKey(key)) {
      data[key] = originalGetItem(key);
    }
  }
  return data;
}

function clearLocalProgress() {
  isRestoring = true;
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && !isPreservedKey(key)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => originalRemoveItem(k));
  guestMemory.clear();
  isRestoring = false;
}

function hasSavedUserProgress() {
  const progressKeys = [
    "sat_question_bank_history_v1",
    "sat_vocab_progress_v1",
    "sat_vocab_custom_v1",
    "sat_vocab_match_best_v1",
    "sat_vocab_blitz_best_v1",
    "sat_daily_plan_v1"
  ];
  return progressKeys.some((k) => originalGetItem(k) !== null);
}

async function saveProgressToCloud() {
  if (!currentUser || isRestoring) return;
  try {
    const progress = collectLocalProgress();
    await setDoc(
      doc(db, "users", currentUser.uid),
      {
        email: currentUser.email,
        updatedAt: new Date().toISOString(),
        storage: progress
      },
      { merge: true }
    );
  } catch (err) {
    console.error("Cloud sync save error:", err);
  }
}

function scheduleCloudSync() {
  if (!currentUser || isRestoring) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(saveProgressToCloud, 1200);
}

// Перехватываем localStorage:
// — если пользователь вошёл в аккаунт: сохраняем в localStorage + синхронизируем с облаком
// — если пользователь не вошёл (гость): держим прогресс только в RAM до перезагрузки страницы
localStorage.getItem = function (key) {
  if (authReady && !currentUser && !isPreservedKey(key)) {
    return guestMemory.has(key) ? guestMemory.get(key) : null;
  }
  return originalGetItem(key);
};

localStorage.setItem = function (key, value) {
  if (authReady && !currentUser && !isPreservedKey(key)) {
    guestMemory.set(key, String(value));
    return;
  }
  originalSetItem(key, value);
  if (!isPreservedKey(key)) scheduleCloudSync();
};

localStorage.removeItem = function (key) {
  if (authReady && !currentUser && !isPreservedKey(key)) {
    guestMemory.delete(key);
    return;
  }
  originalRemoveItem(key);
  if (!isPreservedKey(key)) scheduleCloudSync();
};

localStorage.clear = function () {
  if (authReady && !currentUser) {
    guestMemory.clear();
    return;
  }
  originalClear();
  scheduleCloudSync();
};

async function syncOnLogin(user) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);
  const alreadySynced = sessionStorage.getItem("sat_synced_uid") === user.uid;

  if (snap.exists() && snap.data().storage) {
    const cloudStorage = snap.data().storage;
    let changed = false;

    isRestoring = true;
    // Удаляем локальные ключи, которых нет в облаке (чтобы не смешались аккаунты)
    const localKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && !isPreservedKey(k)) localKeys.push(k);
    }
    localKeys.forEach((k) => {
      if (!(k in cloudStorage)) {
        originalRemoveItem(k);
        changed = true;
      }
    });

    for (const [key, val] of Object.entries(cloudStorage)) {
      if (isPreservedKey(key)) continue;
      if (originalGetItem(key) !== val) {
        originalSetItem(key, val);
        changed = true;
      }
    }
    guestMemory.clear();
    isRestoring = false;

    if (!alreadySynced) {
      sessionStorage.setItem("sat_synced_uid", user.uid);
      if (changed) {
        window.location.reload();
      }
    }
  } else {
    // Новый аккаунт — начинаем с чистого прогресса и создаём запись в облаке
    if (!alreadySynced) {
      clearLocalProgress();
      sessionStorage.setItem("sat_synced_uid", user.uid);
      await saveProgressToCloud();
    }
  }
}

// --- 2. Интерфейс (кнопка + модальное окно) ---
function createAuthUI() {
  const widget = document.createElement("div");
  widget.id = "auth-widget";
  document.body.appendChild(widget);

  const overlay = document.createElement("div");
  overlay.id = "auth-modal-overlay";
  overlay.innerHTML = `
    <div class="auth-modal">
      <button class="auth-close" id="auth-close-btn" aria-label="Close">×</button>
      <h2 id="auth-title">Sign In</h2>
      <p class="auth-subtitle" id="auth-subtitle">Sync your SAT progress across devices</p>

      <div class="auth-tabs" id="auth-tabs">
        <button class="auth-tab active" data-mode="login">Sign In</button>
        <button class="auth-tab" data-mode="register">Sign Up</button>
      </div>

      <form id="auth-form">
        <div class="auth-field">
          <label for="auth-email">Email</label>
          <input type="email" id="auth-email" required placeholder="you@example.com" />
        </div>
        <div class="auth-field" id="auth-password-wrap">
          <label for="auth-password">Password</label>
          <input type="password" id="auth-password" minlength="6" required placeholder="Min. 6 characters" />
        </div>
        <button type="submit" class="auth-submit" id="auth-submit-btn">Sign In</button>
      </form>

      <div id="auth-google-section">
        <div class="auth-divider"><span>or</span></div>
        <button type="button" class="auth-google-btn" id="auth-google-btn">
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          <span>Continue with Google</span>
        </button>
      </div>

      <button type="button" class="auth-link" id="auth-forgot-btn">Forgot Password?</button>
      <div class="auth-message" id="auth-message"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  let mode = "login"; // 'login' | 'register' | 'reset'
  const form = document.getElementById("auth-form");
  const title = document.getElementById("auth-title");
  const subtitle = document.getElementById("auth-subtitle");
  const tabs = document.getElementById("auth-tabs");
  const passWrap = document.getElementById("auth-password-wrap");
  const passInput = document.getElementById("auth-password");
  const emailInput = document.getElementById("auth-email");
  const submitBtn = document.getElementById("auth-submit-btn");
  const googleSection = document.getElementById("auth-google-section");
  const googleBtn = document.getElementById("auth-google-btn");
  const forgotBtn = document.getElementById("auth-forgot-btn");
  const msgBox = document.getElementById("auth-message");

  function showMsg(text, type) {
    msgBox.textContent = text;
    msgBox.className = `auth-message ${type}`;
  }

  function clearMsg() {
    msgBox.textContent = "";
    msgBox.className = "auth-message";
  }

  function setMode(newMode) {
    mode = newMode;
    clearMsg();
    document.querySelectorAll(".auth-tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.mode === mode);
    });

    if (mode === "login") {
      tabs.style.display = "flex";
      passWrap.style.display = "block";
      passInput.required = true;
      googleSection.style.display = "block";
      forgotBtn.style.display = "inline-block";
      title.textContent = "Sign In";
      subtitle.textContent = "Sync your SAT progress across devices";
      submitBtn.textContent = "Sign In";
      forgotBtn.textContent = "Forgot Password?";
    } else if (mode === "register") {
      tabs.style.display = "flex";
      passWrap.style.display = "block";
      passInput.required = true;
      googleSection.style.display = "block";
      forgotBtn.style.display = "none";
      title.textContent = "Create Account";
      subtitle.textContent = "Save your tests, dashboard & vocabulary";
      submitBtn.textContent = "Create Account";
    } else {
      tabs.style.display = "none";
      passWrap.style.display = "none";
      passInput.required = false;
      googleSection.style.display = "none";
      forgotBtn.style.display = "inline-block";
      title.textContent = "Reset Password";
      subtitle.textContent = "Enter your email to receive a reset link";
      submitBtn.textContent = "Send Reset Email";
      forgotBtn.textContent = "← Back to Sign In";
    }
  }

  tabs.addEventListener("click", (e) => {
    if (e.target.classList.contains("auth-tab")) {
      setMode(e.target.dataset.mode);
    }
  });

  forgotBtn.addEventListener("click", () => {
    setMode(mode === "reset" ? "login" : "reset");
  });

  document.getElementById("auth-close-btn").addEventListener("click", () => {
    overlay.classList.remove("open");
  });

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.classList.remove("open");
  });

  googleBtn.addEventListener("click", async () => {
    clearMsg();
    googleBtn.disabled = true;
    try {
      await signInWithPopup(auth, googleProvider);
      overlay.classList.remove("open");
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        const cleanErr = err.code ? err.code.replace("auth/", "").replaceAll("-", " ") : err.message;
        showMsg(`Error: ${cleanErr}`, "error");
      }
    } finally {
      googleBtn.disabled = false;
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearMsg();
    const email = emailInput.value.trim();
    const password = passInput.value;

    submitBtn.disabled = true;
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
        overlay.classList.remove("open");
      } else if (mode === "register") {
        await createUserWithEmailAndPassword(auth, email, password);
        overlay.classList.remove("open");
      } else if (mode === "reset") {
        await sendPasswordResetEmail(auth, email);
        showMsg("Reset link sent! Check your inbox (and Spam folder).", "success");
      }
    } catch (err) {
      const cleanErr = err.code ? err.code.replace("auth/", "").replaceAll("-", " ") : err.message;
      showMsg(`Error: ${cleanErr}`, "error");
    } finally {
      submitBtn.disabled = false;
    }
  });

  window.openAuthModal = (initialMode = "login") => {
    setMode(initialMode);
    overlay.classList.add("open");
  };
}

function renderAuthWidget(user) {
  const widget = document.getElementById("auth-widget");
  if (!widget) return;

  if (user) {
    widget.innerHTML = `
      <div class="auth-user-pill" title="Cloud sync active">
        <span class="auth-sync-dot"></span>
        <span>${user.email}</span>
      </div>
      <button class="auth-btn secondary" id="auth-logout-btn">Sign Out</button>
    `;
    document.getElementById("auth-logout-btn").addEventListener("click", async () => {
      clearTimeout(syncTimer);
      await saveProgressToCloud();
      clearLocalProgress();
      sessionStorage.removeItem("sat_synced_uid");
      await signOut(auth);
      window.location.reload();
    });
  } else {
    widget.innerHTML = `<button class="auth-btn" id="auth-open-btn">Sign In / Sync</button>`;
    document.getElementById("auth-open-btn").addEventListener("click", () => {
      window.openAuthModal("login");
    });
  }
}

// --- 3. Запуск ---
document.addEventListener("DOMContentLoaded", () => {
  createAuthUI();

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    authReady = true;
    renderAuthWidget(user);

    if (user) {
      await syncOnLogin(user);
    } else {
      sessionStorage.removeItem("sat_synced_uid");
      const hadProgress = hasSavedUserProgress();
      clearLocalProgress();
      if (hadProgress) {
        window.location.reload();
      }
    }
  });
});
