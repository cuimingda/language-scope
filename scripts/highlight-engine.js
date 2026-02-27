(function (global) {
  "use strict";

  const DEFAULT_FLAGS = "g";

  function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function getMatchRegex(pattern) {
    const flags = pattern.flags || "gi";
    const hasGlobal = flags.includes("g");
    return new RegExp(pattern.regex, hasGlobal ? flags : `${flags}g`);
  }

  function findPairedPatternRanges(text, pattern) {
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
        const separatorIndex = text.indexOf(separator, searchFrom);
        if (separatorIndex < 0) {
          cursor = searchFrom;
          continue;
        }
        searchFrom = separatorIndex + separator.length;
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

  function findMatchesInText(text, patterns, shouldApplyPattern) {
    const matches = [];

    patterns.forEach((pattern) => {
      if (typeof shouldApplyPattern === "function" && !shouldApplyPattern(pattern)) {
        return;
      }

      if (pattern.type === "paired") {
        const pairRanges = findPairedPatternRanges(text, pattern);
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
          rule: pattern,
          ranges: [
            {
              start: hit.index,
              end: hit.index + hit[0].length,
              text: hit[0]
            }
          ]
        });
      }
    });

    matches.sort((a, b) => a.start - b.start || a.end - b.end);
    return matches;
  }

  function extractRanges(matches) {
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
    });

    ranges.sort((a, b) => a.start - b.start || a.end - b.end);
    return ranges;
  }

  function applyRangesToTextNode(textNode, ranges, options) {
    const text = textNode.nodeValue || "";
    const highlightClass = options?.highlightClass || "ls-highlight";
    const fragment = document.createDocumentFragment();
    let cursor = 0;

    const sortedRanges = ranges.slice().sort((a, b) => a.start - b.start || a.end - b.end);

    sortedRanges.forEach((range) => {
      const safeStart = Math.max(range.start, cursor);
      const safeEnd = Math.max(safeStart, Math.min(range.end, text.length));

      if (safeStart >= safeEnd) return;

      if (safeStart > cursor) {
        fragment.appendChild(document.createTextNode(text.slice(cursor, safeStart)));
      }

      const span = document.createElement("span");
      span.className = `${highlightClass} ${range.rule?.cssClass || ""}`.trim();
      span.dataset.languageScopePattern = range.rule?.id || "unknown";
      span.title = `Language Scope: ${range.rule?.name || range.rule?.id || "pattern"}`;
      span.textContent = text.slice(safeStart, safeEnd);
      fragment.appendChild(span);
      cursor = safeEnd;
    });

    if (cursor < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(cursor)));
    }

    textNode.replaceWith(fragment);
  }

  function removeHighlightNodes(root = document.body, highlightClass = "ls-highlight") {
    const nodes = root.querySelectorAll(`.${highlightClass}`);
    nodes.forEach((el) => {
      el.replaceWith(document.createTextNode(el.textContent || ""));
    });
  }

  function getAllPatternsByScope(patterns, getScopeAllowed) {
    return Array.isArray(patterns)
      ? patterns.filter((pattern) => (typeof getScopeAllowed === "function" ? getScopeAllowed(pattern.scope) : true))
      : [];
  }

  const api = {
    escapeRegex,
    getMatchRegex,
    findMatchesInText,
    extractRanges,
    applyRangesToTextNode,
    removeHighlightNodes,
    getAllPatternsByScope,
    findPairedPatternRanges,
    DEFAULT_FLAGS
  };

  global.__languageScopeEngine = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window === "undefined" ? globalThis : window);
