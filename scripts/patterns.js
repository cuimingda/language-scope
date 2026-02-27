const ARTICLE_SCOPE_KEYWORDS = [
  "你",
  "永远",
  "绝不",
  "必须",
  "总是",
  "必然",
  "一定",
  "绝对",
  "毫无疑问",
  "只能",
  "唯一",
  "从不",
  "从来",
  "难道"
];
const ARTICLE_SCOPE_PAIR_RULES = [
  { left: "不是", right: "而是", separator: "，" },
  { left: "与其", right: "不如" },
  { left: "不在于", right: "而在于" }
];
const ARTICLE_SCOPES = ["article-p", "user-message-pre-wrap"];
const ARTICLE_SCOPE_CLASS = "ls-mark-article-keyword";

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const articleScopePatterns = ARTICLE_SCOPE_KEYWORDS.map((word, index) => ({
  id: `article-word-${index + 1}`,
  name: `article keyword: ${word}`,
  regex: escapeRegex(word),
  flags: "g",
  scope: ARTICLE_SCOPES,
  cssClass: ARTICLE_SCOPE_CLASS
}));

const articleScopePairPatterns = ARTICLE_SCOPE_PAIR_RULES.map((rule, index) => ({
  id: `article-pair-${index + 1}`,
  name: `article pair: ${rule.left}${rule.separator}${rule.right}`,
  type: "paired",
  left: rule.left,
  right: rule.right,
  separator: rule.separator,
  flags: "g",
  scope: ARTICLE_SCOPES,
  cssClass: ARTICLE_SCOPE_CLASS
}));

// Define your pattern set here and extend as needed.
window.__languageScopePatterns = [
  ...articleScopePatterns,
  ...articleScopePairPatterns,
  {
    id: "placeholder-hello",
    name: "hello marker",
    regex: "hello|你好",
    flags: "gi",
    cssClass: "ls-mark-hello"
  },
  {
    id: "placeholder-warning",
    name: "warning marker",
    regex: "TODO|FIXME|注意",
    flags: "gi",
    cssClass: "ls-mark-warning"
  }
];
