const HIGHLIGHT_CLASS = "ls-highlight";

function getPatterns() {
  return Array.isArray(window.__languageScopePatterns)
    ? window.__languageScopePatterns
    : [];
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function textNodeMatchesScope(textNode, scope) {
  if (Array.isArray(scope)) {
    return scope.some((scopeItem) => textNodeMatchesScope(textNode, scopeItem));
  }

  if (scope === "article-p") {
    return !!textNode?.parentElement?.closest("article p");
  }

  if (scope === "user-message-pre-wrap") {
    return !!textNode?.parentElement?.closest(".user-message-bubble-color .whitespace-pre-wrap");
  }

  return false;
}

function getScopedPatterns(textNode) {
  const patterns = getPatterns();
  return patterns.filter((pattern) => {
    if (!pattern.scope) return true;
    return textNodeMatchesScope(textNode, pattern.scope);
  });
}

function findMatches(text, patterns) {
  const matches = [];

  patterns.forEach((pattern) => {
    if (pattern.type === "paired") {
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
        text: hit[0],
        rule: pattern
      });
    }
  });

  return matches.sort((a, b) => a.start - b.start || a.end - b.end);
}

function collectRanges(matches) {
  const ranges = [];

  matches.forEach((match) => {
    if (Array.isArray(match.ranges)) {
      match.ranges.forEach((range) => {
        ranges.push({
          start: range.start,
          end: range.end,
          text: range.text || "",
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

  return ranges.sort((a, b) => a.start - b.start || a.end - b.end);
}

function applyRanges(textNode, ranges) {
  const text = textNode.nodeValue || "";
  const fragment = document.createDocumentFragment();
  let cursor = 0;

  ranges.forEach((range) => {
    const start = Math.max(range.start, cursor);
    if (start >= range.end) return;

    if (start > cursor) {
      fragment.appendChild(document.createTextNode(text.slice(cursor, start)));
    }

    const span = document.createElement("span");
    span.className = `${HIGHLIGHT_CLASS} ${range.rule.cssClass || ""}`.trim();
    span.dataset.languageScopePattern = range.rule.id || "unknown";
    span.title = `Language Scope: ${range.rule.name || range.rule.id || "pattern"}`;
    span.textContent = text.slice(start, range.end);
    fragment.appendChild(span);

    cursor = range.end;
  });

  if (cursor < text.length) {
    fragment.appendChild(document.createTextNode(text.slice(cursor)));
  }

  textNode.replaceWith(fragment);
}

function clearHighlight(root = document) {
  const nodes = root.querySelectorAll(`.${HIGHLIGHT_CLASS}`);
  nodes.forEach((node) => {
    node.replaceWith(document.createTextNode(node.textContent || ""));
  });
  if (root && root.normalize) {
    root.normalize();
  }
}

function shouldProcessNode(node) {
  if (!node.nodeValue || !node.nodeValue.trim()) return false;
  if (!node.parentElement) return false;
  if (node.parentElement.closest(`.${HIGHLIGHT_CLASS}`)) return false;
  return true;
}

function scanAndHighlight(root = document.body) {
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (shouldProcessNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT)
  }, false);

  const nodes = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current);
    current = walker.nextNode();
  }

  nodes.forEach((textNode) => {
    const patterns = getScopedPatterns(textNode);
    if (!patterns.length) return;

    const matches = findMatches(textNode.nodeValue || "", patterns);
    if (!matches.length) return;

    const ranges = collectRanges(matches);
    if (ranges.length) {
      applyRanges(textNode, ranges);
    }
  });
}

function run() {
  const root = document.querySelector(".simulator-page");
  clearHighlight(root || document);
  scanAndHighlight(root);
}

document.getElementById("runHighlight").addEventListener("click", run);
document.getElementById("clearHighlight").addEventListener("click", () => {
  clearHighlight(document);
});

run();
