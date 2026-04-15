/* ═══════════════════════════════════════════════════════════
   DATA MODELS — Planify
   All core TypeScript interfaces and enums
   ═══════════════════════════════════════════════════════════ */

// ─── Goal Link (multi-goal contribution) ─────────
export interface GoalLink {
  goalId: string;
  contributionValue: number; // can be negative
}

// ─── Subtask ─────────────────────────────────────
export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

// ─── Task ────────────────────────────────────────
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: string;        // ISO
  dueDate: string | null;   // YYYY-MM-DD
  dueTime: string | null;   // HH:mm (24h)
  duration: number | null;  // minutes — optional, never required
  priority: TaskPriority;
  categoryId: string | null;   // legacy — kept for migration compat
  projectId: string | null;    // replaces categoryId
  tags: string[];              // free-text labels e.g. ["urgent", "waiting"]
  subtasks: Subtask[];
  linkedGoalId: string | null;      // kept for single-link compat
  contributionValue: number | null; // kept for single-link compat
  goalLinks: GoalLink[];            // multi-goal links (source of truth)
  // pressure score is COMPUTED, never stored — see services/pressureScore.ts
}

// ─── Goal ────────────────────────────────────────
// 'measurable' — explicit numeric targets (e.g., 1000 pushups), gets progress bar
// 'milestone'  — finishable outcomes (e.g., "Get a Six Pack"), driven by completion fraction of linked tasks/sub-goals
// 'continuous' — ongoing direction (e.g., "Eat Healthy"), no progress bar, driven by habits
export type GoalType = 'measurable' | 'milestone' | 'continuous' | 'outcome' | 'directional';

export interface ProgressEntry {
  id: string;
  date: string;    // ISO
  value: number;   // can be negative (correction)
  note: string;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  why: string;              // The single-sentence reason
  goalType: GoalType;       // measurable | directional | milestone
  targetValue: number | null; // null = directional/milestone
  currentValue: number;
  unit: string | null;      // null = directional/milestone
  color: string;            // hex
  icon: string;             // emoji
  createdAt: string;
  entries: ProgressEntry[];
  parentGoalId: string | null;
}

// ─── Habit ───────────────────────────────────────
export type HabitFrequency = 'daily' | 'specific_days' | 'every_n_days' | 'times_per_week';
export type EnergyRating = 1 | 2 | 3 | 4 | 5;

export interface HabitCompletion {
  date: string;             // YYYY-MM-DD
  completed: boolean;
  energyRating?: EnergyRating; // how it felt — captured right after check-off
  note?: string;            // optional quick note (future)
}

export interface Habit {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  frequency: HabitFrequency;
  specificDays: number[];   // 0=Sun..6=Sat
  everyNDays: number;
  timesPerWeek: number;
  timeOfDay: string | null; // HH:mm
  streak: number;
  bestStreak: number;
  completions: HabitCompletion[];
  createdAt: string;
  projectId: string | null;             // optional project membership
  linkedGoalId: string | null;          // kept for single-link compat
  contributionValue: number | null;     // kept for single-link compat
  goalLinks: GoalLink[];                // multi-goal links (source of truth)
}

// ─── Project ─────────────────────────────────────
export type ProjectStatus = 'active' | 'paused' | 'archived';

export interface Project {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
  status: ProjectStatus;
  linkedGoalId: string | null;  // optional — project work drives a goal
  createdAt: string;
}

// ─── Time Block (Command Centre) ─────────────────
export interface TimeBlock {
  id: string;
  date: string;             // YYYY-MM-DD
  startTime: string;        // HH:mm
  endTime: string;          // HH:mm
  duration: number | null;  // minutes
  title: string;
  linkedTaskId: string | null;
  linkedHabitId: string | null;
  categoryId: string | null; // legacy
  projectId: string | null;  // replaces categoryId
  completed: boolean;
  carriedForward: boolean;  // rolled over from a previous day
  skipped: boolean;
}

