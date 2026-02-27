# Language Scope

Chrome Extension (MV3) scaffold for monitoring text on `https://chatgpt.com/c/*`.

## 快速启动（本地开发者模式）

1. 打开 `chrome://extensions/`
2. 打开「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本项目目录 `/Users/cuimingda/Projects/language-scope`
5. 打开 `https://chatgpt.com/c/...` 页面体验

## 当前能力

- 在目标页面注入 `scripts/content.js`
- 监听页面文本变化
- 使用 `scripts/patterns.js` 中定义的模式匹配文本并用 `ls-highlight` 标注
- 通过 Popup 控制 `enabled` 开关（保存到 `chrome.storage.sync`）

## 后续可继续扩展

- 支持用户可编辑规则（正则、颜色、优先级）
- 仅标记新增/可见文本（减少性能开销）
- 报告匹配统计并展示面板
