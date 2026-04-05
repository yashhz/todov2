# Requirements Document: Premium UI/UX Overhaul

## Introduction

This document specifies requirements for a comprehensive UI/UX overhaul of Planify, a life operating system app that links tasks, habits, goals, and projects. The overhaul aims to eliminate "AI slop" design patterns (decorative effects, emoji overuse, inconsistent styling) and establish a unified, functional, premium design system where every element serves a clear purpose.

The redesign preserves what works (CommandBar, Task cards, Dashboard layout, filter sentence pattern) while fixing broken patterns (overengineered Habits/Goals/Projects cards, decorative chrome, inconsistent typography, non-functional color usage).

## Glossary

- **System**: The Planify application frontend
- **Card_Component**: A reusable UI component for displaying entity information (tasks, habits, goals, projects)
- **Status_Indicator**: A visual element showing entity state (checkbox, dot, progress ring, status dot)
- **Metadata_Strip**: The bottom section of a card showing contextual information
- **Inline_Action**: A quick action available on hover without opening detail views
- **Smart_Grouping**: Automatic organization of items by time or status
- **Progressive_Disclosure**: Showing essential info by default, revealing more on interaction
- **Filter_Pattern**: The conversational sentence-based filtering UI
- **Glassmorphic_Effect**: Visual effects using backdrop-filter, blur, or transparency
- **Decorative_Element**: UI elements that don't convey functional information
- **Lucide_Icons**: The Lucide React icon library
- **Typography_Scale**: The standardized font size and weight system
- **Functional_Color**: Color used to convey status or state information
- **Identity_Color**: Color used decoratively to distinguish items

## Requirements

### Requirement 1: Remove Decorative Visual Effects

**User Story:** As a user, I want a clean interface without distracting visual effects, so that I can focus on my tasks and goals.

#### Acceptance Criteria

1. THE System SHALL remove all glassmorphic effects including backdrop-filter, blur effects, and transparency-based layering from Habits cards
2. THE System SHALL remove all glow effects, box-shadow glows, and gradient overlays from Goals cards
3. THE System SHALL remove all decorative gradient backgrounds from page titles
4. THE System SHALL remove all transform animations on hover that scale or translate elements beyond 1-2px
5. THE System SHALL remove all decorative border effects including dashed borders and accent glows

### Requirement 2: Replace Emoji Icons with Lucide Icons

**User Story:** As a user, I want consistent iconography throughout the app, so that the interface feels professional and cohesive.

#### Acceptance Criteria

1. THE System SHALL install the lucide-react package as a dependency
2. THE System SHALL replace all emoji icons (🎯, 💪, 📊, etc.) in Goals with Lucide React icons
3. THE System SHALL replace all emoji icons in Habits with Lucide React icons
4. THE System SHALL replace all emoji icons in Projects with Lucide React icons
5. WHERE emoji icons are used for user-selected symbols, THE System SHALL provide a Lucide icon picker instead
6. THE System SHALL use simple colored dots (6-8px circles) for status indicators where appropriate

### Requirement 3: Standardize Typography System

**User Story:** As a developer, I want a consistent typography scale, so that text hierarchy is clear and maintainable.

#### Acceptance Criteria

1. THE System SHALL set page titles to 32px font-size with 700 font-weight
2. THE System SHALL set card titles to 15px font-size with 600 font-weight
3. THE System SHALL set metadata text to 11px font-size with 500 font-weight
4. THE System SHALL remove all gradient text effects using background-clip
5. THE System SHALL use consistent line-height values (1.2 for headings, 1.5 for body text)
6. THE System SHALL remove font-size variations within the same component type (e.g., all project cards use same title size)

### Requirement 4: Implement Unified Card Component

**User Story:** As a user, I want all cards to follow a consistent visual pattern, so that I can quickly scan information across different sections.

#### Acceptance Criteria

1. THE System SHALL create a reusable Card component with standardized structure
2. THE Card_Component SHALL use 16px padding for card body
3. THE Card_Component SHALL use 8px gap between internal sections
4. THE Card_Component SHALL display status indicator in the top-left position
5. THE Card_Component SHALL display title and subtitle in the main content area
6. THE Card_Component SHALL display metadata strip at the bottom with 1px top border
7. THE Card_Component SHALL display action buttons in the top-right, visible on hover

