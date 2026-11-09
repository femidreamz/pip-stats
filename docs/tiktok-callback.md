# TikTok sign-in return

The public callback describes the response in the browser. A code and state together mean that a response arrived. Anyone can construct such a URL. The public page therefore has no “TikTok connected” state, makes no verification request and never sends a code to a guessed endpoint. Its link leads to the public project information page. The owner opens the private dashboard separately.

| Received by the public page | What the visitor sees |
| --- | --- |
| One nonblank code and state, optionally with granted scopes | Sign-in response received. Check the private dashboard for confirmation. |
| Access denied | Permission declined. The owner can start again if they intended to grant access. |
| Another provider error | Sign-in did not finish. Start a new sign-in. |
| Direct visit or reload after URL cleanup | No sign-in response. Existing connection status is available only in the dashboard. |
| Partial, conflicting, repeated or unexpected fields, or a fragment | Invalid link. Start a new sign-in. |
| JavaScript unavailable | A neutral message directs the owner to the dashboard. |

The script renders fixed text, requests no remote services and removes the query and fragment from the current history entry. If history editing fails, it navigates to the clean path. With JavaScript disabled, the browser cannot perform this cleanup. The referrer policy covers local assets and links. URL cleanup happens after the initial request and cannot redact hosting, CDN or proxy logs.

## Private server integration

The public repository contains no implementation of a private callback. Confirm the configured redirect URI and private server behavior before wiring up a real sign-in. If TikTok returns the code to static hosting, this draft discards it. To complete sign-in, a private server must receive the registered HTTPS callback directly, or handle that path at the server before any static page is served.

1. Start the flow from the authenticated owner's dashboard. Generate cryptographically random, expiring, single-use state and bind it to that owner session and login attempt. Keep the session cookie secure and HttpOnly.
2. At the callback, validate the response against that session. Reject missing, mismatched, expired or replayed state. Claim the matching attempt atomically before exchanging a code, so duplicate returns cannot exchange it twice. Handle provider errors as unsuccessful attempts. Leave any previous working connection intact.
3. Exchange the code server-to-server using a form-encoded POST to TikTok's token endpoint with the app's client key and secret, the same registered redirect URI and the authorization-code grant. Supply the original PKCE verifier if the flow used PKCE. Treat HTTP errors, provider errors and incomplete token responses as failed exchanges. [TikTok Web Login Kit](https://developers.tiktok.com/docs/en/login-kit-web) · [Token exchange](https://developers.tiktok.com/docs/en/oauth-get-a-user-access-token)
4. Check the token response's app-scoped account identifier against the intended owner's trusted account binding. Verify the granted read-only scopes required by the dashboard using the token response. Ignore account and permission claims in the return URL. Store tokens, expiry, account binding and the attempt's verified result securely on the server. Only a completed save can mark that attempt connected. [Token storage and lifecycle](https://developers.tiktok.com/docs/en/oauth-user-access-token-management)
5. Redirect to a clean dashboard URL. Render “TikTok connected” there only from this attempt's verified result in the owner's authenticated session. An older connection or a visitor-supplied success flag cannot confirm this attempt. On denial, expiry, insufficient access, wrong account or service failure, show a short explanation and a way to start a fresh sign-in.

Set `Cache-Control: no-store` and `Referrer-Policy: no-referrer` on the private callback and result. Redact callback queries and token requests/responses from access logs, error reports and analytics. Keep codes, tokens, secrets and raw provider errors out of HTML, browser storage and onward URLs.

## Offline review

Run `node --test tests/callback.test.cjs` from the repository root. The cases use synthetic query values and the actual callback script. They require no credentials or TikTok access.
