/* ═══════════════════════════════════════════════════════════
   CUSTOM HOOKS — Feature-specific hooks wrapping context
   ═══════════════════════════════════════════════════════════ */

import { useCallback, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { useAppContext } from '../contexts/AppContext';
import type {
    Task, Subtask, Goal, ProgressEntry, Habit, Project, ProjectStatus,
    TaskPriority, HabitFrequency, EnergyRating, TimeBlock, DailyIntention,
    GoalLink,
} from '../types';
import { getTodayStr, isHabitDueOnDate, isHabitCompletedOnDate } from '../services/recurrence';

// ─── Tasks ───────────────────────────────────────
export function useTasks() {
    const { state, dispatch } = useAppContext();

    const addTask = useCallback((data: {
        title: string;
        description?: string;
        dueDate?: string | null;
        dueTime?: string | null;
        duration?: number | null;
        priority?: TaskPriority;
        projectId?: string | null;
        categoryId?: string | null; // legacy compat
        tags?: string[];
        subtasks?: Omit<Subtask, 'id'>[];
        linkedGoalId?: string | null;
        contributionValue?: number | null;
        goalLinks?: GoalLink[];
    }) => {
        const task: Task = {
            id: uuid(),
            title: data.title,
            description: data.description || '',
            completed: false,
            createdAt: new Date().toISOString(),
            dueDate: data.dueDate || null,
            dueTime: data.dueTime || null,
            duration: data.duration ?? null,
            priority: data.priority || 'medium',
            categoryId: null,
            projectId: data.projectId ?? data.categoryId ?? null,
            tags: data.tags || [],
            subtasks: (data.subtasks || []).map(s => ({ ...s, id: uuid() })),
            linkedGoalId: data.linkedGoalId || null,
            contributionValue: data.contributionValue || null,
            goalLinks: data.goalLinks || (
                data.linkedGoalId && data.contributionValue
                    ? [{ goalId: data.linkedGoalId, contributionValue: data.contributionValue }]
                    : []
            ),
        };
        dispatch({ type: 'ADD_TASK', payload: task });
        return task;
    }, [dispatch]);

    const updateTask = useCallback((task: Task) => {
        dispatch({ type: 'UPDATE_TASK', payload: task });
    }, [dispatch]);

    const deleteTask = useCallback((id: string) => {
        dispatch({ type: 'DELETE_TASK', payload: id });
    }, [dispatch]);

    const toggleTask = useCallback((id: string) => {
        const task = state.tasks.find(t => t.id === id);
        if (task) {
            const links = task.goalLinks?.length
                ? task.goalLinks
                : (task.linkedGoalId && task.contributionValue
                    ? [{ goalId: task.linkedGoalId, contributionValue: task.contributionValue }]
                    : []);

            for (const link of links) {
                // Skip if no contribution value
                if (!link.contributionValue) continue;
                // Skip if the linked goal is an outcome (aggregator) — it doesn't accept direct contributions
                const linkedGoal = state.goals.find(g => g.id === link.goalId);
                if (!linkedGoal || linkedGoal.goalType === 'outcome') continue;

                const delta = task.completed ? -link.contributionValue : link.contributionValue;
                const entry: ProgressEntry = {
                    id: uuid(),
                    date: new Date().toISOString(),
                    value: delta,
                    note: task.completed
                        ? `Uncompleted task: ${task.title}`
                        : `Completed task: ${task.title}`,
                };
                dispatch({ type: 'LOG_PROGRESS', payload: { goalId: link.goalId, entry } });
            }
        }
        dispatch({ type: 'TOGGLE_TASK', payload: id });
    }, [dispatch, state.tasks, state.goals]);

    const toggleSubtask = useCallback((taskId: string, subtaskId: string) => {
        dispatch({ type: 'TOGGLE_SUBTASK', payload: { taskId, subtaskId } });
    }, [dispatch]);

    const getTodaysTasks = useCallback(() => {
        const today = getTodayStr();
        return state.tasks.filter(t => t.dueDate === today && !t.completed);
    }, [state.tasks]);

    return { tasks: state.tasks, addTask, updateTask, deleteTask, toggleTask, toggleSubtask, getTodaysTasks };
}

// ─── Goals ───────────────────────────────────────
export function useGoals() {
    const { state, dispatch } = useAppContext();

    const addGoal = useCallback((data: {
        title: string;
        description?: string;
        why?: string;
        goalType?: import('../types').GoalType;
        targetValue: number | null;
        unit: string | null;
        color?: string;
        icon?: string;
        parentGoalId?: string | null;
    }) => {
        const goal: Goal = {
            id: uuid(),
            title: data.title,
            description: data.description || '',
            why: data.why || '',
            goalType: data.goalType || (data.targetValue !== null ? 'measurable' : 'milestone'),
            targetValue: data.targetValue,
            currentValue: 0,
            unit: data.unit,
            color: data.color || '#f59e0b',
            icon: data.icon || '🎯',
            createdAt: new Date().toISOString(),
            entries: [],
            parentGoalId: data.parentGoalId || null,
        };
        dispatch({ type: 'ADD_GOAL', payload: goal });
        return goal;
    }, [dispatch]);

    const updateGoal = useCallback((goal: Goal) => {
        dispatch({ type: 'UPDATE_GOAL', payload: goal });
    }, [dispatch]);

    const deleteGoal = useCallback((id: string) => {
        dispatch({ type: 'DELETE_GOAL', payload: id });
    }, [dispatch]);

    const logProgress = useCallback((goalId: string, value: number, note?: string) => {
        const entry: ProgressEntry = {
            id: uuid(),
            date: new Date().toISOString(),
            value,
            note: note || '',
        };
        dispatch({ type: 'LOG_PROGRESS', payload: { goalId, entry } });
    }, [dispatch]);

    const getParentGoals = useCallback(() => {
        return state.goals.filter(g => !g.parentGoalId);
    }, [state.goals]);

    const getSubGoals = useCallback((parentId: string) => {
        return state.goals.filter(g => g.parentGoalId === parentId);
    }, [state.goals]);

    // Precalculate task statistics keyed by goal ID to avoid O(N*M) filtering
    const { state: appState } = useAppContext();
    const taskStatsByGoal = useMemo(() => {
        const stats = new Map<string, { total: number, completed: number }>();
        for (const task of appState.tasks) {
            const goalIds = new Set<string>();
            if (task.linkedGoalId) goalIds.add(task.linkedGoalId);
            if (task.goalLinks) {
                for (const link of task.goalLinks) {
                    goalIds.add(link.goalId);
                }
            }
            for (const gId of goalIds) {
                let stat = stats.get(gId);
                if (!stat) {
                    stat = { total: 0, completed: 0 };
                    stats.set(gId, stat);
                }
                stat.total++;
                if (task.completed) stat.completed++;
            }
        }
        return stats;
    }, [appState.tasks]);

    const getAggregateProgress = useCallback((goalId: string): {
        current: number; target: number; percent: number; isUmbrella: boolean;
    } => {
        const children = state.goals.filter(g => g.parentGoalId === goalId);
        const goal = state.goals.find(g => g.id === goalId);
        if (!goal) return { current: 0, target: 0, percent: 0, isUmbrella: false };

        if (children.length === 0) {
            if (goal.goalType === 'continuous' || goal.targetValue === null) {
                return { current: 0, target: 0, percent: 0, isUmbrella: true };
            }
            if (goal.goalType === 'milestone') {
                 // Derived from tasks
                 const stat = taskStatsByGoal.get(goalId);
                 if (!stat || stat.total === 0) return { current: 0, target: 0, percent: 0, isUmbrella: true };
                 const percent = (stat.completed / stat.total) * 100;
                 return { current: stat.completed, target: stat.total, percent, isUmbrella: false };
            }
            // Measurable
            const percent = goal.targetValue > 0
                ? Math.min((goal.currentValue / goal.targetValue) * 100, 100)
                : 0;
            return { current: goal.currentValue, target: goal.targetValue, percent, isUmbrella: false };
        }

        // Has sub-goals: average them
        let totalPercent = 0;
        let validChildrenCount = 0;

        for (const child of children) {
             if (child.goalType === 'continuous') continue;

             if (child.goalType === 'measurable' && child.targetValue && child.targetValue > 0) {
                 totalPercent += Math.min((child.currentValue / child.targetValue) * 100, 100);
                 validChildrenCount++;
             } else if (child.goalType === 'milestone') {
                 const stat = taskStatsByGoal.get(child.id);
                 if (stat && stat.total > 0) {
                     totalPercent += (stat.completed / stat.total) * 100;
                     validChildrenCount++;
                 }
             }
        }

        if (validChildrenCount === 0) {
            return { current: 0, target: 100, percent: 0, isUmbrella: true };
        }

        const avgPercent = totalPercent / validChildrenCount;
        return { current: Math.round(avgPercent), target: 100, percent: avgPercent, isUmbrella: true };
    }, [state.goals, taskStatsByGoal]);

    const getDaysSinceProgress = useCallback((goalId: string): number => {
        const goal = state.goals.find(g => g.id === goalId);
        if (!goal || !goal.entries.length) return Infinity;
        const lastDate = goal.entries.map(e => e.date).sort().at(-1)!;
        const diff = Date.now() - new Date(lastDate).getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    }, [state.goals]);

    const correctProgress = useCallback((goalId: string, delta: number, note: string) => {
        dispatch({ type: 'LOG_PROGRESS_CORRECTION', payload: { goalId, delta, note } });
    }, [dispatch]);

    return {
        goals: state.goals,
        addGoal, updateGoal, deleteGoal, logProgress, correctProgress,
        getParentGoals, getSubGoals, getAggregateProgress, getDaysSinceProgress,
    };
}

// ─── Habits ──────────────────────────────────────
export function useHabits() {
    const { state, dispatch } = useAppContext();

    const addHabit = useCallback((data: {
        title: string;
        description?: string;
        icon?: string;
        color?: string;
        frequency: HabitFrequency;
        specificDays?: number[];
        everyNDays?: number;
        timesPerWeek?: number;
        timeOfDay?: string | null;
        projectId?: string | null;
        linkedGoalId?: string | null;
        contributionValue?: number | null;
        goalLinks?: GoalLink[];
    }) => {
        const habit: Habit = {
            id: uuid(),
            title: data.title,
            description: data.description || '',
            icon: data.icon || '✨',
            color: data.color || '#f59e0b',
            frequency: data.frequency,
            specificDays: data.specificDays || [],
            everyNDays: data.everyNDays || 1,
            timesPerWeek: data.timesPerWeek || 1,
            timeOfDay: data.timeOfDay || null,
            streak: 0,
            bestStreak: 0,
            completions: [],
            createdAt: new Date().toISOString(),
            projectId: data.projectId ?? null,
            linkedGoalId: data.linkedGoalId || null,
            contributionValue: data.contributionValue || null,
            goalLinks: data.goalLinks || (
                data.linkedGoalId && data.contributionValue
                    ? [{ goalId: data.linkedGoalId, contributionValue: data.contributionValue }]
                    : []
            ),
        };
        dispatch({ type: 'ADD_HABIT', payload: habit });
        return habit;
    }, [dispatch]);

    const updateHabit = useCallback((habit: Habit) => {
        dispatch({ type: 'UPDATE_HABIT', payload: habit });
    }, [dispatch]);

    const deleteHabit = useCallback((id: string) => {
        dispatch({ type: 'DELETE_HABIT', payload: id });
    }, [dispatch]);

    const toggleHabit = useCallback((habitId: string, date: string = getTodayStr()) => {
        const habit = state.habits.find(h => h.id === habitId);

        if (habit) {
            const existing = habit.completions.find(c => c.date === date);
            const isCompleting = !existing || !existing.completed;

            const links = habit.goalLinks?.length
                ? habit.goalLinks
                : (habit.linkedGoalId && habit.contributionValue
                    ? [{ goalId: habit.linkedGoalId, contributionValue: habit.contributionValue }]
                    : []);

            for (const link of links) {
                // Skip if no fixed contribution value — habit is display-linked only
                if (!link.contributionValue) continue;
                // Skip if goal is outcome type — outcome goals are aggregators, not recipients
                const linkedGoal = state.goals.find(g => g.id === link.goalId);
                if (!linkedGoal || linkedGoal.goalType === 'outcome') continue;

                const delta = isCompleting ? link.contributionValue : -link.contributionValue;
                const entry: ProgressEntry = {
                    id: uuid(),
                    date: new Date().toISOString(),
                    value: delta,
                    note: isCompleting
                        ? `Completed habit: ${habit.title}`
                        : `Uncompleted habit: ${habit.title}`,
                };
                dispatch({ type: 'LOG_PROGRESS', payload: { goalId: link.goalId, entry } });
            }
        }

        dispatch({ type: 'TOGGLE_HABIT_TODAY', payload: { habitId, date } });
    }, [dispatch, state.habits, state.goals]);

    const rateHabitEnergy = useCallback((habitId: string, rating: EnergyRating, date: string = getTodayStr()) => {
        dispatch({ type: 'RATE_HABIT_ENERGY', payload: { habitId, date, rating } });
    }, [dispatch]);

    const getTodaysHabits = useCallback((date: Date = new Date()) => {
        return state.habits.filter(h => isHabitDueOnDate(h, date));
    }, [state.habits]);

    const isCompletedOnDate = useCallback((habitId: string, date: string = getTodayStr()) => {
        const habit = state.habits.find(h => h.id === habitId);
        if (!habit) return false;
        return isHabitCompletedOnDate(habit, date);
    }, [state.habits]);

    const getEnergyRatingOnDate = useCallback((habitId: string, date: string = getTodayStr()): EnergyRating | undefined => {
        const habit = state.habits.find(h => h.id === habitId);
        if (!habit) return undefined;
        return habit.completions.find(c => c.date === date)?.energyRating;
    }, [state.habits]);

    const getAvgEnergy = useCallback((habitId: string, lastN = 7): number | null => {
        const habit = state.habits.find(h => h.id === habitId);
        if (!habit) return null;
        const rated = habit.completions
            .filter(c => c.completed && c.energyRating != null)
            .slice(-lastN);
        if (!rated.length) return null;
        return rated.reduce((sum, c) => sum + (c.energyRating ?? 0), 0) / rated.length;
    }, [state.habits]);

    return {
        habits: state.habits,
        addHabit, updateHabit, deleteHabit,
        toggleHabit, toggleHabitToday: toggleHabit, rateHabitEnergy,
        getTodaysHabits, isCompletedOnDate,
        getEnergyRatingOnDate, getAvgEnergy,
    };
}

// ─── Projects ────────────────────────────────────
export function useProjects() {
    const { state, dispatch } = useAppContext();

    const addProject = useCallback((data: {
        name: string;
        color: string;
        icon: string;
        description?: string;
        status?: ProjectStatus;
        linkedGoalId?: string | null;
    }) => {
        const project: Project = {
            id: uuid(),
            name: data.name,
            color: data.color,
            icon: data.icon,
            description: data.description || '',
            status: data.status || 'active',
            linkedGoalId: data.linkedGoalId ?? null,
            createdAt: new Date().toISOString(),
        };
        dispatch({ type: 'ADD_PROJECT', payload: project });
        return project;
    }, [dispatch]);

    const updateProject = useCallback((project: Project) => {
        dispatch({ type: 'UPDATE_PROJECT', payload: project });
    }, [dispatch]);

    const deleteProject = useCallback((id: string) => {
        dispatch({ type: 'DELETE_PROJECT', payload: id });
    }, [dispatch]);

    return {
        projects: state.projects || [],
        addProject,
        updateProject,
        deleteProject,
    };
}

// ─── Time Blocks ─────────────────────────────────
export function useTimeBlocks(date?: string) {
    const { state, dispatch } = useAppContext();
    const blocks = state.timeBlocks || [];
    const filtered = date ? blocks.filter(b => b.date === date) : blocks;

    const addBlock = useCallback((data: Omit<TimeBlock, 'id' | 'completed' | 'carriedForward' | 'skipped'>) => {
        const block: TimeBlock = {
            ...data,
            id: uuid(),
            completed: false,
            carriedForward: false,
            skipped: false,
        };
        dispatch({ type: 'ADD_TIMEBLOCK', payload: block });
        return block;
    }, [dispatch]);

    const updateBlock = useCallback((block: TimeBlock) => {
        dispatch({ type: 'UPDATE_TIMEBLOCK', payload: block });
    }, [dispatch]);

    const deleteBlock = useCallback((id: string) => {
        dispatch({ type: 'DELETE_TIMEBLOCK', payload: id });
    }, [dispatch]);

    const toggleBlock = useCallback((id: string) => {
        dispatch({ type: 'TOGGLE_TIMEBLOCK', payload: id });
    }, [dispatch]);

    const carryForward = useCallback((fromDate: string, toDate: string) => {
        dispatch({ type: 'CARRYFORWARD_BLOCKS', payload: { fromDate, toDate } });
    }, [dispatch]);

    return { blocks: filtered, allBlocks: blocks, addBlock, updateBlock, deleteBlock, toggleBlock, carryForward };
}

// ─── Intentions ──────────────────────────────────
export function useIntentions() {
    const { state, dispatch } = useAppContext();

    const setIntention = useCallback((date: string, text: string) => {
        const intention: DailyIntention = { date, text };
        dispatch({ type: 'SET_INTENTION', payload: intention });
    }, [dispatch]);

    const getIntention = useCallback((date: string): string => {
        return (state.intentions || []).find(i => i.date === date)?.text || '';
    }, [state.intentions]);

    return { setIntention, getIntention };
}
