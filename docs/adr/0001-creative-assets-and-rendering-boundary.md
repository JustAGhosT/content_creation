# ADR 0001: OmniPost owns creative assets; Mill renders them

- Status: Proposed
- Date: 2026-08-27
- Baton task: `46f48480`
- Related roadmap: `docs/roadmaps/MARKETING_CAMPAIGN_OPERATING_SYSTEM.md`

## Context

OmniPost already owns campaign content, immutable campaign versions, approvals,
publishing, and audit evidence. FlairForge contains useful prototype concepts
for format categories, positioned template sections, guided authoring, preview,
and export, but its persistence is local or mocked and its render path assumes
customer-specific EJS files and an in-process browser.

Absorbing FlairForge as a separate service would split campaign ownership and
approval across products. Moving the workflow into Mill would instead make a
rendering utility responsible for product state. Both choices would weaken the
existing OmniPost source-of-truth boundary.

## Decision

OmniPost owns the authoring and governance domain. Mill is a bounded,
replaceable adapter for deterministic rendering and format conversion.

OmniPost owns:

- tenant-scoped brand kits and source assets;
- templates, editable slots, template versions, and platform dimensions;
- campaign, content, and variant associations;
- authoring, preview requests, review, approval, retention, and audit events;
- immutable approved creative versions and their canonical hashes; and
- render-job orchestration, idempotency, status, and artifact references.

Mill owns:

- validating a supported render request envelope;
- deterministic layout, rasterization, and format conversion;
- bounded execution limits and renderer version reporting; and
- returning artifact metadata or a classified failure.

Mill must not own tenants, brand kits, templates, campaign workflow, approvals,
provider credentials, publish scheduling, or product audit policy. OmniPost may
replace Mill without changing its domain model.

## Contract

All IDs are opaque strings and all timestamps are UTC ISO 8601. Canonical JSON
version 1 recursively sorts object keys by unsigned UTF-16 code units: compare
each code unit numerically from left to right, and sort a shorter key first when
it is an exact prefix. This ordering is independent of locale, operating
system, and ICU data. The serializer omits object properties whose value is
`undefined`, preserves array order, and serializes strings, booleans, finite
numbers, and explicit `null` with JavaScript `JSON.stringify` semantics. It
performs no Unicode normalization; producers must therefore supply identically
normalized strings. Explicit `null` remains distinct from an omitted property.
The resulting string is encoded as UTF-8 and SHA-256 hashed as
`sha256:<lowercase-hex>`.

OmniPost's current `stableStringify` in `lib/campaigns/contracts.ts` uses
default `localeCompare` ordering and is therefore not a conforming canonical
JSON version 1 implementation. Activation is blocked until it uses the
environment-independent ordering above and OmniPost and Mill pass the same
shared conformance vectors. Those vectors must include nested objects, arrays,
Unicode and non-ASCII keys with deliberately different locale and code-unit
orders, prefix keys, numbers, nulls, and omitted values, with exact serialized
bytes and hashes asserted in both services.

### Ownership and authoring records

`BrandKit` is tenant-owned and contains a name, version, approved logo/source
asset references, color and typography tokens, accessibility defaults, and
status. Secrets and remote-provider credentials are never brand-kit fields.

`CreativeAsset` is tenant-owned and records media type, byte size, dimensions,
content hash, storage reference, provenance classification, rights/consent
state, accessibility metadata, retention class, and created-by identity. The
storage reference is opaque; telemetry never contains signed URLs or bytes.

`CreativeTemplate` has a stable ID, tenant owner, optional brand-kit ID,
supported platforms/formats, and current draft version. Each immutable
`CreativeTemplateVersion` contains:

- schema version and canonical hash;
- canvas width, height, unit, DPI, aspect ratio, bleed/safe-area metadata;
- ordered editable slots with stable IDs, semantic type, bounds, constraints,
  defaults, required state, and style-token references;
- accessibility requirements, including reading order and alt-text rules;
- referenced asset versions and provenance; and
- author, creation time, superseded version, and lifecycle state.

Slots are typed (`text`, `image`, `logo`, `product`, `cta`, or `contact`) and
must not accept arbitrary executable HTML, scripts, remote CSS, or unrestricted
URLs. Template changes create a new version.

`CreativeVariantVersion` binds one template version and exact slot values to
the existing `campaignId`, `campaignVersionId`, `contentId`, and `variantId`.
It records platform, locale, canonical input hash, author, and lifecycle state.
The variant version is the unit reviewed and rendered.

### Approval

