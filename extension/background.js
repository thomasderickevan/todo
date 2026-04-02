const DEFAULT_MEET_STATE = {
  isCapturing: false,
  transcript: [],
  summary: "",
  actionItems: [],
  lastUpdatedAt: 0
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["meetState", "vaultEntries"], (result) => {
    const updates = {};
    if (!result.meetState) {
      updates.meetState = DEFAULT_MEET_STATE;
    }
    if (!result.vaultEntries) {
      updates.vaultEntries = [];
    }
    if (Object.keys(updates).length > 0) {
      chrome.storage.local.set(updates);
    }
  });
});

function summarizeTranscript(transcript) {
  if (!transcript.length) {
    return { summary: "", actionItems: [] };
  }

  const latestEntries = transcript.slice(-30);
  const speakerCounts = new Map();
  const actionItems = [];
  const actionPatterns = [
    /\b(action item|todo|follow up|follow-up|next step|need to|should|must|assign)\b/i,
    /\b(can you|please|let's|we need to|i will|i'll)\b/i
  ];

  for (const entry of latestEntries) {
    speakerCounts.set(entry.speaker, (speakerCounts.get(entry.speaker) || 0) + 1);
    if (actionPatterns.some((pattern) => pattern.test(entry.text))) {
      actionItems.push(`${entry.speaker}: ${entry.text}`);
    }
  }

  const topSpeakers = [...speakerCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([speaker]) => speaker);

  const recentDiscussion = latestEntries
    .slice(-5)
    .map((entry) => `${entry.speaker}: ${entry.text}`)
    .join(" ");

  return {
    summary: `Main speakers: ${topSpeakers.join(", ") || "Unknown"}. Captured ${transcript.length} caption lines. Recent discussion: ${recentDiscussion}`.trim(),
    actionItems: actionItems.slice(-8)
  };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "MEET_APPEND_CAPTIONS") {
    chrome.storage.local.get(["meetState"], (result) => {
      const currentState = result.meetState || DEFAULT_MEET_STATE;
      const combinedTranscript = [...(currentState.transcript || []), ...(message.entries || [])]
        .filter((entry, index, all) => {
          const key = `${entry.timestamp}|${entry.speaker}|${entry.text}`;
          return all.findIndex((candidate) => `${candidate.timestamp}|${candidate.speaker}|${candidate.text}` === key) === index;
        })
        .slice(-500);

      const derived = summarizeTranscript(combinedTranscript);
      const nextState = {
        ...currentState,
        isCapturing: true,
        transcript: combinedTranscript,
        summary: derived.summary,
        actionItems: derived.actionItems,
        lastUpdatedAt: Date.now()
      };

      chrome.storage.local.set({ meetState: nextState }, () => {
        sendResponse({ ok: true, meetState: nextState });
      });
    });

    return true;
  }

  if (message?.type === "MEET_SET_CAPTURING") {
    chrome.storage.local.get(["meetState"], (result) => {
      const currentState = result.meetState || DEFAULT_MEET_STATE;
      const nextState = {
        ...currentState,
        isCapturing: Boolean(message.value),
        lastUpdatedAt: Date.now()
      };
      chrome.storage.local.set({ meetState: nextState }, () => {
        sendResponse({ ok: true, meetState: nextState });
      });
    });

    return true;
  }

  if (message?.type === "MEET_CLEAR_TRANSCRIPT") {
    const nextState = {
      ...DEFAULT_MEET_STATE,
      isCapturing: false,
      lastUpdatedAt: Date.now()
    };
    chrome.storage.local.set({ meetState: nextState }, () => {
      sendResponse({ ok: true, meetState: nextState });
    });
    return true;
  }

  if (message?.type === "MEET_GET_STATE") {
    chrome.storage.local.get(["meetState"], (result) => {
      sendResponse({ ok: true, meetState: result.meetState || DEFAULT_MEET_STATE });
    });
    return true;
  }

  return false;
});
