/* ═══════════════════════════════════════════════════════════
   COMMAND PARSER — Natural language → structured data
   Pure functions. No React. No side effects.

   Input:  "meeting with sara tomorrow 3pm 1h @work !!"
   Output: ParsedCommand with title, date, time, duration,
           priority, goalId, tagIds, tokens
   ═══════════════════════════════════════════════════════════ */

import type {
    ParsedCommand, ParsedToken, CommandType,
    ParsedPriority, ParsedRecurrence, TaskPriority,
} from '../types';
import { formatDateStr } from './recurrence';

// ─── Helpers ─────────────────────────────────────

function todayStr(): string {
    return formatDateStr(new Date());
}

function offsetDate(days: number): string {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return formatDateStr(d);
}

/** Returns the date of the next occurrence of targetDay (0=Sun..6=Sat).
 *  If today IS targetDay, returns today. */
function thisOrNextWeekday(targetDay: number): string {
    const d = new Date();
    const current = d.getDay();
    let diff = targetDay - current;
    if (diff < 0) diff += 7;
    d.setDate(d.getDate() + diff);
    return formatDateStr(d);
}

/** Always returns the NEXT occurrence of targetDay, never today. */
function strictNextWeekday(targetDay: number): string {
    const d = new Date();
    const current = d.getDay();
    let diff = targetDay - current;
    if (diff <= 0) diff += 7; // force next week if today or past
    d.setDate(d.getDate() + diff);
    return formatDateStr(d);
}

function pad2(n: number): string {
    return String(n).padStart(2, '0');
}

function toHHmm(h: number, m = 0): string {
    return `${pad2(h)}:${pad2(m)}`;
}

/** Roll a YYYY-MM-DD date to next year if it's already passed today. */
function rolloverIfPast(dateStr: string): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr + 'T00:00:00');
    if (d < today) {
        return `${today.getFullYear() + 1}-${dateStr.slice(5)}`;
    }
    return dateStr;
}

// ─── Prefix detection ────────────────────────────

const PREFIX_MAP: Record<string, CommandType> = {
    '#t': 'task',
    '#h': 'habit',
    '#g': 'goal',
    '#p': 'task', // project → task for now
};

function extractPrefix(input: string): { type: CommandType; rest: string } {
    const trimmed = input.trim();
    for (const [prefix, type] of Object.entries(PREFIX_MAP)) {
        if (trimmed.toLowerCase().startsWith(prefix + ' ') || trimmed.toLowerCase() === prefix) {
            return { type, rest: trimmed.slice(prefix.length).trim() };
        }
    }
    return { type: 'task', rest: trimmed };
}

// ─── Token patterns ──────────────────────────────

// Priority: !!, !!!, !high, !medium, !low, !urgent
// Note: ! is a non-word char so \b doesn't work around it — use explicit anchors/spaces
const PRIORITY_PATTERNS: { re: RegExp; value: ParsedPriority }[] = [
    { re: /(?:^|\s)(!{3,})(?:\s|$)/,  value: 'urgent' },
    { re: /(?:^|\s)(!{2})(?:\s|$)/,   value: 'high'   },
    { re: /(?:^|\s)(!{1})(?:\s|$)/,   value: 'medium' }, // Single ! is medium
    { re: /(?:^|\s)!urgent\b/i,        value: 'urgent' },
    { re: /(?:^|\s)!high\b/i,          value: 'high'   },
    { re: /(?:^|\s)!medium\b/i,        value: 'medium' },
    { re: /(?:^|\s)!low\b/i,           value: 'low'    },
];

// Duration: 2h, 30min, 1.5h, 2 hours, half hour, 1h30m, 1h 30min
const DURATION_COMPOUND_RE = /\b(\d+(?:\.\d+)?)\s*(?:h(?:ours?)?|hr)\s*(\d+)\s*(?:min(?:utes?)?|m)\b/i;
const DURATION_RE           = /\b(\d+(?:\.\d+)?)\s*(?:h(?:ours?)?|hr)\b|\b(\d+)\s*(?:min(?:utes?)?|m)\b|\bhalf\s+hour\b/i;

// Time: 5:30pm, 5pm, 17:30, morning, afternoon, evening, night
const TIME_WORD_MAP: Record<string, string> = {
    morning:   toHHmm(9),
    afternoon: toHHmm(14),
    evening:   toHHmm(19),
    night:     toHHmm(21),
};
// Matches HH:MM[am/pm], H[am/pm], or bare HH:MM (24h)
const TIME_RE = /\b(\d{1,2}):(\d{2})\s*(am|pm)?\b|\b(\d{1,2})\s*(am|pm)\b/i;

