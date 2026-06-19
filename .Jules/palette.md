## 2026-06-19 - Accessible Icon-Only Inline Buttons
**Learning:** Custom inline controls with icon-only text (e.g., × or chevrons) across components often lack accessibility contexts and may inadvertently trigger form submissions if lacking a defined button type.
**Action:** Always verify that icon-only interactive elements, such as inline dismiss or clear buttons, include an explicit `aria-label` and `title` to ensure accessibility, and set `type="button"` on these elements to prevent accidental form submissions.
