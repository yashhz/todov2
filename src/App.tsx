/* ═══════════════════════════════════════════════════════════
   APP — Root component with routing + global command bar
   ═══════════════════════════════════════════════════════════ */

import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import Layout from './components/Layout';
import CommandBar from './components/CommandBar';
import Dashboard from './features/dashboard/Dashboard';
import TasksPage from './features/tasks/Tasks';
import GoalsPage from './features/goals/Goals';
import GoalDetail from './features/goals/GoalDetail';
import HabitsPage from './features/habits/Habits';
import ProjectsPage from './features/projects/Projects';
import ProjectDetail from './features/projects/ProjectDetail';
import SettingsPage from './features/settings/Settings';
import CalendarView from './features/calendar/Calendar';
import { GoogleOAuthProvider } from '@react-oauth/google';

function AppShell() {
    const [cmdOpen, setCmdOpen] = useState(false);

    // Global Cmd+K / Ctrl+K listener
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setCmdOpen(prev => !prev);
            }
        }
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    return (
        <>
            <Routes>
                <Route element={<Layout onOpenCmd={() => setCmdOpen(true)} />}>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/calendar" element={<CalendarView />} />
                    <Route path="/tasks" element={<TasksPage />} />
                    <Route path="/goals" element={<GoalsPage />} />
                    <Route path="/goals/:id" element={<GoalDetail />} />
                    <Route path="/habits" element={<HabitsPage />} />
                    <Route path="/projects" element={<ProjectsPage />} />
                    <Route path="/projects/:id" element={<ProjectDetail />} />
                    <Route path="/settings" element={<SettingsPage />} />
                </Route>
            </Routes>
            <CommandBar isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />
        </>
    );
}

export default function App() {
    return (
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || 'your-google-client-id.apps.googleusercontent.com'}>
        <AppProvider>
            <BrowserRouter>
                <AppShell />
            </BrowserRouter>
        </AppProvider>
        </GoogleOAuthProvider>
    );
}
