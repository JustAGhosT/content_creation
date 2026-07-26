# Project Structure

This document provides an overview of the project's directory structure and organization.

## Directory Overview

```
omnipost/
├── .agentkit/             # Retort project specification
│   └── spec/             # YAML specification files
│
├── .agents/               # Marketing agent configuration
│   ├── skills/           # 34 marketing skills (Agent Skills Spec format)
│   ├── context/          # OmniPost product context overlays
│   └── config/           # Skills manifest
│
├── .claude-plugin/        # Plugin marketplace manifest
│
├── .cursor/               # Cursor IDE agent configuration
│   └── rules/            # Cursor agent rules per team (10 .mdc files)
│
├── .windsurf/             # Windsurf IDE agent configuration
│   └── rules/            # Windsurf agent rules per team (10 .md files)
│
├── app/                    # Next.js App Router (Route Handlers)
│   ├── api/               # API routes using App Router pattern
│   │   ├── _utils/        # Shared API utilities
│   │   ├── analytics/     # Analytics endpoints
│   │   │   └── events/    # Analytics events API
│   │   ├── audit/         # Audit trail endpoints
│   │   ├── auth/          # Authentication endpoints
│   │   ├── content/       # Content management endpoints
│   │   ├── feature-flags/ # Feature flag endpoints
│   │   ├── feedback/      # User feedback endpoints
│   │   ├── images/        # Image generation endpoints
│   │   ├── notifications/ # Notification system endpoints
│   │   ├── parse/         # Text parsing endpoints
│   │   ├── platforms/     # Platform integration endpoints
│   │   ├── queue/         # Content queue endpoints
│   │   └── summarize/     # Text summarization endpoints
│   ├── (dashboard)/       # Dashboard UI pages
│   ├── (marketing)/       # Marketing/landing pages
│   │   └── pricing/       # Pricing page
│   ├── signup/            # Signup page
│   └── onboarding/        # Guided onboarding flow
│
├── pages/                 # Next.js Pages Router
│   ├── api/              # Legacy API routes (being migrated to app/api)
│   ├── _app.tsx          # Custom App component
│   ├── _document.tsx     # Custom Document component
│   ├── index.tsx         # Landing page
│   ├── automation.tsx    # Automation tools page
│   ├── content-adaptation.tsx
│   ├── human-review.tsx
│   ├── performance-dashboard.tsx
│   ├── platform-analysis.tsx
│   ├── series.tsx        # Series management page
│   ├── workflow.tsx      # Workflow visualization page
│   └── 404.tsx          # Custom 404 page
│
├── components/            # React components
│   ├── adaptation/       # Content adaptation components
│   ├── automation/       # Automation tool components
│   ├── content/         # Content management components
│   ├── dashboard/       # Dashboard components
│   ├── feature-flags/   # Feature flag UI components
│   ├── feedback/        # Feedback mechanism components
│   ├── image/           # Image generation components
│   ├── layouts/         # Layout components
│   ├── platform/        # Platform integration components
│   ├── review/          # Human review workflow components
│   ├── series/          # Series management components
│   ├── text/            # Text processing components
│   └── ui/              # Shared/common UI components
│
├── lib/                   # Core business logic and utilities
│   ├── airtable.ts       # Airtable integration
│   ├── api-client.ts     # API client utilities
│   ├── featureFlags.ts   # Feature flags management
│   ├── analytics/        # AARRR analytics event tracking
│   ├── auth/             # Authentication services
│   ├── clients/          # External API clients
│   │   └── sluice-gateway.ts  # Sluice AI gateway client
│   ├── config/           # Platform and app configuration
│   ├── data/             # Data access layer (e.g., Airtable)
│   └── storage/          # Storage utilities (e.g., token storage)
│
├── hooks/                 # React custom hooks
│   ├── useAnalytics.ts   # Analytics tracking hook
│   ├── useAutomationTools.ts
│   ├── useReviewProcess.ts
│   └── useSeries.ts
│
├── types/                 # TypeScript type definitions
│   ├── automation.ts
│   ├── index.ts
│   ├── platform.ts
│   └── series.ts
│
├── styles/                # CSS modules and global styles
│   ├── globals.css       # Global styles
│   └── *.module.css      # Component-specific CSS modules
│
├── data/                  # Application data and static content
│   ├── feature-flags.json
│   ├── workflowStages.ts
│   ├── siteConfig.json
│   ├── reviewConfig.json
│   ├── adaptationExamples.json
│   └── automationTools.json
│
├── docs/                  # Documentation
│   ├── ARCHITECTURE.md   # Technical architecture documentation
│   ├── api/              # API-specific documentation
│   │   ├── api-migration-todo.md
│   │   └── next-api-best-practices.md
│   ├── guides/           # Developer guides and best practices
│   │   └── next-best-practices/
│   ├── launch/           # Launch content assets
│   └── archived/         # Historical/implementation documentation
│
├── infra/                 # Infrastructure as Code
│   ├── main.bicep        # Azure Bicep template
│   ├── sluice.bicep      # Sluice AI gateway infrastructure
│   ├── naming.sh         # Resource naming script
│   └── parameters.json   # Bicep parameters
│
├── scripts/               # Utility scripts
│   ├── cleanup-old-api.js
│   └── verify-api-routes.js
│
├── __tests__/             # Test files
│   ├── api/              # API route tests
│   ├── integration/      # Integration tests
│   └── lib/              # Library tests
│
├── middleware.ts           # JWT auth middleware
├── CLAUDE.md              # Primary Claude Code agent entry point
├── AGENTS.md              # Cross-agent discovery
├── AGENT_TEAMS.md         # Team documentation
├── QUALITY_GATES.md       # Quality gate definitions
│
```

