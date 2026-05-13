## 2024-05-13 - Icon-only buttons lacking semantic meaning
**Learning:** The application heavily relies on custom inline controls with icon-only text (e.g., `×` or chevrons) for actions like dismissing tokens or clearing inputs, which completely lack semantic meaning for screen readers.
**Action:** Always verify that these elements, such as inline dismiss or clear buttons, include an explicit `aria-label` and `title` to ensure accessibility and proper announcement for all users.
