const statusEl = document.getElementById("status");
const toggleBtn = document.getElementById("toggle");
let enabled = true;

function render() {
  statusEl.textContent = `State: ${enabled ? "enabled" : "disabled"}`;
  toggleBtn.textContent = enabled ? "Disable" : "Enable";
}

chrome.runtime.sendMessage({ type: "language-scope-get-status" }, (resp) => {
  enabled = resp?.enabled !== false;
  render();
});

toggleBtn.addEventListener("click", () => {
  enabled = !enabled;
  chrome.runtime.sendMessage({ type: "language-scope-toggle", enabled });
  render();
});
