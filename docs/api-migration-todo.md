# API Migration Todo List

## Overview

This document outlines the tasks required to migrate the existing API structure from the Pages Router (`pages/api`) to the App Router Route Handlers (`app/api`) following Next.js best practices.

## Current API Structure Analysis

The current application uses the Pages Router API structure with:
- API implementation files in `pages/api/` directory
- Utility and helper modules in `api/` directory
- Authentication via HOC middleware (`withAuth` and `withAdminAuth`)

## Migration Tasks

### 1. Setup App Directory Structure

- [ ] Create `app/api` directory if it doesn't exist
- [ ] Set up appropriate folder structure based on API domains/features

### 2. Migrate Existing API Endpoints

#### Platform-related APIs

- [ ] Create `app/api/platforms/route.ts` to replace `pages/api/platforms/index.ts`
  - [ ] Implement GET handler to return platforms list
  - [ ] Update authentication mechanism

- [ ] Create `app/api/platforms/[id]/capabilities/route.ts` to replace `pages/api/platforms/[id]/capabilities.ts`
  - [ ] Implement GET handler with dynamic route parameter
  - [ ] Update authentication mechanism

- [ ] Create `app/api/queue/approve/route.ts` to replace `pages/api/approve-queue.ts`
  - [ ] Implement POST handler for queue approval
  - [ ] Update authentication mechanism
  - [ ] Maintain feature flag checking

#### Feature Flags API

- [ ] Create `app/api/feature-flags/route.ts` to replace `pages/api/feature-flags/index.ts`
  - [ ] Implement GET handler to retrieve feature flags
  - [ ] Implement POST handler to update feature flags
  - [ ] Update admin authentication mechanism

### 3. Migrate Helper Functions from `api/` Directory

- [ ] Review and refactor the following modules:
  - [ ] `airtable-integration.ts`
  - [ ] `audit-trail.ts`
  - [ ] `authenticationHelpers.ts`
  - [ ] `data-persistence.ts`
  - [ ] `feature-flags.ts`
  - [ ] `feedback-mechanism.ts`
  - [ ] `huggingface-api-client.ts`
  - [ ] `huggingface-client.ts`
  - [ ] `image-generation.ts`
  - [ ] `input-collection.ts`
  - [ ] `mobile-responsiveness.ts`
  - [ ] `platform-connectors.ts`
  - [ ] `summarization.ts`
  - [ ] `text-parser.ts`
  - [ ] `authentication.ts`
  - [ ] `multi-platform-publishing.ts`
  - [ ] `notification-system.ts`
  - [ ] `tool-selection.ts`

- [ ] Move utility functions to appropriate locations:
  - [ ] Core business logic to `lib/` directory
  - [ ] API-specific utilities to `app/api/_utils/` directory
  - [ ] Shared types to `types/` directory

### 4. Implement Authentication Middleware

- [ ] Create middleware for authentication in `middleware.ts` at the root
- [ ] Implement route segment configuration for protected routes
- [ ] Replace HOC pattern (`withAuth`, `withAdminAuth`) with middleware

### 5. Update Type Definitions

- [ ] Migrate from `NextApiRequest`/`NextApiResponse` to standard Web API types
- [ ] Update interface definitions to match new API structure
- [ ] Ensure type safety across the API layer

### 6. Testing

- [ ] Create unit tests for new route handlers
- [ ] Implement integration tests for API endpoints
- [ ] Verify authentication and authorization work correctly

### 7. Client Updates

- [ ] Update frontend API calls to use new endpoints
- [ ] Ensure error handling is consistent
- [ ] Update any documentation referencing the API endpoints

### 8. Cleanup

- [ ] Once migration is complete and verified, remove old `pages/api` endpoints
- [ ] Remove any unused code from the `api/` directory
- [ ] Update README and documentation to reflect new API structure

## Migration Strategy

1. **Parallel Implementation**: Implement new endpoints alongside existing ones
2. **Feature by Feature**: Migrate one feature area at a time (platforms, feature flags, etc.)
3. **Testing**: Thoroughly test each endpoint before switching clients to use it
4. **Gradual Rollout**: Update clients to use new endpoints incrementally
5. **Cleanup**: Remove old endpoints once all clients have been updated

## Additional Considerations

- Consider implementing API versioning if significant changes are made
- Document any breaking changes for client consumers
- Monitor performance metrics during and after migration
- Set up proper error logging for the new API structure