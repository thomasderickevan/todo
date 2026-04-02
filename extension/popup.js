const WORD_LIST = [
  "apple", "bridge", "candle", "desert", "eagle", "forest", "galaxy", "honey", "island", "jungle",
  "knight", "lemon", "mountain", "nebula", "ocean", "planet", "quartz", "river", "shadow", "tiger",
  "umbrella", "valley", "winter", "xray", "yellow", "zebra", "autumn", "blossom", "canyon", "dawn",
  "echo", "falcon", "glacier", "harvest", "iceberg", "jade", "kite", "lagoon", "meadow", "night",
  "oasis", "pebble", "quiver", "reef", "storm", "thunder", "umbra", "vortex", "willow", "xenon"
];

const state = {
  shieldMode: "password",
  generatedValue: "",
  vaultEntries: [],
  meetState: {
    isCapturing: false,
    transcript: [],
    summary: "",
    actionItems: [],
    lastUpdatedAt: 0
  },
  vaultMasterConfig: null,
  isUnlocked: false,
  masterPin: "",
  activeTab: null,
  activeOrigin: "",
  activeHost: "",
  searchQuery: ""
};

const elements = {};

document.addEventListener("DOMContentLoaded", async () => {
  cacheElements();
  bindEvents();
  await hydrateState();
  renderShield();
  renderMeet();
});

function cacheElements() {
  [
    "meetLiveStatus", "generatedValue", "passwordLength", "wordCount", "optUppercase", "optLowercase",
    "optNumbers", "optSymbols", "optCapitalize", "separatorSelect", "strengthPill", "vaultList",
    "serviceNameInput", "usernameInput", "siteInput", "meetSummary", "meetActions", "meetTranscript",
    "meetLineCount", "meetUpdatedAt", "toggleMeetBtn", "passwordControls", "passphraseControls",
    "importVaultInput", "shieldSetupView", "shieldUnlockView", "shieldUnlockedView", "setupPinInput",
    "setupPinConfirmInput", "unlockPinInput", "activeSiteLabel", "siteVaultList", "vaultSearchInput",
    "vaultStateBadge"
  ].forEach((id) => {
    elements[id] = document.getElementById(id);
  });
}

function bindEvents() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });

  document.querySelectorAll(".mode-button").forEach((button) => {
    button.addEventListener("click", () => switchShieldMode(button.dataset.mode));
  });

  [
    "passwordLength", "wordCount", "optUppercase", "optLowercase",
    "optNumbers", "optSymbols", "optCapitalize", "separatorSelect"
  ].forEach((id) => {
    elements[id].addEventListener("input", handleGeneratorChange);
    elements[id].addEventListener("change", handleGeneratorChange);
  });

  elements.vaultSearchInput.addEventListener("input", () => {
    state.searchQuery = elements.vaultSearchInput.value.trim().toLowerCase();
    renderVaultLists();
  });

  document.getElementById("createVaultBtn").addEventListener("click", createVault);
  document.getElementById("unlockVaultBtn").addEventListener("click", unlockVault);
  document.getElementById("lockVaultBtn").addEventListener("click", lockVault);
  document.getElementById("regenerateBtn").addEventListener("click", () => {
    regenerateSecret();
    renderShield();
  });
  document.getElementById("copyGeneratedBtn").addEventListener("click", copyGeneratedSecret);
  document.getElementById("fillGeneratedBtn").addEventListener("click", fillGeneratedSecret);
  document.getElementById("saveVaultBtn").addEventListener("click", saveLogin);
  document.getElementById("exportVaultBtn").addEventListener("click", exportVault);
  elements.importVaultInput.addEventListener("change", importVault);

  document.getElementById("snapshotMeetBtn").addEventListener("click", captureMeetSnapshot);
  document.getElementById("toggleMeetBtn").addEventListener("click", toggleMeetCapture);
  document.getElementById("clearMeetBtn").addEventListener("click", clearMeetData);

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }

    if (changes.vaultEntries) {
      state.vaultEntries = changes.vaultEntries.newValue || [];
      renderVaultLists();
    }

    if (changes.vaultMasterConfig) {
      state.vaultMasterConfig = changes.vaultMasterConfig.newValue || null;
      renderShield();
    }

    if (changes.meetState) {
      state.meetState = changes.meetState.newValue || state.meetState;
      renderMeet();
    }
  });
}

