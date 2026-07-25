# Governed Analyze–Recommend–Plan Loop

## Purpose

Turn trustworthy OmniPost campaign evidence into repeatable improvement plans
while keeping humans accountable for strategy, claims, policy, spend,
approval, and publishing decisions.

This is not an autonomous campaign optimizer. The system may analyze evidence,
recommend bounded changes, and draft plans. It may not change live campaign,
policy, approval, budget, credential, or queue state without the existing
authorization boundary.

## Operating Loop

```text
evidence readiness
  -> versioned analysis
  -> ranked recommendations
  -> human disposition
  -> versioned experiment/remediation plan
  -> authorized execution through existing gates
  -> result and incident capture
  -> calibration
```

## Contracts

### Evidence readiness

Each analysis records:

- tenant and campaign scope;
- evidence window and immutable source references;
- completeness, freshness, and tagging-quality scores;
- missing or conflicting data;
- comparison baseline or holdout;
- privacy and consent eligibility; and
- analysis version.

An incomplete evidence set produces a data-remediation recommendation, not a
performance claim.

### Analysis

Analyses label each statement as:

- **observation:** directly supported by cited records;
- **inference:** a bounded interpretation with confidence and alternatives; or
- **hypothesis:** a testable explanation requiring an experiment.

Raw customer content, secrets, hidden reasoning, and cross-tenant examples are
not copied into analysis records. Analyses retain source IDs and approved
summaries sufficient for audit.

### Recommendation

Every recommendation includes:

- stable recommendation ID and analysis version;
- affected campaign, content, channel, audience, or workflow;
- cited evidence and known missing data;
- expected direction and magnitude of impact;
- confidence and uncertainty;
- effort, cost, legal/policy, brand, privacy, and reliability risk;
- counterfactual or “do nothing” option;
- expiry or reassessment date; and
- proposed owner.

Recommendations are ranked by expected evidence-adjusted value, not engagement
alone. Legal, privacy, brand, accessibility, and reliability guardrails cannot
be traded away for predicted lift.

### Human disposition

An authorized reviewer records `approve`, `revise`, `defer`, or `reject` with
rationale. The original recommendation remains immutable. A revision creates a
new version linked to the prior record.

### Plan

An approved recommendation becomes a draft experiment or remediation plan
containing:

- owner and accountable reviewer;
- target scope and excluded scope;
- baseline and primary measure;
- secondary measures and guardrails;
- sample/window assumptions;
- implementation tasks and dependencies;
- approval and rollout sequence;
- stop condition and rollback;
- evidence destination; and
- review date and decision options.

Plans enter the normal Baton and repository workflow. Draft generation does not
authorize execution.

### Feedback

At review, record the result, confidence, incidents, guardrail effects, and
continue/revise/pause/stop decision. Calibration reports compare predicted
direction and magnitude with observed results, including rejected and deferred
recommendations to expose selection bias.

## Roles

- **Data:** evidence quality, baselines, holdouts, and statistical validity.
- **Marketing/Product:** interpretation, prioritization, and customer value.
- **Security/Legal:** privacy, consent, policy, and prohibited-data controls.
- **Engineering:** feasibility, reliability, rollout, and rollback.
- **Human reviewer:** final recommendation disposition and plan authorization.
- **Baton:** owner, dependencies, status, evidence, and closeout.

## Delivery Slices

1. Define analysis, recommendation, disposition, plan, and result schemas.
2. Build read-only evidence readiness and analysis views.
3. Add recommendation ranking with evidence and uncertainty display.
4. Add immutable human disposition.
5. Generate versioned draft plans and Baton-ready task proposals.
6. Capture outcomes and calibration without autonomous mutation.

Each slice requires tenant-isolation tests, prohibited-field tests,
authorization tests, failure-mode tests, and `pnpm check-all`.

## Exit Criteria

Gate 8A closes only when:

1. three consecutive review cycles run from evidence readiness through recorded
   result;
2. every recommendation cites authorized evidence and exposes uncertainty,
   missing data, risk, and counterfactual;
3. every approved recommendation produces a versioned plan with owner,
   baseline, measure, guardrails, stop condition, rollback, and review date;
4. rejected and deferred recommendations remain reconstructable and appear in
   calibration;
5. cross-tenant, prohibited-field, and authorization tests pass; and
6. no generated recommendation or plan directly mutates live campaign, policy,
   approval, budget, credential, or queue state.

## Stop Conditions

Stop and remediate if evidence lineage cannot be reconstructed, tenant or
consent scope is ambiguous, recommendation confidence is presented without
missing-data context, a guardrail is optimized away, or generated output
bypasses human authorization.
