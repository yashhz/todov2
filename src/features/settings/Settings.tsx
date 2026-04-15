import { useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { clearState } from '../../services/storage';
import { useGoogleLogin } from '@react-oauth/google';
import { setGCalToken, clearGCalToken, hasGCalToken } from '../../services/googleCalendar';
import { User, Download, Upload, Trash2, Calendar, AlertTriangle } from 'lucide-react';
import './Settings.css';

export default function Settings() {
    const { state, dispatch } = useAppContext();
    const [userName, setUserName] = useState(state.preferences?.userName || 'User');
    const [isSaving, setIsSaving] = useState(false);

    const login = useGoogleLogin({
        onSuccess: tokenResponse => {
            setGCalToken(tokenResponse.access_token);
            setUserName(u => u);
        },
        onError: () => {
            alert('Failed to connect Google Calendar. Please check your OAuth configuration.');
        },
        scope: 'https://www.googleapis.com/auth/calendar',
    });

    const handleSaveProfile = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        dispatch({
            type: 'UPDATE_PREFERENCES',
            payload: { userName }
        });
        setTimeout(() => setIsSaving(false), 600);
    };

    const handleExport = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `planify-backup-${new Date().toISOString().split('T')[0]}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const importedState = JSON.parse(event.target?.result as string);
                dispatch({ type: 'LOAD_STATE', payload: importedState });
                alert('Backup restored successfully!');
            } catch (err) {
                alert('Failed to import backup. Invalid file format.');
            }
        };
        reader.readAsText(file);
    };

    const handleReset = () => {
        if (window.confirm('Are you sure? This will delete ALL your data and cannot be undone.')) {
            clearState();
            window.location.reload();
        }
    };

    const completedTasks = state.tasks.filter(t => t.completed).length;
    const totalGoals = state.goals.length;
    const bestStreak = Math.max(0, ...state.habits.map(h => h.bestStreak || 0));

    return (
        <div className="settings-page">
            <header className="settings-header">
                <h1 className="settings-title">Settings</h1>
            </header>

            <div className="settings-content">
                {/* Profile Section */}
                <section className="settings-section">
                    <div className="section-header">
                        <User size={16} />
                        <h2 className="section-title">Profile</h2>
                    </div>
                    
                    <form className="settings-form" onSubmit={handleSaveProfile}>
                        <div className="form-field">
                            <label htmlFor="userName">Display Name</label>
                            <input
                                id="userName"
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                placeholder="Your name"
                            />
                        </div>
                        <button type="submit" className="btn-primary" disabled={isSaving}>
                            {isSaving ? 'Saved' : 'Save Changes'}
                        </button>
                    </form>

                    <div className="stats-grid">
                        <div className="stat-item">
                            <span className="stat-value">{completedTasks}</span>
                            <span className="stat-label">Tasks Done</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{totalGoals}</span>
                            <span className="stat-label">Goals Set</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{bestStreak}</span>
                            <span className="stat-label">Best Streak</span>
                        </div>
                    </div>
                </section>

                {/* Integrations */}
                <section className="settings-section">
                    <div className="section-header">
                        <Calendar size={16} />
                        <h2 className="section-title">Integrations</h2>
                    </div>

                    <div className="setting-item">
                        <div className="setting-info">
                            <h3>Google Calendar</h3>
                            <p>
                                {hasGCalToken() 
                                    ? '✓ Connected - Two-way sync active' 
                                    : 'Two-way sync with your Google Calendar'}
                            </p>
                        </div>
                        {hasGCalToken() ? (
                            <button className="btn-secondary" onClick={() => {
                                clearGCalToken();
                                setUserName(u => u);
                            }}>
                                Disconnect
                            </button>
                        ) : (
                            <button className="btn-primary" onClick={() => login()}>
                                Connect
                            </button>
                        )}
                    </div>

                    {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                        <div className="setting-notice">
                            <AlertTriangle size={14} />
                            <span>Google OAuth not configured. Add VITE_GOOGLE_CLIENT_ID to .env file.</span>
                        </div>
                    )}
                </section>

                {/* Data Management */}
                <section className="settings-section">
                    <div className="section-header">
                        <Download size={16} />
                        <h2 className="section-title">Data & Privacy</h2>
                    </div>
                    <p className="section-desc">Local-first. Your data never leaves your browser unless you export it.</p>

                    <div className="setting-item">
                        <div className="setting-info">
                            <h3>Backup Data</h3>
                            <p>Download JSON file of your entire system</p>
                        </div>
                        <button onClick={handleExport} className="btn-secondary">
                            <Download size={16} />
                            Export
                        </button>
                    </div>

                    <div className="setting-item">
                        <div className="setting-info">
                            <h3>Restore Backup</h3>
                            <p>Import data from a previously exported file</p>
                        </div>
                        <label className="btn-secondary">
                            <Upload size={16} />
                            Import
                            <input type="file" accept=".json" onChange={handleImport} hidden />
                        </label>
                    </div>
                </section>

                {/* Danger Zone */}
                <section className="settings-section settings-section--danger">
                    <div className="section-header">
                        <Trash2 size={16} />
                        <h2 className="section-title">Danger Zone</h2>
                    </div>

                    <div className="setting-item">
                        <div className="setting-info">
                            <h3>Reset Application</h3>
                            <p>Wipe all data and reset to factory settings</p>
                        </div>
                        <button onClick={handleReset} className="btn-danger">
                            Reset App
                        </button>
                    </div>
                </section>

                {/* About */}
                <section className="settings-section settings-section--about">
                    <div className="about-content">
                        <p className="about-name">Planify</p>
                        <p className="about-version">v2.0.0</p>
                        <p className="about-desc">A high-performance life operating system</p>
                    </div>
                </section>
            </div>
        </div>
    );
}
