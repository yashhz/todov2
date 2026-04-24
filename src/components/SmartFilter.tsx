import React, { useRef, useEffect } from 'react';

export interface FilterOption {
    id: string;
    label: string | React.ReactNode;
    color?: string; // Optional dot color
}

export interface FilterGroupConfig {
    id: string;
    type: 'single' | 'multiple';
    options: FilterOption[];
    selected: string | string[];
    onSelect: (id: string | string[]) => void;
    // For rendering the button trigger
    getTriggerLabel: (selected: string | string[]) => string;
    prefixText?: string; // text before the trigger
    suffixText?: string; // text after the trigger
}

interface SmartFilterProps {
    groups: FilterGroupConfig[];
    activeGroup: string | null;
    onToggleGroup: (groupId: string | null) => void;
    onClearAll?: () => void;
    showClearAll?: boolean;
    style?: React.CSSProperties;
}

export function SmartFilter({ groups, activeGroup, onToggleGroup, onClearAll, showClearAll, style }: SmartFilterProps) {
    const filterRef = useRef<HTMLDivElement>(null);

    // Close filters on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                onToggleGroup(null);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onToggleGroup]);

    return (
        <div className="tasks-filter-sentence" ref={filterRef} style={{ ...style }}>
            <span className="sentence-text">Showing </span>

            {groups.map((group) => {
                const isSelectedMultiple = group.type === 'multiple' && (group.selected as string[]).length > 0;
                const isSelectedSingle = group.type === 'single' && group.selected !== 'all'; // assuming 'all' is default
                const isActiveFilter = isSelectedMultiple || isSelectedSingle;

                return (
                    <React.Fragment key={group.id}>
                        {group.prefixText && <span className="sentence-text">{group.prefixText}</span>}

                        <span className="sentence-trigger-wrap">
                            <button
                                className={`sentence-trigger ${isActiveFilter ? 'sentence-trigger--active' : ''}`}
                                onClick={() => onToggleGroup(activeGroup === group.id ? null : group.id)}
                            >
                                {group.getTriggerLabel(group.selected)}
                            </button>
                            {activeGroup === group.id && (
                                <div className="sentence-mini-popover glass animate-pop-in">
                                    {group.options.map(opt => {
                                        const isSelected = group.type === 'multiple'
                                            ? (group.selected as string[]).includes(opt.id)
                                            : group.selected === opt.id;

                                        return (
                                            <button
                                                key={opt.id}
                                                className={`mini-opt ${isSelected ? 'mini-opt--active' : ''}`}
                                                onClick={() => {
                                                    if (group.type === 'single') {
                                                        group.onSelect(opt.id);
                                                        onToggleGroup(null);
                                                    } else {
                                                        const current = group.selected as string[];
                                                        group.onSelect(
                                                            current.includes(opt.id)
                                                                ? current.filter(id => id !== opt.id)
                                                                : [...current, opt.id]
                                                        );
                                                    }
                                                }}
                                            >
                                                {opt.color && <span className="mini-dot" style={{ background: opt.color }} />}
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </span>

                        {group.suffixText && <span className="sentence-text">{group.suffixText}</span>}
                    </React.Fragment>
                );
            })}

            {showClearAll && onClearAll && (
                <button className="sentence-clear" aria-label="Reset Filters" onClick={onClearAll} title="Reset Filters">×</button>
            )}
        </div>
    );
}
