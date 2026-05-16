## 2026-05-16 - Accessibility for custom inline controls
**Learning:** This codebase heavily uses custom inline controls with icon-only text (e.g., × or chevrons). These elements often lack accessibility labels, making them unusable for screen readers or when hovered.
**Action:** Always verify that inline dismiss or clear buttons (e.g., clearing form dates, removing linked entities, dismissing chips) include an explicit `aria-label` and `title`.
