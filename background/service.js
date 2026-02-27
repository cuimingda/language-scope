const ICON_PATHS = {
  enabled: null,
  disabled: null
};

let extensionEnabled = true;

function isConversationPage(url) {
  return /^https:\/\/chatgpt\.com\/c\//.test(url || "");
}

function getIconPath(enabled) {
  const state = enabled ? "enabled" : "disabled";
  if (!ICON_PATHS[state]) {
    ICON_PATHS[state] = chrome.runtime.getURL(
      state === "enabled" ? "icons/icon-enabled.png" : "icons/icon-disabled.png"
    );
  }
  return ICON_PATHS[state];
}

function applyIconFromUrl(tabUrl, rawTabId) {
  const enabledForThisPage = isConversationPage(tabUrl) && extensionEnabled;
  const iconPath = getIconPath(enabledForThisPage);

  chrome.action.setIcon({ path: iconPath });

  if (typeof rawTabId === "number" && Number.isInteger(rawTabId) && rawTabId >= 0) {
    chrome.action.setIcon({ tabId: rawTabId, path: iconPath });
  }
}

function refreshTab(tabId) {
  if (typeof tabId !== "number" || !Number.isInteger(tabId) || tabId < 0) return;

  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab?.url) return;
    applyIconFromUrl(tab.url, tab.id);
  });
}

function refreshActiveTab(windowId = null) {
  const query = windowId ? { active: true, windowId } : { active: true, currentWindow: true };
  chrome.tabs.query(query, (tabs) => {
    if (!tabs?.length) return;
    const active = tabs[0];
    if (!active || typeof active.id !== "number" || !active.url) return;
    applyIconFromUrl(active.url, active.id);
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({ enabled: true }, () => {
    extensionEnabled = true;
    refreshActiveTab();
  });
});

chrome.runtime.onStartup.addListener(() => {
  chrome.storage.sync.get({ enabled: true }, (state) => {
    extensionEnabled = !!state.enabled;
    refreshActiveTab();
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes.enabled) {
    extensionEnabled = !!changes.enabled.newValue;
    refreshActiveTab();
  }
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  refreshTab(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (!changeInfo || (!changeInfo.url && changeInfo.status !== "complete")) return;
  refreshTab(tabId);
});

chrome.webNavigation.onHistoryStateUpdated.addListener((details) => {
  if (details.frameId !== 0) return;
  refreshTab(details.tabId);
});

chrome.webNavigation.onCommitted.addListener((details) => {
  if (details.frameId !== 0) return;
  refreshTab(details.tabId);
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  refreshActiveTab(windowId);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== "object") return false;

  if (message.type === "language-scope-toggle") {
    extensionEnabled = Boolean(message.enabled);
    chrome.storage.sync.set({ enabled: extensionEnabled }, () => refreshActiveTab());
    sendResponse({ ok: true, enabled: extensionEnabled });
    return true;
  }

  if (message.type === "language-scope-get-status") {
    sendResponse({ ok: true, enabled: extensionEnabled });
    return true;
  }

  return false;
});
