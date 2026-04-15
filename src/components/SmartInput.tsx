import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useGoals, useProjects } from '../hooks/useStore';
import { parseBatch, formatParsedDate, formatParsedTime, formatDuration } from '../services/commandParser';
import type { ParsedCommand, ParsedToken } from '../types';
import { Calendar, Clock, Tag, Target, Flag } from 'lucide-react';
import './SmartInput.css';

interface SmartInputProps {
    onSubmit: (commands: ParsedCommand[]) => void;
    placeholder?: string;
    autoFocus?: boolean;
    defaultType?: 'task' | 'habit';
}

const TOKEN_COLORS: Record<ParsedToken['type'], string> = {
    date:       'var(--cmd-chip-date)',
    time:       'var(--cmd-chip-time)',
    duration:   'var(--cmd-chip-duration)',
    priority:   'var(--cmd-chip-priority)',
    goal:       'var(--cmd-chip-goal)',
    tag:        'var(--cmd-chip-tag)',
    recurrence: 'var(--cmd-chip-recurrence)',
    project:    'var(--cmd-chip-project)',
};

function tokenLabel(token: ParsedToken, goals: any[], projects: any[]): string {
    switch (token.type) {
        case 'date':       return formatParsedDate(token.value as string);
        case 'time':       return formatParsedTime(token.value as string);
        case 'duration':   return formatDuration(token.value as number);
        case 'priority':   return (token.value as string).charAt(0).toUpperCase() + (token.value as string).slice(1);
        case 'recurrence': return token.raw;
        case 'goal': {
            const g = goals.find(g => g.id === token.value);
            return g ? `${g.icon} ${g.title}` : token.raw;
        }
        case 'project': {
            const p = projects.find(p => p.id === token.value);
            return p ? `${p.icon} ${p.name}` : token.raw;
        }
        case 'tag':
            return `#${token.value as string}`;
        default: return token.raw;
    }
}

export const SmartInput: React.FC<SmartInputProps> = ({ onSubmit, placeholder = 'Add a task... (e.g. "Buy milk tomorrow 2pm #errands")', autoFocus = false, defaultType = 'task' }) => {
    const { goals } = useGoals();
    const { projects } = useProjects();
    const [input, setInput] = useState('');
    const [expanded, setExpanded] = useState(false);
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const goalOptions = useMemo(() => goals.map(g => ({ id: g.id, title: g.title })), [goals]);
    const projectOptions = useMemo(() => projects.filter(p => p.status === 'active').map(p => ({ id: p.id, name: p.name })), [projects]);

    const parsedBatch = useMemo(
        () => parseBatch(defaultType === 'habit' && !input.startsWith('#') ? `#h ${input}` : input, { goals: goalOptions, projects: projectOptions, tags: [], dismissed }),
        [input, goalOptions, projectOptions, dismissed, defaultType]
    );

    const parsed = parsedBatch[0];

    useEffect(() => {
        if (autoFocus && inputRef.current) {
            inputRef.current.focus();
        }

        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setExpanded(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [autoFocus]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (input.trim()) {
                onSubmit(parsedBatch);
                setInput('');
                setDismissed(new Set());
                setExpanded(false);
            }
        }
        if (e.key === 'Escape') {
            setExpanded(false);
            inputRef.current?.blur();
        }
    };

    const dismissToken = (raw: string) => {
        setDismissed(prev => new Set(prev).add(raw.toLowerCase()));
    };

    return (
        <div className={`smart-input-container ${expanded ? 'smart-input--expanded' : ''}`} ref={containerRef}>
            <div className="smart-input-main">
                <div className="smart-input-prefix">
                    {parsed?.type === 'habit' ? '↻' : '+'}
                </div>
                <textarea
                    ref={inputRef}
                    className="smart-input-field"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setExpanded(true)}
                    placeholder={placeholder}
                    rows={1}
                />
                {input.trim() && (
                     <button className="smart-input-submit" onClick={() => { onSubmit(parsedBatch); setInput(''); setDismissed(new Set()); setExpanded(false); }}>
                         ↑
                     </button>
                )}
            </div>

            {/* Chips Layer */}
            {parsed?.tokens && parsed.tokens.length > 0 && (
                <div className="smart-input-chips">
                    {parsed.tokens.map((token, i) => (
                        <span key={i} className="smart-chip" style={{ '--chip-color': TOKEN_COLORS[token.type] } as React.CSSProperties}>
                            {tokenLabel(token, goals, projects)}
                            <button className="smart-chip-dismiss" onClick={(e) => { e.stopPropagation(); dismissToken(token.raw); }}>×</button>
                        </span>
                    ))}
                </div>
            )}

            {/* Drawer */}
            {expanded && (
                <div className="smart-input-drawer animate-fade-in-up">
                    <div className="smart-drawer-toolbar">
                        <button className="smart-toolbar-btn" title="Set Date"><Calendar size={13} /> {parsed?.date ? formatParsedDate(parsed.date) : 'Date'}</button>
                        <button className="smart-toolbar-btn" title="Set Time"><Clock size={13} /> {parsed?.time ? formatParsedTime(parsed.time) : 'Time'}</button>
                        <button className="smart-toolbar-btn" title="Set Priority"><Flag size={13} /> {parsed?.priority ? parsed.priority : 'Priority'}</button>
                        <button className="smart-toolbar-btn" title="Link Goal"><Target size={13} /> Goal</button>
                        <button className="smart-toolbar-btn" title="Add Tag"><Tag size={13} /> Tag</button>
                    </div>
                    <div className="smart-drawer-hint">
                         <span><strong>↵</strong> to create · <strong>#h</strong> habit · <strong>@</strong> goal · <strong>#</strong> tag</span>
                    </div>
                </div>
            )}
        </div>
    );
};
