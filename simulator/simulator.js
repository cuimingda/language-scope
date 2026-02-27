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
  const negToneEnd = "这类表述听起来像在替自己争辩，最终只会把对话往更僵化的方向推。";

  if (left === "不是" && right === "而是") {
    return `你这不是在回答，而是试图把问题往别处躲，你明明知道边界在哪，偏偏先用一句${left}${sep}${right}来压住对方：${negToneEnd}`;
  }

  if (left === "与其" && right === "不如") {
    return `与其在会后长篇宣泄情绪，不如先给出可执行的修正；否则团队会误以为你只是想把责任推给别人，事实却是${left}你把重点拖成口号，${right}沉下心解决。${negToneEnd}`;
  }

  if (left === "不在于" && right === "而在于") {
    return `现在不是在争执语气，而是把焦点拉回流程。${left}你是否愿意公开假设，${right}你是否愿意承担后果，这两者常常被你混成一句空话。${negToneEnd}`;
  }

  return `${left}很多时候被你拿来做情绪武器，${right}却被你当作拖延行动的借口，听起来像在制造对抗不是在解决问题。${negToneEnd}`;
}

function createWordSentence(term) {
  const termSentences = {
    你: "你总是这样，从来不会真正替别人考虑，结果一句提醒都成了指责。",
    永远: "你这种人永远在用‘我说过’去压人，问题只会变得更糟。",
    绝不: "你绝不承认自己的过失，只会把错误扣到环境上，语气冷得让人不敢接话。",
    必须: "你必须要别人按你的节奏走，哪怕大家都说不通也要硬推，这是典型的高压口气。",
    总是: "你总是这样，从来不会真正替别人考虑。听上去像在不断重复指责。",
    必然: "像你这种性格，做这件事必然会失败，但你却把失败都归咎给别人。",
    一定: "你一定要赢这一句不出来的胜负，却把对话变成了互相试探的战场。",
    绝对: "你绝对不是在讨论问题，而是在要求别人按你一人标准妥协，最后谁都不满意。",
    毫无疑问: "你说得毫无疑问，但每次都把“事实”拿得太重，连别人的困难都不允许被提。",
    只能: "你只会说“只能先等等”，把时间拖成拖延的借口，实际上是在回避责任。",
    唯一: "你把自己当成唯一真理来源，这种独断会让团队越来越难愿意沟通。",
    从不: "你从不主动复盘，出了问题就先否认，再把矛盾抬高成谁对谁错。",
    从来: "你从来不把对方的处境想清楚，先把情绪甩出去再解释，太容易伤人。",
    难道: "难道你就不能先听一遍再反驳吗？你这句话每次都把讨论带到对立面。"
  };

  return `在这段说明中，关键词“${term}”经常作为刺耳的默认结论出现，${termSentences[term] || `${term}的说法一旦抛出来，通常代表你在回避细节、先做情绪定性。`}`;
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
