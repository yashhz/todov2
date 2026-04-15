// Google Calendar API integration service
import type { Task } from '../types';

export interface GCalEvent {
    id: string;
    summary: string;
    start: {
        dateTime?: string;
        date?: string;
    };
    end: {
        dateTime?: string;
        date?: string;
    };
    extendedProperties?: {
        private?: {
            planifyTaskId?: string;
        }
    }
}

let accessToken = localStorage.getItem('gcal_token') || null;

export const setGCalToken = (token: string) => {
    accessToken = token;
    localStorage.setItem('gcal_token', token);
};

export const clearGCalToken = () => {
    accessToken = null;
    localStorage.removeItem('gcal_token');
};

export const hasGCalToken = () => {
    return !!accessToken;
};

// Common fetch wrapper to handle Google API requests
async function gcalFetch(endpoint: string, options: RequestInit = {}) {
    if (!accessToken) throw new Error('Not authenticated with Google Calendar');

    const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    console.log('Making Google Calendar API request:', endpoint);

    const response = await fetch(`https://www.googleapis.com/calendar/v3${endpoint}`, {
        ...options,
        headers
    });

    console.log('Google Calendar API response status:', response.status);

    if (response.status === 401) {
        clearGCalToken();
        throw new Error('Google Calendar token expired. Please reconnect.');
    }

    if (response.status === 403) {
        const errorData = await response.json();
        console.error('Google Calendar API 403 error:', errorData);
        throw new Error('Access denied. Make sure Google Calendar API is enabled in Google Cloud Console.');
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Google Calendar API error response:', errorText);
        throw new Error(`Google Calendar API error (${response.status}): ${errorText}`);
    }

    if (response.status === 204) {
        return null; // No content for deletes
    }

    return await response.json();
}

export async function fetchGoogleEvents(timeMin: Date, timeMax: Date): Promise<GCalEvent[]> {
    const query = new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime'
    });

    const data = await gcalFetch(`/calendars/primary/events?${query.toString()}`);
    return data.items || [];
}

export async function createGoogleEventFromTask(task: Task): Promise<GCalEvent> {
    if (!task.dueDate || !task.dueTime) throw new Error('Task needs date and time to sync to Google Calendar');

    const startStr = `${task.dueDate}T${task.dueTime}:00`;
    const startDate = new Date(startStr);

    let endDate = new Date(startDate.getTime() + (60 * 60 * 1000));
    if (task.duration) {
        endDate = new Date(startDate.getTime() + (task.duration * 60 * 1000));
    }

    const eventBody = {
        summary: task.title,
        description: task.description || '',
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() },
        extendedProperties: {
            private: {
                planifyTaskId: task.id
            }
        }
    };

    return await gcalFetch('/calendars/primary/events', {
        method: 'POST',
        body: JSON.stringify(eventBody)
    });
}

export async function updateGoogleEvent(eventId: string, task: Task): Promise<GCalEvent> {
    if (!task.dueDate || !task.dueTime) throw new Error('Task needs date and time to sync to Google Calendar');

    const startStr = `${task.dueDate}T${task.dueTime}:00`;
    const startDate = new Date(startStr);

    let endDate = new Date(startDate.getTime() + (60 * 60 * 1000));
    if (task.duration) {
        endDate = new Date(startDate.getTime() + (task.duration * 60 * 1000));
    }

    const eventBody = {
        summary: task.title,
        description: task.description || '',
        start: { dateTime: startDate.toISOString() },
        end: { dateTime: endDate.toISOString() },
        extendedProperties: {
            private: {
                planifyTaskId: task.id
            }
        }
    };

    return await gcalFetch(`/calendars/primary/events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify(eventBody)
    });
}

export async function deleteGoogleEvent(eventId: string): Promise<void> {
    await gcalFetch(`/calendars/primary/events/${eventId}`, {
        method: 'DELETE'
    });
}
