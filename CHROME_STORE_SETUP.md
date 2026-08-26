# Publish MezTal Feedback to the Chrome Web Store (Unlisted)

One-time, ~15 min of clicking + a $5 fee. Only you can do this (your Google account + payment).

## 1. Register as a Chrome Web Store developer ($5, once)
- Go to https://chrome.google.com/webstore/devconsole
- Sign in with your Google account → pay the **one-time $5** registration fee → accept terms.

## 2. Upload the extension
- Download the store package: **meztal-feedback-store.zip**
  (https://github.com/gigorbust/meztal-feedback/raw/main/meztal-feedback-store.zip)
- In the dev console: **Add new item** → upload that zip.

## 3. Fill the listing (copy/paste below)
- **Name:** MezTal Feedback
- **Summary:** Point-and-comment feedback for the MezTal site, with private cloud backup.
- **Description:**
  Internal tool for leaving pinned feedback on the MezTal website. Click to drop a pin, drag to draw a box, type a note — everything auto-saves and backs up to a private repo. Not for public use.
- **Category:** Workflow & Planning
- **Language:** English
- **Icon:** already in the zip (128px). Screenshots: optional for unlisted — you can add one later or skip.
- **Privacy:** single purpose = "leave feedback annotations on the MezTal website." Data use: notes are stored in the user's browser and their own private GitHub repo; no data sent to us.

## 4. Set visibility → **Unlisted**
- Visibility: **Unlisted** = only people with the link can install; it won't show in search. Perfect for internal use.

## 5. Submit
- Submit for review. Approval is usually **1–3 days** (sometimes same-day). You'll get an email.

## 6. After approval
- You get an install link like `https://chrome.google.com/webstore/detail/<id>`.
- Send it to Sarah → she clicks **Add to Chrome** (one click).
- She then does the 2-min token setup once (right-click icon → Options — steps are in there).
- Done. Auto-updates from then on.

## Updating later
- When I ship a fix, I bump the version + rebuild the store zip. You re-upload it in the dev console → quick re-review. Sarah gets the update automatically.
