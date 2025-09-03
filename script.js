// script.js

// ===== Config =====
const API_URL = "https://regret-backend.onrender.com";

// ===== DOM =====
const registerForm   = document.getElementById("register-form");
const loginForm      = document.getElementById("login-form");
const regretForm     = document.getElementById("regret-form");
const regretList     = document.getElementById("regret-list");
const authSection    = document.getElementById("auth-section");
const regretSection  = document.getElementById("regret-section");
const toneSelect     = document.getElementById("tone-select");
const formError      = document.getElementById("form-error");
const logoutBtn      = document.getElementById("logout-btn");
const anonCheckbox   = document.getElementById("anonymous-checkbox");

// ===== Auth state =====
let token = localStorage.getItem("token") || "";

// ===== Helpers =====
function showAuth() {
  authSection.style.display = "block";
  regretSection.style.display = "none";
  logoutBtn.style.display = "none";
}

function showApp() {
  authSection.style.display = "none";
  regretSection.style.display = "block";
  logoutBtn.style.display = "inline-flex";
}

function setError(msg = "") {
  formError.textContent = msg || "";
}

async function api(path, options = {}) {
  const opts = {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  };
  const res = await fetch(`${API_URL}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = data?.error || `Request failed: ${res.status}`;
    throw new Error(err);
  }
  return data;
}

// ===== Tones =====
async function fetchTones() {
  toneSelect.innerHTML = `<option value="">Loading tones…</option>`;
  try {
    const tones = await api("/api/tones", { method: "GET" });
    if (!Array.isArray(tones) || tones.length === 0) {
      toneSelect.innerHTML = `<option value="">No tones available</option>`;
      return;
    }
    toneSelect.innerHTML = `<option value="">Select a tone</option>`;
    tones.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t.name;
      opt.textContent = `${t.name} (${t.category})`;
      toneSelect.appendChild(opt);
    });
  } catch (e) {
    toneSelect.innerHTML = `<option value="">Failed to load tones</option>`;
    console.error(e);
  }
}

// ===== Messages =====
async function loadRegrets() {
  try {
    const regrets = await api("/api/messages", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    regretList.innerHTML = "";
    regrets.forEach((r) => {
      const li = document.createElement("li");
      const tone = r.tone ? ` — ${r.tone}` : "";
      li.textContent = `${r.username}: ${r.text}${tone}`;
      regretList.appendChild(li);
    });
  } catch (e) {
    alert(e.message);
  }
}

// ===== Event handlers =====
registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("register-username").value.trim();
  const password = document.getElementById("register-password").value;

  try {
    const data = await api("/api/register", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    alert(data.message || "Registered");
  } catch (e) {
    alert(e.message);
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;

  try {
    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    token = data.token;
    localStorage.setItem("token", token);

    showApp();
    await fetchTones();
    await loadRegrets();
  } catch (e) {
    alert(e.message || "Login failed");
  }
});

regretForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  setError("");

  const text = document.getElementById("regret-text").value.trim();
  const tone = toneSelect.value;
  const is_anonymous = !!anonCheckbox?.checked;

  if (!tone) {
    setError("Please select a tone.");
    toneSelect.focus();
    return;
  }

  try {
    await api("/api/messages", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text, tone, is_anonymous }),
    });
    document.getElementById("regret-text").value = "";
    toneSelect.selectedIndex = 0;
    anonCheckbox.checked = false;
    await loadRegrets();
  } catch (e) {
    setError(e.message);
  }
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("token");
  token = "";
  showAuth();
});

// ===== Init =====
(async function init() {
  if (token) {
    try {
      // light check: try messages to validate token
      showApp();
      await fetchTones();
      await loadRegrets();
      return;
    } catch {
      // fall back to auth if token invalid
      localStorage.removeItem("token");
      token = "";
    }
  }
  showAuth();
})();
