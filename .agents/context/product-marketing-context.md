# OmniPost Product Marketing Context

This document provides foundational product context for all marketing skills.
AI agents should read this before using any marketing skill.

## Product Identity

- **Name**: OmniPost
- **Tagline**: "Publish everywhere, manage anywhere"
- **Category**: SaaS Multi-Platform Content Publishing
- **Type**: B2B/B2C web application
- **License**: MIT (open-source)
- **Live Demo**: https://nl-dev-omnipost-app.azurewebsites.net

## Target Users

| Segment               | Description                               | Primary Need                            |
| --------------------- | ----------------------------------------- | --------------------------------------- |
| Content Creators      | Bloggers, writers, indie creators         | Publish once, distribute everywhere     |
| Marketing Teams       | 2-10 person teams at startups/SMBs        | Centralized content operations          |
| SMBs                  | Small businesses managing social presence | Time savings, consistency               |
| Social Media Managers | Freelancers and agencies                  | Multi-client, multi-platform management |

## Core Capabilities

### Content Publishing

- Multi-platform publishing (Facebook, Instagram, LinkedIn, Twitter, Custom)
- Platform-specific content adaptation (character limits, hashtags, threading)
- Campaign management (draft → scheduled → active → completed)
- Content scheduling and queue management
- Human review workflows with approval gates

### AI-Powered Features

- Text summarization (Hugging Face, Azure AI, OpenAI)
- Text parsing and extraction (DeepSeek, OpenAI, Azure)
- AI image generation (Hugging Face Stable Diffusion, DALL-E)
- Content quality scoring

### CRM & Growth

- Lead management with scoring and tagging
- Outreach sequences (email, LinkedIn, SMS)
- Form builder with lead capture
- Engagement analytics and metrics tracking

## Platform Constraints

| Platform  | Character Limit | Capabilities            | Rate Limit          |
| --------- | --------------- | ----------------------- | ------------------- |
| Twitter   | 280 chars       | Text, images, threading | 300/15min, 2400/day |
| LinkedIn  | 3,000 chars     | Text, images, articles  | 100/day             |
| Facebook  | 63,206 chars    | Text, images, video     | 200/hour            |
| Instagram | 2,200 chars     | Images, video, stories  | 200/hour            |
| Custom    | Configurable    | Configurable            | 1000/hour           |

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript (strict), CSS Modules
- **Backend**: Next.js API Routes, Express 5
- **Database**: Prisma 7 ORM, SQLite (dev) / PostgreSQL (prod)
- **Auth**: JWT with bcrypt
- **Validation**: Zod schemas
- **AI**: OpenAI, DeepSeek, Azure AI Foundry, Hugging Face
- **Infrastructure**: Azure Web Apps, Bicep IaC, GitHub Actions CI/CD
- **Notifications**: Slack, Twilio SMS, Nodemailer email

## Integrations

| Integration      | Purpose                                | Status  |
| ---------------- | -------------------------------------- | ------- |
| Hugging Face     | Image generation, summarization        | Active  |
| OpenAI           | Text parsing                           | Active  |
| DeepSeek         | Text parsing (alternative)             | Active  |
| Azure AI Foundry | Chat completion, image gen, embeddings | Active  |
| Airtable         | Data storage and tracking              | Active  |
| Slack            | Team notifications                     | Active  |
| Twilio           | SMS notifications                      | Active  |
| Nodemailer       | Email notifications                    | Active  |
| Upstash Redis    | Rate limiting cache                    | Active  |
| Sluice Gateway   | AI cost tracking and routing           | Planned |

## Pricing Model

**Status: Under Development** — See `pricing-strategy` skill for proposed tier structure.

Proposed model (requires validation):

- **Free**: 2 platforms, 10 posts/month, basic analytics
- **Pro** ($19/mo): Unlimited platforms and posts, AI formatting, scheduling
- **Team** ($49/mo): Pro + collaboration, client workspaces, priority support
- **Enterprise**: Custom pricing, SSO, API access, SLA

Additional models to evaluate:

- Self-hosted/open-source licensing (community edition vs enterprise)
- API-based usage pricing for developers
- Per-client pricing for agencies

## Competitive Landscape

**Direct Competitors**: Buffer, Hootsuite, Later, Sprout Social
**Indirect Competitors**: Canva (content creation), Mailchimp (email), HubSpot (all-in-one)

**Differentiation**:

- Evidence-grade campaign operations: exact approved version, provider-confirmed
  delivery, attribution, decision history, and exportable audit lineage
- Human-governed AI with recorded accept/edit/reject evidence and policy gates
- AI-native content optimization (auto-reformats for each platform's constraints)
- Open-source (MIT license) with self-hosting option — no vendor lock-in
- Built-in CRM, lead management, and outreach sequences
- 34 marketing skills embedded in development workflow (no other publisher has this)
- Developer-first extensibility (API, custom platform adapters)
- Unified analytics across all platforms in one dashboard
- Multi-agent orchestration for development (Retort + 10 team-scoped agents)
- Sluice AI gateway for centralized cost tracking across AI providers

## Strategic Positioning and Moat Thesis

**Positioning direction**:

> For agencies and accountable marketing teams that cannot treat a green
> “scheduled” badge as proof, OmniPost is an evidence-grade campaign operating
> system that binds human approval to provider-confirmed delivery and measurable
> outcomes. Unlike generic social schedulers, OmniPost preserves the exact
> version, decision, attribution, and audit lineage while using AI only inside
> explicit governance boundaries.

**Moat thesis**:

- Gates 0–6 create the reliable product and evidence foundation; they do not by
  themselves establish a moat.
- Defensibility must compound from consented proprietary outcome evidence,
  measurable recommendation lift, embedded customer policies and integrations,
  retained paid workflows, and a repeatable vertical distribution or extension
  channel.
- Open-source code is not treated as secret IP. The protected advantage is the
  hosted trust, evidence network, customer-specific learning, operational
  history, certified ecosystem, and distribution relationships.
- OmniPost must preserve deletion, export, and migration rights. Switching cost
  should be earned through accumulated value, not data hostage-taking.
- “AI-powered,” feature count, or raw data volume are not acceptable moat claims.

## Brand Voice

- **Tone**: Professional yet approachable, technically confident
- **Style**: Clear, direct, benefit-focused
- **Personality**: Efficient, empowering, modern
- **Avoid**: Jargon-heavy, overpromising, corporate-speak

## Current Goals

1. **Primary**: Drive developer adoption and community contributions
2. **Secondary**: Convert free users to paid plans (pricing TBD)
3. **Metric**: Monthly active publishers, content published per user
4. **Conversion Action**: Sign up → connect first platform → publish first content
5. **Beachhead Validation**: Five design-partner organizations complete two
   governed campaigns with at least 90% evidence completeness
6. **Defensibility Proof**: Reproducible outcome lift, 90-day retained recurring
   use, paid intent, and one compounding acquisition or extension channel