async function hydrateState() {
  const stored = await chrome.storage.local.get(["vaultEntries", "vaultMasterConfig"]);
  state.vaultEntries = stored.vaultEntries || [];
  state.vaultMasterConfig = stored.vaultMasterConfig || null;
  state.activeTab = await getActiveTab();
  setActiveSiteInfo(state.activeTab?.url || "");
  elements.siteInput.value = state.activeOrigin;
  regenerateSecret();

  const meetResponse = await chrome.runtime.sendMessage({ type: "MEET_GET_STATE" });
  if (meetResponse?.ok) {
    state.meetState = meetResponse.meetState;
  }
}

function switchTab(tabId) {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabId);
  });
  document.getElementById("shieldPanel").classList.toggle("active", tabId === "shield");
  document.getElementById("meetPanel").classList.toggle("active", tabId === "meet");
}

function switchShieldMode(mode) {
  state.shieldMode = mode;
  document.querySelectorAll(".mode-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });
  regenerateSecret();
  renderShield();
}

function handleGeneratorChange() {
  regenerateSecret();
  renderShield();
}

function setActiveSiteInfo(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("unsupported");
    }
    state.activeOrigin = parsed.origin;
    state.activeHost = parsed.hostname.replace(/^www\./, "");
  } catch (_error) {
    state.activeOrigin = "";
    state.activeHost = "";
  }
}

async function createVault() {
  const pin = elements.setupPinInput.value.trim();
  const confirm = elements.setupPinConfirmInput.value.trim();

  if (pin.length < 4) {
    window.alert("Use at least 4 characters for the master PIN.");
    return;
  }
  if (pin !== confirm) {
    window.alert("PIN confirmation does not match.");
    return;
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hashBuffer = await deriveHash(pin, salt);
  const vaultMasterConfig = {
    salt: arrayBufferToBase64(salt.buffer),
    hash: arrayBufferToBase64(hashBuffer),
    createdAt: Date.now()
  };

  state.vaultMasterConfig = vaultMasterConfig;
  state.isUnlocked = true;
  state.masterPin = pin;
  await chrome.storage.local.set({ vaultMasterConfig });
  elements.setupPinInput.value = "";
  elements.setupPinConfirmInput.value = "";
  renderShield();
}

async function unlockVault() {
  const pin = elements.unlockPinInput.value.trim();
  if (!pin || !state.vaultMasterConfig) {
    return;
  }

  const salt = base64ToArrayBuffer(state.vaultMasterConfig.salt);
  const hashBuffer = await deriveHash(pin, new Uint8Array(salt));
  if (arrayBufferToBase64(hashBuffer) !== state.vaultMasterConfig.hash) {
    window.alert("Incorrect master PIN.");
    return;
  }

  state.isUnlocked = true;
  state.masterPin = pin;
  elements.unlockPinInput.value = "";
  renderShield();
}

function lockVault() {
  state.isUnlocked = false;
  state.masterPin = "";
  renderShield();
}

function regenerateSecret() {
  state.generatedValue = state.shieldMode === "password"
    ? generateRandomPassword()
    : generatePassphrase();
}

function generateRandomPassword() {
  const pools = [];
  if (elements.optUppercase.checked) pools.push("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  if (elements.optLowercase.checked) pools.push("abcdefghijklmnopqrstuvwxyz");
  if (elements.optNumbers.checked) pools.push("0123456789");
  if (elements.optSymbols.checked) pools.push("!@#$%^&*()_+~`|}{[]:;?><,./-=");

  const characters = pools.join("");
  if (!characters) {
    return "Select at least one option";
  }

  const length = Number(elements.passwordLength.value);
  const bytes = crypto.getRandomValues(new Uint32Array(length));
  let password = "";
  for (let index = 0; index < length; index += 1) {
    password += characters[bytes[index] % characters.length];
  }
  return password;
}

function generatePassphrase() {
  const count = Number(elements.wordCount.value);
  const separator = elements.separatorSelect.value;
  const capitalize = elements.optCapitalize.checked;
  const bytes = crypto.getRandomValues(new Uint32Array(count));
  const words = [];

  for (let index = 0; index < count; index += 1) {
    let word = WORD_LIST[bytes[index] % WORD_LIST.length];
    if (capitalize) {
      word = `${word[0].toUpperCase()}${word.slice(1)}`;
    }
    words.push(word);
  }

  return words.join(separator);
}

function computeStrengthLabel() {
  const value = state.generatedValue;
  if (!value || value === "Select at least one option") {
    return "Invalid";
  }

  let score = 0;
  if (value.length >= 12) score += 1;
  if (value.length >= 16) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9 ]/.test(value)) score += 1;
  if (state.shieldMode === "passphrase") score += 1;

  if (score <= 2) return "Weak";
  if (score <= 4) return "Strong";
  return "Very strong";
}

