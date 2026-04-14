import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTasks } from '../../hooks/useStore';
import { formatDateStr } from '../../services/recurrence';
import { SmartInput } from '../../components/SmartInput';
import type { Task, ParsedCommand } from '../../types';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './Calendar.css';

// Helpers
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT = 60; // 60px per hour
const START_HOUR = 6; // Scroll default to 6 AM

function getDayString(date: Date) {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function timeToPixels(timeStr: string): number {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return (h * HOUR_HEIGHT) + ((m / 60) * HOUR_HEIGHT);
}

function pixelsToTime(px: number): string {
    const totalHours = Math.max(0, Math.min(23.99, px / HOUR_HEIGHT));
    const h = Math.floor(totalHours);
    const m = Math.floor((totalHours - h) * 60);
    // Snap to nearest 15 mins for cleaner drag
    const snappedM = Math.round(m / 15) * 15;
    const finalH = snappedM === 60 ? h + 1 : h;
    const finalM = snappedM === 60 ? 0 : snappedM;
    return `${String(finalH).padStart(2, '0')}:${String(finalM).padStart(2, '0')}`;
}

export default function CalendarView() {
    const { tasks, addTask, updateTask } = useTasks();
    const [baseDate, setBaseDate] = useState(new Date());
    const [viewType, setViewType] = useState<'day' | '3day' | 'week'>('day');
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to morning
    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = START_HOUR * HOUR_HEIGHT;
        }
    }, []);

    const numDays = viewType === 'day' ? 1 : viewType === '3day' ? 3 : 7;

    const visibleDates = useMemo(() => {
        const dates: Date[] = [];
        const start = new Date(baseDate);
        if (viewType === 'week') {
            // Align to Monday
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);
        }
        for (let i = 0; i < numDays; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            dates.push(d);
        }
        return dates;
    }, [baseDate, viewType, numDays]);

    const handlePrev = () => {
        const d = new Date(baseDate);
        d.setDate(d.getDate() - numDays);
        setBaseDate(d);
    };

    const handleNext = () => {
        const d = new Date(baseDate);
        d.setDate(d.getDate() + numDays);
        setBaseDate(d);
    };

    const handleToday = () => {
        setBaseDate(new Date());
    };

    // Drag state
    const [draggingTask, setDraggingTask] = useState<{ id: string; yOffset: number; dateIdx: number } | null>(null);
    const [dragGhostPos, setDragGhostPos] = useState<{ top: number; height: number; colIdx: number } | null>(null);

    const handleDragStart = (e: React.MouseEvent, task: Task, dateIdx: number) => {
        e.stopPropagation();
        if (!task.dueTime) return;

        // Prevent default drag to use our custom mouse-based dragging for smoother experience
        e.preventDefault();

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const yOffset = e.clientY - rect.top;

        setDraggingTask({ id: task.id, yOffset, dateIdx });

        const top = timeToPixels(task.dueTime);
        const height = (task.duration ? (task.duration / 60) : 1) * HOUR_HEIGHT;
        setDragGhostPos({ top, height, colIdx: dateIdx });

        // Add document-level event listeners for smooth dragging outside of the immediate element
        const handleMouseMove = (moveEvent: MouseEvent) => {
             // We need to find the column we are currently hovering over
             const gridBody = scrollContainerRef.current;
             if (!gridBody) return;

             const bodyRect = gridBody.getBoundingClientRect();
             // Adjust mouse Y to be relative to the scroll container's content
             const yInsideBody = moveEvent.clientY - bodyRect.top + gridBody.scrollTop;
             const rawTop = yInsideBody - yOffset;

             // Snap top to nearest 15 mins (which is HOUR_HEIGHT / 4)
             const snapInterval = HOUR_HEIGHT / 4;
             const snappedTop = Math.max(0, Math.round(rawTop / snapInterval) * snapInterval);

             // Find which column we are in
             const cols = gridBody.querySelectorAll('.cal-day-col');
             let hoveredColIdx = dateIdx; // Default to original column
             cols.forEach((col, idx) => {
                 const colRect = col.getBoundingClientRect();
                 if (moveEvent.clientX >= colRect.left && moveEvent.clientX <= colRect.right) {
                     hoveredColIdx = idx;
                 }
             });

             setDragGhostPos({ top: snappedTop, height, colIdx: hoveredColIdx });
        };

        const handleMouseUp = () => {
             window.removeEventListener('mousemove', handleMouseMove);
             window.removeEventListener('mouseup', handleMouseUp);

             setDragGhostPos(prevGhost => {
                 if (prevGhost) {
                     const newTime = pixelsToTime(prevGhost.top);
                     const newDateStr = formatDateStr(visibleDates[prevGhost.colIdx]);

                     const currentTask = tasks.find(t => t.id === task.id);
                     if (currentTask) {
                         updateTask({ ...currentTask, dueTime: newTime, dueDate: newDateStr });
                     }
                 }
                 setDraggingTask(null);
                 return null;
             });
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleSmartInputSubmit = (commands: ParsedCommand[]) => {
        commands.forEach(p => {
             if (p.type === 'task') {
                 addTask({
                     title: p.title,
                     dueDate: p.date || formatDateStr(baseDate),
                     dueTime: p.time,
                     duration: p.duration,
                     priority: p.priority || 'medium',
                     tags: p.tagIds
                 });
             }
        });
    };

    return (
        <div className="cal-page page-enter">
             <div className="cal-header">
                  <div className="cal-header__left">
                       <h1 className="cal-title">Calendar</h1>
                       <div className="cal-nav">
                            <button className="cal-nav-btn" onClick={handlePrev}><ChevronLeft size={16} /></button>
                            <button className="cal-nav-btn" onClick={handleToday}>Today</button>
                            <button className="cal-nav-btn" onClick={handleNext}><ChevronRight size={16} /></button>
                       </div>
                       <span className="cal-date-label">
                           {visibleDates[0].toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                       </span>
                  </div>

                  <div className="cal-header__right">
                       <div className="cal-view-toggles">
                            <button className={`cal-view-toggle ${viewType === 'day' ? 'active' : ''}`} onClick={() => setViewType('day')}>1 Day</button>
                            <button className={`cal-view-toggle ${viewType === '3day' ? 'active' : ''}`} onClick={() => setViewType('3day')}>3 Days</button>
                            <button className={`cal-view-toggle ${viewType === 'week' ? 'active' : ''}`} onClick={() => setViewType('week')}>Week</button>
                       </div>
                  </div>
             </div>

             <div className="cal-input-wrapper">
                 <SmartInput onSubmit={handleSmartInputSubmit} placeholder="Add to calendar (e.g., 'Meeting tomorrow at 2pm for 60m')" />
             </div>

             <div className="cal-grid-container">
                  {/* Header Row */}
                  <div className="cal-grid-header">
                      <div className="cal-time-col-spacer"></div>
                      {visibleDates.map((date, i) => (
                          <div key={i} className={`cal-date-col-header ${formatDateStr(date) === formatDateStr(new Date()) ? 'cal-date-col-header--today' : ''}`}>
                              {getDayString(date)}
                          </div>
                      ))}
                  </div>

                  {/* Scrollable Body */}
                  <div className="cal-grid-body" ref={scrollContainerRef}>
                      {/* Time Column */}
                      <div className="cal-time-col">
                           {HOURS.map(h => (
                               <div key={h} className="cal-time-slot">
                                   <span className="cal-time-label">{h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`}</span>
                               </div>
                           ))}
                      </div>

                      {/* Day Columns */}
                      <div className="cal-days-container">
                           {/* Horizontal lines */}
                           <div className="cal-grid-lines">
                                {HOURS.map(h => (
                                    <div key={h} className="cal-grid-line"></div>
                                ))}
                           </div>

                           {/* Columns */}
                           {visibleDates.map((date, colIdx) => {
                               const dStr = formatDateStr(date);
                               const dayTasks = tasks.filter(t => t.dueDate === dStr && t.dueTime && !t.completed);

                               return (
                                   <div
                                       key={colIdx}
                                       className="cal-day-col"
                                   >
                                       {/* Render actual events unless they are currently being dragged */}
                                       {dayTasks.map(task => {
                                           if (draggingTask?.id === task.id) return null; // Don't render the static version if dragging

                                           const top = timeToPixels(task.dueTime!);
                                           // Default duration 60 mins if none specified
                                           const height = (task.duration ? (task.duration / 60) : 1) * HOUR_HEIGHT;
                                           return (
                                               <div
                                                    key={task.id}
                                                    className="cal-event"
                                                    style={{ top: `${top}px`, height: `${height}px` }}
                                                    onMouseDown={(e) => handleDragStart(e, task, colIdx)}
                                               >
                                                    <div className="cal-event-title">{task.title}</div>
                                                    <div className="cal-event-time">
                                                         {task.dueTime} {task.duration ? `(${task.duration}m)` : ''}
                                                    </div>
                                               </div>
                                           );
                                       })}

                                       {/* Render ghost event if dragging in this column */}
                                       {draggingTask && dragGhostPos && dragGhostPos.colIdx === colIdx && (() => {
                                            const ghostTask = tasks.find(t => t.id === draggingTask.id);
                                            if (!ghostTask) return null;
                                            return (
                                                <div
                                                     className="cal-event cal-event--ghost"
                                                     style={{ top: `${dragGhostPos.top}px`, height: `${dragGhostPos.height}px` }}
                                                >
                                                     <div className="cal-event-title">{ghostTask.title}</div>
                                                     <div className="cal-event-time">
                                                          {pixelsToTime(dragGhostPos.top)} {ghostTask.duration ? `(${ghostTask.duration}m)` : ''}
                                                     </div>
                                                </div>
                                            );
                                       })()}
                                   </div>
                               );
                           })}
                      </div>
                  </div>
             </div>
        </div>
    );
}
