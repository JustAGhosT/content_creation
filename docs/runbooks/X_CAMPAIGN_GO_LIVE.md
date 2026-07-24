# X Campaign Go-Live Runbook

This runbook takes the seeded **OmniPost on X - First Live Campaign** from draft
to one verified production post. The first post is a controlled smoke test. Do
not schedule posts two and three until the smoke post and its evidence pass.

## Success criteria

- The authorized OmniPost X account publishes exactly one approved text post.
- OmniPost receives the X post ID and returns a link under `https://x.com/...`.
- The scheduler result shows one successful job and no duplicate post.
- The operator captures the deployment commit, publish time, X post URL, and
  scheduler result in Baton task `7e1feab6-a668-4c18-b54d-691eddcd243f`.

## 1. Assign the people and account

Name one campaign owner and one technical operator. The account owner must
confirm the exact X handle, approve the first post copy, and be available during
the smoke window. Use a dedicated OmniPost brand account, not a personal account.

## 2. Create and authorize the X app

1. Create an X developer project and app.
2. Enable OAuth 2.0 user authentication.
3. Because the alpha does not yet have an account-connection flow, configure a
   callback URL for a trusted OAuth 2.0 PKCE client used by the technical
   operator to complete this single-account authorization.
4. Request `tweet.read`, `tweet.write`, and `users.read`. Request
   `offline.access` only when refresh-token handling is in place.
5. Authorize the exact X account chosen in step 1.
6. Confirm the X project has enough API credits for the smoke post and
   verification calls.

The credential must be a **user-context access token**. An app-only bearer token
can read some X data but cannot create a post.

Reference the official
[X OAuth 2.0 authorization-code guide](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code)
and check the current [X API pricing](https://docs.x.com/x-api/getting-started/pricing)
before the smoke window.

## 3. Store the credential without exposing it

1. Add the token to Azure Key Vault `nl-dev-omnipost-kv` as
   `TWITTER-ACCESS-TOKEN` using the approved secret-management interface.
2. Record the new secret version URI without copying the secret value.
3. Set these App Service settings on `nl-dev-omnipost-web`:

   ```text
   TWITTER_API_URL=https://api.x.com/2/tweets
   TWITTER_ACCESS_TOKEN=@Microsoft.KeyVault(SecretUri=https://nl-dev-omnipost-kv.vault.azure.net/secrets/TWITTER-ACCESS-TOKEN/<version>)
   ```

4. Restart the App Service after the settings resolve.
5. Verify the Key Vault reference reports `Resolved`. Never print the setting
   value, token, or full environment.

## 4. Preflight production

1. Confirm the deployment workflow for the intended commit succeeded.
2. Confirm both endpoints return HTTP 200:

   ```text
   https://nl-dev-omnipost-web.azurewebsites.net/api/health
   https://omnipost.neuralliquid.ai/api/health
   ```

3. Open the dashboard with the production operator account.
4. Open **Campaigns** and select **OmniPost on X - First Live Campaign**. The
   seed reconciler adds it on dashboard load without replacing existing
   campaigns.
5. Confirm the campaign is `draft`, contains three posts, and has only X enabled.
6. Confirm the first adaptation is at most 280 characters, has no media, URL,
   mention, or hashtag, and matches the account owner's approved copy.
7. Choose a staffed smoke window. Do not queue any other X job for that window.

## 5. Queue only the smoke post

The Campaigns screen is the campaign source and review surface in the current
alpha; it does not yet create scheduler jobs.

1. Copy the approved body from **Prove one real publishing path**.
2. Open **New Content**.
3. Enter the campaign post title and body.
4. In Platform Adaptation, turn every platform off except **X**. In particular,
   confirm LinkedIn is off.
5. Choose **Publish Now** once. This queues one due X job; it does not call X
   directly.
6. Do not retry from the UI while the request is pending.

Expected request contract:

```http
POST https://api.x.com/2/tweets
Authorization: Bearer <user-context-access-token>
Content-Type: application/json

{"text":"<approved post text>"}
```

Expected success evidence is an X response containing `data.id`, an OmniPost
published result, and a post URL beginning with `https://x.com/`.

## 6. Process the due job

The current Azure alpha has no recurring scheduler trigger. From a trusted
operator environment where `OMNIPOST_CRON_SECRET` is injected without placing
the value in shell history, invoke the protected processor once:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri 'https://omnipost.neuralliquid.ai/api/scheduler/process' `
  -Headers @{ Authorization = "Bearer $env:OMNIPOST_CRON_SECRET" }
```

Require `processed: 1`, `successful: 1`, and `failed: 0`. If `processed` is
zero, inspect the job and scheduled time before considering a retry. Never call
the processor repeatedly to compensate for an unknown state.

## 7. Verify before expanding

Within five minutes:

1. Open the returned X URL in a signed-out browser session.
2. Confirm the correct account, exact copy, and one post only.
3. Confirm the processor result is `success`, not `failure`.
4. Capture the commit SHA, UTC publish time, X post ID/URL, and scheduler result
   in the Baton task. Never include tokens or Key Vault secret URIs.
5. Watch for an additional ten minutes for delayed duplicate jobs or errors.

After the smoke passes, copy and schedule posts two and three from the campaign
at least 24 hours apart, using the same one-platform flow. Review each post
before scheduling. Track impressions, engagements, profile visits, replies, and
link-free signup attribution for the first seven days.

## Stop and rollback

Stop immediately on a 401/403, wrong-account post, duplicate, altered copy,
unresolved Key Vault reference, or missing audit evidence.

1. Pause the campaign and cancel pending X jobs through the scheduler API.
2. Remove `TWITTER_ACCESS_TOKEN` from the App Service settings to restore the
   scheduler's fail-closed behavior.
3. Revoke or rotate the affected X token when authorization is in doubt.
4. Delete an incorrect public post only with the account owner's approval.
5. Record the failure status and evidence in Baton before retrying.

## Known starter limitation

This first path accepts a provisioned user-context access token but does not yet
refresh OAuth tokens. Campaign data is local to the browser, the campaign screen
does not create jobs, the server queue is memory-backed, and Azure has no
recurring scheduler trigger. Treat an app restart, token expiry, or unknown job
state as a stop condition. A production-grade multi-account flow must add
encrypted per-account token storage, refresh handling, a persistent queue,
recurring processing, revocation, and reconnect UX before broad rollout.
