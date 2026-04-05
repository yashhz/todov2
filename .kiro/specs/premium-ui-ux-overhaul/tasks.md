# Implementation Plan: Premium UI/UX Overhaul

## Overview

This plan implements a comprehensive UI/UX overhaul to eliminate decorative effects and establish a unified, functional design system. The implementation follows a phased approach starting with foundational changes (tokens, CSS cleanup) before moving to component refactoring and smart UX features.

## Tasks

### Phase 1: Foundation

- [x] 1. Install lucide-react package
  - Add lucide-react as a dependency to package.json
  - _Requirements: 2.1_

- [x] 2. Update design tokens in tokens.css
  - Define typography scale (32px/700 titles, 15px/600 card titles, 11px/500 metadata)
  - Define spacing scale (4px increments: 4, 8, 12, 16, 20, 24, 32, 40, 48)
  - Define functional color palette (success, danger, warning, neutral)
  - Define border-radius values (4px, 8px, 12px, 16px, full)
  - Define animation timing (0.2s micro, 0.3s state, 0.5s page, ease-out)
  - Use CSS custom properties for all values
  - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 3.1, 3.2, 3.3, 3.5, 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 20.1, 20.2, 20.3, 20.4, 20.5, 20.6_

- [x] 3. Remove decorative effects from existing CSS files
  - Remove glassmorphic effects (backdrop-filter, blur) from Habits.css
  - Remove glow effects and gradient overlays from Goals.css
  - Remove decorative gradient backgrounds from page titles
  - Remove transform scale animations beyond 1-2px
  - Remove decorative border effects (dashed borders, accent glows)
  - Remove all gradient text effects using background-clip
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.4, 23.2, 23.3, 23.4_

### Phase 2: Core Components

- [x] 4. Create unified Card component
  - Create Card.tsx with standardized structure (status, title, subtitle, metadata strip, actions)
  - Implement CardProps interface with statusType, title, subtitle, metadata, actions
  - Use 16px padding for card body
  - Use 8px gap between internal sections
  - Position status indicator in top-left
  - Position action buttons in top-right (visible on hover)
  - Display metadata strip at bottom with 1px top border
  - Implement hover state (-2px translateY, border opacity 0.05 to 0.12)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 14.1, 14.2, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 22.1, 22.2, 24.1, 24.2_

- [x] 5. Create StatusDot component
  - Create StatusDot.tsx accepting size, color, and pulse props
  - Default to 8px diameter with border-radius: 50%
  - Accept status prop mapping to functional colors (active=green, paused=gray, error=red)
  - Include optional pulse animation for active states
  - _Requirements: 29.1, 29.2, 29.3, 29.4, 29.5, 29.6_

- [x] 6. Create icon mapping utilities
  - Create utility function to map emoji icons to Lucide icons
  - Define ICON_MAP with common emoji to Lucide mappings (🎯→Target, 💪→Dumbbell, 📊→BarChart3)
  - Implement getLucideIcon function with fallback to Circle
  - _Requirements: 2.2, 2.3, 2.4, 23.1_

- [x] 7. Update typography across app
  - Apply 32px/700 to page titles
  - Apply 15px/600 to card titles
  - Apply 11px/500 to metadata text
  - Apply consistent line-height (1.2 for headings, 1.5 for body)
  - Remove font-size variations within same component types
  - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6_

### Phase 3: Redesign Cards

- [x] 8. Redesign Habits cards
  - Replace bento-style cards with unified Card component
  - Use 8px colored dot as status indicator
  - Show completion status with dot color (gray=incomplete, colored=complete)
  - Display habit title at 15px/600 and frequency at 11px/500
  - Show week grid with minimal styling (no glows, simple borders)
  - Display streak and average energy in metadata strip
  - Remove all icon wraps, glows, and transform animations
  - Replace emoji icons with Lucide icons
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 2.3_

- [x] 9. Redesign Goals cards
  - Replace hierarchical tree-view cards with unified Card component
  - Use 24px progress ring as status indicator
  - Display goal title at 15px/600 and current/target values at 11px/500
  - Show progress bar with functional color (blue on gray)
  - Display sub-goals as separate cards (not nested trees)
  - Remove dashed borders, icon wraps, and expand buttons
  - Show "why" text in metadata strip when present
  - Replace emoji icons with Lucide icons
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 2.2_

- [x] 10. Redesign Projects cards
  - Replace 3px colored left border with status dot indicator
  - Use status dot colors: green=active, gray=paused, red=archived
  - Remove progress arc visualizations
  - Display task count and completion percentage as text in metadata strip
  - Show linked goal name in metadata strip when present
  - Remove decorative action buttons from card surface
  - Use unified Card component structure
  - Replace emoji icons with Lucide icons
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 2.4_

### Phase 4: Smart UX

- [x] 11. Add inline quick actions to cards
  - Add quick reschedule button to task cards (visible on hover)
  - Add quick log button to habit cards (visible on hover)
  - Add quick progress log button to goal cards (visible on hover)
  - Use 28px × 28px icon-only buttons
  - Position in top-right corner
  - Animate with opacity transition (0 to 0.6 on hover)
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [x] 12. Implement smart grouping for tasks
  - Group active tasks into: Today, Tomorrow, This Week, Later
  - Display group headers at 12px/700 uppercase with 0.1em letter-spacing
  - Sort tasks within groups by pressure score (high to low)
  - Show overdue tasks in Today group with red accent
  - Collapse Later group by default when >10 tasks
  - Update grouping automatically when task dates change
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 13. Extend filter pattern to Habits page
  - Implement filter sentence pattern with consistent trigger button styling
  - Use mini-popover styling for filter options
  - Show active filter count and clear button when filters applied
  - _Requirements: 13.1, 13.4, 13.5, 13.6_

