# endeavor Shield Gen Extension

Standalone Chrome extension scaffold for the `endeavor` project.

## v0.2 features

- Shield Gen popup for passwords and passphrases
- Wrapped vault-key flow with master PIN setup and unlock state
- Site-aware saved logins surfaced for the active webpage
- Autofill action for username and password on the active tab
- Encrypted local vault in `chrome.storage.local`
- Google sign-in scaffold for Google Drive sync
- Server-assisted recovery profile registration for forgot-PIN flow
- Legacy migration from the older PIN-encrypted entry format

## Load unpacked

1. Open `chrome://extensions`
2. Enable `Developer mode`
3. Click `Load unpacked`
4. Select `C:\Users\evan\todo-app\extension`

## Required setup

- Replace the placeholder OAuth client ID in `extension/manifest.json`
- Deploy the recovery functions from `functions/`
- Configure the recovery function environment variables described in `functions/README.md`

## Current limits

- Google sign-in depends on a real Chrome extension OAuth client
- PIN reset depends on the recovery backend being deployed
- Recovery is server-assisted, not zero-knowledge
- Autofill currently uses heuristic input detection, not per-site custom field maps
- No icons or Chrome Web Store packaging metadata yet