function renderShield() {
  const isReady = Boolean(state.vaultMasterConfig);

  elements.shieldSetupView.classList.toggle("hidden", isReady);
  elements.shieldUnlockView.classList.toggle("hidden", !isReady || state.isUnlocked);
  elements.shieldUnlockedView.classList.toggle("hidden", !isReady || !state.isUnlocked);

  if (!isReady || !state.isUnlocked) {
    return;
  }

  elements.activeSiteLabel.textContent = state.activeOrigin || "No supported webpage selected";
  elements.vaultStateBadge.textContent = state.activeHost ? `Match on ${state.activeHost}` : "Unlocked";
  elements.generatedValue.value = state.generatedValue;
  elements.passwordControls.classList.toggle("hidden", state.shieldMode !== "password");
  elements.passphraseControls.classList.toggle("hidden", state.shieldMode !== "passphrase");
  elements.strengthPill.textContent = computeStrengthLabel();
  renderVaultLists();
}

function getFilteredEntries() {
  const query = state.searchQuery;
  const entries = [...state.vaultEntries].sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt);
  if (!query) {
    return entries;
  }

  return entries.filter((entry) => {
    const haystack = `${entry.serviceName} ${entry.username} ${entry.siteOrigin} ${entry.siteHostname}`.toLowerCase();
    return haystack.includes(query);
  });
}

function getSiteMatches(entries) {
  if (!state.activeHost) {
    return [];
  }

  return entries.filter((entry) => siteMatches(entry, state.activeHost));
}

function siteMatches(entry, activeHost) {
  if (!entry.siteHostname) {
    return false;
  }
  return activeHost === entry.siteHostname || activeHost.endsWith(`.${entry.siteHostname}`) || entry.siteHostname.endsWith(`.${activeHost}`);
}

function renderVaultLists() {
  const filteredEntries = getFilteredEntries();
  renderEntryList(elements.siteVaultList, getSiteMatches(filteredEntries), "No saved logins match this site yet.");
  renderEntryList(elements.vaultList, filteredEntries, "No vault entries yet.");
}

function renderEntryList(container, entries, emptyText) {
  if (!entries.length) {
    container.className = "list-block empty";
    container.textContent = emptyText;
    return;
  }

  container.className = "list-block";
  container.innerHTML = "";

  for (const entry of entries) {
    const wrapper = document.createElement("article");
    wrapper.className = "vault-entry";
    wrapper.innerHTML = `
      <div class="entry-header">
        <div>
          <div class="entry-service">${escapeHtml(entry.serviceName)}</div>
          <div class="entry-meta">${escapeHtml(entry.username || "No username")} • ${escapeHtml(entry.siteOrigin || "No site")}</div>
        </div>
        <span class="site-badge">${siteMatches(entry, state.activeHost) ? "Match" : "Vault"}</span>
      </div>
      <div class="entry-actions spread">
        <button class="ghost-button" data-action="fill" data-id="${entry.id}">Fill</button>
        <button class="ghost-button" data-action="copy-user" data-id="${entry.id}">Copy user</button>
        <button class="ghost-button" data-action="copy-pass" data-id="${entry.id}">Copy pass</button>
        <button class="ghost-button" data-action="delete" data-id="${entry.id}">Delete</button>
      </div>
    `;

    wrapper.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", async () => {
        const { action, id } = button.dataset;
        if (action === "fill") await fillSavedEntry(id);
        if (action === "copy-user") await copyEntryUsername(id);
        if (action === "copy-pass") await copyEntryPassword(id);
        if (action === "delete") await deleteEntry(id);
      });
    });

    container.appendChild(wrapper);
  }
}

async function copyGeneratedSecret() {
  if (!state.generatedValue) {
    return;
  }
  await navigator.clipboard.writeText(state.generatedValue);
}

async function fillGeneratedSecret() {
  const tab = await ensureFillableActiveTab();
  if (!tab) {
    return;
  }

  await runFillScript(tab.id, {
    username: elements.usernameInput.value.trim(),
    password: state.generatedValue
  });
}

