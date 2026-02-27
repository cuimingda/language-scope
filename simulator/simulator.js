const HIGHLIGHT_CLASS = "ls-highlight";
const runtime = window.__languageScopeRuntime;

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

function shouldApplyScopePattern(textNode, scope) {
  if (Array.isArray(scope)) {
    return scope.some((item) => shouldApplyScopePattern(textNode, item));
  }

  if (scope === "article-p") {
    return isArticleParagraphTextNode(textNode);
  }

  if (scope === "user-message-pre-wrap") {
    return isUserMessagePreWrapTextNode(textNode);
  }

  return false;
}

function shouldApplyPatternForTextNode(textNode, pattern) {
  if (!pattern.scope) return true;
  return shouldApplyScopePattern(textNode, pattern.scope);
}

function clearHighlight(root = document) {
  runtime.clear(root, HIGHLIGHT_CLASS);
}

function scanAndHighlight(root = document.body) {
  runtime.highlight(root, {
    patterns: getPatterns,
    shouldApplyPatternForTextNode,
    highlightClass: HIGHLIGHT_CLASS
  });
}

function run() {
  const root = document.querySelector(".simulator-page");
  clearHighlight(root || document);
  scanAndHighlight(root || document.body);
}

function collectSpanTextsInContainer(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll("span"))
    .map((node) => node.textContent || "");
}

function hasSpanWithText(container, text) {
  return collectSpanTextsInContainer(container).includes(text);
}

function setCheckOutput(html, isPass) {
  const output = document.getElementById("runtimeSelfCheckOutput");
  if (!output) return;
  output.classList.remove("pass", "fail");
  output.classList.add(isPass ? "pass" : "fail");
  output.textContent = html;
}

function runRuntimeSelfCheck() {
  try {
    const root = document.querySelector(".simulator-page");
    clearHighlight(root || document);
    scanAndHighlight(root || document.body);

    const articleCase = document.getElementById("case-article");
    const userCase = document.getElementById("case-user");

    const articleTextInSpans = collectSpanTextsInContainer(articleCase);

    const checks = [
      {
        name: "文章句子应标记 '不是' + '而是'。",
        pass: hasSpanWithText(articleCase, "不是") && hasSpanWithText(articleCase, "而是")
      },
      {
        name: "文章句子应有 2 个配对关键词高亮。",
        pass: articleTextInSpans.filter((text) => text === "不是" || text === "而是").length >= 2
      },
      {
        name: "用户消息应标记 '你'。",
        pass: hasSpanWithText(userCase, "你")
      }
    ];

    const failure = checks.filter((check) => !check.pass).map((check) => `- ${check.name}`).join("\n");
    const isPass = !failure;

    if (isPass) {
      setCheckOutput("runtime self-check: PASS\n" + checks.map((check) => `- ${check.name} ✓`).join("\n"), true);
    } else {
      setCheckOutput("runtime self-check: FAIL\n" + failure, false);
    }
  } catch (error) {
    setCheckOutput(`runtime self-check: EXCEPTION\n${error && error.message ? error.message : String(error)}`, false);
  }
}

document.getElementById("runHighlight").addEventListener("click", run);
document.getElementById("clearHighlight").addEventListener("click", () => {
  const root = document.querySelector(".simulator-page");
  clearHighlight(root || document);
});
document.getElementById("runtimeSelfCheck").addEventListener("click", runRuntimeSelfCheck);

run();
runRuntimeSelfCheck();
