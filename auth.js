import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
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

let currentUser = null;
let syncTimer = null;
let isRestoring = false;

// --- 1. Сбор и восстановление localStorage ---
function collectLocalProgress() {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    // Исключаем внутренние ключи Firebase, чтобы не дублировать их
    if (key && !key.startsWith("firebase:")) {
      data[key] = localStorage.getItem(key);
    }
  }
  return data;
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

// Автоматический перехват любых сохранений в localStorage
const originalSetItem = localStorage.setItem.bind(localStorage);
const originalRemoveItem = localStorage.removeItem.bind(localStorage);
const originalClear = localStorage.clear.bind(localStorage);

localStorage.setItem = function (key, value) {
  originalSetItem(key, value);
  if (!key.startsWith("firebase:")) scheduleCloudSync();
};

localStorage.removeItem = function (key) {
  originalRemoveItem(key);
  if (!key.startsWith("firebase:")) scheduleCloudSync();
};

localStorage.clear = function () {
  originalClear();
  scheduleCloudSync();
};

async function syncOnLogin(user) {
  const userRef = doc(db, "users", user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists() && snap.data().storage) {
    const cloudStorage = snap.data().storage;
    let changed = false;

    isRestoring = true;
    for (const [key, val] of Object.entries(cloudStorage)) {
      if (localStorage.getItem(key) !== val) {
        originalSetItem(key, val);
        changed = true;
      }
    }
    isRestoring = false;

    // Если подтянулись новые данные из облака — один раз обновим страницу,
    // чтобы Dashboard и Vocabulary сразу их отобразили
    if (changed && sessionStorage.getItem("sat_synced_uid") !== user.uid) {
      sessionStorage.setItem("sat_synced_uid", user.uid);
      window.location.reload();
    }
  } else {
    // Первый вход нового пользователя: сохраняем его текущий локальный прогресс в облако
    sessionStorage.setItem("sat_synced_uid", user.uid);
    await saveProgressToCloud();
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
      <button class="auth-close" id="auth-close-btn" aria-label="Close">&times;</button>
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
      title.textContent = "Sign In";
      subtitle.textContent = "Sync your SAT progress across devices";
      submitBtn.textContent = "Sign In";
      forgotBtn.textContent = "Forgot Password?";
    } else if (mode === "register") {
      tabs.style.display = "flex";
      passWrap.style.display = "block";
      passInput.required = true;
      title.textContent = "Create Account";
      subtitle.textContent = "Save your tests, dashboard & vocabulary";
      submitBtn.textContent = "Create Account";
      forgotBtn.textContent = "Forgot Password?";
    } else {
      tabs.style.display = "none";
      passWrap.style.display = "none";
      passInput.required = false;
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
      await saveProgressToCloud();
      sessionStorage.removeItem("sat_synced_uid");
      await signOut(auth);
    });
  } else {
    widget.innerHTML = `
      <button class="auth-btn" id="auth-open-btn">Sign In / Sync</button>
    `;
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
    renderAuthWidget(user);
    if (user) {
      await syncOnLogin(user);
    }
  });
});