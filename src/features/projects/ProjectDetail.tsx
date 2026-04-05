import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProjects, useTasks, useHabits, useGoals } from '../../hooks/useStore';
import { getTodayStr } from '../../services/recurrence';
import { calcPressureScore, getPressureLevel, getPressureLabel } from '../../services/pressureScore';
import Modal from '../../components/Modal';
import { ChevronLeft, Pencil, CheckCircle2, Circle, Flame, ListTodo, Repeat2 } from 'lucide-react';
import './ProjectDetail.css';

function formatTime12(time: string): string {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`;
}

const PROJECT_COLORS = [
    '#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#a78bfa',
    '#fb7185', '#22d3ee', '#34d399', '#fb923c', '#f472b6',
];

export default function ProjectDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { projects, updateProject } = useProjects();
    const { tasks, toggleTask: storeToggleTask } = useTasks();
    const { habits, toggleHabit } = useHabits();
    const { goals } = useGoals();

    const [showEdit, setShowEdit] = useState(false);
    const [animatingTaskId, setAnimatingTaskId] = useState<string | null>(null);
    const [formName, setFormName] = useState('');
    const [formColor, setFormColor] = useState(PROJECT_COLORS[0]);
    const [formDesc, setFormDesc] = useState('');

    const project = projects.find(p => p.id === id);

    if (!project) {
        return (
            <div className="pd2-page page-enter">
                <button className="pd2-back" onClick={() => navigate('/projects')}>
                    <ChevronLeft size={16} /> Projects
                </button>
                <p style={{ color: 'var(--text-tertiary)', marginTop: '60px' }}>Project not found.</p>
            </div>
        );
    }

    const projectTasks = tasks.filter(t => t.projectId === id);
    const projectHabits = habits.filter(h => h.projectId === id);
    const linkedGoal = goals.find(g => g.id === project.linkedGoalId);
    const todayStr = getTodayStr();

    const activeTasks = projectTasks.filter(t => !t.completed || t.id === animatingTaskId);
    const doneTasks = projectTasks.filter(t => t.completed && t.id !== animatingTaskId);
    const completionPct = projectTasks.length > 0 ? Math.round((doneTasks.length / projectTasks.length) * 100) : 0;

    function openEdit() {
        setFormName(project!.name);
        setFormColor(project!.color);
        setFormDesc(project!.description);
        setShowEdit(true);
    }

    function toggleTask(taskId: string) {
        setAnimatingTaskId(taskId);
        setTimeout(() => { storeToggleTask(taskId); setAnimatingTaskId(null); }, 800);
    }

    function handleUpdate() {
        if (!formName.trim() || !project) return;
        updateProject({ ...project, name: formName.trim(), color: formColor, description: formDesc.trim() });
        setShowEdit(false);
    }

    const statusColors: Record<string, string> = {
        active: '#22c55e',
        paused: '#f59e0b',
        archived: '#6b7280',
        completed: '#3b82f6',
    };

    return (
        <div className="pd2-page page-enter">

            {/* ── Breadcrumb ── */}
            <button className="pd2-back" onClick={() => navigate('/projects')}>
                <ChevronLeft size={14} /> Projects
            </button>

            {/* ── Title block ── */}
            <div className="pd2-hero">
                <div className="pd2-hero__left">
                    <div className="pd2-hero__icon-wrap" style={{ background: project.color + '18', color: project.color }}>
                        <span style={{ fontSize: 22 }}>{project.icon}</span>
                    </div>
                    <div>
                        <h1 className="pd2-hero__title">{project.name}</h1>
                        {project.description && <p className="pd2-hero__desc">{project.description}</p>}
                    </div>
                </div>
                <button className="pd2-edit-btn" onClick={openEdit} title="Edit">
                    <Pencil size={13} />
                </button>
            </div>

            {/* ── Stat strip ── */}
            <div className="pd2-stats">
                <div className="pd2-stat">
                    <span className="pd2-stat__val">{activeTasks.length}</span>
                    <span className="pd2-stat__label">open</span>
                </div>
                <div className="pd2-stat-sep" />
                <div className="pd2-stat">
                    <span className="pd2-stat__val">{doneTasks.length}</span>
                    <span className="pd2-stat__label">done</span>
                </div>
                <div className="pd2-stat-sep" />
                <div className="pd2-stat">
                    <span className="pd2-stat__val">{projectHabits.length}</span>
                    <span className="pd2-stat__label">habits</span>
                </div>
                {linkedGoal && (
                    <>
                        <div className="pd2-stat-sep" />
                        <div className="pd2-stat pd2-stat--goal">
                            <span style={{ fontSize: 12 }}>{linkedGoal.icon}</span>
                            <span className="pd2-stat__label">{linkedGoal.title}</span>
                        </div>
                    </>
                )}
                <div className="pd2-stat-sep" />
                <div className="pd2-stat">
                    <span className="pd2-stat__dot" style={{ background: statusColors[project.status] || '#6b7280' }} />
                    <span className="pd2-stat__label" style={{ textTransform: 'capitalize' }}>{project.status}</span>
                </div>
            </div>

            {/* ── Progress track ── */}
            {projectTasks.length > 0 && (
                <div className="pd2-progress">
                    <div className="pd2-progress__track">
                        <div className="pd2-progress__fill" style={{ width: `${completionPct}%`, background: project.color }} />
                    </div>
                    <span className="pd2-progress__pct" style={{ color: project.color }}>{completionPct}%</span>
                </div>
            )}

            {/* ── Content ── */}
            <div className="pd2-body">

                {/* Tasks */}
                <section className="pd2-section">
                    <div className="pd2-section__hd">
                        <ListTodo size={13} strokeWidth={2.5} />
                        <span>Tasks</span>
                        {activeTasks.length > 0 && <span className="pd2-badge">{activeTasks.length}</span>}
                    </div>

                    {activeTasks.length === 0 ? (
                        <p className="pd2-empty">No active tasks. Create tasks and link them to this project.</p>
                    ) : (
                        activeTasks.map(task => {
                            const pressureScore = calcPressureScore(task, goals);
                            const pressureLevel = getPressureLevel(pressureScore);
                            const pressureLabel = getPressureLabel(pressureScore);

                            return (
                                <div key={task.id} className={`pd2-task ${task.completed ? 'pd2-task--done' : ''}`}>
                                    <button
                                        className="pd2-task__check"
                                        onClick={() => toggleTask(task.id)}
                                    >
                                        {task.completed
                                            ? <CheckCircle2 size={17} style={{ color: '#22c55e' }} />
                                            : <Circle size={17} />}
                                    </button>
                                    <div className="pd2-task__content">
                                        <div className="pd2-task__row">
                                            <span className={`pd2-task__title ${task.completed ? 'pd2-task__title--done' : ''}`}>{task.title}</span>
                                            {!task.completed && pressureLabel && (
                                                <span className={`pd2-pressure pd2-pressure--${pressureLevel}`}>{pressureLabel}</span>
                                            )}
                                            {task.priority === 'high' && !task.completed && (
                                                <span className="pd2-prio">High</span>
                                            )}
                                        </div>
                                        {task.description && <p className="pd2-task__desc">{task.description}</p>}
                                        {(task.dueDate || task.duration || task.subtasks.length > 0) && (
                                            <div className="pd2-task__meta">
                                                {task.dueDate && (
                                                    <span>📅 {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                        {task.dueTime && ` · ${formatTime12(task.dueTime)}`}</span>
                                                )}
                                                {task.subtasks.length > 0 && (
                                                    <span>☐ {task.subtasks.filter(s => s.completed).length}/{task.subtasks.length}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </section>

                {/* Habits */}
                {projectHabits.length > 0 && (
                    <section className="pd2-section">
                        <div className="pd2-section__hd">
                            <Repeat2 size={13} strokeWidth={2.5} />
                            <span>Habits</span>
                            <span className="pd2-badge">{projectHabits.length}</span>
                        </div>
                        {projectHabits.map(habit => {
                            const isDone = habit.completions.find(c => c.date === todayStr)?.completed ?? false;
                            return (
                                <div key={habit.id} className={`pd2-habit ${isDone ? 'pd2-habit--done' : ''}`}>
                                    <span className="pd2-habit__dot" style={{ background: habit.color }} />
                                    <span className="pd2-habit__title">{habit.title}</span>
                                    {habit.streak > 0 && (
                                        <span className="pd2-habit__streak">
                                            <Flame size={11} /> {habit.streak}d
                                        </span>
                                    )}
                                    <button
                                        className={`pd2-habit__check ${isDone ? 'pd2-habit__check--done' : ''}`}
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
                    </section>
                )}

                {/* Completed tasks */}
                {doneTasks.length > 0 && (
                    <section className="pd2-section pd2-section--dim">
                        <div className="pd2-section__hd">
                            <CheckCircle2 size={13} strokeWidth={2.5} />
                            <span>Completed</span>
                            <span className="pd2-badge">{doneTasks.length}</span>
                        </div>
                        {doneTasks.map(task => (
                            <div key={task.id} className="pd2-task pd2-task--done">
                                <button className="pd2-task__check" onClick={() => toggleTask(task.id)}>
                                    <CheckCircle2 size={17} style={{ color: '#22c55e' }} />
                                </button>
                                <span className="pd2-task__title pd2-task__title--done">{task.title}</span>
                            </div>
                        ))}
                    </section>
                )}
            </div>

            <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Edit Project" size="sm">
                <div className="m-form">
                    <div className="m-form__title-wrap">
                        <input
                            className="m-form__title"
                            placeholder="Project name"
                            value={formName}
                            onChange={e => setFormName(e.target.value)}
                            autoFocus
                        />
                        <div className="m-form__title-line" />
                    </div>
                    <div className={`m-form__body ${formName.trim() ? 'm-form__body--visible' : ''}`}>
                        <div className="m-form__section">
                            <textarea
                                className="m-form__title"
                                style={{ fontSize: '14px', fontWeight: 400, minHeight: '36px', resize: 'none' }}
                                placeholder="Description (optional)"
                                value={formDesc}
                                onChange={e => setFormDesc(e.target.value)}
                                rows={2}
                            />
                        </div>
                        <div className="m-form__section">
                            <span className="m-form__section-label">Color</span>
                            <div className="m-form__row" style={{ gap: '10px' }}>
                                {PROJECT_COLORS.map(color => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setFormColor(color)}
                                        style={{
                                            width: '22px', height: '22px', borderRadius: '50%',
                                            background: color, border: 'none', cursor: 'pointer', flexShrink: 0,
                                            transform: formColor === color ? 'scale(1.25)' : 'scale(1)',
                                            boxShadow: formColor === color ? `0 0 0 2px var(--bg-primary), 0 0 0 3.5px ${color}` : 'none',
                                            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                        <button className="m-form__submit" onClick={handleUpdate}>Save</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
