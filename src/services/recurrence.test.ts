import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    isHabitDueOnDate,
    isHabitCompletedOnDate,
    getWeeklyCompletionCount,
    isWeeklyLimitReached,
    calculateStreak,
    formatDateStr,
    getTodayStr
} from './recurrence';
import type { Habit } from '../types';

describe('Recurrence Service', () => {
    // A baseline habit factory to easily generate habits for testing
    const createBaseHabit = (overrides?: Partial<Habit>): Habit => ({
        id: 'habit-1',
        title: 'Test Habit',
        description: '',
        icon: 'test',
        color: '#000',
        frequency: 'daily',
        specificDays: [],
        everyNDays: 1,
        timesPerWeek: 1,
        timeOfDay: null,
        streak: 0,
        bestStreak: 0,
        completions: [],
        createdAt: '2023-01-01T00:00:00Z',
        projectId: null,
        linkedGoalId: null,
        contributionValue: null,
        goalLinks: [],
        ...overrides
    });

    beforeEach(() => {
        // Mock system time to a known point for consistent test runs
        vi.useFakeTimers();
        // Set date to a specific point: 2023-01-10T12:00:00.000Z (Tuesday)
        vi.setSystemTime(new Date('2023-01-10T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('isHabitDueOnDate', () => {
        it('returns true for daily habits regardless of date', () => {
            const habit = createBaseHabit({ frequency: 'daily' });
            expect(isHabitDueOnDate(habit, new Date('2023-01-10T12:00:00Z'))).toBe(true);
            expect(isHabitDueOnDate(habit, new Date('2023-01-11T12:00:00Z'))).toBe(true);
        });

        it('returns true for specific_days when the day matches', () => {
            // specificDays: [1, 3, 5] -> Mon, Wed, Fri
            const habit = createBaseHabit({ frequency: 'specific_days', specificDays: [1, 3, 5] });
            // 2023-01-09 is Monday
            expect(isHabitDueOnDate(habit, new Date('2023-01-09T12:00:00Z'))).toBe(true);
            // 2023-01-11 is Wednesday
            expect(isHabitDueOnDate(habit, new Date('2023-01-11T12:00:00Z'))).toBe(true);
            // 2023-01-10 is Tuesday
            expect(isHabitDueOnDate(habit, new Date('2023-01-10T12:00:00Z'))).toBe(false);
        });

        it('returns true for every_n_days at proper intervals', () => {
            // Created at 2023-01-01. every 3 days.
            const habit = createBaseHabit({
                frequency: 'every_n_days',
                everyNDays: 3,
                createdAt: '2023-01-01T15:00:00Z' // ensure time of creation doesn't affect the calculation
            });

            // 0 days diff (same day) -> 0 % 3 === 0 -> true
            expect(isHabitDueOnDate(habit, new Date('2023-01-01T10:00:00Z'))).toBe(true);
            // 1 day diff
            expect(isHabitDueOnDate(habit, new Date('2023-01-02T10:00:00Z'))).toBe(false);
            // 2 days diff
            expect(isHabitDueOnDate(habit, new Date('2023-01-03T10:00:00Z'))).toBe(false);
            // 3 days diff
            expect(isHabitDueOnDate(habit, new Date('2023-01-04T10:00:00Z'))).toBe(true);
            // 6 days diff
            expect(isHabitDueOnDate(habit, new Date('2023-01-07T10:00:00Z'))).toBe(true);

            // Check before creation date (diffDays < 0)
            expect(isHabitDueOnDate(habit, new Date('2022-12-31T10:00:00Z'))).toBe(false);
        });

        it('handles times_per_week frequency correctly', () => {
            // Due 2 times per week
            const habit = createBaseHabit({
                frequency: 'times_per_week',
                timesPerWeek: 2,
                completions: [
                    { date: '2023-01-09', completed: true }, // Monday
                ]
            });

            // One completion this week, target is 2. So it should still be due.
            expect(isHabitDueOnDate(habit, new Date('2023-01-10T12:00:00Z'))).toBe(true);

            // Let's add a second completion
            const completedHabit = {
                ...habit,
                completions: [
                    { date: '2023-01-09', completed: true }, // Monday
                    { date: '2023-01-10', completed: true }, // Tuesday
                ]
            };

            // Now target is reached, should not be due anymore this week
            expect(isHabitDueOnDate(completedHabit, new Date('2023-01-11T12:00:00Z'))).toBe(false);

            // But it should be due next week
            expect(isHabitDueOnDate(completedHabit, new Date('2023-01-16T12:00:00Z'))).toBe(true);
        });

        it('returns false for unrecognized frequency types', () => {
            const habit = createBaseHabit({ frequency: 'unknown' as Habit['frequency'] });
            expect(isHabitDueOnDate(habit, new Date('2023-01-10T12:00:00Z'))).toBe(false);
        });
    });

    describe('isHabitCompletedOnDate', () => {
        it('returns true if habit has a completed entry for the given date string', () => {
            const habit = createBaseHabit({
                completions: [
                    { date: '2023-01-10', completed: true },
                    { date: '2023-01-11', completed: false }
                ]
            });
            expect(isHabitCompletedOnDate(habit, '2023-01-10')).toBe(true);
        });

        it('returns false if habit does not have a completed entry for the given date string', () => {
            const habit = createBaseHabit({
                completions: [
                    { date: '2023-01-10', completed: true },
                    { date: '2023-01-11', completed: false }
                ]
            });
            expect(isHabitCompletedOnDate(habit, '2023-01-11')).toBe(false);
            expect(isHabitCompletedOnDate(habit, '2023-01-12')).toBe(false);
            expect(isHabitCompletedOnDate(createBaseHabit(), '2023-01-10')).toBe(false);
        });
    });

    describe('getWeeklyCompletionCount & isWeeklyLimitReached', () => {
        it('calculates weekly completions correctly starting on Monday', () => {
            // 2023-01-09 is Monday, 2023-01-15 is Sunday
            const habit = createBaseHabit({
                frequency: 'times_per_week',
                timesPerWeek: 3,
                completions: [
                    { date: '2023-01-08', completed: true }, // Previous Sunday (different week)
                    { date: '2023-01-09', completed: true }, // Monday (this week)
                    { date: '2023-01-11', completed: false }, // Wednesday (not completed)
                    { date: '2023-01-12', completed: true }, // Thursday (this week)
                    { date: '2023-01-16', completed: true }, // Next Monday (different week)
                ]
            });

            // Reference date in the middle of the week
            const refDate = new Date('2023-01-13T12:00:00Z');

            expect(getWeeklyCompletionCount(habit, refDate)).toBe(2);
            expect(isWeeklyLimitReached(habit, refDate)).toBe(false);

            // Add one more completion to reach the limit
            const completedHabit = {
                ...habit,
                completions: [
                    ...habit.completions,
                    { date: '2023-01-15', completed: true } // Sunday (this week)
                ]
            };

            expect(getWeeklyCompletionCount(completedHabit, refDate)).toBe(3);
            expect(isWeeklyLimitReached(completedHabit, refDate)).toBe(true);
        });

        it('isWeeklyLimitReached returns false for non-times_per_week habits', () => {
            const habit = createBaseHabit({
                frequency: 'daily',
                timesPerWeek: 1, // Irrelevant since frequency is daily
                completions: [
                    { date: '2023-01-09', completed: true },
                    { date: '2023-01-10', completed: true },
                ]
            });
            // It has 2 completions this week, but target is irrelevant for daily
            expect(isWeeklyLimitReached(habit, new Date('2023-01-10T12:00:00Z'))).toBe(false);
        });

        it('handles Sunday correctly as end of week', () => {
            // 2023-01-08 is Sunday
            const refDate = new Date('2023-01-08T12:00:00Z');
            // The week should be Monday 2023-01-02 to Sunday 2023-01-08
            const habit = createBaseHabit({
                completions: [
                    { date: '2023-01-01', completed: true }, // Prev Sunday
                    { date: '2023-01-02', completed: true }, // Monday
                    { date: '2023-01-08', completed: true }, // Sunday
                    { date: '2023-01-09', completed: true }, // Next Monday
                ]
            });

            expect(getWeeklyCompletionCount(habit, refDate)).toBe(2);
        });
    });

    describe('calculateStreak', () => {
        it('calculates 0 streak if today is due but not completed and yesterday was missed', () => {
            // Current date is 2023-01-10
            const habit = createBaseHabit({
                frequency: 'daily',
                completions: [
                    { date: '2023-01-08', completed: true },
                    // Missing 2023-01-09
                ]
            });
            expect(calculateStreak(habit)).toBe(0);
        });

        it('calculates streak correctly ignoring today if uncompleted', () => {
            // Current date is 2023-01-10
            const habit = createBaseHabit({
                frequency: 'daily',
                completions: [
                    { date: '2023-01-07', completed: true },
                    { date: '2023-01-08', completed: true },
                    { date: '2023-01-09', completed: true },
                    // 2023-01-10 not completed yet
                ]
            });
            expect(calculateStreak(habit)).toBe(3);
        });

        it('includes today in streak if completed', () => {
            // Current date is 2023-01-10
            const habit = createBaseHabit({
                frequency: 'daily',
                completions: [
                    { date: '2023-01-08', completed: true },
                    { date: '2023-01-09', completed: true },
                    { date: '2023-01-10', completed: true },
                ]
            });
            expect(calculateStreak(habit)).toBe(3);
        });

        it('calculates streak correctly for specific_days habits', () => {
            // Current date is 2023-01-10 (Tuesday)
            // specificDays: [1, 3, 5] (Mon, Wed, Fri)
            const habit = createBaseHabit({
                frequency: 'specific_days',
                specificDays: [1, 3, 5],
                completions: [
                    { date: '2023-01-02', completed: true }, // Mon
                    { date: '2023-01-04', completed: true }, // Wed
                    { date: '2023-01-06', completed: true }, // Fri
                    { date: '2023-01-09', completed: true }, // Mon
                ]
            });

            // Streak should be 4, as Tue, Thu, Sat, Sun are not due days
            expect(calculateStreak(habit)).toBe(4);

            const brokenHabit = {
                ...habit,
                completions: [
                    { date: '2023-01-02', completed: true }, // Mon
                    // Missed Wed 2023-01-04
                    { date: '2023-01-06', completed: true }, // Fri
                    { date: '2023-01-09', completed: true }, // Mon
                ]
            };

            // Streak should break at Wed, so only Fri and Mon count
            expect(calculateStreak(brokenHabit)).toBe(2);
        });

        it('calculates streak correctly for every_n_days habits', () => {
            // Current date is 2023-01-10
            // Created at 2023-01-01, every 3 days. Due dates: 01, 04, 07, 10
            const habit = createBaseHabit({
                frequency: 'every_n_days',
                everyNDays: 3,
                createdAt: '2023-01-01T00:00:00Z',
                completions: [
                    { date: '2023-01-04', completed: true },
                    { date: '2023-01-07', completed: true },
                    // Today 10 is due but not completed yet
                ]
            });

            expect(calculateStreak(habit)).toBe(2);
        });

        it('stops counting at 365 days', () => {
            // generate 400 days of completions
            const completions = [];
            const currentDate = new Date('2023-01-10T00:00:00Z');
            for (let i = 0; i < 400; i++) {
                completions.push({
                    date: formatDateStr(currentDate),
                    completed: true
                });
                currentDate.setDate(currentDate.getDate() - 1);
            }

            const habit = createBaseHabit({
                frequency: 'daily',
                completions
            });

            // The loop in calculateStreak stops at 365
            expect(calculateStreak(habit)).toBe(365);
        });
    });

    describe('Date formatters', () => {
        it('formatDateStr formats dates correctly to YYYY-MM-DD', () => {
            expect(formatDateStr(new Date('2023-05-09T10:00:00Z'))).toBe('2023-05-09');
            expect(formatDateStr(new Date('2023-11-25T10:00:00Z'))).toBe('2023-11-25');
        });

        it('getTodayStr returns today formatted correctly', () => {
            // Fake timers are set to 2023-01-10
            expect(getTodayStr()).toBe('2023-01-10');
        });
    });
});
