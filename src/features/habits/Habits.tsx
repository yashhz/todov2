/* ═══════════════════════════════════════════════════════════
   HABITS PAGE — Row-based redesign inspired by minimal elegance
   ═══════════════════════════════════════════════════════════ */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useHabits, useProjects, useGoals } from '../../hooks/useStore';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';

import type { HabitFrequency, EnergyRating, GoalLink, Habit } from '../../types';
import {
    isHabitDueOnDate,
    isHabitCompletedOnDate,
    getTodayStr,
    formatDateStr,
} from '../../services/recurrence';
import { getLucideIcon } from '../../utils/iconMapping';
import Modal from '../../components/Modal';
import { Card } from '../../components/Card';
import TimePicker from '../../components/TimePicker';
import { Edit, Trash2, Flame, ChevronLeft, ChevronRight } from 'lucide-react';
import './Habits.css';

const DAY_NAMES     = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HABIT_COLORS  = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'];
const HABIT_ICONS   = ['activity', 'heart', 'book', 'droplet', 'brain', 'sun', 'moon', 'zap', 'target', 'coffee', 'star', 'leaf'];

const FREQ_OPTIONS: { value: HabitFrequency; label: string; icon: string; desc: string }[] = [
    { value: 'daily',          label: 'Daily',     icon: 'calendar', desc: 'Every single day' },
    { value: 'specific_days',  label: 'Schedule',  icon: 'list',     desc: 'Specific days' },
    { value: 'every_n_days',   label: 'Interval',  icon: 'refresh',  desc: 'Every N days' },
    { value: 'times_per_week', label: 'Flexible',  icon: 'layers',   desc: 'X times per week' },
];

type TabType = 'all' | 'daily' | 'weekly' | 'other';

function HabitIcon({ id, className = "" }: { id: string; className?: string }) {
    const Icon = getLucideIcon(id);
    return <Icon className={className} size={18} />;
}

