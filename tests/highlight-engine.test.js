const assert = require("node:assert").strict;
const engine = require("../scripts/highlight-engine.js");

const patterns = [
  {
    id: "article-pair-bu-shi",
    type: "paired",
    left: "不是",
    right: "而是",
    separator: "，",
    scope: ["article-p", "user-message-pre-wrap"],
    cssClass: "ls-mark-article-keyword"
  },
  {
    id: "article-pair-yuqi",
    type: "paired",
    left: "与其",
    right: "不如",
    separator: "",
    scope: ["article-p", "user-message-pre-wrap"],
    cssClass: "ls-mark-article-keyword"
  },
  {
    id: "article-pair-buzaiyu",
    type: "paired",
    left: "不在于",
    right: "而在于",
    separator: "",
    scope: ["article-p", "user-message-pre-wrap"],
    cssClass: "ls-mark-article-keyword"
  },
  {
    id: "article-word-3",
    regex: "永远",
    flags: "g",
    scope: ["article-p", "user-message-pre-wrap"],
    cssClass: "ls-mark-article-keyword"
  },
  {
    id: "article-word-4",
    regex: "绝不",
    flags: "g",
    scope: ["article-p", "user-message-pre-wrap"],
    cssClass: "ls-mark-article-keyword"
  },
  {
    id: "article-word-5",
    regex: "必须",
    flags: "g",
    scope: ["article-p", "user-message-pre-wrap"],
    cssClass: "ls-mark-article-keyword"
  },
  {
    id: "article-word-6",
    regex: "总是",
    flags: "g",
    scope: ["article-p", "user-message-pre-wrap"],
    cssClass: "ls-mark-article-keyword"
  },
  {
    id: "article-word-7",
    regex: "必然",
    flags: "g",
    scope: ["article-p", "user-message-pre-wrap"],
    cssClass: "ls-mark-article-keyword"
  },
  {
    id: "article-word-8",
    regex: "一定",
    flags: "g",
    scope: ["article-p", "user-message-pre-wrap"],
    cssClass: "ls-mark-article-keyword"
  },
  {
    id: "article-word-9",
    regex: "绝对",
    flags: "g",
    scope: ["article-p", "user-message-pre-wrap"],
    cssClass: "ls-mark-article-keyword"
  },
  {
    id: "article-word-10",
    regex: "毫无疑问",
    flags: "g",
    scope: ["article-p", "user-message-pre-wrap"],
    cssClass: "ls-mark-article-keyword"
  },
  {
    id: "article-word-11",
    regex: "只能",
    flags: "g",
    scope: ["article-p", "user-message-pre-wrap"],
    cssClass: "ls-mark-article-keyword"
  },
  {
    id: "article-word-12",
    regex: "唯一",
    flags: "g",
    scope: ["article-p", "user-message-pre-wrap"],
    cssClass: "ls-mark-article-keyword"
  },
  {
    id: "article-word-13",
    regex: "从不",
    flags: "g",
    scope: ["article-p", "user-message-pre-wrap"],
    cssClass: "ls-mark-article-keyword"
  },
  {
    id: "article-word-14",
    regex: "从来",
    flags: "g",
    scope: ["article-p", "user-message-pre-wrap"],
    cssClass: "ls-mark-article-keyword"
  },
  {
    id: "article-word-1",
    regex: "你",
    flags: "g",
    scope: ["article-p", "user-message-pre-wrap"],
    cssClass: "ls-mark-article-keyword"
  },
  {
    id: "article-word-2",
    regex: "难道",
    flags: "g",
    scope: ["article-p", "user-message-pre-wrap"],
    cssClass: "ls-mark-article-keyword"
  }
];

function rangesForText(text) {
  const matches = engine.findMatchesInText(text, patterns, () => true);
  return engine.extractRanges(matches);
}

function findRange(ranges, keyword) {
  return ranges.find((r) => r.text === keyword);
}

function run(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    throw error;
  }
}

run("paired: 不是...而是 should find both terms", () => {
  const text = "这不是说安全不重要，而是说在这种框架里，约束机制会被当作‘削弱动员能力’的阻碍。";
  const ranges = rangesForText(text);

  const rangeLeft = findRange(ranges, "不是");
  const rangeRight = findRange(ranges, "而是");

  assert.ok(rangeLeft, "left pair term not found");
  assert.ok(rangeRight, "right pair term not found");
  assert.equal(text.slice(rangeLeft.start, rangeLeft.end), "不是");
  assert.equal(text.slice(rangeRight.start, rangeRight.end), "而是");
  assert.ok(rangeLeft.start < rangeRight.start, "left should come before right");
});

run("paired: 与其...不如 without separator should match", () => {
  const text = "与其不断解释，不如直接落地。";
  const ranges = rangesForText(text);

  const left = findRange(ranges, "与其");
  const right = findRange(ranges, "不如");

  assert.ok(left);
  assert.ok(right);
  assert.equal(text.slice(left.start, left.end), "与其");
  assert.equal(text.slice(right.start, right.end), "不如");
});

run("paired: 不在于...而在于 without separator should match", () => {
  const text = "问题不在于你是否能说，而在于你是否愿意持续验证。";
  const ranges = rangesForText(text);

  const left = findRange(ranges, "不在于");
  const right = findRange(ranges, "而在于");

  assert.ok(left);
  assert.ok(right);
  assert.equal(text.slice(left.start, left.end), "不在于");
  assert.equal(text.slice(right.start, right.end), "而在于");
});

run("pair must fail when separators or terminals are missing", () => {
  const text = "这是不在于框架的讨论，不一定是问题。";
  const ranges = rangesForText(text);
  assert.equal(findRange(ranges, "而在于"), undefined);
});

run("paired: no right side should not match", () => {
  const text = "这不是说得很好，可是未出现终点。";
  const ranges = rangesForText(text);
  assert.equal(findRange(ranges, "而是"), undefined);
});

run("keyword: independent terms should match", () => {
  const text = "你觉得难道不是吗";
  const ranges = rangesForText(text);

  const you = findRange(ranges, "你");
  const why = findRange(ranges, "难道");

  assert.ok(you);
  assert.ok(why);
  assert.equal(text.slice(you.start, you.end), "你");
  assert.equal(text.slice(why.start, why.end), "难道");
});

run("keyword: additional independent terms should match", () => {
  const text = "你必须永远绝不总是必然一定绝对毫无疑问只能唯一从不从来难道";
  const ranges = rangesForText(text);

  ["你", "永远", "绝不", "必须", "总是", "必然", "一定", "绝对", "毫无疑问", "只能", "唯一", "从不", "从来", "难道"].forEach((term) => {
    const token = findRange(ranges, term);
    assert.ok(token, `${term} should be highlighted`);
  });
});

run("keyword/pair ranges should be sorted", () => {
  const text = "你与其坚持标准，不如先修正边界。";
  const ranges = rangesForText(text);
  for (let i = 1; i < ranges.length; i++) {
    assert.ok(ranges[i - 1].start <= ranges[i].start);
  }
});

run("exact regression sentence should match paired tokens", () => {
  const text = "这不是说安全不重要，而是说在这种框架里，约束机制会被当作“削弱动员能力”的阻碍。";
  const ranges = rangesForText(text);

  const left = findRange(ranges, "不是");
  const right = findRange(ranges, "而是");
  assert.ok(left, "left token should be found");
  assert.ok(right, "right token should be found");
  assert.equal(text.slice(left.start, left.end), "不是");
  assert.equal(text.slice(right.start, right.end), "而是");
});

console.log("highlight-engine tests passed");