// Date words — plain weekdays resolve to this-or-next, "next X" always forces next week
const DATE_WORD_MAP: Record<string, () => string> = {
    today:     () => todayStr(),
    tomorrow:  () => offsetDate(1),
    yesterday: () => offsetDate(-1),
    monday:    () => thisOrNextWeekday(1),
    tuesday:   () => thisOrNextWeekday(2),
    wednesday: () => thisOrNextWeekday(3),
    thursday:  () => thisOrNextWeekday(4),
    friday:    () => thisOrNextWeekday(5),
    saturday:  () => thisOrNextWeekday(6),
    sunday:    () => thisOrNextWeekday(0),
    mon:       () => thisOrNextWeekday(1),
    tue:       () => thisOrNextWeekday(2),
    wed:       () => thisOrNextWeekday(3),
    thu:       () => thisOrNextWeekday(4),
    fri:       () => thisOrNextWeekday(5),
    sat:       () => thisOrNextWeekday(6),
    sun:       () => thisOrNextWeekday(0),
    'next monday':    () => strictNextWeekday(1),
    'next tuesday':   () => strictNextWeekday(2),
    'next wednesday': () => strictNextWeekday(3),
    'next thursday':  () => strictNextWeekday(4),
    'next friday':    () => strictNextWeekday(5),
    'next saturday':  () => strictNextWeekday(6),
    'next sunday':    () => strictNextWeekday(0),
};

// Ordinal date: "on 5th", "by 3rd", "due 21st", also handles "on the 5th"
const DATE_TRIGGER_RE = /\b(?:on|by|due|for|the)\s+(\d{1,2})(?:st|nd|rd|th)\b/i;

// Month + day: "dec 25", "25 dec", "december 25", "12/25"
const MONTHS: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    january: 1, february: 2, march: 3, april: 4, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};
const MONTH_DAY_RE = /\b(\d{1,2})\s*\/\s*(\d{1,2})\b|\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\b|\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)\b/i;

// Recurrence
const RECURRENCE_MAP: Record<string, ParsedRecurrence> = {
    daily:    'daily',
    everyday: 'daily',
    weekdays: 'weekdays',
    weekday:  'weekdays',
    weekend:  'weekend',
    weekends: 'weekend',
    mon: 'mon', tue: 'tue', wed: 'wed', thu: 'thu',
    fri: 'fri', sat: 'sat', sun: 'sun',
};

// @goal or @project mentions
const GOAL_MENTION_RE    = /@([a-zA-Z][\w-]*)/g;
const PROJECT_MENTION_RE = /@@([a-zA-Z][\w-]*)/g;
const TAG_MENTION_RE     = /#([a-zA-Z][\w-]*)/g;
const TYPE_PREFIXES      = new Set(['t', 'h', 'g', 'p']);

// ─── Individual extractors ────────────────────────

function extractPriority(text: string): { raw: string; value: TaskPriority } | null {
    for (const { re, value } of PRIORITY_PATTERNS) {
        const m = text.match(re);
        if (m) {
            const raw = m[1] ?? m[0].trim();
            const mapped: TaskPriority = value === 'urgent' ? 'high' : value as TaskPriority;
            return { raw, value: mapped };
        }
    }
    return null;
}

function extractDuration(text: string): { raw: string; value: number } | null {
    const compound = text.match(DURATION_COMPOUND_RE);
    if (compound) {
        const hours = parseFloat(compound[1]);
        const mins  = parseInt(compound[2]);
        return { raw: compound[0], value: Math.round(hours * 60) + mins };
    }
    const m = text.match(DURATION_RE);
    if (!m) return null;
    if (/half\s+hour/i.test(m[0])) return { raw: m[0], value: 30 };
    if (m[1] != null) return { raw: m[0], value: Math.round(parseFloat(m[1]) * 60) };
    if (m[2] != null) return { raw: m[0], value: parseInt(m[2]) };
    return null;
}

