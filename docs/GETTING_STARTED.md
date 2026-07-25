# Getting Started with OmniPost

This guide walks you through setting up OmniPost for local development and publishing your first content. Estimated time: 10-15 minutes.

## Prerequisites

Before you begin, ensure you have the following installed:

| Tool    | Version | Installation                                                                  |
| ------- | ------- | ----------------------------------------------------------------------------- |
| Node.js | 18+     | [nodejs.org](https://nodejs.org/) or use [nvm](https://github.com/nvm-sh/nvm) |
| pnpm    | 9+      | [pnpm.io/installation](https://pnpm.io/installation)                          |
| Git     | Latest  | [git-scm.com](https://git-scm.com/)                                           |

Verify your installations:

```bash
node --version   # Should print v18.x or higher
pnpm --version   # Should print 9.x or higher
git --version    # Any recent version
```

## Quick Start

### Step 1: Clone the repository

```bash
git clone https://github.com/phoenixvc/omnipost.git
cd omnipost
```

### Step 2: Install dependencies

```bash
pnpm install
```

### Step 3: Generate the database client and push the schema

```bash
pnpm db:generate && pnpm db:push
```

This creates the Prisma client types and initializes your local database schema.

### Step 4: Create your environment file

```bash
cp .env.example .env.local
```

Open `.env.local` and set the `JWT_SECRET` value. Generate a secure secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste it as the value for `JWT_SECRET` in `.env.local`:

```bash
JWT_SECRET=<paste-your-generated-secret-here>
```

### Step 5: Start the development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You should see the OmniPost landing page.

## First Steps After Launch

Once the application is running, walk through the core user flow:

1. **Sign up** -- Navigate to `/signup` and create your account.
2. **Connect a platform** -- The onboarding flow guides you through connecting your first social platform (Facebook, Instagram, LinkedIn, or Twitter).
3. **Create and publish a post** -- Use the content editor to write a post, adapt it for your connected platforms, and publish.
4. **View analytics** -- Head to the dashboard to see engagement metrics and performance data for your published content.

## Configuration

### Platform API Keys

To publish to social platforms, you need API credentials for each one. Add these to your `.env.local` file.

**Facebook:**

1. Create an app at [developers.facebook.com](https://developers.facebook.com/)
2. Generate a Page Access Token with `pages_manage_posts` permission
3. Set `FACEBOOK_API_KEY` in `.env.local`

**Instagram:**

1. Use the same Facebook Developer app (Instagram is managed through Meta)
2. Enable the Instagram Graph API and generate a token
3. Set `INSTAGRAM_API_KEY` in `.env.local`

**LinkedIn:**

1. Create an app at [linkedin.com/developers](https://www.linkedin.com/developers/)
2. Request the `w_member_social` permission and generate an access token
3. Set `LINKEDIN_API_KEY` in `.env.local`

**Twitter/X:**

1. Create a project and app in the [X Developer Console](https://developer.x.com/)
2. Configure OAuth 2.0 user authentication with the exact callback
   `http://localhost:3000/api/platforms/x/callback`
3. Set `X_CLIENT_ID`, optional `X_CLIENT_SECRET`, `X_OAUTH_REDIRECT_URI`, and a
   base64-encoded 32-byte `PLATFORM_TOKEN_ENCRYPTION_KEY` in `.env.local`
4. Open **Settings → Platform Connections** and authorize the X account.

OmniPost requests `tweet.read`, `tweet.write`, `users.read`, and
`offline.access` through Authorization Code with S256 PKCE. Tokens are encrypted
before persistence and are never returned to the browser. An app-only bearer
token cannot create posts. See the
[X campaign go-live runbook](runbooks/X_CAMPAIGN_GO_LIVE.md) before enabling
production publishing.

### AI Service Keys

OmniPost uses AI for text summarization, parsing, and image generation.

**OpenAI:**

1. Create an API key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Set `OPENAI_API_KEY` in `.env.local`

**Hugging Face:**

1. Create a token at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Set `HUGGING_FACE_API_KEY` in `.env.local`

### Optional: Upstash Redis for Rate Limiting

By default, rate limiting uses an in-memory store. For production or multi-instance deployments, configure Upstash Redis:

1. Create a free database at [upstash.com](https://upstash.com/)
2. Add the connection details to `.env.local`:

```bash
UPSTASH_REDIS_REST_URL=https://your-instance.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-token
```

### Optional: Sluice Gateway

For advanced API gateway features, configure the Sluice gateway by setting the relevant environment variables. See `.env.example` for the full list.

## Common Issues

### "Cannot find module"

Dependencies are missing. Run:

```bash
pnpm install
```

### "Type check fails" on a clean install

The Prisma client types need to be generated:

```bash
pnpm db:generate
```

### "Auth returns 401" on every request

Ensure `JWT_SECRET` is set in your `.env.local` file and that `middleware.ts` is not excluded from the build. Restart the dev server after changing environment variables:

```bash
# Stop the server (Ctrl+C), then:
pnpm dev
```

### "Rate limit exceeded"

If you are using the default in-memory rate limiter, limits reset automatically. Wait 15 minutes, or configure Upstash Redis for a persistent store (see the Configuration section above).

### Build errors after pulling new changes

```bash
pnpm install && pnpm db:generate
pnpm build
```

## For Developers

### Run the test suite

```bash
pnpm test
```

### Run all quality checks (type-check, lint, format, tests)

```bash
pnpm check-all
```

### Validate marketing skills

```bash
bash .agents/validate-skills.sh
```

### Auto-fix linting issues

```bash
pnpm lint:fix
```

### Project structure

See [PROJECT_STRUCTURE.md](../PROJECT_STRUCTURE.md) for a detailed breakdown of the directory layout.

### Key documentation

| Document                                               | Description                              |
| ------------------------------------------------------ | ---------------------------------------- |
| [Architecture Guide](./ARCHITECTURE.md)                | System design and technical decisions    |
| [API Best Practices](./api/next-api-best-practices.md) | Standards for API route development      |
| [Contributing Guidelines](../CONTRIBUTING.md)          | How to contribute code and documentation |
| [Deployment Guide](./DEPLOYMENT.md)                    | Azure deployment and infrastructure      |

## Next Steps

- **Explore the API**: Review the route handlers in `app/api/` to understand the backend.
- **Read the architecture docs**: [ARCHITECTURE.md](./ARCHITECTURE.md) covers the full system design.
- **Contribute**: See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on submitting changes.
- **Join the discussion**: Open an issue or start a [GitHub Discussion](https://github.com/phoenixvc/omnipost/discussions) if you have questions.

---

**Last Updated**: March 30, 2026
