<div align="center">

# 🚀 OmniPost

### Publish everywhere, manage anywhere

**AI-powered multi-platform content publishing made simple**

[![Alpha](https://img.shields.io/badge/status-alpha-orange)](./docs/ALPHA_LAUNCH_PLAN.md)
[![CI](https://github.com/phoenixvc/omnipost/actions/workflows/ci.yml/badge.svg)](https://github.com/phoenixvc/omnipost/actions/workflows/ci.yml)
[![Azure Web App](https://github.com/phoenixvc/omnipost/actions/workflows/azure-webapps-node.yml/badge.svg)](https://github.com/phoenixvc/omnipost/actions/workflows/azure-webapps-node.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-18.20.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.0.0-orange)](https://pnpm.io/)

[🌐 Live Demo](https://nl-dev-omnipost-app-euw.azurewebsites.net) · [📖 Documentation](./docs/README.md) · [🐛 Report Bug](https://github.com/phoenixvc/omnipost/issues) · [✨ Request Feature](https://github.com/phoenixvc/omnipost/issues)

</div>

> **Alpha Release** -- OmniPost is in active alpha. Core publishing workflows are functional and ready for early adopters. See the [Alpha Launch Plan](./docs/ALPHA_LAUNCH_PLAN.md) for current status and the [Getting Started Guide](./docs/GETTING_STARTED.md) for setup instructions.

---

## 📖 Table of Contents

- [Why OmniPost?](#-why-omnipost)
- [Features](#-features)
- [Quick Start](#-quick-start)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Available Scripts](#-available-scripts)
- [Configuration](#-configuration)
- [Deployment](#-deployment)
- [API Documentation](#-api-documentation)
- [Testing](#-testing)
- [Documentation](#-documentation)
- [Architecture](#-architecture)
- [Contributing](#-contributing)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

---

## 📘 Getting Started

New to OmniPost? The **[Getting Started Guide](./docs/GETTING_STARTED.md)** covers everything you need:

- Prerequisites and installation (5 steps)
- Platform API key setup (Facebook, Instagram, LinkedIn, Twitter)
- AI service configuration (OpenAI, Hugging Face)
- Common issues and troubleshooting
- Developer workflow and quality checks

---

## 🎯 Why OmniPost?

**The Problem:** Content creators and marketing teams waste hours manually posting the same content across multiple platforms, dealing with different formatting requirements, character limits, and APIs for each social network.

**The Solution:** OmniPost is an AI-powered multi-platform content publishing platform built with Next.js 16 (App Router), React 19, and TypeScript. It streamlines content workflows from creation to publication across all major platforms with intelligent content adaptation, AI-powered text processing, and automated image generation.

### 🌟 What Makes OmniPost Different?

- **One Click, All Platforms**: Publish to Facebook, Instagram, LinkedIn, Twitter, and custom platforms simultaneously
- **AI-Powered Intelligence**: Automatic content summarization, text parsing, and image generation
- **Smart Content Adaptation**: Automatically adjusts content for platform-specific requirements
- **Human-in-the-Loop**: Built-in review workflow ensures quality control before publishing
- **Enterprise-Ready**: JWT authentication, audit trails, rate limiting, and comprehensive security

## 🚀 Quick Start

Get OmniPost running on your machine in less than 5 minutes!

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: v18.20.0 or higher ([Download](https://nodejs.org/))
- **pnpm**: v9.0.0 or higher ([Install pnpm](https://pnpm.io/installation))
- **Git**: Latest version ([Download](https://git-scm.com/))

> 💡 **Tip**: Use [nvm](https://github.com/nvm-sh/nvm) to manage Node.js versions. This project includes a `.nvmrc` file for easy version switching.

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/phoenixvc/omnipost.git
cd omnipost

# 2. Install the correct Node.js version (if using nvm)
nvm use

# 3. Install dependencies using pnpm
pnpm install

# 4. Set up environment variables
cp .env.example .env.local

# 5. Configure your JWT secret (required)
# Edit .env.local and set JWT_SECRET=your-secure-random-string

# 6. Start the development server
pnpm dev
```

🎉 **Success!** Open [http://localhost:3000](http://localhost:3000) in your browser.

### First Steps

1. **Configure authentication**: Set a secure `JWT_SECRET` in your `.env.local` file
2. **Optional integrations**: Add API keys for Airtable, Hugging Face, or notification services
3. **Explore the platform**: Visit the live demo at [https://nl-dev-omnipost-app-euw.azurewebsites.net](https://nl-dev-omnipost-app-euw.azurewebsites.net)
4. **Read the docs**: Check out the [Documentation Hub](./docs/README.md) for detailed guides

## 📋 Available Scripts

> 💡 **Tip**: This project uses **pnpm** as the package manager. All commands should be run with `pnpm` instead of `npm`.

### Development Commands

| Command           | Description                                          |
| ----------------- | ---------------------------------------------------- |
| `pnpm dev`        | 🚀 Start development server at http://localhost:3000 |
| `pnpm build`      | 🏗️ Build the application for production              |
| `pnpm start`      | ▶️ Start the production server                       |
| `pnpm type-check` | 🔍 Run TypeScript type checking                      |

### Testing Commands

| Command              | Description                      |
| -------------------- | -------------------------------- |
| `pnpm test`          | 🧪 Run all tests                 |
| `pnpm test:watch`    | 👀 Run tests in watch mode       |
| `pnpm test:coverage` | 📊 Generate test coverage report |

### Code Quality Commands

| Command             | Description                                                   |
| ------------------- | ------------------------------------------------------------- |
| `pnpm lint`         | 🔎 Run ESLint to check code quality                           |
| `pnpm lint:fix`     | 🔧 Fix ESLint issues automatically                            |
| `pnpm format`       | ✨ Format code with Prettier                                  |
| `pnpm format:check` | 📝 Check code formatting                                      |
| `pnpm check-all`    | ✅ Run all quality checks (type-check + lint + format + test) |

### Recommended Workflow

```bash
# Before committing changes, run:
pnpm check-all

# For active development:
pnpm dev          # In one terminal
pnpm test:watch   # In another terminal
```

## ✨ Features

### 🎨 Content Management

- **Multi-Platform Publishing**: Seamlessly publish to Facebook, Instagram, LinkedIn, Twitter, and custom platforms
- **Intelligent Content Adaptation**: Automatically adjust content for different platforms and audiences
- **Series Management**: Organize and manage related content series efficiently
- **Content Queue System**: Review and approve content before publishing with human-in-the-loop workflow
- **Comprehensive Tracking**: Monitor content performance across all platforms

### 🤖 AI-Powered Tools

- **Text Summarization**: Generate intelligent summaries of raw text using state-of-the-art AI
- **Smart Text Parsing**: Parse and analyze text with support for multiple AI providers:
  - DeepSeek
  - OpenAI
  - Azure OpenAI
- **Image Generation**: Create stunning images using Hugging Face API integration
- **Content Optimization**: AI-powered suggestions for improved engagement

### 🔧 Platform Capabilities

- **Airtable Integration**: Persistent storage and tracking of published content
- **JWT Authentication**: Secure, industry-standard authentication and authorization
- **Comprehensive Audit Trail**: Track all system actions for compliance and debugging
- **Dynamic Feature Flags**: Control feature availability without redeployment
- **Multi-Channel Notifications**:
  - 📧 Email (via Nodemailer)
  - 💬 Slack integration
  - 📱 SMS (via Twilio)
- **User Feedback System**: Built-in mechanism for collecting and managing user feedback
- **Performance Dashboard**: Real-time engagement metrics and analytics
- **Rate Limiting**: Protect your API from abuse with intelligent rate limiting
- **Input Sanitization**: Enterprise-grade security with DOMPurify and Zod validation

## 📁 Project Structure

```
omnipost/
├── 📂 app/                    # Next.js App Router
│   ├── api/                  # New API route handlers (App Router)
│   └── ...                   # App Router pages and layouts
├── 📂 pages/                  # Next.js Pages Router (legacy)
│   ├── api/                  # Legacy API routes (being migrated)
│   └── ...                   # Page components
├── 📂 components/             # React components
│   ├── ui/                   # Reusable UI components
│   ├── features/             # Feature-specific components
│   ├── layouts/              # Layout components
│   └── forms/                # Form components
├── 📂 lib/                    # Core business logic
│   ├── utils/                # Utility functions
│   ├── services/             # External service integrations
│   └── ...                   # Core libraries
├── 📂 hooks/                  # Custom React hooks
├── 📂 types/                  # TypeScript type definitions
├── 📂 styles/                 # Global styles and CSS modules
├── 📂 __tests__/              # Test files (mirrors source structure)
├── 📂 infra/                  # Azure Bicep infrastructure templates
├── 📂 docs/                   # Project documentation
│   ├── api/                  # API documentation
│   ├── guides/               # Developer guides
│   └── ...                   # Additional docs
├── 📂 scripts/                # Build and deployment scripts
├── 📄 .github/                # GitHub workflows and configurations
│   ├── workflows/            # CI/CD pipelines
│   └── copilot-instructions.md
└── 📄 Configuration files     # TypeScript, ESLint, Jest, etc.
```

> 📝 **Note**: The project is currently migrating from Pages Router to App Router. New features should use the App Router (`app/api/`). See [API Migration Guide](./docs/api/api-migration-todo.md) for details.

For a detailed breakdown, see [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md).

## 🔧 Configuration

### Environment Variables

OmniPost uses environment variables for configuration. Create a `.env.local` file in the root directory:

```bash
cp .env.example .env.local
```

#### ⚠️ Required Configuration

```bash
# Authentication - REQUIRED for the application to run
JWT_SECRET=your-secure-jwt-secret-key-minimum-32-characters
```

> 🔐 **Security Tip**: Generate a secure JWT secret using:
>
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

#### 🔌 Optional Integrations

<details>
<summary><b>Airtable Integration</b> - Content storage and tracking</summary>

```bash
AIRTABLE_API_KEY=your-airtable-api-key
AIRTABLE_BASE_ID=your-airtable-base-id
AIRTABLE_TABLE_NAME=your-airtable-table-name
```

Get your Airtable API key from [Airtable Account](https://airtable.com/account).

</details>

<details>
<summary><b>Hugging Face</b> - AI image generation</summary>

```bash
HUGGING_FACE_API_KEY=your-hugging-face-api-key
```

Create an API key at [Hugging Face](https://huggingface.co/settings/tokens).

</details>

<details>
<summary><b>Email Notifications</b> - Gmail integration</summary>

```bash
EMAIL_USER=your-email@gmail.com
GMAIL_CLIENT_ID=your-gmail-client-id
GMAIL_CLIENT_SECRET=your-gmail-client-secret
GMAIL_REFRESH_TOKEN=your-gmail-refresh-token
```

Follow [Gmail API setup guide](https://developers.google.com/gmail/api/quickstart/nodejs) for credentials.

</details>

<details>
<summary><b>Slack Notifications</b> - Team notifications</summary>

```bash
SLACK_TOKEN=xoxb-your-slack-bot-token
```

Create a Slack app and bot at [Slack API](https://api.slack.com/apps).

</details>

<details>
<summary><b>Twilio SMS</b> - SMS notifications</summary>

```bash
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890
```

Get credentials from [Twilio Console](https://www.twilio.com/console).

</details>

<details>
<summary><b>Social Platform APIs</b> - Direct publishing integrations</summary>

```bash
# Facebook
FACEBOOK_API_URL=https://graph.facebook.com
FACEBOOK_API_KEY=your-facebook-api-key

# Instagram
INSTAGRAM_API_URL=https://graph.instagram.com
INSTAGRAM_API_KEY=your-instagram-api-key

# TikTok
TIKTOK_API_URL=https://open.tiktokapis.com/v2/post/publish/video/init/
TIKTOK_API_KEY=your-tiktok-api-key
TIKTOK_PRIVACY_LEVEL=SELF_ONLY

# LinkedIn
LINKEDIN_API_URL=https://api.linkedin.com
LINKEDIN_API_KEY=your-linkedin-api-key

# Twitter/X
TWITTER_API_URL=https://api.twitter.com
TWITTER_API_KEY=your-twitter-api-key
```

</details>

See [.env.example](./.env.example) for the complete configuration template.

## 🚀 Deployment

### Azure Deployment

OmniPost is optimized for Azure Web Apps with **Next.js standalone output mode** for production deployments.

#### ✨ Deployment Features

- ✅ **90% smaller deployments** (~86MB vs ~800MB)
- ✅ **Faster cold starts** with run-from-package mode
- ✅ **Automated quality gates** (type-check, lint, tests)
- ✅ **Health check verification** post-deployment
- ✅ **Application Insights monitoring** with automated alerts
- ✅ **Build caching** for faster subsequent deployments

#### 🎯 Quick Deploy

**Automatic Deployment:**

- Push to `main` branch → Automatically deploys to **dev** environment
- **Manual deployment:** GitHub Actions → Run workflow → Select environment (dev/test/prod)

**Deployment Time:** 10-15 minutes total

- Build Phase: 5-7 minutes
- Infrastructure Phase: 2-3 minutes
- Deploy Phase: 3-5 minutes

#### 📋 Prerequisites

1. **Azure subscription** with appropriate permissions
2. **Azure CLI** installed (for manual deployment)
3. **GitHub repository secrets** configured:
   - `AZURE_CREDENTIALS` - Service principal for Azure deployment
   - `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`
   - See [docs/AZURE_SECRETS.md](docs/AZURE_SECRETS.md) for detailed configuration

#### ⚙️ Configuration

**GitHub Actions Configuration** (`.github/workflows/azure-webapps-node.yml`):

```yaml
env:
  NODE_VERSION: '18.20.0' # Must match .nvmrc
  ORG_CODE: 'nl' # Organization code
  PROJECT_NAME: 'omnipost'
  REGION_CODE: 'euw' # Region: euw, eus, etc.
  LOCATION: 'westeurope' # Azure region
```

**Infrastructure Configuration** (`infra/parameters.json`):

```json
{
  "org": { "value": "nl" },
  "env": { "value": "dev" },
  "project": { "value": "omnipost" },
  "region": { "value": "euw" },
  "sku": { "value": "B1" },
  "enableMonitoring": { "value": true },
  "enableDeploymentSlot": { "value": false }
}
```

#### 🖥️ Local Infrastructure Deployment (PowerShell)

```powershell
# Basic deployment (dev environment)
./scripts/deploy-infrastructure.ps1

# Preview changes without deploying (what-if mode)
./scripts/deploy-infrastructure.ps1 -Preview

# Deploy to production
./scripts/deploy-infrastructure.ps1 -Environment prod -Location eastus -LocationCode eus

# Deploy with specific SKU
./scripts/deploy-infrastructure.ps1 -Environment test -Sku S1

# Skip login if already authenticated
./scripts/deploy-infrastructure.ps1 -SkipLogin
```

The script will:

1. Authenticate with Azure (via `az login`)
2. Create the resource group if it doesn't exist
3. Deploy the Bicep template with the specified configuration
4. Display deployment outputs (Web App name and URL)

#### 📖 Deployment Pipeline

1. **Build Phase** (~5-7 min)
   - Install dependencies with pnpm
   - Run TypeScript type-check
   - Run ESLint for code quality
   - Build Next.js standalone output
   - Run test suite
   - Create optimized deployment package (~86MB)

2. **Infrastructure Phase** (~2-3 min)
   - Create/update Azure resources via Bicep IaC
   - Configure App Service settings
   - Set up Application Insights monitoring (if enabled)
   - Configure alerts and dashboards

3. **Deploy Phase** (~3-5 min)
   - Upload package to Azure Storage
   - Deploy to App Service
   - Start application
   - Verify health endpoint with retries
   - Warm-up requests

For detailed deployment instructions, see:

- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Deployment Runbook](./docs/DEPLOYMENT_RUNBOOK.md)
- [Workflow file](./.github/workflows/azure-webapps-node.yml)

## 🔌 API Documentation

OmniPost provides a comprehensive REST API for content management and publishing.

### 🔐 Authentication

| Endpoint    | Method | Description                        |
| ----------- | ------ | ---------------------------------- |
| `/api/auth` | POST   | User login and token generation    |
| `/api/auth` | GET    | Get current authenticated user     |
| `/api/auth` | DELETE | User logout and token invalidation |

### 📝 Content Management

| Endpoint             | Method | Description                     |
| -------------------- | ------ | ------------------------------- |
| `/api/content`       | POST   | Store content in Airtable       |
| `/api/content`       | GET    | Retrieve and track content      |
| `/api/queue/approve` | POST   | Approve content in review queue |

### 🤖 AI Services

| Endpoint         | Method | Description                         |
| ---------------- | ------ | ----------------------------------- |
| `/api/parse`     | POST   | Parse and analyze text with AI      |
| `/api/summarize` | POST   | Generate intelligent text summaries |
| `/api/images`    | POST   | Generate images using AI            |

### 📱 Platform Publishing

| Endpoint                           | Method | Description                             |
| ---------------------------------- | ------ | --------------------------------------- |
| `/api/platforms`                   | GET    | List all available publishing platforms |
| `/api/platforms/[id]/capabilities` | GET    | Get platform-specific capabilities      |

### ⚙️ Administration

| Endpoint             | Method | Description                      |
| -------------------- | ------ | -------------------------------- |
| `/api/audit`         | GET    | Retrieve system audit logs       |
| `/api/feature-flags` | GET    | Get and manage feature flags     |
| `/api/feedback`      | POST   | Submit user feedback             |
| `/api/notifications` | POST   | Send multi-channel notifications |

### 📖 API Documentation

For detailed API documentation, including request/response schemas, authentication requirements, and examples:

- **Route Files**: Inline documentation in `/app/api/` directory
- **API Reference**: [docs/API_REFERENCE.md](./docs/API_REFERENCE.md)
- **Best Practices**: [docs/api/next-api-best-practices.md](./docs/api/next-api-best-practices.md)
- **Migration Status**: [docs/api/api-migration-todo.md](./docs/api/api-migration-todo.md)

### 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Protect against API abuse
- **Input Sanitization**: DOMPurify + Zod validation
- **CORS Configuration**: Secure cross-origin requests
- **Security Headers**: Industry-standard security headers

## 🧪 Testing

OmniPost uses **Jest** and **React Testing Library** for comprehensive testing.

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode (for active development)
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

### Test Structure

Tests are organized to mirror the source code structure in the `__tests__/` directory:

```
__tests__/
├── api/                  # API route tests
├── components/           # Component tests
├── lib/                  # Utility and service tests
└── integration/          # Integration tests
```

### Testing Guidelines

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test API routes and service interactions
- **Component Tests**: Test React components with React Testing Library
- **Coverage Target**: Aim for >80% code coverage for critical paths

### Test Status

Current test status and known issues: [docs/TEST_STATUS.md](./docs/TEST_STATUS.md)

### Writing Tests

```typescript
// Example component test
import { render, screen } from '@testing-library/react';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

For more testing guidelines, see [CONTRIBUTING.md](./CONTRIBUTING.md#testing).

## 🏗️ Technology Stack

<div align="center">

| Category            | Technologies                                                |
| ------------------- | ----------------------------------------------------------- |
| **Frontend**        | React 19, Next.js 16 (App Router), TypeScript 5.3           |
| **Styling**         | CSS Modules, Global CSS                                     |
| **ORM / Database**  | Prisma 7, PostgreSQL                                        |
| **API**             | Next.js Route Handlers, RESTful API design                  |
| **Authentication**  | JWT tokens, async middleware                                |
| **Validation**      | Zod 3 schemas, DOMPurify sanitization                       |
| **Testing**         | Jest 29, React Testing Library, jest-axe                    |
| **Deployment**      | Azure Web Apps, Bicep IaC                                   |
| **CI/CD**           | GitHub Actions                                              |
| **AI Services**     | Hugging Face (image generation), OpenAI, DeepSeek, Azure AI |
| **Integrations**    | Slack, Twilio, Nodemailer                                   |
| **Package Manager** | pnpm 9                                                      |

</div>

### Architecture Highlights

- **App Router First**: All new development uses the Next.js App Router (`app/api/`)
- **Security-First**: Rate limiting, input sanitization, RBAC, audit logging, OWASP Top 10 compliance
- **Type Safety**: Full TypeScript strict mode with no `any` types
- **Modern Stack**: React 19, Next.js 16, Prisma 7, Zod 3
- **Scalable Infrastructure**: Azure-native deployment with Bicep IaC templates

## 🏛️ Architecture

OmniPost follows a layered architecture built on the Next.js App Router:

```
Frontend (React 19, CSS Modules)
    |
Next.js App Router (API Routes, Middleware, SSR)
    |
Business Logic (Auth, Validation, Feature Flags)
    |
Data Layer (Prisma 7 + PostgreSQL)
    |
External Services (OpenAI, Hugging Face, Slack, Twilio)
```

Key architectural decisions:

- **Prisma 7 with PostgreSQL** for structured data persistence and type-safe queries
- **JWT-based authentication** with async `isAuthenticated()` checks in every protected route
- **Zod schemas** for runtime input validation on all API endpoints
- **DOMPurify** for HTML sanitization to prevent XSS
- **Rate limiting** on all public-facing endpoints via `withRateLimit` wrapper
- **Feature flags** for controlling functionality without redeployment

For the full architecture documentation, see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).

## 📚 Documentation

### 📖 Core Documentation

| Document                                     | Description                                    |
| -------------------------------------------- | ---------------------------------------------- |
| [Documentation Hub](./docs/README.md)        | Complete documentation index and overview      |
| [Architecture Guide](./docs/ARCHITECTURE.md) | Technical architecture and design decisions    |
| [Project Structure](./PROJECT_STRUCTURE.md)  | Detailed directory organization                |
| [Contributing Guidelines](./CONTRIBUTING.md) | How to contribute to the project               |
| [Security Policy](./SECURITY.md)             | Security practices and vulnerability reporting |

### 🛠️ Developer Guides

| Document                                                         | Description                          |
| ---------------------------------------------------------------- | ------------------------------------ |
| [GitHub Copilot Instructions](./.github/copilot-instructions.md) | AI coding assistant guidelines       |
| [API Best Practices](./docs/api/next-api-best-practices.md)      | API development standards            |
| [API Migration Guide](./docs/api/api-migration-todo.md)          | Pages to App Router migration status |
| [Next.js Best Practices](./docs/guides/next-best-practices/)     | Framework-specific patterns          |

### 📋 Additional Resources

| Document                                       | Description                           |
| ---------------------------------------------- | ------------------------------------- |
| [Code of Conduct](./CODE_OF_CONDUCT.md)        | Community guidelines and expectations |
| [Changelog](./CHANGELOG.md)                    | Version history and release notes     |
| [License](./LICENSE)                           | MIT License details                   |
| [Environment Variables](./.env.example)        | Configuration template and examples   |
| [Deployment Guide](./docs/DEPLOYMENT.md)       | Detailed deployment instructions      |
| [Azure Secrets Setup](./docs/AZURE_SECRETS.md) | Azure configuration guide             |

### 🎯 Quick Links for Common Tasks

- **Setting up development environment**: [Quick Start](#-quick-start)
- **Understanding the codebase**: [Project Structure](#-project-structure)
- **Adding a new feature**: [Contributing Guidelines](./CONTRIBUTING.md)
- **Deploying to production**: [Deployment](#-deployment)
- **Reporting a security issue**: [Security Policy](./SECURITY.md)
- **API development**: [API Best Practices](./docs/api/next-api-best-practices.md)

## 🔍 Troubleshooting

### Common Issues and Solutions

<details>
<summary><b>❌ Missing environment variables</b></summary>

**Error**: Application fails to start or returns 500 errors

**Solution**:

```bash
# Ensure .env.local exists
cp .env.example .env.local

# Set required JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy the output to JWT_SECRET in .env.local
```

Verify `JWT_SECRET` is configured in `.env.local`

</details>

<details>
<summary><b>🔐 Authentication errors</b></summary>

**Error**: "Unauthorized" or "Invalid token" errors

**Solutions**:

- Verify `JWT_SECRET` matches between client and server
- Check if token has expired (tokens have limited lifetime)
- Clear browser cookies and local storage
- Restart the development server

</details>

<details>
<summary><b>🗄️ Airtable connection issues</b></summary>

**Error**: Cannot connect to Airtable or save content

**Solutions**:

- Verify `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`, and `AIRTABLE_TABLE_NAME` are correct
- Check Airtable API permissions for your API key
- Ensure Airtable base is shared with the API key owner
- Test API key at [Airtable API](https://airtable.com/api)

</details>

<details>
<summary><b>🏗️ Build errors</b></summary>

**Error**: Build fails with TypeScript or dependency errors

**Solutions**:

```bash
# Clear all caches and rebuild
rm -rf node_modules .next pnpm-lock.yaml
pnpm install
pnpm build

# If TypeScript errors persist
pnpm type-check
```

</details>

<details>
<summary><b>🧪 Test failures</b></summary>

**Error**: Tests fail during `pnpm test`

**Solutions**:

```bash
# Clear Jest cache
pnpm test --clearCache

# Reinstall dependencies
rm -rf node_modules
pnpm install

# Run tests with verbose output
pnpm test --verbose
```

Check [docs/TEST_STATUS.md](./docs/TEST_STATUS.md) for known test issues.

</details>

<details>
<summary><b>🔌 Port already in use</b></summary>

**Error**: "Port 3000 is already in use"

**Solutions**:

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
PORT=3001 pnpm dev
```

</details>

<details>
<summary><b>📦 Package manager issues</b></summary>

**Error**: "Command not found: pnpm" or version conflicts

**Solutions**:

```bash
# Install pnpm globally
npm install -g pnpm@9.0.0

# Or use npx
npx pnpm install

# Use correct Node.js version
nvm use  # Reads from .nvmrc
```

</details>

<details>
<summary><b>☁️ Azure deployment failures</b></summary>

**Error**: "Cannot find module 'styled-jsx/package.json'" or container startup failures

**Solutions**:

This has been fixed in the repository. Ensure you have the latest code:

```bash
# Pull latest changes
git pull origin main

# Verify pnpm-workspace.yaml contains Azure-compatible pnpm settings
cat pnpm-workspace.yaml
# Should contain: nodeLinker: hoisted

# Rebuild and redeploy
pnpm install
pnpm build
```

**What was the issue?**

- pnpm's default isolated module structure wasn't compatible with Azure
- The `.npmrc` file now configures hoisted node_modules for Azure compatibility
- See [AZURE_DEPLOYMENT_FIX.md](./AZURE_DEPLOYMENT_FIX.md) for detailed explanation

**Manual Azure fix (if needed):**

```bash
# Set startup command via Azure CLI
az webapp config set --name <app-name> \
  --resource-group <resource-group> \
  --startup-file "node server.js"

# Restart the app
az webapp restart --name <app-name> \
  --resource-group <resource-group>
```

For more details, see:

- [Azure Deployment Fix Documentation](./AZURE_DEPLOYMENT_FIX.md)
- [pnpm Configuration Guide](./docs/PNPM_CONFIGURATION.md)

</details>

### 🆘 Still Having Issues?

If you're still experiencing problems:

1. **Check existing issues**: [GitHub Issues](https://github.com/phoenixvc/omnipost/issues)
2. **Review documentation**: [Documentation Hub](./docs/README.md)
3. **Create a new issue**: Provide detailed error messages and steps to reproduce
4. **Check logs**: Look at browser console and terminal output for error details

### 📞 Getting Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/phoenixvc/omnipost/issues)
- **Discussions**: [Ask questions and share ideas](https://github.com/phoenixvc/omnipost/discussions)
- **Documentation**: [Browse the docs](./docs/README.md)

## 🤝 Contributing

We welcome contributions from the community! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

### 🚀 Quick Contribution Guide

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
   - Follow the [coding standards](./CONTRIBUTING.md#coding-standards)
   - Write tests for new features
   - Update documentation as needed
4. **Run quality checks**
   ```bash
   pnpm check-all  # Runs type-check, lint, format check, and tests
   ```
5. **Commit your changes**
   ```bash
   git commit -m 'feat: add amazing feature'
   ```
   Use [conventional commits](https://www.conventionalcommits.org/) format
6. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### 📝 Contribution Guidelines

For detailed contribution guidelines, please read [CONTRIBUTING.md](./CONTRIBUTING.md).

**Key points:**

- Follow TypeScript strict mode and coding standards
- Write tests for all new features
- Ensure all quality checks pass before submitting PR
- Use meaningful commit messages
- Update documentation for significant changes
- Be respectful and follow our [Code of Conduct](./CODE_OF_CONDUCT.md)

### 🐛 Reporting Issues

Found a bug or have a feature request?

- **Bug Reports**: [Create an issue](https://github.com/phoenixvc/omnipost/issues/new) with detailed reproduction steps
- **Feature Requests**: [Create an issue](https://github.com/phoenixvc/omnipost/issues/new) describing the feature and use case
- **Security Issues**: See our [Security Policy](./SECURITY.md) for responsible disclosure

### 💬 Getting Help

- **Documentation**: Check the [docs folder](./docs/) for guides
- **Issues**: Search [existing issues](https://github.com/phoenixvc/omnipost/issues) for similar questions
- **Discussions**: Start a [GitHub Discussion](https://github.com/phoenixvc/omnipost/discussions) for general questions

### 🌟 Ways to Contribute

- 🐛 Fix bugs and issues
- ✨ Add new features
- 📝 Improve documentation
- 🧪 Write tests
- 🎨 Enhance UI/UX
- 🔍 Review pull requests
- 💡 Share ideas and feedback

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### What this means:

- ✅ Commercial use allowed
- ✅ Modification allowed
- ✅ Distribution allowed
- ✅ Private use allowed
- ⚠️ License and copyright notice required
- ❌ Liability and warranty not provided

---

## 👥 Authors & Acknowledgments

### Author

**JustAGhosT** - _Creator and Lead Developer_

- GitHub: [@JustAGhosT](https://github.com/JustAGhosT)
- Repository: [content_creation](https://github.com/phoenixvc/omnipost)

### Acknowledgments

Special thanks to:

- **Next.js Team** - For the excellent React framework
- **Vercel** - For Next.js and deployment inspiration
- **Hugging Face** - For AI capabilities and models
- **Airtable** - For flexible data storage solutions
- **Azure** - For enterprise cloud hosting
- **Open Source Community** - For amazing tools and libraries
- **All Contributors** - For improvements, bug fixes, and feedback

### Built With

This project builds upon these amazing open-source technologies:

- [React](https://react.dev/) - UI library
- [Next.js](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Jest](https://jestjs.io/) - Testing framework
- [Azure](https://azure.microsoft.com/) - Cloud platform

---

## 🌟 Project Status & Roadmap

### Current Status

- 🟠 **Alpha Release**: Core workflows functional, ready for early adopters
- ✅ **Deployed**: Running on Azure Web Apps
- ✅ **CI/CD Pipeline**: Automated testing and deployment via GitHub Actions
- ✅ **Auth & Security**: JWT middleware, rate limiting, input sanitization all operational
- ⚠️ **Test Coverage**: Actively improving toward 80%+ target

### Roadmap

The canonical campaign capability sequence, evidence gates, and platform
expansion criteria are documented in the
[Marketing and Campaign Operating-System Roadmap](./docs/roadmaps/MARKETING_CAMPAIGN_OPERATING_SYSTEM.md).
The executable delivery sequence for the first campaign is in the
[X-First Campaign Delivery Plan](./docs/plans/X_FIRST_CAMPAIGN_DELIVERY_PLAN.md).

<details>
<summary><b>🔮 Planned Features</b></summary>

- [ ] Additional AI provider integrations (Claude, Gemini)
- [ ] Enhanced analytics and reporting dashboard
- [ ] Bulk content scheduling and management
- [ ] Content templates and reusable snippets
- [ ] Advanced image editing capabilities
- [ ] Multi-user collaboration features
- [ ] Custom platform integrations via plugins
- [ ] Mobile app (iOS/Android)

</details>

<details>
<summary><b>🔧 Technical Improvements</b></summary>

- [ ] Complete Pages Router to App Router migration
- [ ] Increase test coverage to 90%+
- [ ] Redis integration for distributed rate limiting
- [ ] WCAG 2.1 AA compliance
- [ ] Performance optimization (Core Web Vitals)
- [ ] Design system formalization
- [ ] Production monitoring setup (Sentry/DataDog)

</details>

See [CHANGELOG.md](./CHANGELOG.md) for version history and [GitHub Projects](https://github.com/phoenixvc/omnipost/projects) for current progress.

---

## 🔗 Links & Resources

### Project Links

- **🌐 Live Demo**: [https://nl-dev-omnipost-app-euw.azurewebsites.net](https://nl-dev-omnipost-app-euw.azurewebsites.net)
- **📦 Repository**: [github.com/phoenixvc/omnipost](https://github.com/phoenixvc/omnipost)
- **🐛 Issues**: [GitHub Issues](https://github.com/phoenixvc/omnipost/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/phoenixvc/omnipost/discussions)
- **📖 Documentation**: [Documentation Hub](./docs/README.md)

### Community

- **💡 Feature Requests**: [Request a Feature](https://github.com/phoenixvc/omnipost/issues/new?template=feature_request.md)
- **🐛 Bug Reports**: [Report a Bug](https://github.com/phoenixvc/omnipost/issues/new?template=bug_report.md)
- **🔒 Security**: [Security Policy](./SECURITY.md)
- **🤝 Contributing**: [Contributing Guidelines](./CONTRIBUTING.md)

---

<div align="center">

**⭐ If you find OmniPost useful, please consider giving it a star on GitHub! ⭐**

Made with ❤️ by [JustAGhosT](https://github.com/JustAGhosT)

[⬆ Back to Top](#-omnipost)

</div>