function extractTime(text: string): { raw: string; value: string } | null {
    for (const [word, hhmm] of Object.entries(TIME_WORD_MAP)) {
        const re = new RegExp(`\\b${word}\\b`, 'i');
        if (re.test(text)) return { raw: word, value: hhmm };
    }
    const m = text.match(TIME_RE);
    if (!m) return null;
    if (m[1] != null && m[2] != null) {
        let h = parseInt(m[1]);
        const min = parseInt(m[2]);
        const period = m[3]?.toLowerCase();
        if (period === 'pm' && h < 12) h += 12;
        if (period === 'am' && h === 12) h = 0;
        return { raw: m[0], value: toHHmm(h, min) };
    }
    if (m[4] != null && m[5] != null) {
        let h = parseInt(m[4]);
        const period = m[5].toLowerCase();
        if (period === 'pm' && h < 12) h += 12;
        if (period === 'am' && h === 12) h = 0;
        return { raw: m[0], value: toHHmm(h) };
    }
    return null;
}

function extractDate(text: string): { raw: string; value: string } | null {
    const lower = text.toLowerCase();
    for (const [phrase, fn] of Object.entries(DATE_WORD_MAP)) {
        if (phrase.includes(' ') && lower.includes(phrase)) {
            return { raw: phrase, value: fn() };
        }
    }
    for (const [word, fn] of Object.entries(DATE_WORD_MAP)) {
        if (!word.includes(' ')) {
            const re = new RegExp(`\\b${word}\\b`, 'i');
            if (re.test(text)) return { raw: word, value: fn() };
        }
    }
    const mdm = text.match(MONTH_DAY_RE);
    if (mdm) {
        const year = new Date().getFullYear();
        let dateStr: string | null = null;
        if (mdm[1] != null && mdm[2] != null) {
            dateStr = `${year}-${pad2(parseInt(mdm[1]))}-${pad2(parseInt(mdm[2]))}`;
        } else if (mdm[3] != null && mdm[4] != null) {
            const mo = MONTHS[mdm[3].toLowerCase()];
            dateStr = `${year}-${pad2(mo)}-${pad2(parseInt(mdm[4]))}`;
        } else if (mdm[5] != null && mdm[6] != null) {
            const mo = MONTHS[mdm[6].toLowerCase()];
            dateStr = `${year}-${pad2(mo)}-${pad2(parseInt(mdm[5]))}`;
        }
        if (dateStr) return { raw: mdm[0], value: rolloverIfPast(dateStr) };
    }
    const triggered = text.match(DATE_TRIGGER_RE);
    if (triggered) {
        const day = parseInt(triggered[1]);
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(day)}`;
        return { raw: triggered[0], value: rolloverIfPast(dateStr) };
    }
    const ordinalAtEnd = text.match(/\b(\d{1,2})(?:st|nd|rd|th)\s*$/i);
    if (ordinalAtEnd) {
        const day = parseInt(ordinalAtEnd[1]);
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(day)}`;
        return { raw: ordinalAtEnd[0].trim(), value: rolloverIfPast(dateStr) };
    }
    return null;
}

function extractRecurrence(text: string): { raw: string; value: ParsedRecurrence } | null {
    for (const [word, value] of Object.entries(RECURRENCE_MAP)) {
        const re = new RegExp(`\\b${word}\\b`, 'i');
        if (re.test(text)) return { raw: word, value };
    }
    return null;
}

// ─── Main parse function ──────────────────────────

export interface ParseOptions {
    goals:    { id: string; title: string }[];
    tags:     { id: string; name: string }[];
    projects: { id: string; name: string }[];
    dismissed?: Set<string>;
}

export function parseBatch(input: string, opts: ParseOptions): ParsedCommand[] {
    // Split by semicolon or newline
    const lines = input.split(/[;\n]/).map(l => l.trim()).filter(Boolean);
    return lines.map(l => parseCommand(l, opts));
}

