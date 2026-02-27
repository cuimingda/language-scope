// Define your pattern set here and extend as needed.
window.__languageScopePatterns = [
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