## Key Directories Explained

### `/.agentkit/spec/` - Retort Project Specification

Contains YAML specification files for the Retort project spec, defining the product and agent behaviors.

### `/.agents/` - Marketing Agent Configuration

Houses the marketing automation agent layer:

- **`skills/`**: 34 marketing skills in Agent Skills Spec format, organized by category (lead management, email sequences, content strategy, engagement, campaign management, analytics)
- **`context/`**: OmniPost product context overlays for agent grounding
- **`config/`**: Skills manifest for discovery and registration

### `/.claude-plugin/` - Plugin Marketplace

Plugin marketplace manifest for Claude Code integration.

### `/.cursor/rules/` and `/.windsurf/rules/` - IDE Agent Rules

Per-team agent rules for Cursor (10 `.mdc` files) and Windsurf (10 `.md` files) IDEs, ensuring consistent AI-assisted development across teams.

### `/app/api/` - Modern API Routes

This directory contains the new API route handlers following the Next.js App Router pattern. These are gradually replacing the legacy API routes in `/pages/api/`.

**Key Features:**

- Uses standard Web Request/Response APIs
- Better TypeScript support
- More flexible middleware options
- Located in `_utils/` subfolder for shared logic

### `/app/api/analytics/events/` - Analytics Events API

API endpoint for ingesting AARRR analytics events (Acquisition, Activation, Retention, Revenue, Referral).

### `/app/signup/` and `/app/onboarding/` - User Onboarding

- **`signup/`**: User signup page
- **`onboarding/`**: Guided onboarding flow for new users

### `/app/(marketing)/pricing/` - Pricing Page

Public-facing pricing page within the marketing route group.

### `/pages/` - Pages and Legacy API Routes

Contains the Next.js pages and legacy API routes. The API routes in `/pages/api/` are being migrated to `/app/api/` as documented in `docs/api-migration-todo.md`.

### `/components/` - React Components

Organized by feature/domain. Components are grouped into logical categories:

- Feature-specific folders (e.g., `automation/`, `platform/`, `review/`)
- Shared/common UI components in `ui/` folder
- Layout components in `layouts/`

Each component folder typically includes an `index.ts` for clean exports.

### `/lib/` - Core Business Logic

Contains reusable business logic, services, and utilities:

- **`analytics/`**: AARRR analytics event tracking (Acquisition, Activation, Retention, Revenue, Referral)
- **`auth/`**: Authentication and authorization services
- **`clients/`**: External API clients, including `sluice-gateway.ts` for the Sluice AI gateway
- **`config/`**: Platform and app configuration
- **`data/`**: Data access and persistence logic
- **`storage/`**: Storage abstractions
- **`featureFlags.ts`**: Feature flags management