### Requirement 5: Redesign Habits Cards

**User Story:** As a user, I want simplified habit cards that show essential information without visual clutter, so that I can quickly check my daily progress.

#### Acceptance Criteria

1. THE System SHALL replace bento-style Habits cards with the unified Card_Component
2. THE System SHALL use a simple colored dot (8px) as the status indicator for habits
3. THE System SHALL show habit completion status with dot color (gray=incomplete, colored=complete)
4. THE System SHALL display habit title at 15px/600 and frequency at 11px/500
5. THE System SHALL show week grid with minimal styling (no glows, simple borders)
6. THE System SHALL display streak and average energy in the metadata strip
7. THE System SHALL remove all icon wraps, glows, and transform animations

### Requirement 6: Redesign Goals Cards

**User Story:** As a user, I want simplified goal cards that clearly show progress without hierarchical complexity, so that I can track my goals at a glance.

#### Acceptance Criteria

1. THE System SHALL replace hierarchical tree-view Goals cards with the unified Card_Component
2. THE System SHALL use a small progress ring (24px) as the status indicator for goals
3. THE System SHALL display goal title at 15px/600 and current/target values at 11px/500
4. THE System SHALL show progress bar with functional color (blue on gray background)
5. THE System SHALL display sub-goals as separate cards, not nested trees
6. THE System SHALL remove all dashed borders, icon wraps, and expand buttons
7. THE System SHALL show "why" text in metadata strip when present

### Requirement 7: Redesign Projects Cards

**User Story:** As a user, I want project cards that don't copy Notion/Linear patterns, so that the interface feels unique and purposeful.

#### Acceptance Criteria

1. THE System SHALL replace 3px colored left border with a status dot indicator
2. THE System SHALL use status dot colors: green=active, gray=paused, red=archived
3. THE System SHALL remove progress arc visualizations from cards
4. THE System SHALL display task count and completion percentage as text in metadata strip
5. THE System SHALL show linked goal name in metadata strip when present
6. THE System SHALL remove all decorative action buttons from card surface
7. THE System SHALL use the unified Card_Component structure

### Requirement 8: Implement Functional Color System

**User Story:** As a user, I want colors to convey meaningful information, so that I can understand status at a glance.

#### Acceptance Criteria

1. THE System SHALL use red color exclusively for overdue or error states
2. THE System SHALL use green color exclusively for completed or success states
3. THE System SHALL use blue color exclusively for progress indicators
4. THE System SHALL use gray color exclusively for inactive or neutral states
5. THE System SHALL use orange/yellow color exclusively for warnings or upcoming deadlines
6. THE System SHALL remove all identity-based coloring (project accent colors, goal colors) from status indicators
7. WHERE identity colors are needed, THE System SHALL use them only in metadata strip or detail views

### Requirement 9: Add Inline Quick Actions

**User Story:** As a user, I want to perform common actions without opening detail views, so that I can work more efficiently.

#### Acceptance Criteria

1. WHEN hovering over a task card, THE System SHALL display quick reschedule button
2. WHEN hovering over a habit card, THE System SHALL display quick log button
3. WHEN hovering over a goal card, THE System SHALL display quick progress log button
4. THE System SHALL show inline actions with 28px × 28px button size
5. THE System SHALL use simple icon-only buttons without text labels
6. THE System SHALL position inline actions in the top-right corner
7. THE System SHALL animate inline actions with opacity transition (0 to 0.6 on hover)

### Requirement 10: Implement Smart Grouping for Tasks

**User Story:** As a user, I want tasks automatically grouped by time, so that I can focus on what's due soon.

#### Acceptance Criteria

1. THE System SHALL group active tasks into: Today, Tomorrow, This Week, Later
2. THE System SHALL display group headers at 12px/700 uppercase with 0.1em letter-spacing
3. THE System SHALL sort tasks within groups by pressure score (high to low)
4. THE System SHALL show overdue tasks in the Today group with red accent
5. THE System SHALL collapse Later group by default when it contains more than 10 tasks
6. THE System SHALL update grouping automatically when task dates change

