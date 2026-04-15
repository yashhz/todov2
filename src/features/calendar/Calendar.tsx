import { useRef, useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useTasks } from '../../hooks/useStore';
import { formatDateStr } from '../../services/recurrence';
import { SmartInput } from '../../components/SmartInput';
import type { ParsedCommand } from '../../types';
import './Calendar.css';

import { fetchGoogleEvents, hasGCalToken, createGoogleEventFromTask, updateGoogleEvent } from '../../services/googleCalendar';
import { useEffect } from 'react';

export default function CalendarView() {
    const { tasks, addTask, updateTask } = useTasks();
    const calendarRef = useRef<FullCalendar>(null);
    const [viewType, setViewType] = useState<'timeGridDay' | 'timeGridThreeDay' | 'timeGridWeek'>('timeGridDay');
    const [gcalEvents, setGcalEvents] = useState<any[]>([]);

    const isConnected = hasGCalToken();


    useEffect(() => {
        if (!isConnected) return;

        const loadEvents = async () => {
            try {
                const now = new Date();
                // Fetch events from 1 month ago to 3 months ahead
                const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const timeMax = new Date(now.getFullYear(), now.getMonth() + 3, 1);

                const events = await fetchGoogleEvents(timeMin, timeMax);
                setGcalEvents(events);
            } catch (err) {
                console.error("Failed to load Google Events", err);
            }
        };

        loadEvents();
    }, [isConnected]);

    // Combine Planify Tasks and Google Events
    const events = useMemo(() => {
        const planifyEvents = tasks
            .filter(t => t.dueDate && t.dueTime && !t.completed)
            .map(t => {
                const startStr = `${t.dueDate}T${t.dueTime}:00`;
                const startDate = new Date(startStr);

                let endDate = new Date(startDate.getTime() + (60 * 60 * 1000));
                if (t.duration) {
                    endDate = new Date(startDate.getTime() + (t.duration * 60 * 1000));
                }

                // Check if this task is already in Google Events
                const gcalMatch = gcalEvents.find(ge => ge.extendedProperties?.private?.planifyTaskId === t.id);

                return {
                    id: t.id,
                    title: t.title,
                    start: startDate,
                    end: endDate,
                    color: gcalMatch ? '#3b82f6' : 'var(--accent-muted)',
                    extendedProps: {
                        task: t,
                        isGoogleEvent: !!gcalMatch,
                        gcalId: gcalMatch?.id
                    }
                };
            });

        const pureGoogleEvents = gcalEvents
            .filter(ge => !ge.extendedProperties?.private?.planifyTaskId) // Only show ones not linked to Planify
            .map(ge => {
                const start = ge.start.dateTime || ge.start.date;
                const end = ge.end.dateTime || ge.end.date;
                return {
                    id: ge.id,
                    title: ge.summary || 'Busy',
                    start: start ? new Date(start) : new Date(),
                    end: end ? new Date(end) : new Date(),
                    color: '#0f766e', // Teal color for Google Events
                    extendedProps: {
                        isPureGoogle: true
                    }
                };
            });

        return [...planifyEvents, ...pureGoogleEvents];
    }, [tasks, gcalEvents]);

    const handleEventDrop = async (dropInfo: any) => {
        const { event } = dropInfo;

        if (event.extendedProps.isPureGoogle) {
            // Revert drop for pure google events as we are only updating Planify -> Google right now
            dropInfo.revert();
            return;
        }

        const taskId = event.id;
        const task = tasks.find(t => t.id === taskId);

        if (task) {
            const start = event.start as Date;
            const newDate = formatDateStr(start);
            const newTime = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;

            const updatedTask = {
                ...task,
                dueDate: newDate,
                dueTime: newTime
            };

            updateTask(updatedTask);

            // Sync to Google Calendar if linked
            if (isConnected && event.extendedProps.gcalId) {
                try {
                    await updateGoogleEvent(event.extendedProps.gcalId, updatedTask);
                } catch (err) {
                    console.error("Failed to update Google event", err);
                }
            }
        }
    };

    const handleEventResize = async (resizeInfo: any) => {
        const { event } = resizeInfo;

        if (event.extendedProps.isPureGoogle) {
            resizeInfo.revert();
            return;
        }

        const taskId = event.id;
        const task = tasks.find(t => t.id === taskId);

        if (task && event.start && event.end) {
            const durationMs = event.end.getTime() - event.start.getTime();
            const durationMins = Math.round(durationMs / 60000);

            const updatedTask = {
                ...task,
                duration: durationMins
            };

            updateTask(updatedTask);

            // Sync to Google Calendar if linked
            if (isConnected && event.extendedProps.gcalId) {
                try {
                    await updateGoogleEvent(event.extendedProps.gcalId, updatedTask);
                } catch (err) {
                    console.error("Failed to update Google event", err);
                }
            }
        }
    };

    const syncPendingTasksToGCal = async () => {
        if (!isConnected) return;

        for (const t of tasks) {
            if (t.dueDate && t.dueTime && !t.completed) {
                // Check if already synced
                const isSynced = gcalEvents.find(ge => ge.extendedProperties?.private?.planifyTaskId === t.id);
                if (!isSynced) {
                    try {
                        const newEvent = await createGoogleEventFromTask(t);
                        setGcalEvents(prev => [...prev, newEvent]);
                    } catch (err) {
                        console.error("Failed to sync task", t.title, err);
                    }
                }
            }
        }
    };

    const handleSmartInputSubmit = (commands: ParsedCommand[]) => {
        commands.forEach(p => {
             if (p.type === 'task') {
                 addTask({
                     title: p.title,
                     dueDate: p.date || formatDateStr(new Date()),
                     dueTime: p.time,
                     duration: p.duration,
                     priority: p.priority || 'medium',
                     tags: p.tagIds
                 });
             }
        });
    };

    const changeView = (view: 'timeGridDay' | 'timeGridThreeDay' | 'timeGridWeek') => {
        setViewType(view);
        if (calendarRef.current) {
            const calendarApi = calendarRef.current.getApi();
            calendarApi.changeView(view);
        }
    };

    return (
        <div className="cal-page page-enter">
             <div className="cal-header">
                  <div className="cal-header__left">
                       <h1 className="cal-title">Calendar</h1>
                       {/* Date label will be handled by FullCalendar header */}
                  </div>

                  <div className="cal-header__right" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                       {isConnected && (
                           <button className="cal-nav-btn" onClick={syncPendingTasksToGCal} style={{ background: 'var(--accent-primary)', color: 'white' }}>
                               Sync to GCal
                           </button>
                       )}
                       <div className="cal-view-toggles">
                            <button className={`cal-view-toggle ${viewType === 'timeGridDay' ? 'active' : ''}`} onClick={() => changeView('timeGridDay')}>1 Day</button>
                            <button className={`cal-view-toggle ${viewType === 'timeGridThreeDay' ? 'active' : ''}`} onClick={() => changeView('timeGridThreeDay')}>3 Days</button>
                            <button className={`cal-view-toggle ${viewType === 'timeGridWeek' ? 'active' : ''}`} onClick={() => changeView('timeGridWeek')}>Week</button>
                       </div>
                  </div>
             </div>

             <div className="cal-input-wrapper">
                 <SmartInput onSubmit={handleSmartInputSubmit} placeholder="Add to calendar (e.g., 'Meeting tomorrow at 2pm for 60m')" />
             </div>

             <div className="cal-grid-container" style={{ flex: 1, minHeight: 0 }}>
                 <FullCalendar
                     ref={calendarRef}
                     plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                     initialView={viewType}
                     views={{
                        timeGridThreeDay: {
                            type: 'timeGrid',
                            duration: { days: 3 },
                            buttonText: '3 day'
                        }
                     }}
                     headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: ''
                     }}
                     events={events}
                     editable={true}
                     droppable={true}
                     eventDrop={handleEventDrop}
                     eventResize={handleEventResize}
                     slotMinTime="06:00:00"
                     allDaySlot={false}
                     height="100%"
                     nowIndicator={true}
                 />
             </div>
        </div>
    );
}
