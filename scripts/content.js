(function () {
  "use strict";

  const HIGHLIGHT_CLASS = "ls-highlight";
  const PATTERN_STATE_KEY = "languageScopeEnabled";
  let enabled = true;
  let observer = null;
  let pendingScan = false;

  function getPatterns() {
    return Array.isArray(window.__languageScopePatterns)
      ? window.__languageScopePatterns
      : [];
  }

  function getMatchRegex(pattern) {
    const flags = pattern.flags || "gi";
    const hasGlobal = flags.includes("g");
    return new RegExp(pattern.regex, hasGlobal ? flags : `${flags}g`);
  }

  function findMatches(text, patterns) {
    const matches = [];

    patterns.forEach((pattern) => {
      const regex = getMatchRegex(pattern);
      let hit;

      while ((hit = regex.exec(text)) !== null) {
        if (!hit[0]) {
          regex.lastIndex += 1;
          continue;
        }
        matches.push({
          start: hit.index,
          end: hit.index + hit[0].length,
          rule: pattern,
          text: hit[0]
        });
      }
    });

    matches.sort((a, b) => a.start - b.start || a.end - b.end);
    return matches;
  }

  function canHighlight(node) {
    if (!node.parentElement) return false;
    return !node.parentElement.closest(`.${HIGHLIGHT_CLASS}`);
  }

  function highlightNode(textNode) {
    const text = textNode.nodeValue || "";
    const patterns = getPatterns();
    const matches = findMatches(text, patterns);
    if (!matches.length) return;

    const fragment = document.createDocumentFragment();
    let cursor = 0;

    matches.forEach((match) => {
      if (match.start > cursor) {
        fragment.appendChild(document.createTextNode(text.slice(cursor, match.start)));
      }

      const span = document.createElement("span");
      span.className = `${HIGHLIGHT_CLASS} ${match.rule.cssClass || ""}`.trim();
      span.dataset.languageScopePattern = match.rule.id || "unknown";
      span.title = `Language Scope: ${match.rule.name || match.rule.id || "pattern"}`;
      span.textContent = match.text;
      fragment.appendChild(span);

      cursor = match.end;
    });

    if (cursor < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(cursor)));
    }

    textNode.replaceWith(fragment);
  }

  function scanForText(root = document.body) {
    if (!enabled || !root) return;

    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          return canHighlight(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      },
      false
    );

    const nodes = [];
    let currentNode = walker.nextNode();
    while (currentNode) {
      nodes.push(currentNode);
      currentNode = walker.nextNode();
    }

    nodes.forEach(highlightNode);
  }

  function queueScan() {
    if (!enabled || pendingScan) return;
    pendingScan = true;
    requestAnimationFrame(() => {
      pendingScan = false;
      scanForText(document.body);
    });
  }

  function removeAllHighlights() {
    const nodes = document.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
    nodes.forEach((el) => {
      el.replaceWith(document.createTextNode(el.textContent || ""));
    });
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