- [x] 14. Extend filter pattern to Goals page
  - Implement filter sentence pattern with consistent trigger button styling
  - Use mini-popover styling for filter options
  - Show active filter count and clear button when filters applied
  - _Requirements: 13.2, 13.4, 13.5, 13.6_

- [x] 15. Extend filter pattern to Projects page
  - Implement filter sentence pattern with consistent trigger button styling
  - Use mini-popover styling for filter options
  - Show active filter count and clear button when filters applied
  - _Requirements: 13.3, 13.4, 13.5, 13.6_

### Phase 5: Detail Pages & Polish

- [x] 16. Redesign project detail page
  - Remove decorative chrome from header
  - Display project name at 32px/700 with status dot
  - Show task list as primary content (not metrics)
  - Display completion percentage as simple text ("12 of 20 tasks complete")
  - Show linked goal as simple pill in header
  - Remove progress arcs, charts, and visualizations
  - Use same task card design as Tasks page
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6, 15.7_

- [x] 17. Redesign goal detail page
  - Remove decorative chrome from header
  - Display goal name at 32px/700 with progress ring
  - Show progress updates as primary content
  - Display current/target values prominently
  - Show linked projects as simple pills
  - Remove decorative visualizations
  - _Requirements: 15.1, 15.2, 15.3, 15.4, 15.5, 15.6_

- [x] 18. Add keyboard shortcuts
  - Implement 'n' key to open new item form on each page (Tasks, Habits, Goals, Projects)
  - Implement '/' key to focus CommandBar
  - Implement 'Escape' key to close modals/popovers
  - Create help modal accessible via '?' showing all shortcuts
  - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7_

- [x] 19. Implement contextual metadata display
  - Show "X days overdue" in red for overdue tasks
  - Show "X units to go!" for goals near target
  - Show "X day streak" for active habit streaks
  - Show "No tasks yet" in gray for empty projects
  - Show due date/time in relative format (Today, Tomorrow, Mon)
  - Show linked entities with separator dots
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 24.3, 24.4, 24.5_

- [x] 20. Implement functional color system
  - Use red exclusively for overdue/error states
  - Use green exclusively for completed/success states
  - Use blue exclusively for progress indicators
  - Use gray exclusively for inactive/neutral states
  - Use orange/yellow exclusively for warnings/upcoming deadlines
  - Remove identity-based coloring from status indicators
  - Use identity colors only in metadata strip or detail views
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [x] 21. Create contextual empty states
  - Display contextual empty state when no items exist
  - Show simple Lucide icon (not emoji)
  - Display clear heading explaining what's missing
  - Show single primary action button to create first item
  - Remove decorative elements
  - Use consistent styling across all pages
  - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6_

- [x] 22. Implement progressive disclosure
  - Show only title, status, and primary metric by default
  - Reveal inline action buttons on hover
  - Reveal delete button on hover
  - Open detail view with full information on click
  - Hide subtasks by default, show count in metadata strip
  - Expand subtasks inline when clicking count
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6_

- [x] 23. Standardize form design across modals
  - Use 15px/600 font for form input text
  - Use 11px/700 uppercase labels with 0.1em letter-spacing
  - Use 1px solid border with rgba(255,255,255,0.08) for inputs
  - Use 8px border-radius for input fields
  - Show focus state with blue border and subtle shadow
  - Remove decorative form elements (gradients, glows, custom controls)
  - Use consistent button styling (primary=colored, secondary=ghost)
  - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7_

- [x] 24. Implement accessibility compliance
  - Maintain 4.5:1 contrast ratio for all text
  - Provide keyboard navigation for all interactive elements
  - Include ARIA labels for icon-only buttons
  - Show focus indicators on all focusable elements
  - Support screen reader announcements for state changes
  - Allow all actions via keyboard (no mouse-only interactions)
  - _Requirements: 30.1, 30.2, 30.3, 30.4, 30.5, 30.6_

- [x] 25. Final polish and testing
  - Verify all decorative effects removed
  - Verify consistent spacing throughout (4px scale)
  - Verify consistent typography scale applied
  - Verify functional color system implemented
  - Verify all cards use unified Card component
  - Test keyboard shortcuts on all pages
  - Test accessibility with keyboard navigation
  - Verify smooth animations (0.2s micro, 0.3s state, ease-out)
  - _Requirements: 1.1-1.5, 3.1-3.6, 8.1-8.7, 14.1-14.6, 18.1-18.6, 20.1-20.6, 23.1-23.6_

## Notes

- All tasks build incrementally on previous work
- Foundation phase (tokens, CSS cleanup) must be completed before component work
- Card component is reused across Habits, Goals, and Projects pages
- Filter pattern from Tasks page is extended to other pages
- Existing data models and state management remain unchanged
- CommandBar and Dashboard require minimal changes (already well-designed)
- Focus on removing decorative elements and establishing functional design patterns
