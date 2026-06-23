## 2024-06-23 - Added missing ARIA labels and titles to icon-only buttons
**Learning:** Found several icon-only dismiss/clear buttons across SmartInput, SmartFilter, CommandBar, Habits, and Tasks components that were missing accessibility text. These buttons are inaccessible to screen readers without an aria-label, and without a title they lack a tooltip for visual users.
**Action:** Always verify that custom inline controls with icon-only text (e.g., × or chevrons) include an explicit aria-label and title to ensure accessibility.