Approval is server-authoritative and append-only. An approval binds reviewer,
decision, time, `campaignVersionId`, `contentId`, `variantId`, creative variant
version, template-version hash, asset-version hashes, and canonical input hash.
The canonical input hash also covers every output-affecting target field:
platform, media type, dimensions, unit, DPI, color profile, quality constraints,
and accessibility output requirements. Any change to template, slot content,
referenced asset, target field, or accessibility metadata invalidates the
previous approval and creates a new variant version. UI state cannot approve or
mutate an approved record.

The current `approvalSchema`, Prisma `CampaignApproval`, and
`assertApprovedForQueue` bind only campaign/content identity and `contentHash`;
they do not yet satisfy this creative contract. The composer implementation
must extend request validation, append-only persistence, and queue/render
authorization with the creative variant version, template-version hash,
ordered asset-version hashes, canonical target specification, accessibility
metadata, and canonical input hash. Contract tests must mutate each bound input
independently and prove that the previous approval is rejected.

### Render job

OmniPost sends Mill a `RenderRequest` containing only:

- contract/schema version, render-job ID, and idempotency key;
- canonical input hash and immutable template/variant version identifiers;
- resolved layout/slot values and short-lived, least-privilege asset reads;
- target media type, dimensions, DPI, color profile, and quality constraints;
- accessibility output requirements; and
- trace correlation ID and bounded deadline.

The canonical input hash identifies the approved creative input: resolved
layout and slot values, immutable template and variant versions, ordered asset
version/content hashes, and the complete approved target specification. It
does not include delivery or execution metadata.

OmniPost must recompute this hash server-side from the authoritative approved
template and variant records, resolved layout and slot values, verified asset
version/content hashes, and target specification before dispatch. A hash
supplied by a client or carried on an earlier request is a claim, never the
authority. OmniPost rejects a mismatch against the recomputed and approved hash
before it derives the request fingerprint or calls Mill.

The Mill envelope must contain the complete resolved inputs needed to perform
the same derivation. Mill independently recomputes the canonical input hash
from that envelope, verifies asset bytes against the bound content hashes, and
rejects a mismatch before accepting the request fingerprint or rendering. The
`canonicalInputHash` placed in `fingerprintInput` is the recomputed value, not
an unverified request field.

The request fingerprint is distinct from that input hash. It is
`sha256(canonical-json-v1(fingerprintInput))`, where `fingerprintInput` is
exactly:

```text
{
  contractVersion,
  canonicalInputHash,
  templateVersionId,
  variantVersionId,
  assetContentHashes,
  target: {
    platform, mediaType, dimensions, unit, dpi, colorProfile,
    qualityConstraints, accessibilityOutputRequirements
  }
}
```

The contract/schema version, canonical input hash, immutable template and
variant identifiers, ordered asset content hashes, and every target field are
included directly. Resolved layout/slot values and stable asset identities are
included transitively through `canonicalInputHash`. `renderJobId`,
`idempotencyKey`, short-lived asset-grant URL/token/expiry values, trace
correlation ID, and deadline are excluded because they control delivery or
execution rather than output. Asset grants must still resolve only to the
included asset identities and content hashes; changing a grant must not change
the fingerprint, while changing the bytes it authorizes must fail hash
verification. OmniPost rejects any output-affecting mismatch against the
approval, and Mill independently derives and verifies the same fingerprint
before rendering.

Shared contract vectors must vary every `RenderRequest` field independently,
assert whether the fingerprint changes, and assert identical canonical bytes
and fingerprint results in OmniPost and Mill. They must also prove that grant
rotation and operational-ID changes do not alter the fingerprint, while any
creative, asset-content, contract-version, or target change does. A required
negative vector changes resolved slot values while retaining the old claimed
hash and proves that both services reject the request before fingerprinting or
rendering.

Mill returns a `RenderResult` with renderer name/version, status, output media
type, dimensions, byte size, content hash, artifact handoff reference,
started/completed timestamps, warnings, and a stable error code. It must not
return credentials or echo source content into logs.

OmniPost persists `RenderJob` state (`requested`, `running`, `reconciling`,
`escalated`, `succeeded`, `failed`, `cancelled`, or `expired`), request
fingerprint, attempt count, dispatch deadline, lease token and expiry, last
heartbeat, Mill attempt reference/receipt, renderer version, artifact metadata,
and classified failure. Storage enforces a unique `(tenantId, idempotencyKey)`
binding to exactly one request fingerprint. Creation is atomic: concurrent
identical submissions resolve to the same job; the same key with a different
fingerprint fails with an idempotency conflict before Mill is called.

