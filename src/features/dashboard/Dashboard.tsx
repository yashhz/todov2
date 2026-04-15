/* ═══════════════════════════════════════════════════════════
   DASHBOARD — Editorial layout: Anchor + Day Score sidebar
   ═══════════════════════════════════════════════════════════ */

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { useTasks, useGoals, useHabits, useProjects } from '../../hooks/useStore';
import {
    isHabitCompletedOnDate,
    isHabitDueOnDate,
    formatDateStr,
} from '../../services/recurrence';
import Modal from '../../components/Modal';
import { SmartInput } from '../../components/SmartInput';
import { Settings, Circle, Star, Layout as LayoutIcon, Eye, EyeOff } from 'lucide-react';
import type { Goal, Task, Habit, DashboardSection, ParsedCommand } from '../../types';
import './Dashboard.css';

// ─── Helpers ──────────────────────────────────────

function getGreeting(userName: string): { period: string; greeting: string; sub: string } {
    const h = new Date().getHours();
    const name = userName ? `, ${userName}` : '';
    if (h < 5)  return { period: 'Late night.',      greeting: `Still up${name}.`,         sub: 'The night belongs to you.' };
    if (h < 12) return { period: 'Morning briefing.', greeting: `Good morning${name}.`,    sub: "Let's see what today holds." };
    if (h < 17) return { period: 'Midday check-in.',  greeting: `Good afternoon${name}.`,  sub: 'How is the day shaping up?' };
    if (h < 21) return { period: 'Evening wind-down.', greeting: `Good evening${name}.`,   sub: 'How did the day go?' };
    return              { period: 'Late night.',       greeting: `Winding down${name}.`,    sub: 'One last look before tomorrow.' };
}