async function saveLogin() {
  if (!state.isUnlocked || !state.masterPin) {
    window.alert("Unlock the vault first.");
    return;
  }

  const serviceName = elements.serviceNameInput.value.trim();
  const username = elements.usernameInput.value.trim();
  const siteOrigin = normalizeSiteOrigin(elements.siteInput.value.trim() || state.activeOrigin);

  if (!serviceName) {
    window.alert("Enter a service name first.");
    return;
  }
  if (!siteOrigin) {
    window.alert("Enter a valid site origin first.");
    return;
  }
  if (!state.generatedValue || state.generatedValue === "Select at least one option") {
    window.alert("Generate a valid password first.");
    return;
  }

  const encryptedPassword = await encryptSecret(state.generatedValue, state.masterPin);
  const url = new URL(siteOrigin);
  const entry = {
    id: `vault-${Date.now()}`,
    serviceName,
    username,
    siteOrigin,
    siteHostname: url.hostname.replace(/^www\./, ""),
    encryptedPassword,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  state.vaultEntries = [entry, ...state.vaultEntries];
  await chrome.storage.local.set({ vaultEntries: state.vaultEntries });
  elements.serviceNameInput.value = "";
  elements.usernameInput.value = "";
  elements.siteInput.value = state.activeOrigin;
}

function normalizeSiteOrigin(value) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return "";
    }
    return parsed.origin;
  } catch (_error) {
    return "";
  }
}

async function fillSavedEntry(entryId) {
  const entry = state.vaultEntries.find((item) => item.id === entryId);
  if (!entry) {
    return;
  }

  const tab = await ensureFillableActiveTab();
  if (!tab) {
    return;
  }

  const password = await decryptSecret(entry.encryptedPassword, state.masterPin);
  await runFillScript(tab.id, {
    username: entry.username || "",
    password
  });
}

async function copyEntryUsername(entryId) {
  const entry = state.vaultEntries.find((item) => item.id === entryId);
  if (!entry?.username) {
    return;
  }
  await navigator.clipboard.writeText(entry.username);
}

async function copyEntryPassword(entryId) {
  const entry = state.vaultEntries.find((item) => item.id === entryId);
  if (!entry) {
    return;
  }

  const password = await decryptSecret(entry.encryptedPassword, state.masterPin);
  await navigator.clipboard.writeText(password);
}

async function deleteEntry(entryId) {
  state.vaultEntries = state.vaultEntries.filter((entry) => entry.id !== entryId);
  await chrome.storage.local.set({ vaultEntries: state.vaultEntries });
}

