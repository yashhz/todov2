## 2026-06-28 - Inline Control Accessibility
**Learning:** The codebase heavily uses custom inline controls with icon-only text (e.g., × or chevrons) inside inputs or forms. Without explicit `type="button"`, these can accidentally trigger form submissions. Without `aria-label` and `title`, screen reader users have no context for what these controls do (e.g., 'dismiss token' vs 'clear date').
**Action:** Always verify that custom inline elements, such as dismiss or clear buttons, include `type="button"`, an explicit `aria-label`, and `title` to ensure functionality and accessibility.
