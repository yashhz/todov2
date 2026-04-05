# Design Document: Premium UI/UX Overhaul

## Overview

This design document outlines the technical approach for overhauling Planify's UI/UX to eliminate "AI slop" design patterns and establish a unified, functional, premium design system. The overhaul focuses on practical implementation over theoretical architecture, reusing existing patterns that work (Task cards, CommandBar, Dashboard layout) while fixing broken patterns (overengineered Habits/Goals/Projects cards, decorative effects, inconsistent styling).

### Design Philosophy

- **Simplicity First**: No over-engineering, no complex state management changes
- **Reuse What Works**: Leverage existing Task card patterns and CommandBar design
- **Functional Over Decorative**: Every visual element serves a clear purpose
- **Quick Wins**: Start with foundation (tokens, CSS cleanup, Lucide icons) before component work
- **Preserve Data Models**: Keep existing data structures and logic intact

### Scope

The redesign touches:
- Visual design system (tokens, typography, colors, spacing)
- Component architecture (unified Card component)
- Page-level layouts (Habits, Goals, Projects, Project Detail)
- Interaction patterns (inline actions, smart grouping, filters)
- Accessibility compliance

The redesign does NOT touch:
- Data models or state management
- Backend logic or storage
- CommandBar functionality (already good)
- Core business logic

## Architecture

### Component Hierarchy

```
App
├── Sidebar (minimal changes - remove decorative effects)
├── CommandBar (preserve existing - already excellent)
└── Pages
    ├── Dashboard (minimal changes)
    ├── Tasks (preserve existing - reference implementation)
    ├── Habits (major refactor - use unified Card)
    ├── Goals (major refactor - use unified Card)
    ├── Projects (moderate refactor - use unified Card)
    └── ProjectDetail (moderate refactor - simplify chrome)
```

### Design System Structure

```
styles/
├── tokens.css (centralized design values)
├── reset.css (browser normalization)
└── animations.css (standardized transitions)

components/
├── Card.tsx (NEW - unified card component)
├── StatusDot.tsx (NEW - reusable status indicator)
├── Modal.tsx (existing - minor updates)
└── CommandBar.tsx (existing - preserve)
```

### Implementation Strategy

**Phase 1: Foundation (Quick Wins)**
1. Update tokens.css with standardized values
2. Remove decorative CSS (glassmorphism, glows, gradients)
3. Install lucide-react package
4. Create icon mapping utilities

**Phase 2: Core Components**
1. Create unified Card component
2. Create StatusDot component
3. Update Modal styling for consistency

**Phase 3: Page Refactoring**
1. Refactor Habits page (use Card component)
2. Refactor Goals page (use Card component)
3. Refactor Projects page (use Card component)
4. Simplify ProjectDetail page

**Phase 4: Smart Features**
1. Add inline quick actions to all cards
2. Implement smart grouping for Tasks (extend to other pages)
3. Extend filter pattern to Habits, Goals, Projects
4. Add keyboard shortcuts

## Components and Interfaces

### Card Component

The unified Card component is the cornerstone of the redesign. It provides a consistent structure for all entity types (tasks, habits, goals, projects).

```typescript
interface CardProps {
  // Status indicator (top-left)
  statusType: 'checkbox' | 'dot' | 'ring';
  statusValue?: boolean | number; // checkbox: checked, ring: percentage
  statusColor?: string; // functional color
  onStatusClick?: () => void;
  
  // Main content
  title: string;
  subtitle?: string;
  icon?: ReactNode; // Lucide icon
  
  // Metadata strip (bottom)
  metadata: MetadataItem[];
  
  // Actions (top-right, visible on hover)
  actions?: CardAction[];
  
  // Interaction
  onClick?: () => void;
  onDelete?: () => void;
  
  // Children (for expandable content like subtasks)
  children?: ReactNode;
  
  // Styling
  className?: string;
  pressureLevel?: 'low' | 'medium' | 'high' | 'urgent';
}

interface MetadataItem {
  type: 'text' | 'badge' | 'link';
  icon?: ReactNode;
  text: string;
  color?: string; // functional color only
  onClick?: () => void;
}

interface CardAction {
  icon: ReactNode;
  label: string; // for accessibility
  onClick: (e: React.MouseEvent) => void;
  variant?: 'default' | 'danger';
}
```

**Card Structure:**
```
┌─────────────────────────────────────────────┐
│ [Status] Title                    [Actions] │
│          Subtitle                           │
│                                             │
│ ─────────────────────────────────────────── │
│ [icon] meta · [icon] meta · [icon] meta    │
└─────────────────────────────────────────────┘
```

### StatusDot Component

```typescript
interface StatusDotProps {
  size?: number; // default 8px
  color: string; // functional color
  pulse?: boolean; // for active states
  className?: string;
}
```

### Filter Pattern Component

Reusable conversational filter UI (already exists in Tasks, extend to other pages):

```typescript
interface FilterSentenceProps {
  filters: FilterConfig[];
  activeFilters: Record<string, any>;
  onFilterChange: (key: string, value: any) => void;
  onClearAll: () => void;
}

interface FilterConfig {
  key: string;
  label: string;
  type: 'select' | 'multi-select';
  options: FilterOption[];
  renderValue: (value: any) => string;
}
```

### Icon Mapping Utilities

```typescript
// Map emoji icons to Lucide icons
const ICON_MAP: Record<string, LucideIcon> = {
  '🎯': Target,
  '💪': Dumbbell,
  '📊': BarChart3,
  '🏃': Activity,
  // ... more mappings
};

function getLucideIcon(emoji: string): LucideIcon {
  return ICON_MAP[emoji] || Circle;
}
```

## Data Models

No changes to existing data models. The redesign works with current TypeScript interfaces:
- `Task`
- `Habit`
- `Goal`
- `Project`
- `TimeBlock`
- `DailyIntention`

All existing properties are preserved. The redesign only changes how data is displayed, not how it's stored or managed.

### Display Transformations

Some display logic will be added to transform stored data for presentation:

```typescript
// Convert stored emoji to Lucide icon
function getDisplayIcon(entity: Goal | Habit | Project): ReactNode {
  return <LucideIcon icon={getLucideIcon(entity.icon)} />;
}

// Determine functional status color
function getStatusColor(entity: Task | Habit | Goal | Project): string {
  if (entity.completed) return 'var(--color-success)';
  if (isOverdue(entity)) return 'var(--color-danger)';
  if (isUpcoming(entity)) return 'var(--color-warning)';
  return 'var(--text-tertiary)';
}

// Format metadata for display
function getMetadata(entity: any): MetadataItem[] {
  const items: MetadataItem[] = [];
  
  // Add relevant metadata based on entity type
  if (entity.dueDate) {
    items.push({
      type: 'text',
      icon: <Calendar size={12} />,
      text: formatRelativeDate(entity.dueDate),
      color: isOverdue(entity) ? 'var(--color-danger)' : undefined
    });
  }
  
  // ... more metadata logic
  
  return items;
}
```
