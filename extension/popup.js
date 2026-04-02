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
  revealedSecrets: {},
  meetState: {
    isCapturing: false,
    transcript: [],
    summary: "",
    actionItems: [],
    lastUpdatedAt: 0
  }
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
    "generatedValue", "passwordLength", "wordCount", "optUppercase", "optLowercase", "optNumbers",
    "optSymbols", "optCapitalize", "separatorSelect", "strengthPill", "vaultList", "serviceNameInput",
    "usernameInput", "masterPinInput", "meetSummary", "meetActions", "meetTranscript", "meetLineCount",
    "meetUpdatedAt", "toggleMeetBtn", "meetLiveStatus", "passwordControls", "passphraseControls",
    "importVaultInput"
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

  document.getElementById("regenerateBtn").addEventListener("click", () => {
    regenerateSecret();
    renderShield();
  });

  document.getElementById("copyGeneratedBtn").addEventListener("click", async () => {
    if (!state.generatedValue) {
      return;
    }
    await navigator.clipboard.writeText(state.generatedValue);
  });

  document.getElementById("saveVaultBtn").addEventListener("click", saveToVault);
  document.getElementById("exportVaultBtn").addEventListener("click", exportVault);
  document.getElementById("snapshotMeetBtn").addEventListener("click", captureMeetSnapshot);
  document.getElementById("toggleMeetBtn").addEventListener("click", toggleMeetCapture);
  document.getElementById("clearMeetBtn").addEventListener("click", clearMeetData);
  elements.importVaultInput.addEventListener("change", importVault);

  [
    "passwordLength", "wordCount", "optUppercase", "optLowercase",
    "optNumbers", "optSymbols", "optCapitalize", "separatorSelect"
  ].forEach((id) => {
    elements[id].addEventListener("input", handleOptionChange);
    elements[id].addEventListener("change", handleOptionChange);
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") {
      return;
    }

    if (changes.vaultEntries) {
      state.vaultEntries = changes.vaultEntries.newValue || [];
      renderVaultList();
    }

    if (changes.meetState) {
      state.meetState = changes.meetState.newValue || state.meetState;
      renderMeet();
    }
  });
}

function handleOptionChange() {
  regenerateSecret();
  renderShield();
}

async function hydrateState() {
  const stored = await chrome.storage.local.get(["vaultEntries"]);
  state.vaultEntries = stored.vaultEntries || [];
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

function regenerateSecret() {
  state.generatedValue = state.shieldMode === "password"
    ? generateRandomPassword()
    : generatePassphrase();
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
  elements.generatedValue.value = state.generatedValue;
  elements.passwordControls.classList.toggle("hidden", state.shieldMode !== "password");
  elements.passphraseControls.classList.toggle("hidden", state.shieldMode !== "passphrase");
  elements.strengthPill.textContent = computeStrengthLabel();
  renderVaultList();
}

async function saveToVault() {
  const serviceName = elements.serviceNameInput.value.trim();
  const username = elements.usernameInput.value.trim();
  const masterPin = elements.masterPinInput.value.trim();

  if (!serviceName) {
    window.alert("Enter a service name first.");
    return;
  }
  if (!masterPin) {
    window.alert("Enter a master PIN first.");
    return;
  }
  if (!state.generatedValue || state.generatedValue === "Select at least one option") {
    window.alert("Generate a valid password first.");
    return;
  }

  const encryptedPassword = await encryptSecret(state.generatedValue, masterPin);
  const entry = {
    id: `vault-${Date.now()}`,
    serviceName,
    username,
    encryptedPassword,
    createdAt: Date.now()
  };

  state.vaultEntries = [entry, ...state.vaultEntries];
  await chrome.storage.local.set({ vaultEntries: state.vaultEntries });
  elements.serviceNameInput.value = "";
  elements.usernameInput.value = "";
}

function renderVaultList() {
  if (!state.vaultEntries.length) {
    elements.vaultList.className = "list-block empty";
    elements.vaultList.textContent = "No vault entries yet.";
    return;
  }

  elements.vaultList.className = "list-block";
  elements.vaultList.innerHTML = "";

  for (const entry of state.vaultEntries) {
    const wrapper = document.createElement("article");
    wrapper.className = "vault-entry";

    wrapper.innerHTML = `
      <div class="entry-header">
        <div>
          <div class="entry-service">${escapeHtml(entry.serviceName)}</div>
          <div class="entry-meta">${escapeHtml(entry.username || "No username")} • ${new Date(entry.createdAt).toLocaleString()}</div>
        </div>
        <div class="entry-actions">
          <button class="ghost-button" data-action="reveal" data-id="${entry.id}">Reveal</button>
          <button class="ghost-button" data-action="copy" data-id="${entry.id}">Copy</button>
          <button class="ghost-button" data-action="delete" data-id="${entry.id}">Delete</button>
        </div>
      </div>
      <p class="entry-secret">${escapeHtml(state.revealedSecrets[entry.id] || "Hidden until you enter the PIN.")}</p>
    `;

    wrapper.querySelectorAll("button").forEach((button) => {
      button.addEventListener("click", async () => {
        if (button.dataset.action === "reveal") {
          await revealEntry(entry.id);
        }
        if (button.dataset.action === "copy") {
          await copyEntry(entry.id);
        }
        if (button.dataset.action === "delete") {
          await deleteEntry(entry.id);
        }
      });
    });

    elements.vaultList.appendChild(wrapper);
  }
}

async function revealEntry(entryId) {
  const entry = state.vaultEntries.find((item) => item.id === entryId);
  const masterPin = elements.masterPinInput.value.trim();
  if (!entry || !masterPin) {
    window.alert("Enter the master PIN to reveal vault entries.");
    return;
  }

  try {
    state.revealedSecrets[entry.id] = await decryptSecret(entry.encryptedPassword, masterPin);
    renderVaultList();
  } catch (_error) {
    window.alert("Incorrect PIN or invalid vault entry.");
  }
}

async function copyEntry(entryId) {
  const entry = state.vaultEntries.find((item) => item.id === entryId);
  if (!entry) {
    return;
  }

  let secret = state.revealedSecrets[entry.id];
  if (!secret) {
    const masterPin = elements.masterPinInput.value.trim();
    if (!masterPin) {
      window.alert("Enter the master PIN first.");
      return;
    }
    secret = await decryptSecret(entry.encryptedPassword, masterPin);
    state.revealedSecrets[entry.id] = secret;
  }

  await navigator.clipboard.writeText(secret);
  renderVaultList();
}

async function deleteEntry(entryId) {
  state.vaultEntries = state.vaultEntries.filter((entry) => entry.id !== entryId);
  delete state.revealedSecrets[entryId];
  await chrome.storage.local.set({ vaultEntries: state.vaultEntries });
}

async function exportVault() {
  const blob = new Blob([JSON.stringify(state.vaultEntries, null, 2)], { type: "application/json" });
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

  const importedEntries = JSON.parse(await file.text());
  if (!Array.isArray(importedEntries)) {
    window.alert("Invalid vault export.");
    return;
  }

  const merged = [...state.vaultEntries];
  for (const entry of importedEntries) {
    if (!merged.some((candidate) => candidate.id === entry.id)) {
      merged.push(entry);
    }
  }

  merged.sort((a, b) => b.createdAt - a.createdAt);
  state.vaultEntries = merged;
  await chrome.storage.local.set({ vaultEntries: state.vaultEntries });
  event.target.value = "";
}

async function getActiveMeetTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs.find((tab) => tab.url && tab.url.startsWith("https://meet.google.com/")) || null;
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
