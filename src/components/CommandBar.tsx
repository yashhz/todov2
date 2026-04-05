/* ═══════════════════════════════════════════════════════════
   COMMAND BAR — Spotlight-style NLP input overlay
   Cmd+K / Ctrl+K to open. Esc to close.
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks, useGoals, useHabits, useProjects } from '../hooks/useStore';
import { parseBatch, formatParsedDate, formatParsedTime, formatDuration } from '../services/commandParser';
import type { ParsedCommand, ParsedToken } from '../types';
import './CommandBar.css';

interface CommandBarProps {
    isOpen: boolean;
    onClose: () => void;
}

// Chip colour per token type
const TOKEN_COLORS: Record<ParsedToken['type'], string> = {
    date:       'var(--cmd-chip-date)',
    time:       'var(--cmd-chip-time)',
    duration:   'var(--cmd-chip-duration)',
    priority:   'var(--cmd-chip-priority)',
    goal:       'var(--cmd-chip-goal)',
    tag:        'var(--cmd-chip-tag)',
    recurrence: 'var(--cmd-chip-recurrence)',
    project:    'var(--cmd-chip-project)',
};

// Resolve a token to a human-readable label
function tokenLabel(
    token: ParsedToken,
    goals: { id: string; title: string; icon: string }[],
    projects: { id: string; name: string; icon: string }[],
): string {
    switch (token.type) {
        case 'date':       return formatParsedDate(token.value as string);
        case 'time':       return formatParsedTime(token.value as string);
        case 'duration':   return formatDuration(token.value as number);
        case 'priority':   return (token.value as string).charAt(0).toUpperCase() + (token.value as string).slice(1);
        case 'recurrence': return token.raw;
        case 'goal': {
            const g = goals.find(g => g.id === token.value);
            return g ? `${g.icon} ${g.title}` : token.raw;
        }
        case 'project': {
            const p = projects.find(p => p.id === token.value);
            return p ? `${p.icon} ${p.name}` : token.raw;
        }
        case 'tag':
            return `#${token.value as string}`;
        default: return token.raw;
    }
}

export default function CommandBar({ isOpen, onClose }: CommandBarProps) {
    const navigate = useNavigate();
    const { addTask }              = useTasks();
    const { goals }                = useGoals();
    const { addHabit }             = useHabits();
    const { projects }             = useProjects();

    const [input, setInput]       = useState('');
    const [confirmed, setConfirmed] = useState(false);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const inputRef = useRef<HTMLInputElement>(null);

    // Stable option arrays — memoised so parseCommand deps don't thrash
    const goalOptions = useMemo(
        () => goals.map(g => ({ id: g.id, title: g.title })),
        [goals],
    );
    const projectOptions = useMemo(
        () => projects.filter(p => p.status === 'active').map(p => ({ id: p.id, name: p.name })),
        [projects],
    );

    const parsedBatch: ParsedCommand[] = useMemo(
        () => parseBatch(input, { goals: goalOptions, projects: projectOptions, tags: [], dismissed }),
        [input, goalOptions, projectOptions, dismissed],
    );

    // For single-command preview/logic, use the first one
    const parsed = parsedBatch[0] || { type: 'task', title: '', tokens: [], tagIds: [] };
    const isBatch = parsedBatch.length > 1;

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setInput('');
            setConfirmed(false);
            setDismissed(new Set());
        }
    }, [isOpen]);

    function dismissToken(raw: string) {
        setDismissed(prev => new Set(prev).add(raw.toLowerCase()));
    }

    const commitSingle = useCallback((p: ParsedCommand) => {
        if (!p.title.trim() && p.type !== 'goal') return;

        if (p.type === 'goal') {
            navigate('/goals', { state: { prefill: { title: p.title } } });
            return;
        }

        if (p.type === 'habit') {
            const dayMap: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
            const weekdayNums = [1, 2, 3, 4, 5];
            const weekendNums = [0, 6];

            let frequency: 'daily' | 'specific_days' = 'daily';
            let specificDays: number[] = [];

            if (p.recurrence === 'weekdays') {
                frequency = 'specific_days';
                specificDays = weekdayNums;
            } else if (p.recurrence === 'weekend') {
                frequency = 'specific_days';
                specificDays = weekendNums;
            } else if (p.recurrence && p.recurrence in dayMap) {
                frequency = 'specific_days';
                specificDays = [dayMap[p.recurrence]];
            }

            addHabit({
                title: p.title,
                frequency,
                specificDays,
                timeOfDay: p.time,
                linkedGoalId: p.goalId,
                projectId: p.projectId,
                contributionValue: null,
            });
        } else {
            // Task
            addTask({
                title: p.title,
                dueDate: p.date,
                dueTime: p.time,
                duration: p.duration,
                priority: p.priority ?? 'medium',
                linkedGoalId: p.goalId,
                projectId: p.projectId,
                tags: p.tagIds,
            });
        }
    }, [addTask, addHabit, navigate]);

    const handleCommit = useCallback(() => {
        if (parsedBatch.length === 0) return;
        
        parsedBatch.forEach(p => commitSingle(p));
        onClose();
    }, [parsedBatch, commitSingle, onClose]);

    // Keyboard: Escape closes, Enter confirms/creates
    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Escape') {
            if (confirmed) { setConfirmed(false); return; }
            onClose();
            return;
        }
        if (e.key === 'Enter') {
            e.preventDefault();
            if (!input.trim()) return;
            
            // Cmd+Enter or Ctrl+Enter = Immediate Commit
            if (e.metaKey || e.ctrlKey) {
                handleCommit();
                return;
            }

            if (!confirmed) {
                setConfirmed(true);
                return;
            }
            handleCommit();
        }
    }, [input, confirmed, handleCommit, onClose]);

    if (!isOpen) return null;

    // Rich data lookups for preview
    const linkedGoal    = parsed.goalId    ? goals.find(g => g.id === parsed.goalId)       : null;
    const linkedProject = parsed.projectId ? projects.find(p => p.id === parsed.projectId) : null;

    const hasTokens     = parsed.tokens.length > 0;
    const typeLabel     = parsed.type === 'task' ? 'Task' : parsed.type === 'habit' ? 'Habit' : 'Goal';
    const typeBadgeClass = `cmd-type-badge cmd-type-badge--${parsed.type}`;

    return (
        <div className="cmd-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="cmd-container animate-cmd-in">

                {/* Input row */}
                <div className="cmd-input-row">
                    <span className={typeBadgeClass}>{typeLabel}</span>
                    <textarea
                        ref={inputRef as any}
                        className="cmd-input"
                        value={input}
                        onChange={e => { setInput(e.target.value); setConfirmed(false); }}
                        onKeyDown={handleKeyDown as any}
                        placeholder='Try "buy milk; clean car; call mom" or paste multiple lines'
                        spellCheck={false}
                        autoComplete="off"
                        rows={input.includes('\n') ? Math.min(input.split('\n').length, 5) : 1}
                    />
                    <div className="cmd-input-right">
                        {isBatch && (
                            <div className="cmd-batch-badge">
                                {parsedBatch.length} commands
                            </div>
                        )}
                        {input && (
                            <button className="cmd-clear" onClick={() => { setInput(''); setConfirmed(false); inputRef.current?.focus(); }}>
                                ×
                            </button>
                        )}
                    </div>
                </div>

                {/* Token chips (only for first command if single, or hide if batch to avoid clutter) */}
                {hasTokens && !isBatch && (
                    <div className="cmd-chips">
                        {parsed.tokens.map((token, i) => (
                            <span
                                key={i}
                                className="cmd-chip"
                                style={{ '--chip-color': TOKEN_COLORS[token.type] } as React.CSSProperties}
                            >
                                {tokenLabel(token, goals, projects)}
                                <button
                                    className="cmd-chip__dismiss"
                                    onClick={() => dismissToken(token.raw)}
                                    title="Remove — treat as title text"
                                >×</button>
                            </span>
                        ))}
                    </div>
                )}

                {/* Preview card — shown after first Enter */}
                {confirmed && input.trim() && (
                    <div className="cmd-preview animate-fade-in-up">
                        <div className="cmd-preview__header">
                            <span className="cmd-preview__label">
                                {isBatch ? `Creating ${parsedBatch.length} items` : `Creating ${typeLabel}`}
                            </span>
                            <span className="cmd-preview__hint">↵ confirm · Esc cancel</span>
                        </div>
                        
                        {!isBatch ? (
                            <>
                                <div className="cmd-preview__title">{parsed.title || '(no title)'}</div>
                                <div className="cmd-preview__meta">
                                    {parsed.date && (
                                        <span className="cmd-preview__chip cmd-preview__chip--date">
                                            📅 {formatParsedDate(parsed.date)}
                                        </span>
                                    )}
                                    {parsed.time && (
                                        <span className="cmd-preview__chip cmd-preview__chip--time">
                                            🕐 {formatParsedTime(parsed.time)}
                                        </span>
                                    )}
                                    {parsed.duration && (
                                        <span className="cmd-preview__chip cmd-preview__chip--duration">
                                            ⏱ {formatDuration(parsed.duration)}
                                        </span>
                                    )}
                                    {parsed.priority && parsed.priority !== 'medium' && (
                                        <span className="cmd-preview__chip cmd-preview__chip--priority">
                                            {parsed.priority === 'high' ? '!!' : '!'} {parsed.priority}
                                        </span>
                                    )}
                                    {linkedGoal && (
                                        <span className="cmd-preview__chip cmd-preview__chip--goal">
                                            {linkedGoal.icon} {linkedGoal.title}
                                        </span>
                                    )}
                                    {linkedProject && (
                                        <span className="cmd-preview__chip cmd-preview__chip--project">
                                            {linkedProject.icon} {linkedProject.name}
                                        </span>
                                    )}
                                    {parsed.recurrence && (
                                        <span className="cmd-preview__chip cmd-preview__chip--recurrence">
                                            ↻ {parsed.recurrence}
                                        </span>
                                    )}
                                    {parsed.tagIds.length > 0 && parsed.tagIds.map(tag => (
                                        <span key={tag} className="cmd-preview__chip cmd-preview__chip--tag">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="cmd-preview__batch-list">
                                {parsedBatch.slice(0, 5).map((p, i) => (
                                    <div key={i} className="cmd-preview__batch-item">
                                        <span className="cmd-preview__batch-type">{p.type}</span>
                                        <span className="cmd-preview__batch-title">{p.title || '(no title)'}</span>
                                    </div>
                                ))}
                                {parsedBatch.length > 5 && (
                                    <div className="cmd-preview__batch-more">
                                        + {parsedBatch.length - 5} more...
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="cmd-preview__actions">
                            <button className="cmd-preview__confirm" onClick={handleCommit}>
                                ✓ Confirm All
                            </button>
                            <button className="cmd-preview__cancel" onClick={() => setConfirmed(false)}>
                                Edit
                            </button>
                        </div>
                    </div>
                )}

                {/* Hint bar */}
                {!confirmed && (
                    <div className="cmd-hints">
                        <span className="cmd-hints__prefix">batch with ; or newlines</span>
                        <span className="cmd-hints__sep">·</span>
                        <span className="cmd-hints__prefix">Cmd+↵</span><span>skip preview</span>
                        <span className="cmd-hints__sep">·</span>
                        <span className="cmd-hints__prefix">#t</span><span>task</span>
                        <span className="cmd-hints__sep">·</span>
                        <span className="cmd-hints__prefix">#h</span><span>habit</span>
                        <span className="cmd-hints__sep">·</span>
                        <span>tomorrow 3pm</span>
                        <span className="cmd-hints__sep">·</span>
                        <span>@goal</span>
                    </div>
                )}
            </div>
        </div>
    );
}