### `/data/` - Application Data

Static content and configuration data:

- JSON configuration files (siteConfig, reviewConfig, etc.)
- Feature flags data
- Workflow and engagement metrics data

### `/types/` - TypeScript Types

Centralized type definitions for better type safety and code sharing.

### `/infra/` - Infrastructure

Azure infrastructure definitions using Bicep templates for deployment:

- **`main.bicep`**: Primary Azure resource definitions
- **`sluice.bicep`**: Sluice AI gateway infrastructure

### `/middleware.ts` - JWT Auth Middleware

Root-level Next.js middleware for JWT-based authentication, protecting routes that require authorization.

### Root Agent Configuration Files

- **`CLAUDE.md`**: Primary Claude Code agent entry point with project context and critical rules
- **`AGENTS.md`**: Cross-agent discovery file for multi-agent coordination
- **`AGENT_TEAMS.md`**: Team ownership documentation mapping teams to code areas
- **`QUALITY_GATES.md`**: Quality gate definitions for CI/CD and code review

### `/docs/` - Documentation

Project documentation organized by type:

- **`ARCHITECTURE.md`**: Comprehensive technical architecture guide
- **`api/`**: API-specific documentation and migration guides
- **`guides/`**: Developer guides and best practices
- **`launch/`**: Launch content assets (blog posts, announcements, etc.)
- **`archived/`**: Historical documentation from previous analysis phases

## File Naming Conventions

- **Components**: PascalCase (e.g., `UserProfile.tsx`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Styles**: kebab-case with `.module.css` (e.g., `user-profile.module.css`)
- **Types**: PascalCase for interfaces/types (e.g., `type UserData = ...`)
- **API Routes**: lowercase with hyphens (e.g., `feature-flags/`)

## Recent Improvements

### Directory Structure Consolidation

- ✅ Merged `utils/` into `lib/` - feature flags now in `lib/featureFlags.ts`
- ✅ Merged `config/` into `lib/config/` - platform configs now in `lib/config/platforms.ts`
- ✅ Merged `content/` into `data/` - all static content and data in one place
- ✅ Removed `middleware/` folder - only root `middleware.ts` needed by Next.js
- ✅ Moved `COMPREHENSIVE_ANALYSIS.md` to `docs/archived/`

### Component Organization

- ✅ Consolidated `components/common/` and `components/shared/` into `components/ui/` for better organization
- ✅ All imports updated to use the new `components/ui/` path

### Configuration Enhancements

- ✅ Added `.editorconfig` for consistent coding style
- ✅ Added `.nvmrc` to specify Node.js version
- ✅ Updated ESLint configuration for compatibility
- ✅ Added Prettier configuration for code formatting
- ✅ Enhanced TypeScript path aliases for cleaner imports
- ✅ Added `check-all` script to run all quality checks

### Documentation Consolidation

- ✅ Reorganized documentation into logical structure
- ✅ Created `/docs/api/` for API-specific documentation
- ✅ Created `/docs/guides/` for developer guides and best practices
- ✅ Created `/docs/archived/` for historical analysis documentation
- ✅ Added comprehensive `ARCHITECTURE.md` technical guide
- ✅ Moved implementation/analysis docs to archived folder
- ✅ Kept only user-facing docs in root (README, CONTRIBUTING, SECURITY, etc.)

## Migration Status

The project is currently migrating from Pages Router API routes to App Router Route Handlers:

- ✅ New endpoints are being added in `/app/api/`
- 🔄 Legacy endpoints in `/pages/api/` are being deprecated
- 📝 See `docs/api-migration-todo.md` for detailed migration status

## Development Workflow

1. **API Development**: Use `/app/api/` for new endpoints
2. **Component Development**: Place in appropriate feature folder under `/components/`
3. **Business Logic**: Add to `/lib/` directory
4. **Types**: Define in `/types/` directory
5. **Tests**: Mirror the source structure in `/__tests__/`

## Notes

- The project uses Next.js with both Pages and App Router patterns during migration
- CSS Modules are used for component styling
- TypeScript is used throughout the project
- Azure is the deployment target (see `/infra/` directory)
