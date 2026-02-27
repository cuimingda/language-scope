(function () {
  "use strict";

  const runtime = window.__languageScopeRuntime;
  const HIGHLIGHT_CLASS = "ls-highlight";
  const COPY_BUTTON_SELECTOR =
    'button[data-testid="copy-turn-action-button"][data-state="closed"],' +
    'button[data-testid="copy-turn-action-button"][aria-label="复制"]';

  let enabled = true;
  let observer = null;
  let pendingScan = false;

  function getPatterns() {
    return Array.isArray(window.__languageScopePatterns)
      ? window.__languageScopePatterns
      : [];
  }

  function isArticleParagraphTextNode(textNode) {
    return !!textNode?.parentElement?.closest("article p");
  }

  function isUserMessagePreWrapTextNode(textNode) {
    return !!textNode?.parentElement?.closest(".user-message-bubble-color .whitespace-pre-wrap");
  }

  function getDirectChildContaining(parent, node) {
    let current = node;
    while (current && current.parentElement !== parent) {
      current = current.parentElement;
      if (!current) return null;
    }
    return current?.nodeType === Node.TEXT_NODE ? current.parentElement : current;
  }

  function isArticleTurnCompleted(textNode) {
    let current = textNode.parentElement;

    while (current) {
      const branch = getDirectChildContaining(current, textNode);
      if (branch) {
        if (branch.matches?.(COPY_BUTTON_SELECTOR)) return true;
        if (branch.querySelector?.(COPY_BUTTON_SELECTOR)) return true;
      }

      if (current.tagName === "ARTICLE") return false;
      current = current.parentElement;
    }

    return false;
  }

  function shouldApplyScopePattern(textNode, scope) {
    if (Array.isArray(scope)) {
      return scope.some((item) => shouldApplyScopePattern(textNode, item));
    }

    switch (scope) {
      case "article-p":
        return isArticleTurnCompleted(textNode) && isArticleParagraphTextNode(textNode);
      case "user-message-pre-wrap":
        return isUserMessagePreWrapTextNode(textNode);
      default:
        return false;
    }
  }

  function shouldApplyPatternForTextNode(textNode, pattern) {
    if (!pattern.scope) return true;
    return shouldApplyScopePattern(textNode, pattern.scope);
  }

  function shouldProcessNode(node) {
    if (!node.nodeValue || !node.nodeValue.trim()) return false;
    if (!node.parentElement) return false;
    if (node.parentElement.closest(`.${HIGHLIGHT_CLASS}`)) return false;
    return isArticleTurnCompleted(node) && isArticleParagraphTextNode(node)
      ? true
      : isUserMessagePreWrapTextNode(node);
  }

  function queueScan() {
    if (!enabled || pendingScan) return;
    pendingScan = true;
    requestAnimationFrame(() => {
      pendingScan = false;
      if (!enabled) return;
      runtime.highlight(document.body, {
        patterns: getPatterns,
        shouldProcessTextNode: shouldProcessNode,
        shouldApplyPatternForTextNode,
        highlightClass: HIGHLIGHT_CLASS
      });
    });
  }

  function removeAllHighlights() {
    runtime.clear(document, HIGHLIGHT_CLASS);
  }

  function startWatching() {
    if (observer) return;
    observer = new MutationObserver(queueScan);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
    queueScan();
  }

  function stopWatching() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    removeAllHighlights();
  }

  function syncEnabledState(nextState) {
    if (typeof nextState !== "boolean") return;
    enabled = nextState;
    if (enabled) {
      startWatching();
    } else {
      stopWatching();
    }
  }

  function loadState() {
    const defaults = { enabled: true };
    chrome.storage.sync.get(defaults, (state) => {
      syncEnabledState(Boolean(state.enabled));
    });
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !changes.enabled) return;
    syncEnabledState(Boolean(changes.enabled.newValue));
  });

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "language-scope-get-status") {
      sendResponse({ enabled });
    }
    return true;
  });

  loadState();

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", startWatching, { once: true });
  } else {
    startWatching();
  }
})();
