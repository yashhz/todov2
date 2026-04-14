/* ═══════════════════════════════════════════════════════════
   APP CONTEXT — Global state management with reducer
   ═══════════════════════════════════════════════════════════ */

import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import { v4 as uuid } from 'uuid';
import type { AppState, AppAction, UserPreferences } from '../types';
import { loadState, saveState } from '../services/storage';
import { calculateStreak } from '../services/recurrence';

// ─── Reducer ─────────────────────────────────────
function appReducer(state: AppState, action: AppAction): AppState {
    switch (action.type) {
        // ── Preferences ───────────────────────────────
        case 'UPDATE_PREFERENCES': {
            const currentPrefs = state.preferences || { userName: 'User', pinnedGoalId: null, dashboardSections: [] };
            return {
                ...state,
                preferences: {
                    ...currentPrefs,
                    ...action.payload,
                } as UserPreferences,
            };
        }

        // ── Tasks ──────────────────────────────────────
        case 'ADD_TASK':
            return { ...state, tasks: [...state.tasks, action.payload] };
        case 'UPDATE_TASK':
            return { ...state, tasks: state.tasks.map(t => t.id === action.payload.id ? action.payload : t) };
        case 'DELETE_TASK':
            return { ...state, tasks: state.tasks.filter(t => t.id !== action.payload) };
        case 'TOGGLE_TASK':
            return {
                ...state,
                tasks: state.tasks.map(t =>
                    t.id === action.payload ? { ...t, completed: !t.completed } : t
                ),
            };
        case 'TOGGLE_SUBTASK':
            return {
                ...state,
                tasks: state.tasks.map(t =>
                    t.id === action.payload.taskId
                        ? {
                            ...t,
                            subtasks: t.subtasks.map(s =>
                                s.id === action.payload.subtaskId
                                    ? { ...s, completed: !s.completed }
                                    : s
                            ),
                        }
                        : t
                ),
            };

        // ── Goals ──────────────────────────────────────
        case 'ADD_GOAL':
            return { ...state, goals: [...state.goals, action.payload] };
        case 'UPDATE_GOAL':
            return { ...state, goals: state.goals.map(g => g.id === action.payload.id ? action.payload : g) };
        case 'DELETE_GOAL': {
            const deletedGoalId = action.payload;
            return {
                ...state,
                goals: state.goals.filter(g => g.id !== deletedGoalId),
                // Remove stale goalId references from every task
                tasks: state.tasks.map(t => ({
                    ...t,
                    linkedGoalId: t.linkedGoalId === deletedGoalId ? null : t.linkedGoalId,
                    contributionValue: t.linkedGoalId === deletedGoalId ? null : t.contributionValue,
                    goalLinks: t.goalLinks.filter(l => l.goalId !== deletedGoalId),
                })),
                // Remove stale goalId references from every habit
                habits: state.habits.map(h => ({
                    ...h,
                    linkedGoalId: h.linkedGoalId === deletedGoalId ? null : h.linkedGoalId,
                    contributionValue: h.linkedGoalId === deletedGoalId ? null : h.contributionValue,
                    goalLinks: h.goalLinks.filter(l => l.goalId !== deletedGoalId),
                })),
            };
        }
        case 'LOG_PROGRESS': {
            const targetGoal = state.goals.find(g => g.id === action.payload.goalId);
            // Block contributions to milestone/continuous goals — they derive progress from children/tasks/habits
            if (!targetGoal || targetGoal.goalType !== 'measurable') return state;
            return {
                ...state,
                goals: state.goals.map(g =>
                    g.id === action.payload.goalId
                        ? {
                            ...g,
                            currentValue: Math.max(0, g.currentValue + action.payload.entry.value),
                            entries: [...g.entries, action.payload.entry],
                        }
                        : g
                ),
            };
        }

        case 'LOG_PROGRESS_CORRECTION': {
            const { goalId, delta, note } = action.payload;
            const correctionTarget = state.goals.find(g => g.id === goalId);
            // Block corrections to milestone/continuous goals
            if (!correctionTarget || correctionTarget.goalType !== 'measurable') return state;
            const correctionEntry = {
                id: uuid(),
                date: new Date().toISOString(),
                value: delta,
                note: note || 'Manual correction',
            };
            return {
                ...state,
                goals: state.goals.map(g =>
                    g.id === goalId
                        ? {
                            ...g,
                            currentValue: Math.max(0, g.currentValue + delta),
                            entries: [...g.entries, correctionEntry],
                        }
                        : g
                ),
            };
        }

        // ── Habits ─────────────────────────────────────
        case 'ADD_HABIT':
            return { ...state, habits: [...state.habits, action.payload] };
        case 'UPDATE_HABIT':
            return { ...state, habits: state.habits.map(h => h.id === action.payload.id ? action.payload : h) };
        case 'DELETE_HABIT':
            return { ...state, habits: state.habits.filter(h => h.id !== action.payload) };

        case 'TOGGLE_HABIT_TODAY': {
            const { habitId, date } = action.payload;
            return {
                ...state,
                habits: state.habits.map(h => {
                    if (h.id !== habitId) return h;
                    const existing = h.completions.find(c => c.date === date);
                    let newCompletions;
                    if (existing) {
                        const isUnchecking = existing.completed;
                        newCompletions = h.completions.map(c =>
                            c.date === date
                                ? {
                                    ...c,
                                    completed: !c.completed,
                                    // Clear energyRating on uncheck so prompt appears fresh on re-check
                                    energyRating: isUnchecking ? undefined : c.energyRating,
                                  }
                                : c
                        );
                    } else {
                        newCompletions = [...h.completions, { date, completed: true }];
                    }
                    const updated = { ...h, completions: newCompletions };
                    const newStreak = calculateStreak(updated);
                    return {
                        ...updated,
                        streak: newStreak,
                        bestStreak: Math.max(updated.bestStreak, newStreak),
                    };
                }),
            };
        }

        case 'RATE_HABIT_ENERGY': {
            const { habitId, date, rating } = action.payload;
            return {
                ...state,
                habits: state.habits.map(h => {
                    if (h.id !== habitId) return h;
                    const existing = h.completions.find(c => c.date === date);
                    if (!existing) return h;
                    return {
                        ...h,
                        completions: h.completions.map(c =>
                            c.date === date ? { ...c, energyRating: rating } : c
                        ),
                    };
                }),
            };
        }

        // ── Projects ───────────────────────────────────
        case 'ADD_PROJECT':
            return { ...state, projects: [...(state.projects || []), action.payload] };
        case 'UPDATE_PROJECT':
            return { ...state, projects: (state.projects || []).map(p => p.id === action.payload.id ? action.payload : p) };
        case 'DELETE_PROJECT': {
            const id = action.payload;
            return {
                ...state,
                projects: (state.projects || []).filter(p => p.id !== id),
                // Cascade null — orphaned tasks/habits keep their data, just lose project link
                tasks: state.tasks.map(t => t.projectId === id ? { ...t, projectId: null } : t),
                habits: state.habits.map(h => h.projectId === id ? { ...h, projectId: null } : h),
            };
        }

        // ── Legacy category/tag actions (no-op — data kept for compat) ──
        case 'ADD_CATEGORY':
        case 'UPDATE_CATEGORY':
        case 'DELETE_CATEGORY':
        case 'ADD_TAG':
        case 'DELETE_TAG':
            return state;

        // ── Time Blocks ────────────────────────────────
        case 'ADD_TIMEBLOCK':
            return { ...state, timeBlocks: [...(state.timeBlocks || []), action.payload] };
        case 'UPDATE_TIMEBLOCK':
            return { ...state, timeBlocks: (state.timeBlocks || []).map(b => b.id === action.payload.id ? action.payload : b) };
        case 'DELETE_TIMEBLOCK':
            return { ...state, timeBlocks: (state.timeBlocks || []).filter(b => b.id !== action.payload) };
        case 'TOGGLE_TIMEBLOCK':
            return {
                ...state,
                timeBlocks: (state.timeBlocks || []).map(b =>
                    b.id === action.payload ? { ...b, completed: !b.completed } : b
                ),
            };
        case 'CARRYFORWARD_BLOCKS': {
            const { fromDate, toDate } = action.payload;
            const incomplete = (state.timeBlocks || []).filter(
                b => b.date === fromDate && !b.completed && !b.skipped
            );
            const carried = incomplete.map(b => ({
                ...b,
                id: `${b.id}-cf`,
                date: toDate,
                carriedForward: true,
                completed: false,
            }));
            return { ...state, timeBlocks: [...(state.timeBlocks || []), ...carried] };
        }

        // ── Intentions ─────────────────────────────────
        case 'SET_INTENTION': {
            const existing = (state.intentions || []).find(i => i.date === action.payload.date);
            if (existing) {
                return {
                    ...state,
                    intentions: (state.intentions || []).map(i =>
                        i.date === action.payload.date ? action.payload : i
                    ),
                };
            }
            return { ...state, intentions: [...(state.intentions || []), action.payload] };
        }

        // ── Bulk ───────────────────────────────────────
        case 'LOAD_STATE':
            return action.payload;

        default:
            return state;
    }
}


// ─── Context ─────────────────────────────────────
interface AppContextValue {
    state: AppState;
    dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Provider ────────────────────────────────────
export function AppProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(appReducer, undefined, loadState);

    useEffect(() => {
        saveState(state);
    }, [state]);

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
}

// ─── Hook ────────────────────────────────────────
export function useAppContext(): AppContextValue {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useAppContext must be used within AppProvider');
    return ctx;
}
