import { describe, it, expect } from 'vitest';
import { calcPressureScore, getPressureLevel, getPressureLabel, sortByPressure } from '../pressureScore';
import type { Task, Goal } from '../../types';

describe('calcPressureScore', () => {
    // Helper to create a base mock task
    const createMockTask = (overrides?: Partial<Task>): Task => ({
        id: 'task-1',
        title: 'Test Task',
        description: '',
        completed: false,
        createdAt: '2023-01-01',
        dueDate: null,
        dueTime: null,
        duration: null,
        priority: 'medium',
        categoryId: null,
        projectId: null,
        tags: [],
        subtasks: [],
        linkedGoalId: null,
        contributionValue: null,
        goalLinks: [],
        ...overrides,
    });

    // Helper to create a base mock goal
    const createMockGoal = (overrides?: Partial<Goal>): Goal => ({
        id: 'goal-1',
        title: 'Test Goal',
        description: '',
        why: '',
        goalType: 'measurable',
        targetValue: null,
        currentValue: 0,
        unit: null,
        color: '#000000',
        icon: '🎯',
        createdAt: '2023-01-01',
        entries: [],
        parentGoalId: null,
        ...overrides,
    });

    const mockToday = new Date('2023-05-15T12:00:00Z');

    it('should return 0 if the task is completed', () => {
        const task = createMockTask({ completed: true });
        const score = calcPressureScore(task, [], mockToday);
        expect(score).toBe(0);
    });

    describe('1. Deadline proximity', () => {
        it('should add 50 points if task is overdue', () => {
            const task = createMockTask({ dueDate: '2023-05-14' });
            const score = calcPressureScore(task, [], mockToday);
            expect(score).toBe(50 + 20); // 50 for overdue + 20 for task age (max cap)
        });

        it('should add 45 points if task is due today', () => {
            const task = createMockTask({ dueDate: '2023-05-15' });
            // Let's create task today to isolate deadline points
            task.createdAt = '2023-05-15';
            const score = calcPressureScore(task, [], mockToday);
            expect(score).toBe(45);
        });

        it('should add 38 points if task is due tomorrow', () => {
            const task = createMockTask({ dueDate: '2023-05-16', createdAt: '2023-05-15' });
            const score = calcPressureScore(task, [], mockToday);
            expect(score).toBe(38);
        });

        it('should add 25 points if task is due in 3 days', () => {
            const task = createMockTask({ dueDate: '2023-05-18', createdAt: '2023-05-15' });
            const score = calcPressureScore(task, [], mockToday);
            expect(score).toBe(25);
        });

        it('should add 12 points if task is due in 7 days', () => {
            const task = createMockTask({ dueDate: '2023-05-22', createdAt: '2023-05-15' });
            const score = calcPressureScore(task, [], mockToday);
            expect(score).toBe(12);
        });

        it('should add 5 points if task is due in 14 days', () => {
            const task = createMockTask({ dueDate: '2023-05-29', createdAt: '2023-05-15' });
            const score = calcPressureScore(task, [], mockToday);
            expect(score).toBe(5);
        });

        it('should add 0 points for deadline if task is due far in the future', () => {
            const task = createMockTask({ dueDate: '2023-06-15', createdAt: '2023-05-15' });
            const score = calcPressureScore(task, [], mockToday);
            expect(score).toBe(0);
        });
    });

    describe('2. Linked goal stalling', () => {
        it('should calculate stalling based on last entry date (via goalLinks)', () => {
            const goal = createMockGoal({
                id: 'g1',
                entries: [{ id: 'e1', date: '2023-05-10', value: 1, note: '' }]
            });
            const task = createMockTask({
                createdAt: '2023-05-15', // isolate
                goalLinks: [{ goalId: 'g1', contributionValue: 1 }]
            });

            // stalledDays = diffDays('2023-05-10', '2023-05-15') = 5
            // score = 5 * 3 = 15
            const score = calcPressureScore(task, [goal], mockToday);
            expect(score).toBe(15);
        });

        it('should calculate stalling based on last entry date (via linkedGoalId)', () => {
            const goal = createMockGoal({
                id: 'g1',
                entries: [{ id: 'e1', date: '2023-05-10', value: 1, note: '' }]
            });
            const task = createMockTask({
                createdAt: '2023-05-15', // isolate
                linkedGoalId: 'g1'
            });

            // stalledDays = diffDays('2023-05-10', '2023-05-15') = 5
            // score = 5 * 3 = 15
            const score = calcPressureScore(task, [goal], mockToday);
            expect(score).toBe(15);
        });

        it('should calculate stalling based on goal createdAt if no entries exist', () => {
            const goal = createMockGoal({
                id: 'g1',
                createdAt: '2023-05-05',
                entries: []
            });
            const task = createMockTask({
                createdAt: '2023-05-15', // isolate
                goalLinks: [{ goalId: 'g1', contributionValue: 1 }]
            });

            // stalledDays = diffDays('2023-05-05', '2023-05-15') = 10
            // score = 10 * 3 = 30 (cap)
            const score = calcPressureScore(task, [goal], mockToday);
            expect(score).toBe(30);
        });

        it('should cap stalling points at 30', () => {
            const goal = createMockGoal({
                id: 'g1',
                createdAt: '2023-04-01', // 44 days
                entries: []
            });
            const task = createMockTask({
                createdAt: '2023-05-15', // isolate
                linkedGoalId: 'g1'
            });

            // stalledDays = 44 * 3 = 132 -> cap to 30
            const score = calcPressureScore(task, [goal], mockToday);
            expect(score).toBe(30);
        });

        it('should not add stalling points if negative stall (future entry)', () => {
            const goal = createMockGoal({
                id: 'g1',
                entries: [{ id: 'e1', date: '2023-05-20', value: 1, note: '' }]
            });
            const task = createMockTask({
                createdAt: '2023-05-15', // isolate
                linkedGoalId: 'g1'
            });

            const score = calcPressureScore(task, [goal], mockToday);
            expect(score).toBe(0);
        });
    });

    describe('3. Task age', () => {
        it('should add points based on task age', () => {
            const task = createMockTask({ createdAt: '2023-05-10' });
            // 5 days old -> 5 points
            const score = calcPressureScore(task, [], mockToday);
            expect(score).toBe(5);
        });

        it('should cap task age points at 20', () => {
            const task = createMockTask({ createdAt: '2023-01-01' }); // ~134 days
            const score = calcPressureScore(task, [], mockToday);
            expect(score).toBe(20);
        });
    });

    describe('Combined and capped', () => {
        it('should stack all factors correctly', () => {
            const goal = createMockGoal({ id: 'g1', createdAt: '2023-05-10', entries: [] }); // 5 * 3 = 15 pts
            const task = createMockTask({
                createdAt: '2023-05-10', // age: 5 pts
                dueDate: '2023-05-18',   // due in 3 days: 25 pts
                linkedGoalId: 'g1'
            });

            // Total = 15 + 5 + 25 = 45
            const score = calcPressureScore(task, [goal], mockToday);
            expect(score).toBe(45);
        });

        it('should cap final score at 100', () => {
            const goal = createMockGoal({ id: 'g1', createdAt: '2023-01-01', entries: [] }); // 30 pts (capped)
            const task = createMockTask({
                createdAt: '2023-01-01', // 20 pts (capped)
                dueDate: '2023-05-14',   // overdue: 50 pts
                linkedGoalId: 'g1'
            });

            // Total = 30 + 20 + 50 = 100
            const score = calcPressureScore(task, [goal], mockToday);
            expect(score).toBe(100);
        });

        it('should never return more than 100 even with extreme values', () => {
            const goal = createMockGoal({ id: 'g1', createdAt: '2020-01-01', entries: [] });
            const task = createMockTask({
                createdAt: '2020-01-01',
                dueDate: '2020-01-01',
                linkedGoalId: 'g1'
            });

            const score = calcPressureScore(task, [goal], mockToday);
            expect(score).toBe(100);
        });
    });
});

