## 2024-05-30 - SmartInput Accessibility
**Learning:** The CommandBar's SmartInput has multiple icon-only inline interactive elements (submit arrow, dismiss chip 'x') that lacked native tooltips and screen reader descriptions.
**Action:** Always add `aria-label` and `title` to inline symbol buttons inside custom inputs or chips to ensure they are accessible and discoverable.