// ─── Command Bar — Parser Output ─────────────────
export type CommandType = 'task' | 'habit' | 'goal';
export type ParsedPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ParsedRecurrence = 'daily' | 'weekdays' | 'weekend' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface ParsedToken {
  type: 'date' | 'time' | 'duration' | 'priority' | 'goal' | 'tag' | 'recurrence' | 'project';
  raw: string;       // original text matched
  value: unknown;    // resolved value
  dismissed: boolean;
}

export interface ParsedCommand {
  type: CommandType;
  title: string;
  date: string | null;          // YYYY-MM-DD
  time: string | null;          // HH:mm
  duration: number | null;      // minutes
  priority: TaskPriority | null;
  goalId: string | null;
  projectId: string | null;     // matched project id
  tagIds: string[];
  recurrence: ParsedRecurrence | null;  // for habits
  tokens: ParsedToken[];        // all recognised tokens (for chip UI)
  raw: string;                  // original full input
}

// ─── App Preferences ─────────────────────────────
export interface DashboardSection {
  id: string;
  visible: boolean;
  order: number;
}

export interface UserPreferences {
  userName: string;
  pinnedGoalId: string | null;
  dashboardSections: DashboardSection[];
}

// ─── App State ───────────────────────────────────
export interface AppState {
  tasks: Task[];
  goals: Goal[];
  habits: Habit[];
  categories: { id: string; name: string; color: string; icon: string }[]; // legacy — kept for migration
  tags: { id: string; name: string; color: string }[];                      // legacy — kept for migration
  projects: Project[];
  timeBlocks: TimeBlock[];
  preferences?: UserPreferences;
}

// ─── Action Types ────────────────────────────────
export type AppAction =
  // Preferences
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<UserPreferences> }
  // Tasks
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Task }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'TOGGLE_TASK'; payload: string }
  | { type: 'TOGGLE_SUBTASK'; payload: { taskId: string; subtaskId: string } }
  // Goals
  | { type: 'ADD_GOAL'; payload: Goal }
  | { type: 'UPDATE_GOAL'; payload: Goal }
  | { type: 'DELETE_GOAL'; payload: string }
  | { type: 'LOG_PROGRESS'; payload: { goalId: string; entry: ProgressEntry } }
  | { type: 'LOG_PROGRESS_CORRECTION'; payload: { goalId: string; delta: number; note: string } }
  // Habits
  | { type: 'ADD_HABIT'; payload: Habit }
  | { type: 'UPDATE_HABIT'; payload: Habit }
  | { type: 'DELETE_HABIT'; payload: string }
  | { type: 'TOGGLE_HABIT_TODAY'; payload: { habitId: string; date: string } }
  | { type: 'RATE_HABIT_ENERGY'; payload: { habitId: string; date: string; rating: EnergyRating } }
  // Projects
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: Project }
  | { type: 'DELETE_PROJECT'; payload: string }
  // Legacy category actions (no-op in new reducer, kept so old dispatches don't crash)
  | { type: 'ADD_CATEGORY'; payload: { id: string; name: string; color: string; icon: string } }
  | { type: 'UPDATE_CATEGORY'; payload: { id: string; name: string; color: string; icon: string } }
  | { type: 'DELETE_CATEGORY'; payload: string }
  // Legacy tag actions
  | { type: 'ADD_TAG'; payload: { id: string; name: string; color: string } }
  | { type: 'DELETE_TAG'; payload: string }
  // Time Blocks
  | { type: 'ADD_TIMEBLOCK'; payload: TimeBlock }
  | { type: 'UPDATE_TIMEBLOCK'; payload: TimeBlock }
  | { type: 'DELETE_TIMEBLOCK'; payload: string }
  | { type: 'TOGGLE_TIMEBLOCK'; payload: string }
  | { type: 'CARRYFORWARD_BLOCKS'; payload: { fromDate: string; toDate: string } }
  // Bulk
  | { type: 'LOAD_STATE'; payload: AppState };
