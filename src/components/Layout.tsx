/* ═══════════════════════════════════════════════════════════
   LAYOUT — App shell with sidebar + main content area
   ═══════════════════════════════════════════════════════════ */

import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import './Layout.css';

interface LayoutProps {
    onOpenCmd: () => void;
}

export default function Layout({ onOpenCmd }: LayoutProps) {
    return (
        <div className="app-layout">
            <Sidebar onOpenCmd={onOpenCmd} />
            <main className="app-main">
                <div className="app-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
