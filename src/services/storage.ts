/* ═══════════════════════════════════════════════════════════
   STORAGE SERVICE — localStorage persistence + migration
   ═══════════════════════════════════════════════════════════ */

import type { AppState, Goal, Habit, Task, Project } from '../types';

const STORAGE_KEY = 'life-planner-state';

const DEFAULT_PROJECTS: Project[] = [
    { id: 'proj-saas',      name: 'Launch SaaS App',   color: '#60a5fa', icon: '🚀', description: 'Building the next big thing', status: 'active', linkedGoalId: null, createdAt: new Date().toISOString() },
    { id: 'proj-web-launch', name: 'Launch New Website', color: '#3b82f6', icon: 'globe', description: 'Design, develop, and deploy the new portfolio site.', status: 'active', linkedGoalId: null, createdAt: new Date().toISOString() },
    { id: 'proj-biz-build', name: 'Scale My Business', color: '#f59e0b', icon: 'briefcase', description: 'Strategies for growth and customer acquisition.', status: 'active', linkedGoalId: null, createdAt: new Date().toISOString() },
    { id: 'proj-college', name: 'College Semester', color: '#a78bfa', icon: 'star', description: 'Manage assignments, exams, and lecture notes.', status: 'active', linkedGoalId: null, createdAt: new Date().toISOString() },
    { id: 'proj-venture',   name: 'Venture Capital',   color: '#22d3ee', icon: '⚖️', description: 'Strategic growth & investments', status: 'active', linkedGoalId: null, createdAt: new Date().toISOString() },
    { id: 'proj-mindset',   name: 'Peak Mindset',      color: '#f472b6', icon: '🧠', description: 'Psychology of high performance', status: 'active', linkedGoalId: null, createdAt: new Date().toISOString() },
];

const DEFAULT_STATE: AppState = {
    tasks: [],
    goals: [],
    habits: [],
    categories: [],
    tags: [],
    projects: DEFAULT_PROJECTS,
    timeBlocks: [],
    preferences: {
        userName: 'User',
        pinnedGoalId: null,
        dashboardSections: [],
    },
};

// ─── Migration: patch old data shapes to new types ───
function migrateState(raw: Record<string, unknown>): AppState {
    // Spread raw over defaults, but guard against null/non-array values for array fields
    const base: Record<string, unknown> = {
        ...DEFAULT_STATE,
        ...raw,
        // Always ensure these are arrays even if raw has null/undefined
        tasks:      Array.isArray(raw.tasks)      ? raw.tasks      : [],
        goals:      Array.isArray(raw.goals)      ? raw.goals      : [],
        habits:     Array.isArray(raw.habits)     ? raw.habits     : [],
        categories: Array.isArray(raw.categories) ? raw.categories : [],
        tags:       Array.isArray(raw.tags)       ? raw.tags       : [],
        projects:   Array.isArray(raw.projects)   ? raw.projects   : [],
        timeBlocks: Array.isArray(raw.timeBlocks) ? raw.timeBlocks : [],
        preferences: {
            ...DEFAULT_STATE.preferences,
            ...(raw.preferences as Record<string, unknown> || {}),
        },
    };

    // Goals: ensure `why` and `goalType` fields exist; migrate old types
    base.goals = ((raw.goals as Goal[]) || []).map((g: Goal) => {
        // Normalise to the 2-type system: anything that isn't 'measurable' → 'outcome'
        const rawType = g.goalType as string;
        const goalType = rawType === 'measurable' ? 'measurable' : 'outcome';
        return {
            ...g,
            why: g.why ?? '',
            goalType,
        };
    });

    // Habits: ensure new fields exist
    base.habits = ((raw.habits as Habit[]) || []).map((h: Habit) => ({
        ...h,
        projectId: h.projectId ?? null,
        linkedGoalId: h.linkedGoalId ?? null,
        contributionValue: h.contributionValue ?? null,
        goalLinks: h.goalLinks ?? (
            h.linkedGoalId && h.contributionValue
                ? [{ goalId: h.linkedGoalId, contributionValue: h.contributionValue }]
                : []
        ),
    }));

    // Tasks: migrate deprecated goalId / progressValue / categoryId → new fields
    base.tasks = (base.tasks as (Task & { goalId?: string; progressValue?: number })[]).map((t) => {
        const legacy = t as unknown as Record<string, unknown>;
        return {
            ...t,
            duration: t.duration ?? null,
            projectId: t.projectId ?? (t.categoryId ? t.categoryId.replace('cat-', 'proj-') : null),
            tags: Array.isArray(t.tags)
                ? t.tags.map((tag: unknown) => typeof tag === 'string' ? tag : '')
                : [],
            linkedGoalId: t.linkedGoalId ?? legacy.goalId as string ?? null,
            contributionValue: t.contributionValue ?? legacy.progressValue as number ?? null,
            goalLinks: t.goalLinks ?? (
                (t.linkedGoalId ?? legacy.goalId) && (t.contributionValue ?? legacy.progressValue)
                    ? [{ goalId: (t.linkedGoalId ?? legacy.goalId) as string, contributionValue: (t.contributionValue ?? legacy.progressValue) as number }]
                    : []
            ),
        };
    });

    // Projects: if none exist yet, migrate from old categories
    if (!base.projects || (base.projects as Project[]).length === 0) {
        const oldCats = (raw.categories as { id: string; name: string; color: string; icon: string }[]) || [];
        if (oldCats.length > 0) {
            base.projects = oldCats.map(c => ({
                id: c.id.replace('cat-', 'proj-'),
                name: c.name,
                color: c.color,
                icon: c.icon,
                description: '',
                status: 'active' as const,
                linkedGoalId: null,
                createdAt: new Date().toISOString(),
            }));
        } else {
            base.projects = DEFAULT_PROJECTS;
        }
    }

    // Ensure new top-level arrays exist
    if (!base.timeBlocks) base.timeBlocks = [];
    if (!base.categories) base.categories = [];
    if (!base.tags) base.tags = [];

    return base as unknown as AppState;
}

export function loadState(): AppState {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            return migrateState(JSON.parse(raw));
        }
    } catch (e) {
        console.warn('Failed to load state from localStorage:', e);
    }
    return DEFAULT_STATE;
}

export function saveState(state: AppState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn('Failed to save state to localStorage:', e);
    }
}

export function clearState(): void {
    localStorage.removeItem(STORAGE_KEY);
}
