/* ═══════════════════════════════════════════════════════════
   RECURRENCE ENGINE — Habit scheduling logic
   ═══════════════════════════════════════════════════════════ */

import type { Habit } from '../types';

/**
 * Check if a habit is due on a given date
 */
export function isHabitDueOnDate(habit: Habit, date: Date): boolean {
    const dayOfWeek = date.getDay(); // 0=Sun..6=Sat

    switch (habit.frequency) {
        case 'daily':
            return true;

        case 'specific_days':
            return habit.specificDays.includes(dayOfWeek);

        case 'every_n_days': {
            const created = new Date(habit.createdAt);
            created.setHours(0, 0, 0, 0); // strip time so day diff is accurate
            const diffMs = date.getTime() - created.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            return diffDays >= 0 && diffDays % habit.everyNDays === 0;
        }

        case 'times_per_week': {
            // Available until the weekly target is reached
            const weekCount = getWeeklyCompletionCount(habit, date);
            return weekCount < habit.timesPerWeek;
        }

        default:
            return false;
    }
}

/**
 * Check if a habit has been completed on a given date
 */
export function isHabitCompletedOnDate(habit: Habit, dateStr: string): boolean {
    return habit.completions.some(c => c.date === dateStr && c.completed);
}

/**
 * Calculate how many times a habit has been completed this week
 */
function getWeeklyCompletionCount(habit: Habit, referenceDate: Date): number {
    const startOfWeek = getStartOfWeek(referenceDate);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    return habit.completions.filter(c => {
        const d = new Date(c.date);
        return c.completed && d >= startOfWeek && d < endOfWeek;
    }).length;
}

/**
 * Calculate current streak for a habit
 */
export function calculateStreak(habit: Habit): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    const current = new Date(today);

    for (let i = 0; i < 365; i++) {
        const dateStr = formatDateStr(current);

        if (isHabitDueOnDate(habit, current)) {
            if (isHabitCompletedOnDate(habit, dateStr)) {
                streak++;
            } else {
                // Today not yet completed is fine — skip it and keep going back
                // Any prior due day that's missed breaks the streak
                if (i > 0) break;
            }
        }

        current.setDate(current.getDate() - 1);
    }

    return streak;
}

// ─── Helpers ─────────────────────────────────────
function getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

export function formatDateStr(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function getTodayStr(): string {
    return formatDateStr(new Date());
}
