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
3. Configure the exact production callback URL:
   `https://omnipost.neuralliquid.ai/api/platforms/x/callback`.
4. Request `tweet.read`, `tweet.write`, `users.read`, and `offline.access` so
   OmniPost can refresh the user grant without retaining a static token.
5. Sign in to OmniPost, open **Settings > Platform Connections**, choose
   **Connect** for X, and authorize the exact account chosen in step 1.
6. Confirm the X project has enough API credits for the smoke post and
   verification calls.

The credential must be a **user-context access token**. An app-only bearer token
can read some X data but cannot create a post.

Reference the official
[X OAuth 2.0 authorization-code guide](https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code)
and check the current [X API pricing](https://docs.x.com/x-api/getting-started/pricing)
before the smoke window.

## 3. Verify the credential boundary

1. Confirm the X client ID and client secret App Service references report
   `Resolved`. Never print a setting value, token, or full environment.
2. Confirm **Platform Connections** shows the approved handle as `Connected`.
3. Do not copy the user access or refresh token into Key Vault, shell history,
   browser storage, or evidence. OmniPost encrypts the per-account grant in the
   application database and refreshes it server-side.
4. If the connection shows `Reconnect Required`, complete a staffed reconnect
   before queueing content. Do not bypass it with a static bearer token.

## 4. Preflight production

### No-credit contract preflight

X documents an API Playground that runs as a local mock server for X API v2
without consuming credits. Use it to verify OmniPost's create-post request,
response parsing, and HTTP error classification before a staffed window.

This is contract evidence only. It does not prove production OAuth consent,
provider credits, a real post ID, public visibility, or revocation. Record it as
`mock_contract`, never as a live publish. See the official
[X tools and libraries](https://docs.x.com/tools-and-libraries) reference.

1. Confirm the deployment workflow for the intended commit succeeded.
2. Confirm both endpoints return HTTP 200:

   ```text
   https://nl-dev-omnipost-web.azurewebsites.net/api/health
   https://omnipost.neuralliquid.ai/api/health
   ```

3. Open the dashboard with the production operator account.
4. Open **Settings > Platform Connections** and confirm X is `Connected` to the
   approved handle.
5. Open **Campaigns** and select **OmniPost on X - First Live Campaign**. The
   seed reconciler adds it on dashboard load without replacing existing
   campaigns.
6. Confirm the campaign is `draft`, contains three posts, and has only X enabled.
7. Confirm the first adaptation is at most 280 characters, has no media, URL,
   mention, or hashtag, and matches the account owner's approved copy.
8. Confirm `nl-dev-omnipost-scheduler` has a recent successful execution and no
   unexplained processor failures.
9. Choose a staffed smoke window. Do not queue any other X job for that window.

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

The Azure Container Apps Job `nl-dev-omnipost-scheduler` invokes the protected
processor every two minutes. It has one replica and no platform-level retry;
the durable scheduler owns leases, classified retries, and unknown-result
reconciliation.

For a scheduler-only smoke, first prove there are no due jobs and then start one
execution manually:

```powershell
az containerapp job start `
  --name nl-dev-omnipost-scheduler `
  --resource-group nl-dev-omnipost-rg
```

Require the Container Apps execution to succeed and the application summary to
show `processed: 0`, `successful: 0`, and `failed: 0`.

For the staffed X smoke, queue exactly one approved due job and let the next
scheduled execution process it. Require `processed: 1`, `successful: 1`, and
`failed: 0`. If `processed` is zero, inspect the job and scheduled time before
considering any manual start. Never invoke the processor repeatedly to
compensate for an unknown state.

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
2. Disconnect X in **Settings > Platform Connections** to revoke the provider
   grant and remove the stored credentials.
3. Reconnect only after the account owner confirms the intended account and
   scopes.
4. Delete an incorrect public post only with the account owner's approval.
5. Record the failure status and evidence in Baton before retrying.

## Known starter limitation

The production path has encrypted per-account OAuth storage, refresh and
revocation handling, a persistent leased queue, rate-limit coordination, and a
recurring Azure processor. The first authentic X connect/publish/revoke proof is
still operator- and credential-gated. Treat a wrong account, provider outcome
requiring reconciliation, or missing audit evidence as a stop condition; do not
expand to unattended multi-account publishing until that evidence passes.