Retries read the durable job before doing external work. A succeeded job reuses
its immutable artifact when its hash and retention state remain valid. A worker
claims a job atomically with a unique lease token and must heartbeat before the
lease expires; every state write is fenced by that token so a stale worker
cannot overwrite recovery work. A periodic reaper processes overdue dispatch
deadlines and expired leases, so `requested` and `running` cannot remain stale
indefinitely.

For stale `requested` work with no durable dispatch attempt, the reaper records
a bounded retry and re-enqueues the same job and idempotency key atomically. For
an expired `running` lease, a failure proven to have occurred before any Mill
call may likewise retry the same job. Once transport to Mill may have started,
the attempt must have a durable Mill reference/receipt or be treated as an
unknown outcome: the reaper moves the job to `reconciling` and must not issue
another render call. An in-time retry only returns the current job state.

Timed-out, expired-after-dispatch, receipt-without-result, or otherwise unknown
Mill outcomes remain in bounded reconciliation until Mill or artifact evidence
proves whether output exists. Reconciliation attaches a verified existing
artifact, records a terminal classified failure, or atomically enters
`escalated` after its own deadline; it never silently starts a duplicate
render. A definitely failed pre-render attempt may add a bounded attempt to the
same logical job.

`escalated` is durable and terminal for automatic dispatch, retry, and
reconciliation. It clears any active lease and records `escalatedAt`, a stable
reason code, the last known Mill/attempt references, evidence consulted, and a
required operator action or resolution path. Reapers and ordinary retries only
return this state. An authorized operator/product decision is recorded as an
append-only resolution event and may attach a verified artifact, record a
terminal classified failure or cancellation, or authorize a new `RenderJob`
with a new idempotency key. It must not resume or re-dispatch the escalated job.

Contract tests must cover fingerprint conflict, concurrent submission,
successful artifact reuse, queue loss before dispatch, worker failure before a
Mill call, worker failure after dispatch with and without a receipt, lease
expiry and stale-worker fencing, safe pre-dispatch retry, reconciliation
deadline and persisted escalation, operator resolution, and unknown-outcome
reconciliation before the pilot. Each test must prove that the job reaches a
terminal state without duplicate Mill execution and that an escalated job
cannot be retried or replaced without the explicit resolution event.

`PreviewArtifact` is explicitly non-publishable and may be watermarked or
lower resolution. `ApprovedCreativeArtifact` is immutable, references the
approval and render job, and records content hash, media metadata, storage
reference, retention class, and expiry/deletion state. Publishing references
the approved artifact version and hash, never a mutable URL.

### Retention and audit

Source assets, previews, approved artifacts, and audit metadata have separate
configurable retention classes. Preview artifacts default to short-lived.
Approved artifacts remain available for the campaign evidence period. Deletion
removes bytes according to policy while retaining the minimum lawful tombstone
and hashes needed for audit. Tenant export and deletion must cover every
creative record and artifact reference.

Allow-listed audit events include:

- `brand_kit.created`, `brand_kit.versioned`;
- `creative_asset.uploaded`, `creative_asset.deleted`;
- `creative_template.versioned`;
- `creative_variant.versioned`;
- `creative_variant.approved`, `creative_variant.rejected`;
- `render.requested`, `render.succeeded`, `render.failed`; and
- `creative_artifact.expired`, `creative_artifact.deleted`.

Events contain stable IDs, versions, hashes, actor class, outcome, error class,
and correlation ID. They exclude raw prompts, complete creative copy, asset
bytes, signed URLs, provider credentials, access tokens, and secret references.

## Security and failure rules

- Every read and mutation is tenant-filtered at the data-access boundary.
- Uploads are size/type constrained, malware scanned, and stored outside the
  executable web root.
- User-controlled text is validated and safely encoded before rendering.
- Short-lived asset grants are scoped to the exact render job and inputs.
- No direct-provider fallback bypasses OmniPost/Sluice policy or audit.
- Rendering fails closed for stale approval, hash mismatch, unsupported output,
  missing accessibility requirements, or unknown renderer result.
- Telemetry is allow-listed and privacy reviewed before activation.

## Consequences

The product keeps one campaign and approval model, while rendering can scale or
change independently. Immutable hashes make approval-to-artifact-to-publish
traceability possible. The cost is additional versioned records, artifact
lifecycle work, and an adapter contract before the composer can ship.

This ADR does not authorize deployment, credential creation, production data
migration, retention-policy activation, or a Mill production integration.