async function exportVault() {
  const blob = new Blob([JSON.stringify({
    vaultEntries: state.vaultEntries,
    vaultMasterConfig: state.vaultMasterConfig
  }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "endeavor-shield-vault.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

async function importVault(event) {
  const [file] = event.target.files || [];
  if (!file) {
    return;
  }

  const payload = JSON.parse(await file.text());
  const importedEntries = Array.isArray(payload) ? payload : payload.vaultEntries;
  const importedMasterConfig = Array.isArray(payload) ? null : payload.vaultMasterConfig;

  if (!Array.isArray(importedEntries)) {
    window.alert("Invalid vault export.");
    return;
  }

  if (!state.vaultMasterConfig && importedMasterConfig) {
    state.vaultMasterConfig = importedMasterConfig;
  }

  const merged = [...state.vaultEntries];
  for (const entry of importedEntries) {
    if (!merged.some((candidate) => candidate.id === entry.id)) {
      merged.push(entry);
    }
  }

  merged.sort((a, b) => b.updatedAt - a.updatedAt || b.createdAt - a.createdAt);
  state.vaultEntries = merged;
  await chrome.storage.local.set({
    vaultEntries: state.vaultEntries,
    vaultMasterConfig: state.vaultMasterConfig
  });
  event.target.value = "";
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

async function ensureFillableActiveTab() {
  state.activeTab = await getActiveTab();
  if (!state.activeTab?.id || !state.activeTab.url || !/^https?:/.test(state.activeTab.url)) {
    window.alert("Open a regular website tab first.");
    return null;
  }

  setActiveSiteInfo(state.activeTab.url);
  return state.activeTab;
}

async function runFillScript(tabId, credentials) {
  await chrome.scripting.executeScript({
    target: { tabId },
    args: [credentials],
    func: ({ username, password }) => {
      const visible = (element) => {
        const style = window.getComputedStyle(element);
        return style.visibility !== "hidden" && style.display !== "none";
      };

      const dispatchInput = (element, value) => {
        element.focus();
        element.value = value;
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
      };

      const candidates = [...document.querySelectorAll("input")].filter(visible);
      const passwordInput = candidates.find((input) => input.type === "password");
      const usernameInput = candidates.find((input) => {
        const type = (input.type || "text").toLowerCase();
        const key = `${input.name} ${input.id} ${input.placeholder} ${input.autocomplete}`.toLowerCase();
        return ["text", "email", "tel"].includes(type) && /(user|email|login|phone)/.test(key);
      }) || candidates.find((input) => ["text", "email", "tel"].includes((input.type || "text").toLowerCase()));

      if (usernameInput && username) {
        dispatchInput(usernameInput, username);
      }
      if (passwordInput && password) {
        dispatchInput(passwordInput, password);
      }
    }
  });
}

async function captureMeetSnapshot() {
  const tab = await getActiveMeetTab();
  if (!tab?.id) {
    window.alert("Open a Google Meet tab first.");
    return;
  }

  await chrome.tabs.sendMessage(tab.id, { type: "MEET_SNAPSHOT_NOW" });
}

async function toggleMeetCapture() {
  const tab = await getActiveMeetTab();
  if (!tab?.id) {
    window.alert("Open a Google Meet tab first.");
    return;
  }

  await chrome.tabs.sendMessage(tab.id, {
    type: "MEET_TOGGLE_CAPTURE",
    value: !state.meetState.isCapturing
  });
}

async function clearMeetData() {
  await chrome.runtime.sendMessage({ type: "MEET_CLEAR_TRANSCRIPT" });
}

async function getActiveMeetTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs.find((tab) => tab.url && tab.url.startsWith("https://meet.google.com/")) || null;
}

function renderMeet() {
  const meetState = state.meetState;
  elements.meetLiveStatus.textContent = meetState.isCapturing ? "Meet live" : "Meet idle";
  elements.toggleMeetBtn.textContent = meetState.isCapturing ? "Pause capture" : "Resume capture";
  elements.meetLineCount.textContent = String(meetState.transcript.length);
  elements.meetUpdatedAt.textContent = meetState.lastUpdatedAt
    ? new Date(meetState.lastUpdatedAt).toLocaleTimeString()
    : "Never";
  elements.meetSummary.textContent = meetState.summary || "No transcript captured yet.";

  renderActionItems();
  renderTranscript();
}

function renderActionItems() {
  if (!state.meetState.actionItems.length) {
    elements.meetActions.className = "list-block empty";
    elements.meetActions.textContent = "No action items detected yet.";
    return;
  }

  elements.meetActions.className = "list-block";
  elements.meetActions.innerHTML = "";
  state.meetState.actionItems.forEach((item) => {
    const wrapper = document.createElement("article");
    wrapper.className = "action-entry";
    wrapper.textContent = item;
    elements.meetActions.appendChild(wrapper);
  });
}

function renderTranscript() {
  if (!state.meetState.transcript.length) {
    elements.meetTranscript.className = "list-block empty";
    elements.meetTranscript.textContent = "No transcript captured yet.";
    return;
  }

  elements.meetTranscript.className = "list-block";
  elements.meetTranscript.innerHTML = "";
  state.meetState.transcript.slice(-20).reverse().forEach((entry) => {
    const wrapper = document.createElement("article");
    wrapper.className = "transcript-entry";
    wrapper.innerHTML = `
      <div class="entry-header">
        <strong>${escapeHtml(entry.speaker)}</strong>
        <span class="entry-time">${new Date(entry.timestamp).toLocaleTimeString()}</span>
      </div>
      <p class="summary-copy">${escapeHtml(entry.text)}</p>
    `;
    elements.meetTranscript.appendChild(wrapper);
  });
}

async function encryptSecret(secret, pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt);
  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(secret)
  );

  return JSON.stringify({
    salt: arrayBufferToBase64(salt.buffer),
    iv: arrayBufferToBase64(iv.buffer),
    cipher: arrayBufferToBase64(cipherBuffer)
  });
}

async function decryptSecret(payload, pin) {
  const parsed = JSON.parse(payload);
  const key = await deriveKey(pin, new Uint8Array(base64ToArrayBuffer(parsed.salt)));
  const plainBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(base64ToArrayBuffer(parsed.iv)) },
    key,
    base64ToArrayBuffer(parsed.cipher)
  );

  return new TextDecoder().decode(plainBuffer);
}

async function deriveKey(pin, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function deriveHash(pin, salt) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  return crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );
}

function arrayBufferToBase64(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}

function base64ToArrayBuffer(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
