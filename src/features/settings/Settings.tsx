import { useState } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { clearState } from '../../services/storage';
import './Settings.css';

export default function Settings() {
    const { state, dispatch } = useAppContext();
    const [userName, setUserName] = useState(state.preferences?.userName || 'User');
    const [isSaving, setIsSaving] = useState(false);

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

    // Calculate stats
    const completedTasks = state.tasks.filter(t => t.completed).length;
    const totalGoals = state.goals.length;
    const bestStreak = Math.max(0, ...state.habits.map(h => h.bestStreak || 0));

    return (
        <div className="settings-page animate-fade-in-up">
            <header className="settings-header">
                <h1 className="settings-title">Settings</h1>
                <p className="settings-subtitle">Manage your life operating system</p>
            </header>

            <div className="settings-grid">
                {/* Profile Section */}
                <section className="settings-section glass">
                    <h2 className="section-title">Profile</h2>
                    <form className="profile-form" onSubmit={handleSaveProfile}>
                        <div className="form-group">
                            <label htmlFor="userName">Display Name</label>
                            <input
                                id="userName"
                                type="text"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                                placeholder="Your name"
                                className="settings-input"
                            />
                        </div>
                        <button type="submit" className="settings-btn settings-btn--primary" disabled={isSaving}>
                            {isSaving ? 'Saved!' : 'Save Changes'}
                        </button>
                    </form>

                    <div className="profile-stats">
                        <div className="stat-card">
                            <span className="stat-value">{completedTasks}</span>
                            <span className="stat-label">Tasks Done</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-value">{totalGoals}</span>
                            <span className="stat-label">Goals Set</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-value">{bestStreak}</span>
                            <span className="stat-label">Best Streak</span>
                        </div>
                    </div>
                </section>

                {/* Data Management */}
                <section className="settings-section glass">
                    <h2 className="section-title">Data & Privacy</h2>
                    <p className="section-desc">Planify is local-first. Your data never leaves your browser unless you export it.</p>
                    
                    <div className="settings-actions">
                        <div className="action-row">
                            <div className="action-info">
                                <h3>Backup Data</h3>
                                <p>Download a JSON file of your entire system.</p>
                            </div>
                            <button onClick={handleExport} className="settings-btn">Export</button>
                        </div>

                        <div className="action-row">
                            <div className="action-info">
                                <h3>Restore Backup</h3>
                                <p>Import data from a previously exported file.</p>
                            </div>
                            <label className="settings-btn settings-btn--outline">
                                Import
                                <input type="file" accept=".json" onChange={handleImport} hidden />
                            </label>
                        </div>

                        <div className="action-row">
                            <div className="action-info">
                                <h3 className="danger-text">Danger Zone</h3>
                                <p>Wipe all data and reset to factory settings.</p>
                            </div>
                            <button onClick={handleReset} className="settings-btn settings-btn--danger">Reset App</button>
                        </div>
                    </div>
                </section>

                {/* About Section */}
                <section className="settings-section glass about-section">
                    <h2 className="section-title">About Planify</h2>
                    <div className="about-content">
                        <div className="about-logo">◆</div>
                        <div className="about-info">
                            <p className="about-tagline">"The Architecture of Intention"</p>
                            <p className="about-version">Version 2.0.0 (Premium Overhaul)</p>
                            <p className="about-description">
                                A high-performance life operating system designed to bridge the gap between 
                                daily actions and long-term vision.
                            </p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
