# Shield Gen Recovery Functions

This folder scaffolds the server-assisted PIN recovery flow used by the Chrome extension.

## Endpoints

- `registerRecoveryProfile`
  - Auth: Google OAuth access token in `Authorization: Bearer <token>`
  - Body: `{ recoveryId, recoveryVaultKey }`
  - Stores the server-side recovery copy for the signed-in account email.

- `requestPinReset`
  - Auth: none
  - Body: `{ email }`
  - Generates a short-lived reset code and emails it to the account.

- `consumePinReset`
  - Auth: none
  - Body: `{ email, code }`
  - Verifies the code and returns `{ recoveryId, recoveryVaultKey }`.

## Required environment variables

- `SHIELD_RESET_PEPPER`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

If the Resend variables are missing, the function logs the reset code to server logs instead of sending email.

## Notes

- This is a server-assisted recovery model. The backend stores a recovery copy of the vault key so the extension can re-wrap it after email verification.
- Deploy these functions before using the extension reset flow.