function formatTime12(time: string): string {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function formatDateFull(): string {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ─── Arc progress (used for anchor goal) ──────────

function ArcProgress({ progress, color, size = 72 }: { progress: number; color: string; size?: number }) {
    const r = (size - 8) / 2;
    const circ = 2 * Math.PI * r;
    const offset = circ - (progress / 100) * circ;
    const cx = size / 2;
    return (
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
            <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
            <circle
                cx={cx} cy={cx} r={r} fill="none"
                stroke={color} strokeWidth={4}
                strokeDasharray={circ}
                strokeDashoffset={offset}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.4,0,.2,1)' }}
            />
        </svg>
    );
}


// ─── Today Timeline ────────────────────────────────
function TimelineRow({ task, projectColor, onToggle }: { task: Task; projectColor: string; onToggle: () => void }) {
    return (
        <div className={`d-timeline-row ${task.completed ? 'd-timeline-row--done' : ''}`} onClick={onToggle}>
            <div className="d-timeline-time">
                {task.dueTime ? formatTime12(task.dueTime) : 'Anytime'}
            </div>
            <div className="d-timeline-content">
                <div className={`d-task-check ${task.completed ? 'd-task-check--done' : ''}`}>
                    {task.completed && (
                        <svg width="8" height="7" viewBox="0 0 8 7" fill="none">
                            <path d="M1 3.5L3 5.5L7 1" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    )}
                </div>
                <div className="d-task-main">
                    <div className="d-task-bar" style={{ background: projectColor }} />
                    <span className="d-task-title">{task.title}</span>
                    {task.duration && <span className="d-timeline-duration">{task.duration}m</span>}
                </div>
            </div>
        </div>
    );
}

// ─── Habit row — name + 7-day inline dots ─────────

function HabitRow({ habit, weekDates, todayStr, onToggle }: {
    habit: Habit;
    weekDates: Date[];
    todayStr: string;
    onToggle: (date: string) => void;
}) {
    const DAY_LABELS = ['M','T','W','T','F','S','S'];
    const isDoneToday = isHabitCompletedOnDate(habit, todayStr);

    return (
        <div className={`d-habit-row ${isDoneToday ? 'd-habit-row--done' : ''}`}>
            <div className="d-habit-left">
                <div className="d-habit-accent" style={{ background: habit.color }} />
                <div className="d-habit-info">
                    <span className="d-habit-name">{habit.title}</span>
                    {habit.streak > 0 && (
                        <span className="d-habit-streak">
                            <strong>{habit.streak}</strong>d
                        </span>
                    )}
                </div>
            </div>
            <div className="d-habit-dots">
                {weekDates.map((date) => {
                    const dStr = formatDateStr(date);
                    const isDone = isHabitCompletedOnDate(habit, dStr);
                    const isToday = dStr === todayStr;
                    const isDue = isHabitDueOnDate(habit, date);
                    const dayIdx = date.getDay(); // 0=Sun
                    const label = DAY_LABELS[dayIdx === 0 ? 6 : dayIdx - 1];
                    return (
                        <div key={dStr} className="d-dot-wrap">
                            <div
                                className={`d-dot ${isDone ? 'd-dot--done' : ''} ${isToday ? 'd-dot--today' : ''} ${!isDue ? 'd-dot--skip' : ''}`}
                                style={isDone ? { background: habit.color, borderColor: habit.color } : {}}
                                onClick={(e) => { e.stopPropagation(); onToggle(dStr); }}
                            />
                            <span className="d-dot-label">{label}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Pinned Goal Anchor ────────────────────────────

function PinnedGoal({ goal, progress, taskCount, onPinClick }: { goal: Goal; progress: number; taskCount: number; onPinClick?: () => void }) {
    const daysSince = goal.entries.length > 0
        ? Math.floor((Date.now() - new Date(goal.entries.at(-1)!.date).getTime()) / 86400000)
        : null;

    return (
        <div className="d-anchor">
            <div className="d-anchor__header">
                <p className="d-anchor__label">Today's anchor</p>
                <button className="d-anchor__pin-btn" onClick={onPinClick} title="Change anchor">
                    <Star size={12} />
                </button>
            </div>
            <div className="d-anchor__body">
                <div className="d-anchor__arc">
                    <ArcProgress progress={progress} color={goal.color} size={64} />
                    <div className="d-anchor__arc-label">
                        <span className="d-anchor__arc-pct">{Math.round(progress)}</span>
                        <span className="d-anchor__arc-sym">%</span>
                    </div>
                </div>
                <div className="d-anchor__text">
                    <h2 className="d-anchor__name">{goal.icon} {goal.title}</h2>
                    {goal.why && <p className="d-anchor__why">{goal.why}</p>}
                    <div className="d-anchor__stats">
                        <div className="d-anchor__stat">
                            <p className="d-anchor__stat-label">Tasks</p>
                            <p className="d-anchor__stat-val">{taskCount}</p>
                        </div>
                        {daysSince !== null && (
                            <>
                                <div className="d-anchor__divider" />
                                <div className="d-anchor__stat">
                                    <p className="d-anchor__stat-label">Since log</p>
                                    <p className="d-anchor__stat-val">
                                        {daysSince === 0 ? '0d' : `${daysSince}d`}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Dashboard ────────────────────────────────────

const DEFAULT_SECTIONS: DashboardSection[] = [
    { id: 'greeting', visible: true, order: 0 },
    { id: 'overdue', visible: true, order: 1 },
    { id: 'anchor', visible: true, order: 2 },
    { id: 'tasks', visible: true, order: 3 },
    { id: 'habits', visible: true, order: 4 },
    { id: 'score', visible: true, order: 5 },
    { id: 'linked', visible: true, order: 6 },
    { id: 'goals', visible: true, order: 7 },
];

export default function Dashboard() {
    const { state, dispatch } = useAppContext();
    const { tasks, toggleTask, addTask } = useTasks();
    const { goals, logProgress, getAggregateProgress, getParentGoals } = useGoals();
    const { habits, toggleHabitToday, toggleHabit, addHabit } = useHabits();
    const { projects } = useProjects();
    const navigate = useNavigate();
    
    const [progressModal, setProgressModal] = useState<string | null>(null);
    const [progressInput, setProgressInput] = useState('');
    const [configModal, setConfigModal] = useState(false);
    const [todayState, setTodayState] = useState(new Date());

    const todayStr = useMemo(() => formatDateStr(todayState), [todayState]);

    // Auto-refresh date at midnight or on focus
    useEffect(() => {
        const checkDate = () => {
            const now = new Date();
            if (formatDateStr(now) !== todayStr) {
                setTodayState(now);
            }
        };
        const interval = setInterval(checkDate, 60000); // Check every minute
        window.addEventListener('focus', checkDate);
        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', checkDate);
        };
    }, [todayStr]);

    const userName = state.preferences?.userName || '';
    const { period, greeting } = getGreeting(userName);
    const parentGoals = useMemo(() => getParentGoals(), [getParentGoals, goals]);

    const parentGoalsProgress = useMemo(() => {
        const progressMap = new Map<string, ReturnType<typeof getAggregateProgress>>();
        parentGoals.forEach(g => {
            progressMap.set(g.id, getAggregateProgress(g.id));
        });
        return progressMap;
    }, [parentGoals, getAggregateProgress, state.tasks]);

    // User Preferences
    const prefs = state.preferences || { pinnedGoalId: null, dashboardSections: DEFAULT_SECTIONS };
    const sections = useMemo(() => {
        const s = [...(prefs.dashboardSections || DEFAULT_SECTIONS)];
        // Ensure all default sections exist
        DEFAULT_SECTIONS.forEach(ds => {
            if (!s.find(sec => sec.id === ds.id)) s.push(ds);
        });
        return s.sort((a, b) => a.order - b.order);
    }, [prefs.dashboardSections]);

    // Build last 7 days for habit dots
    const weekDates = useMemo(() => {
        const dates: Date[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(todayState);
            d.setDate(d.getDate() - i);
            dates.push(d);
        }
        return dates;
    }, [todayState]);

    // Data Filtering - Optimized useMemo
    const allTodayTasks  = useMemo(() => tasks.filter(t => t.dueDate === todayStr), [tasks, todayStr]);
    const completedTasks = useMemo(() => allTodayTasks.filter(t => t.completed), [allTodayTasks]);
    const overdueTasks   = useMemo(() => tasks.filter(t => t.dueDate && t.dueDate < todayStr && !t.completed), [tasks, todayStr]);
    const todayHabits    = useMemo(() => habits.filter(h => isHabitDueOnDate(h, todayState)), [habits, todayState]);
    const doneHabitsCount = useMemo(() => todayHabits.filter(h => isHabitCompletedOnDate(h, todayStr)).length, [todayHabits, todayStr]);

    // Day score
    const totalThings = allTodayTasks.length + todayHabits.length;
    const doneThings  = completedTasks.length + doneHabitsCount;
    const dayScore    = totalThings > 0 ? Math.round((doneThings / totalThings) * 100) : 0;
    const leftThings  = totalThings - doneThings;

    // Pick anchor goal
    const anchorGoal = useMemo(() => {
        if (parentGoals.length === 0) return null;
        
        // Priority 1: Pinned goal
        if (prefs.pinnedGoalId) {
            const pinned = parentGoals.find(g => g.id === prefs.pinnedGoalId);
            if (pinned) {
                const count = tasks.filter(t => t.dueDate === todayStr && (t.goalLinks?.some(l => l.goalId === pinned.id) || t.linkedGoalId === pinned.id)).length;
                return { goal: pinned, count };
            }
        }

        // Priority 2: Goal with most tasks today
        const scored = parentGoals.map(g => ({
            goal: g,
            count: tasks.filter(t => t.dueDate === todayStr && (t.goalLinks?.some(l => l.goalId === g.id) || t.linkedGoalId === g.id)).length,
        }));
        scored.sort((a, b) => b.count - a.count);
        return scored[0];
    }, [parentGoals, tasks, todayStr, prefs.pinnedGoalId]);

    const anchorLinkedTasks = useMemo(() => {
        if (!anchorGoal) return [];
        return tasks.filter(t =>
            t.goalLinks?.some(l => l.goalId === anchorGoal.goal.id) ||
            t.linkedGoalId === anchorGoal.goal.id
        );
    }, [tasks, anchorGoal]);

    // Project lookup for task color bars
    function getProjectColor(task: Task): string {
        if (task.projectId) {
            return projects.find(p => p.id === task.projectId)?.color || 'rgba(255,255,255,0.2)';
        }
        return 'rgba(255,255,255,0.2)';
    }

    function handleLogProgress(goalId: string) {
        const val = parseFloat(progressInput);
        if (!isNaN(val) && val > 0) {
            logProgress(goalId, val);
            setProgressModal(null);
            setProgressInput('');
        }
    }

    function toggleSection(id: string) {
        const newSections = sections.map(s => s.id === id ? { ...s, visible: !s.visible } : s);
        dispatch({ type: 'UPDATE_PREFERENCES', payload: { dashboardSections: newSections } });
    }

    const isVisible = (id: string) => sections.find(s => s.id === id)?.visible !== false;

    const handleSmartInputSubmit = useCallback((commands: ParsedCommand[]) => {
        commands.forEach(p => {
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
                    dueDate: p.date || todayStr,
                    dueTime: p.time,
                    duration: p.duration,
                    priority: p.priority ?? 'medium',
                    linkedGoalId: p.goalId,
                    projectId: p.projectId,
                    tags: p.tagIds,
                });
            }
        });
    }, [addTask, addHabit, navigate, todayStr]);

    return (
        <div className="dashboard page-enter">

            {/* ── Top bar ─────────────────────────────── */}
            <div className="d-topbar">
                <div className="d-topbar__left">
                    <span className="d-topbar__period">{period}</span>
                    <div className="d-topbar__sep" />
                    <span className="d-topbar__date">{formatDateFull()}</span>
                </div>
                <div className="d-topbar__right">
                    <div className={`d-topbar__status ${leftThings === 0 && totalThings > 0 ? 'd-topbar__status--done' : ''}`}>
                        {totalThings === 0
                            ? 'Nothing scheduled'
                            : leftThings === 0
                            ? 'All done today ✦'
                            : `${leftThings} thing${leftThings !== 1 ? 's' : ''} left`
                        }
                    </div>
                    <button className="d-topbar__config" onClick={() => setConfigModal(true)}>
                        <Settings size={16} />
                    </button>
                </div>
            </div>

            {/* ── Two-column layout ────────────────────── */}
            <div className="d-layout">

                {/* ── MAIN COLUMN ─────────────────────────── */}
                <div className="d-main">

                    {isVisible('greeting') && (
                        <div className="d-greeting">
                            <h1 className="d-greeting__line">{greeting}</h1>
                        </div>
                    )}

                    {isVisible('overdue') && overdueTasks.length > 0 && (
                        <div className="d-overdue">
                            <span className="d-overdue__dot" />
                            <span>{overdueTasks.length} overdue task{overdueTasks.length !== 1 ? 's' : ''} — worth a look</span>
                        </div>
                    )}

                    <div style={{ marginBottom: 'var(--sp-6)' }}>
                         <SmartInput onSubmit={handleSmartInputSubmit} />
                    </div>

                    <div className="d-workspace">
                        {isVisible('tasks') && (
                            <div className="d-col">
                                <div className="d-col__head">
                                    <span className="d-col__label">Today's Timeline</span>
                                    <span className="d-col__count">{completedTasks.length}/{allTodayTasks.length}</span>
                                </div>

                                <div className="d-col__scroll">
                                    {allTodayTasks.length === 0 ? (
                                        <p className="d-empty">No tasks for today.</p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {[...allTodayTasks].sort((a, b) => {
                                                if (!a.dueTime) return 1;
                                                if (!b.dueTime) return -1;
                                                return a.dueTime.localeCompare(b.dueTime);
                                            }).map(t => (
                                                <TimelineRow key={t.id} task={t} projectColor={getProjectColor(t)} onToggle={() => toggleTask(t.id)} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {isVisible('habits') && (
                            <div className="d-col">
                                <div className="d-col__head">
                                    <span className="d-col__label">Daily routines</span>
                                    <span className="d-col__count">{doneHabitsCount}/{todayHabits.length}</span>
                                </div>

                                <div className="d-col__scroll">
                                    {todayHabits.length === 0 ? (
                                        <p className="d-empty">No habits due today.</p>
                                    ) : (
                                        todayHabits.map(h => (
                                            <HabitRow
                                                key={h.id}
                                                habit={h}
                                                weekDates={weekDates}
                                                todayStr={todayStr}
                                                onToggle={(date) => date === todayStr ? toggleHabitToday(h.id) : toggleHabit(h.id, date)}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── SIDEBAR ─────────────────────────────── */}
                <aside className="d-sidebar">
                    {isVisible('anchor') && anchorGoal && (
                        <PinnedGoal
                            goal={anchorGoal.goal}
                            progress={getAggregateProgress(anchorGoal.goal.id).percent}
                            taskCount={anchorGoal.count}
                            onPinClick={() => setConfigModal(true)}
                        />
                    )}

                    {isVisible('score') && (
                        <div className="d-sidebar-block d-sidebar-block--score">
                            <p className="d-sidebar-label">Day score</p>
                            <div className="d-score">
                                <span className="d-score__num">{dayScore}</span>
                                <span className="d-score__denom">/ 100</span>
                            </div>
                            <div className="d-score-bar">
                                <div className="d-score-bar__fill" style={{ width: `${dayScore}%` }} />
                            </div>
                            <p className="d-score-note">{doneThings} of {totalThings} things done</p>
                        </div>
                    )}

                    {isVisible('linked') && anchorGoal && (
                        <div className="d-sidebar-block">
                            <p className="d-sidebar-label">Linked to anchor</p>
                            {anchorLinkedTasks
                                .slice(0, 10)
                                .map(t => (
                                    <div key={t.id} className={`d-linked-task ${t.completed ? 'd-linked-task--done' : ''}`} onClick={() => toggleTask(t.id)}>
                                        <div className="d-linked-task__dot" style={{ background: t.completed ? 'rgba(255,255,255,0.15)' : anchorGoal.goal.color }} />
                                        <span className="d-linked-task__title">{t.title}</span>
                                    </div>
                                ))}
                            {anchorLinkedTasks.length === 0 && (
                                <p className="d-empty" style={{ fontSize: '12px' }}>No tasks linked.</p>
                            )}
                        </div>
                    )}

                    {isVisible('goals') && parentGoals.length > 0 && (
                        <div className="d-sidebar-block">
                            <p className="d-sidebar-label">All goals</p>
                            <div className="d-goal-list">
                                {parentGoals.map(g => {
                                    const agg = parentGoalsProgress.get(g.id) || { percent: 0, isUmbrella: false };
                                    const pct = agg.percent;
                                    const canLog = !agg.isUmbrella && g.targetValue !== null && pct < 100;
                                    return (
                                        <div key={g.id} className="d-goal-row">
                                            <div className="d-goal-row__top">
                                                <span className="d-goal-row__name">{g.icon} {g.title}</span>
                                                <div className="d-goal-row__right">
                                                    {canLog && (
                                                        <button
                                                            className="d-goal-row__log"
                                                            onClick={() => { setProgressModal(g.id); setProgressInput(''); }}
                                                        >
                                                            +
                                                        </button>
                                                    )}
                                                    <span className="d-goal-row__pct">{Math.round(pct)}%</span>
                                                </div>
                                            </div>
                                            <div className="d-goal-row__bar">
                                                <div className="d-goal-row__fill" style={{ width: `${pct}%`, background: g.color }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </aside>
            </div>

            {/* Dashboard Configuration Modal */}
            <Modal isOpen={configModal} onClose={() => setConfigModal(false)} title="Dashboard Settings" size="md">
                <div className="d-config">
                    <div className="d-config__section">
                        <h3 className="d-config__h3">Anchor Goal</h3>
                        <p className="d-config__p">Choose which goal to highlight as today's anchor.</p>
                        <div className="d-config__goal-grid">
                            <button 
                                className={`d-config__goal-btn ${!prefs.pinnedGoalId ? 'd-config__goal-btn--active' : ''}`}
                                onClick={() => dispatch({ type: 'UPDATE_PREFERENCES', payload: { pinnedGoalId: null } })}
                            >
                                <Circle size={14} /> <span>Auto (Most Tasks)</span>
                            </button>
                            {parentGoals.map(g => (
                                <button 
                                    key={g.id}
                                    className={`d-config__goal-btn ${prefs.pinnedGoalId === g.id ? 'd-config__goal-btn--active' : ''}`}
                                    onClick={() => dispatch({ type: 'UPDATE_PREFERENCES', payload: { pinnedGoalId: g.id } })}
                                    style={prefs.pinnedGoalId === g.id ? { borderColor: g.color, color: g.color } : {}}
                                >
                                    <span>{g.icon} {g.title}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="d-config__section">
                        <h3 className="d-config__h3">Sections Visibility</h3>
                        <div className="d-config__list">
                            {sections.map(s => (
                                <div key={s.id} className="d-config__item" onClick={() => toggleSection(s.id)}>
                                    <div className="d-config__item-left">
                                        <LayoutIcon size={14} />
                                        <span>{s.id.charAt(0).toUpperCase() + s.id.slice(1)}</span>
                                    </div>
                                    {s.visible ? <Eye size={14} className="d-config__eye" /> : <EyeOff size={14} className="d-config__eye--off" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Progress Logger Modal */}
            <Modal isOpen={!!progressModal} onClose={() => setProgressModal(null)} title="Log Progress" size="sm">
                {progressModal && (() => {
                    const goal = goals.find(g => g.id === progressModal);
                    if (!goal || goal.targetValue === null) return null;
                    const remaining = goal.targetValue - goal.currentValue;
                    return (
                        <div className="progress-logger">
                            <div className="progress-logger__goal-info">
                                <span className="progress-logger__goal-icon" style={{ background: goal.color + '20' }}>{goal.icon}</span>
                                <div>
                                    <strong>{goal.title}</strong>
                                    <p className="progress-logger__current">
                                        {goal.currentValue.toLocaleString()} / {goal.targetValue.toLocaleString()} {goal.unit}
                                        {remaining > 0 && <span className="progress-logger__remaining"> · {remaining.toLocaleString()} to go</span>}
                                    </p>
                                </div>
                            </div>
                            <div className="progress-logger__input-section">
                                <label className="progress-logger__label">How many {goal.unit}?</label>
                                <div className="progress-logger__input-wrap">
                                    <input
                                        type="number"
                                        className="progress-logger__input"
                                        value={progressInput}
                                        onChange={e => setProgressInput(e.target.value)}
                                        placeholder="Enter amount"
                                        min="0.01"
                                        step="any"
                                        autoFocus
                                        onKeyDown={e => { if (e.key === 'Enter') handleLogProgress(goal.id); }}
                                    />
                                    <span className="progress-logger__unit">{goal.unit}</span>
                                </div>
                            </div>
                            <button
                                className="progress-logger__submit"
                                onClick={() => handleLogProgress(goal.id)}
                                disabled={!progressInput || parseFloat(progressInput) <= 0}
                                style={{ background: goal.color }}
                            >
                                Log →
                            </button>
                        </div>
                    );
                })()}
            </Modal>
        </div>
    );
}
