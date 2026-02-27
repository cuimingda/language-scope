const HIGHLIGHT_CLASS = "ls-highlight";
const runtime = window.__languageScopeRuntime;
const GENERATED_RULES_CONTAINER_ID = "generated-rules";

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

function escapePatternToken(raw) {
  if (typeof raw !== "string") {
    return "";
  }

  let token = raw.trim();
  token = token.replace(/^[\^]+|[\$]+$/g, "");

  if (token.startsWith("(") && token.endsWith(")")) {
    token = token.slice(1, -1);
  }

  token = token.split("|")[0];
  token = token.replace(/\[(.*?)\]/g, "$1");
  token = token.replace(/[+*?{}()]/g, "");
  token = token.trim();

  return token;
}

function createPairedSentence(left, right, separator) {
  const sep = String(separator || "").trim();
  if (sep) {
    return `在复杂议题的推进中，首先会看到关于“${left}”与“${right}”的分歧，但真正有效的结论应当先完成边界定义，才能讨论后续结构化证据；也就是说，重点先放在“${left}，${right}”这个关系上，而不是只停留在表面陈述。`;
  }

  return `在项目复盘中，${left}并非一句口号，而是决策的入口；真正决定执行质量的，是${right}可持续的复核机制、过程约束与反馈闭环。`;
}

function createWordSentence(term) {
  return `在这段说明中，关键词“${term}”并非被孤立引用，而是嵌在一个完整语境里：当团队对指标口径反复校准时，围绕这个词汇的判断会直接影响到下一步方案的可解释性与可追责性，因此它应被稳定捕获。`;
}

function getPatternSample(pattern) {
  if (pattern?.type === "paired") {
    const left = String(pattern.left || "");
    const right = String(pattern.right || "");
    if (!left || !right) {
      return { tokens: [], sentence: "" };
    }

    return {
      tokens: [left, right],
      sentence: createPairedSentence(left, right, pattern.separator)
    };
  }

  if (typeof pattern?.regex === "string") {
    const token = escapePatternToken(pattern.regex);
    if (!token) {
      return { tokens: [], sentence: "" };
    }

    return {
      tokens: [token],
      sentence: createWordSentence(token)
    };
  }

  return { tokens: [], sentence: "" };
}

function buildRuleSample(pattern, index) {
  const { tokens, sentence } = getPatternSample(pattern);
  if (!tokens.length || !sentence) {
    return null;
  }

  const sample = document.createElement("section");
  sample.className = "rule-sample";
  sample.dataset.ruleSample = "true";
  sample.dataset.ruleId = pattern.id || `pattern-${index + 1}`;
  sample.dataset.expectedTokens = JSON.stringify(tokens);

  const title = document.createElement("h2");
  const displayName = pattern.name || pattern.id || `pattern-${index + 1}`;
  title.textContent = `${index + 1}. ${displayName}`;

  const views = document.createElement("div");
  views.className = "rule-views";

  const article = document.createElement("article");
  const articleP = document.createElement("p");
  articleP.dataset.ruleView = "article-p";
  articleP.textContent = sentence;
  article.appendChild(articleP);

  const userWrap = document.createElement("div");
  userWrap.className = "user-message-bubble-color";
  const preWrap = document.createElement("div");
  preWrap.className = "whitespace-pre-wrap";
  preWrap.dataset.ruleView = "user-message-pre-wrap";
  preWrap.textContent = sentence;
  userWrap.appendChild(preWrap);

  views.appendChild(article);
  views.appendChild(userWrap);
  sample.appendChild(title);
  sample.appendChild(views);

  return sample;
}

function renderRuleSamples() {
  const container = document.getElementById(GENERATED_RULES_CONTAINER_ID);
  if (!container) return;

  container.innerHTML = "";

  const patterns = getPatterns();
  patterns.forEach((pattern, index) => {
    const sample = buildRuleSample(pattern, index);
    if (sample) {
      container.appendChild(sample);
    }
  });
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
  return Array.from(container.querySelectorAll("span")).map((node) => node.textContent || "");
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

    const samples = Array.from(document.querySelectorAll('[data-rule-sample="true"]'));
    const checks = [];
    let allPass = true;

    samples.forEach((sample) => {
      let expected = [];
      try {
        expected = JSON.parse(sample.dataset.expectedTokens || "[]");
      } catch (_error) {
        expected = [];
      }

      const articleView = sample.querySelector('[data-rule-view="article-p"]');
      const userView = sample.querySelector('[data-rule-view="user-message-pre-wrap"]');

      const articleTexts = collectSpanTextsInContainer(articleView);
      const userTexts = collectSpanTextsInContainer(userView);

      const articlePass = expected.every((token) => articleTexts.includes(token));
      const userPass = expected.every((token) => userTexts.includes(token));

      const expectedLabel = sample.dataset.ruleId || "unknown";
      const articleTextMatched = articleTexts.filter((text) => expected.includes(text)).join(", ");
      const userTextMatched = userTexts.filter((text) => expected.includes(text)).join(", ");
      const expectText = expected.join(", ");

      checks.push({
        name: `${expectedLabel}: article 覆盖`,
        pass: articlePass,
        details: `expect: ${expectText} | actual: ${articleTextMatched}`
      });

      checks.push({
        name: `${expectedLabel}: pre-wrap 覆盖`,
        pass: userPass,
        details: `expect: ${expectText} | actual: ${userTextMatched}`
      });

      if (!articlePass || !userPass) {
        allPass = false;
      }
    });

    if (allPass) {
      setCheckOutput(
        `runtime self-check: PASS\n${checks.map((check) => `- ${check.name} ✓`).join("\n")}`,
        true
      );
    } else {
      setCheckOutput(
        `runtime self-check: FAIL\n${checks.filter((check) => !check.pass).map((check) => `- ${check.name} (${check.details})`).join("\n")}`,
        false
      );
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

function bootstrap() {
  renderRuleSamples();
  run();
  runRuntimeSelfCheck();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}
