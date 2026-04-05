/* ═══════════════════════════════════════════════════════════
   PRESSURE SCORE — Computed urgency for tasks
   Never stored. Recalculated on every render.

   Score 0–100:
     0–25  = low pressure (chill, plenty of time)
     26–50 = medium pressure (on the radar)
     51–75 = high pressure (needs attention soon)
     76+   = critical (overdue or goal stalling badly)
   ═══════════════════════════════════════════════════════════ */

import type { Task, Goal } from '../types';

function diffDays(from: string | Date, to: string | Date): number {
    const a = new Date(from);
    const b = new Date(to);
    a.setHours(0, 0, 0, 0);
    b.setHours(0, 0, 0, 0);
    return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function getLastEntryDate(goal: Goal): string | null {
    if (!goal.entries.length) return null;
    return goal.entries
        .map(e => e.date)
        .sort()
        .at(-1) ?? null;
}

export function calcPressureScore(task: Task, goals: Goal[], today = new Date()): number {
    if (task.completed) return 0;

    const todayStr = today.toISOString().split('T')[0];
    let score = 0;

    // ── 1. Deadline proximity (0–50 pts) ──────────────
    if (task.dueDate) {
        const daysLeft = diffDays(todayStr, task.dueDate);
        if (daysLeft < 0)       score += 50; // overdue
        else if (daysLeft === 0) score += 45; // due today
        else if (daysLeft <= 1)  score += 38;
        else if (daysLeft <= 3)  score += 25;
        else if (daysLeft <= 7)  score += 12;
        else if (daysLeft <= 14) score += 5;
    }

    // ── 2. Linked goal stalling (0–30 pts) ────────────
    const primaryGoalId = task.goalLinks?.length
        ? task.goalLinks[0].goalId
        : task.linkedGoalId;

    if (primaryGoalId) {
        const goal = goals.find(g => g.id === primaryGoalId);
        if (goal) {
            const lastEntry = getLastEntryDate(goal);
            const stalledDays = lastEntry
                ? diffDays(lastEntry, todayStr)
                : diffDays(goal.createdAt, todayStr);
            // 3 pts per stalled day, cap at 30
            score += Math.min(Math.max(stalledDays, 0) * 3, 30);
        }
    }

    // ── 3. Task age — sitting untouched (0–20 pts) ────
    const taskAge = diffDays(task.createdAt, todayStr);
    score += Math.min(Math.max(taskAge, 0), 20);

    return Math.min(score, 100);
}

export type PressureLevel = 'critical' | 'high' | 'medium' | 'low';

export function getPressureLevel(score: number): PressureLevel {
    if (score >= 76) return 'critical';
    if (score >= 51) return 'high';
    if (score >= 26) return 'medium';
    return 'low';
}

export function getPressureLabel(score: number): string {
    const level = getPressureLevel(score);
    if (level === 'critical') return 'Overdue';
    if (level === 'high')     return 'Urgent';
    if (level === 'medium')   return 'Soon';
    return '';
}

/** Sort tasks by pressure score descending, completed tasks always last */
export function sortByPressure(tasks: Task[], goals: Goal[]): Task[] {
    return [...tasks].sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return calcPressureScore(b, goals) - calcPressureScore(a, goals);
    });
}
