# endeavor Shield + Meet Extension

Standalone Chrome extension scaffold for the `endeavor` project.

## v0.1 features

- Shield Gen popup for passwords and passphrases
- Bitwarden-style vault flow with master PIN setup and unlock state
- Site-aware saved logins surfaced for the active webpage
- Autofill action for username and password on the active tab
- Local encrypted vault in `chrome.storage.local`
- Google Meet content capture scaffold
- Popup tab for transcript, summary, and extracted action items
- Background worker that stores and summarizes transcript state

## Load unpacked

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select `C:\Users\evan\todo-app\extension`

## Current limits

- Meet capture depends on live Google Meet caption DOM structure
- Summary and task extraction are heuristic, not model-backed
- Vault is local to the extension for now
- Autofill currently uses heuristic input detection, not per-site custom field maps
- No icons or Chrome Web Store packaging metadata yet
