chrome.action.onClicked.addListener(async (tab) => {
  try { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["tool.js"] }); }
  catch (e) { console.error("MezTal Feedback inject failed:", e); }
});