export function parseCommand(input: string, opts: ParseOptions): ParsedCommand {
    const { type, rest } = extractPrefix(input);
    const dismissed = opts.dismissed ?? new Set<string>();

    let working = rest;
    const tokens: ParsedToken[] = [];

    // Remove matched raw text from working string and record token.
    // Uses word-boundary-aware removal to avoid clipping mid-word.
    function consume(raw: string, tokenType: ParsedToken['type'], value: unknown): boolean {
        if (dismissed.has(raw.toLowerCase())) return false;
        const idx = working.toLowerCase().indexOf(raw.toLowerCase());
        if (idx === -1) return false;
        working = (working.slice(0, idx) + working.slice(idx + raw.length))
            .replace(/\s{2,}/g, ' ')
            .trim();
        tokens.push({ type: tokenType, raw, value, dismissed: false });
        return true;
    }

    // ── Priority ──────────────────────────────────
    const priority = extractPriority(working);
    let parsedPriority: TaskPriority | null = null;
    if (priority && !dismissed.has(priority.raw.toLowerCase())) {
        consume(priority.raw, 'priority', priority.value);
        parsedPriority = priority.value;
    }

    // ── Duration ──────────────────────────────────
    const duration = extractDuration(working);
    let parsedDuration: number | null = null;
    if (duration && !dismissed.has(duration.raw.toLowerCase())) {
        consume(duration.raw, 'duration', duration.value);
        parsedDuration = duration.value;
    }

    // ── Time ──────────────────────────────────────
    const time = extractTime(working);
    let parsedTime: string | null = null;
    if (time && !dismissed.has(time.raw.toLowerCase())) {
        consume(time.raw, 'time', time.value);
        parsedTime = time.value as string;
    }

    // ── Date ──────────────────────────────────────
    const date = extractDate(working);
    let parsedDate: string | null = null;
    if (date && !dismissed.has(date.raw.toLowerCase())) {
        consume(date.raw, 'date', date.value);
        parsedDate = date.value as string;
    }

    // ── Recurrence (habits only) ──────────────────
    let parsedRecurrence: ParsedRecurrence | null = null;
    if (type === 'habit') {
        const rec = extractRecurrence(working);
        if (rec && !dismissed.has(rec.raw.toLowerCase())) {
            consume(rec.raw, 'recurrence', rec.value);
            parsedRecurrence = rec.value;
        }
    }

    // ── @goal mentions ────────────────────────────
    // First strip @@project mentions so they don't get matched as goals
    let parsedGoalId: string | null = null;
    let parsedProjectId: string | null = null;

    // ── @@project mentions ────────────────────────
    const projectMatches = [...working.matchAll(PROJECT_MENTION_RE)];
    for (const m of projectMatches) {
        if (dismissed.has(m[0].toLowerCase())) continue;
        const slug = m[1].toLowerCase();
        const matched = opts.projects.find(p =>
            p.name.toLowerCase().replace(/\s+/g, '-').includes(slug) ||
            p.name.toLowerCase().includes(slug)
        );
        if (matched) {
            consume(m[0], 'project', matched.id);
            parsedProjectId = matched.id;
            break;
        }
    }

    // ── @goal mentions (single @, skip already-consumed @@project) ──
    const goalMatches = [...working.matchAll(GOAL_MENTION_RE)];
    for (const m of goalMatches) {
        if (dismissed.has(m[0].toLowerCase())) continue;
        // skip if this is actually a @@project match (starts with @@)
        const idx = working.indexOf(m[0]);
        if (idx > 0 && working[idx - 1] === '@') continue;
        const slug = m[1].toLowerCase();
        // Try project match first if no @@ was used
        if (!parsedProjectId) {
            const projMatch = opts.projects.find(p =>
                p.name.toLowerCase().replace(/\s+/g, '-').includes(slug) ||
                p.name.toLowerCase().includes(slug)
            );
            if (projMatch) {
                consume(m[0], 'project', projMatch.id);
                parsedProjectId = projMatch.id;
                continue;
            }
        }
        const matched = opts.goals.find(g =>
            g.title.toLowerCase().replace(/\s+/g, '-').includes(slug) ||
            g.title.toLowerCase().includes(slug)
        );
        if (matched) {
            consume(m[0], 'goal', matched.id);
            parsedGoalId = matched.id;
            break;
        }
    }

    // ── #tag mentions (skip type prefixes) ────────
    // Tags are free-text — capture the word directly, no entity lookup needed
    const parsedTagIds: string[] = [];
    const tagMatches = [...working.matchAll(TAG_MENTION_RE)];
    for (const m of tagMatches) {
        if (dismissed.has(m[0].toLowerCase())) continue;
        if (TYPE_PREFIXES.has(m[1].toLowerCase())) continue; // skip #t, #h, #g, #p
        const tagText = m[1].toLowerCase();
        consume(m[0], 'tag', tagText);
        parsedTagIds.push(tagText);
    }

    // ── Title = whatever remains ───────────────────
    const title = working.trim();

    return {
        type,
        title,
        date: parsedDate,
        time: parsedTime,
        duration: parsedDuration,
        priority: parsedPriority,
        goalId: parsedGoalId,
        projectId: parsedProjectId,
        tagIds: parsedTagIds,
        recurrence: parsedRecurrence,
        tokens,
        raw: input,
    };
}

// ─── Format helpers ───────────────────────────────

export function formatParsedDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    if (diff > 0 && diff < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatParsedTime(timeStr: string): string {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
}
