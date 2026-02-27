// Define your pattern set here and extend as needed.
window.__languageScopePatterns = [
  {
    id: "not-word",
    name: "否定词“不是”",
    regex: "不是",
    flags: "g",
    scope: "article-p",
    cssClass: "ls-mark-not"
  },
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
