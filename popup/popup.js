const statusEl = document.getElementById("status");
const toggleBtn = document.getElementById("toggle");
const simulatorBtn = document.getElementById("openSimulator");
let enabled = true;
let targetScope = false;

function isChatGPTConversationPage(url) {
  return /^https:\/\/chatgpt\.com\/c\//.test(url || "");
}

function render() {
  if (!targetScope) {
    statusEl.textContent = "State: disabled (only enabled on https://chatgpt.com/c/*)";
    toggleBtn.textContent = "Enable";
    toggleBtn.disabled = true;
    return;
  }

  statusEl.textContent = `State: ${enabled ? "enabled" : "disabled"}`;
  toggleBtn.textContent = enabled ? "Disable" : "Enable";
  toggleBtn.disabled = false;
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const current = tabs[0];
  targetScope = isChatGPTConversationPage(current?.url);
  if (!targetScope) {
    render();
    return;
  }

  chrome.runtime.sendMessage({ type: "language-scope-get-status" }, (resp) => {
    enabled = resp?.enabled !== false;
    render();
  });
});

toggleBtn.addEventListener("click", () => {
  if (!targetScope) return;
  enabled = !enabled;
  chrome.runtime.sendMessage({ type: "language-scope-toggle", enabled });
  render();
});

simulatorBtn.addEventListener("click", () => {
  const url = chrome.runtime.getURL("simulator/simulator.html");
  window.open(url, "_blank");
});

render();
