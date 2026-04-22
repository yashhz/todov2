/* ═══════════════════════════════════════════════════════════
   SIDEBAR — Narrow icon-first nav, text on hover/expand
   ═══════════════════════════════════════════════════════════ */

import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar as CalendarIcon, CheckSquare, Target, Repeat, FolderKanban, Settings, Plus } from 'lucide-react';
import './Sidebar.css';

const NAV_ITEMS = [
    { path: '/',         icon: <LayoutDashboard size={18} strokeWidth={2.2} />, label: 'Dashboard' },
    { path: '/calendar', icon: <CalendarIcon size={18} strokeWidth={2.2} />, label: 'Calendar' },
    { path: '/tasks',    icon: <CheckSquare size={18} strokeWidth={2.2} />, label: 'Tasks' },
    { path: '/goals',    icon: <Target size={18} strokeWidth={2.2} />, label: 'Goals' },
    { path: '/habits',   icon: <Repeat size={18} strokeWidth={2.2} />, label: 'Habits' },
    { path: '/projects', icon: <FolderKanban size={18} strokeWidth={2.2} />, label: 'Projects' },
];

export default function Sidebar({ onOpenCmd }: { onOpenCmd: () => void }) {
    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="sidebar">
                {/* Logo */}
                <div className="sidebar__brand">
                    <div className="sidebar__logo">
                        <span className="sidebar__logo-icon">◆</span>
                    </div>
                    <span className="sidebar__brand-name">Planify</span>
                </div>

                {/* Nav */}
                <nav className="sidebar__nav">
                    {NAV_ITEMS.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                            }
                            end={item.path === '/'}
                        >
                            <span className="sidebar__link-icon">{item.icon}</span>
                            <span className="sidebar__link-label">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Spacer */}
                <div className="sidebar__spacer" />

                {/* Settings */}
                <nav className="sidebar__nav-bottom">
                    <NavLink
                        to="/settings"
                        className={({ isActive }) =>
                            `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                        }
                    >
                        <span className="sidebar__link-icon"><Settings size={18} strokeWidth={2.2} /></span>
                        <span className="sidebar__link-label">Settings</span>
                    </NavLink>
                </nav>

                {/* Quick Add */}
                <button
                    className="sidebar__cmd-btn"
                    onClick={onOpenCmd}
                    title="Quick Add (Ctrl+K)"
                    aria-label="Quick Add (Ctrl+K)"
                >
                    <span className="sidebar__cmd-icon"><Plus size={16} strokeWidth={2.5} /></span>
                    <span className="sidebar__cmd-label">Quick Add</span>
                    <span className="sidebar__cmd-kbd">K</span>
                </button>

                {/* Date */}
                <div className="sidebar__footer">
                    <span className="sidebar__date">
                        {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                </div>
            </aside>

            {/* Mobile Bottom Nav */}
            <nav className="bottom-nav">
                {NAV_ITEMS.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `bottom-nav__link ${isActive ? 'bottom-nav__link--active' : ''}`
                        }
                        end={item.path === '/'}
                    >
                        <span className="bottom-nav__icon">{item.icon}</span>
                        <span className="bottom-nav__label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>
        </>
    );
}
