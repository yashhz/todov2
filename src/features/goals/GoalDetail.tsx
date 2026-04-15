import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGoals, useTasks, useHabits } from '../../hooks/useStore';
import { getTodayStr } from '../../services/recurrence';
import Modal from '../../components/Modal';
import ProgressBar from '../../components/ProgressBar';
import { ChevronLeft, Plus, CheckCircle2, Circle, Flame, ChevronRight, ListTodo, Repeat2, History, Target } from 'lucide-react';
import './GoalDetail.css';

export default function GoalDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { goals, getAggregateProgress, logProgress } = useGoals();
    const { tasks, toggleTask } = useTasks();
    const { habits, toggleHabit } = useHabits();

    const [progressModal, setProgressModal] = useState(false);
    const [progressInput, setProgressInput] = useState('');

    const goal = goals.find(g => g.id === id);
    const todayStr = getTodayStr();

    if (!goal) {
        return (
            <div className="gd2-page page-enter">
                <button className="gd2-back" onClick={() => navigate('/goals')}>
                    <ChevronLeft size={14} /> Goals
                </button>
                <p style={{ color: 'var(--text-tertiary)', marginTop: '60px' }}>Goal not found.</p>
            </div>
        );
    }

    const linkedTasks = useMemo(() =>
        tasks.filter(t => t.linkedGoalId === goal.id || t.goalLinks?.some(l => l.goalId === goal.id))
    , [tasks, goal.id]);

    const linkedHabits = useMemo(() =>
        habits.filter(h => h.linkedGoalId === goal.id || h.goalLinks?.some(l => l.goalId === goal.id))
    , [habits, goal.id]);

    const subGoals = useMemo(() => goals.filter(g => g.parentGoalId === goal.id), [goals, goal.id]);
    const parentGoal = goal.parentGoalId ? goals.find(g => g.id === goal.parentGoalId) : null;

    const isUmbrella = goal.goalType === 'outcome';
    const aggProgress = getAggregateProgress(goal.id);
    const currentVal = isUmbrella ? aggProgress.percent : goal.currentValue;
    const maxVal = isUmbrella ? 100 : (goal.targetValue ?? 100);
    const pct = maxVal > 0 ? Math.min(Math.round((currentVal / maxVal) * 100), 100) : 0;

    const activeTasks = linkedTasks.filter(t => !t.completed);
    const doneTasks = linkedTasks.filter(t => t.completed);

    const goalId = goal.id;

    function handleLogProgress() {
        const val = parseFloat(progressInput);
        if (!isNaN(val) && val > 0) {
            logProgress(goalId, val);
            setProgressModal(false);
            setProgressInput('');
        }
    }

    return (
        <div className="gd2-page page-enter">

            {/* ── Breadcrumb ── */}
            <div className="gd2-breadcrumb">
                <button className="gd2-back" onClick={() => navigate('/goals')}>
                    <ChevronLeft size={14} /> Goals
                </button>
                {parentGoal && (
                    <>
                        <span className="gd2-breadcrumb__sep">/</span>
                        <button className="gd2-back" onClick={() => navigate(`/goals/${parentGoal.id}`)}>
                            {parentGoal.icon} {parentGoal.title}
                        </button>
                    </>
                )}
            </div>

            {/* ── Hero ── */}
            <div className="gd2-hero">
                <div className="gd2-hero__top">
                    <div className="gd2-hero__icon-wrap" style={{ background: goal.color + '18' }}>
                        <span style={{ fontSize: 24 }}>{goal.icon}</span>
                    </div>
                    <div className="gd2-hero__text">
                        <h1 className="gd2-hero__title">{goal.title}</h1>
                        {goal.why && <p className="gd2-hero__why">"{goal.why}"</p>}
                        {goal.description && <p className="gd2-hero__desc">{goal.description}</p>}
                    </div>
                </div>

                {/* Progress section */}
                <div className="gd2-hero__progress">
                    <div className="gd2-prog-header">
                        <div className="gd2-prog-nums">
                            {isUmbrella ? (
                                <span className="gd2-prog-big" style={{ color: goal.color }}>{pct}%</span>
                            ) : (
                                <>
                                    <span className="gd2-prog-big" style={{ color: goal.color }}>
                                        {goal.currentValue.toLocaleString()}
                                    </span>
                                    <span className="gd2-prog-max">/ {goal.targetValue!.toLocaleString()} {goal.unit}</span>
                                </>
                            )}
                        </div>
                        {!isUmbrella && (
                            <button className="gd2-log-btn" onClick={() => setProgressModal(true)}>
                                <Plus size={12} /> Log
                            </button>
                        )}
                    </div>
                    <ProgressBar value={currentVal} max={maxVal} color={goal.color} showPercent={false} size="md" />
                </div>
            </div>

            {/* ── Sub-goals ── */}
            {subGoals.length > 0 && (
                <section className="gd2-section">
                    <div className="gd2-section__hd">
                        <Target size={13} strokeWidth={2.5} />
                        <span>Sub-Goals</span>
                        <span className="gd2-badge">{subGoals.length}</span>
                    </div>
                    <div className="gd2-subgoals">
                        {subGoals.map(sg => {
                            const sgPct = sg.targetValue ? Math.min(Math.round((sg.currentValue / sg.targetValue) * 100), 100) : 0;
                            return (
                                <div key={sg.id} className="gd2-subgoal" onClick={() => navigate(`/goals/${sg.id}`)}>
                                    <span className="gd2-subgoal__icon">{sg.icon}</span>
                                    <div className="gd2-subgoal__body">
                                        <div className="gd2-subgoal__row">
                                            <span className="gd2-subgoal__title">{sg.title}</span>
                                            <span className="gd2-subgoal__pct" style={{ color: sg.color }}>{sgPct}%</span>
                                        </div>
                                        <div className="gd2-subgoal__bar">
                                            <div className="gd2-subgoal__fill" style={{ width: `${sgPct}%`, background: sg.color }} />
                                        </div>
                                    </div>
                                    <ChevronRight size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* ── Tasks ── */}
            {linkedTasks.length > 0 && (
                <section className="gd2-section">
                    <div className="gd2-section__hd">
                        <ListTodo size={13} strokeWidth={2.5} />
                        <span>Tasks</span>
                        <span className="gd2-badge">{linkedTasks.length}</span>
                    </div>
                    <div className="gd2-task-list">
                        {activeTasks.map(task => (
                            <div key={task.id} className="gd2-task">
                                <button className="gd2-task__check" onClick={() => toggleTask(task.id)}>
                                    <Circle size={17} />
                                </button>
                                <span className="gd2-task__title">{task.title}</span>
                                {task.dueDate && (
                                    <span className="gd2-task__due">
                                        {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    </span>
                                )}
                            </div>
                        ))}
                        {doneTasks.map(task => (
                            <div key={task.id} className="gd2-task gd2-task--done">
                                <button className="gd2-task__check" onClick={() => toggleTask(task.id)} style={{ color: '#22c55e' }}>
                                    <CheckCircle2 size={17} />
                                </button>
                                <span className="gd2-task__title gd2-task__title--done">{task.title}</span>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── Habits ── */}
            {linkedHabits.length > 0 && (
                <section className="gd2-section">
                    <div className="gd2-section__hd">
                        <Repeat2 size={13} strokeWidth={2.5} />
                        <span>Habits</span>
                        <span className="gd2-badge">{linkedHabits.length}</span>
                    </div>
                    <div className="gd2-task-list">
                        {linkedHabits.map(habit => {
                            const isDone = habit.completions.find(c => c.date === todayStr)?.completed ?? false;
                            return (
                                <div key={habit.id} className={`gd2-habit ${isDone ? 'gd2-habit--done' : ''}`}>
                                    <span className="gd2-habit__dot" style={{ background: habit.color }} />
                                    <span className="gd2-habit__title">{habit.title}</span>
                                    {habit.streak > 0 && (
                                        <span className="gd2-habit__streak"><Flame size={11} /> {habit.streak}d</span>
                                    )}
                                    <button
                                        className={`gd2-habit__check ${isDone ? 'gd2-habit__check--done' : ''}`}
                                        onClick={() => toggleHabit(habit.id, todayStr)}
                                        style={isDone ? { background: habit.color, borderColor: habit.color } : {}}
                                    >
                                        {isDone && (
                                            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                                                <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* ── History ── */}
            {!isUmbrella && goal.entries.length > 0 && (
                <section className="gd2-section">
                    <div className="gd2-section__hd">
                        <History size={13} strokeWidth={2.5} />
                        <span>Recent Progress</span>
                    </div>
                    <div className="gd2-history">
                        {[...goal.entries].reverse().slice(0, 8).map(entry => (
                            <div key={entry.id} className="gd2-history__row">
                                <span className="gd2-history__date">
                                    {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                                <span className="gd2-history__val" style={{ color: goal.color }}>
                                    +{entry.value} {goal.unit}
                                </span>
                                {entry.note && <span className="gd2-history__note">{entry.note}</span>}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── Log Modal ── */}
            <Modal isOpen={progressModal} onClose={() => setProgressModal(false)} title="Log Progress" size="sm">
                <div className="progress-logger">
                    <div className="progress-logger__goal-info">
                        <span className="progress-logger__goal-icon" style={{ background: goal.color + '20' }}>{goal.icon}</span>
                        <div>
                            <strong>{goal.title}</strong>
                            <p className="progress-logger__current">
                                {goal.currentValue.toLocaleString()} / {goal.targetValue!.toLocaleString()} {goal.unit}
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
                                placeholder="0"
                                autoFocus
                                onKeyDown={e => { if (e.key === 'Enter') handleLogProgress(); }}
                            />
                            <span className="progress-logger__unit">{goal.unit}</span>
                        </div>
                    </div>
                    <div className="progress-logger__quick">
                        {[5, 10, 25, 50, 100].filter(n => goal.targetValue && n <= goal.targetValue).map(n => (
                            <button key={n} type="button" className="progress-logger__quick-btn" onClick={() => setProgressInput(String(n))}>+{n}</button>
                        ))}
                    </div>
                    <button
                        className="progress-logger__submit"
                        onClick={handleLogProgress}
                        disabled={!progressInput || parseFloat(progressInput) <= 0}
                        style={{ background: goal.color }}
                    >
                        Log Progress →
                    </button>
                </div>
            </Modal>
        </div>
    );
}
