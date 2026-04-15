/* ═══════════════════════════════════════════════════════════
   PROJECTS PAGE — Advanced Premium Design
   Glassmorphism, Bento-style layout, Natural Motion
   ═══════════════════════════════════════════════════════════ */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects, useTasks, useHabits, useGoals } from '../../hooks/useStore';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import type { Project, ProjectStatus } from '../../types';
import Modal from '../../components/Modal';
import { Card } from '../../components/Card';
import { SmartFilter } from '../../components/SmartFilter';
import type { FilterGroupConfig } from '../../components/SmartFilter';
import { Edit, Trash2 } from 'lucide-react';
import './Projects.css';

const PROJECT_COLORS = [
    '#f59e0b', '#ef4444', '#22c55e', '#3b82f6', '#a78bfa',
    '#fb7185', '#22d3ee', '#34d399', '#fb923c', '#f472b6',
];

// Modern project icons as SVGs
type ProjectIconId = 'folder' | 'globe' | 'shield' | 'cpu' | 'layout' | 'briefcase' | 'home' | 'rocket' | 'music' | 'zap' | 'database' | 'star';
const PROJECT_ICON_IDS: ProjectIconId[] = ['folder', 'globe', 'shield', 'cpu', 'layout', 'briefcase', 'home', 'rocket', 'music', 'zap', 'database', 'star'];

function ProjectIcon({ id }: { id: string }) {
    const icons: Record<string, React.ReactNode> = {
        folder:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>,
        globe:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>,
        shield:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>,
        cpu:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="15" x2="23" y2="15"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="15" x2="4" y2="15"></line></svg>,
        layout:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>,
        briefcase: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,
        home:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
        rocket:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"></path><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"></path><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"></path><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"></path></svg>,
        music:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>,
        zap:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>,
        database:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>,
        star:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>,
        edit:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>,
        trash:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>,
    };
    return icons[id] || icons.folder;
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
    { value: 'active',   label: 'Active' },
    { value: 'paused',   label: 'Paused' },
    { value: 'archived', label: 'Archived' },
];

