/* ═══════════════════════════════════════════════════════════
   TASKS PAGE — Full task management with CRUD, subtasks,
   tags, categories, date/time scheduling
   ═══════════════════════════════════════════════════════════ */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useTasks, useProjects, useGoals } from '../../hooks/useStore';
import { SmartFilter } from '../../components/SmartFilter';
import type { FilterGroupConfig } from '../../components/SmartFilter';
import type { Task, Subtask, TaskPriority, GoalLink } from '../../types';
import { calcPressureScore, getPressureLevel, getPressureLabel } from '../../services/pressureScore';
import { seedDemoData } from '../../services/seeder';
import Modal from '../../components/Modal';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import { Calendar } from 'lucide-react';
import { SmartInput } from '../../components/SmartInput';
import type { ParsedCommand } from '../../types';
import './Tasks.css';

// Format 24h time to 12h with AM/PM
function formatTime12(time: string): string {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

// Get today's date string YYYY-MM-DD in local time
function todayStr(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function tomorrowStr(): string {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateDisplay(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

type FilterType = 'all' | 'active' | 'completed';

// Drum-roll scroll time picker
const ITEM_H = 40; // px per row

function DrumColumn({
    items,
    selected,
    onSelect,
    format,
}: {
    items: number[];
    selected: number;
    onSelect: (v: number) => void;
    format?: (v: number) => string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const fmt = format ?? ((v: number) => String(v));
    const isDragging = useRef(false);
    const startY = useRef(0);
    const startScroll = useRef(0);

    // Scroll to selected item
    const scrollTo = useCallback((idx: number, smooth = true) => {
        if (!ref.current) return;
        ref.current.scrollTo({ top: idx * ITEM_H, behavior: smooth ? 'smooth' : 'instant' });
    }, []);

    useEffect(() => {
        const idx = items.indexOf(selected);
        if (idx >= 0) scrollTo(idx, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Snap on scroll end
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        let timer: ReturnType<typeof setTimeout>;
        const onScroll = () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                const idx = Math.round(el.scrollTop / ITEM_H);
                const clamped = Math.max(0, Math.min(idx, items.length - 1));
                scrollTo(clamped);
                onSelect(items[clamped]);
            }, 80);
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => { el.removeEventListener('scroll', onScroll); clearTimeout(timer); };
    }, [items, onSelect, scrollTo]);

    // Mouse drag
    const onMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        startY.current = e.clientY;
        startScroll.current = ref.current?.scrollTop ?? 0;
        e.preventDefault();
    };
    useEffect(() => {
        const onMove = (e: MouseEvent) => {
            if (!isDragging.current || !ref.current) return;
            ref.current.scrollTop = startScroll.current - (e.clientY - startY.current);
        };
        const onUp = () => { isDragging.current = false; };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    }, []);

    return (
        <div className="drum-col" ref={ref} onMouseDown={onMouseDown}>
            {/* top padding so first item can center */}
            <div className="drum-col__pad" />
            {items.map(v => (
                <div
                    key={v}
                    className={`drum-col__item ${selected === v ? 'drum-col__item--sel' : ''}`}
                    onClick={() => {
                        const idx = items.indexOf(v);
                        scrollTo(idx);
                        onSelect(v);
                    }}
                >
                    {fmt(v)}
                </div>
            ))}
            <div className="drum-col__pad" />
        </div>
    );
}

function InlineTimePicker({ value, onChange }: { value: string; onChange: (t: string) => void }) {
    const parsed = value ? value.split(':').map(Number) : [9, 0];
    const raw24 = parsed[0] ?? 9;
    const curMin = parsed[1] ?? 0;
    const curPeriod: 'AM' | 'PM' = raw24 >= 12 ? 'PM' : 'AM';
    const curH12 = raw24 % 12 || 12;

    const HOURS   = [1,2,3,4,5,6,7,8,9,10,11,12];
    const MINUTES = [0,5,10,15,20,25,30,35,40,45,50,55];
    const PERIODS = [0, 1]; // 0=AM 1=PM

    function emit(h12: number, min: number, period: 'AM' | 'PM') {
        let h24 = h12 % 12;
        if (period === 'PM') h24 += 12;
        onChange(`${String(h24).padStart(2,'0')}:${String(min).padStart(2,'0')}`);
    }

    return (
        <div className="drum-wrap">
            {/* selection band */}
            <div className="drum-band" />

            <DrumColumn
                items={HOURS}
                selected={curH12}
                onSelect={h => emit(h, curMin, curPeriod)}
            />

            <span className="drum-sep">:</span>

            <DrumColumn
                items={MINUTES}
                selected={curMin}
                onSelect={m => emit(curH12, m, curPeriod)}
                format={v => String(v).padStart(2,'0')}
            />

            <DrumColumn
                items={PERIODS}
                selected={curPeriod === 'AM' ? 0 : 1}
                onSelect={p => emit(curH12, curMin, p === 0 ? 'AM' : 'PM')}
                format={v => v === 0 ? 'AM' : 'PM'}
            />
        </div>
    );
}

// Minimal inline calendar
function InlineCalendar({ value, onChange }: { value: string; onChange: (d: string) => void }) {
    const today = new Date();
    const [viewYear, setViewYear] = useState(value ? new Date(value + 'T00:00:00').getFullYear() : today.getFullYear());
    const [viewMonth, setViewMonth] = useState(value ? new Date(value + 'T00:00:00').getMonth() : today.getMonth());

    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const todayISO = todayStr();

    const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
    // pad to full rows
    while (cells.length % 7 !== 0) cells.push(null);

    const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    function cellDate(day: number): string {
        return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    function prev() {
        if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
        else setViewMonth(m => m - 1);
    }
    function next() {
        if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
        else setViewMonth(m => m + 1);
    }

    return (
        <div className="tf-cal">
            <div className="tf-cal__nav">
                <button type="button" className="tf-cal__nav-btn" onClick={prev}>‹</button>
                <span className="tf-cal__month">{monthName}</span>
                <button type="button" className="tf-cal__nav-btn" onClick={next}>›</button>
            </div>
            <div className="tf-cal__grid">
                {['S','M','T','W','T','F','S'].map((d, i) => (
                    <span key={i} className="tf-cal__dow">{d}</span>
                ))}
                {cells.map((day, i) => {
                    if (!day) return <span key={i} />;
                    const iso = cellDate(day);
                    const isSelected = iso === value;
                    const isToday = iso === todayISO;
                    const isPast = iso < todayISO;
                    return (
                        <button
                            key={i}
                            type="button"
                            className={`tf-cal__day ${isSelected ? 'tf-cal__day--sel' : ''} ${isToday && !isSelected ? 'tf-cal__day--today' : ''} ${isPast ? 'tf-cal__day--past' : ''}`}
                            onClick={() => onChange(iso)}
                        >{day}</button>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Exact Border Path like Card.tsx ──────────────────────────────
function TaskBorder({ completed }: { completed: boolean }) {
    const containerRef = useRef<SVGSVGElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        if (!containerRef.current) return;
        const parent = containerRef.current.parentElement;
        if (!parent) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height });
            }
        });
        resizeObserver.observe(parent);
        return () => resizeObserver.disconnect();
    }, []);

    const { width, height } = dimensions;
    const r = 12; // matching var(--radius-md)
    const sw = 1.5; 
    const off = sw / 2;
    const w = width - sw;
    const h = height - sw;

    const pathData = width > 0 ? `
      M ${off},${r + off}
      A ${r},${r} 0 0 1 ${r + off},${off}
      H ${w - r + off} 
      A ${r},${r} 0 0 1 ${w + off},${r + off} 
      V ${h - r + off} 
      A ${r},${r} 0 0 1 ${w - r + off},${h + off} 
      H ${r + off} 
      A ${r},${r} 0 0 1 ${off},${h - r + off} 
      V ${r + off}
      Z
    ` : '';

    return (
        <svg ref={containerRef} width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible', zIndex: 10 }}>
            {width > 0 && (
                <path
                    d={pathData}
                    pathLength="100"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={sw}
                    strokeLinecap="round"
                    strokeDasharray={`${completed ? 100 : 0} 100`}
                    style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.16, 1, 0.3, 1)' }}
                />
            )}
        </svg>
    );
}

export default function TasksPage() {
    const { tasks, addTask, updateTask, deleteTask, toggleTask: storeToggleTask, toggleSubtask } = useTasks();
    const { projects } = useProjects();
    const { goals } = useGoals();

    const [filterStatus, setFilterStatus] = useState<FilterType>('all');
    const [selectedFilterProjects, setSelectedFilterProjects] = useState<string[]>([]);
    const [selectedFilterGoals, setSelectedFilterGoals] = useState<string[]>([]);
    const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState<string | null>(null);

    useKeyboardShortcut('n', () => { resetForm(); setShowForm(true); });
    const [showForm, setShowForm] = useState(false);
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [animatingTaskIds, setAnimatingTaskIds] = useState<Set<string>>(new Set());
    const [quickRescheduleTask, setQuickRescheduleTask] = useState<string | null>(null);

    // Filter states
    const toggleTask = (id: string) => {
        const t = tasks.find(x => x.id === id);
        if (t && !t.completed) {
            setAnimatingTaskIds(prev => new Set(prev).add(id));
            setTimeout(() => {
                setAnimatingTaskIds(prev => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
            }, 1000);
        }
        storeToggleTask(id);
    };

    // All unique tags across all tasks
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        tasks.forEach(t => t.tags?.forEach(tag => tags.add(tag)));
        return Array.from(tags).sort();
    }, [tasks]);

    function toggleTagFilter(tag: string) {
        setSelectedFilterTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    }

    // Form state
    const [formTitle, setFormTitle] = useState('');
    const [formDate, setFormDate] = useState('');
    const [formTime, setFormTime] = useState('');
    const [formPriority, setFormPriority] = useState<TaskPriority | null>(null);
    const [formGoalLinks, setFormGoalLinks] = useState<GoalLink[]>([]);
    const [formDuration, setFormDuration] = useState<string>('');
    const [formProjectId, setFormProjectId] = useState<string | null>(null);
    const [titleShake, setTitleShake] = useState(false);
    const [showCalendar, setShowCalendar] = useState(false);
    const [goalSearch, setGoalSearch] = useState('');
    const [showGoalSearch, setShowGoalSearch] = useState(false);
    const [projectSearch, setProjectSearch] = useState('');
    const [showProjectSearch, setShowProjectSearch] = useState(false);
    // Keep these for edit compat (not shown in new form but preserved on edit)
    const [formDesc, setFormDesc] = useState('');
    const [formTags, setFormTags] = useState<string[]>([]);
    const [formSubtasks, setFormSubtasks] = useState<Subtask[]>([]);

    const filteredTasks = useMemo(() => {
        let result = tasks;
        
        // Status filter
        if (filterStatus === 'active') result = result.filter(t => !t.completed);
        if (filterStatus === 'completed') result = result.filter(t => t.completed);
        
        // Project filter
        if (selectedFilterProjects.length > 0) {
            result = result.filter(t => selectedFilterProjects.includes(t.projectId || t.categoryId || ''));
        }
        
        // Goal filter
        if (selectedFilterGoals.length > 0) {
            result = result.filter(t => {
                const taskGoalIds = t.goalLinks?.map(l => l.goalId) || (t.linkedGoalId ? [t.linkedGoalId] : []);
                return selectedFilterGoals.some(id => taskGoalIds.includes(id));
            });
        }
        
        // Tag filter
        if (selectedFilterTags.length > 0) {
            result = result.filter(t => selectedFilterTags.every(tag => t.tags?.includes(tag)));
        }

        return [...result].sort((a, b) => {
            // Animating task stays at top during the sweet transition
            const scoreA = animatingTaskIds.has(a.id) ? calcPressureScore({ ...a, completed: false }, goals) : calcPressureScore(a, goals);
            const scoreB = animatingTaskIds.has(b.id) ? calcPressureScore({ ...b, completed: false }, goals) : calcPressureScore(b, goals);
            return scoreB - scoreA;
        });
    }, [tasks, filterStatus, selectedFilterProjects, selectedFilterGoals, selectedFilterTags, goals, animatingTaskIds]);
    
    const activeFilterCount = (selectedFilterProjects.length > 0 ? 1 : 0) + 
                             (selectedFilterGoals.length > 0 ? 1 : 0) + 
                             (selectedFilterTags.length > 0 ? 1 : 0) +
                             (filterStatus !== 'all' ? 1 : 0);

    const filterGroups: FilterGroupConfig[] = [
        {
            id: 'status',
            type: 'single',
            selected: filterStatus,
            onSelect: (v) => setFilterStatus(v as FilterType),
            getTriggerLabel: (v) => v as string,
            suffixText: ' tasks ',
            options: (['all', 'active', 'completed'] as FilterType[]).map(s => ({
                id: s,
                label: s.charAt(0).toUpperCase() + s.slice(1)
            }))
        },
        {
            id: 'projects',
            type: 'multiple',
            selected: selectedFilterProjects,
            onSelect: (v) => setSelectedFilterProjects(v as string[]),
            prefixText: 'in ',
            getTriggerLabel: (v) => {
                const arr = v as string[];
                if (arr.length === 0) return 'any project';
                if (arr.length === 1) return projects.find(p => p.id === arr[0])?.name || 'Project';
                return `${arr.length} nodes`;
            },
            options: projects.map(p => ({
                id: p.id,
                label: p.name,
                color: p.color
            }))
        },
        {
            id: 'goals',
            type: 'multiple',
            selected: selectedFilterGoals,
            onSelect: (v) => setSelectedFilterGoals(v as string[]),
            prefixText: ' aiming for ',
            getTriggerLabel: (v) => {
                const arr = v as string[];
                if (arr.length === 0) return 'all goals';
                if (arr.length === 1) return goals.find(g => g.id === arr[0])?.title || 'Goal';
                return `${arr.length} targets`;
            },
            options: goals.map(g => ({
                id: g.id,
                label: <>{g.icon} {g.title}</>
            }))
        },
        {
            id: 'tags',
            type: 'multiple',
            selected: selectedFilterTags,
            onSelect: (v) => setSelectedFilterTags(v as string[]),
            prefixText: ' with ',
            getTriggerLabel: (v) => {
                const arr = v as string[];
                if (arr.length === 0) return 'any tags';
                if (arr.length === 1) return `#${arr[0]}`;
                return `${arr.length} tags`;
            },
            options: allTags.map(tag => ({
                id: tag,
                label: `#${tag}`
            }))
        }
    ];

    function resetForm() {
        setFormTitle('');
        setFormDesc('');
        setFormDate('');
        setFormTime('');
        setFormPriority(null);
        setFormProjectId(null);
        setFormTags([]);
        setFormSubtasks([]);
        setFormGoalLinks([]);
        setFormDuration('');
        setShowCalendar(false);
        setGoalSearch('');
        setShowGoalSearch(false);
        setProjectSearch('');
        setShowProjectSearch(false);
        setEditingTask(null);
    }

    function openNew() {
        resetForm();
        setShowForm(true);
    }

    function openEdit(task: Task) {
        setEditingTask(task);
        setFormTitle(task.title);
        setFormDesc(task.description);
        setFormDate(task.dueDate || '');
        setFormTime(task.dueTime || '');
        setFormPriority(task.priority);
        setFormProjectId(task.projectId ?? task.categoryId ?? null);
        setFormTags(task.tags);
        setFormSubtasks(task.subtasks);
        setFormGoalLinks(
            task.goalLinks?.length
                ? task.goalLinks
                : (task.linkedGoalId && task.contributionValue
                    ? [{ goalId: task.linkedGoalId, contributionValue: task.contributionValue }]
                    : [])
        );
        setFormDuration(task.duration ? String(task.duration) : '');
        setShowCalendar(false);
        setGoalSearch('');
        setShowGoalSearch(false);
        setProjectSearch('');
        setShowProjectSearch(false);
        setShowForm(true);
    }

    function handleSubmit() {
        if (!formTitle.trim()) {
            setTitleShake(true);
            setTimeout(() => setTitleShake(false), 500);
            return;
        }
        const duration = Number(formDuration) > 0 ? Number(formDuration) : null;
        const priority: TaskPriority = formPriority ?? 'medium';
        if (editingTask) {
            updateTask({
                ...editingTask,
                title: formTitle.trim(),
                description: formDesc.trim(),
                dueDate: formDate || null,
                dueTime: formTime || null,
                duration,
                priority,
                categoryId: null,
                projectId: formProjectId,
                tags: formTags,
                subtasks: formSubtasks,
                linkedGoalId: formGoalLinks[0]?.goalId ?? null,
                contributionValue: formGoalLinks[0]?.contributionValue ?? null,
                goalLinks: formGoalLinks,
            });
        } else {
            addTask({
                title: formTitle.trim(),
                description: formDesc.trim(),
                dueDate: formDate || null,
                dueTime: formTime || null,
                duration,
                priority,
                projectId: formProjectId,
                tags: formTags,
                subtasks: formSubtasks.map(s => ({ title: s.title, completed: false })),
                linkedGoalId: formGoalLinks[0]?.goalId ?? null,
                contributionValue: formGoalLinks[0]?.contributionValue ?? null,
                goalLinks: formGoalLinks,
            });
        }
        setShowForm(false);
        resetForm();
    }

    function handleQuickReschedule(taskId: string, newDate: string) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            updateTask({ ...task, dueDate: newDate });
            setQuickRescheduleTask(null);
        }
    }

    const handleSmartInputSubmit = (commands: ParsedCommand[]) => {
        commands.forEach(p => {
             if (p.type === 'task') {
                 addTask({
                     title: p.title,
                     dueDate: p.date || todayStr(),
                     dueTime: p.time,
                     duration: p.duration,
                     priority: p.priority || 'medium',
                     tags: p.tagIds,
                     projectId: p.projectId,
                     linkedGoalId: p.goalId
                 });
             }
        });
    };

    const activeCount = tasks.filter(t => !t.completed).length;
    const completedCount = tasks.filter(t => t.completed).length;

    return (
        <div className="tasks-page page-enter">
            {/* Header */}
            <div className="tasks-header">
                <div>
                    <h1 className="tasks-title">Tasks</h1>
                    <p className="tasks-subtitle">{activeCount} active · {completedCount} completed</p>
                </div>
                <div className="tasks-header-actions">
                    <button className="tasks-seed-btn" onClick={seedDemoData} title="Populate app with demo data">
                        🌱 Seed Demo
                    </button>
                    <button className="m-add-btn" onClick={() => setShowForm(true)}>
                        <span>+</span> New Task
                    </button>
                </div>
            </div>

            <div style={{ marginBottom: 'var(--sp-6)' }}>
                <SmartInput onSubmit={handleSmartInputSubmit} placeholder="Add a task... (e.g., 'Review presentation tomorrow 10am !high')" />
            </div>

            <SmartFilter
                groups={filterGroups}
                activeGroup={showFilters}
                onToggleGroup={setShowFilters}
                showClearAll={activeFilterCount > 0}
                onClearAll={() => {
                    setSelectedFilterProjects([]);
                    setSelectedFilterGoals([]);
                    setSelectedFilterTags([]);
                    setFilterStatus('all');
                    setShowFilters(null);
                }}
            />

            {/* Task List */}
            <div className="tasks-list">
                {filteredTasks.length === 0 ? (
                    <div className="tasks-empty">
                        <span className="tasks-empty__icon">📝</span>
                        <h3>No tasks yet</h3>
                        <p>Create your first task or seed demo data to test the UI</p>
                        <div className="tasks-empty__actions">
                            <button className="tasks-empty__btn" onClick={openNew}>+ Create Task</button>
                            <button className="tasks-empty__btn tasks-empty__btn--secondary" onClick={seedDemoData}>🌱 Seed Demo Data</button>
                        </div>
                    </div>
                ) : (
                    (() => {
                        const todayDateStr = todayStr();
                        const tomorrowDateStr = tomorrowStr();
                        const nextWeekDate = new Date();
                        nextWeekDate.setDate(nextWeekDate.getDate() + 7);
                        const nextWeekDateStr = `${nextWeekDate.getFullYear()}-${String(nextWeekDate.getMonth() + 1).padStart(2, '0')}-${String(nextWeekDate.getDate()).padStart(2, '0')}`;

                        const groups: Record<string, Task[]> = {
                            'Today': [],
                            'Tomorrow': [],
                            'This Week': [],
                            'Later': [],
                            'Completed': []
                        };

                        filteredTasks.forEach(t => {
                            if (t.completed && !animatingTaskIds.has(t.id)) {
                                groups['Completed'].push(t);
                            } else if (!t.dueDate) {
                                groups['Later'].push(t);
                            } else if (t.dueDate < todayDateStr) {
                                groups['Today'].push(t);
                            } else if (t.dueDate === todayDateStr) {
                                groups['Today'].push(t);
                            } else if (t.dueDate === tomorrowDateStr) {
                                groups['Tomorrow'].push(t);
                            } else if (t.dueDate < nextWeekDateStr) {
                                groups['This Week'].push(t);
                            } else {
                                groups['Later'].push(t);
                            }
                        });

                        // Sort tasks within groups by pressure score (high to low)
                        Object.values(groups).forEach(groupTasks => {
                            groupTasks.sort((a, b) => {
                                const scoreA = animatingTaskIds.has(a.id) ? calcPressureScore({ ...a, completed: false }, goals) : calcPressureScore(a, goals);
                                const scoreB = animatingTaskIds.has(b.id) ? calcPressureScore({ ...b, completed: false }, goals) : calcPressureScore(b, goals);
                                return scoreB - scoreA;
                            });
                        });

                        return Object.entries(groups).map(([groupName, groupTasks]) => {
                            if (groupTasks.length === 0) return null;
                            const isLater = groupName === 'Later';
                            const shouldCollapse = isLater && groupTasks.length > 10;

                            return (
                                <details key={groupName} className="task-group" open={!shouldCollapse}>
                                    <summary className="task-group-header">
                                        {groupName} <span className="task-group-count">{groupTasks.length}</span>
                                    </summary>
                                    <div className="task-group-list stagger-children">
                                        {groupTasks.map(task => {
                                            const project = projects.find(p => p.id === (task.projectId ?? task.categoryId));
                                            const subtasksDone = task.subtasks.filter(s => s.completed).length;
                                            const pressureScore = calcPressureScore(task, goals);
                                            const pressureLevel = getPressureLevel(pressureScore);
                                            const pressureLabel = getPressureLabel(pressureScore);
                                            const isOverdue = !task.completed && task.dueDate && task.dueDate < todayDateStr;
                                            
                                            return (
                                                <div
                                                    key={task.id}
                                                    className={`task-card glass ${task.completed ? 'task-card--done' : ''} ${!task.completed && pressureLevel !== 'low' ? `task-card--pressure-${pressureLevel}` : ''} ${isOverdue ? 'task-card--overdue' : ''}`}
                                                >
                                                    <TaskBorder completed={task.completed} />
                                                    <div className="task-card__body">
                                    <div className="task-card__row">
                                        <div className="task-card__left-col">
                                            <button
                                                className={`task-checkbox ${task.completed ? 'task-checkbox--checked' : ''}`}
                                                onClick={() => toggleTask(task.id)}
                                            >
                                                {task.completed && <span className="check-mark animate-pop-in">✓</span>}
                                            </button>
                                        </div>

                                        <div className="task-card__content-col" onClick={() => openEdit(task)}>
                                            <div className="task-card__title-row">
                                                <span className={`task-card__title ${task.completed ? 'task-card__title--done' : ''}`}>
                                                    {task.title}
                                                </span>
                                                <div className="task-card__badges-inline">
                                                    {!task.completed && pressureLabel && (
                                                        <span className={`task-badge task-badge--pressure-${pressureLevel}`}>
                                                            {pressureLabel}
                                                        </span>
                                                    )}
                                                    {task.priority === 'high' && (
                                                        <span className="task-badge task-badge--high">
                                                            High Priority
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {task.description && (
                                                <p className="task-card__desc">{task.description}</p>
                                            )}
                                        </div>

                                        <div className="task-card__actions">
                                            <button 
                                                className="card__action-btn" 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    setQuickRescheduleTask(quickRescheduleTask === task.id ? null : task.id);
                                                }} 
                                                title="Quick reschedule"
                                                aria-label="Quick reschedule"
                                            >
                                                <Calendar size={14} />
                                            </button>
                                            <button className="card__action-btn card__action-btn--danger" onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} title="Delete" aria-label="Delete task">
                                                ×
                                            </button>
                                        </div>
                                    </div>

                                    {/* Quick Reschedule Popover */}
                                    {quickRescheduleTask === task.id && (
                                        <div className="task-quick-reschedule" onClick={(e) => e.stopPropagation()}>
                                            <button 
                                                className="task-quick-reschedule__btn"
                                                onClick={() => handleQuickReschedule(task.id, todayStr())}
                                            >
                                                Today
                                            </button>
                                            <button 
                                                className="task-quick-reschedule__btn"
                                                onClick={() => handleQuickReschedule(task.id, tomorrowStr())}
                                            >
                                                Tomorrow
                                            </button>
                                            <button 
                                                className="task-quick-reschedule__btn"
                                                onClick={() => {
                                                    const nextWeek = new Date();
                                                    nextWeek.setDate(nextWeek.getDate() + 7);
                                                    const nextWeekStr = `${nextWeek.getFullYear()}-${String(nextWeek.getMonth() + 1).padStart(2, '0')}-${String(nextWeek.getDate()).padStart(2, '0')}`;
                                                    handleQuickReschedule(task.id, nextWeekStr);
                                                }}
                                            >
                                                Next Week
                                            </button>
                                        </div>
                                    )}

                                    {/* Bottom Metadata Strip */}
                                    <div className="task-card__footer">
                                        <div className="task-metadata-strip">
                                            {project && (
                                                <div 
                                                    className={`ms-item ms-item--project ${selectedFilterProjects.includes(project.id) ? 'ms-item--active' : ''}`} 
                                                    style={{ '--ms-color': project.color } as any}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedFilterProjects(prev => 
                                                            prev.includes(project.id) ? prev.filter(id => id !== project.id) : [...prev, project.id]
                                                        );
                                                    }}
                                                >
                                                    <span className="ms-icon">{project.icon}</span>
                                                    <span className="ms-text">{project.name}</span>
                                                </div>
                                            )}

                                            {(task.goalLinks?.length > 0 || task.linkedGoalId) && (
                                                <div className="ms-group">
                                                    {(task.goalLinks?.length > 0 ? task.goalLinks : [{ goalId: task.linkedGoalId!, contributionValue: task.contributionValue || 0 }]).map(link => {
                                                        const g = goals.find(g => g.id === link.goalId);
                                                        if (!g) return null;
                                                        const isActive = selectedFilterGoals.includes(g.id);
                                                        return (
                                                            <div 
                                                                key={link.goalId} 
                                                                className={`ms-item ms-item--goal ${isActive ? 'ms-item--active' : ''}`} 
                                                                style={{ '--ms-color': g.color } as any}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedFilterGoals(prev => 
                                                                        prev.includes(g.id) ? prev.filter(id => id !== g.id) : [...prev, g.id]
                                                                    );
                                                                }}
                                                            >
                                                                <span className="ms-icon">{g.icon || '🎯'}</span>
                                                                <span className="ms-text">{g.title}</span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            {(task.dueDate || task.duration || task.subtasks.length > 0) && (
                                                <div className="ms-item ms-item--time">
                                                    {task.dueDate && (
                                                        <span className="ms-text">
                                                            📅 {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                            {task.dueTime && ` · ${formatTime12(task.dueTime)}`}
                                                        </span>
                                                    )}
                                                    {task.duration && (
                                                        <span className="ms-text ms-text--sep">
                                                            ⏱ {task.duration < 60 ? `${task.duration}m` : `${Math.floor(task.duration / 60)}h${task.duration % 60 ? ` ${task.duration % 60}m` : ''}`}
                                                        </span>
                                                    )}
                                                    {task.subtasks.length > 0 && (
                                                        <span className="ms-text ms-text--sep">
                                                            ☐ {subtasksDone}/{task.subtasks.length}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {task.tags.length > 0 && (
                                                <div className="ms-group ms-group--tags">
                                                    {task.tags.map(tag => (
                                                        <span
                                                            key={tag}
                                                            className={`ms-tag ${selectedFilterTags.includes(tag) ? 'ms-tag--active' : ''}`}
                                                            onClick={(e) => { e.stopPropagation(); toggleTagFilter(tag); }}
                                                        >
                                                            #{tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Subtasks Preview */}
                                {task.subtasks.length > 0 && !task.completed && (
                                    <div className="task-card__subtask-list">
                                        {task.subtasks.map(sub => (
                                            <div
                                                key={sub.id}
                                                className={`task-subtask ${sub.completed ? 'task-subtask--done' : ''}`}
                                                onClick={(e) => { e.stopPropagation(); toggleSubtask(task.id, sub.id); }}
                                            >
                                                <span className={`task-subtask-check ${sub.completed ? 'task-subtask-check--done' : ''}`}>
                                                    {sub.completed && '✓'}
                                                </span>
                                                <span className="task-subtask-title">{sub.title}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                                </div>
                            </details>
                        );
                    });
                })()
                )}
            </div>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={showForm}
                onClose={() => { setShowForm(false); resetForm(); }}
                title={editingTask ? 'Edit Task' : 'New Task'}
                size="md"
            >
                <div className="m-form">
                    {/* ── Title ── */}
                    <div className="m-form__title-wrap">
                        <input
                            type="text"
                            className={`m-form__title ${titleShake ? 'm-form__title--shake' : ''}`}
                            placeholder="What needs to be done?"
                            value={formTitle}
                            onChange={e => setFormTitle(e.target.value)}
                            autoFocus
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) handleSubmit(); }}
                        />
                        <div className="m-form__title-line" />
                    </div>

                    {/* ── Contextual options — fade in once title has content ── */}
                    <div className={`m-form__body ${formTitle.trim() ? 'm-form__body--visible' : ''}`}>

                        {/* Date */}
                        <div className="m-form__section">
                            <div className="m-form__row">
                                <button
                                    type="button"
                                    className={`m-form__pill ${formDate === todayStr() ? 'm-form__pill--active' : ''}`}
                                    onClick={() => { setFormDate(formDate === todayStr() ? '' : todayStr()); setShowCalendar(false); }}
                                >Today</button>
                                <button
                                    type="button"
                                    className={`m-form__pill ${formDate === tomorrowStr() ? 'm-form__pill--active' : ''}`}
                                    onClick={() => { setFormDate(formDate === tomorrowStr() ? '' : tomorrowStr()); setShowCalendar(false); }}
                                >Tomorrow</button>
                                <button
                                    type="button"
                                    className={`m-form__pill ${showCalendar || (formDate && formDate !== todayStr() && formDate !== tomorrowStr()) ? 'm-form__pill--active' : ''}`}
                                    onClick={() => setShowCalendar(v => !v)}
                                >
                                    {formDate && formDate !== todayStr() && formDate !== tomorrowStr()
                                        ? formatDateDisplay(formDate)
                                        : 'Pick date'}
                                </button>
                                {formDate && (
                                    <button type="button" className="m-form__clear-date" onClick={() => { setFormDate(''); setShowCalendar(false); }} style={{background:'transparent', border:'none', color:'rgba(255,255,255,0.25)', cursor:'pointer'}}>×</button>
                                )}
                            </div>

                            {showCalendar && (
                                <div className="m-form__cal-wrap animate-fade-in-up">
                                    <InlineCalendar
                                        value={formDate}
                                        onChange={d => { setFormDate(d); setShowCalendar(false); }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Time — inline picker */}
                        <div className="m-form__section">
                            <div className="m-form__section-row-head" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                <span className="m-form__section-label">Time</span>
                                {formTime && (
                                    <button type="button" className="m-form__time-clear" onClick={() => setFormTime('')} style={{background:'transparent', border:'none', fontSize:'10px', color:'rgba(255,255,255,0.25)', textTransform:'uppercase', cursor:'pointer'}}>
                                        clear
                                    </button>
                                )}
                            </div>
                            <InlineTimePicker value={formTime} onChange={setFormTime} />
                        </div>

                        {/* Duration */}
                        <div className="m-form__section m-form__section--row">
                            <span className="m-form__section-label">Duration</span>
                            <div className="m-form__row">
                                {[15, 30, 60, 90, 120].map(m => (
                                    <button
                                        key={m}
                                        type="button"
                                        className={`m-form__pill m-form__pill--sm ${formDuration === String(m) ? 'm-form__pill--active' : ''}`}
                                        onClick={() => setFormDuration(formDuration === String(m) ? '' : String(m))}
                                    >
                                        {m < 60 ? `${m}m` : `${m / 60}h`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Priority */}
                        <div className="m-form__section m-form__section--row">
                            <span className="m-form__section-label">Priority</span>
                            <div className="m-form__row">
                                {(['low', 'medium', 'high'] as TaskPriority[]).map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        className={`m-form__pill m-form__pill--sm m-form__pill--priority-${p} ${formPriority === p ? 'm-form__pill--active' : ''}`}
                                        onClick={() => setFormPriority(formPriority === p ? null : p)}
                                    >{p}</button>
                                ))}
                            </div>
                        </div>

                        {/* Project link */}
                        <div className="m-form__section m-form__section--goal">
                            <span className="m-form__section-label">Project</span>
                            <div className="m-form__goal-area" style={{display:'flex', flexWrap:'wrap', gap:'8px', alignItems:'center'}}>
                                {formProjectId && (() => {
                                    const p = projects.find(p => p.id === formProjectId);
                                    if (!p) return null;
                                    return (
                                        <span className="m-form__pill m-form__pill--sm" style={{ background: p.color + '18', borderColor: p.color + '55', color: p.color }}>
                                            {p.icon} {p.name}
                                            <button type="button" onClick={() => setFormProjectId(null)} style={{background:'transparent', border:'none', color:'inherit', marginLeft:'6px', cursor:'pointer'}}>×</button>
                                        </span>
                                    );
                                })()}
                                {!formProjectId && projects.length > 0 && (
                                    <div className="m-form__goal-search-wrap" style={{position:'relative', flex:1, minWidth:'150px'}}>
                                        <input
                                            type="text"
                                            style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'16px', padding:'6px 12px', color:'white', fontSize:'12px', width:'100%', outline:'none'}}
                                            placeholder="Assign to project..."
                                            value={projectSearch}
                                            onChange={e => { setProjectSearch(e.target.value); setShowProjectSearch(true); }}
                                            onFocus={() => setShowProjectSearch(true)}
                                            onBlur={() => setTimeout(() => setShowProjectSearch(false), 150)}
                                        />
                                        {showProjectSearch && (
                                            <div className="m-form__goal-dropdown" style={{position:'absolute', top:'100%', left:0, right:0, background:'var(--surface-overlay)', border:'1px solid var(--surface-border)', borderRadius:'var(--radius-lg)', padding:'4px', marginTop:'4px', zIndex:10, maxHeight:'150px', overflowY:'auto'}}>
                                                {projects
                                                    .filter(p => p.status === 'active' && p.name.toLowerCase().includes(projectSearch.toLowerCase()))
                                                    .map(p => (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            style={{display:'flex', alignItems:'center', gap:'8px', width:'100%', padding:'6px 8px', background:'transparent', border:'none', color:'white', borderRadius:'var(--radius-md)', cursor:'pointer', textAlign:'left'}}
                                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                            onMouseDown={() => {
                                                                setFormProjectId(p.id);
                                                                setProjectSearch('');
                                                                setShowProjectSearch(false);
                                                            }}
                                                        >
                                                            <span style={{ color: p.color }}>{p.icon}</span>
                                                            <span style={{fontSize:'13px'}}>{p.name}</span>
                                                        </button>
                                                    ))
                                                }
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Goal link */}
                        <div className="m-form__section m-form__section--goal">
                            <span className="m-form__section-label">Contributes to</span>
                            <div className="m-form__goal-area" style={{display:'flex', flexWrap:'wrap', gap:'8px', alignItems:'center'}}>
                                {formGoalLinks.map(link => {
                                    const g = goals.find(g => g.id === link.goalId);
                                    if (!g) return null;
                                    return (
                                        <span key={link.goalId} className="m-form__pill m-form__pill--sm" style={{color:'var(--text-secondary)'}}>
                                            {g.icon} {g.title}
                                            <button type="button" onClick={() => setFormGoalLinks(formGoalLinks.filter(l => l.goalId !== link.goalId))} style={{background:'transparent', border:'none', color:'inherit', marginLeft:'6px', cursor:'pointer'}}>×</button>
                                        </span>
                                    );
                                })}
                                {formGoalLinks.length < 3 && goals.length > 0 && (
                                    <div className="m-form__goal-search-wrap" style={{position:'relative', flex:1, minWidth:'150px'}}>
                                        <input
                                            type="text"
                                            style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'16px', padding:'6px 12px', color:'white', fontSize:'12px', width:'100%', outline:'none'}}
                                            placeholder="Search goals..."
                                            value={goalSearch}
                                            onChange={e => { setGoalSearch(e.target.value); setShowGoalSearch(true); }}
                                            onFocus={() => setShowGoalSearch(true)}
                                            onBlur={() => setTimeout(() => setShowGoalSearch(false), 150)}
                                        />
                                        {showGoalSearch && (
                                            <div className="m-form__goal-dropdown" style={{position:'absolute', top:'100%', left:0, right:0, background:'var(--surface-overlay)', border:'1px solid var(--surface-border)', borderRadius:'var(--radius-lg)', padding:'4px', marginTop:'4px', zIndex:10, maxHeight:'150px', overflowY:'auto'}}>
                                                {goals
                                                    .filter(g => !formGoalLinks.some(l => l.goalId === g.id) && g.title.toLowerCase().includes(goalSearch.toLowerCase()))
                                                    .map(g => (
                                                        <button
                                                            key={g.id}
                                                            type="button"
                                                            style={{display:'flex', alignItems:'center', gap:'8px', width:'100%', padding:'6px 8px', background:'transparent', border:'none', color:'white', borderRadius:'var(--radius-md)', cursor:'pointer', textAlign:'left'}}
                                                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                            onMouseDown={() => {
                                                                setFormGoalLinks([...formGoalLinks, { goalId: g.id, contributionValue: 1 }]);
                                                                setGoalSearch('');
                                                                setShowGoalSearch(false);
                                                            }}
                                                        >
                                                            <span>{g.icon}</span>
                                                            <span style={{fontSize:'13px'}}>{g.title}</span>
                                                        </button>
                                                    ))
                                                }
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Submit */}
                        <button className="m-form__submit" onClick={handleSubmit}>
                            {editingTask ? 'Save Changes' : 'Create Task'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
