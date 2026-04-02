(function initializeMeetCapture() {
  if (!location.hostname.includes("meet.google.com")) {
    return;
  }

  const observedKeys = new Set();
  let observer = null;
  let captureEnabled = true;

  function extractCaptionEntries() {
    const candidates = document.querySelectorAll("[aria-live='polite'], [aria-atomic='true'], [data-is-tv], div[jscontroller]");
    const entries = [];

    for (const node of candidates) {
      const text = node.textContent ? node.textContent.replace(/\s+/g, " ").trim() : "";
      if (!text || text.length < 8 || text.length > 300) {
        continue;
      }
      if (!/[a-zA-Z]/.test(text)) {
        continue;
      }

      let speaker = "Speaker";
      let caption = text;
      const parts = text.split(":");
      if (parts.length > 1 && parts[0].length < 40) {
        speaker = parts[0].trim();
        caption = parts.slice(1).join(":").trim();
      }
      if (caption.length < 4) {
        continue;
      }

      const timestamp = new Date().toISOString();
      const key = `${speaker}|${caption}`;
      if (observedKeys.has(key)) {
        continue;
      }

      observedKeys.add(key);
      if (observedKeys.size > 1000) {
        const firstKey = observedKeys.values().next().value;
        observedKeys.delete(firstKey);
      }

      entries.push({ speaker, text: caption, timestamp });
    }

    return entries;
  }

  function flushCaptions() {
    if (!captureEnabled) {
      return;
    }

    const entries = extractCaptionEntries();
    if (!entries.length) {
      return;
    }

    chrome.runtime.sendMessage({ type: "MEET_APPEND_CAPTIONS", entries });
  }

  function startObserver() {
    if (observer) {
      return;
    }

    observer = new MutationObserver(() => {
      flushCaptions();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });

    chrome.runtime.sendMessage({ type: "MEET_SET_CAPTURING", value: true });
  }

  function stopObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    chrome.runtime.sendMessage({ type: "MEET_SET_CAPTURING", value: false });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "MEET_TOGGLE_CAPTURE") {
      captureEnabled = Boolean(message.value);
      if (captureEnabled) {
        startObserver();
        flushCaptions();
      } else {
        stopObserver();
      }
      sendResponse({ ok: true, captureEnabled });
      return true;
    }

    if (message?.type === "MEET_SNAPSHOT_NOW") {
      flushCaptions();
      sendResponse({ ok: true });
      return true;
    }

    return false;
  });

  startObserver();
})();