describe('getPressureLevel', () => {
    it('should return critical for scores >= 76', () => {
        expect(getPressureLevel(76)).toBe('critical');
        expect(getPressureLevel(100)).toBe('critical');
    });

    it('should return high for scores between 51 and 75', () => {
        expect(getPressureLevel(51)).toBe('high');
        expect(getPressureLevel(75)).toBe('high');
    });

    it('should return medium for scores between 26 and 50', () => {
        expect(getPressureLevel(26)).toBe('medium');
        expect(getPressureLevel(50)).toBe('medium');
    });

    it('should return low for scores <= 25', () => {
        expect(getPressureLevel(25)).toBe('low');
        expect(getPressureLevel(0)).toBe('low');
    });
});

describe('getPressureLabel', () => {
    it('should return Overdue for critical scores', () => {
        expect(getPressureLabel(80)).toBe('Overdue');
    });

    it('should return Urgent for high scores', () => {
        expect(getPressureLabel(60)).toBe('Urgent');
    });

    it('should return Soon for medium scores', () => {
        expect(getPressureLabel(40)).toBe('Soon');
    });

    it('should return empty string for low scores', () => {
        expect(getPressureLabel(20)).toBe('');
    });
});

describe('sortByPressure', () => {
    // Helper to create a base mock task
    const createMockTask = (overrides?: Partial<Task>): Task => ({
        id: 'task-1',
        title: 'Test Task',
        description: '',
        completed: false,
        createdAt: '2023-01-01',
        dueDate: null,
        dueTime: null,
        duration: null,
        priority: 'medium',
        categoryId: null,
        projectId: null,
        tags: [],
        subtasks: [],
        linkedGoalId: null,
        contributionValue: null,
        goalLinks: [],
        ...overrides,
    });

    it('should sort incomplete tasks by pressure descending', () => {
        // High pressure task (overdue)
        const t1 = createMockTask({ id: 't1', dueDate: '2020-01-01' });
        // Medium pressure task (due next week)
        const t2 = createMockTask({ id: 't2', dueDate: '2100-01-01', createdAt: '2023-01-01' });

        const sorted = sortByPressure([t2, t1], []);
        expect(sorted[0].id).toBe('t1');
        expect(sorted[1].id).toBe('t2');
    });

    it('should always put completed tasks at the end', () => {
        // Incomplete, low pressure
        const t1 = createMockTask({ id: 't1', createdAt: new Date().toISOString() });
        // Completed, high pressure (would be high if not completed)
        const t2 = createMockTask({ id: 't2', completed: true, dueDate: '2020-01-01' });

        const sorted = sortByPressure([t2, t1], []);
        expect(sorted[0].id).toBe('t1'); // Incomplete first
        expect(sorted[1].id).toBe('t2'); // Completed last
    });
});
