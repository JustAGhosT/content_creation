# Components Directory Structure

This directory contains all React components for OmniPost, organized by feature and domain.

## Directory Structure

```
components/
├── shared/           # Reusable UI components used across features
├── adaptation/       # Content adaptation workflow components
├── automation/       # Automation tools and workflows
├── content/          # Content management and display
├── dashboard/        # Analytics and metrics dashboards
├── feedback/         # User feedback mechanisms
├── feature-flags/    # Feature flag management
├── image/            # Image generation and handling
├── layouts/          # Page layout templates
├── platform/         # Platform integration components
├── review/           # Human review workflow stages
├── series/           # Content series management
├── text/             # Text parsing and summarization
└── common/           # Common utilities and navigation
```

## Organization Principles

### 1. Feature-Based Organization

Components are grouped by domain/feature rather than by type. This makes it easier to:

- Find related components
- Understand feature boundaries
- Refactor features independently
- Onboard new developers

### 2. Shared Components

Common, reusable UI components live in `shared/`. These include:

- **AdaptationCard** - Display content adaptation examples
- **WorkflowStage** - Display workflow stages with steps
- **ErrorMessage** - Consistent error display
- **LoadingState** - Loading indicators
- **Layout/Header/Footer** - Common layout elements
- **Authentication** - Auth UI components

### 3. Barrel Exports

Each directory includes an `index.ts` file for clean imports:

```typescript
// ❌ Before
import ToolCard from '../components/automation/ToolCard';
import ToolGrid from '../components/automation/ToolGrid';

// ✅ After
import { ToolCard, ToolGrid } from '../components/automation';
```

## Usage Guidelines

### Importing Components

**From shared directory:**

```typescript
import { Header, Footer, LoadingState } from '@/components/shared';
```

**From feature directories:**

```typescript
import { SeriesCard, SeriesForm } from '@/components/series';
import { ImageGenerator } from '@/components/image';
```

### Adding New Components

1. **Determine if component is shared or feature-specific**
   - Shared: Used by 3+ features → `shared/`
   - Feature-specific: Used by 1-2 related features → feature directory

2. **Create component in appropriate directory**

   ```typescript
   // components/feature-name/ComponentName.tsx
   import React from 'react';

   interface ComponentProps {
     // props
   }

   const Component: React.FC<ComponentProps> = props => {
     // implementation
   };

   export default Component;
   ```

3. **Add to barrel export**
   ```typescript
   // components/feature-name/index.ts
   export { default as Component } from './Component';
   ```

### Component Guidelines

- **Single Responsibility**: Each component should do one thing well
- **Props Interface**: Always define TypeScript interfaces for props
- **Documentation**: Add JSDoc comments for complex components
- **Styling**: Use CSS modules or existing style files
- **Testing**: Write tests in `__tests__/` directory

## Migration Notes

This structure was created to eliminate:

- **25 root-level components** → organized into subdirectories
- **6 duplicate components** → consolidated into shared versions
- **Inconsistent imports** → standardized paths

### Breaking Changes

If you're updating from the old structure:

1. Update imports from root components to new paths
2. Use shared components instead of duplicates
3. Update any custom tooling that references old paths

## Component Inventory

### Shared (13 components)

- AdaptationCard, WorkflowStage, ErrorMessage, LoadingState
- Header, Footer, Hero, Layout
- Authentication, LoginForm, AuditTrail, NotificationSystem, MobileResponsiveness

### Feature Directories

- **adaptation** (3): AdaptationExamples, WorkflowDiagram, ContentAdaptationStyles
- **automation** (4): ToolCard, ToolGrid, ToolDetailModal, ConclusionSection
- **content** (5): ContentAdaptation, ContentHeader, ContentManager, PlatformCard, WorkflowDiagram
- **dashboard** (2): Analytics, MetricsCard
- **feedback** (2): FeedbackForm, FeedbackMechanism
- **feature-flags** (2): FeatureFlagToggle, FeatureFlagsManager
- **image** (3): ImageGeneration, ImageGenerationForm, ImageGenerator
- **layouts** (3): Layout, DashboardLayout, MainLayout
- **platform** (2): PlatformConnectors, PlatformSelector
- **review** (7): InputStage, ParsingStage, SummarizationStage, ImageGenerationStage, LoadingOverlay, ProgressBar, SuccessMessage
- **series** (3): SeriesCard, SeriesForm, EmptyState
- **text** (3): TextParser, TextSummarizer, SummarizationAPI
- **common** (1): NavigationLinks

**Total: 56 components** (down from 59 with duplicates eliminated)

## Benefits

✅ **Better Organization**: Logical grouping by feature
✅ **No Duplicates**: Single source of truth for shared components
✅ **Clean Imports**: Barrel exports make imports concise
✅ **Easier Navigation**: Find components faster
✅ **Better Maintainability**: Changes in one place
✅ **Onboarding**: Clear structure for new developers