### Requirement 11: Add Contextual Metadata Display

**User Story:** As a user, I want to see relevant context for each item, so that I understand what needs attention.

#### Acceptance Criteria

1. WHEN a task is overdue, THE System SHALL display "X days overdue" in red in the metadata strip
2. WHEN a goal is near target, THE System SHALL display "X units to go!" in the metadata strip
3. WHEN a habit streak is active, THE System SHALL display "X day streak" in the metadata strip
4. WHEN a project has no tasks, THE System SHALL display "No tasks yet" in gray
5. THE System SHALL show due date/time in metadata strip using relative format (Today, Tomorrow, Mon)
6. THE System SHALL show linked entities (project, goal) in metadata strip with separator dots

### Requirement 12: Implement Progressive Disclosure

**User Story:** As a user, I want cards to show essential information by default and reveal details on interaction, so that the interface stays clean.

#### Acceptance Criteria

1. THE System SHALL show only title, status, and primary metric on card by default
2. WHEN hovering over a card, THE System SHALL reveal inline action buttons
3. WHEN hovering over a card, THE System SHALL reveal delete button
4. WHEN clicking a card, THE System SHALL open detail view with full information
5. THE System SHALL hide subtasks by default, showing count in metadata strip
6. WHEN clicking subtask count, THE System SHALL expand subtasks inline

### Requirement 13: Extend Filter Pattern to All Pages

**User Story:** As a user, I want the conversational filter pattern available on all pages, so that I have a consistent way to find items.

#### Acceptance Criteria

1. THE System SHALL implement filter sentence pattern on Habits page
2. THE System SHALL implement filter sentence pattern on Goals page
3. THE System SHALL implement filter sentence pattern on Projects page
4. THE System SHALL use consistent trigger button styling (underline on hover, colored when active)
5. THE System SHALL use consistent mini-popover styling for filter options
6. THE System SHALL show active filter count and clear button when filters are applied

### Requirement 14: Standardize Spacing System

**User Story:** As a developer, I want consistent spacing values, so that layouts are predictable and maintainable.

#### Acceptance Criteria

1. THE System SHALL use 16px padding for card interiors
2. THE System SHALL use 8px gap between card sections
3. THE System SHALL use 32px gap between page sections
4. THE System SHALL use 12px gap between metadata items
5. THE System SHALL use 4px gap between inline elements (badges, tags)
6. THE System SHALL remove all custom spacing values not in the 4px scale (4, 8, 12, 16, 20, 24, 32, 40, 48)

### Requirement 15: Redesign Project Detail Pages

**User Story:** As a user, I want project detail pages focused on actions, so that I can quickly see what needs to be done.

#### Acceptance Criteria

1. THE System SHALL remove all decorative chrome from project detail header
2. THE System SHALL display project name at 32px/700 with status dot
3. THE System SHALL show task list as primary content (not metrics)
4. THE System SHALL display completion percentage as simple text (e.g., "12 of 20 tasks complete")
5. THE System SHALL show linked goal as a simple pill in the header
6. THE System SHALL remove all progress arcs, charts, and visualizations
7. THE System SHALL use the same task card design as the Tasks page

### Requirement 16: Implement Keyboard Shortcuts

**User Story:** As a power user, I want keyboard shortcuts for common actions, so that I can work faster.

#### Acceptance Criteria

1. WHEN pressing 'n' on Tasks page, THE System SHALL open new task form
2. WHEN pressing 'n' on Habits page, THE System SHALL open new habit form
3. WHEN pressing 'n' on Goals page, THE System SHALL open new goal form
4. WHEN pressing 'n' on Projects page, THE System SHALL open new project form
5. WHEN pressing '/' anywhere, THE System SHALL focus the CommandBar
6. WHEN pressing 'Escape', THE System SHALL close any open modal or popover
7. THE System SHALL display keyboard shortcuts in a help modal accessible via '?'

### Requirement 17: Create Contextual Empty States

