## 2024-06-10 - Custom Inline Controls Missing Accessibility
**Learning:** The codebase heavily uses custom inline controls with icon-only text (e.g., × or chevrons). These are frequently missing `aria-label`, `title`, and sometimes `type="button"`, causing poor accessibility for screen readers and keyboard navigation.
**Action:** Always verify that custom inline elements, such as inline dismiss or clear buttons, include an explicit `aria-label`, `title`, and `type="button"` to ensure accessibility.
