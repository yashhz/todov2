## 2024-06-21 - [Added ARIA Labels to Custom Inline Dismiss Buttons]
**Learning:** Found several custom inline dismiss/clear buttons across SmartInput, CommandBar, and SmartFilter that used "×" with `onClick` but without `type="button"`, `aria-label`, or `title`. This is an accessibility issue for screen readers and can also lead to unintended form submissions.
**Action:** When adding or reviewing custom dismiss/clear buttons, always ensure they have `type="button"`, an appropriate `aria-label`, and `title`.