**User Story:** As a new user, I want helpful empty states that guide me to create content, so that I understand how to use the app.

#### Acceptance Criteria

1. THE System SHALL display contextual empty state when no items exist
2. THE System SHALL show a simple icon (Lucide, not emoji) in empty states
3. THE System SHALL display a clear heading explaining what's missing
4. THE System SHALL show a single primary action button to create first item
5. THE System SHALL remove all decorative elements from empty states
6. THE System SHALL use consistent empty state styling across all pages

### Requirement 18: Optimize Card Hover States

**User Story:** As a user, I want subtle hover feedback on cards, so that I know they're interactive without distraction.

#### Acceptance Criteria

1. WHEN hovering over a card, THE System SHALL translate it -2px on Y-axis
2. WHEN hovering over a card, THE System SHALL increase border opacity from 0.05 to 0.12
3. WHEN hovering over a card, THE System SHALL reveal action buttons with opacity transition
4. THE System SHALL use 0.2s ease-out transition for all hover effects
5. THE System SHALL remove all scale transforms on hover
6. THE System SHALL remove all glow or shadow effects on hover

### Requirement 19: Standardize Form Design

**User Story:** As a user, I want consistent form styling across all modals, so that creating items feels familiar.

#### Acceptance Criteria

1. THE System SHALL use 15px/600 font for form input text
2. THE System SHALL use 11px/700 uppercase labels with 0.1em letter-spacing
3. THE System SHALL use 1px solid border with rgba(255,255,255,0.08) for inputs
4. THE System SHALL use 8px border-radius for input fields
5. THE System SHALL show focus state with blue border and subtle shadow
6. THE System SHALL remove all decorative form elements (gradients, glows, custom controls)
7. THE System SHALL use consistent button styling (primary action = colored, secondary = ghost)

### Requirement 20: Implement Consistent Animation Timing

**User Story:** As a user, I want smooth, consistent animations, so that the interface feels polished.

#### Acceptance Criteria

1. THE System SHALL use 0.2s duration for micro-interactions (hover, focus)
2. THE System SHALL use 0.3s duration for state changes (expand, collapse)
3. THE System SHALL use 0.5s duration for page transitions
4. THE System SHALL use ease-out easing for all animations
5. THE System SHALL use cubic-bezier(0.2, 0.8, 0.2, 1) for card entrance animations
6. THE System SHALL remove all spring animations and complex easing functions

### Requirement 21: Create Design Tokens File

**User Story:** As a developer, I want centralized design tokens, so that styling is consistent and easy to update.

#### Acceptance Criteria

1. THE System SHALL create a tokens.css file with all design values
2. THE System SHALL define typography scale (font-size, font-weight, line-height)
3. THE System SHALL define spacing scale (4px increments from 4 to 48)
4. THE System SHALL define color palette (functional colors only)
5. THE System SHALL define border-radius values (4px, 8px, 12px, 16px, full)
6. THE System SHALL define animation timing values (duration and easing)
7. THE System SHALL use CSS custom properties for all token values

### Requirement 22: Implement Status-First Card Design

**User Story:** As a user, I want to see status information first, so that I can quickly assess what needs attention.

#### Acceptance Criteria

1. THE System SHALL position status indicator in the top-left of every card
2. THE System SHALL use consistent status indicator sizes (checkbox=24px, dot=8px, ring=24px)
3. THE System SHALL use functional colors for status (not identity colors)
4. THE System SHALL display status-related text (overdue, complete) prominently
5. THE System SHALL de-emphasize decorative information (icons, colors)
6. THE System SHALL show most urgent items first in lists

### Requirement 23: Remove AI Slop Patterns

**User Story:** As a user, I want an interface that feels human-designed, so that I trust the app's quality.

#### Acceptance Criteria

1. THE System SHALL remove all emoji icons from UI chrome (keep only in user-generated content)
2. THE System SHALL remove all "premium" visual effects (glassmorphism, glows, gradients)
3. THE System SHALL remove all decorative animations (floating, pulsing, scaling)
4. THE System SHALL remove all unnecessary visual complexity (nested borders, multiple shadows)
5. THE System SHALL use simple, functional design patterns throughout
6. THE System SHALL ensure every visual element serves a clear purpose

