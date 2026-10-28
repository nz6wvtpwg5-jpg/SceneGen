# SceneGen transactional email setup

SceneGen sends account and day-sheet invitation email through Resend. Verify `scenegen.io` in Resend before enabling production delivery.

Set these variables on **both** Render services (`scenegen-web` and `scenegen-api`):

```text
RESEND_API_KEY=<the secret Resend API key>
EMAIL_FROM=SceneGen <support@scenegen.io>
EMAIL_REPLY_TO=support@scenegen.io
APP_URL=https://scenegen-web.onrender.com
```

Keep the API key secret. Do not commit it, expose it through a `NEXT_PUBLIC_` variable, or paste it into client-side code. Redeploy both services after changing the variables.

## Smoke test

1. Register a test account and confirm the verification email arrives.
2. Request a password-reset email.
3. Create a day-sheet collaborator invitation.
4. Confirm the invitation arrives at the assigned address and opens the correct private link.
5. If delivery fails, confirm the UI still presents a copyable invitation link.

Resend delivery attempts can be inspected in the Resend dashboard logs. The application deliberately treats invitation-email failure as non-destructive: the invitation remains valid and can be shared manually.
