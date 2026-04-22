## 2024-04-22 - Missing Aria Labels on Icon-only Buttons
**Learning:** Many icon-only buttons across the application (like close, dismiss, add, or clear buttons) lack `aria-label` tags, making them inaccessible to screen readers.
**Action:** When adding new icon-only buttons, always ensure an `aria-label` is present. Regular sweeps should be done to add these to existing components.
