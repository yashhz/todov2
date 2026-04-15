## 2024-04-15 - Missing Accessible Names on Icon Buttons
**Learning:** Many interactive components (like custom calendars and small action buttons on cards) rely entirely on visual icons (`ChevronLeft`, `Trash2`, `Edit`) without explicit textual descriptions, reducing screen reader accessibility.
**Action:** Ensure that all icon-only action buttons are decorated with `aria-label` and `title` tags to provide necessary context to all users, especially during new feature development involving custom controls.
