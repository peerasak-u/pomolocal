# Extension Improvement Plan

Based on the code review of the `@extension/firefox/` directory, the following changes are required to ensure the extension passes the Mozilla Add-ons (AMO) review process and functions correctly.

## 🔴 Critical Fixes (Must Do)

### 1. Fix Content Security Policy (CSP) & Privacy Issue
**The Issue:**
- `popup.js` tries to load images from `https://www.google.com/s2/favicons`.
- The current CSP (`manifest.json`) does not allow external images (`img-src` defaults to `'self'`).
- **Privacy Risk:** Using Google's favicon service leaks user data (the domains they block) to a third party. Firefox reviewers are strict about this.

**The Solution (Recommended):**
Bundle icons locally to improve privacy and remove the CSP violation.
1.  Create a folder `extension/firefox/icons/sites/`.
2.  Download/create icons for the 10 domains listed in `config.js` (x, facebook, youtube, etc.).
3.  Update `popup.js` to load icons from the local path (e.g., `./icons/sites/twitter.png`) instead of the Google URL.

**Alternative (If using external images):**
Update `manifest.json` CSP to allow the source:
```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self'; connect-src 'self' ws://127.0.0.1:9999; img-src 'self' https://www.google.com"
}
```

## 🟡 Required Fixes (Compliance)

### 2. Correct Alarm Interval
**The Issue:** `background.js` sets `periodInMinutes: 0.5`.
**Requirement:** The minimum allowed interval for released extensions is **1 minute**.
**Action:** Change the interval in `background.js`:
```javascript
chrome.alarms.create('keepAlive', { periodInMinutes: 1 });
```

### 3. Add Extension ID
**The Issue:** `manifest.json` is missing the Firefox-specific ID required for signing and submission.
**Action:** Add the `browser_specific_settings` key to `manifest.json`:
```json
"browser_specific_settings": {
  "gecko": {
    "id": "pomolocal@yourdomain.com", // Replace with your actual ID/email structure
    "strict_min_version": "109.0"
  }
}
```

## 🟢 Submission Prep & Best Practices

### 4. Permission Justification
When submitting to AMO, you must justify the `<all_urls>` permission.
**Draft Text:**
> "This extension is a website blocker. It requires <all_urls> permission to use the 'declarativeNetRequest' API to redirect navigation from distracted sites (defined by the user) to a local 'blocked.html' page. Since the user can choose to block any domain, we require access to intercept requests on all URLs."

### 5. Dependency Clarification
**Action:** Ensure the extension description in `manifest.json` and the AMO listing clearly states:
> "This is a companion extension for the Pomolocal CLI tool. It requires the CLI application running on localhost to function."

---

## Implementation Checklist

- [x] **Assets**: Download/create icons for supported sites and save to `icons/sites/`.
- [x] **popup.js**: Update `createSiteItem` to use local icon paths.
- [x] **background.js**: Update alarm interval to `1`.
- [x] **manifest.json**: Add `browser_specific_settings`.
- [ ] **manifest.json**: (Optional) Update CSP if strictly sticking to external images (not recommended).
- [ ] **Test**: Verify `bunx pomolocal` connection works and images load correctly.
