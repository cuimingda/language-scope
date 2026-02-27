chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ enabled: true });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return;

  switch (message.type) {
    case "language-scope-toggle":
      const next = Boolean(message.enabled);
      chrome.storage.sync.set({ enabled: next });
      sendResponse({ ok: true, enabled: next });
      break;
    case "language-scope-get-status":
      chrome.storage.sync.get({ enabled: true }, (state) => {
        sendResponse({ ok: true, enabled: !!state.enabled });
      });
      return true;
    default:
      return false;
  }
});
