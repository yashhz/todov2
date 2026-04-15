/* ═══════════════════════════════════════════════════════════
   SEEDER SERVICE — Populate app with realistic demo data
   ═══════════════════════════════════════════════════════════ */

import type { AppState, Project, Goal, Habit, Task } from '../types';
import { saveState } from './storage';

export function seedDemoData() {
    console.log('🌱 Seeding demo data...');

    const projects: Project[] = [
        { id: 'proj-saas', name: 'Launch SaaS App', color: '#60a5fa', icon: '🚀', description: 'Next-gen productivity tool', status: 'active', linkedGoalId: 'goal-revenue', createdAt: new Date().toISOString() },
        { id: 'proj-fitness', name: 'Marathon 2024', color: '#f87171', icon: '🏃', description: 'Training for the city marathon', status: 'active', linkedGoalId: 'goal-health', createdAt: new Date().toISOString() },
        { id: 'proj-house', name: 'Home Renovation', color: '#fbbf24', icon: '🏠', description: 'Upgrading the kitchen and garden', status: 'active', linkedGoalId: null, createdAt: new Date().toISOString() },
    ];

    const goals: Goal[] = [
        { id: 'goal-revenue', title: 'Hit $10k MRR', color: '#10b981', icon: '💰', description: 'Monthly Recurring Revenue target', why: 'Financial freedom', goalType: 'measurable', targetValue: 10000, currentValue: 2500, unit: 'USD', createdAt: new Date().toISOString(), entries: [], parentGoalId: null },
        { id: 'goal-health', title: 'Sub-4h Marathon', color: '#ef4444', icon: '🏅', description: 'Peak physical condition', why: 'Longevity and discipline', goalType: 'measurable', targetValue: 240, currentValue: 310, unit: 'min', createdAt: new Date().toISOString(), entries: [], parentGoalId: null },
        { id: 'goal-peace', title: 'Daily Presence', color: '#8b5cf6', icon: '🧘', description: 'Mental clarity and focus', why: 'Stress reduction', goalType: 'directional', targetValue: null, currentValue: 0, unit: null, createdAt: new Date().toISOString(), entries: [], parentGoalId: null },
    ];

    const habits: Habit[] = [
        { id: 'hab-1', title: 'Morning Run', description: '30min cardio', icon: '🏃', color: '#f87171', frequency: 'daily', specificDays: [], everyNDays: 1, timesPerWeek: 7, timeOfDay: '06:00', streak: 5, bestStreak: 12, completions: [], projectId: 'proj-fitness', linkedGoalId: 'goal-health', contributionValue: 5, goalLinks: [{ goalId: 'goal-health', contributionValue: 5 }], createdAt: new Date().toISOString() },
        { id: 'hab-2', title: 'Deep Work Session', description: 'Focused coding', icon: '💻', color: '#60a5fa', frequency: 'daily', specificDays: [], everyNDays: 1, timesPerWeek: 5, timeOfDay: '09:00', streak: 3, bestStreak: 8, completions: [], projectId: 'proj-saas', linkedGoalId: 'goal-revenue', contributionValue: 10, goalLinks: [{ goalId: 'goal-revenue', contributionValue: 10 }], createdAt: new Date().toISOString() },
        { id: 'hab-3', title: 'Evening Meditation', description: 'Calm the mind', icon: '🧘', color: '#8b5cf6', frequency: 'daily', specificDays: [], everyNDays: 1, timesPerWeek: 7, timeOfDay: '22:00', streak: 10, bestStreak: 20, completions: [], projectId: null, linkedGoalId: 'goal-peace', contributionValue: 2, goalLinks: [{ goalId: 'goal-peace', contributionValue: 2 }], createdAt: new Date().toISOString() },
        { id: 'hab-4', title: 'Read 20 Pages', description: 'Expand knowledge', icon: '📚', color: '#fbbf24', frequency: 'daily', specificDays: [], everyNDays: 1, timesPerWeek: 7, timeOfDay: null, streak: 2, bestStreak: 5, completions: [], projectId: null, linkedGoalId: null, contributionValue: null, goalLinks: [], createdAt: new Date().toISOString() },
    ];

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const tasks: Task[] = [
        // SaaS Project Tasks
        { id: 't-1', title: 'Design Auth Flow', description: 'User login and registration screens', completed: false, createdAt: new Date().toISOString(), dueDate: today, dueTime: '14:00', duration: 120, priority: 'high', categoryId: null, projectId: 'proj-saas', tags: ['design', 'urgent'], subtasks: [], linkedGoalId: 'goal-revenue', contributionValue: 20, goalLinks: [{ goalId: 'goal-revenue', contributionValue: 20 }] },
        { id: 't-2', title: 'Setup Database', description: 'PostgreSQL instance on Supabase', completed: true, createdAt: new Date().toISOString(), dueDate: today, dueTime: '10:00', duration: 60, priority: 'medium', categoryId: null, projectId: 'proj-saas', tags: ['backend'], subtasks: [], linkedGoalId: 'goal-revenue', contributionValue: 10, goalLinks: [{ goalId: 'goal-revenue', contributionValue: 10 }] },
        { id: 't-3', title: 'Write Blog Post', description: 'Marketing for the launch', completed: false, createdAt: new Date().toISOString(), dueDate: tomorrow, dueTime: null, duration: null, priority: 'low', categoryId: null, projectId: 'proj-saas', tags: ['marketing'], subtasks: [], linkedGoalId: null, contributionValue: null, goalLinks: [] },
        
        // Fitness Project Tasks
        { id: 't-4', title: 'Buy New Running Shoes', description: 'Need better arch support', completed: false, createdAt: new Date().toISOString(), dueDate: null, dueTime: null, duration: null, priority: 'medium', categoryId: null, projectId: 'proj-fitness', tags: ['shopping'], subtasks: [], linkedGoalId: null, contributionValue: null, goalLinks: [] },
        { id: 't-5', title: 'Sunday Long Run', description: '20km easy pace', completed: false, createdAt: new Date().toISOString(), dueDate: '2024-03-24', dueTime: '07:00', duration: 150, priority: 'high', categoryId: null, projectId: 'proj-fitness', tags: ['health'], subtasks: [], linkedGoalId: 'goal-health', contributionValue: 15, goalLinks: [{ goalId: 'goal-health', contributionValue: 15 }] },
        
        // House Project Tasks
        { id: 't-6', title: 'Fix Leaking Faucet', description: 'Kitchen sink is dripping', completed: false, createdAt: new Date().toISOString(), dueDate: today, dueTime: null, duration: 30, priority: 'medium', categoryId: null, projectId: 'proj-house', tags: ['admin'], subtasks: [], linkedGoalId: null, contributionValue: null, goalLinks: [] },
        { id: 't-7', title: 'Paint Guest Room', description: 'Light grey finish', completed: true, createdAt: new Date().toISOString(), dueDate: '2024-03-15', dueTime: null, duration: 240, priority: 'low', categoryId: null, projectId: 'proj-house', tags: ['creative'], subtasks: [], linkedGoalId: null, contributionValue: null, goalLinks: [] },
        
        // Generic / Uncategorized
        { id: 't-8', title: 'Call Mom', description: '', completed: false, createdAt: new Date().toISOString(), dueDate: today, dueTime: '20:00', duration: null, priority: 'medium', categoryId: null, projectId: null, tags: ['personal'], subtasks: [], linkedGoalId: null, contributionValue: null, goalLinks: [] },
        { id: 't-9', title: 'Schedule Dental Clean', description: '', completed: false, createdAt: new Date().toISOString(), dueDate: tomorrow, dueTime: null, duration: null, priority: 'low', categoryId: null, projectId: null, tags: ['admin'], subtasks: [], linkedGoalId: null, contributionValue: null, goalLinks: [] },
        { id: 't-10', title: 'Review Weekly Plan', description: 'Plan for the next 7 days', completed: false, createdAt: new Date().toISOString(), dueDate: today, dueTime: '21:00', duration: 45, priority: 'high', categoryId: null, projectId: null, tags: ['mindset'], subtasks: [], linkedGoalId: 'goal-peace', contributionValue: 5, goalLinks: [{ goalId: 'goal-peace', contributionValue: 5 }] },
        { id: 't-11', title: 'Clear Inbox', description: 'Inbox zero goal', completed: true, createdAt: new Date().toISOString(), dueDate: today, dueTime: '09:00', duration: 30, priority: 'medium', categoryId: null, projectId: null, tags: ['admin'], subtasks: [], linkedGoalId: null, contributionValue: null, goalLinks: [] },
        { id: 't-12', title: 'Research VC trends', description: 'For future investment strategy', completed: false, createdAt: new Date().toISOString(), dueDate: null, dueTime: null, duration: 60, priority: 'medium', categoryId: null, projectId: null, tags: ['venture'], subtasks: [], linkedGoalId: null, contributionValue: null, goalLinks: [] },
    ];

    const state: AppState = {
        tasks,
        goals,
        habits,
        projects,
        categories: [], // legacy
        tags: [],       // legacy
        timeBlocks: [],
    };

    saveState(state);
    window.location.reload(); // Force reload to see changes
}