function formatTime12(time: string): string {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

// ─── Date Navigator ─────────────────────────────────
function DateNavigator({ selectedDate, onDateChange, habits }: { selectedDate: Date; onDateChange: (d: Date) => void; habits: Habit[] }) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dates = useMemo(() => {
        const arr: Date[] = [];
        for (let i = -30; i <= 7; i++) {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            arr.push(d);
        }
        return arr;
    }, []);

    useEffect(() => {
        if (scrollRef.current) {
            const activeItem = scrollRef.current.querySelector('.dn-item--active');
            if (activeItem) {
                activeItem.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        }
    }, [selectedDate]);

    return (
        <div className="date-navigator">
            <button className="dn-arrow" onClick={() => {
                const prev = new Date(selectedDate);
                prev.setDate(selectedDate.getDate() - 1);
                onDateChange(prev);
            }}><ChevronLeft size={16} /></button>
            
            <div className="dn-scroll" ref={scrollRef}>
                {dates.map(d => {
                    const isSelected = formatDateStr(d) === formatDateStr(selectedDate);
                    const isToday = formatDateStr(d) === formatDateStr(today);
                    
                    const dateStr = formatDateStr(d);
                    const dueHabits = habits.filter(h => isHabitDueOnDate(h, d));
                    const doneHabits = dueHabits.filter(h => isHabitCompletedOnDate(h, dateStr));
                    const percent = dueHabits.length > 0 ? (doneHabits.length / dueHabits.length) * 100 : 0;

                    return (
                        <div
                            key={d.toISOString()}
                            className={`dn-item ${isSelected ? 'dn-item--active' : ''} ${isToday ? 'dn-item--today' : ''}`}
                            onClick={() => onDateChange(d)}
                        >
                            <span className="dn-day">{DAY_NAMES[d.getDay()].toUpperCase()}</span>
                            {dueHabits.length > 0 ? (
                                <ProgressRing
                                    percent={percent}
                                    size={18}
                                    strokeWidth={2.5}
                                    color={isSelected ? 'white' : 'var(--accent-primary)'}
                                    trackColor={isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}
                                />
                            ) : (
                                <div style={{ height: '18px', width: '18px' }} />
                            )}
                            <span className="dn-date">{d.getDate()}</span>
                        </div>
                    );
                })}
            </div>

            <button className="dn-arrow" onClick={() => {
                const next = new Date(selectedDate);
                next.setDate(selectedDate.getDate() + 1);
                onDateChange(next);
            }}><ChevronRight size={16} /></button>
        </div>
    );
}

// ─── Progress Ring ──────────────────────────────────
function ProgressRing({
    percent,
    size = 24,
    strokeWidth = 2.5,
    showText = false,
    color = 'var(--accent-primary)',
    trackColor = 'rgba(255,255,255,0.06)'
}: {
    percent: number;
    size?: number;
    strokeWidth?: number;
    showText?: boolean;
    color?: string;
    trackColor?: string;
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    return (
        <div className="progress-ring-container" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle
                    className="progress-ring__bg"
                    stroke={trackColor}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    className="progress-ring__fill"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
                />
            </svg>
            {showText && (
                <div className="progress-ring__text">
                    <span className="progress-ring__value">{Math.round(percent)}</span>
                    <span className="progress-ring__unit">%</span>
                </div>
            )}
        </div>
    );
}

export default function HabitsPage() {
    const { habits, addHabit, updateHabit, deleteHabit, toggleHabit, rateHabitEnergy, getEnergyRatingOnDate, getAvgEnergy } = useHabits();
    const { projects } = useProjects();
    const { goals, logProgress } = useGoals();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // habitId → count string while user is entering their count
    const [countInputs, setCountInputs] = useState<Record<string, string>>({});
    // habitId → whether the count has been submitted for this session
    const [countSubmitted, setCountSubmitted] = useState<Record<string, boolean>>({});

    const [selectedDate, setSelectedDate] = useState(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    });
    const [showForm, setShowForm]   = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [showFilters, setShowFilters] = useState<'frequency' | null>(null);
    const filterRef = useRef<HTMLDivElement>(null);
    const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

    useKeyboardShortcut('n', () => { resetForm(); setShowForm(true); });

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setShowFilters(null);
            }
        }
        if (showFilters) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showFilters]);

    const selectedDateStr = formatDateStr(selectedDate);
    const isTodaySelected = selectedDateStr === getTodayStr();

    // ─── Form state ─────────────────────────────────
    const [formTitle, setFormTitle]               = useState('');
    const [formDesc, setFormDesc]                 = useState('');
    const [formIcon, setFormIcon]                 = useState(HABIT_ICONS[0]);
    const [formColor, setFormColor]               = useState(HABIT_COLORS[0]);
    const [formFreq, setFormFreq]                 = useState<HabitFrequency>('daily');
    const [formDays, setFormDays]                 = useState<number[]>([]);
    const [formEveryN, setFormEveryN]             = useState('2');
    const [formTimesPerWeek, setFormTimesPerWeek] = useState('2');
    const [formTime, setFormTime]                 = useState('');
    const [formProjectId, setFormProjectId]       = useState<string | null>(null);
    const [formGoalLinks, setFormGoalLinks]       = useState<GoalLink[]>([]);
    const [projectSearch, setProjectSearch]       = useState('');
    const [showProjectSearch, setShowProjectSearch] = useState(false);
    const [titleShake, setTitleShake]             = useState(false);

    function resetForm() {
        setFormTitle(''); setFormDesc('');
        setFormIcon(HABIT_ICONS[0]); setFormColor(HABIT_COLORS[0]);
        setFormFreq('daily'); setFormDays([]);
        setFormEveryN('2'); setFormTimesPerWeek('2');
        setFormTime(''); setFormProjectId(null); setFormGoalLinks([]);
        setShowTimePicker(false);
        setProjectSearch(''); setShowProjectSearch(false);
        setEditingHabit(null);
    }

    function openEdit(habit: Habit) {
        setEditingHabit(habit);
        setFormTitle(habit.title);
        setFormDesc(habit.description);
        setFormIcon(habit.icon);
        setFormColor(habit.color);
        setFormFreq(habit.frequency);
        setFormDays(habit.specificDays);
        setFormEveryN(String(habit.everyNDays));
        setFormTimesPerWeek(String(habit.timesPerWeek));
        setFormTime(habit.timeOfDay || '');
        setFormProjectId(habit.projectId ?? null);
        setFormGoalLinks(habit.goalLinks || []);
        setShowTimePicker(false);
        setProjectSearch(''); setShowProjectSearch(false);
        setShowForm(true);
    }

    function handleCreate() {
        if (!formTitle.trim()) {
            setTitleShake(true);
            setTimeout(() => setTitleShake(false), 500);
            return;
        }
        const payload = {
            title: formTitle.trim(),
            description: formDesc.trim(),
            icon: formIcon,
            color: formColor,
            frequency: formFreq,
            specificDays: formDays,
            everyNDays: Math.max(2, parseInt(formEveryN) || 2),
            timesPerWeek: parseInt(formTimesPerWeek) || 2,
            timeOfDay: formTime || null,
            projectId: formProjectId,
            goalLinks: formGoalLinks,
        };
        if (editingHabit) {
            updateHabit({ ...editingHabit, ...payload });
        } else {
            addHabit(payload);
        }
        setShowForm(false);
        resetForm();
    }

    function toggleDay(day: number) {
        setFormDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
    }

    function getFrequencyLabel(habit: Habit): string {
        switch (habit.frequency) {
            case 'daily':          return 'Every day';
            case 'specific_days':  return habit.specificDays.map(d => DAY_NAMES[d]).join(', ');
            case 'every_n_days':   return `Every ${habit.everyNDays}d`;
            case 'times_per_week': return `${habit.timesPerWeek}×/wk`;
            default: return '';
        }
    }

    function getHabitTabType(h: Habit): TabType {
        if (h.frequency === 'daily') return 'daily';
        if (h.frequency === 'specific_days' || h.frequency === 'times_per_week') return 'weekly';
        return 'other';
    }



    const filteredHabits = useMemo(() => {
        return habits.filter(h => {
            if (activeTab === 'all') return true;
            return getHabitTabType(h) === activeTab;
        });
    }, [habits, activeTab]);



    return (
        <div className="habits-page page-enter">

            {/* ─── Header ─────────────────────────────── */}
            <div className="habits-header">
                <div className="habits-header__left">
                    <h1 className="habits-title">Habits</h1>
                </div>
                <div className="habits-header__right">
                    <button className="h-add-btn" onClick={() => { resetForm(); setShowForm(true); }}>
                        <span>+</span> New Habit
                    </button>
                </div>
            </div>

            {/* ─── Date Area ─────────────────────────── */}
            <div className="habits-date-area">
                <div className="habits-date-row">
                    <p className="habits-date">
                        {isTodaySelected ? 'Today' : selectedDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                    {/* Ring removed from here to be put in the timeline below */}
                    {!isTodaySelected && (
                        <button className="habits-today-btn" onClick={() => setSelectedDate(new Date())}>Today</button>
                    )}
                </div>
                <DateNavigator selectedDate={selectedDate} onDateChange={setSelectedDate} habits={habits} />
            </div>

            {/* Smart Sentence Filter */}
            <div className="tasks-filter-sentence" ref={filterRef} style={{ marginBottom: 'var(--sp-4)' }}>
                <span className="sentence-text">Showing </span>
                <span className="sentence-trigger-wrap">
                    <button 
                        className={`sentence-trigger ${activeTab !== 'all' ? 'sentence-trigger--active' : ''}`}
                        onClick={() => setShowFilters(showFilters === 'frequency' ? null : 'frequency')}
                    >
                        {activeTab === 'all' ? 'all' : activeTab === 'other' ? 'monthly & custom' : activeTab}
                    </button>
                    {showFilters === 'frequency' && (
                        <div className="sentence-mini-popover glass animate-pop-in">
                            {(['all', 'daily', 'weekly', 'other'] as const).map(t => (
                                <button key={t} className={`mini-opt ${activeTab === t ? 'mini-opt--active' : ''}`} onClick={() => { setActiveTab(t); setShowFilters(null); }}>
                                    {t === 'all' ? 'All habits' : t === 'other' ? 'Monthly & custom' : t.charAt(0).toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                        </div>
                    )}
                </span>
                <span className="sentence-text"> habits</span>

                {activeTab !== 'all' && (
                    <button className="sentence-clear" onClick={() => {
                        setActiveTab('all');
                        setShowFilters(null);
                    }} title="Reset Filters">×</button>
                )}
            </div>

            {/* ─── Habit Grid ─────────────────────────── */}
            <div className="habits-grid">
                {filteredHabits.length === 0 ? (
                    <div className="habits-empty">
                        <p className="habits-empty__msg">No habits here yet.</p>
                        <button className="m-add-btn" onClick={() => { resetForm(); setShowForm(true); }}>
                            <span>+</span> New Habit
                        </button>
                    </div>
                ) : (
                    filteredHabits.map(habit => {
                        const isFuture         = selectedDate > today;
                        const isDueToday       = isHabitDueOnDate(habit, selectedDate) && !isFuture;
                        const isDoneToday      = isHabitCompletedOnDate(habit, selectedDateStr);
                        const currentRating    = getEnergyRatingOnDate(habit.id, selectedDateStr);

                        // Variable goal links: linked to measurable goal(s) but no fixed contributionValue
                        const variableGoalLinks = (habit.goalLinks || []).filter(link => {
                            if (link.contributionValue) return false; // has fixed value, auto-logs
                            const g = goals.find(g => g.id === link.goalId);
                            return g && g.goalType === 'measurable'; // only measurable goals need a count
                        });
                        // Also check legacy single-link
                        const legacyVariableLink = !habit.goalLinks?.length && habit.linkedGoalId && !habit.contributionValue
                            ? goals.find(g => g.id === habit.linkedGoalId && g.goalType === 'measurable')
                            : null;
                        const hasVariableLink = variableGoalLinks.length > 0 || !!legacyVariableLink;

                        // Show count prompt when: just checked off + has variable link + count not yet submitted
                        const showCountPrompt = isDoneToday && hasVariableLink && !countSubmitted[habit.id] && currentRating === undefined;
                        // Show energy prompt only after count is submitted (or no variable link)
                        const showEnergyPromptFinal = isDoneToday && !showCountPrompt && currentRating === undefined;

                        // The goal for display in count prompt
                        const countGoal = variableGoalLinks.length > 0
                            ? goals.find(g => g.id === variableGoalLinks[0].goalId)
                            : legacyVariableLink || null;

                        function submitCount() {
                            const val = parseFloat(countInputs[habit.id] || '');
                            if (!isNaN(val) && val > 0) {
                                // Log to all variable goal links
                                for (const link of variableGoalLinks) {
                                    logProgress(link.goalId, val);
                                }
                                if (legacyVariableLink) {
                                    logProgress(legacyVariableLink.id, val);
                                }
                            }
                            // Mark count as submitted regardless (user can skip by submitting 0)
                            setCountSubmitted(prev => ({ ...prev, [habit.id]: true }));
                            setCountInputs(prev => ({ ...prev, [habit.id]: '' }));
                        }
                        
                        return (
                            <Card
                                key={habit.id}
                                showBorderSegments={true}
                                statusType="habit"
                                isCompleted={isDoneToday}
                                statusColor={habit.color}
                                progressValue={Math.min(habit.streak, 7) / 7}
                                title={
                                    showCountPrompt
                                        ? `How many ${countGoal?.unit || 'reps'}?`
                                        : showEnergyPromptFinal
                                        ? 'Level of energy?'
                                        : habit.title
                                }
                                subtitle={
                                    showCountPrompt
                                        ? `Logs to: ${countGoal?.title ?? 'Goal'}`
                                        : showEnergyPromptFinal
                                        ? 'Select a number to finish'
                                        : getFrequencyLabel(habit)
                                }
                                metadata={showCountPrompt || showEnergyPromptFinal ? [] : (() => {
                                    const avgE = getAvgEnergy(habit.id, 7);
                                    return [
                                        { label: '', value: <div className="h-streak" style={{ color: habit.streak > 0 ? 'var(--accent-primary)' : 'inherit' }}><Flame size={12} /> {habit.streak}d</div> },
                                        ...(avgE !== null ? [{ label: '', value: <div style={{ color: habit.color, display: 'flex', alignItems: 'center', gap: '2px', fontSize: '11px', fontWeight: 600 }}>⚡{avgE.toFixed(1)}</div> }] : []),
                                        { label: '', value: habit.timeOfDay ? formatTime12(habit.timeOfDay) : '' },
                                    ];
                                })()}
                                actions={
                                    <>
                                        <button className="card__action-btn" onClick={e => { e.stopPropagation(); openEdit(habit); }}>
                                            <Edit size={14} />
                                        </button>
                                        <button className="card__action-btn card__action-btn--danger" onClick={e => { e.stopPropagation(); deleteHabit(habit.id); }}>
                                            <Trash2 size={14} />
                                        </button>
                                    </>
                                }
                                onStatusClick={(e) => {
                                    e.stopPropagation();
                                    if (isDueToday) {
                                        if (isDoneToday) {
                                            // Unchecking — clear count submitted state
                                            setCountSubmitted(prev => { const n = {...prev}; delete n[habit.id]; return n; });
                                        }
                                        toggleHabit(habit.id, selectedDateStr);
                                    }
                                }}
                                className={isFuture ? 'card--future' : ''}
                                onClick={() => {
                                    if (isDueToday && !showEnergyPromptFinal && !showCountPrompt) {
                                        if (isDoneToday) {
                                            setCountSubmitted(prev => { const n = {...prev}; delete n[habit.id]; return n; });
                                        }
                                        toggleHabit(habit.id, selectedDateStr);
                                    }
                                }}
                            >
                                {showCountPrompt && (
                                    <div className="h-card-energy animate-fade-in-up" onClick={e => e.stopPropagation()}>
                                        <div className="h-count__row">
                                            <input
                                                type="number"
                                                className="h-count__input"
                                                placeholder="0"
                                                min="0"
                                                value={countInputs[habit.id] || ''}
                                                onChange={e => setCountInputs(prev => ({ ...prev, [habit.id]: e.target.value }))}
                                                onKeyDown={e => { if (e.key === 'Enter') submitCount(); }}
                                                autoFocus
                                                style={{ borderColor: habit.color + '60' }}
                                            />
                                            <button
                                                className="h-count__submit"
                                                style={{ background: habit.color }}
                                                onClick={submitCount}
                                            >✓</button>
                                        </div>
                                        <button className="h-count__skip" onClick={submitCount}>skip</button>
                                    </div>
                                )}
                                {showEnergyPromptFinal && (
                                    <div className="h-card-energy animate-fade-in-up">
                                        <div className="h-energy__dots">
                                            {([1, 2, 3, 4, 5] as EnergyRating[]).map(r => (
                                                <button
                                                    key={r}
                                                    className="h-energy__dot"
                                                    onClick={e => {
                                                        e.stopPropagation();
                                                        rateHabitEnergy(habit.id, r, selectedDateStr);
                                                    }}
                                                    style={{ '--hover-color': habit.color } as any}
                                                >{r}</button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </Card>
                        );
                    })
                )}
            </div>

            {/* ═══ Create / Edit Habit Modal ═══ */}
            <Modal isOpen={showForm} onClose={() => { setShowForm(false); resetForm(); }} title={editingHabit ? 'Edit Habit' : 'New Habit'} size="md">
                <div className="m-form">
                    <div className="m-form__title-wrap">
                        <input
                            type="text"
                            className={`m-form__title ${titleShake ? 'm-form__title--shake' : ''}`}
                            placeholder="What are we building?"
                            value={formTitle}
                            onChange={e => setFormTitle(e.target.value)}
                            autoFocus
                        />
                        <div className="m-form__title-line" />
                    </div>

                    <div className={`m-form__body ${formTitle.trim() ? 'm-form__body--visible' : ''}`}>
                        
                        <div className="m-form__section">
                            <textarea
                                className="m-form__title"
                                style={{fontSize: '15px', fontWeight: 500, minHeight: '40px', resize: 'none'}}
                                placeholder="Brief description (optional)..."
                                value={formDesc}
                                onChange={e => setFormDesc(e.target.value)}
                                rows={1}
                            />
                        </div>

                        <div className="m-form__section">
                            <span className="m-form__section-label">Identity</span>
                            <div className="m-form__row" style={{background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '24px', overflowX: 'auto', flexWrap: 'nowrap', maxWidth: '100%', WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none'}}>
                                {HABIT_ICONS.map(icon => (
                                    <button
                                        key={icon}
                                        type="button"
                                        onClick={() => setFormIcon(icon)}
                                        style={{
                                            width: '36px', height: '36px', borderRadius: '50%', border: 'none', 
                                            background: formIcon === icon ? 'rgba(255,255,255,0.12)' : 'transparent',
                                            color: formColor, fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                            transition: 'all 0.2s ease-out'
                                        }}
                                    >
                                        <HabitIcon id={icon} />
                                    </button>
                                ))}
                            </div>
                            <div className="m-form__row" style={{background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '24px', overflowX: 'auto', flexWrap: 'nowrap', maxWidth: '100%', gap: '12px', marginTop: '4px'}}>
                                {HABIT_COLORS.map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setFormColor(color)}
                                        style={{
                                            width: '24px', height: '24px', borderRadius: '50%',
                                            background: color, border: 'none', cursor: 'pointer', flexShrink: 0,
                                            transform: formColor === color ? 'scale(1.2)' : 'scale(1)',
                                            boxShadow: formColor === color ? `0 0 0 2px var(--surface-overlay), 0 0 0 4px ${color}` : 'none',
                                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="m-form__section">
                            <span className="m-form__section-label">Rhythm</span>
                            <div className="m-form__row">
                                {FREQ_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        className={`m-form__pill ${formFreq === opt.value ? 'm-form__pill--active' : ''}`}
                                        onClick={() => setFormFreq(opt.value)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <HabitIcon id={opt.icon} />
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {formFreq === 'specific_days' && (
                            <div className="m-form__section">
                                <span className="m-form__section-label">Days</span>
                                <div className="m-form__row" style={{gap: '6px'}}>
                                    {DAY_NAMES.map((day, i) => (
                                        <button
                                            key={i}
                                            type="button"
                                            className="m-form__pill m-form__pill--sm"
                                            onClick={() => toggleDay(i)}
                                            style={formDays.includes(i) ? { background: formColor, color: 'white', borderColor: formColor, width: '32px', height: '32px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' } : { width: '32px', height: '32px', padding: 0, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >{day.slice(0, 1)}</button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {formFreq === 'every_n_days' && (
                            <div className="m-form__section m-form__section--row">
                                <span className="m-form__section-label">Repeat Every</span>
                                <input
                                    type="number"
                                    style={{background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', padding: '6px 12px', color: 'white', width: '80px', outline: 'none'}}
                                    value={formEveryN}
                                    onChange={e => setFormEveryN(e.target.value)}
                                    min="2"
                                />
                                <span style={{fontSize: '13px', color: 'var(--text-tertiary)'}}>days</span>
                            </div>
                        )}

                        {formFreq === 'times_per_week' && (
                            <div className="m-form__section m-form__section--row">
                                <span className="m-form__section-label">Times Per Week</span>
                                <input
                                    type="number"
                                    style={{background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius-md)', padding: '6px 12px', color: 'white', width: '80px', outline: 'none'}}
                                    value={formTimesPerWeek}
                                    onChange={e => setFormTimesPerWeek(e.target.value)}
                                    min="1"
                                    max="7"
                                />
                            </div>
                        )}

                        <div className="m-form__section m-form__section--row">
                            <span className="m-form__section-label">Time Reminder</span>
                            <div style={{ position: 'relative' }}>
                                <button
                                    type="button"
                                    className={`m-form__pill ${showTimePicker ? 'm-form__pill--active' : ''}`}
                                    onClick={() => setShowTimePicker(!showTimePicker)}
                                >
                                    {formTime ? formatTime12(formTime) : 'None'}
                                </button>
                                {formTime && (
                                    <button type="button" onClick={() => setFormTime('')} style={{background:'transparent', border:'none', color:'rgba(255,255,255,0.25)', cursor:'pointer', marginLeft: '8px'}}>×</button>
                                )}
                                {showTimePicker && (
                                    <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, zIndex: 10, background: 'var(--surface-overlay)', padding: '12px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--surface-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                                        <TimePicker value={formTime || '09:00'} onChange={setFormTime} onClose={() => setShowTimePicker(false)} />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="m-form__section m-form__section--row">
                            <span className="m-form__section-label">Link to Project</span>
                            <div style={{ position: 'relative', flex: 1, minWidth: '150px' }}>
                                {formProjectId ? (
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span className="m-form__pill m-form__pill--active" style={{ pointerEvents: 'none' }}>
                                            {projects.find(p => p.id === formProjectId)?.name}
                                        </span>
                                        <button onClick={() => setFormProjectId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', marginLeft: '8px' }}>×</button>
                                    </div>
                                ) : (
                                    <>
                                        <input
                                            type="text"
                                            style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'16px', padding:'6px 12px', color:'white', fontSize:'12px', width:'100%', outline:'none'}}
                                            placeholder="Assign to project..."
                                            value={projectSearch}
                                            onChange={e => { setProjectSearch(e.target.value); setShowProjectSearch(true); }}
                                            onFocus={() => setShowProjectSearch(true)}
                                            onBlur={() => setTimeout(() => setShowProjectSearch(false), 150)}
                                        />
                                        {showProjectSearch && projects.length > 0 && (
                                            <div className="m-form__goal-dropdown" style={{position:'absolute', bottom:'100%', left:0, right:0, background:'var(--surface-overlay)', border:'1px solid var(--surface-border)', borderRadius:'var(--radius-lg)', padding:'4px', marginBottom:'4px', zIndex:10, maxHeight:'150px', overflowY:'auto'}}>
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
                                                    ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        <button className="m-form__submit" onClick={handleCreate}>
                            {editingHabit ? 'Update Habit' : 'Create Habit'}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
