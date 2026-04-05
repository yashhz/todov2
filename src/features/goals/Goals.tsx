/* ═══════════════════════════════════════════════════════════
   GOALS PAGE — Unified card design with flattened structure
   ═══════════════════════════════════════════════════════════ */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useGoals } from '../../hooks/useStore';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import { useLocation, useNavigate } from 'react-router-dom';
import type { GoalType } from '../../types';
import { Card } from '../../components/Card';
import { getLucideIcon } from '../../utils/iconMapping';
import ProgressBar from '../../components/ProgressBar';
import Modal from '../../components/Modal';
import { Trash2, Plus } from 'lucide-react';
import './Goals.css';

const GOAL_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#8b5cf6', '#a78bfa', '#fb7185', '#22d3ee', '#fb923c'];
const GOAL_ICONS = ['🎯', '💪', '📚', '🏃', '🧘', '💰', '🎨', '✍️', '🏋️', '🚴', '🧠', '❤️'];

// Smart unit presets grouped by category
const UNIT_PRESETS = [
    {
        category: 'Fitness', units: [
            { name: 'reps', icon: '🔁' },
            { name: 'pushups', icon: '💪' },
            { name: 'situps', icon: '🏋️' },
            { name: 'squats', icon: '🦵' },
            { name: 'km', icon: '🏃' },
            { name: 'miles', icon: '🛣️' },
            { name: 'minutes', icon: '⏱️' },
            { name: 'hours', icon: '🕐' },
            { name: 'steps', icon: '👟' },
            { name: 'calories', icon: '🔥' },
        ]
    },
    {
        category: 'Health', units: [
            { name: 'liters', icon: '💧' },
            { name: 'glasses', icon: '🥛' },
            { name: 'meals', icon: '🥗' },
            { name: 'hours of sleep', icon: '😴' },
            { name: 'kg', icon: '⚖️' },
            { name: 'lbs', icon: '⚖️' },
        ]
    },
    {
        category: 'Learning', units: [
            { name: 'pages', icon: '📖' },
            { name: 'books', icon: '📚' },
            { name: 'lessons', icon: '📝' },
            { name: 'hours', icon: '🕐' },
            { name: 'courses', icon: '🎓' },
            { name: 'problems', icon: '🧩' },
        ]
    },
    {
        category: 'Finance', units: [
            { name: '₹', icon: '💰' },
            { name: '$', icon: '💵' },
            { name: '€', icon: '💶' },
            { name: 'savings', icon: '🏦' },
        ]
    },
    {
        category: 'Custom', units: [
            { name: 'times', icon: '🔄' },
            { name: 'sessions', icon: '📋' },
            { name: 'days', icon: '📅' },
            { name: 'items', icon: '✅' },
        ]
    },
];

