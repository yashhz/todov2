# Planify: The Architecture of Intention

Planify is not just a to-do list; it's a **Life Operating System**. It is designed to bridge the gap between daily "busy-work" and long-term vision through a technical and logical framework called the **Interlinking Engine**.

---

## 🌟 The Core Vision
Most productivity apps separate your tasks, your habits, and your goals into different silos. You check off a task, but you don't see how it moves the needle on your life goals. 

**Planify's raw vision is "Automatic Upward Propagation."**
When you drink a glass of water (Habit) or finish a gym session (Task), the app automatically calculates the contribution to your "Health & Fitness" (Goal). It turns the mundane into measurable progress.

---

## 🧩 Key Modules

### 1. The Interlinking Engine (Technical Core)
This is the "Brain" of the app. 
- **Tasks & Habits** are the "Inputs."
- **Goals** are the "Outputs."
- Every task can be assigned a `contributionValue`. When completed, the system triggers a background logic that updates the `currentValue` of the linked Goal.

### 2. Hierarchical Goals
We support two types of goals:
- **Target Goals**: Specific metrics (e.g., "Save $10,000" or "Read 50 Books").
- **Umbrella Goals**: These act as containers. They don't have their own progress but instead aggregate the average progress of all their "Sub-Goals." 

### 3. Habit Neural-Grid
The habit system uses a flexible recurrence engine. It tracks streaks and "best streaks" to gamify consistency. It doesn't just ask *if* you did it, but *when* you are most consistent.

### 4. Smart Task Management
Includes a custom-built **TimePicker** and a **Hashtag Autocomplete** system. Typing `#` in a task description instantly connects it to your global tagging system, allowing for cross-modular data filtering.

---

## 🎨 Design Philosophy: "Digital Glass"
The app uses a **Premium Glassmorphic Aesthetic**. 
- **Aesthetics**: High-contrast dark mode, vibrant gradients, and blurred translucent surfaces (using `backdrop-filter`).
- **Typography**: Uses **Satoshi** and **Cabinet Grotesk** to evoke a high-end, editorial feel.
- **UX**: A "Fixed Viewport" approach. The sidebar and header stay locked while content scrolls independently, making it feel like a professional desktop application rather than a simple web page.
- **Micro-Animations**: Uses CSS spring transitions and `framer-motion` style logic to ensure every interaction (opening a modal, toggling a checkbox) feels tactile and "alive."

---

## 💻 Technical Stack
- **Frontend**: React 18 + Vite (for lightning-fast HMR).
- **Language**: Strict TypeScript (ensuring data integrity across complex interlinked models).
- **State**: Custom Reducer-based Context API (`AppContext`) with an automatic LocalStorage persistence layer.
- **Styling**: Pure CSS Variables (Tokens) for a scalable design system without the overhead of heavy frameworks.

---

## 🚀 How It Works (The Flow)
1. **Define the North Star**: You create a Goal (e.g., "Become a Professional Developer").
2. **Set the Routine**: You create a Habit and link it (e.g., "Code for 1 hour" contributing 1% to the goal).
3. **Execute**: Every time you complete that habit, the Dashboard ring updates, the Goal progress bar moves, and the Streak increments.

**It's a feedback loop designed to make growth inevitable.**
