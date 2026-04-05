import { useEffect } from 'react';

export function useKeyboardShortcut(key: string, callback: () => void, requireCtrl = false) {
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            // Ignore if focus is in an input, textarea, or contenteditable
            if (
                e.target instanceof HTMLInputElement || 
                e.target instanceof HTMLTextAreaElement || 
                (e.target as HTMLElement).isContentEditable
            ) {
                return;
            }
            
            const isCtrlPressed = e.metaKey || e.ctrlKey;
            if (e.key.toLowerCase() === key.toLowerCase()) {
                if (requireCtrl === isCtrlPressed) {
                    e.preventDefault();
                    callback();
                }
            }
        }
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [key, callback, requireCtrl]);
}
