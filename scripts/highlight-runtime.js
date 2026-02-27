(function (global) {
  "use strict";

  function toPatternList(patternsOrProvider) {
    if (Array.isArray(patternsOrProvider)) {
      return patternsOrProvider;
    }

    if (typeof patternsOrProvider === "function") {
      const value = patternsOrProvider();
      return Array.isArray(value) ? value : [];
    }

    const fallback = global.__languageScopePatterns;
    return Array.isArray(fallback) ? fallback : [];
  }

  function defaultShouldProcessNode(node) {
    if (!node.nodeValue || !node.nodeValue.trim()) return false;
    if (!node.parentElement) return false;
    if (node.parentElement.closest(".ls-highlight")) return false;
    return true;
  }

  function collectTextNodes(root, shouldProcessNode) {
    const acceptNode = {
      acceptNode: (node) => {
        return shouldProcessNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    };

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, acceptNode, false);
    const nodes = [];
    let current = walker.nextNode();

    while (current) {
      nodes.push(current);
      current = walker.nextNode();
    }

    return nodes;
  }

  function highlightTextNode(textNode, patterns, options) {
    if (!textNode || !textNode.nodeValue) return;

    const engine = options.engine;
    const shouldApplyPatternForTextNode = options.shouldApplyPatternForTextNode;
    const matches = engine.findMatchesInText(
      textNode.nodeValue || "",
      patterns,
      (pattern) => {
        if (typeof shouldApplyPatternForTextNode === "function") {
          return shouldApplyPatternForTextNode(textNode, pattern);
        }
        return true;
      }
    );

    if (!matches.length) return;

    const ranges = engine.extractRanges(matches);
    if (!ranges.length) return;

    engine.applyRangesToTextNode(textNode, ranges, {
      highlightClass: options.highlightClass
    });
  }

  function highlight(root, options) {
    const cfg = options || {};
    const rootNode = root || document.body;
    if (!rootNode) return;

    const engine = cfg.engine || global.__languageScopeEngine;
    if (!engine) return;

    const patterns = toPatternList(cfg.patterns || global.__languageScopePatterns);
    if (!patterns.length) return;

    const shouldProcessTextNode = typeof cfg.shouldProcessTextNode === "function"
      ? cfg.shouldProcessTextNode
      : defaultShouldProcessNode;

    const nodes = collectTextNodes(rootNode, shouldProcessTextNode);
    nodes.forEach((node) => {
      highlightTextNode(node, patterns, {
        engine,
        shouldApplyPatternForTextNode: cfg.shouldApplyPatternForTextNode,
        highlightClass: cfg.highlightClass || "ls-highlight"
      });
    });
  }

  function clear(root, highlightClass) {
    const className = highlightClass || "ls-highlight";
    if (!global.__languageScopeEngine || typeof global.__languageScopeEngine.removeHighlightNodes !== "function") return;

    const rootNode = root || document;
    global.__languageScopeEngine.removeHighlightNodes(rootNode, className);
    if (typeof rootNode.normalize === "function") {
      rootNode.normalize();
    }
  }

  const runtime = {
    collectTextNodes,
    highlight,
    clear,
    defaultShouldProcessNode,
    highlightTextNode
  };

  global.__languageScopeRuntime = runtime;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = runtime;
  }
})(typeof window === "undefined" ? globalThis : window);
