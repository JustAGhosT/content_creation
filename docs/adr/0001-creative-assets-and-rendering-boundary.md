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
uses a documented stable key order and UTF-8 encoding. Hashes use
`sha256:<lowercase-hex>`.

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
Any change to template, slot content, referenced asset, platform dimensions, or
accessibility metadata invalidates the previous approval and creates a new
variant version. UI state cannot approve or mutate an approved record.

### Render job

OmniPost sends Mill a `RenderRequest` containing only:

- contract/schema version, render-job ID, and idempotency key;
- canonical input hash and immutable template/variant version identifiers;
- resolved layout/slot values and short-lived, least-privilege asset reads;
- target media type, dimensions, DPI, color profile, and quality constraints;
- accessibility output requirements; and
- trace correlation ID and bounded deadline.

Mill returns a `RenderResult` with renderer name/version, status, output media
type, dimensions, byte size, content hash, artifact handoff reference,
started/completed timestamps, warnings, and a stable error code. It must not
return credentials or echo source content into logs.

OmniPost persists `RenderJob` state (`requested`, `running`, `succeeded`,
`failed`, `cancelled`, or `expired`), request fingerprint, attempt count,
renderer version, artifact metadata, and classified failure. A successful
retry with the same idempotency key and fingerprint resolves to the same
logical result. A key reused with a different fingerprint fails closed.

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