export default function ProjectsPage() {
    const navigate = useNavigate();
    const { projects, addProject, updateProject, deleteProject } = useProjects();
    const { tasks } = useTasks();
    const { habits } = useHabits();
    const { goals } = useGoals();

    const [showForm, setShowForm] = useState(false);
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('active');
    const [selectedFilterGoals, setSelectedFilterGoals] = useState<string[]>([]);

    useKeyboardShortcut('n', () => { resetForm(); setShowForm(true); });
    const [showFilters, setShowFilters] = useState<string | null>(null);

    // Form state
    const [formName, setFormName] = useState('');
    const [formColor, setFormColor] = useState(PROJECT_COLORS[0]);
    const [formIcon, setFormIcon] = useState(PROJECT_ICON_IDS[0]);
    const [formDesc, setFormDesc] = useState('');
    const [formStatus, setFormStatus] = useState<ProjectStatus>('active');
    const [formGoalId, setFormGoalId] = useState<string | null>(null);
    const [nameShake, setNameShake] = useState(false);

    function resetForm() {
        setFormName(''); setFormColor(PROJECT_COLORS[0]); setFormIcon(PROJECT_ICON_IDS[0]);
        setFormDesc(''); setFormStatus('active'); setFormGoalId(null);
        setEditingProject(null);
    }

    function openNew() { resetForm(); setShowForm(true); }

    function openEdit(p: Project) {
        setEditingProject(p);
        setFormName(p.name);
        setFormColor(p.color);
        setFormIcon(p.icon as ProjectIconId);
        setFormDesc(p.description);
        setFormStatus(p.status);
        setFormGoalId(p.linkedGoalId);
        setShowForm(true);
    }

    function confirmDelete(id: string) {
        deleteProject(id);
        setDeleteConfirm(null);
    }

    function handleSubmit() {
        if (!formName.trim()) {
            setNameShake(true);
            setTimeout(() => setNameShake(false), 500);
            return;
        }
        const data = {
            name: formName.trim(),
            color: formColor,
            icon: formIcon,
            description: formDesc.trim(),
            status: formStatus,
            linkedGoalId: formGoalId
        };
        if (editingProject) {
            updateProject({ ...editingProject, ...data });
        } else {
            addProject(data);
        }
        setShowForm(false);
        resetForm();
    }

    const filtered = projects.filter(p => {
        if (statusFilter !== 'all' && p.status !== statusFilter) return false;
        if (selectedFilterGoals.length > 0 && (!p.linkedGoalId || !selectedFilterGoals.includes(p.linkedGoalId))) return false;
        return true;
    });

    const activeFilterCount = (statusFilter !== 'all' ? 1 : 0) + (selectedFilterGoals.length > 0 ? 1 : 0);

    function getProjectStats(projectId: string) {
        const projectTasks = tasks.filter(t => t.projectId === projectId);
        const projectHabits = habits.filter(h => h.projectId === projectId);
        const done = projectTasks.filter(t => t.completed).length;
        return { total: projectTasks.length, done, habits: projectHabits.length };
    }

    const filterGroups: FilterGroupConfig[] = [
        {
            id: 'status',
            type: 'single',
            selected: statusFilter,
            onSelect: (v) => setStatusFilter(v as ProjectStatus | 'all'),
            getTriggerLabel: (v) => v as string,
            suffixText: ' projects ',
            options: (['all', 'active', 'paused', 'archived'] as const).map(s => ({
                id: s,
                label: s.charAt(0).toUpperCase() + s.slice(1)
            }))
        },
        {
            id: 'goals',
            type: 'multiple',
            selected: selectedFilterGoals,
            onSelect: (v) => setSelectedFilterGoals(v as string[]),
            prefixText: 'aiming for ',
            getTriggerLabel: (v) => {
                const arr = v as string[];
                if (arr.length === 0) return 'any goal';
                if (arr.length === 1) return goals.find(g => g.id === arr[0])?.title || 'Goal';
                return `${arr.length} goals`;
            },
            options: goals.map(g => ({
                id: g.id,
                label: <>{g.icon} {g.title}</>
            }))
        }
    ];

    return (
        <div className="projects-page page-enter">
            {/* Minimal Header */}
            <header className="projects-header">
                <div className="projects-header__title-group">
                    <h1 className="projects-title">Projects</h1>
                    <span className="projects-count">{projects.filter(p => p.status === 'active').length} active</span>
                </div>
                <button className="m-add-btn" onClick={() => { setEditingProject(null); setShowForm(true); }}>
                    <span>+</span> New Project
                </button>
            </header>

            <SmartFilter
                style={{ marginBottom: 'var(--sp-4)' }}
                groups={filterGroups}
                activeGroup={showFilters}
                onToggleGroup={setShowFilters}
                showClearAll={activeFilterCount > 0}
                onClearAll={() => {
                    setStatusFilter('all');
                    setSelectedFilterGoals([]);
                    setShowFilters(null);
                }}
            />

            {/* Project grid */}
            <main className="projects-grid">
                {filtered.length === 0 ? (
                    <div className="projects-empty-human">
                        <div className="projects-empty__visual">
                            <ProjectIcon id="folder" />
                        </div>
                        <h3>No projects found</h3>
                        <p>No projects yet. Add the first thing that needs to happen.</p>
                        <button className="projects-empty__btn" onClick={openNew}>Create Project</button>
                    </div>
                ) : (
                    filtered.map(project => {
                        const stats = getProjectStats(project.id);
                        const linkedGoal = goals.find(g => g.id === project.linkedGoalId);
                        const completionPct = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

                        // Determine status color based on project status (functional colors)
                        const statusColor = project.status === 'active' 
                            ? 'var(--color-success)' 
                            : project.status === 'archived' 
                            ? 'var(--color-danger)' 
                            : 'rgba(255, 255, 255, 0.3)';

                        // Build metadata array
                        const metadata = [];
                        
                        // Task count and completion percentage
                        if (stats.total > 0) {
                            metadata.push({
                                label: '',
                                value: `${stats.total} ${stats.total === 1 ? 'task' : 'tasks'} · ${completionPct}% complete`
                            });
                        } else {
                            metadata.push({
                                label: '',
                                value: 'No tasks yet'
                            });
                        }

                        // Habits count
                        if (stats.habits > 0) {
                            metadata.push({
                                label: '',
                                value: `${stats.habits} ${stats.habits === 1 ? 'habit' : 'habits'}`
                            });
                        }

                        // Linked goal
                        if (linkedGoal) {
                            metadata.push({
                                label: '',
                                value: linkedGoal.title
                            });
                        }

                        return (
                            <Card
                                key={project.id}
                                statusType="dot"
                                statusColor={statusColor}
                                title={project.name}
                                subtitle={project.description || 'No description provided.'}
                                metadata={metadata}
                                actions={
                                    <>
                                        <button 
                                            className="card__action-btn" 
                                            onClick={(e) => { e.stopPropagation(); openEdit(project); }}
                                            title="Edit Project"
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button 
                                            className="card__action-btn card__action-btn--danger" 
                                            onClick={(e) => { e.stopPropagation(); setDeleteConfirm(project.id); }}
                                            title="Delete Project"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </>
                                }
                                onClick={() => navigate(`/projects/${project.id}`)}
                            />
                        );
                    })
                )}
            </main>

            {/* Create/Edit Modal */}
            <Modal
                isOpen={showForm}
                onClose={() => { setShowForm(false); resetForm(); }}
                title={editingProject ? 'Configure Stream' : 'New Project'}
                size="md"
            >
                <div className="m-form">
                    <div className="m-form__title-wrap">
                        <input
                            type="text"
                            className={`m-form__title ${nameShake ? 'm-form__title--shake' : ''}`}
                            placeholder="Name your project..."
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
                                style={{fontSize: '15px', fontWeight: 500, minHeight: '60px', resize: 'none'}}
                                placeholder="Briefly describe the objective..."
                                value={formDesc}
                                onChange={e => setFormDesc(e.target.value)}
                                rows={2}
                            />
                        </div>

                        <div className="m-form__section">
                            <span className="m-form__section-label">Identity</span>
                            <div className="m-form__row m-form__row--scrollable" style={{background: 'rgba(255,255,255,0.03)', padding: '6px', borderRadius: '24px', maxWidth: '100%'}}>
                                {PROJECT_ICON_IDS.map(iconId => (
                                    <button
                                        key={iconId}
                                        type="button"
                                        onClick={() => setFormIcon(iconId)}
                                        style={{
                                            width: '36px', height: '36px', borderRadius: '50%', border: 'none', 
                                            background: formIcon === iconId ? 'rgba(255,255,255,0.12)' : 'transparent',
                                            color: formColor, fontSize: '16px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                            transition: 'all 0.2s ease-out'
                                        }}
                                    >
                                        <ProjectIcon id={iconId} />
                                    </button>
                                ))}
                            </div>
                            <div className="m-form__row m-form__row--scrollable" style={{background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '24px', maxWidth: '100%', gap: '12px', marginTop: '4px'}}>
                                {PROJECT_COLORS.map(color => (
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
                            <span className="m-form__section-label">Alignment</span>
                            <div className="m-form__row">
                                {STATUS_OPTIONS.map(opt => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        className={`m-form__pill ${formStatus === opt.value ? 'm-form__pill--active' : ''}`}
                                        onClick={() => setFormStatus(opt.value)}
                                    >{opt.label}</button>
                                ))}
                            </div>
                        </div>

                        {goals.length > 0 && (
                            <div className="m-form__section">
                                <span className="m-form__section-label">Contributes to Goal</span>
                                <select
                                    style={{
                                        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', 
                                        borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'white', 
                                        fontSize: '14px', width: '100%', outline: 'none', appearance: 'none', cursor: 'pointer',
                                        fontFamily: 'var(--font-body)', fontWeight: 500
                                    }}
                                    value={formGoalId || ''}
                                    onChange={e => setFormGoalId(e.target.value || null)}
                                >
                                    <option value="" style={{background: 'var(--bg-secondary)'}}>No linked goal</option>
                                    {goals.map(g => (
                                        <option key={g.id} value={g.id} style={{background: 'var(--bg-secondary)'}}>{g.icon} {g.title}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <button className="m-form__submit" onClick={handleSubmit}>
                            {editingProject ? 'Apply Changes' : 'Initialize Command'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Delete confirmation */}
            <Modal
                isOpen={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                title="Deconstruct Project"
                size="sm"
            >
                <div className="project-delete-confirm">
                    {deleteConfirm && (() => {
                        const p = projects.find(p => p.id === deleteConfirm);
                        return (
                            <>
                                <p className="project-delete-confirm__text">
                                    Are you sure you want to deconstruct <strong>{p?.name}</strong>?
                                    Tasks and habits will be unlinked but will remain in your system.
                                </p>
                                <div className="project-delete-confirm__actions">
                                    <button className="project-delete-confirm__cancel" onClick={() => setDeleteConfirm(null)}>Abort</button>
                                    <button className="project-delete-confirm__delete" onClick={() => confirmDelete(deleteConfirm)}>Confirm Deconstruction</button>
                                </div>
                            </>
                        );
                    })()}
                </div>
            </Modal>
        </div>
    );
}
