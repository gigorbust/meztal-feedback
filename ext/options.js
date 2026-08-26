const $ = (id) => document.getElementById(id);
chrome.storage.local.get(["token", "repo"], (c) => {
  if (c.repo) $("repo").value = c.repo;
  if (c.token) $("token").value = c.token;
});
$("save").addEventListener("click", () => {
  const repo = $("repo").value.trim();
  const token = $("token").value.trim();
  chrome.storage.local.set({ repo, token }, () => {
    $("ok").textContent = "Saved ✓";
    setTimeout(() => ($("ok").textContent = ""), 2500);
  });
});
