import { describe, it, expect } from 'vitest';
import { parseCommand, parseBatch, formatParsedDate, formatParsedTime, formatDuration } from './commandParser';
import type { ParseOptions } from './commandParser';
import { formatDateStr } from './recurrence';

const mockOpts: ParseOptions = {
    goals: [
        { id: 'g1', title: 'Learn TypeScript' },
        { id: 'g2', title: 'Health and Fitness' }
    ],
    projects: [
        { id: 'p1', name: 'Work Project' },
        { id: 'p2', name: 'Side Hustle' }
    ],
    tags: [
        { id: 't1', name: 'urgent' },
        { id: 't2', name: 'backend' }
    ],
    dismissed: new Set<string>()
};

function todayStr(): string {
    return formatDateStr(new Date());
}

function offsetDate(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return formatDateStr(d);
}

describe('commandParser', () => {
    describe('parseCommand', () => {
        it('parses basic task without any prefixes or tokens', () => {
            const input = 'Buy milk';
            const result = parseCommand(input, mockOpts);
            expect(result.title).toBe('Buy milk');
            expect(result.type).toBe('task');
            expect(result.priority).toBeNull();
            expect(result.date).toBeNull();
            expect(result.time).toBeNull();
            expect(result.duration).toBeNull();
            expect(result.goalId).toBeNull();
            expect(result.projectId).toBeNull();
            expect(result.tagIds).toEqual([]);
            expect(result.tokens).toEqual([]);
        });

        it('extracts command types from prefixes', () => {
            expect(parseCommand('#t Buy milk', mockOpts).type).toBe('task');
            expect(parseCommand('#h Exercise', mockOpts).type).toBe('habit');
            expect(parseCommand('#g New Goal', mockOpts).type).toBe('goal');
            expect(parseCommand('#p New Project', mockOpts).type).toBe('task'); // #p is mapped to task in extractPrefix
        });

        it('parses priority correctly', () => {
            expect(parseCommand('Buy milk !!', mockOpts).priority).toBe('high');
            expect(parseCommand('Buy milk !!!', mockOpts).priority).toBe('high'); // urgent maps to high
            expect(parseCommand('Buy milk !', mockOpts).priority).toBe('medium');
            expect(parseCommand('Buy milk !urgent', mockOpts).priority).toBe('high'); // urgent maps to high
            expect(parseCommand('Buy milk !high', mockOpts).priority).toBe('high');
            expect(parseCommand('Buy milk !medium', mockOpts).priority).toBe('medium');
            expect(parseCommand('Buy milk !low', mockOpts).priority).toBe('low');
        });

        it('parses duration correctly', () => {
            expect(parseCommand('Read 2h', mockOpts).duration).toBe(120);
            expect(parseCommand('Read 30min', mockOpts).duration).toBe(30);
            expect(parseCommand('Read 1.5h', mockOpts).duration).toBe(90);
            expect(parseCommand('Read half hour', mockOpts).duration).toBe(30);
            expect(parseCommand('Read 1h 30m', mockOpts).duration).toBe(90);
        });

        it('parses time correctly', () => {
            expect(parseCommand('Meeting 5pm', mockOpts).time).toBe('17:00');
            expect(parseCommand('Meeting 5:30pm', mockOpts).time).toBe('17:30');
            expect(parseCommand('Meeting 09:15', mockOpts).time).toBe('09:15');
            expect(parseCommand('Meeting 9am', mockOpts).time).toBe('09:00');
            expect(parseCommand('Meeting morning', mockOpts).time).toBe('09:00');
            expect(parseCommand('Meeting evening', mockOpts).time).toBe('19:00');
        });

        it('parses date correctly', () => {
            expect(parseCommand('Task today', mockOpts).date).toBe(todayStr());
            expect(parseCommand('Task tomorrow', mockOpts).date).toBe(offsetDate(1));
            expect(parseCommand('Task yesterday', mockOpts).date).toBe(offsetDate(-1));
            // Basic date format checks (these would depend on the current date for exact results)
            expect(parseCommand('Task dec 25', mockOpts).date).toMatch(/\d{4}-12-25/);
            expect(parseCommand('Task on 5th', mockOpts).date).toMatch(/\d{4}-\d{2}-05/);
        });

        it('parses recurrence for habits', () => {
            expect(parseCommand('#h Exercise daily', mockOpts).recurrence).toBe('daily');
            expect(parseCommand('#h Work weekdays', mockOpts).recurrence).toBe('weekdays');
            expect(parseCommand('#t Task daily', mockOpts).recurrence).toBeNull(); // recurrence is for habits only
        });

        it('extracts goal mentions', () => {
            const result = parseCommand('Read book @learn-typescript', mockOpts);
            expect(result.goalId).toBe('g1');
            expect(result.title).toBe('Read book');
        });

        it('extracts project mentions', () => {
            const result = parseCommand('Write code @@work-project', mockOpts);
            expect(result.projectId).toBe('p1');
            expect(result.title).toBe('Write code');
        });

        it('extracts tag mentions', () => {
            const result = parseCommand('Fix bug #urgent #backend', mockOpts);
            expect(result.tagIds).toEqual(['urgent', 'backend']);
            expect(result.title).toBe('Fix bug');
        });

        it('respects dismissed tokens', () => {
            const optsWithDismissed = {
                ...mockOpts,
                dismissed: new Set(['today'])
            };
            const result = parseCommand('Call mom today', optsWithDismissed);
            expect(result.date).toBeNull();
            expect(result.title).toBe('Call mom today');
        });

        it('handles complex combined inputs', () => {
            const input = '#t Complete assignment tomorrow 2h 3pm !! @learn-typescript @@work-project #urgent';
            const result = parseCommand(input, mockOpts);

            expect(result.type).toBe('task');
            expect(result.title).toBe('Complete assignment');
            expect(result.date).toBe(offsetDate(1));
            expect(result.duration).toBe(120);
            expect(result.time).toBe('15:00');
            expect(result.priority).toBe('high');
            expect(result.goalId).toBe('g1');
            expect(result.projectId).toBe('p1');
            expect(result.tagIds).toEqual(['urgent']);
        });
    });

    describe('parseBatch', () => {
        it('splits commands by newline and semicolon', () => {
            const input = 'Task 1; Task 2\nTask 3';
            const results = parseBatch(input, mockOpts);
            expect(results).toHaveLength(3);
            expect(results[0].title).toBe('Task 1');
            expect(results[1].title).toBe('Task 2');
            expect(results[2].title).toBe('Task 3');
        });

        it('filters out empty lines', () => {
            const input = 'Task 1;; \n Task 2';
            const results = parseBatch(input, mockOpts);
            expect(results).toHaveLength(2);
            expect(results[0].title).toBe('Task 1');
            expect(results[1].title).toBe('Task 2');
        });
    });

    describe('format helpers', () => {
        it('formatParsedDate formats correctly', () => {
            expect(formatParsedDate(todayStr())).toBe('Today');
            expect(formatParsedDate(offsetDate(1))).toBe('Tomorrow');
            expect(formatParsedDate(offsetDate(-1))).toBe('Yesterday');
        });

        it('formatParsedTime formats correctly', () => {
            expect(formatParsedTime('09:00')).toBe('9:00 AM');
            expect(formatParsedTime('17:30')).toBe('5:30 PM');
            expect(formatParsedTime('12:15')).toBe('12:15 PM');
            expect(formatParsedTime('00:45')).toBe('12:45 AM');
        });

        it('formatDuration formats correctly', () => {
            expect(formatDuration(30)).toBe('30m');
            expect(formatDuration(60)).toBe('1h');
            expect(formatDuration(90)).toBe('1h 30m');
            expect(formatDuration(125)).toBe('2h 5m');
        });
    });
});
