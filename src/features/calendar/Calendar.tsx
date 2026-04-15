import { useRef, useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useTasks } from '../../hooks/useStore';
import { formatDateStr } from '../../services/recurrence';
import { SmartInput } from '../../components/SmartInput';
import type { Task, ParsedCommand } from '../../types';
import { Trash2, X } from 'lucide-react';
import Modal from '../../components/Modal';
import './Calendar.css';

import { fetchGoogleEvents, hasGCalToken, createGoogleEventFromTask, updateGoogleEvent, deleteGoogleEvent } from '../../services/googleCalendar';
import { useEffect } from 'react';

export default function CalendarView() {
    const { tasks, addTask, updateTask, deleteTask } = useTasks();
    const calendarRef = useRef<FullCalendar>(null);
    const [viewType, setViewType] = useState<'timeGridDay' | 'timeGridThreeDay' | 'timeGridWeek'>('timeGridDay');
    const [gcalEvents, setGcalEvents] = useState<any[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<any>(null);
    const [showEventModal, setShowEventModal] = useState(false);

    const isConnected = hasGCalToken();

    const loadGoogleEvents = async () => {
        if (!isConnected) return;

        setIsLoading(true);
        try {
            const now = new Date();
            // Fetch events from 1 month ago to 3 months ahead
            const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const timeMax = new Date(now.getFullYear(), now.getMonth() + 3, 1);

            console.log('Fetching Google Calendar events from', timeMin, 'to', timeMax);
            const events = await fetchGoogleEvents(timeMin, timeMax);
            setGcalEvents(events);
            console.log('Loaded Google Calendar events:', events.length, events);
        } catch (err: any) {
            console.error("Failed to load Google Events - Full error:", err);
            console.error("Error message:", err.message);
            console.error("Error stack:", err.stack);
            alert(`Failed to load Google Calendar events: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadGoogleEvents();
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
                    color: gcalMatch ? '#3b82f6' : '#8b5cf6',
                    extendedProps: {
                        type: 'planify',
                        task: t,
                        isGoogleEvent: !!gcalMatch,
                        gcalId: gcalMatch?.id,
                        gcalData: gcalMatch
                    }
                };
            });

        const pureGoogleEvents = gcalEvents
            .filter(ge => !ge.extendedProperties?.private?.planifyTaskId)
            .map(ge => {
                const start = ge.start.dateTime || ge.start.date;
                const end = ge.end.dateTime || ge.end.date;
                return {
                    id: `gcal-${ge.id}`,
                    title: ge.summary || 'Busy',
                    start: start ? new Date(start) : new Date(),
                    end: end ? new Date(end) : new Date(),
                    color: '#10b981',
                    extendedProps: {
                        type: 'google',
                        isPureGoogle: true,
                        gcalId: ge.id,
                        gcalData: ge,
                        description: ge.description,
                        recurrence: ge.recurrence
                    }
                };
            });

        console.log('Planify events:', planifyEvents.length, 'Google events:', pureGoogleEvents.length);
        return [...planifyEvents, ...pureGoogleEvents];
    }, [tasks, gcalEvents]);

    const handleEventDrop = async (dropInfo: any) => {
        const { event } = dropInfo;
        const eventType = event.extendedProps.type;

        // For now, only allow dragging Planify tasks
        // Google Calendar events are read-only in this view
        if (eventType === 'google') {
            dropInfo.revert();
            alert('Google Calendar events are read-only. Edit them in Google Calendar.');
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
        const eventType = event.extendedProps.type;

        if (eventType === 'google') {
            resizeInfo.revert();
            alert('Google Calendar events are read-only. Edit them in Google Calendar.');
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
        if (!isConnected || isSyncing) return;

        setIsSyncing(true);
        let syncedCount = 0;

        try {
            for (const t of tasks) {
                if (t.dueDate && t.dueTime && !t.completed) {
                    // Check if already synced
                    const isSynced = gcalEvents.find(ge => ge.extendedProperties?.private?.planifyTaskId === t.id);
                    if (!isSynced) {
                        try {
                            const newEvent = await createGoogleEventFromTask(t);
                            setGcalEvents(prev => [...prev, newEvent]);
                            syncedCount++;
                        } catch (err) {
                            console.error("Failed to sync task", t.title, err);
                        }
                    }
                }
            }

            if (syncedCount > 0) {
                alert(`Synced ${syncedCount} task${syncedCount > 1 ? 's' : ''} to Google Calendar`);
            } else {
                alert('All tasks are already synced');
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const handleEventClick = (clickInfo: any) => {
        setSelectedEvent(clickInfo.event);
        setShowEventModal(true);
    };

    const handleDeleteEvent = async () => {
        if (!selectedEvent) return;

        const eventType = selectedEvent.extendedProps.type;
        
        if (eventType === 'planify') {
            // Delete Planify task
            const taskId = selectedEvent.id;
            
            // If synced to Google Calendar, delete from there too
            if (isConnected && selectedEvent.extendedProps.gcalId) {
                try {
                    await deleteGoogleEvent(selectedEvent.extendedProps.gcalId);
                    setGcalEvents(prev => prev.filter(e => e.id !== selectedEvent.extendedProps.gcalId));
                } catch (err) {
                    console.error("Failed to delete from Google Calendar", err);
                }
            }
            
            deleteTask(taskId);
        } else if (eventType === 'google') {
            // Delete pure Google Calendar event
            if (window.confirm('Delete this Google Calendar event? This cannot be undone.')) {
                try {
                    await deleteGoogleEvent(selectedEvent.extendedProps.gcalId);
                    setGcalEvents(prev => prev.filter(e => e.id !== selectedEvent.extendedProps.gcalId));
                } catch (err) {
                    console.error("Failed to delete Google Calendar event", err);
                    alert('Failed to delete event from Google Calendar');
                }
            }
        }
        
        setShowEventModal(false);
        setSelectedEvent(null);
    };

    const formatEventTime = (date: Date) => {
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const formatEventDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    const handleSmartInputSubmit = async (commands: ParsedCommand[]) => {
        for (const p of commands) {
            if (p.type === 'task') {
                const newTask = addTask({
                    title: p.title,
                    dueDate: p.date || formatDateStr(new Date()),
                    dueTime: p.time,
                    duration: p.duration,
                    priority: p.priority || 'medium',
                    tags: p.tagIds
                });

                // Auto-sync to Google Calendar if connected and has time
                if (isConnected && newTask.dueDate && newTask.dueTime) {
                    try {
                        const gcalEvent = await createGoogleEventFromTask(newTask);
                        setGcalEvents(prev => [...prev, gcalEvent]);
                        console.log('Auto-synced task to Google Calendar:', newTask.title);
                    } catch (err) {
                        console.error('Failed to auto-sync task:', err);
                    }
                }
            }
        }
    };

    const refreshGoogleEvents = async () => {
        await loadGoogleEvents();
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
                           <>
                               <button 
                                   className="cal-refresh-btn" 
                                   onClick={refreshGoogleEvents}
                                   disabled={isLoading}
                                   title="Refresh Google Calendar events"
                               >
                                   {isLoading ? '↻' : '↻'}
                               </button>
                               <button 
                                   className="cal-sync-btn" 
                                   onClick={syncPendingTasksToGCal}
                                   disabled={isSyncing}
                               >
                                   {isSyncing ? 'Syncing...' : 'Sync to GCal'}
                               </button>
                           </>
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
                     eventClick={handleEventClick}
                     slotMinTime="06:00:00"
                     allDaySlot={false}
                     height="100%"
                     nowIndicator={true}
                 />
             </div>

             {/* Event Detail Modal */}
             {showEventModal && selectedEvent && (
                 <Modal isOpen={showEventModal} onClose={() => { setShowEventModal(false); setSelectedEvent(null); }}>
                     <div className="event-modal">
                         <div className="event-modal__header">
                             <h2 className="event-modal__title">{selectedEvent.title}</h2>
                             <button 
                                 className="event-modal__close" 
                                 onClick={() => { setShowEventModal(false); setSelectedEvent(null); }}
                                 aria-label="Close"
                             >
                                 <X size={20} />
                             </button>
                         </div>

                         <div className="event-modal__body">
                             <div className="event-modal__section">
                                 <span className="event-modal__label">Type</span>
                                 <span className="event-modal__value">
                                     {selectedEvent.extendedProps.type === 'planify' ? (
                                         <span className="event-badge event-badge--planify">Planify Task</span>
                                     ) : (
                                         <span className="event-badge event-badge--google">Google Calendar</span>
                                     )}
                                 </span>
                             </div>

                             <div className="event-modal__section">
                                 <span className="event-modal__label">Date</span>
                                 <span className="event-modal__value">{formatEventDate(selectedEvent.start)}</span>
                             </div>

                             <div className="event-modal__section">
                                 <span className="event-modal__label">Time</span>
                                 <span className="event-modal__value">
                                     {formatEventTime(selectedEvent.start)} - {formatEventTime(selectedEvent.end)}
                                 </span>
                             </div>

                             {selectedEvent.extendedProps.type === 'planify' && selectedEvent.extendedProps.task?.description && (
                                 <div className="event-modal__section">
                                     <span className="event-modal__label">Description</span>
                                     <p className="event-modal__description">{selectedEvent.extendedProps.task.description}</p>
                                 </div>
                             )}

                             {selectedEvent.extendedProps.type === 'google' && selectedEvent.extendedProps.description && (
                                 <div className="event-modal__section">
                                     <span className="event-modal__label">Description</span>
                                     <p className="event-modal__description">{selectedEvent.extendedProps.description}</p>
                                 </div>
                             )}

                             {selectedEvent.extendedProps.type === 'google' && selectedEvent.extendedProps.recurrence && (
                                 <div className="event-modal__section">
                                     <span className="event-modal__label">Recurrence</span>
                                     <span className="event-modal__value event-modal__recurrence">
                                         {selectedEvent.extendedProps.recurrence.join(', ')}
                                     </span>
                                 </div>
                             )}

                             {selectedEvent.extendedProps.isGoogleEvent && (
                                 <div className="event-modal__section">
                                     <span className="event-modal__info">✓ Synced with Google Calendar</span>
                                 </div>
                             )}
                         </div>

                         <div className="event-modal__footer">
                             <button 
                                 className="event-modal__btn event-modal__btn--danger"
                                 onClick={handleDeleteEvent}
                             >
                                 <Trash2 size={16} />
                                 Delete Event
                             </button>
                         </div>
                     </div>
                 </Modal>
             )}
        </div>
    );
}