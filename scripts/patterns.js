const ARTICLE_SCOPE_KEYWORDS = ["不是", "你", "而是"];
const ARTICLE_SCOPE = "article-p";
const ARTICLE_SCOPE_CLASS = "ls-mark-article-keyword";

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const articleScopePatterns = ARTICLE_SCOPE_KEYWORDS.map((word, index) => ({
  id: `article-word-${index + 1}`,
  name: `article keyword: ${word}`,
  regex: escapeRegex(word),
  flags: "g",
  scope: ARTICLE_SCOPE,
  cssClass: ARTICLE_SCOPE_CLASS
}));

// Define your pattern set here and extend as needed.
window.__languageScopePatterns = [
  ...articleScopePatterns,
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
