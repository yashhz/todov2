/* ═══════════════════════════════════════════════════════════
   PROGRESS BAR — Animated, glowing progress visualization
   ═══════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react';
import './ProgressBar.css';

interface ProgressBarProps {
    value: number;       // current
    max: number;         // target
    color?: string;
    label?: string;
    showPercent?: boolean;
    size?: 'sm' | 'md' | 'lg';
    animated?: boolean;
}

export default function ProgressBar({
    value, max, color = 'var(--accent-primary)', label, showPercent = true, size = 'md', animated = true
}: ProgressBarProps) {
    const [displayPercent, setDisplayPercent] = useState(0);
    const barRef = useRef<HTMLDivElement>(null);
    const percent = Math.min((value / max) * 100, 100);

    useEffect(() => {
        if (!animated) {
            setDisplayPercent(percent);
            return;
        }
        // Animate count-up
        const duration = 800;
        const start = performance.now();
        const from = displayPercent;
        const to = percent;

        function tick(now: number) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplayPercent(from + (to - from) * eased);
            if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [percent]);

    return (
        <div className={`progress-bar progress-bar--${size}`}>
            {(label || showPercent) && (
                <div className="progress-bar__header">
                    {label && <span className="progress-bar__label">{label}</span>}
                    {showPercent && (
                        <span className="progress-bar__percent">{Math.round(displayPercent)}%</span>
                    )}
                </div>
            )}
            <div className="progress-bar__track">
                <div
                    ref={barRef}
                    className="progress-bar__fill"
                    style={{
                        width: `${displayPercent}%`,
                        background: percent >= 100
                            ? `linear-gradient(90deg, ${color}, var(--color-success))`
                            : `linear-gradient(90deg, ${color}, ${color}dd)`,
                    }}
                >
                    <div className="progress-bar__glow" />
                    <div className="progress-bar__shimmer" />
                </div>
            </div>
        </div>
    );
}
