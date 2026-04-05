/* ═══════════════════════════════════════════════════════════
   TIME PICKER — Visual clock-style time picker with AM/PM
   ═══════════════════════════════════════════════════════════ */

import { useState, useRef, useCallback, useEffect } from 'react';
import './TimePicker.css';

interface TimePickerProps {
    value: string;              // HH:mm (24h)
    onChange: (time: string) => void;
    onClose?: () => void;
}

export default function TimePicker({ value, onChange, onClose }: TimePickerProps) {
    const parsed = parseTime(value);
    const [hours, setHours] = useState(parsed.hours12);
    const [minutes, setMinutes] = useState(parsed.minutes);
    const [period, setPeriod] = useState<'AM' | 'PM'>(parsed.period);
    const [mode, setMode] = useState<'hours' | 'minutes'>('hours');
    const clockRef = useRef<HTMLDivElement>(null);
    const isDragging = useRef(false);

    const handleClockInteraction = useCallback((clientX: number, clientY: number) => {
        if (!clockRef.current) return;
        const rect = clockRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const angle = Math.atan2(clientY - cy, clientX - cx) * (180 / Math.PI) + 90;
        const normalized = ((angle % 360) + 360) % 360;

        if (mode === 'hours') {
            const h = Math.round(normalized / 30) || 12;
            setHours(h);
        } else {
            const m = Math.round(normalized / 6) % 60;
            setMinutes(m);
        }
    }, [mode]);

    const handleMouseDown = (e: React.MouseEvent) => {
        isDragging.current = true;
        handleClockInteraction(e.clientX, e.clientY);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging.current) return;
        handleClockInteraction(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
        if (isDragging.current) {
            isDragging.current = false;
            if (mode === 'hours') {
                setMode('minutes');
            }
        }
    };

    const handleTouchStart = (e: React.TouchEvent) => {
        isDragging.current = true;
        const touch = e.touches[0];
        handleClockInteraction(touch.clientX, touch.clientY);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging.current) return;
        const touch = e.touches[0];
        handleClockInteraction(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = () => {
        isDragging.current = false;
        if (mode === 'hours') {
            setMode('minutes');
        }
    };

    // Emit value on every change
    useEffect(() => {
        let h24 = hours;
        if (period === 'PM' && hours !== 12) h24 = hours + 12;
        if (period === 'AM' && hours === 12) h24 = 0;
        const timeStr = `${String(h24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        onChange(timeStr);
    }, [hours, minutes, period, onChange]);

    // Calculate hand angle
    const handAngle = mode === 'hours'
        ? (hours % 12) * 30
        : minutes * 6;

    const hourNumbers = Array.from({ length: 12 }, (_, i) => i + 1);
    const minuteNumbers = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

    return (
        <div className="time-picker animate-scale-in">
            {/* Digital Display */}
            <div className="tp-display">
                <button
                    className={`tp-display__segment ${mode === 'hours' ? 'tp-display__segment--active' : ''}`}
                    onClick={() => setMode('hours')}
                >
                    {String(hours).padStart(2, '0')}
                </button>
                <span className="tp-display__colon">:</span>
                <button
                    className={`tp-display__segment ${mode === 'minutes' ? 'tp-display__segment--active' : ''}`}
                    onClick={() => setMode('minutes')}
                >
                    {String(minutes).padStart(2, '0')}
                </button>
                <div className="tp-period">
                    <button
                        className={`tp-period__btn ${period === 'AM' ? 'tp-period__btn--active' : ''}`}
                        onClick={() => setPeriod('AM')}
                    >AM</button>
                    <button
                        className={`tp-period__btn ${period === 'PM' ? 'tp-period__btn--active' : ''}`}
                        onClick={() => setPeriod('PM')}
                    >PM</button>
                </div>
            </div>

            {/* Clock Face */}
            <div
                className="tp-clock"
                ref={clockRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <div className="tp-clock__center" />
                <div
                    className="tp-clock__hand"
                    style={{ transform: `rotate(${handAngle}deg)` }}
                >
                    <div className="tp-clock__hand-dot" />
                </div>

                {mode === 'hours'
                    ? hourNumbers.map(n => {
                        const angle = (n * 30 - 90) * (Math.PI / 180);
                        const r = 90;
                        const x = 50 + (r / 120 * 50) * Math.cos(angle);
                        const y = 50 + (r / 120 * 50) * Math.sin(angle);
                        return (
                            <span
                                key={n}
                                className={`tp-clock__number ${hours === n ? 'tp-clock__number--active' : ''}`}
                                style={{ left: `${x}%`, top: `${y}%` }}
                                onClick={(e) => { e.stopPropagation(); setHours(n); setMode('minutes'); }}
                            >
                                {n}
                            </span>
                        );
                    })
                    : minuteNumbers.map(n => {
                        const angle = (n * 6 - 90) * (Math.PI / 180);
                        const r = 90;
                        const x = 50 + (r / 120 * 50) * Math.cos(angle);
                        const y = 50 + (r / 120 * 50) * Math.sin(angle);
                        return (
                            <span
                                key={n}
                                className={`tp-clock__number ${minutes === n ? 'tp-clock__number--active' : ''}`}
                                style={{ left: `${x}%`, top: `${y}%` }}
                                onClick={(e) => { e.stopPropagation(); setMinutes(n); }}
                            >
                                {String(n).padStart(2, '0')}
                            </span>
                        );
                    })
                }
            </div>

            {/* Quick presets */}
            <div className="tp-presets">
                {[
                    { label: 'Morning', time: '09:00', icon: '☀️' },
                    { label: 'Noon', time: '12:00', icon: '🌤' },
                    { label: 'Evening', time: '18:00', icon: '🌅' },
                    { label: 'Night', time: '21:00', icon: '🌙' },
                ].map(p => (
                    <button
                        key={p.label}
                        className="tp-preset-btn"
                        onClick={() => {
                            const parsed = parseTime(p.time);
                            setHours(parsed.hours12);
                            setMinutes(parsed.minutes);
                            setPeriod(parsed.period);
                        }}
                    >
                        <span>{p.icon}</span>
                        <span>{p.label}</span>
                    </button>
                ))}
            </div>

            {onClose && (
                <button className="tp-done-btn" onClick={onClose}>
                    Done
                </button>
            )}
        </div>
    );
}

// ─── Helpers ─────────────────────────────────────
function parseTime(time: string): { hours12: number; minutes: number; period: 'AM' | 'PM' } {
    if (!time) return { hours12: 12, minutes: 0, period: 'PM' };
    const [h, m] = time.split(':').map(Number);
    const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM';
    let hours12 = h % 12;
    if (hours12 === 0) hours12 = 12;
    return { hours12, minutes: m, period };
}