### Requirement 24: Implement Consistent Metadata Strip

**User Story:** As a user, I want consistent metadata display across all cards, so that I know where to look for context.

#### Acceptance Criteria

1. THE System SHALL display metadata strip at bottom of every card
2. THE System SHALL use 1px solid rgba(255,255,255,0.03) top border
3. THE System SHALL use 11px/500 font for all metadata text
4. THE System SHALL separate metadata items with · character
5. THE System SHALL use functional colors for metadata (red=overdue, green=complete, gray=neutral)
6. THE System SHALL show 3-5 most relevant metadata items per card
7. THE System SHALL make metadata items clickable when they represent filters

### Requirement 25: Optimize Information Density

**User Story:** As a user, I want cards to show exactly what I need without clutter, so that I can scan information quickly.

#### Acceptance Criteria

1. THE System SHALL display title, status, and primary metric on every card
2. THE System SHALL hide secondary information until hover or click
3. THE System SHALL use single-line titles with ellipsis for overflow
4. THE System SHALL show 2-line maximum for descriptions
5. THE System SHALL limit metadata strip to 5 items maximum
6. THE System SHALL remove all redundant information (e.g., showing both percentage and fraction)

### Requirement 26: Implement Smart Empty State Transitions

**User Story:** As a user, I want smooth transitions when adding first items, so that the interface feels responsive.

#### Acceptance Criteria

1. WHEN creating first item, THE System SHALL fade out empty state over 0.3s
2. WHEN creating first item, THE System SHALL fade in new card over 0.5s
3. WHEN deleting last item, THE System SHALL fade in empty state over 0.3s
4. THE System SHALL use stagger animation for multiple cards (0.05s delay between each)
5. THE System SHALL animate cards from translateY(12px) to translateY(0)

### Requirement 27: Standardize Button Design

**User Story:** As a user, I want consistent button styling, so that I understand button hierarchy.

#### Acceptance Criteria

1. THE System SHALL use 14px/600 font for button text
2. THE System SHALL use 8px border-radius for buttons
3. THE System SHALL use colored background for primary actions
4. THE System SHALL use transparent background with border for secondary actions
5. THE System SHALL use icon-only buttons (28px × 28px) for inline actions
6. THE System SHALL show hover state with -1px translateY and subtle shadow
7. THE System SHALL remove all gradient backgrounds from buttons

### Requirement 28: Implement Consistent Icon Usage

**User Story:** As a user, I want icons to enhance understanding, so that I can quickly identify items.

#### Acceptance Criteria

1. THE System SHALL use 16px icon size for card headers
2. THE System SHALL use 14px icon size for inline actions
3. THE System SHALL use 12px icon size for metadata items
4. THE System SHALL use 1.5px stroke-width for all Lucide icons
5. THE System SHALL use currentColor for icon fill/stroke
6. THE System SHALL position icons 8px from adjacent text

### Requirement 29: Create Reusable Status Dot Component

**User Story:** As a developer, I want a reusable status dot component, so that status indicators are consistent.

#### Acceptance Criteria

1. THE System SHALL create a StatusDot component accepting size and color props
2. THE StatusDot SHALL default to 8px diameter
3. THE StatusDot SHALL use border-radius: 50% for circular shape
4. THE StatusDot SHALL accept status prop mapping to functional colors (active=green, paused=gray, error=red)
5. THE StatusDot SHALL include optional pulse animation for active states
6. THE StatusDot SHALL be used consistently across all card types

### Requirement 30: Implement Accessibility Compliance

**User Story:** As a user with accessibility needs, I want the interface to be fully accessible, so that I can use all features.

#### Acceptance Criteria

1. THE System SHALL maintain 4.5:1 contrast ratio for all text
2. THE System SHALL provide keyboard navigation for all interactive elements
3. THE System SHALL include ARIA labels for icon-only buttons
4. THE System SHALL show focus indicators on all focusable elements
5. THE System SHALL support screen reader announcements for state changes
6. THE System SHALL allow all actions via keyboard (no mouse-only interactions)