export default function GoalsPage() {
    const { goals, addGoal, deleteGoal, logProgress, correctProgress, getParentGoals, getSubGoals, getAggregateProgress } = useGoals();
    const location = useLocation();
    const navigate = useNavigate();

    const [showForm, setShowForm] = useState(false);
    const [progressModal, setProgressModal] = useState<string | null>(null);
    const [progressInput, setProgressInput] = useState('');

    const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
    const [filterType, setFilterType] = useState<'all' | GoalType>('all');

    useKeyboardShortcut('n', () => { resetForm(); setShowForm(true); });
    const [showFilters, setShowFilters] = useState<'status' | 'type' | null>(null);
    const filterRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setShowFilters(null);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Form state
    const [formTitle, setFormTitle] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formTarget, setFormTarget] = useState('');
    const [formUnit, setFormUnit] = useState('');
    const [formColor, setFormColor] = useState(GOAL_COLORS[0]);
    const [formIcon, setFormIcon] = useState(GOAL_ICONS[0]);
    const [formParentId, setFormParentId] = useState<string | null>(null);

    // Open form pre-filled when navigated from command bar (#g)
    useEffect(() => {
        const state = location.state as { prefill?: { title?: string } } | null;
        if (state?.prefill?.title) {
            setFormTitle(state.prefill.title);
            setShowForm(true);
            window.history.replaceState({}, '');
        }
    }, [location.state]);
    const [showUnitPicker, setShowUnitPicker] = useState(false);
    // Single question: does this goal have a measurable number target?
    const [hasFinishLine, setHasFinishLine] = useState<boolean | null>(null);
    const [formWhy, setFormWhy] = useState('');
    // Correct progress state
    const [correctingGoalId, setCorrectingGoalId] = useState<string | null>(null);
    const [correctDelta, setCorrectDelta] = useState('');
    const [correctNote, setCorrectNote] = useState('');
    const [correctIsNegative, setCorrectIsNegative] = useState(false);

    const parentGoals = useMemo(() => getParentGoals(), [getParentGoals]);

    function resetForm() {
        setFormTitle('');
        setFormDesc('');
        setFormWhy('');
        setFormTarget('');
        setFormUnit('');
        setFormColor(GOAL_COLORS[0]);
        setFormIcon(GOAL_ICONS[0]);
        setFormParentId(null);
        setShowUnitPicker(false);
        setHasFinishLine(null);
    }

    function openNewGoal(parentId?: string) {
        resetForm();
        if (parentId) {
            const parent = goals.find(g => g.id === parentId);
            if (parent) {
                setFormParentId(parentId);
                setFormColor(parent.color);
            }
        }
        setShowForm(true);
    }

    function handleCreate() {
        if (!formTitle.trim()) return;
        // Single question: does this goal have a measurable number target?
        const isMeasurable = hasFinishLine === true;
        if (isMeasurable && (!formTarget || !formUnit.trim())) return;

        addGoal({
            title: formTitle.trim(),
            description: formDesc.trim(),
            why: formWhy.trim(),
            goalType: isMeasurable ? 'measurable' : 'outcome',
            targetValue: isMeasurable ? parseFloat(formTarget) : null,
            unit: isMeasurable ? formUnit.trim() : null,
            color: formColor,
            icon: formIcon,
            parentGoalId: formParentId,
        });
        setShowForm(false);
        resetForm();
    }

    function handleCorrectProgress() {
        if (!correctingGoalId || !correctDelta) return;
        const delta = parseFloat(correctDelta) * (correctIsNegative ? -1 : 1);
        correctProgress(correctingGoalId, delta, correctNote.trim() || 'Manual correction');
        setCorrectingGoalId(null);
        setCorrectDelta('');
        setCorrectNote('');
        setCorrectIsNegative(false);
    }

    function handleLogProgress(goalId: string) {
        const val = parseFloat(progressInput);
        if (!isNaN(val) && val > 0) {
            logProgress(goalId, val);
            setProgressModal(null);
            setProgressInput('');
        }
    }

    return (
        <div className="goals-page page-enter">
            {/* Header */}
            <div className="goals-header">
                <div>
                    <h1 className="goals-title">Goals</h1>
                    <p className="goals-subtitle">{goals.length} goal{goals.length !== 1 ? 's' : ''} · Track your progress</p>
                </div>
                <button className="m-add-btn" onClick={() => openNewGoal()}>
                    <span>+</span> New Goal
                </button>
            </div>

            {/* Smart Sentence Filter */}
            <div className="tasks-filter-sentence" ref={filterRef} style={{ marginBottom: 'var(--sp-4)' }}>
                <span className="sentence-text">Showing </span>
                
                {/* Status Trigger */}
                <span className="sentence-trigger-wrap">
                    <button 
                        className={`sentence-trigger ${filterStatus !== 'all' ? 'sentence-trigger--active' : ''}`}
                        onClick={() => setShowFilters(showFilters === 'status' ? null : 'status')}
                    >
                        {filterStatus === 'all' ? 'all' : filterStatus}
                    </button>
                    {showFilters === 'status' && (
                        <div className="sentence-mini-popover glass animate-pop-in">
                            {(['all', 'active', 'completed'] as const).map(s => (
                                <button key={s} className={`mini-opt ${filterStatus === s ? 'mini-opt--active' : ''}`} onClick={() => { setFilterStatus(s); setShowFilters(null); }}>
                                    {s.charAt(0).toUpperCase() + s.slice(1)}
                                </button>
                            ))}
                        </div>
                    )}
                </span>

                <span className="sentence-text"> goals of </span>

                {/* Type Trigger */}
                <span className="sentence-trigger-wrap">
                    <button 
                        className={`sentence-trigger ${filterType !== 'all' ? 'sentence-trigger--active' : ''}`}
                        onClick={() => setShowFilters(showFilters === 'type' ? null : 'type')}
                    >
                        {filterType === 'all' ? 'any type' : filterType}
                    </button>
                    {showFilters === 'type' && (
                        <div className="sentence-mini-popover glass animate-pop-in">
                            {(['all', 'measurable', 'outcome'] as const).map(t => (
                                <button key={t} className={`mini-opt ${filterType === t ? 'mini-opt--active' : ''}`} onClick={() => { setFilterType(t); setShowFilters(null); }}>
                                    {t === 'all' ? 'Any type' : t.charAt(0).toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                        </div>
                    )}
                </span>

                {((filterStatus !== 'all' ? 1 : 0) + (filterType !== 'all' ? 1 : 0)) > 0 && (
                    <button className="sentence-clear" onClick={() => {
                        setFilterStatus('all');
                        setFilterType('all');
                        setShowFilters(null);
                    }} title="Reset Filters">×</button>
                )}
            </div>

            {/* Goals List — Flattened Structure */}
            <div className="goals-list stagger-children">
                {goals.length === 0 ? (
                    <div className="goals-empty">
                        <span className="goals-empty__icon">🎯</span>
                        <h3>Set your first goal</h3>
                        <p>Break big goals into smaller ones and track tangible progress</p>
                        <button className="goals-empty__btn" onClick={() => openNewGoal()}>
                            + Create Goal
                        </button>
                    </div>
                ) : (
                    (() => {
                        const filteredGoals = goals.filter(g => {
                            if (filterType !== 'all' && g.goalType !== filterType) return false;
                            if (filterStatus !== 'all') {
                                const aggProgress = getAggregateProgress(g.id);
                                const subGoals = getSubGoals(g.id);
                                const hasChildren = subGoals.length > 0;
                                const progressPercent = hasChildren || aggProgress.isUmbrella 
                                    ? aggProgress.percent 
                                    : g.targetValue && g.targetValue > 0 
                                        ? Math.min((g.currentValue / g.targetValue) * 100, 100) 
                                        : 0;
                                const isCompleted = progressPercent >= 100;
                                if (filterStatus === 'active' && isCompleted) return false;
                                if (filterStatus === 'completed' && !isCompleted) return false;
                            }
                            return true;
                        });

                        if (filteredGoals.length === 0) {
                            return (
                                <div className="goals-empty">
                                    <span className="goals-empty__icon">🎯</span>
                                    <h3>No goals found</h3>
                                    <p>Try adjusting your filters.</p>
                                </div>
                            );
                        }

                        return filteredGoals.map(goal => {
                        const aggProgress = getAggregateProgress(goal.id);
                        const subGoals = getSubGoals(goal.id);
                        const hasChildren = subGoals.length > 0;
                        const parentGoal = goal.parentGoalId ? goals.find(g => g.id === goal.parentGoalId) : null;
                        
                        // Calculate progress percentage
                        const progressPercent = hasChildren || aggProgress.isUmbrella 
                            ? aggProgress.percent 
                            : goal.targetValue && goal.targetValue > 0 
                                ? Math.min((goal.currentValue / goal.targetValue) * 100, 100) 
                                : 0;

                        // Build metadata
                        const metadata = [];
                        
                        // Show parent goal if this is a sub-goal
                        if (parentGoal) {
                            const ParentIcon = getLucideIcon(parentGoal.icon);
                            metadata.push({
                                label: 'Part of',
                                value: (
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <ParentIcon size={12} />
                                        {parentGoal.title}
                                    </span>
                                )
                            });
                        }
                        
                        // Show sub-goals count if parent
                        if (hasChildren) {
                            metadata.push({
                                label: '',
                                value: `${subGoals.length} sub-goal${subGoals.length > 1 ? 's' : ''}`
                            });
                        }
                        
                        // Show "why" text if present
                        if (goal.why) {
                            metadata.push({
                                label: '💡',
                                value: goal.why
                            });
                        }

                        return (
                            <Card
                                key={goal.id}
                                statusType="ring"
                                statusValue={progressPercent}
                                statusColor={progressPercent >= 100 ? 'var(--color-success)' : 'var(--accent-primary)'}
                                title={goal.title}
                                subtitle={
                                    hasChildren || aggProgress.isUmbrella
                                        ? progressPercent > 0
                                            ? `${Math.round(progressPercent)}% across sub-goals`
                                            : 'Outcome Goal'
                                        : goal.targetValue !== null
                                            ? `${goal.currentValue.toLocaleString()} / ${goal.targetValue.toLocaleString()} ${goal.unit}`
                                            : 'Outcome Goal'
                                }
                                metadata={metadata}
                                actions={
                                    <>
                                        {!hasChildren && !aggProgress.isUmbrella && progressPercent < 100 && goal.targetValue !== null && (
                                            <button
                                                className="card__action-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setProgressModal(goal.id);
                                                    setProgressInput('');
                                                }}
                                                title="Log progress"
                                                aria-label="Quick log progress"
                                            >
                                                <Plus size={14} />
                                            </button>
                                        )}
                                        <button
                                            className="card__action-btn card__action-btn--danger"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteGoal(goal.id);
                                            }}
                                            title="Delete goal"
                                            aria-label="Delete goal"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </>
                                }
                                onClick={() => navigate(`/goals/${goal.id}`)}
                            >
                                {goal.targetValue !== null && !hasChildren && (
                                    <ProgressBar
                                        value={goal.currentValue}
                                        max={goal.targetValue}
                                        color="var(--accent-primary)"
                                        size="md"
                                    />
                                )}
                            </Card>
                        );
                    });
                })()
                )}
            </div>

            {/* ═══ Create Goal Modal ═══ */}
            <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={formParentId ? 'Add Sub-Goal' : 'Create New Goal'} size="md">
                <div className="m-form">
                    {/* Parent indicator */}
                    {formParentId && (() => {
                        const parent = goals.find(g => g.id === formParentId);
                        return parent ? (
                            <div className="m-form__row" style={{ borderColor: parent.color + '40', background: parent.color + '10', padding: '8px 12px', borderRadius: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'white' }}>
                                <span>{parent.icon}</span>
                                <span>Sub-goal of <strong>{parent.title}</strong></span>
                            </div>
                        ) : null;
                    })()}

                    <div className="m-form__title-wrap">
                        <input
                            type="text"
                            className="m-form__title"
                            placeholder={formParentId ? "e.g., 1000 Pushups" : "e.g., Get Fit Body"}
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            autoFocus
                        />
                        <div className="m-form__title-line" />
                    </div>

                    <div className={`m-form__body ${formTitle.trim() ? 'm-form__body--visible' : ''}`}>
                        <div className="m-form__section">
                            <textarea
                                className="m-form__title"
                                style={{fontSize: '15px', fontWeight: 500, minHeight: '40px', resize: 'none'}}
                                placeholder="What does success look like?"
                                value={formDesc}
                                onChange={(e) => setFormDesc(e.target.value)}
                                rows={2}
                            />
                        </div>

                        <div className="m-form__section">
                            <span className="m-form__section-label">Identity</span>
                            <div className="m-form__row" style={{background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '24px', overflowX: 'auto', flexWrap: 'nowrap', maxWidth: '100%', WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none'}}>
                                {GOAL_ICONS.map(icon => (
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
                                        {icon}
                                    </button>
                                ))}
                            </div>
                            <div className="m-form__row" style={{background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '24px', overflowX: 'auto', flexWrap: 'nowrap', maxWidth: '100%', gap: '12px', marginTop: '4px'}}>
                                {GOAL_COLORS.map(color => (
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
                            <span className="m-form__section-label" style={{color: 'var(--accent-primary)'}}>💡 Why does this matter?</span>
                            <input
                                type="text"
                                style={{background:'rgba(255,255,255,0.04)', border:'none', borderRadius:'16px', padding:'12px 14px', color:'white', fontSize:'14px', fontStyle: 'italic', width:'100%', outline:'none'}}
                                placeholder="Because I want to..."
                                value={formWhy}
                                onChange={(e) => setFormWhy(e.target.value)}
                                maxLength={120}
                            />
                        </div>

                        {!formParentId && (
                            <div className="m-form__section">
                                <span className="m-form__section-label">Type</span>
                                <div className="m-form__row m-form__row--between">
                                    <span style={{fontSize: '14px', color: 'var(--text-secondary)'}}>Track with a number?</span>
                                    <div className="m-form__row" style={{gap: '8px'}}>
                                        <button
                                            type="button"
                                            className={`m-form__pill ${hasFinishLine === true ? 'm-form__pill--active' : ''}`}
                                            onClick={() => setHasFinishLine(true)}
                                            style={hasFinishLine === true ? {background: 'var(--accent-primary)', color: 'black'} : {}}
                                        >Yes — Measurable</button>
                                        <button
                                            type="button"
                                            className={`m-form__pill ${hasFinishLine === false ? 'm-form__pill--active' : ''}`}
                                            onClick={() => setHasFinishLine(false)}
                                        >No — Outcome</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {(formParentId || hasFinishLine === true) && (
                            <div className="m-form__section">
                                <span className="m-form__section-label">Target</span>
                                <div className="m-form__row animate-fade-in-up" style={{gap: '12px'}}>
                                    <input
                                        type="number"
                                        style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'10px 14px', color:'white', width:'50%', outline:'none'}}
                                        placeholder="1000"
                                        value={formTarget}
                                        onChange={(e) => setFormTarget(e.target.value)}
                                    />
                                    <div style={{position: 'relative', width: '50%'}}>
                                        <input
                                            type="text"
                                            style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'10px 14px', color:'white', width:'100%', outline:'none'}}
                                            placeholder="unit..."
                                            value={formUnit}
                                            onChange={(e) => setFormUnit(e.target.value)}
                                            onFocus={() => setShowUnitPicker(true)}
                                        />
                                        <button type="button" onClick={() => setShowUnitPicker(!showUnitPicker)} style={{position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background:'transparent', border:'none', color:'var(--text-secondary)', cursor:'pointer'}}>▾</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Smart Unit Picker */}
                        {showUnitPicker && (
                            <div className="m-form__section animate-fade-in-up" style={{background: 'var(--surface-sunken)', padding: '12px', borderRadius: '16px'}}>
                                {UNIT_PRESETS.map(group => (
                                    <div key={group.category} style={{marginBottom: '12px'}}>
                                        <span style={{fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-tertiary)', display: 'block', marginBottom: '6px'}}>{group.category}</span>
                                        <div style={{display: 'flex', flexWrap: 'wrap', gap: '6px'}}>
                                            {group.units.map(u => (
                                                <button
                                                    key={u.name}
                                                    type="button"
                                                    className="m-form__pill m-form__pill--sm"
                                                    style={formUnit === u.name ? {background: 'var(--accent-primary)', color: 'black'} : {}}
                                                    onClick={() => { setFormUnit(u.name); setShowUnitPicker(false); }}
                                                >
                                                    {u.icon} {u.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {!formParentId && parentGoals.length > 0 && (
                            <div className="m-form__section">
                                <span className="m-form__section-label">Part of (optional)</span>
                                <div className="m-form__row" style={{flexWrap: 'wrap', gap: '8px'}}>
                                    {parentGoals.map(pg => (
                                        <button
                                            key={pg.id}
                                            type="button"
                                            className="m-form__pill"
                                            onClick={() => setFormParentId(formParentId === pg.id ? null : pg.id)}
                                            style={formParentId === pg.id ? { borderColor: pg.color, background: pg.color + '20', color: 'white' } : {}}
                                        >
                                            <span style={{marginRight: '6px'}}>{pg.icon}</span>
                                            {pg.title}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <button
                            className="m-form__submit"
                            onClick={handleCreate}
                            disabled={
                                !formTitle.trim() ||
                                (!formParentId && hasFinishLine === null) ||
                                (hasFinishLine === true && (!formTarget || !formUnit.trim()))
                            }
                        >
                            {formParentId ? 'Add Sub-Goal' : 'Create Goal'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* ═══ Progress Logger Modal ═══ */}
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
                                    </p>
                                </div>
                            </div>

                            <div className="progress-logger__input-section">
                                <label className="progress-logger__label">How many {goal.unit} today?</label>
                                <div className="progress-logger__input-wrap">
                                    <input
                                        type="number"
                                        className="progress-logger__input"
                                        value={progressInput}
                                        onChange={(e) => setProgressInput(e.target.value)}
                                        placeholder="0"
                                        autoFocus
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleLogProgress(goal.id); }}
                                    />
                                    <span className="progress-logger__unit">{goal.unit}</span>
                                </div>
                                {remaining > 0 && (
                                    <span className="progress-logger__remaining">
                                        {remaining.toLocaleString()} {goal.unit} remaining
                                    </span>
                                )}
                            </div>

                            {/* Quick amount buttons */}
                            <div className="progress-logger__quick">
                                {[5, 10, 25, 50, 100].filter(n => goal.targetValue && n <= goal.targetValue).map(n => (
                                    <button
                                        key={n}
                                        className="progress-logger__quick-btn"
                                        onClick={() => setProgressInput(String(n))}
                                    >
                                        +{n}
                                    </button>
                                ))}
                            </div>

                            <button
                                className="progress-logger__submit"
                                onClick={() => handleLogProgress(goal.id)}
                                disabled={!progressInput || parseFloat(progressInput) <= 0}
                                style={{ background: goal.color }}
                            >
                                Log Progress →
                            </button>
                        </div>
                    );
                })()}
            </Modal>


            {/* ═══ Correct Progress Modal ═══ */}
            <Modal isOpen={!!correctingGoalId} onClose={() => setCorrectingGoalId(null)} title="Correct Progress" size="sm">
                {correctingGoalId && (() => {
                    const goal = goals.find(g => g.id === correctingGoalId);
                    if (!goal) return null;
                    return (
                        <div className="progress-logger">
                            <div className="progress-logger__goal-info">
                                <span className="progress-logger__goal-icon" style={{ background: goal.color + '20' }}>{goal.icon}</span>
                                <div>
                                    <strong>{goal.title}</strong>
                                    <p className="progress-logger__current">
                                        Current: {goal.currentValue.toLocaleString()} {goal.unit}
                                    </p>
                                </div>
                            </div>
                            <div className="progress-logger__input-section">
                                <label className="progress-logger__label">Adjust by how much?</label>
                                <div className="progress-logger__input-wrap">
                                    <button
                                        type="button"
                                        className={`goal-correct__sign-btn ${correctIsNegative ? 'goal-correct__sign-btn--neg' : 'goal-correct__sign-btn--pos'}`}
                                        onClick={() => setCorrectIsNegative(v => !v)}
                                    >
                                        {correctIsNegative ? '−' : '+'}
                                    </button>
                                    <input
                                        type="number"
                                        className="progress-logger__input"
                                        value={correctDelta}
                                        onChange={e => setCorrectDelta(e.target.value)}
                                        placeholder="0"
                                        autoFocus
                                        min="0"
                                        step="0.1"
                                    />
                                    <span className="progress-logger__unit">{goal.unit}</span>
                                </div>
                            </div>
                            <div className="progress-logger__input-section">
                                <label className="progress-logger__label">Reason (optional)</label>
                                <input
                                    type="text"
                                    className="progress-logger__input"
                                    style={{ width: '100%', padding: 'var(--sp-2) var(--sp-3)' }}
                                    placeholder="e.g. Logged wrong amount"
                                    value={correctNote}
                                    onChange={e => setCorrectNote(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleCorrectProgress(); }}
                                />
                            </div>
                            <button
                                className="progress-logger__submit"
                                onClick={handleCorrectProgress}
                                disabled={!correctDelta || parseFloat(correctDelta) <= 0}
                                style={{ background: goal.color }}
                            >
                                Apply Correction →
                            </button>
                        </div>
                    );
                })()}
            </Modal>
        </div>
    );
}
