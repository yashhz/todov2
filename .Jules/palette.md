## 2024-10-27 - Dashboard ARIA Labels Update
**Learning:** Found several icon-only buttons (`Settings`, `Star` to pin anchor goal, `Plus` to quick log goal progress) that lacked ARIA labels. This negatively affects screen-reader users, as they are essential to navigate and manage tasks effectively on the dashboard.
**Action:** When creating or maintaining icon-only buttons using libraries like `lucide-react`, always verify that a descriptive `aria-label` attribute is applied to the wrapping `<button>` element.
