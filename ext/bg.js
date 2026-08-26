// MezTal Feedback — background service worker.
// Click icon = inject the tool. Messages = GitHub backup/restore using a stored scoped token.

chrome.action.onClicked.addListener(async (tab) => {
  try { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["tool.js"] }); }
  catch (e) { console.error("MezTal Feedback inject failed:", e); }
});

function b64encodeUtf8(str) { return btoa(unescape(encodeURIComponent(str))); }
function b64decodeUtf8(b64) { return decodeURIComponent(escape(atob(b64.replace(/\n/g, "")))); }

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    if (msg.type === "options") { chrome.runtime.openOptionsPage(); reply({ ok: true }); return; }

    const { token, repo } = await chrome.storage.local.get(["token", "repo"]);
    if (!token || !repo) { reply({ ok: true, configured: false }); return; }

    const api = `https://api.github.com/repos/${repo}/contents/feedback/notes.json`;
    const H = { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };

    try {
      if (msg.type === "restore") {
        const r = await fetch(api + "?ref=main", { headers: H, cache: "no-store" });
        if (r.status === 404) { reply({ ok: true, configured: true, data: null }); return; }
        if (!r.ok) { reply({ ok: false, error: "GET " + r.status }); return; }
        const j = await r.json();
        let data = null;
        try { data = JSON.parse(b64decodeUtf8(j.content)); } catch (e) { data = null; }
        reply({ ok: true, configured: true, data });
      } else if (msg.type === "backup") {
        let sha;
        const g = await fetch(api + "?ref=main", { headers: H, cache: "no-store" });
        if (g.ok) { sha = (await g.json()).sha; }
        const body = { message: "feedback update", content: b64encodeUtf8(JSON.stringify(msg.data, null, 2)), branch: "main" };
        if (sha) body.sha = sha;
        const p = await fetch(api, { method: "PUT", headers: H, body: JSON.stringify(body) });
        reply(p.ok ? { ok: true, configured: true } : { ok: false, error: "PUT " + p.status });
      }
    } catch (e) { reply({ ok: false, error: String(e) }); }
  })();
  return true; // keep channel open for async reply
});
