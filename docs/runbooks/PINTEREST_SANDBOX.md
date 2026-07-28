# Pinterest Sandbox integration proof

Pinterest's API v5 Sandbox is a provider-operated test data plane. Sandbox
tokens cannot be used in production, and Sandbox Pins and boards remain
separate from production entities. Treat this as provider contract evidence,
not proof that OmniPost can publish a public production Pin.

## Operator prerequisites

1. Create or use an OmniPost-owned Pinterest business account.
2. Create a Pinterest developer app and obtain Trial or Standard access.
3. Generate a Sandbox access token in the app's Configure tab.
4. Create a non-group Sandbox board owned by the same account.
5. Select a public HTTPS image URL containing no secrets or personal data.

Never commit the token. Store deployed values as secret references.

## Controlled smoke

Set these values only in the staffed shell:

- `PINTEREST_SANDBOX_ACCESS_TOKEN`
- `PINTEREST_SANDBOX_BOARD_ID`
- `PINTEREST_SANDBOX_IMAGE_URL`

Run `pnpm smoke:pinterest-sandbox`. The script creates a Sandbox Pin, reads it
back by ID, prints nonsecret JSON evidence, and deletes it in `finally`.

Set `PINTEREST_SANDBOX_RETAIN_PIN=true` only when the staffed operator explicitly
needs temporary visual evidence. Delete the retained Pin after capture.

## Acceptance boundary

Record the result as `provider_sandbox`, never `live_publish`. Do not enable the
Pinterest card for ordinary scheduling until OAuth, encrypted tenant-scoped
tokens, disconnect/revocation, idempotency, and production access are separately
implemented and accepted.

Official references:

- [Pinterest API Sandbox](https://developers.pinterest.com/docs/developer-tools/sandbox/)
- [Pinterest access tiers](https://developers.pinterest.com/docs/key-concepts/access-tiers/)
- [Create Pin](https://developers.pinterest.com/docs/api/v5/pins-create/)
