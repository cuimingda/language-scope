(function () {
  "use strict";

  const HIGHLIGHT_CLASS = "ls-highlight";
  const PATTERN_STATE_KEY = "languageScopeEnabled";
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

  function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
        if (!isArticleTurnCompleted(textNode)) return false;
        return isArticleParagraphTextNode(textNode);
      case "user-message-pre-wrap":
        return isUserMessagePreWrapTextNode(textNode);
      default:
        return false;
    }
  }

  function getMatchesForNode(text, patterns, textNode) {
    const scopedPatterns = patterns.filter((pattern) => {
      if (!pattern.scope) return true;
      return shouldApplyScopePattern(textNode, pattern.scope);
    });
    return findMatches(text, scopedPatterns, textNode);
  }

  function getMatchRegex(pattern) {
    const flags = pattern.flags || "gi";
    const hasGlobal = flags.includes("g");
    return new RegExp(pattern.regex, hasGlobal ? flags : `${flags}g`);
  }

  function getPairRegex(pattern) {
    const flags = pattern.flags || "g";
    const left = escapeRegex(pattern.left || "");
    const right = escapeRegex(pattern.right || "");
    const separator = escapeRegex(pattern.separator || "");
    const source = `${left}[\\s\\S]*?${separator}[\\s\\S]*?${right}`;
    const hasGlobal = flags.includes("g");
    return new RegExp(source, hasGlobal ? flags : `${flags}g`);
  }

  function findPairRanges(text, pattern) {
    const left = String(pattern.left || "");
    const right = String(pattern.right || "");
    if (!left || !right) return [];

    const separator = String(pattern.separator || "");
    const pairs = [];
    const leftLen = left.length;
    const rightLen = right.length;

    let cursor = 0;
    while (cursor < text.length) {
      const leftIndex = text.indexOf(left, cursor);
      if (leftIndex < 0) break;

      let searchFrom = leftIndex + leftLen;
      if (separator) {
        const sepIndex = text.indexOf(separator, searchFrom);
        if (sepIndex < 0) {
          cursor = searchFrom;
          continue;
        }
        searchFrom = sepIndex + separator.length;
      }

      const rightIndex = text.indexOf(right, searchFrom);
      if (rightIndex < 0) {
        cursor = searchFrom;
        continue;
      }

    pairs.push({
      start: leftIndex,
      end: rightIndex + rightLen,
      ranges: [
        {
          start: leftIndex,
          end: leftIndex + leftLen,
          text: left
        },
        {
          start: rightIndex,
          end: rightIndex + rightLen,
          text: right
        }
      ]
    });

      cursor = rightIndex + rightLen;
    }

    return pairs;
  }

  function findMatches(text, patterns, textNode) {
    const matches = [];

    patterns.forEach((pattern) => {
      if (pattern.type === "paired") {
        if (pattern.scope && !shouldApplyScopePattern(textNode, pattern.scope)) {
          return;
        }

        const pairRanges = findPairRanges(text, pattern);
        pairRanges.forEach((pairRange) => {
          matches.push({
            start: pairRange.start,
            end: pairRange.end,
            rule: pattern,
            ranges: pairRange.ranges
          });
        });
        return;
      }

      if (pattern.scope && !shouldApplyScopePattern(textNode, pattern.scope)) {
        return;
      }

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
    const matches = getMatchesForNode(text, patterns, textNode);
    if (!matches.length) return;

    const ranges = [];
    matches.forEach((match) => {
      if (Array.isArray(match.ranges)) {
        match.ranges.forEach((range) => {
          ranges.push({
            start: range.start,
            end: range.end,
            text: range.text || text.slice(range.start, range.end),
            rule: match.rule
          });
        });
        return;
      }

      ranges.push({
        start: match.start,
        end: match.end,
        text: match.text,
        rule: match.rule
      });
    });

    ranges.sort((a, b) => a.start - b.start || a.end - b.end);

    const fragment = document.createDocumentFragment();
    let cursor = 0;

    ranges.forEach((range) => {
      const safeStart = Math.max(range.start, cursor);
      if (safeStart >= range.end) {
        return;
      }

      if (safeStart > cursor) {
        fragment.appendChild(document.createTextNode(text.slice(cursor, safeStart)));
      }

      const span = document.createElement("span");
      span.className = `${HIGHLIGHT_CLASS} ${range.rule.cssClass || ""}`.trim();
      span.dataset.languageScopePattern = range.rule.id || "unknown";
      span.title = `Language Scope: ${range.rule.name || range.rule.id || "pattern"}`;
      span.textContent = text.slice(safeStart, range.end);
      fragment.appendChild(span);

      cursor = range.end;
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
